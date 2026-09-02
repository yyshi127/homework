import express from 'express';
import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateAppState } from './state-validation.js';
import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
  callDeepSeekHomeworkReview,
} from './deepseek-homework.js';

const PORT = Number(process.env.PORT || 8090);
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'homework.sqlite');
const STATE_KEY = 'main';
const AI_CONFIG_KEY = 'main';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_BASE_URL = process.env.DEEPSEEK_API_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL;
const DEFAULT_DEEPSEEK_KEY_FILE = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', '小小星球api.txt');
const DEEPSEEK_API_KEY_FILE = process.env.DEEPSEEK_API_KEY_FILE || DEFAULT_DEEPSEEK_KEY_FILE;
const MISTAKE_IMAGE_DIR = process.env.MISTAKE_IMAGE_DIR || path.join(path.dirname(DB_PATH), 'mistake-images');
const GRADING_JOB_TTL_MS = 20 * 60 * 1000;
const MAX_GRADING_JOBS = 30;
const MAX_RUNNING_GRADING_JOBS = 2;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(MISTAKE_IMAGE_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 0,
    client_id TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS ai_config (
    key TEXT PRIMARY KEY,
    config_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const appStateColumns = db.pragma('table_info(app_state)');
if (!appStateColumns.some((column) => column.name === 'version')) {
  db.exec('ALTER TABLE app_state ADD COLUMN version INTEGER NOT NULL DEFAULT 0');
}
if (!appStateColumns.some((column) => column.name === 'client_id')) {
  db.exec("ALTER TABLE app_state ADD COLUMN client_id TEXT NOT NULL DEFAULT ''");
}

const getState = db.prepare('SELECT state_json, updated_at, version, client_id FROM app_state WHERE key = ?');
const insertState = db.prepare(`
  INSERT INTO app_state (key, state_json, updated_at, version, client_id)
  VALUES (@key, @state_json, @updated_at, 1, @client_id)
`);
const updateState = db.prepare(`
  UPDATE app_state
  SET state_json = @state_json,
      updated_at = @updated_at,
      client_id = @client_id,
      version = version + 1
  WHERE key = @key AND version = @expected_version
`);
const saveStateWithVersion = db.transaction(({ stateJson, expectedVersion, updatedAt, clientId }) => {
  const current = getState.get(STATE_KEY);
  if (!current) {
    if (expectedVersion !== 0) return { conflict: true, currentVersion: 0 };
    insertState.run({ key: STATE_KEY, state_json: stateJson, updated_at: updatedAt, client_id: clientId });
    return { conflict: false, version: 1 };
  }

  const currentVersion = Number(current.version || 0);
  if (current.state_json === stateJson) {
    return { conflict: false, version: currentVersion, unchanged: true };
  }
  const recoveredOwnWrite = currentVersion !== expectedVersion && clientId && current.client_id === clientId;
  if (currentVersion !== expectedVersion && !recoveredOwnWrite) {
    return { conflict: true, currentVersion };
  }
  const result = updateState.run({
    key: STATE_KEY,
    state_json: stateJson,
    updated_at: updatedAt,
    client_id: clientId,
    expected_version: recoveredOwnWrite ? currentVersion : expectedVersion,
  });
  if (result.changes !== 1) return { conflict: true, currentVersion: Number(getState.get(STATE_KEY)?.version || 0) };
  return { conflict: false, version: currentVersion + 1, recoveredOwnWrite };
});
const getAiConfigRow = db.prepare('SELECT config_json, updated_at FROM ai_config WHERE key = ?');
const upsertAiConfig = db.prepare(`
  INSERT INTO ai_config (key, config_json, updated_at)
  VALUES (@key, @config_json, @updated_at)
  ON CONFLICT(key) DO UPDATE SET
    config_json = excluded.config_json,
    updated_at = excluded.updated_at
`);

const app = express();
const stateEventClients = new Set();
const gradingJobs = new Map();
app.use('/api/grade-homework', express.json({ limit: '16mb' }));
app.use('/api/mistake-images', express.json({ limit: '2mb' }));
app.use(express.json({ limit: '5mb' }));

function sendStateEvent(response, event) {
  if (response.destroyed || response.writableEnded) return false;
  try {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

function broadcastStateEvent(event) {
  for (const response of stateEventClients) {
    if (!sendStateEvent(response, event)) stateEventClients.delete(response);
  }
}

const DEFAULT_AI_CONFIG = {
  activeProvider: 'deepseek',
  deepseek: {
    apiKey: '',
    baseUrl: DEEPSEEK_API_BASE_URL,
    model: DEEPSEEK_MODEL,
  },
};

function normalizeAiConfig(config = {}) {
  return {
    activeProvider: 'deepseek',
    deepseek: {
      apiKey: config.deepseek?.apiKey || '',
      baseUrl: DEFAULT_AI_CONFIG.deepseek.baseUrl,
      model: DEFAULT_AI_CONFIG.deepseek.model,
    },
  };
}

function readDeepSeekKeyFile() {
  if (!DEEPSEEK_API_KEY_FILE) return '';
  try {
    const value = fs.readFileSync(DEEPSEEK_API_KEY_FILE, 'utf8').trim();
    return value && !/\s/.test(value) ? value : '';
  } catch {
    return '';
  }
}

function resolvedDeepSeekKey(config = readAiConfig()) {
  return config.deepseek.apiKey || DEEPSEEK_API_KEY || readDeepSeekKeyFile();
}

function deepSeekKeySource(config = readAiConfig()) {
  if (config.deepseek.apiKey) return 'saved';
  if (DEEPSEEK_API_KEY) return 'environment';
  if (readDeepSeekKeyFile()) return 'file';
  return 'none';
}

function readAiConfig() {
  const row = getAiConfigRow.get(AI_CONFIG_KEY);
  if (!row) return normalizeAiConfig(DEFAULT_AI_CONFIG);
  try {
    return normalizeAiConfig(JSON.parse(row.config_json));
  } catch {
    return normalizeAiConfig(DEFAULT_AI_CONFIG);
  }
}

function publicAiConfig(config = readAiConfig()) {
  return {
    activeProvider: 'deepseek',
    deepseek: {
      baseUrl: config.deepseek.baseUrl,
      model: config.deepseek.model,
      configured: Boolean(resolvedDeepSeekKey(config)),
      keySource: deepSeekKeySource(config),
    },
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, dbPath: DB_PATH });
});

app.post('/api/mistake-images', (req, res) => {
  const imageData = req.body?.imageData;
  const match = typeof imageData === 'string' && imageData.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    res.status(400).json({ code: 'INVALID_MISTAKE_IMAGE', error: '错题截图必须是 JPEG 图片' });
    return;
  }

  const imageBuffer = Buffer.from(match[1], 'base64');
  const isJpeg = imageBuffer.length >= 4
    && imageBuffer[0] === 0xff
    && imageBuffer[1] === 0xd8
    && imageBuffer.at(-2) === 0xff
    && imageBuffer.at(-1) === 0xd9;
  if (!isJpeg || imageBuffer.length > 1.5 * 1024 * 1024) {
    res.status(413).json({ code: 'INVALID_MISTAKE_IMAGE_SIZE', error: '错题截图无效或超过 1.5 MB' });
    return;
  }

  const fileName = `${Date.now()}-${randomUUID()}.jpg`;
  fs.writeFileSync(path.join(MISTAKE_IMAGE_DIR, fileName), imageBuffer, { flag: 'wx' });
  res.status(201).json({ url: `/api/mistake-images/${fileName}` });
});

app.use('/api/mistake-images', express.static(MISTAKE_IMAGE_DIR, {
  fallthrough: false,
  immutable: true,
  maxAge: '1y',
}));

app.get('/api/state', (_req, res) => {
  const row = getState.get(STATE_KEY);
  if (!row) {
    res.json({ state: null, updatedAt: null, version: 0 });
    return;
  }

  try {
    res.json({ state: JSON.parse(row.state_json), updatedAt: row.updated_at, version: Number(row.version || 0) });
  } catch {
    res.status(500).json({ error: '数据库中的状态数据无法解析' });
  }
});

app.get('/api/state/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  stateEventClients.add(res);

  const row = getState.get(STATE_KEY);
  sendStateEvent(res, {
    version: Number(row?.version || 0),
    updatedAt: row?.updated_at || null,
    sourceClientId: '',
  });

  const heartbeat = setInterval(() => {
    if (!sendStateEvent(res, { heartbeat: true })) {
      clearInterval(heartbeat);
      stateEventClients.delete(res);
    }
  }, 20_000);
  const cleanup = () => {
    clearInterval(heartbeat);
    stateEventClients.delete(res);
  };
  req.on('close', cleanup);
  res.on('error', cleanup);
});

