import express from 'express';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8090);
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'homework.sqlite');
const STATE_KEY = 'main';
const AI_CONFIG_KEY = 'main';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
let baiduTokenCache = { token: '', expiresAt: 0 };

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_config (
    key TEXT PRIMARY KEY,
    config_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const getState = db.prepare('SELECT state_json, updated_at FROM app_state WHERE key = ?');
const upsertState = db.prepare(`
  INSERT INTO app_state (key, state_json, updated_at)
  VALUES (@key, @state_json, @updated_at)
  ON CONFLICT(key) DO UPDATE SET
    state_json = excluded.state_json,
    updated_at = excluded.updated_at
`);
const getAiConfigRow = db.prepare('SELECT config_json, updated_at FROM ai_config WHERE key = ?');
const upsertAiConfig = db.prepare(`
  INSERT INTO ai_config (key, config_json, updated_at)
  VALUES (@key, @config_json, @updated_at)
  ON CONFLICT(key) DO UPDATE SET
    config_json = excluded.config_json,
    updated_at = excluded.updated_at
`);

const app = express();
app.use(express.json({ limit: '10mb' }));

const DEFAULT_AI_CONFIG = {
  activeProvider: 'aliyun',
  aliyun: {
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3-vl-plus',
  },
  baidu: {
    apiKey: '',
    secretKey: '',
    pollIntervalMs: 3000,
    timeoutMs: 120000,
  },
};

function normalizeAiConfig(config = {}) {
  return {
    activeProvider: config.activeProvider === 'baidu' ? 'baidu' : 'aliyun',
    aliyun: {
      apiKey: config.aliyun?.apiKey || '',
      baseUrl: config.aliyun?.baseUrl || DEFAULT_AI_CONFIG.aliyun.baseUrl,
      model: config.aliyun?.model || DEFAULT_AI_CONFIG.aliyun.model,
    },
    baidu: {
      apiKey: config.baidu?.apiKey || '',
      secretKey: config.baidu?.secretKey || '',
      pollIntervalMs: Math.max(1000, Number(config.baidu?.pollIntervalMs || DEFAULT_AI_CONFIG.baidu.pollIntervalMs)),
      timeoutMs: Math.max(5000, Number(config.baidu?.timeoutMs || DEFAULT_AI_CONFIG.baidu.timeoutMs)),
    },
  };
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
    activeProvider: config.activeProvider,
    aliyun: {
      baseUrl: config.aliyun.baseUrl,
      model: config.aliyun.model,
      configured: Boolean(config.aliyun.apiKey),
    },
    baidu: {
      configured: Boolean(config.baidu.apiKey && config.baidu.secretKey),
      pollIntervalMs: config.baidu.pollIntervalMs,
      timeoutMs: config.baidu.timeoutMs,
    },
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, dbPath: DB_PATH });
});

app.get('/api/state', (_req, res) => {
  const row = getState.get(STATE_KEY);
  if (!row) {
    res.json({ state: null, updatedAt: null });
    return;
  }

  try {
    res.json({ state: JSON.parse(row.state_json), updatedAt: row.updated_at });
  } catch {
    res.status(500).json({ error: '数据库中的状态数据无法解析' });
  }
});

app.put('/api/state', (req, res) => {
  if (!req.body || typeof req.body.state !== 'object' || Array.isArray(req.body.state)) {
    res.status(400).json({ error: 'state 必须是对象' });
    return;
  }

  const updatedAt = new Date().toISOString();
  upsertState.run({
    key: STATE_KEY,
    state_json: JSON.stringify(req.body.state),
    updated_at: updatedAt,
  });
  res.json({ ok: true, updatedAt });
});

app.get('/api/ai-config', (_req, res) => {
  res.json({ config: publicAiConfig(), updatedAt: getAiConfigRow.get(AI_CONFIG_KEY)?.updated_at || null });
});