app.put('/api/state', (req, res) => {
  const expectedVersion = req.body?.expectedVersion;
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    res.status(428).json({ code: 'STATE_VERSION_REQUIRED', error: '保存状态时必须提供有效版本号' });
    return;
  }

  const validationErrors = validateAppState(req.body?.state);
  if (validationErrors.length) {
    res.status(400).json({ code: 'INVALID_STATE', error: validationErrors[0], details: validationErrors });
    return;
  }

  const updatedAt = new Date().toISOString();
  const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.slice(0, 100) : '';
  const result = saveStateWithVersion({
    stateJson: JSON.stringify(req.body.state),
    expectedVersion,
    updatedAt,
    clientId,
  });
  if (result.conflict) {
    res.status(409).json({
      code: 'STATE_CONFLICT',
      error: '服务器数据版本已变化，请同步后重试',
      currentVersion: result.currentVersion,
    });
    return;
  }
  if (!result.unchanged) {
    broadcastStateEvent({
      version: result.version,
      updatedAt,
      sourceClientId: clientId,
      state: req.body.state,
    });
  }
  res.json({
    ok: true,
    updatedAt: result.unchanged ? getState.get(STATE_KEY)?.updated_at || updatedAt : updatedAt,
    version: result.version,
    unchanged: Boolean(result.unchanged),
    recoveredOwnWrite: Boolean(result.recoveredOwnWrite),
  });
});

app.get('/api/ai-config', (_req, res) => {
  res.json({ config: publicAiConfig(), updatedAt: getAiConfigRow.get(AI_CONFIG_KEY)?.updated_at || null });
});

app.put('/api/ai-config', (req, res) => {
  const current = readAiConfig();
  const incoming = req.body?.config || req.body || {};
  const next = normalizeAiConfig({
    deepseek: {
      apiKey: incoming.deepseek?.clearApiKey
        ? ''
        : incoming.deepseek?.apiKey
          ? String(incoming.deepseek.apiKey).trim()
          : current.deepseek.apiKey,
    },
  });
  const updatedAt = new Date().toISOString();
  upsertAiConfig.run({
    key: AI_CONFIG_KEY,
    config_json: JSON.stringify(next),
    updated_at: updatedAt,
  });
  res.json({ ok: true, config: publicAiConfig(next), updatedAt });
});

function demoHomeworkReview({ subject = '数学', term = '二年级上学期', title = '' }) {
  const templates = {
    语文: [
      { question: '第3题：词语搭配不够准确', answer: '美丽的声音', correctAnswer: '动听的声音', explanation: '“声音”通常搭配“动听、响亮、清脆”，再读一遍句子会更顺。' },
      { question: '第5题：句子标点遗漏', answer: '妈妈说今天真热', correctAnswer: '妈妈说：“今天真热！”', explanation: '人物说话时要补上冒号、引号，感叹语气可以用感叹号。' },
    ],
    数学: [
      { question: '第2题：两位数加法进位错误', answer: '38 + 27 = 55', correctAnswer: '38 + 27 = 65', explanation: '个位 8+7=15，要向十位进 1，十位 3+2+1=6。' },
      { question: '第6题：应用题单位没有写完整', answer: '还剩 12', correctAnswer: '还剩 12 个', explanation: '应用题最后要带单位，答案才完整。' },
    ],
    英语: [
      { question: '第4题：单词拼写错误', answer: 'becaus', correctAnswer: 'because', explanation: 'because 末尾有 e，可以按 be-cause 分段记忆。' },
      { question: '第7题：句首字母未大写', answer: 'i like apples.', correctAnswer: 'I like apples.', explanation: '英文句子开头和人称代词 I 都要大写。' },
    ],
  };
  const mistakes = templates[subject] || templates.数学;
  return {
    provider: 'demo',
    score: Math.max(72, 96 - mistakes.length * 8),
    summary: `演示批改：已生成${term}${subject}作业批改结果，发现 ${mistakes.length} 个需要订正的地方。`,
    suggestions: [
      subject === '数学' ? '先复盘计算步骤，再做同类型口算巩固。' : subject === '英语' ? '把易错单词和句型读写各一遍。' : '先读题目要求，再检查标点、搭配和书写。',
      '订正后建议隔天再练一次同类题，确认真正掌握。',
    ],
    mistakes: mistakes.map((item) => ({
      ...item,
      sourceTitle: title || `${term}${subject}作业批改`,
    })),
  };
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const chunks = [];
  for (const item of payload?.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text);
      if (content.type === 'text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function homeworkReviewSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      score: { type: 'number', minimum: 0, maximum: 100 },
      detectedSubject: { type: 'string', enum: ['语文', '数学', '英语'] },
      detectedTitle: { type: 'string' },
      summary: { type: 'string' },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5,
      },
      mistakes: {
        type: 'array',
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            isWrong: { type: 'boolean' },
            order: { type: 'number' },
            question: { type: 'string' },
            answer: { type: 'string' },
            correctAnswer: { type: 'string' },
            explanation: { type: 'string' },
          },
          required: ['isWrong', 'order', 'question', 'answer', 'correctAnswer', 'explanation'],
        },
      },
      imageAnnotations: {
        type: 'array',
        maxItems: 40,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            order: { type: 'number' },
            status: { type: 'string', enum: ['correct', 'wrong', 'pending'] },
            label: { type: 'string' },
            area: {
              type: 'object',
              additionalProperties: false,
              properties: {
                left: { type: 'number' },
                top: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
              },
              required: ['left', 'top', 'width', 'height'],
            },
          },
          required: ['order', 'status', 'label', 'area'],
        },
      },
    },
    required: ['score', 'detectedSubject', 'detectedTitle', 'summary', 'suggestions', 'mistakes', 'imageAnnotations'],
  };
}

async function callAliyunHomeworkReview(config, prompt, imageData) {
  const baseUrl = config.aliyun.baseUrl.replace(/\/+$/, '');
  const startedAt = Date.now();
  console.info(`[aliyun-homework] start model=${config.aliyun.model || 'qwen3-vl-plus'} imageChars=${String(imageData || '').length}`);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.aliyun.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.aliyun.model || 'qwen3-vl-plus',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `${prompt}\n\n你现在要模拟“千问 App 拍照批改作业”的效果：先看整张作业照片，按原图顺序批改每一道可见题，然后返回可叠加在原图上的批改标注层和错题讲解。\n\n必须做这些事：\n1. 自动判断学科，只能从“语文、数学、英语”中选择，放在 detectedSubject。用户选择只作参考。\n2. 自动识别作业标题、练习名、页码标题，放在 detectedTitle；没有则为空字符串。\n3. 按图片中的自然顺序输出，从上到下、从左到右。第一道可见题 order=1，后面依次递增。\n4. imageAnnotations 必须包含每一道可见题，不只错题。每项包含 order、status、label、area。status 只能是 correct/wrong/pending。label 写“✓”或“错”或题号。area 是该题在整张图片上的大致区域，坐标用百分比 0-100：left/top/width/height。这个字段用于前端在原作业图上叠加绿色对勾、红色圈和题号。\n5. mistakes 只放真正做错、漏答或书写格式明显不合要求的题目。每道错题必须完整写：question=题目复述，answer=小朋友答案，correctAnswer=标准答案，explanation=正确解题过程。数学题要写清楚计算步骤；语文/英语题要写清订正理由。\n6. 正确题目不要放进 mistakes，但要放进 imageAnnotations。\n\n请只返回 JSON，不要返回 Markdown。JSON 字段必须是：score, detectedSubject, detectedTitle, summary, suggestions, imageAnnotations, mistakes。` },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3072,
      enable_thinking: false,
      vl_high_resolution_images: true,
    }),
  });

  const payload = await response.json();
  console.info(`[aliyun-homework] done status=${response.status} elapsedMs=${Date.now() - startedAt}`);
  if (!response.ok) {
    throw new Error(payload?.error?.message || '阿里百炼批改服务暂时不可用');
  }
  const content = payload?.choices?.[0]?.message?.content || '';
  const jsonText = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(jsonText);
}