app.put('/api/ai-config', (req, res) => {
  const current = readAiConfig();
  const incoming = req.body?.config || req.body || {};
  const next = normalizeAiConfig({
    activeProvider: incoming.activeProvider || current.activeProvider,
    aliyun: {
      apiKey: incoming.aliyun?.clearApiKey ? '' : incoming.aliyun?.apiKey ? String(incoming.aliyun.apiKey) : current.aliyun.apiKey,
      baseUrl: incoming.aliyun?.baseUrl || current.aliyun.baseUrl,
      model: incoming.aliyun?.model || current.aliyun.model,
    },
    baidu: {
      apiKey: incoming.baidu?.clearApiKey ? '' : incoming.baidu?.apiKey ? String(incoming.baidu.apiKey) : current.baidu.apiKey,
      secretKey: incoming.baidu?.clearSecretKey ? '' : incoming.baidu?.secretKey ? String(incoming.baidu.secretKey) : current.baidu.secretKey,
      pollIntervalMs: incoming.baidu?.pollIntervalMs || current.baidu.pollIntervalMs,
      timeoutMs: incoming.baidu?.timeoutMs || current.baidu.timeoutMs,
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

app.post('/api/grade-homework', async (req, res) => {
  const { imageData, subject = '数学', term = '二年级上学期', title = '', note = '' } = req.body || {};
  if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
    res.status(400).json({ error: '请上传有效的作业图片' });
    return;
  }
  const imageSize = imageSizeFromDataUrl(imageData);

  const aiConfig = readAiConfig();
  if (aiConfig.activeProvider === 'baidu') {
    if (!aiConfig.baidu.apiKey || !aiConfig.baidu.secretKey) {
      res.status(400).json({ error: '请先在 AI 配置中填写百度 API Key 和 Secret Key' });
      return;
    }
    try {
      const result = await callBaiduHomeworkReview(aiConfig, imageData, { subject, term, title, imageSize });
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: error?.message || '百度智能作业批改失败，请稍后再试' });
    }
    return;
  }

  if (!aiConfig.aliyun.apiKey && !OPENAI_API_KEY) {
    res.json(demoHomeworkReview({ subject, term, title }));
    return;
  }

  const prompt = [
    '你是一名耐心的小学作业批改老师。请根据图片批改作业。',
    `学期：${term}`,
    `学科：${subject}`,
    `作业名称：${title || '未填写'}`,
    `家长补充说明：${note || '无'}`,
    '要求：先自动识别图片作业的学科和标题；按图片中的题目顺序从上到下、从左到右输出；只找真实可见的错误；正确题目不要放进 mistakes；如果整页没有错题，mistakes 返回空数组；如果图片不清楚，请在 summary 里说明，并少量列出可确认的问题；解释要适合小学生和家长理解；不要编造图片中不存在的题目。',
  ].join('\n');

  if (aiConfig.aliyun.apiKey) {
    try {
      const aliyunPromise = callAliyunHomeworkReview(aiConfig, prompt, imageData);
      const baiduGeometryPromise = aiConfig.baidu.apiKey && aiConfig.baidu.secretKey
        ? callBaiduHomeworkReview(aiConfig, imageData, { subject, term, title, imageSize }).catch((error) => {
            console.warn(`[hybrid-homework] baidu geometry failed: ${error?.message || error}`);
            return null;
          })
        : Promise.resolve(null);
      const [aliyunResult, baiduGeometry] = await Promise.all([aliyunPromise, baiduGeometryPromise]);
      aliyunResult.imageAnnotations = normalizeModelAnnotations(aliyunResult.imageAnnotations, imageSize);
      const result = mergeHomeworkReviews({ provider: 'aliyun', ...aliyunResult }, baiduGeometry);
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: error?.message || '阿里百炼批改失败，请稍后再试' });
    }
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageData, detail: 'high' },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'homework_review',
            schema: homeworkReviewSchema(),
            strict: true,
          },
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      res.status(502).json({ error: payload?.error?.message || 'AI 批改服务暂时不可用' });
      return;
    }

    const text = extractResponseText(payload);
    const result = JSON.parse(text);
    res.json({ provider: 'openai', ...result });
  } catch (error) {
    res.status(502).json({ error: error?.message || 'AI 批改失败，请稍后再试' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Homework API listening on http://127.0.0.1:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});