async function getBaiduAccessToken(config) {
  if (baiduTokenCache.token && Date.now() < baiduTokenCache.expiresAt - 60_000) {
    return baiduTokenCache.token;
  }
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.baidu.apiKey,
    client_secret: config.baidu.secretKey,
  });
  const response = await fetch(`https://aip.baidubce.com/oauth/2.0/token?${params.toString()}`, {
    method: 'POST',
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload?.error_description || payload?.error || '百度 Access Token 获取失败');
  }
  baiduTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 0) * 1000,
  };
  return baiduTokenCache.token;
}

function imageDataToBase64(imageData) {
  return String(imageData || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
}

function imageSizeFromDataUrl(imageData) {
  const base64 = imageDataToBase64(imageData);
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

function baiduSubjectLabel(value) {
  const map = {
    chinese: '语文',
    math: '数学',
    english: '英语',
  };
  return map[value] || '数学';
}

function normalizeBaiduStatus(value) {
  return String(value || '').toLowerCase();
}

function matchFirstText(text, patterns = []) {
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function baiduSlotTextFromReason(reason = {}) {
  const text = Array.isArray(reason) ? reason.filter(Boolean).join('；') : String(reason || '');
  return {
    question: matchFirstText(text, [
      /题干算式为\s*([^，。；,\s]+)/,
      /题目为\s*([^，。；,\s]+)/,
      /算式为\s*([^，。；,\s]+)/,
    ]),
    answer: matchFirstText(text, [
      /用户作答为\s*([^，。；,\s]+)/,
      /用户填写\s*([^，。；,\s]+)/,
      /用户填为\s*([^，。；,\s]+)/,
      /\[NORM:\s*([^\]]+)\]/i,
    ]),
    correctAnswer: matchFirstText(text, [
      /正确结果为\s*([^，。；,\s]+)/,
      /计算结果为\s*([^，。；,\s]+)/,
      /应为\s*([^，。；,\s]+)/,
      /答案为\s*([^，。；,\s]+)/,
    ]),
  };
}

function parseSimpleMathExpression(text = '') {
  const normalized = String(text || '')
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[－]/g, '-')
    .replace(/[＋]/g, '+')
    .replace(/\s+/g, '');
  const match = normalized.match(/^(-?\d+)([+\-*/])(-?\d+)$/);
  if (!match) return null;
  const left = Number(match[1]);
  const operator = match[2];
  const right = Number(match[3]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  if (operator === '/' && right === 0) return null;
  const resultMap = {
    '+': left + right,
    '-': left - right,
    '*': left * right,
    '/': left / right,
  };
  const result = resultMap[operator];
  if (!Number.isFinite(result)) return null;
  return { left, operator, right, result };
}

function mathOperatorLabel(operator) {
  return { '+': '加', '-': '减', '*': '乘', '/': '除' }[operator] || '计算';
}

function buildMathProcess(expressionText = '', answerText = '') {
  const parsed = parseSimpleMathExpression(expressionText);
  if (!parsed) return '';
  const { left, operator, right, result } = parsed;
  const expression = `${left}${operator === '*' ? '×' : operator === '/' ? '÷' : operator}${right}`;
  if (operator === '+') {
    const ones = (Math.abs(left) % 10) + (Math.abs(right) % 10);
    const carry = ones >= 10 ? '，个位满十向十位进 1' : '';
    return `${expression} 要做${mathOperatorLabel(operator)}法：个位相加 ${Math.abs(left) % 10}+${Math.abs(right) % 10}=${ones}${carry}；再计算十位，最后得到 ${result}。${answerText ? `小朋友写的是 ${answerText}，所以需要订正为 ${result}。` : ''}`;
  }
  if (operator === '-') {
    return `${expression} 要做减法：从 ${left} 里面减去 ${right}，按位计算后得到 ${result}。${answerText ? `小朋友写的是 ${answerText}，和正确结果 ${result} 不一致。` : ''}`;
  }
  if (operator === '*') {
    return `${expression} 要做乘法：可以理解为 ${right} 个 ${left} 相加，计算结果是 ${result}。${answerText ? `小朋友写的是 ${answerText}，正确应为 ${result}。` : ''}`;
  }
  return `${expression} 要做除法：把 ${left} 平均分成 ${right} 份，每份是 ${result}。${answerText ? `小朋友写的是 ${answerText}，正确应为 ${result}。` : ''}`;
}

function normalizeBaiduArea(area, imageSize = null) {
  const box = Array.isArray(area) ? area[0] : area;
  if (!box || typeof box !== 'object') return null;
  const left = Number(box.left_x);
  const top = Number(box.left_y);
  const right = Number(box.right_x);
  const bottom = Number(box.right_y);
  if (![left, top, right, bottom].every(Number.isFinite)) return null;
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  if (imageSize?.width && imageSize?.height) {
    return {
      left: Math.max(0, Math.min(100, left / imageSize.width * 100)),
      top: Math.max(0, Math.min(100, top / imageSize.height * 100)),
      width: Math.max(1, Math.min(100, width / imageSize.width * 100)),
      height: Math.max(1, Math.min(100, height / imageSize.height * 100)),
    };
  }
  return {
    left,
    top,
    width,
    height,
  };
}

function normalizeModelAnnotations(items = [], imageSize = null) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const rawArea = item?.area || {};
    const isArrayArea = Array.isArray(rawArea);
    const area = isArrayArea
      ? { left: rawArea[0], top: rawArea[1], width: rawArea[2], height: rawArea[3] }
      : rawArea;
    let left = Number(area.left);
    let top = Number(area.top);
    let width = Number(area.width);
    let height = Number(area.height);
    if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;

    const looksLikePixels = imageSize?.width && imageSize?.height && (left > 100 || top > 100 || width > 100 || height > 100);
    if (looksLikePixels) {
      if (isArrayArea && width > left && height > top && width <= imageSize.width && height <= imageSize.height) {
        width -= left;
        height -= top;
      }
      left = left / imageSize.width * 100;
      top = top / imageSize.height * 100;
      width = width / imageSize.width * 100;
      height = height / imageSize.height * 100;
    }

    const status = item.status === 'wrong' ? 'wrong' : item.status === 'correct' ? 'correct' : 'pending';
    return {
      order: Number(item.order || index + 1),
      status,
      label: item.label || (status === 'correct' ? '✓' : status === 'wrong' ? '错' : String(item.order || index + 1)),
      area: {
        left: Math.max(0, Math.min(100, left)),
        top: Math.max(0, Math.min(100, top)),
        width: Math.max(1, Math.min(100, width)),
        height: Math.max(1, Math.min(100, height)),
      },
    };
  }).filter(Boolean);
}

function hasAnnotations(result) {
  return Array.isArray(result?.imageAnnotations) && result.imageAnnotations.length > 0;
}

function mergeHomeworkReviews(primary, geometry) {
  if (!geometry) return primary;
  return {
    ...primary,
    provider: geometry.provider ? `${primary.provider || 'aliyun'}+${geometry.provider}` : primary.provider,
    imageAnnotations: hasAnnotations(primary) ? primary.imageAnnotations : geometry.imageAnnotations || [],
    annotatedImageUrl: primary.annotatedImageUrl || geometry.annotatedImageUrl || '',
    detectedSubject: primary.detectedSubject || geometry.detectedSubject,
    detectedTitle: primary.detectedTitle || geometry.detectedTitle || '',
    summary: primary.summary || geometry.summary,
  };
}

function baiduResultToReview(payload, meta = {}) {
  const { subject, title } = meta;
  const result = payload?.result || {};
  const imageResults = Array.isArray(result.imageResults) ? result.imageResults : [];
  const firstImage = imageResults[0] || {};
  const detectedSubject = baiduSubjectLabel(firstImage.paperSubject) || subject;
  const allQuestions = imageResults.flatMap((image) => Array.isArray(image.result) ? image.result : []);
  const mistakes = [];
  const imageAnnotations = [];

  for (const question of allQuestions) {
    const questionOrder = Number(question.seqence || 0) || mistakes.length + 1;
    const slots = Array.isArray(question.slot) ? question.slot : [];
    const wrongSlots = slots.filter((slot) => Number(slot.correctResult) === 2 || Number(slot.correctResult) === 3);
    const questionIsWrong = Number(question.correctResult) === 2 || Number(question.correctResult) === 3;
    const questionArea = normalizeBaiduArea(question.questionArea, meta.imageSize);
    const slotAreas = slots
      .map((slot) => ({
        area: normalizeBaiduArea(slot.handwritingArea, meta.imageSize),
        status: Number(slot.correctResult) === 1 ? 'correct' : Number(slot.correctResult) === 2 || Number(slot.correctResult) === 3 ? 'wrong' : 'pending',
      }))
      .filter((slot) => slot.area);

    imageAnnotations.push({
      order: questionOrder,
      status: questionIsWrong || wrongSlots.length ? 'wrong' : Number(question.correctResult) === 1 ? 'correct' : 'pending',
      area: questionArea,
      slots: slotAreas,
    });

    if (!questionIsWrong && wrongSlots.length === 0) continue;

    const reason = wrongSlots.map((slot) => slot.reason).filter(Boolean).join('；') || (Number(question.correctResult) === 3 ? '未作答' : '百度识别为错误');
    const extracted = baiduSlotTextFromReason(reason);
    const mathProcess = buildMathProcess(extracted.question, extracted.answer);
    const questionTitle = extracted.question
      ? `第${questionOrder}题：${extracted.question}`
      : question.question || `第${questionOrder}题`;
    mistakes.push({
      isWrong: true,
      order: questionOrder,
      question: questionTitle,
      answer: Number(question.correctResult) === 3 ? '未作答' : extracted.answer || '百度未返回可结构化识别的作答内容',
      correctAnswer: extracted.correctAnswer || (mathProcess ? String(parseSimpleMathExpression(extracted.question)?.result) : '百度未返回标准答案，请结合错因说明核对'),
      explanation: mathProcess || reason || '百度智能作业批改识别为错题',
      questionImageUrl: question.cropUrl || '',
    });
  }

  const stat = result.stat_result || {};
  const total = Number(stat.all || allQuestions.length || 0);
  const wrongCount = mistakes.length;
  const corrected = Number(stat.corrected || 0);
  const score = total ? Math.max(0, Math.round(((total - wrongCount) / total) * 100)) : 0;

  return {
    provider: 'baidu',
    score,
    detectedSubject,
    detectedTitle: title || '',
    annotatedImageUrl: firstImage.imageUrl || '',
    imageAnnotations,
    summary: `百度智能作业批改完成：共识别 ${total || corrected || allQuestions.length} 道题，发现 ${wrongCount} 道错题。`,
    suggestions: wrongCount
      ? ['先订正红色错题，再把同类型题目重新练一遍。', '百度结果适合定位错题，具体讲解可结合老师答案继续完善。']
      : ['这次批改没有发现明确错题，可以抽查一两道题确认书写和步骤。'],
    mistakes,
  };
}

async function callBaiduHomeworkReview(config, imageData, meta) {
  const accessToken = await getBaiduAccessToken(config);
  const createUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/correct_edu/create_task?access_token=${encodeURIComponent(accessToken)}`;
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageDataToBase64(imageData),
      only_split: false,
      disable_preprocess: false,
    }),
  });
  const createPayload = await createResponse.json();
  if (!createResponse.ok || Number(createPayload.error_code || 0) !== 0) {
    throw new Error(createPayload?.error_msg || '百度智能作业批改提交失败');
  }
  const taskId = createPayload?.result?.task_id;
  if (!taskId) throw new Error('百度智能作业批改未返回 task_id');

  const pollIntervalMs = Number(config.baidu.pollIntervalMs || 3000);
  const timeoutMs = Number(config.baidu.timeoutMs || 120000);
  const deadline = Date.now() + timeoutMs;
  const getUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/correct_edu/get_result?access_token=${encodeURIComponent(accessToken)}`;
  let attempts = 0;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, attempts ? pollIntervalMs : 1200));
    attempts += 1;
    const resultResponse = await fetch(getUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId }),
    });
    const resultPayload = await resultResponse.json();
    const pendingMessage = String(resultPayload?.error || resultPayload?.error_msg || '').toLowerCase();
    if (pendingMessage === 'running' || pendingMessage.includes('running')) {
      console.info(`[baidu-homework] task=${taskId} attempt=${attempts} status=running`);
      continue;
    }
    if (!resultResponse.ok || Number(resultPayload.error_code || 0) !== 0) {
      throw new Error(resultPayload?.error_msg || '百度智能作业批改获取结果失败');
    }
    const status = normalizeBaiduStatus(resultPayload?.result?.status);
    console.info(`[baidu-homework] task=${taskId} attempt=${attempts} status=${status || 'pending'} finished=${Boolean(resultPayload?.result?.isAllFinished)}`);
    if (resultPayload?.result?.isAllFinished || status === 'success') {
      return baiduResultToReview(resultPayload, meta);
    }
    if (status === 'failed') {
      throw new Error('百度智能作业批改任务失败');
    }
  }

  throw new Error(`百度智能作业批改超过 ${Math.round(timeoutMs / 1000)} 秒仍未返回结果，请换一张更清晰的照片后重试`);
}

function inspectGradingImage(imageData, label, required = true) {
  if (!imageData && !required) return { bytes: 0 };
  const match = typeof imageData === 'string'
    ? imageData.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i)
    : null;
  if (!match) {
    return { status: 400, code: 'INVALID_IMAGE', error: `请上传有效的 ${label}` };
  }
  const bytes = Buffer.byteLength(match[1], 'base64');
  if (!bytes || bytes > 6 * 1024 * 1024) {
    return { status: 413, code: 'IMAGE_TOO_LARGE', error: `${label}处理后不能超过 6 MB` };
  }
  return { bytes };
}

function inspectGradingDetailImages(value) {
  if (value === undefined || value === null) return { items: [], bytes: 0 };
  if (!Array.isArray(value) || value.length > 3) {
    return { status: 400, code: 'INVALID_DETAIL_IMAGES', error: '作业高清局部图格式无效' };
  }
  const items = [];
  let bytes = 0;
  for (const item of value) {
    const inspection = inspectGradingImage(item?.imageData, '作业高清局部图');
    if (inspection.error) return inspection;
    const rawArea = item?.area;
    const area = {
      left: Number(rawArea?.left),
      top: Number(rawArea?.top),
      width: Number(rawArea?.width),
      height: Number(rawArea?.height),
    };
    const validArea = Object.values(area).every(Number.isFinite)
      && area.left >= 0
      && area.top >= 0
      && area.width > 0
      && area.height > 0
      && area.left + area.width <= 100.01
      && area.top + area.height <= 100.01;
    if (!validArea) {
      return { status: 400, code: 'INVALID_DETAIL_IMAGES', error: '作业高清局部图范围无效' };
    }
    bytes += inspection.bytes;
    items.push({ imageData: item.imageData, area });
  }
  if (bytes > 5 * 1024 * 1024) {
    return { status: 413, code: 'IMAGE_TOO_LARGE', error: '作业高清局部图处理后总计不能超过 5 MB' };
  }
  return { items, bytes };
}

function gradingFingerprint({ imageData, detailImages, localizationImageData, term, title, note }) {
  const hash = createHash('sha256');
  for (const value of [imageData, JSON.stringify(detailImages || []), localizationImageData, term, title, note]) {
    hash.update(String(value || ''), 'utf8');
    hash.update('\0');
  }
  return hash.digest('hex');
}

function normalizeGradingRequestId(value) {
  const requestId = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z0-9_-]{8,80}$/.test(requestId) ? requestId : '';
}

function gradingErrorStatus(error) {
  if (error?.code === 'TIMEOUT') return 504;
  if (error?.code === 'CANCELLED') return 409;
  if (['INVALID_IMAGE', 'MISSING_KEY'].includes(error?.code)) return 400;
  if (['NO_QUESTIONS', 'NO_VALID_QUESTIONS'].includes(error?.code)) return 422;
  return 502;
}

function gradingErrorPayload(error) {
  return {
    error: error?.message || 'DeepSeek 批改失败，请稍后再试',
    code: error?.code || 'DEEPSEEK_ERROR',
    stage: error?.stage || '',
  };
}

function isTerminalGradingStatus(status) {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function publicGradingJob(job) {
  const payload = {
    requestId: job.requestId,
    status: job.status,
    stage: job.stage,
    attempt: job.attempt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
  if (job.status === 'completed') payload.result = job.result;
  if (job.error) Object.assign(payload, job.error);
  return payload;
}

function pruneGradingJobs() {
  const now = Date.now();
  for (const [requestId, job] of gradingJobs) {
    if (isTerminalGradingStatus(job.status) && now - Date.parse(job.updatedAt) > GRADING_JOB_TTL_MS) {
      gradingJobs.delete(requestId);
    }
  }
  if (gradingJobs.size < MAX_GRADING_JOBS) return;
  const terminalJobs = [...gradingJobs.values()]
    .filter((job) => isTerminalGradingStatus(job.status))
    .sort((first, second) => Date.parse(first.updatedAt) - Date.parse(second.updatedAt));
  while (gradingJobs.size >= MAX_GRADING_JOBS && terminalJobs.length) {
    gradingJobs.delete(terminalJobs.shift().requestId);
  }
}

let runningGradingJobs = 0;

function finishGradingJob(job, status, values = {}) {
  job.status = status;
  job.stage = status;
  job.updatedAt = new Date().toISOString();
  Object.assign(job, values);
  job.runOptions = null;
  job.controller = null;
  job.resolveCompletion?.(job);
  job.resolveCompletion = null;
}

async function executeGradingJob(job) {
  const startedAt = Date.now();
  const options = job.runOptions;
  console.info(`[deepseek-homework] requestId=${job.requestId} start imageBytes=${job.imageBytes} detailBytes=${job.detailBytes} localizationBytes=${job.localizationBytes}`);
  try {
    const result = await callDeepSeekHomeworkReview({
      ...options,
      signal: job.controller.signal,
      onProgress: ({ stage, attempt, status, durationMs, code }) => {
        job.stage = stage;
        job.attempt = attempt;
        job.updatedAt = new Date().toISOString();
        const duration = Number.isFinite(durationMs) ? ` durationMs=${durationMs}` : '';
        const resultCode = code ? ` code=${code}` : '';
        console.info(`[deepseek-homework] requestId=${job.requestId} stage=${stage} attempt=${attempt} status=${status}${duration}${resultCode}`);
      },
    });
    if (job.cancelRequested) {
      finishGradingJob(job, 'cancelled', { error: { code: 'CANCELLED', error: '批改已取消', stage: job.stage } });
      return;
    }
    finishGradingJob(job, 'completed', { result });
    console.info(`[deepseek-homework] requestId=${job.requestId} done elapsedMs=${Date.now() - startedAt} questions=${result.recognizedQuestionCount} mistakes=${result.mistakes.length}`);
  } catch (error) {
    const payload = gradingErrorPayload(error);
    const status = error?.code === 'CANCELLED' || job.cancelRequested ? 'cancelled' : 'failed';
    if (status === 'cancelled') payload.code = 'CANCELLED';
    finishGradingJob(job, status, { error: payload, errorStatus: gradingErrorStatus(error) });
    console.warn(`[deepseek-homework] requestId=${job.requestId} failed elapsedMs=${Date.now() - startedAt} stage=${payload.stage || 'unknown'} code=${payload.code}`);
  } finally {
    runningGradingJobs -= 1;
    startQueuedGradingJobs();
  }
}

function startQueuedGradingJobs() {
  while (runningGradingJobs < MAX_RUNNING_GRADING_JOBS) {
    const job = [...gradingJobs.values()].find((candidate) => candidate.status === 'queued');
    if (!job) return;
    runningGradingJobs += 1;
    job.status = 'running';
    job.stage = 'vision';
    job.updatedAt = new Date().toISOString();
    void executeGradingJob(job);
  }
}

function createGradingJob({ requestId, fingerprint, runOptions, imageBytes, detailBytes, localizationBytes }) {
  let resolveCompletion;
  const completion = new Promise((resolve) => {
    resolveCompletion = resolve;
  });
  const now = new Date().toISOString();
  const job = {
    requestId,
    fingerprint,
    status: 'queued',
    stage: 'queued',
    attempt: 0,
    createdAt: now,
    updatedAt: now,
    imageBytes,
    detailBytes,
    localizationBytes,
    runOptions,
    controller: new AbortController(),
    cancelRequested: false,
    completion,
    resolveCompletion,
    result: null,
    error: null,
    errorStatus: 502,
  };
  gradingJobs.set(requestId, job);
  startQueuedGradingJobs();
  return job;
}

app.post('/api/grade-homework', async (req, res) => {
  const {
    imageData,
    detailImages = [],
    localizationImageData = '',
    term = '二年级上学期',
    title = '',
    note = '',
  } = req.body || {};
  const imageInspection = inspectGradingImage(imageData, 'JPG、PNG 或 WebP 作业照片');
  if (imageInspection.error) {
    res.status(imageInspection.status).json({ code: imageInspection.code, error: imageInspection.error });
    return;
  }
  const detailInspection = inspectGradingDetailImages(detailImages);
  if (detailInspection.error) {
    res.status(detailInspection.status).json({ code: detailInspection.code, error: detailInspection.error });
    return;
  }
  const localizationInspection = inspectGradingImage(localizationImageData, '错题定位图片', false);
  if (localizationInspection.error) {
    res.status(localizationInspection.status).json({ code: localizationInspection.code, error: localizationInspection.error });
    return;
  }
  if (imageInspection.bytes + detailInspection.bytes + localizationInspection.bytes > 10 * 1024 * 1024) {
    res.status(413).json({ code: 'IMAGE_TOO_LARGE', error: '作业图片处理后总计不能超过 10 MB' });
    return;
  }
  const aiConfig = readAiConfig();
  const apiKey = resolvedDeepSeekKey(aiConfig);
  if (!apiKey) {
    res.status(400).json({ error: '请先配置 DeepSeek API Key' });
    return;
  }

  const hasRequestId = req.body?.requestId !== undefined;
  const requestId = hasRequestId ? normalizeGradingRequestId(req.body.requestId) : randomUUID();
  if (!requestId) {
    res.status(400).json({ code: 'INVALID_REQUEST_ID', error: '批改请求编号无效，请重新发起批改' });
    return;
  }
  const normalizedInput = {
    imageData,
    detailImages: detailInspection.items,
    localizationImageData,
    term: String(term || '').slice(0, 100),
    title: String(title || '').slice(0, 160),
    note: String(note || '').slice(0, 600),
  };
  const fingerprint = gradingFingerprint(normalizedInput);
  pruneGradingJobs();
  let job = gradingJobs.get(requestId);
  if (job && job.fingerprint !== fingerprint) {
    res.status(409).json({ code: 'REQUEST_ID_CONFLICT', error: '同一批改请求编号不能用于不同图片' });
    return;
  }
  if (!job) {
    if (gradingJobs.size >= MAX_GRADING_JOBS) {
      res.status(503).json({ code: 'GRADING_QUEUE_FULL', error: '当前批改任务较多，请稍后再试' });
      return;
    }
    job = createGradingJob({
      requestId,
      fingerprint,
      imageBytes: imageInspection.bytes,
      detailBytes: detailInspection.bytes,
      localizationBytes: localizationInspection.bytes,
      runOptions: {
        apiKey,
        baseUrl: aiConfig.deepseek.baseUrl,
        model: aiConfig.deepseek.model,
        ...normalizedInput,
      },
    });
  }

  if (hasRequestId) {
    res.status(isTerminalGradingStatus(job.status) ? 200 : 202).json(publicGradingJob(job));
    return;
  }

  const finishedJob = await job.completion;
  if (res.destroyed || res.writableEnded) return;
  if (finishedJob.status === 'completed') {
    res.json(finishedJob.result);
    return;
  }
  res.status(finishedJob.errorStatus || 502).json(finishedJob.error || { code: 'DEEPSEEK_ERROR', error: 'DeepSeek 批改失败，请稍后再试' });
});

app.get('/api/grade-homework/:requestId', (req, res) => {
  pruneGradingJobs();
  const requestId = normalizeGradingRequestId(req.params.requestId);
  const job = requestId ? gradingJobs.get(requestId) : null;
  if (!job) {
    res.status(404).json({ code: 'GRADING_JOB_NOT_FOUND', error: '批改任务不存在或已过期' });
    return;
  }
  res.set('Cache-Control', 'no-store').json(publicGradingJob(job));
});

app.delete('/api/grade-homework/:requestId', (req, res) => {
  const requestId = normalizeGradingRequestId(req.params.requestId);
  const job = requestId ? gradingJobs.get(requestId) : null;
  if (!job) {
    res.status(404).json({ code: 'GRADING_JOB_NOT_FOUND', error: '批改任务不存在或已结束' });
    return;
  }
  if (!isTerminalGradingStatus(job.status)) {
    job.cancelRequested = true;
    if (job.status === 'queued') {
      finishGradingJob(job, 'cancelled', { error: { code: 'CANCELLED', error: '批改已取消', stage: 'queued' } });
      startQueuedGradingJobs();
    } else {
      job.status = 'cancelling';
      job.updatedAt = new Date().toISOString();
      job.controller?.abort();
    }
  }
  res.json(publicGradingJob(job));
});

app.use((error, _req, res, next) => {
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', error: '提交的数据超过大小限制' });
    return;
  }
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ code: 'INVALID_JSON_BODY', error: '提交的数据格式无效' });
    return;
  }
  next(error);
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Homework API listening on http://127.0.0.1:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});
