import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  Flag,
  Gift,
  Home,
  Medal,
  Pencil,
  PlusCircle,
  Printer,
  Settings,
  Sparkles,
  Star,
  Target,
  Trophy,
  Upload,
  Wrench,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import './styles.css';
import mascotImage from './assets/yanyixin-mascot.png';

const LEGACY_MONTHS = [
  { key: '2026-07', label: '2026年7月', short: '7月', days: 31 },
  { key: '2026-08', label: '2026年8月', short: '8月', days: 31 },
];

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const STORAGE_KEY = 'yan-yixin-summer-dashboard-v4';
const VIEW_STORAGE_KEY = 'yan-yixin-active-view';
const READING_SCOPE_STORAGE_KEY = 'yan-yixin-reading-scope';
const API_STATE_URL = '/api/state';
const API_GRADE_HOMEWORK_URL = '/api/grade-homework';
const API_AI_CONFIG_URL = '/api/ai-config';
const STATUS_ORDER = ['empty', 'done', 'excellent', 'super'];
const VALID_VIEWS = ['today', 'home', 'rewards', 'books', 'tools', 'settings'];

const STATUS = {
  empty: { label: '未打卡', points: 0 },
  done: { label: '已完成', points: 0 },
  excellent: { label: '优秀', points: 1 },
  super: { label: '非常优秀', points: 2 },
};

const REQUIRED_TODAY_SUBJECTS = ['语文', '数学', '英语', '阅读'];

const NAV_ITEMS = [
  { label: '今日打卡', icon: Home },
  { label: '积分奖励', icon: Trophy },
  { label: '阅读书单', icon: BookOpen },
  { label: '学习工具', icon: Pencil },
  { label: '设置中心', icon: Settings },
];

const LEARNING_SUBJECTS = ['语文', '数学', '英语'];
const LEARNING_TERMS = ['二年级上学期', '二年级下学期', '一年级下学期', '三年级上学期'];

const DEFAULT_GRADER_DRAFT = {
  term: '二年级上学期',
  subject: '数学',
  title: '',
  note: '',
  imageData: '',
  imageName: '',
};

const DEFAULT_AI_CONFIG_DRAFT = {
  activeProvider: 'aliyun',
  aliyun: {
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3-vl-plus',
    configured: false,
  },
  baidu: {
    apiKey: '',
    secretKey: '',
    configured: false,
    pollIntervalMs: 6000,
    timeoutMs: 60000,
  },
};

const REVIEW_TEMPLATES = {
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

const FIXED_CATEGORIES = [
  { name: '语文', color: 'blue', badge: '语' },
  { name: '数学', color: 'green', badge: '数' },
  { name: '英语', color: 'red', badge: '英' },
  { name: '阅读', color: 'purple', badge: '阅' },
  { name: '好习惯', color: 'orange', badge: '★' },
];

const DEFAULT_SUBJECTS = [
  {
    name: '语文',
    color: 'blue',
    badge: '书',
    rows: [
      {
        id: 'cn-daily',
        type: '固定',
        items: ['学而思暑期练习题：完成当天计划', '古诗：每2日一首，第一天学背，第二天复背', '作文金句练字：每天20分钟', '预习读课文：每天读10分钟'],
      },
      {
        id: 'cn-stage',
        type: '阶段',
        items: ['古诗书法作品：开学上交1份', '写话：完成5篇，注意标题、段落、标点', '其它：________'],
      },
    ],
  },
  {
    name: '数学',
    color: 'green',
    badge: '+',
    rows: [
      {
        id: 'math-daily',
        type: '固定',
        items: ['学而思暑期练习题：完成当天计划', '口算：每天5分钟', '乘法口诀：每天复习一遍'],
      },
      { id: 'math-stage', type: '阶段', items: ['小数报：每周完成一次阅读或练习', '其它：________'] },
    ],
  },
  {
    name: '英语',
    color: 'red',
    badge: 'ABC',
    rows: [
      {
        id: 'en-daily',
        type: '固定',
        items: ['抄写Unit：每天抄写一遍', '新单词：每天学习10个', '英语典范：每天读1篇', '英语小绘本：每天读1篇'],
      },
    ],
  },
  {
    name: '阅读',
    color: 'purple',
    badge: '阅',
    rows: [
      { id: 'read-daily', type: '固定', items: ['每日阅读：每天30分钟', '读书笔记：可摘抄好词好句', '其它：________'] },
      { id: 'read-stage', type: '阶段', items: ['读书娃成长手册：填写字数、自评、家长评、家长寄语', '课外书阅读进度检查'] },
    ],
  },
  {
    name: '好习惯',
    color: 'orange',
    badge: '★',
    rows: [
      {
        id: 'habit',
        type: '积分',
        habit: true,
        items: ['不睡懒觉', '认真吃饭', '看电视不超时', '桌面整洁', '物品归位', '按时洗漱', '礼貌待人'],
      },
    ],
  },
];

const DEFAULT_BOOKS = ['《尼尔斯骑鹅历险记》', '《一本看遍动物世界》', '《飞天奇翼龙》', '《抹香鲸的微笑（注音版）》'];
const DEFAULT_BOOK_TYPES = ['自然', '科学', '百科', '历史', '地理', '童话', '文学', '小说', '漫画', '文化', '品格', '艺术', '生活', '其它'];

const DEFAULT_REWARDS = [
  { id: 'reward-notebook', points: '200', name: '精美笔记本' },
  { id: 'reward-bookmark', points: '120', name: '可爱书签' },
  { id: 'reward-medal', points: '300', name: '荣誉勋章' },
];

const DEFAULT_REMINDERS = [
  '每天安排固定的学习和休息时间，劳逸结合哦！',
  '记得每天阅读20分钟，积累知识。',
  '完成计划后及时打卡，养成好习惯！',
];

const POINT_RULES = [
  { status: 'done', label: '已完成', score: '0分', note: '任务完成，打勾记录，不额外加积分。' },
  { status: 'excellent', label: '优秀', score: '+1分', note: '完成质量好，奖励1个积分。' },
  { status: 'super', label: '非常优秀', score: '+2分', note: '完成质量非常棒，奖励2个积分。' },
];

const POINT_RULE_DETAILS = [
  {
    title: '普通学习任务',
    badge: '打卡',
    score: '0 / +1 / +2',
    note: '语文、数学、英语、阅读等普通任务有三种有效状态：已完成只记录进度不加分；优秀 +1 分；非常优秀 +2 分。',
  },
  {
    title: '好习惯任务',
    badge: '习惯',
    score: '完成即加分',
    note: '好习惯不区分优秀等级，只要当天完成，就按该习惯设置的积分计入本月积分；默认每项 +2 分。',
  },
  {
    title: '阅读奖励',
    badge: '阅读',
    score: '领取后计入',
    note: '书本达到阅读计划后，需要在阅读页领取读完奖励；领取后才会加入本月积分和可用积分。',
  },
  {
    title: '累计积分',
    badge: '累计',
    score: '所有月份累计',
    note: '累计积分会把当前系统中所有月份的任务积分和已领取阅读奖励加总，用来查看长期努力成果。',
  },
  {
    title: '可用积分',
    badge: '可用',
    score: '本月积分 - 已兑换',
    note: '可用积分用于兑换奖励。每兑换一次奖励，会扣除对应积分；没有兑换时，可用积分等于本月积分。',
  },
];

const REWARD_ICON_OPTIONS = [
  { value: 'gift', label: '礼盒', symbol: '🎁' },
  { value: 'star', label: '星星', symbol: '⭐' },
  { value: 'medal', label: '勋章', symbol: '🏅' },
  { value: 'trophy', label: '奖杯', symbol: '🏆' },
  { value: 'book', label: '图书', symbol: '📚' },
  { value: 'pencil', label: '文具', symbol: '✏️' },
  { value: 'toy', label: '玩具', symbol: '🧸' },
  { value: 'car', label: '小车', symbol: '🚗' },
  { value: 'puzzle', label: '积木', symbol: '🧩' },
];

function normalizeStatus(status) {
  return STATUS[status] ? status : 'empty';
}

function snapshotLabel(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function weekday(monthKey, day) {
  const [year, month] = monthKey.split('-').map(Number);
  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function rewardKey(item, index) {
  return item.id || `reward-${index}`;
}

function normalizeRewardConfig(config = DEFAULT_REWARDS) {
  const source = config?.length ? config : DEFAULT_REWARDS;
  return source.map((item, index) => ({
    id: item.id || `reward-${index}`,
    points: item.points ?? '',
    name: item.name ?? '',
    description: item.description ?? '',
    icon: item.icon || REWARD_ICON_OPTIONS[index % REWARD_ICON_OPTIONS.length].value,
  }));
}

function sortRewardsByPoints(rewards = []) {
  return [...rewards].sort((a, b) => {
    const aPoints = Number(a.points || 0) || Number.MAX_SAFE_INTEGER;
    const bPoints = Number(b.points || 0) || Number.MAX_SAFE_INTEGER;
    if (aPoints !== bPoints) return aPoints - bPoints;
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
  });
}

function normalizeView(view) {
  return VALID_VIEWS.includes(view) ? view : defaultViewForDevice();
}

function defaultViewForDevice() {
  return window.matchMedia?.('(max-width: 920px)').matches ? 'today' : 'home';
}

function initialActiveView() {
  const hashView = window.location.hash.replace(/^#/, '');
  if (VALID_VIEWS.includes(hashView)) return hashView;
  return defaultViewForDevice();
}

function initialReadingScope() {
  return localStorage.getItem(READING_SCOPE_STORAGE_KEY) === 'library' ? 'library' : 'month';
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function createMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function findCurrentMonthIndex(months = []) {
  const today = new Date();
  const currentKey = createMonthKey(today.getFullYear(), today.getMonth() + 1);
  const exactIndex = months.findIndex((month) => month.key === currentKey || createMonthKey(Number(month.year), Number(month.month)) === currentKey);
  if (exactIndex >= 0) return exactIndex;
  return 0;
}

function createMonthShell(year, month) {
  const key = createMonthKey(year, month);
  return {
    id: key,
    key,
    year,
    month,
    label: `${year}年${month}月`,
    short: `${month}月`,
    days: daysInMonth(year, month),
    title: '学习好习惯·快乐成长每一天',
    goal: '',
    categories: [],
    readingBooks: [],
    claimedReadingRewards: {},
    redeemedRewards: [],
    checks: {},
    notes: {},
  };
}

function legacySubjectsToCategories(subjects = DEFAULT_SUBJECTS) {
  return subjects.map((subject, subjectIndex) => ({
    id: `cat-${subject.color || subjectIndex}`,
    name: subject.name,
    color: subject.color,
    badge: subject.badge,
    tasks: subject.rows.flatMap((group, groupIndex) =>
      group.items.map((item, itemIndex) => ({
        id: `${group.id}-${itemIndex}`,
        title: item,
        type: group.type === '阶段' ? 'stage' : 'daily',
        startDay: 1,
        endDay: 31,
        checkMode: 'daily',
        importance: 'normal',
        ...(subject.name === '好习惯' ? { habitPoints: 2 } : {}),
        legacyGroupType: group.type,
      })),
    ),
  }));
}

function createDefaultMonths() {
  return LEGACY_MONTHS.map((legacyMonth) => {
    const [year, month] = legacyMonth.key.split('-').map(Number);
    const nextMonth = createMonthShell(year, month);
    nextMonth.title = month === 7 || month === 8 ? '夏日好习惯·快乐成长每一天' : '学习好习惯·快乐成长每一天';
    nextMonth.goal = month === 7 ? '按计划完成暑假作业' : '坚持阅读和练字';
    nextMonth.categories = legacySubjectsToCategories(DEFAULT_SUBJECTS).map((category) => ({
      ...category,
      tasks: category.tasks.map((task) => ({
        ...task,
        endDay: nextMonth.days,
      })),
    }));
    nextMonth.readingBooks = DEFAULT_BOOKS.map((name, index) => ({
      id: `book-${legacyMonth.key}-${index}`,
      name,
      startDay: 1,
      endDay: nextMonth.days,
      totalPages: '',
      rewardPoints: 10,
    }));
    return nextMonth;
  });
}

function createSummerTemplate(months = createDefaultMonths()) {
  return {
    id: 'template-summer-2026',
    name: '7-8月暑假模板',
    categories: structuredClone(months[0]?.categories || []),
    readingBooks: structuredClone(months[0]?.readingBooks || []),
  };
}

function normalizeLibraryBooks(books = []) {
  const seen = new Set();
  return books
    .map((book, index) => (typeof book === 'string' ? { name: book, id: `library-${index}` } : book))
    .filter((book) => book?.name)
    .map((book) => ({
      id: book.id || createId('library-book'),
      name: book.name || '新的书目',
      type: book.type || '其它',
      totalPages: book.totalPages ?? '',
      rewardPoints: Number(book.rewardPoints || 10),
      addedAt: book.addedAt || new Date().toISOString(),
    }))
    .filter((book) => {
      const key = book.name.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeBookTypes(types = DEFAULT_BOOK_TYPES) {
  const seen = new Set();
  const normalized = (Array.isArray(types) ? types : DEFAULT_BOOK_TYPES)
    .map((type) => String(type || '').trim())
    .filter(Boolean)
    .filter((type) => {
      if (seen.has(type)) return false;
      seen.add(type);
      return true;
    });
  if (!normalized.includes('其它')) normalized.push('其它');
  return normalized;
}

function collectLibraryBooks(state) {
  const books = [];
  (state.months || []).forEach((month) => {
    (month.readingBooks || []).forEach((book) => {
      books.push({
        id: book.id,
        name: book.name,
        type: book.type || '其它',
        totalPages: book.totalPages ?? '',
        rewardPoints: Number(book.rewardPoints || 10),
        addedAt: book.addedAt || `${month.key || month.id}-01`,
      });
    });
  });
  if (!books.length) {
    (state.books || DEFAULT_BOOKS).forEach((name, index) => {
      books.push({ id: `library-default-${index}`, name, type: '其它', totalPages: '', rewardPoints: 10 });
    });
  }
  return normalizeLibraryBooks(books);
}

function readingCategoryFor(month) {
  const existing = month.categories.find((category) => category.name === '阅读');
  if (existing) return existing;
  return { id: 'cat-reading', name: '阅读', color: 'purple', badge: '阅', tasks: [] };
}

function buildTaskRows(month) {
  const monthCategories = (month?.categories || []).map((category) => ({
    ...category,
    tasks: [...(category.tasks || [])],
  }));
  const readingCategory = readingCategoryFor(month);
  let targetReading = monthCategories.find((category) => category.id === readingCategory.id || category.name === '阅读');
  if (!targetReading) {
    targetReading = { ...readingCategory, tasks: [] };
    monthCategories.push(targetReading);
  }

  return monthCategories.flatMap((subject) => {
    const tasks = subject.tasks || [];
    const subjectRowSpan = Math.max(1, tasks.length);
    let isFirstSubjectRow = true;

    return tasks.map((task, itemIndex) => {
        const linkedBook = task.bookId ? month.readingBooks?.find((book) => book.id === task.bookId) : null;
        const effectiveType = linkedBook ? 'reading' : task.type;
        const typeLabel = effectiveType === 'reading' ? '阅读' : effectiveType === 'stage' ? '阶段' : '每日';
        const taskRow = {
          id: linkedBook?.id || task.id,
          subject: subject.name,
          color: subject.color,
          badge: subject.badge,
          subjectRowSpan,
          firstSubjectRow: isFirstSubjectRow,
          type: typeLabel,
          typeKey: effectiveType,
          typeRowSpan: 1,
          firstTypeRow: true,
          item: linkedBook ? `${linkedBook.name}（读完奖励 +${Number(linkedBook.rewardPoints || 10)}分）` : task.title || '未命名任务',
          task,
          book: linkedBook,
          startDay: Number(task.startDay || 1),
          endDay: Number(task.endDay || month.days),
          checkMode: task.checkMode || 'daily',
          importance: task.importance || 'normal',
          habitPoints: Number(task.habitPoints || 2),
        };
        isFirstSubjectRow = false;
        return taskRow;
      });
  });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? sanitizeLoadedState(saved) : createSeedState();
  } catch {
    return createSeedState();
  }
}

async function fetchDatabaseState() {
  const response = await fetch(API_STATE_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('读取数据库失败');
  return response.json();
}

async function saveDatabaseState(state) {
  const response = await fetch(API_STATE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: createLocalCacheState(state) }),
  });
  if (!response.ok) throw new Error('保存数据库失败');
  return response.json();
}

async function fetchAiConfig() {
  const response = await fetch(API_AI_CONFIG_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('读取 AI 配置失败');
  return response.json();
}

async function saveAiConfig(config) {
  const response = await fetch(API_AI_CONFIG_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || '保存 AI 配置失败');
  return payload;
}

function sanitizeLoadedState(saved) {
  const next = structuredClone(saved);
  if (!next.months) {
    return migrateLegacyState(next);
  }
  next.months = next.months.map(normalizeMonth);
  next.libraryBooks = normalizeLibraryBooks(next.libraryBooks?.length ? next.libraryBooks : collectLibraryBooks(next));
  next.bookTypes = normalizeBookTypes(next.bookTypes);
  next.learningTools = normalizeLearningTools(next.learningTools);
  next.snapshots = [];
  next.taskConfig?.forEach((subject) => {
    if (subject.name !== '好习惯') return;
    subject.rows?.forEach((row) => {
      row.items = row.items?.map((item) => item.replace(/\s*\+2分?$/, '')) || [];
    });
  });
  return next;
}

function createLocalCacheState(current) {
  if (!current || typeof current !== 'object') return current;
  return {
    ...current,
    libraryBooks: normalizeLibraryBooks(current.libraryBooks || []),
    bookTypes: normalizeBookTypes(current.bookTypes),
    learningTools: normalizeLearningTools(current.learningTools),
    snapshots: [],
  };
}

function normalizeLearningTools(value = {}) {
  return {
    reviews: (value.reviews || []).map((review) => ({
      id: review.id || createId('review'),
      term: review.term || '二年级上学期',
      subject: LEARNING_SUBJECTS.includes(review.subject) ? review.subject : '数学',
      title: review.title || '作业批改',
      note: review.note || '',
      imageData: '',
      imageName: review.imageName || '',
      score: Number(review.score || 0),
      provider: review.provider || '',
      detectedSubject: LEARNING_SUBJECTS.includes(review.detectedSubject) ? review.detectedSubject : '',
      detectedTitle: review.detectedTitle || '',
      summary: review.summary || '',
      suggestions: normalizeReviewSuggestions(review.suggestions),
      imageAnnotations: normalizeReviewAnnotations(review.imageAnnotations),
      annotatedImageUrl: String(review.annotatedImageUrl || '').startsWith('data:') ? '' : (review.annotatedImageUrl || ''),
      mistakes: normalizeReviewMistakes(review.mistakes).map((mistake) => normalizeMistake(mistake, review.subject)),
      createdAt: review.createdAt || new Date().toISOString(),
    })),
    mistakes: (value.mistakes || []).map((mistake) => normalizeMistake(mistake)),
  };
}

function normalizeMistake(mistake = {}, fallbackSubject = '数学') {
  return {
    id: mistake.id || createId('mistake'),
    reviewId: mistake.reviewId || '',
    term: mistake.term || '二年级上学期',
    subject: LEARNING_SUBJECTS.includes(mistake.subject) ? mistake.subject : fallbackSubject,
    isWrong: mistake.isWrong !== false,
    question: mistake.question || '未命名错题',
    answer: mistake.answer || '',
    correctAnswer: mistake.correctAnswer || '',
    explanation: mistake.explanation || '',
    questionImageUrl: mistake.questionImageUrl || '',
    sourceTitle: mistake.sourceTitle || 'AI作业批改',
    createdAt: mistake.createdAt || new Date().toISOString(),
    mastered: Boolean(mistake.mastered),
  };
}

function normalizeReviewAnnotations(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const rawArea = item?.area || {};
      const area = Array.isArray(rawArea)
        ? { left: rawArea[0], top: rawArea[1], width: rawArea[2], height: rawArea[3] }
        : rawArea;
      const left = Number(area.left);
      const top = Number(area.top);
      const width = Number(area.width);
      const height = Number(area.height);
      if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
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
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

function buildFallbackAnnotations(mistakes = []) {
  const normalizedMistakes = normalizeReviewMistakes(mistakes);
  const count = Math.max(1, normalizedMistakes.length);
  if (!normalizedMistakes.length) {
    return [{
      order: 1,
      status: 'pending',
      label: '批',
      area: { left: 8, top: 16, width: 84, height: 70 },
      approximate: true,
    }];
  }
  return normalizedMistakes.map((mistake, index) => {
    const order = Number(mistake.order || index + 1);
    const top = 16 + (index * Math.min(64 / count, 13));
    return {
      order,
      status: 'wrong',
      label: '错',
      area: {
        left: 8,
        top: Math.min(84, top),
        width: 84,
        height: Math.max(7, Math.min(12, 58 / count)),
      },
      approximate: true,
    };
  });
}

function normalizeReviewSuggestions(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\n|[；;]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function questionNumberKey(text = '') {
  const value = String(text || '').trim();
  const match = value.match(/(?:第\s*)?([0-9０-９一二三四五六七八九十]+)\s*(?:题|[.．、])/);
  return match ? `no-${match[1]}` : value.replace(/\s+/g, '').slice(0, 36);
}

function normalizeReviewMistakes(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && item.isWrong !== false && (item.correctAnswer || item.explanation))
    .map((item, index) => ({
      ...item,
      order: Number(item.order || index + 1),
    }))
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
    .filter((item) => {
      const key = questionNumberKey(item.question);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function aiConfigStatusText(config = {}) {
  if (config.activeProvider === 'baidu') {
    return config.baidu?.configured ? '当前启用：百度智能作业批改' : '当前选择百度，但百度未配置，无法批改';
  }
  return config.aliyun?.configured ? '当前启用：阿里 qwen3-vl-plus' : '当前选择阿里，但未配置 Key，会使用演示批改';
}

function aiConfigDraftFromPublic(config = {}) {
  return {
    ...DEFAULT_AI_CONFIG_DRAFT,
    ...config,
    aliyun: { ...DEFAULT_AI_CONFIG_DRAFT.aliyun, ...(config.aliyun || {}), apiKey: '' },
    baidu: { ...DEFAULT_AI_CONFIG_DRAFT.baidu, ...(config.baidu || {}), apiKey: '', secretKey: '' },
  };
}

function normalizeMonth(month) {
  const normalized = {
    ...createMonthShell(Number(month.year), Number(month.month)),
    ...month,
  };
  normalized.days = daysInMonth(normalized.year, normalized.month);
  normalized.title ||= '夏日好习惯·快乐成长每一天';
  normalized.categories ||= [];
  normalized.readingBooks ||= [];
  normalized.claimedReadingRewards ||= {};
  normalized.redeemedRewards ||= [];
  normalized.checks ||= {};
  normalized.notes ||= {};
  normalized.categories = normalized.categories.map((category, categoryIndex) => ({
    id: category.id || createId('cat'),
    name: category.name || `分类${categoryIndex + 1}`,
    color: category.color || ['blue', 'green', 'red', 'purple', 'orange'][categoryIndex % 5],
    badge: category.badge || category.name?.slice(0, 1) || '类',
    tasks: (category.tasks || []).map((task) => {
      const selectedBook = task.bookId ? normalized.readingBooks.find((book) => book.id === task.bookId) : null;
      const normalizedTask = {
        id: task.id || createId('task'),
        title: selectedBook?.name || task.title || '',
        type: selectedBook ? 'stage' : task.type || 'daily',
        startDay: Math.max(1, Math.min(normalized.days, Number(task.startDay || 1))),
        endDay: Math.max(1, Math.min(normalized.days, Number(task.endDay || normalized.days))),
        checkMode: task.type === 'stage' ? task.checkMode || 'daily' : 'daily',
        importance: task.importance === 'important' ? 'important' : 'normal',
        ...(selectedBook ? { bookId: selectedBook.id, checkMode: task.checkMode || 'daily' } : {}),
      };
      if (category.name === '好习惯') normalizedTask.habitPoints = Number(task.habitPoints || 2);
      return normalizedTask;
    }),
  }));
  normalized.readingBooks = normalized.readingBooks.map((book) => ({
    id: book.id || createId('book'),
    name: book.name || '新的书目',
    startDay: Math.max(1, Math.min(normalized.days, Number(book.startDay || 1))),
    endDay: Math.max(1, Math.min(normalized.days, Number(book.endDay || normalized.days))),
    checkMode: book.checkMode === 'stage' ? 'stage' : 'daily',
    type: book.type || '其它',
    totalPages: book.totalPages ?? '',
    rewardPoints: Number(book.rewardPoints || 10),
    addedAt: book.addedAt || '',
  }));
  normalized.redeemedRewards = normalized.redeemedRewards.map((record) => ({
    id: record.id || createId('redeem'),
    rewardId: record.rewardId || '',
    name: record.name || '未命名奖励',
    points: Number(record.points || 0),
    redeemedAt: record.redeemedAt || new Date().toISOString(),
  }));
  return normalized;
}

function migrateLegacyState(saved) {
  const months = LEGACY_MONTHS.map((legacyMonth) => {
    const [year, month] = legacyMonth.key.split('-').map(Number);
    const nextMonth = createMonthShell(year, month);
    const legacySubjects = saved.taskConfig || DEFAULT_SUBJECTS;
    nextMonth.title = saved.titles?.[legacyMonth.key] || (month === 7 || month === 8 ? '夏日好习惯·快乐成长每一天' : '学习好习惯·快乐成长每一天');
    nextMonth.goal = saved.goals?.[legacyMonth.key] || (month === 7 ? '按计划完成暑假作业' : '坚持阅读和练字');
    nextMonth.categories = legacySubjectsToCategories(legacySubjects).map((category) => ({
      ...category,
      tasks: category.tasks.map((task) => ({
        ...task,
        endDay: nextMonth.days,
      })),
    }));
    nextMonth.readingBooks = (saved.books || DEFAULT_BOOKS).map((name, index) => ({
      id: `book-${legacyMonth.key}-${index}`,
      name,
      startDay: 1,
      endDay: nextMonth.days,
      totalPages: '',
      rewardPoints: 10,
    }));
    nextMonth.checks = structuredClone(saved.checks?.[legacyMonth.key] || {});
    return nextMonth;
  });
  const backupSnapshot = {
    id: Date.now(),
    label: '旧版本数据备份',
    month: '旧版本',
    data: structuredClone(saved),
  };
  return {
    ...saved,
    months,
    templates: saved.templates?.length ? saved.templates : [createSummerTemplate(months)],
    activeMonthId: months[0]?.id,
    snapshots: [],
    libraryBooks: collectLibraryBooks({ ...saved, months }),
    bookTypes: normalizeBookTypes(saved.bookTypes),
    learningTools: normalizeLearningTools(saved.learningTools),
  };
}

function createSeedState() {
  const months = createDefaultMonths();
  return {
    months,
    templates: [createSummerTemplate(months)],
    activeMonthId: months[0]?.id,
    rewardConfig: DEFAULT_REWARDS,
    libraryBooks: normalizeLibraryBooks(DEFAULT_BOOKS.map((name, index) => ({ id: `library-default-${index}`, name, type: '其它' }))),
    bookTypes: DEFAULT_BOOK_TYPES,
    books: DEFAULT_BOOKS,
    reminders: DEFAULT_REMINDERS,
    learningTools: { reviews: [], mistakes: [] },
  };
}

function BookStack() {
  return (
    <div className="book-stack" aria-hidden="true">
      <span className="book book-a" />
      <span className="book book-b" />
      <span className="book book-c" />
      <span className="pencil" />
      <span className="leaf leaf-a" />
      <span className="leaf leaf-b" />
    </div>
  );
}

function StatusButton({ value, onClick, label, disabled = false }) {
  return (
    <button className={`status status-${value}`} onClick={onClick} aria-label={label} disabled={disabled}>
      {value === 'done' && <Check size={13} strokeWidth={3.2} />}
      {value === 'excellent' && <Star size={17} fill="currentColor" strokeWidth={2.8} />}
      {value === 'super' && <span className="rose-icon" aria-hidden="true">🌹</span>}
    </button>
  );
}

function isTaskActiveOnDay(row, day) {
  if (!row) return false;
  if (row.typeKey === 'daily') return true;
  return day >= Number(row.startDay || 1) && day <= Number(row.endDay || 31);
}

function isTaskCheckableOnDay(row, day) {
  if (!isTaskActiveOnDay(row, day)) return false;
  if ((row.typeKey === 'stage' || row.typeKey === 'reading') && row.checkMode === 'stage') {
    return day === Number(row.startDay || 1);
  }
  return true;
}

function taskCheckDayForToday(row, day) {
  if (!row || !isTaskActiveOnDay(row, day)) return null;
  if ((row.typeKey === 'stage' || row.typeKey === 'reading') && row.checkMode === 'stage') {
    return Number(row.startDay || day);
  }
  return day;
}

function stageCompletedDay(row, month, todayDay) {
  if (!row || row.checkMode !== 'stage') return null;
  const startDay = Math.max(1, Number(row.startDay || 1));
  const endDay = Math.min(Number(todayDay || startDay), Number(row.endDay || todayDay || startDay));
  const checks = month.checks?.[row.id] || {};
  for (let day = startDay; day <= endDay; day += 1) {
    if (normalizeStatus(checks[day] || 'empty') !== 'empty') return day;
  }
  return null;
}

function isBeforeToday(monthKey, day) {
  const [year, month] = monthKey.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return targetDate < today;
}

function formatCellNote(note) {
  if (!note) return '';
  if (typeof note === 'string') return note;
  if (typeof note === 'object') {
    const startPage = note.startPage || '';
    const endPage = note.endPage || '';
    if (startPage && endPage) return `第${startPage}页 - 第${endPage}页`;
    if (endPage) return `读到第${endPage}页`;
    if (startPage) return `从第${startPage}页开始`;
  }
  return '';
}

function completedReadingRewards(month) {
  return (month.readingBooks || []).reduce((sum, book) => {
    const start = Number(book.startDay || 1);
    const end = Number(book.endDay || month.days);
    const isComplete = book.checkMode === 'stage'
      ? normalizeStatus(month.checks?.[book.id]?.[start] || 'empty') !== 'empty'
      : Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
        .every((day) => normalizeStatus(month.checks?.[book.id]?.[day] || 'empty') !== 'empty');
    return sum + (isComplete && month.claimedReadingRewards?.[book.id] ? Number(book.rewardPoints || 10) : 0);
  }, 0);
}

function readingBookStats(month, book) {
  const startDay = Math.max(1, Math.min(month.days, Number(book.startDay || 1)));
  const endDay = Math.max(startDay, Math.min(month.days, Number(book.endDay || month.days)));
  const rangeDays = Array.from({ length: Math.max(0, endDay - startDay + 1) }, (_, index) => startDay + index);
  const checks = month.checks?.[book.id] || {};
  const notes = month.notes?.[book.id] || {};
  const checkedDays = rangeDays.filter((day) => normalizeStatus(checks[day] || 'empty') !== 'empty');
  const isComplete = book.checkMode === 'stage'
    ? normalizeStatus(checks[startDay] || 'empty') !== 'empty'
    : rangeDays.length > 0 && checkedDays.length === rangeDays.length;
  const isClaimed = Boolean(month.claimedReadingRewards?.[book.id]);
  const totalPages = Number(book.totalPages || 0);
  let currentPage = 0;
  const records = rangeDays
    .map((day) => {
      const note = notes[day];
      const status = normalizeStatus(checks[day] || 'empty');
      if (status !== 'empty' && note && typeof note === 'object') {
        const endPage = Number(note.endPage || 0);
        if (endPage > currentPage) currentPage = endPage;
      }
      return {
        day,
        status,
        noteText: formatCellNote(note),
        hasNote: Boolean(note),
        isCompleted: status !== 'empty',
      };
    })
    .filter((record) => record.status !== 'empty' || record.hasNote)
    .reverse()
    .slice(0, 4);
  const today = new Date();
  const isSameMonth = today.getFullYear() === Number(month.year) && today.getMonth() + 1 === Number(month.month);
  const todayDay = isSameMonth ? today.getDate() : 0;
  const isInRangeToday = isSameMonth && todayDay >= startDay && todayDay <= endDay;
  const isFuture = isSameMonth ? todayDay < startDay : new Date(Number(month.year), Number(month.month) - 1, startDay) > new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const progress = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : null;
  const displayProgress = isComplete ? 100 : progress ?? 0;
  const statusGroup = isComplete ? 'finished' : isInRangeToday ? 'reading' : isFuture ? 'upcoming' : 'unfinished';

  return {
    startDay,
    endDay,
    rangeDays,
    checkedDays: book.checkMode === 'stage' && isComplete ? 1 : checkedDays.length,
    totalDays: book.checkMode === 'stage' ? 1 : rangeDays.length,
    isComplete,
    isClaimed,
    totalPages,
    currentPage,
    progress,
    displayProgress,
    records,
    rewardPoints: Number(book.rewardPoints || 10),
    statusGroup,
  };
}

function defaultReadingRange(month) {
  const today = new Date();
  const isSameMonth = today.getFullYear() === Number(month.year) && today.getMonth() + 1 === Number(month.month);
  const startDay = isSameMonth ? Math.min(month.days, today.getDate() + 1) : 1;
  return {
    startDay,
    endDay: Math.min(month.days, startDay + 6),
  };
}

function App() {
  const [state, setState] = useState(loadState);
  const [monthIndex, setMonthIndex] = useState(() => findCurrentMonthIndex((state.months?.length ? state.months : createDefaultMonths()).map(normalizeMonth)));
  const stateRef = useRef(state);
  const loadingFromDatabase = useRef(true);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState('正在连接数据库...');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  const localSaveTimerRef = useRef(null);
  const databaseSaveTimerRef = useRef(null);
  const saveToastTimerRef = useRef(null);
  const manualSavePendingRef = useRef(false);
  const [activePanel, setActivePanel] = useState(null);
  const [activeView, setActiveView] = useState(initialActiveView);
  const [categoryDraft, setCategoryDraft] = useState('语文');
  const [readingNoteEditor, setReadingNoteEditor] = useState(null);
  const [readingPlanEditor, setReadingPlanEditor] = useState(null);
  const [rewardCelebration, setRewardCelebration] = useState(null);
  const [rewardExchangeCelebration, setRewardExchangeCelebration] = useState(null);
  const [readingScope, setReadingScope] = useState(initialReadingScope);
  const [readingTab, setReadingTab] = useState('reading');
  const [readingViewMode, setReadingViewMode] = useState('card');
  const [libraryTypeFilter, setLibraryTypeFilter] = useState('所有');
  const [libraryStatusFilter, setLibraryStatusFilter] = useState('');
  const [isLibraryTypeMenuOpen, setIsLibraryTypeMenuOpen] = useState(false);
  const [libraryViewMode, setLibraryViewMode] = useState('card');
  const [newBookDialog, setNewBookDialog] = useState(null);
  const [bookTypesDialog, setBookTypesDialog] = useState(null);
  const [bookPagesDialog, setBookPagesDialog] = useState(null);
  const [newRewardDialog, setNewRewardDialog] = useState(null);
  const [expandedReadingPlans, setExpandedReadingPlans] = useState({});
  const [learningTab, setLearningTab] = useState('grader');
  const [graderDraft, setGraderDraft] = useState(DEFAULT_GRADER_DRAFT);
  const [latestReview, setLatestReview] = useState(null);
  const [showPreviousReview, setShowPreviousReview] = useState(true);
  const [isGradingHomework, setIsGradingHomework] = useState(false);
  const [gradingElapsedSeconds, setGradingElapsedSeconds] = useState(0);
  const [isPreparingHomeworkImage, setIsPreparingHomeworkImage] = useState(false);
  const [gradingError, setGradingError] = useState('');
  const homeworkImageRef = useRef(DEFAULT_GRADER_DRAFT.imageData);
  const [aiConfigDraft, setAiConfigDraft] = useState(DEFAULT_AI_CONFIG_DRAFT);
  const [aiConfigDialogOpen, setAiConfigDialogOpen] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] = useState(DEFAULT_AI_CONFIG_DRAFT.activeProvider);
  const [aiConfigStatus, setAiConfigStatus] = useState('未读取 AI 配置');
  const [mistakeTermFilter, setMistakeTermFilter] = useState('二年级上学期');
  const [mistakeSubjectFilter, setMistakeSubjectFilter] = useState('全部');
  const [hiddenTodayStageTasks, setHiddenTodayStageTasks] = useState({});
  const [todayFocusTaskId, setTodayFocusTaskId] = useState('');
  const [settingsFocusCategory, setSettingsFocusCategory] = useState('');
  const [isBackfillMode, setIsBackfillMode] = useState(false);
  const months = useMemo(() => (state.months?.length ? state.months.map(normalizeMonth) : createDefaultMonths()), [state.months]);
  const month = months[Math.min(monthIndex, months.length - 1)] || months[0];
  const rewardConfig = useMemo(() => sortRewardsByPoints(normalizeRewardConfig(state.rewardConfig || DEFAULT_REWARDS)), [state.rewardConfig]);
  const learningTools = useMemo(() => normalizeLearningTools(state.learningTools), [state.learningTools]);
  const libraryBooks = useMemo(() => normalizeLibraryBooks(state.libraryBooks || collectLibraryBooks({ ...state, months })), [state.libraryBooks, months]);
  const bookTypes = useMemo(() => normalizeBookTypes(state.bookTypes), [state.bookTypes]);
  const homeworkReviews = learningTools.reviews;
  const displayHomeworkReview = latestReview || (showPreviousReview ? homeworkReviews[0] : null);
  const mistakeItems = learningTools.mistakes;
  const books = useMemo(() => month.readingBooks?.map((book) => book.name) || state.books || DEFAULT_BOOKS, [month.readingBooks, state.books]);
  const reminders = useMemo(() => state.reminders || DEFAULT_REMINDERS, [state.reminders]);
  const snapshots = useMemo(() => state.snapshots || [], [state.snapshots]);

  const showSaveToast = (message, type = 'success') => {
    setSaveToast({ message, type });
    if (saveToastTimerRef.current) window.clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = window.setTimeout(() => setSaveToast(null), 2200);
  };

  useEffect(() => {
    stateRef.current = state;
    if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = window.setTimeout(() => {
      const saveLocalCache = () => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(createLocalCacheState(stateRef.current)));
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      };
      if (window.requestIdleCallback) {
        window.requestIdleCallback(saveLocalCache, { timeout: 1400 });
      } else {
        saveLocalCache();
      }
    }, 1500);

    if (!databaseReady || loadingFromDatabase.current) return undefined;
    if (manualSavePendingRef.current) {
      setHasUnsavedChanges(true);
      setDatabaseStatus('全月表有未保存修改，请点击保存');
      if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
      return () => {
        if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
        if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
      };
    }
    setHasUnsavedChanges(true);
    setDatabaseStatus('有未保存修改，正在自动保存...');
    if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
    databaseSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveDatabaseState(stateRef.current);
        setHasUnsavedChanges(false);
        setDatabaseStatus('已自动保存到 SQLite');
        showSaveToast('已保存到数据库');
      } catch {
        setDatabaseStatus('数据库保存失败，修改暂存在本机');
        showSaveToast('数据库保存失败', 'error');
      }
    }, 1800);

    return () => {
      if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
      if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
    };
  }, [state, databaseReady]);

  useEffect(() => () => {
    if (saveToastTimerRef.current) window.clearTimeout(saveToastTimerRef.current);
  }, []);

  useEffect(() => {
    const nextView = normalizeView(activeView);
    localStorage.setItem(VIEW_STORAGE_KEY, nextView);
    if (window.location.hash !== `#${nextView}`) {
      window.history.replaceState(null, '', `#${nextView}`);
    }
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem(READING_SCOPE_STORAGE_KEY, readingScope === 'library' ? 'library' : 'month');
  }, [readingScope]);

  useEffect(() => {
    const syncViewFromHash = () => {
      setActiveView(normalizeView(window.location.hash.replace(/^#/, '')));
    };
    window.addEventListener('hashchange', syncViewFromHash);
    return () => window.removeEventListener('hashchange', syncViewFromHash);
  }, []);

  useEffect(() => {
    fetchAiConfig()
      .then((payload) => {
        setAiConfigDraft(aiConfigDraftFromPublic(payload.config || {}));
        setSelectedAiProvider(payload.config?.activeProvider === 'baidu' ? 'baidu' : 'aliyun');
        setAiConfigStatus(aiConfigStatusText(payload.config || {}));
      })
      .catch(() => {
        setAiConfigStatus('AI 配置读取失败');
      });
  }, []);

  useEffect(() => {
    if (!isGradingHomework) {
      setGradingElapsedSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setGradingElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isGradingHomework]);

  useEffect(() => {
    let active = true;

    fetchDatabaseState()
      .then(async (payload) => {
        if (!active) return;
        loadingFromDatabase.current = true;
        if (payload.state?.months || payload.state?.checks) {
          const loadedState = sanitizeLoadedState(payload.state);
          setState(loadedState);
          setMonthIndex(findCurrentMonthIndex(loadedState.months || []));
          setDatabaseStatus('已连接 SQLite');
        } else {
          await saveDatabaseState(stateRef.current);
          if (!active) return;
          setMonthIndex(findCurrentMonthIndex((stateRef.current?.months || []).map(normalizeMonth)));
          setDatabaseStatus('已初始化 SQLite');
        }
        setDatabaseReady(true);
        setHasUnsavedChanges(false);
        window.setTimeout(() => {
          loadingFromDatabase.current = false;
        }, 0);
      })
      .catch(() => {
        if (!active) return;
        setDatabaseStatus('数据库连接失败，暂存本机');
      });

    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => buildTaskRows(month), [month]);

  const getStatus = (rowId, day) => normalizeStatus(month?.checks?.[rowId]?.[day] || 'empty');

  const cycleStatus = (rowId, day, options = {}) => {
    const row = rows.find((candidate) => candidate.id === rowId);
    if (!row || !isTaskCheckableOnDay(row, day)) return;
    if (isBeforeToday(month.key, day) && !options.allowActiveToday) return;
    if (options.manualSaveOnly) manualSavePendingRef.current = true;
    setState((current) => {
      const next = structuredClone(current || {});
      const targetMonth = next.months.find((item) => item.id === month.id);
      targetMonth.checks ||= {};
      targetMonth.notes ||= {};
      targetMonth.checks[rowId] ||= {};
      const currentStatus = normalizeStatus(targetMonth.checks[rowId][day] || 'empty');
      const isHabit = row.subject === '好习惯';
      const nextStatus = isHabit ? (currentStatus === 'empty' ? 'super' : 'empty') : STATUS_ORDER[(STATUS_ORDER.indexOf(currentStatus) + 1) % STATUS_ORDER.length];
      targetMonth.checks[rowId][day] = nextStatus;
      return next;
    });
  };

  const clearStatus = (rowId, day, options = {}) => {
    const row = rows.find((candidate) => candidate.id === rowId);
    if (!row || !isTaskCheckableOnDay(row, day)) return;
    if (isBeforeToday(month.key, day) && !options.allowActiveToday) return;
    if (options.manualSaveOnly) manualSavePendingRef.current = true;
    setState((current) => {
      const next = structuredClone(current || {});
      const targetMonth = next.months.find((item) => item.id === month.id);
      targetMonth.checks ||= {};
      targetMonth.checks[rowId] ||= {};
      delete targetMonth.checks[rowId][day];
      if (!Object.keys(targetMonth.checks[rowId]).length) delete targetMonth.checks[rowId];
      return next;
    });
  };

  const editCellNote = (rowId, day) => {
    const row = rows.find((candidate) => candidate.id === rowId);
    if (!row || !isTaskCheckableOnDay(row, day)) return;
    const currentNote = month.notes?.[rowId]?.[day] || '';
    if (row.typeKey === 'reading') {
      setReadingNoteEditor({
        rowId,
        day,
        title: row.book?.name || row.item,
        legacyNote: typeof currentNote === 'string' ? currentNote : '',
        startPage: typeof currentNote === 'object' ? currentNote.startPage || '' : '',
        endPage: typeof currentNote === 'object' ? currentNote.endPage || '' : '',
      });
      return;
    }
    const note = window.prompt('填写这项任务当天的具体内容，例如：完成第3页', currentNote);
    if (note === null) return;
    setState((current) => {
      const next = structuredClone(current || {});
      const targetMonth = next.months.find((item) => item.id === month.id);
      targetMonth.notes ||= {};
      targetMonth.notes[rowId] ||= {};
      const nextNote = note.trim();
      if (nextNote) {
        targetMonth.notes[rowId][day] = nextNote;
      } else {
        delete targetMonth.notes[rowId][day];
        if (!Object.keys(targetMonth.notes[rowId]).length) delete targetMonth.notes[rowId];
      }
      return next;
    });
  };

  const saveReadingNote = () => {
    if (!readingNoteEditor) return;
    const nextStartPage = String(readingNoteEditor.startPage || '').trim();
    const nextEndPage = String(readingNoteEditor.endPage || '').trim();
    setState((current) => {
      const next = structuredClone(current || {});
      const targetMonth = next.months.find((item) => item.id === month.id);
      targetMonth.notes ||= {};
      targetMonth.notes[readingNoteEditor.rowId] ||= {};
      if (nextStartPage || nextEndPage) {
        targetMonth.notes[readingNoteEditor.rowId][readingNoteEditor.day] = { startPage: nextStartPage, endPage: nextEndPage };
      } else {
        delete targetMonth.notes[readingNoteEditor.rowId][readingNoteEditor.day];
        if (!Object.keys(targetMonth.notes[readingNoteEditor.rowId]).length) delete targetMonth.notes[readingNoteEditor.rowId];
      }
      return next;
    });
    setReadingNoteEditor(null);
  };

  const updateCellNote = (rowId, day, value) => {
    setState((current) => {
      const next = structuredClone(current || {});
      const targetMonth = next.months.find((item) => item.id === month.id);
      targetMonth.notes ||= {};
      targetMonth.notes[rowId] ||= {};
      const nextNote = String(value || '').trim();
      if (nextNote) {
        targetMonth.notes[rowId][day] = nextNote;
      } else {
        delete targetMonth.notes[rowId][day];
        if (!Object.keys(targetMonth.notes[rowId]).length) delete targetMonth.notes[rowId];
      }
      return next;
    });
  };

  const updateReadingPageNote = (rowId, day, field, value) => {
    setState((current) => {
      const next = structuredClone(current || {});
      const targetMonth = next.months.find((item) => item.id === month.id);
      targetMonth.notes ||= {};
      targetMonth.notes[rowId] ||= {};
      const currentNote = targetMonth.notes[rowId][day];
      const nextNote = typeof currentNote === 'object' && currentNote ? { ...currentNote } : { startPage: '', endPage: '' };
      nextNote[field] = String(value || '').replace(/[^\d]/g, '');
      if (nextNote.startPage || nextNote.endPage) {
        targetMonth.notes[rowId][day] = nextNote;
      } else {
        delete targetMonth.notes[rowId][day];
        if (!Object.keys(targetMonth.notes[rowId]).length) delete targetMonth.notes[rowId];
      }
      return next;
    });
  };

  const saveReadingPlanRange = () => {
    if (!readingPlanEditor) return;
    const nextStartPage = String(readingPlanEditor.startPage || '').replace(/[^\d]/g, '');
    const nextEndPage = String(readingPlanEditor.endPage || '').replace(/[^\d]/g, '');
    if (!nextStartPage || !nextEndPage) return;
    setState((current) => {
      const next = structuredClone(current || {});
      const targetMonth = next.months.find((item) => item.id === month.id);
      targetMonth.notes ||= {};
      targetMonth.notes[readingPlanEditor.bookId] ||= {};
      targetMonth.notes[readingPlanEditor.bookId][readingPlanEditor.day] = {
        startPage: nextStartPage,
        endPage: nextEndPage,
      };
      return next;
    });
    setReadingPlanEditor(null);
  };

  const setField = (path, value) => {
    setState((current) => {
      const next = structuredClone(current || {});
      let cursor = next;
      path.slice(0, -1).forEach((part) => {
        cursor[part] ||= {};
        cursor = cursor[part];
      });
      cursor[path.at(-1)] = value;
      return next;
    });
  };

  const updateMonth = (patch) => {
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      Object.assign(target, patch);
      return next;
    });
  };

  const addMonth = () => {
    const now = new Date();
    const input = window.prompt('请输入新月份，例如：2026-09', createMonthKey(now.getFullYear(), now.getMonth() + 1));
    if (!input) return;
    const match = input.match(/^(\d{4})-(\d{1,2})$/);
    if (!match) {
      window.alert('月份格式请填写为 YYYY-MM，例如 2026-09');
      return;
    }
    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    if (monthNumber < 1 || monthNumber > 12) return;
    setState((current) => {
      const next = structuredClone(current || {});
      next.months ||= [];
      const created = createMonthShell(year, monthNumber);
      const template = next.templates?.[0];
      if (template) {
        created.categories = structuredClone(template.categories || []).map((category) => ({
          ...category,
          id: createId('cat'),
          tasks: (category.tasks || []).map((task) => ({ ...task, id: createId('task'), checkMode: task.checkMode || 'daily', importance: task.importance || 'normal', endDay: Math.min(created.days, Number(task.endDay || created.days)) })),
        }));
        created.readingBooks = structuredClone(template.readingBooks || []).map((book) => ({
          ...book,
          id: createId('book'),
          endDay: Math.min(created.days, Number(book.endDay || created.days)),
        }));
      }
      next.months.push(created);
      return next;
    });
    setMonthIndex(months.length);
  };

  const addCategory = () => {
    const fixed = FIXED_CATEGORIES.find((item) => item.name === categoryDraft);
    const customName = categoryDraft === 'custom' ? window.prompt('请输入自定义分类名称')?.trim() : '';
    const name = fixed?.name || customName;
    if (!name) return;
    if (month.categories.some((item) => item.name === name)) {
      window.alert(`${name} 分类已经存在`);
      return;
    }
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      target.categories.push({
        id: createId('cat'),
        name,
        color: fixed?.color || 'blue',
        badge: fixed?.badge || name.slice(0, 1),
        tasks: [],
      });
      return next;
    });
  };

  const updateCategory = (categoryId, patch) => {
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      const category = target.categories.find((item) => item.id === categoryId);
      Object.assign(category, patch);
      return next;
    });
  };

  const deleteCategory = (categoryId) => {
    if (!window.confirm('确定删除这个分类和下面所有任务吗？')) return;
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      target.categories = target.categories.filter((item) => item.id !== categoryId);
      return next;
    });
  };

  const addTask = (categoryId) => {
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      const category = target.categories.find((item) => item.id === categoryId);
      category.tasks.push({
        id: createId('task'),
        title: '',
        type: 'daily',
        startDay: 1,
        endDay: target.days,
        checkMode: 'daily',
        importance: 'normal',
        ...(category.name === '好习惯' ? { habitPoints: 2 } : {}),
      });
      return next;
    });
  };

  const updateTask = (categoryId, taskId, patch) => {
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      const category = target.categories.find((item) => item.id === categoryId);
      const task = category.tasks.find((item) => item.id === taskId);
      Object.assign(task, patch);
      if (patch.bookId) {
        target.readingBooks ||= [];
        const sourceBook = (next.libraryBooks || []).find((item) => item.id === patch.bookId);
        let book = target.readingBooks.find((item) => item.id === patch.bookId);
        if (!book && sourceBook) {
          const range = defaultReadingRange(target);
          book = {
            id: sourceBook.id,
            name: sourceBook.name,
            type: sourceBook.type || '其它',
            totalPages: sourceBook.totalPages ?? '',
            rewardPoints: Number(sourceBook.rewardPoints || 10),
            startDay: Number(task.startDay || range.startDay),
            endDay: Number(task.endDay || range.endDay),
            checkMode: task.checkMode || 'daily',
            addedAt: sourceBook.addedAt || new Date().toISOString(),
          };
          target.readingBooks.push(book);
        }
        if (book) {
          task.title = book.name;
          task.type = 'stage';
          task.startDay = Number(book.startDay || task.startDay || 1);
          task.endDay = Number(book.endDay || task.endDay || target.days);
          task.checkMode = book.checkMode || task.checkMode || 'daily';
        }
      }
      if (patch.bookId === '') {
        delete task.bookId;
      }
      task.checkMode = task.type === 'stage' || task.bookId ? task.checkMode || 'daily' : 'daily';
      if (category.name === '好习惯') task.habitPoints = Math.max(0, Number(task.habitPoints || 2));
      task.startDay = Math.max(1, Math.min(target.days, Number(task.startDay || 1)));
      task.endDay = Math.max(task.startDay, Math.min(target.days, Number(task.endDay || target.days)));
      if (task.bookId) {
        const book = target.readingBooks?.find((item) => item.id === task.bookId);
        if (book) {
          book.startDay = task.startDay;
          book.endDay = task.endDay;
          book.checkMode = task.checkMode || 'daily';
        }
      }
      return next;
    });
  };

  const deleteTask = (categoryId, taskId) => {
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      const category = target.categories.find((item) => item.id === categoryId);
      category.tasks = category.tasks.filter((item) => item.id !== taskId);
      return next;
    });
  };

  const updateRewardConfig = (text) => {
    const rewards = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s*分?\s*[：:、,\-\s]\s*(.+)$/);
        return match ? { points: match[1], name: match[2].trim() } : { points: '', name: line };
      });

    setState((current) => ({
      ...(current || {}),
      rewardConfig: rewards.length ? rewards : DEFAULT_REWARDS,
    }));
  };

  const updateRewardItem = (index, field, value) => {
    setState((current) => {
      const next = structuredClone(current || {});
      next.rewardConfig = normalizeRewardConfig(next.rewardConfig || DEFAULT_REWARDS);
      next.rewardConfig[index] = { ...next.rewardConfig[index], [field]: value };
      return next;
    });
  };

  const addRewardItem = () => {
    setState((current) => ({
      ...(current || {}),
      rewardConfig: [...normalizeRewardConfig((current || {}).rewardConfig || DEFAULT_REWARDS), { id: createId('reward'), points: '', name: '' }],
    }));
  };

  const removeRewardItem = (index) => {
    setState((current) => {
      const nextRewards = normalizeRewardConfig((current || {}).rewardConfig || DEFAULT_REWARDS);
      nextRewards.splice(index, 1);
      return {
        ...(current || {}),
        rewardConfig: nextRewards.length ? nextRewards : DEFAULT_REWARDS,
      };
    });
  };

  const confirmNewReward = async () => {
    if (!newRewardDialog) return;
    const name = newRewardDialog.name.trim();
    const points = Number(newRewardDialog.points || 0);
    if (!name || !points || points <= 0) return;

    const next = structuredClone(stateRef.current || state || {});
    const nextReward = {
      id: newRewardDialog.id || createId('reward'),
      name,
      points: String(points),
      description: newRewardDialog.description.trim(),
      icon: newRewardDialog.icon || 'gift',
    };
    const rewards = normalizeRewardConfig(next.rewardConfig || DEFAULT_REWARDS);
    const rewardIndex = rewards.findIndex((item) => item.id === nextReward.id);
    if (rewardIndex >= 0) {
      rewards[rewardIndex] = nextReward;
    } else {
      rewards.push(nextReward);
    }
    next.rewardConfig = sortRewardsByPoints(rewards);
    setState(next);
    setNewRewardDialog(null);
    await persistState(next, newRewardDialog.id ? '奖励修改已保存到 SQLite' : '新增奖励已保存到 SQLite');
  };

  const openEditRewardDialog = (item) => {
    setNewRewardDialog({
      id: item.id,
      name: item.name || '',
      points: String(item.points || ''),
      description: item.description || '',
      icon: item.icon || 'gift',
    });
  };

  const deleteReward = async (item) => {
    if (!window.confirm(`确定删除奖励“${item.name || '未命名奖励'}”吗？已兑换记录会保留。`)) return;
    const next = structuredClone(stateRef.current || state || {});
    next.rewardConfig = normalizeRewardConfig(next.rewardConfig || DEFAULT_REWARDS).filter((reward) => reward.id !== item.id);
    if (!next.rewardConfig.length) next.rewardConfig = DEFAULT_REWARDS;
    setState(next);
    await persistState(next, '奖励已删除并保存到 SQLite');
  };

  const updateBooks = (text) => {
    const nextBooks = text.split('\n').map((line) => line.trim()).filter(Boolean);
    setState((current) => ({
      ...(current || {}),
      books: nextBooks.length ? nextBooks : DEFAULT_BOOKS,
    }));
  };

  const addLibraryBook = (bookPatch = {}) => {
    setState((current) => {
      const next = structuredClone(current || {});
      next.libraryBooks = normalizeLibraryBooks([
        ...(next.libraryBooks || []),
        { id: createId('book'), type: '其它', totalPages: '', rewardPoints: 10, addedAt: new Date().toISOString(), ...bookPatch },
      ]);
      return next;
    });
    setReadingScope('library');
  };

  const openNewBookDialog = () => {
    setNewBookDialog({ name: '', type: '其它', totalPages: '', rewardPoints: '10' });
  };

  const openBookTypesDialog = () => {
    setBookTypesDialog(bookTypes.join('\n'));
  };

  const saveBookTypes = () => {
    const nextTypes = normalizeBookTypes(String(bookTypesDialog || '').split(/\r?\n|[，,]/));
    setState((current) => ({
      ...(current || {}),
      bookTypes: nextTypes,
    }));
    if (libraryTypeFilter !== '所有' && !nextTypes.includes(libraryTypeFilter)) {
      setLibraryTypeFilter('所有');
    }
    setBookTypesDialog(null);
  };

  const openEditLibraryBookDialog = (book) => {
    setNewBookDialog({
      id: book.id,
      name: book.name || '',
      type: book.type || '其它',
      totalPages: book.totalPages === '' || book.totalPages === undefined ? '' : String(book.totalPages),
      rewardPoints: String(book.rewardPoints || 10),
    });
  };

  const deleteLibraryBook = (book) => {
    if (!window.confirm(`确定从“我的图书馆”移出“${book.name || '未命名书目'}”吗？已安排月份和阅读历史会保留。`)) return;
    setState((current) => {
      const next = structuredClone(current || {});
      next.libraryBooks = normalizeLibraryBooks(next.libraryBooks || []).filter((item) => item.id !== book.id);
      return next;
    });
  };

  const openBookPagesDialog = (book) => {
    setBookPagesDialog({
      bookId: book.id,
      name: book.name || '未命名书目',
      totalPages: book.totalPages === '' || book.totalPages === undefined ? '' : String(book.totalPages),
    });
  };

  const confirmBookPages = () => {
    if (!bookPagesDialog?.bookId) return;
    const totalPages = Number(bookPagesDialog.totalPages || 0);
    if (!Number.isFinite(totalPages) || totalPages <= 0) {
      window.alert('请填写大于 0 的总页数');
      return;
    }
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      const book = target?.readingBooks?.find((item) => item.id === bookPagesDialog.bookId);
      if (book) book.totalPages = Math.round(totalPages);
      return next;
    });
    setBookPagesDialog(null);
  };

  const confirmNewBook = () => {
    if (!newBookDialog) return;
    const name = newBookDialog.name.trim();
    if (!name) {
      window.alert('请先填写书名');
      return;
    }
    const bookPatch = {
      name,
      type: newBookDialog.type || '其它',
      totalPages: newBookDialog.totalPages === '' ? '' : Math.max(0, Number(newBookDialog.totalPages || 0)),
      rewardPoints: Math.max(0, Number(newBookDialog.rewardPoints || 10)),
    };
    if (newBookDialog.id) {
      setState((current) => {
        const next = structuredClone(current || {});
        next.libraryBooks = normalizeLibraryBooks(next.libraryBooks || []).map((book) => (
          book.id === newBookDialog.id ? { ...book, ...bookPatch } : book
        ));
        (next.months || []).forEach((targetMonth) => {
          (targetMonth.readingBooks || []).forEach((book) => {
            if (book.id !== newBookDialog.id) return;
            Object.assign(book, bookPatch);
          });
          (targetMonth.categories || []).forEach((category) => {
            (category.tasks || []).forEach((task) => {
              if (task.bookId === newBookDialog.id) task.title = name;
            });
          });
        });
        return next;
      });
    } else {
      addLibraryBook(bookPatch);
    }
    setNewBookDialog(null);
  };

  const updateReadingBook = (bookId, patch) => {
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      const book = target.readingBooks.find((item) => item.id === bookId);
      Object.assign(book, patch);
      book.startDay = Math.max(1, Math.min(target.days, Number(book.startDay || 1)));
      book.endDay = Math.max(book.startDay, Math.min(target.days, Number(book.endDay || target.days)));
      book.totalPages = book.totalPages === '' || book.totalPages === undefined ? '' : Math.max(0, Number(book.totalPages || 0));
      book.rewardPoints = Math.max(0, Number(book.rewardPoints || 10));
      return next;
    });
  };

  const deleteReadingBook = (bookId) => {
    setState((current) => {
      const next = structuredClone(current || {});
      const target = next.months.find((item) => item.id === month.id);
      target.readingBooks = target.readingBooks.filter((item) => item.id !== bookId);
      delete target.claimedReadingRewards?.[bookId];
      return next;
    });
  };

  const claimReadingReward = async (book, stats) => {
    if (!stats.isComplete || stats.isClaimed) return;
    const next = structuredClone(stateRef.current || state || {});
    const target = next.months.find((item) => item.id === month.id);
    target.claimedReadingRewards ||= {};
    if (target.claimedReadingRewards[book.id]) return;
    target.claimedReadingRewards[book.id] = {
      points: stats.rewardPoints,
      claimedAt: new Date().toISOString(),
    };
    setState(next);
    setRewardCelebration({
      bookName: book.name || '这本书',
      points: stats.rewardPoints,
    });
    await persistState(next, '阅读奖励已兑换到 SQLite');
    window.setTimeout(() => setRewardCelebration(null), 2600);
  };

  const redeemReward = async (item, index) => {
    const points = Number(item.points || 0);
    const key = rewardKey(item, index);
    if (!points || availableRewardPoints < points) return;
    const next = structuredClone(stateRef.current || state || {});
    const target = next.months.find((candidate) => candidate.id === month.id);
    if (!target) return;
    target.redeemedRewards ||= [];
    target.redeemedRewards.unshift({
      id: createId('redeem'),
      rewardId: key,
      name: item.name || '未命名奖励',
      points,
      redeemedAt: new Date().toISOString(),
    });
    setState(next);
    setRewardExchangeCelebration({
      name: item.name || '未命名奖励',
      points,
    });
    await persistState(next, '奖励兑换记录已保存到 SQLite');
    window.setTimeout(() => setRewardExchangeCelebration(null), 2800);
  };

  const readHomeworkImage = (file) => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请上传图片格式的作业照片'));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const maxSize = 1500;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(16, Math.round(image.width * scale));
        canvas.height = Math.max(16, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/jpeg', 0.76));
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片读取失败，请换一张清晰的 JPG/PNG 照片'));
    };
    image.src = objectUrl;
  });

  const handleHomeworkImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    homeworkImageRef.current = '';
    setLatestReview(null);
    setShowPreviousReview(false);
    setGradingError('');
    setIsPreparingHomeworkImage(true);
    setGraderDraft((current) => ({ ...current, imageData: '', imageName: file.name }));
    try {
      const imageData = await readHomeworkImage(file);
      homeworkImageRef.current = imageData;
      setGraderDraft((current) => ({ ...current, imageData, imageName: file.name }));
    } catch (error) {
      homeworkImageRef.current = '';
      setGraderDraft((current) => ({ ...current, imageData: '', imageName: '' }));
      setGradingError(error?.message || '图片上传失败，请重新拍照');
    } finally {
      setIsPreparingHomeworkImage(false);
      event.target.value = '';
    }
  };

  const generateHomeworkReview = async () => {
    const currentImageData = homeworkImageRef.current || graderDraft.imageData;
    if (isPreparingHomeworkImage) {
      window.alert('图片还在处理中，请等预览出现后再批改');
      return;
    }
    if (!currentImageData) {
      window.alert('请先拍照或上传一张作业照片');
      return;
    }
    if (isGradingHomework) return;
    const subject = graderDraft.subject || '数学';
    const term = graderDraft.term || '二年级上学期';
    setIsGradingHomework(true);
    setGradingError('');
    try {
      const response = await fetch(API_GRADE_HOMEWORK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term,
          subject,
          title: graderDraft.title.trim(),
          note: graderDraft.note.trim(),
          imageData: currentImageData,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'AI批改失败，请稍后再试');

      const detectedSubject = LEARNING_SUBJECTS.includes(payload.detectedSubject) ? payload.detectedSubject : subject;
      const detectedTitle = String(payload.detectedTitle || '').trim();
      const reviewTitle = detectedTitle || graderDraft.title.trim() || `${term}${detectedSubject}作业批改`;
      const selectedMistakes = normalizeReviewMistakes(payload.mistakes).map((item) => ({
        id: createId('mistake'),
        term,
        subject: detectedSubject,
        isWrong: item.isWrong !== false,
        order: Number(item.order || 0),
        question: item.question || '未命名错题',
        answer: item.answer || '',
        correctAnswer: item.correctAnswer || '',
        explanation: item.explanation || '',
        questionImageUrl: item.questionImageUrl || '',
        sourceTitle: reviewTitle,
        createdAt: new Date().toISOString(),
        mastered: false,
      }));
      const nextReview = {
        id: createId('review'),
        term,
        subject: detectedSubject,
        title: reviewTitle,
        note: graderDraft.note.trim(),
        imageData: '',
        imageName: graderDraft.imageName,
        provider: payload.provider || 'openai',
        detectedSubject,
        detectedTitle,
        score: Number(payload.score ?? Math.max(72, 96 - selectedMistakes.length * 8)),
        summary: payload.summary || `已完成${term}${subject}作业批改，发现 ${selectedMistakes.length} 个需要订正的地方。`,
        suggestions: normalizeReviewSuggestions(payload.suggestions).length ? normalizeReviewSuggestions(payload.suggestions) : ['订正后建议隔天再练一次同类题，确认真正掌握。'],
        imageAnnotations: normalizeReviewAnnotations(payload.imageAnnotations),
        annotatedImageUrl: payload.annotatedImageUrl || '',
        mistakes: selectedMistakes,
        createdAt: new Date().toISOString(),
      };
      const next = structuredClone(stateRef.current || state || {});
      next.learningTools = normalizeLearningTools(next.learningTools);
      next.learningTools.reviews.unshift(nextReview);
      next.learningTools.reviews = next.learningTools.reviews.slice(0, 20);
      setLatestReview(nextReview);
      setShowPreviousReview(true);
      setState(next);
      await persistState(next, payload.provider === 'demo' ? '演示批改结果已保存到 SQLite' : 'AI批改结果已保存到 SQLite');
    } catch (error) {
      setGradingError(error?.message || 'AI批改失败，请稍后再试');
    } finally {
      setIsGradingHomework(false);
    }
  };

  const addReviewMistakesToCollection = async (review = latestReview) => {
    if (!review?.mistakes?.length) return;
    const next = structuredClone(stateRef.current || state || {});
    next.learningTools = normalizeLearningTools(next.learningTools);
    const existingKeys = new Set(next.learningTools.mistakes.map((item) => `${item.reviewId || ''}-${item.question}-${item.correctAnswer}`));
    const nextMistakes = normalizeReviewMistakes(review.mistakes)
      .map((mistake) => normalizeMistake({ ...mistake, term: review.term, reviewId: review.id, sourceTitle: review.title }, review.subject))
      .filter((mistake) => !existingKeys.has(`${mistake.reviewId || ''}-${mistake.question}-${mistake.correctAnswer}`));
    if (!nextMistakes.length) {
      window.alert('这次批改没有可收录的错题');
      return;
    }
    next.learningTools.mistakes = [...nextMistakes, ...next.learningTools.mistakes];
    setState(next);
    setLearningTab('mistakes');
    await persistState(next, '错题已收录到 SQLite');
  };

  const downloadAnnotatedHomeworkImage = async (review = latestReview) => {
    const annotations = normalizeReviewAnnotations(review?.imageAnnotations);
    const fallbackAnnotations = annotations.length ? annotations : buildFallbackAnnotations(review?.mistakes);
    const imageUrl = review?.annotatedImageUrl || (review?.id === latestReview?.id ? homeworkImageRef.current || graderDraft.imageData : '');
    if (!imageUrl || !fallbackAnnotations.length) {
      window.alert('当前批改结果还没有可生成图片的作业原图');
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const imageReady = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    image.src = imageUrl;
    try {
      await imageReady;
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      fallbackAnnotations.forEach((annotation) => {
        const x = annotation.area.left / 100 * canvas.width;
        const y = annotation.area.top / 100 * canvas.height;
        const w = annotation.area.width / 100 * canvas.width;
        const h = annotation.area.height / 100 * canvas.height;
        const wrong = annotation.status === 'wrong';
        const color = wrong ? '#ef4444' : annotation.status === 'correct' ? '#22c55e' : '#f59e0b';
        const radius = Math.max(22, canvas.width * 0.026);
        const markerX = Math.min(canvas.width - radius * 1.25, Math.max(radius * 1.25, x + w - radius * 0.2));
        const markerY = Math.min(canvas.height - radius * 1.25, Math.max(radius * 1.25, y + h * 0.5));
        const numberX = Math.min(canvas.width - radius, Math.max(radius, x + radius * 0.2));
        const numberY = Math.min(canvas.height - radius, Math.max(radius, y + radius * 0.2));
        context.save();
        if (wrong) {
          context.strokeStyle = color;
          context.lineWidth = Math.max(3, canvas.width * 0.0028);
          context.globalAlpha = 0.72;
          context.beginPath();
          context.moveTo(x + radius * 0.7, markerY);
          context.lineTo(markerX - radius * 1.15, markerY);
          context.stroke();
        }
        context.globalAlpha = 0.98;
        context.fillStyle = color;
        context.beginPath();
        context.arc(markerX, markerY, radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#fff';
        context.font = `900 ${Math.round(radius * 1.2)}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(annotation.label || (wrong ? '错' : '✓'), markerX, markerY);
        context.fillStyle = color;
        context.beginPath();
        context.arc(numberX, numberY, radius * 0.68, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#fff';
        context.font = `900 ${Math.round(radius * 0.72)}px Arial`;
        context.fillText(String(annotation.order), numberX, numberY);
        context.restore();
      });
      const link = document.createElement('a');
      link.download = `${review.title || '作业批改'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
    } catch {
      window.alert('批改图片生成失败，请重新上传后再试');
    }
  };

  const toggleMistakeMastered = async (mistakeId) => {
    const next = structuredClone(stateRef.current || state || {});
    next.learningTools = normalizeLearningTools(next.learningTools);
    const mistake = next.learningTools.mistakes.find((item) => item.id === mistakeId);
    if (!mistake) return;
    mistake.mastered = !mistake.mastered;
    setState(next);
    await persistState(next, mistake.mastered ? '错题已标记为掌握' : '错题已恢复练习');
  };

  const deleteMistake = async (mistakeId) => {
    const next = structuredClone(stateRef.current || state || {});
    next.learningTools = normalizeLearningTools(next.learningTools);
    next.learningTools.mistakes = next.learningTools.mistakes.filter((item) => item.id !== mistakeId);
    setState(next);
    await persistState(next, '错题已删除');
  };

  const openAiConfigDialog = () => {
    setSelectedAiProvider(aiConfigDraft.activeProvider === 'baidu' ? 'baidu' : 'aliyun');
    setAiConfigDialogOpen(true);
  };

  const confirmAiConfig = async (enableSelectedProvider = false) => {
    setAiConfigStatus('正在保存 AI 配置...');
    try {
      const nextConfig = enableSelectedProvider ? { ...aiConfigDraft, activeProvider: selectedAiProvider } : aiConfigDraft;
      const payload = await saveAiConfig(nextConfig);
      setAiConfigDraft(aiConfigDraftFromPublic(payload.config || {}));
      setSelectedAiProvider(payload.config?.activeProvider === 'baidu' ? 'baidu' : 'aliyun');
      setAiConfigDialogOpen(false);
      setAiConfigStatus(aiConfigStatusText(payload.config || {}));
    } catch (error) {
      setAiConfigStatus(error?.message || 'AI 配置保存失败');
    }
  };

  const printMistakePaper = (subject = mistakeSubjectFilter, term = mistakeTermFilter) => {
    const selected = mistakeItems.filter((item) => (term === '全部学期' || item.term === term) && (subject === '全部' || item.subject === subject) && !item.mastered);
    if (!selected.length) {
      window.alert('当前筛选下没有可生成试卷的未掌握错题');
      return;
    }
    const paperWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!paperWindow) {
      window.alert('浏览器拦截了打印窗口，请允许弹窗后再试');
      return;
    }
    const rowsHtml = selected.map((item, index) => `
      <section class="question">
        <h3>${index + 1}. ${item.question}</h3>
        <div class="answer-line">作答：__________________________________________________</div>
        <details>
          <summary>参考答案</summary>
          <p><strong>${item.correctAnswer}</strong></p>
          <p>${item.explanation}</p>
        </details>
      </section>
    `).join('');
    paperWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${term === '全部学期' ? '综合学期' : term}${subject === '全部' ? '综合' : subject}错题练习卷</title>
          <style>
            body { margin: 32px; color: #19333a; font-family: "Microsoft YaHei", sans-serif; }
            header { border-bottom: 3px solid #19333a; padding-bottom: 14px; margin-bottom: 20px; }
            h1 { margin: 0 0 10px; font-size: 28px; }
            .meta { display: flex; gap: 28px; font-size: 15px; }
            .question { break-inside: avoid; padding: 18px 0; border-bottom: 1px dashed #b9c6c8; }
            h3 { margin: 0 0 18px; font-size: 18px; }
            .answer-line { margin: 12px 0 18px; color: #53666b; }
            details { color: #6b777a; font-size: 13px; }
            @media print { details { display: none; } body { margin: 18mm; } }
          </style>
        </head>
        <body>
          <header>
            <h1>${term === '全部学期' ? '综合学期' : term} · ${subject === '全部' ? '综合' : subject}错题练习卷</h1>
            <div class="meta"><span>姓名：__________</span><span>日期：__________</span><span>题数：${selected.length}</span></div>
          </header>
          ${rowsHtml}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    paperWindow.document.close();
  };

  const updateReminders = (text) => {
    const nextReminders = text.split('\n').map((line) => line.trim()).filter(Boolean);
    setState((current) => ({
      ...(current || {}),
      reminders: nextReminders.length ? nextReminders : DEFAULT_REMINDERS,
    }));
  };

  const persistState = async (nextState, successMessage = '已保存到 SQLite') => {
    if (databaseSaveTimerRef.current) {
      window.clearTimeout(databaseSaveTimerRef.current);
      databaseSaveTimerRef.current = null;
    }
    setDatabaseStatus('正在保存到 SQLite...');
    try {
      await saveDatabaseState(nextState);
      setHasUnsavedChanges(false);
      setDatabaseStatus(successMessage);
      showSaveToast(successMessage.replace(' SQLite', '数据库'));
      return true;
    } catch {
      setDatabaseStatus('数据库保存失败，修改暂存在本机');
      showSaveToast('数据库保存失败', 'error');
      return false;
    }
  };

  const saveConfiguration = async () => {
    const ok = await persistState(stateRef.current, '配置已保存到 SQLite');
    if (ok) window.alert('月份清单配置已保存');
  };

  const saveCurrentState = async () => {
    const ok = await persistState(stateRef.current, '当前状态已保存到 SQLite');
    if (ok) {
      manualSavePendingRef.current = false;
      setIsBackfillMode(false);
    }
  };

  const enableBackfillMode = () => {
    if (isBackfillMode) return;
    if (!window.confirm('开启补录后，可以修改本月今天以前的打卡记录。补录完成后必须点击保存才会写入数据库，确定开启吗？')) return;
    setIsBackfillMode(true);
  };

  const createSnapshot = async () => {
    const label = snapshotLabel();
    const current = stateRef.current || {};
    const { snapshots: _snapshots, ...rest } = current;
    const nextSnapshot = {
      id: Date.now(),
      label,
      month: month.label,
      data: structuredClone(rest),
    };
    const nextState = {
      ...current,
      snapshots: [nextSnapshot, ...(current.snapshots || [])].slice(0, 20),
    };
    stateRef.current = nextState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(createLocalCacheState(nextState)));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setState(nextState);
    const ok = await persistState(nextState, '当前状态已保存到 SQLite');
    if (ok) window.alert(`已保存当前状态：${label}`);
  };

  const restoreSnapshot = (snapshot) => {
    if (!window.confirm(`确定恢复到保存点「${snapshot.label}」吗？当前未保存的修改会被覆盖。`)) return;
    setState((current) => ({
      ...structuredClone(snapshot.data),
      snapshots: (current || {}).snapshots || [],
    }));
  };

  const deleteSnapshot = (snapshotId) => {
    setState((current) => ({
      ...(current || {}),
      snapshots: ((current || {}).snapshots || []).filter((snapshot) => snapshot.id !== snapshotId),
    }));
  };

  const dayPoints = (day) =>
    rows.reduce((sum, row) => {
      if (!isTaskCheckableOnDay(row, day)) return sum;
      const status = getStatus(row.id, day);
      const base = row.subject === '好习惯' && status !== 'empty' ? Number(row.habitPoints || 2) : STATUS[status].points;
      return sum + base;
    }, 0);

  const dailyPoints = Array.from({ length: month.days }, (_, index) => dayPoints(index + 1));
  const cumulativePoints = dailyPoints.reduce((list, value, index) => {
    list.push(value + (list[index - 1] || 0));
    return list;
  }, []);
  const today = new Date();
  const isCurrentMonth = month.key === createMonthKey(today.getFullYear(), today.getMonth() + 1);
  const todayDay = isCurrentMonth ? today.getDate() : null;
  const todayHidePrefix = todayDay ? `${month.key}-${todayDay}` : '';
  const todayRows = todayDay ? rows.filter((row) => taskCheckDayForToday(row, todayDay) !== null) : [];
  const todayCompletedCount = todayDay ? todayRows.filter((row) => {
    const checkDay = stageCompletedDay(row, month, todayDay) || taskCheckDayForToday(row, todayDay);
    return getStatus(row.id, checkDay) !== 'empty';
  }).length : 0;
  const isRequiredTodayTask = (row) => (
    REQUIRED_TODAY_SUBJECTS.includes(row.subject) &&
    row.typeKey !== 'stage' &&
    row.checkMode !== 'stage'
  );
  const todayRequiredRows = todayDay ? todayRows.filter(isRequiredTodayTask) : [];
  const todayRequiredCompletedCount = todayDay ? todayRequiredRows.filter((row) => {
    const checkDay = taskCheckDayForToday(row, todayDay);
    return checkDay !== null && getStatus(row.id, checkDay) !== 'empty';
  }).length : 0;
  const todayPendingCount = Math.max(0, todayRows.length - todayCompletedCount);
  const todayRequiredPendingRows = todayDay ? todayRows.filter((row) => {
    if (!isRequiredTodayTask(row)) return false;
    const checkDay = taskCheckDayForToday(row, todayDay);
    return checkDay !== null && getStatus(row.id, checkDay) === 'empty';
  }) : [];
  const todayRequiredPendingCount = todayRequiredPendingRows.length;
  const jumpToFirstRequiredPendingTask = () => {
    const target = todayRequiredPendingRows[0];
    if (!target) return;
    setTodayFocusTaskId(target.id);
    window.setTimeout(() => {
      const element = document.querySelector(`[data-today-task-id="${target.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
    window.setTimeout(() => setTodayFocusTaskId((current) => (current === target.id ? '' : current)), 1600);
  };
  const jumpToReadingSettings = () => {
    setActiveView('settings');
    setSettingsFocusCategory('阅读');
    window.setTimeout(() => {
      const addButton = document.querySelector('[data-setting-add-category="阅读"]');
      const categoryCard = document.querySelector('[data-setting-category-name="阅读"]');
      (addButton || categoryCard)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addButton?.focus?.();
    }, 0);
    window.setTimeout(() => setSettingsFocusCategory((current) => (current === '阅读' ? '' : current)), 1800);
  };
  const jumpToReadingTask = (book) => {
    const target = todayRows.find((row) => row.typeKey === 'reading' && row.book?.id === book.id);
    if (!target) {
      jumpToReadingSettings();
      return;
    }
    setActiveView('today');
    setTodayFocusTaskId(target.id);
    setHiddenTodayStageTasks((current) => {
      const next = { ...current };
      delete next[`${todayHidePrefix}-${target.id}`];
      return next;
    });
    window.setTimeout(() => {
      const element = document.querySelector(`[data-today-task-id="${target.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
    window.setTimeout(() => setTodayFocusTaskId((current) => (current === target.id ? '' : current)), 1800);
  };
  const todayPoints = todayDay ? todayRows.reduce((sum, row) => {
    const checkDay = stageCompletedDay(row, month, todayDay) || taskCheckDayForToday(row, todayDay);
    const status = getStatus(row.id, checkDay);
    const base = row.subject === '好习惯' && status !== 'empty' ? Number(row.habitPoints || 2) : STATUS[status].points;
    return sum + base;
  }, 0) : 0;
  const readingRewardPoints = completedReadingRewards(month);
  const monthPoints = (cumulativePoints.at(-1) || 0) + readingRewardPoints;
  const allMonthPoints = months.reduce((sum, candidateMonth) => {
    const candidateRows = buildTaskRows(candidateMonth);
    const taskPoints = Array.from({ length: candidateMonth.days }, (_, index) => index + 1).reduce((daySum, day) => (
      daySum + candidateRows.reduce((rowSum, row) => {
        if (!isTaskCheckableOnDay(row, day)) return rowSum;
        const status = normalizeStatus(candidateMonth.checks?.[row.id]?.[day] || 'empty');
        const base = row.subject === '好习惯' && status !== 'empty' ? Number(row.habitPoints || 2) : STATUS[status].points;
        return rowSum + base;
      }, 0)
    ), 0);
    return sum + taskPoints + completedReadingRewards(candidateMonth);
  }, 0);
  const redeemedRewards = month.redeemedRewards || [];
  const redeemedRewardPoints = redeemedRewards.reduce((sum, item) => sum + Number(item.points || 0), 0);
  const availableRewardPoints = Math.max(0, monthPoints - redeemedRewardPoints);
  const readingBooksWithStats = (month.readingBooks || []).map((book) => ({ book, stats: readingBookStats(month, book) }));
  const plannedLibraryBookIds = new Set(months.flatMap((item) => item.readingBooks || []).map((book) => book.id));
  const finishedLibraryBookIds = new Set(months.flatMap((item) => (
    (item.readingBooks || [])
      .filter((book) => readingBookStats(item, book).isComplete)
      .map((book) => book.id)
  )));
  const libraryTypeStats = Array.from(new Set(libraryBooks.map((book) => book.type || '其它').filter(Boolean)));
  const libraryCategoryTabs = [
    { type: '所有', count: libraryBooks.length },
    ...bookTypes.map((type) => ({ type, count: libraryBooks.filter((book) => (book.type || '其它') === type).length })),
  ];
  const currentLibraryCategory = libraryCategoryTabs.find((item) => item.type === libraryTypeFilter) || libraryCategoryTabs[0];
  const currentLibraryFilter = libraryStatusFilter === 'finished'
    ? { type: '已读书单', count: finishedLibraryBookIds.size }
    : currentLibraryCategory;
  const filteredLibraryBooks = libraryBooks.filter((book) => {
    if (libraryStatusFilter === 'finished') return finishedLibraryBookIds.has(book.id);
    return libraryTypeFilter === '所有' || (book.type || '其它') === libraryTypeFilter;
  });
  const libraryHistoryMap = months.reduce((map, targetMonth) => {
    (targetMonth.readingBooks || []).forEach((book) => {
      const startDay = Math.max(1, Math.min(targetMonth.days, Number(book.startDay || 1)));
      const endDay = Math.max(startDay, Math.min(targetMonth.days, Number(book.endDay || targetMonth.days)));
      for (let day = startDay; day <= endDay; day += 1) {
        const status = normalizeStatus(targetMonth.checks?.[book.id]?.[day] || 'empty');
        if (status === 'empty') continue;
        const record = {
          key: `${targetMonth.key}-${day}`,
          monthLabel: targetMonth.label,
          day,
          note: formatCellNote(targetMonth.notes?.[book.id]?.[day]),
          scoreLabel: STATUS[status]?.label || '已读',
        };
        map[book.id] ||= [];
        map[book.id].push(record);
      }
    });
    return map;
  }, {});
  Object.values(libraryHistoryMap).forEach((records) => records.sort((a, b) => b.key.localeCompare(a.key)));
  const libraryPlanMap = months.reduce((map, targetMonth) => {
    (targetMonth.readingBooks || []).forEach((book) => {
      const startDay = Math.max(1, Math.min(targetMonth.days, Number(book.startDay || 1)));
      const endDay = Math.max(startDay, Math.min(targetMonth.days, Number(book.endDay || targetMonth.days)));
      const startDate = new Date(Number(targetMonth.year), Number(targetMonth.month) - 1, startDay);
      const endDate = new Date(Number(targetMonth.year), Number(targetMonth.month) - 1, endDay);
      const existing = map[book.id];
      if (!existing || startDate < existing.startDate) {
        map[book.id] = {
          startDate,
          endDate: existing && existing.endDate > endDate ? existing.endDate : endDate,
        };
      } else if (endDate > existing.endDate) {
        existing.endDate = endDate;
      }
    });
    return map;
  }, {});
  const readingGroups = {
    reading: readingBooksWithStats.filter((item) => item.stats.statusGroup === 'reading'),
    finished: readingBooksWithStats.filter((item) => item.stats.statusGroup === 'finished'),
    other: readingBooksWithStats.filter((item) => item.stats.statusGroup === 'upcoming' || item.stats.statusGroup === 'unfinished'),
  };
  const unreadBookOptions = readingGroups.other.map(({ book }) => book);
  const claimableReadingCount = readingGroups.finished.filter((item) => !item.stats.isClaimed).length;
  const claimableReadingPoints = readingGroups.finished
    .filter((item) => !item.stats.isClaimed)
    .reduce((sum, item) => sum + item.stats.rewardPoints, 0);
  const readingTabMeta = {
    reading: { label: '正在读', count: readingGroups.reading.length, empty: '当前没有正在阅读的书。' },
    finished: { label: '已读完', count: readingGroups.finished.length, badge: claimableReadingCount ? `${claimableReadingCount} 个待兑换` : '', empty: '读完整本书后，会出现在这里并显示已获得积分。' },
    other: { label: '未开始', count: readingGroups.other.length, empty: '没有未开始或逾期未完成的书。' },
  };
  const currentReadingBooks = readingGroups[readingTab] || readingGroups.reading;
  const filteredMistakes = mistakeItems.filter((item) => (
    (mistakeTermFilter === '全部学期' || item.term === mistakeTermFilter) &&
    (mistakeSubjectFilter === '全部' || item.subject === mistakeSubjectFilter)
  ));
  const printableMistakes = filteredMistakes.filter((item) => !item.mastered);
  const mistakeStats = LEARNING_SUBJECTS.map((subject) => ({
    subject,
    count: mistakeItems.filter((item) => item.subject === subject && (mistakeTermFilter === '全部学期' || item.term === mistakeTermFilter)).length,
  }));
  const readingStatusLabel = (stats) => {
    if (stats.isComplete && stats.isClaimed) return '已读完';
    if (stats.isComplete) return '已读完';
    if (stats.statusGroup === 'reading') return '正在读';
    if (stats.statusGroup === 'upcoming') return '未开始';
    return '未完成';
  };
  const readingRedeemLabel = (stats) => {
    if (stats.isClaimed) return `已兑换 +${stats.rewardPoints} 分`;
    if (stats.isComplete) return '可兑换';
    return '未读完';
  };
  const readingProgressLabel = (stats) => {
    if (stats.isComplete) return '100%';
    if (stats.progress !== null) return `${stats.progress}%`;
    return '未记录';
  };
  const libraryBookStatus = (book) => {
    if (finishedLibraryBookIds.has(book.id)) return '已读完';
    const currentMonthBook = (month.readingBooks || []).find((item) => item.id === book.id);
    if (currentMonthBook) {
      const stats = readingBookStats(month, currentMonthBook);
      if (stats.statusGroup === 'reading' || stats.statusGroup === 'unfinished') return '正在读';
      return '计划中';
    }
    if (plannedLibraryBookIds.has(book.id)) return '计划中';
    return '未安排';
  };
  const libraryBookStatusClass = (status) => ({
    已读完: 'status-finished',
    正在读: 'status-reading',
    计划中: 'status-planned',
  }[status] || '');
  const libraryBookPlanLabel = (book) => {
    const plan = libraryPlanMap[book.id];
    if (!plan) return '';
    const format = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月 ${date.getDate()}日`;
    return `${format(plan.startDate)} - ${format(plan.endDate)}`;
  };
  const changeMonth = (direction) => {
    setMonthIndex((current) => Math.max(0, Math.min(months.length - 1, current + direction)));
  };
  const renderLibraryBookCard = (book) => {
    const status = libraryBookStatus(book);
    const statusClass = libraryBookStatusClass(status);
    const planLabel = libraryBookPlanLabel(book);
    const history = libraryHistoryMap[book.id] || [];
    return (
      <article className={`library-book-card ${statusClass}`} key={book.id}>
        <div className="library-card-actions">
          <button type="button" title="编辑书籍" aria-label="编辑书籍" onClick={() => openEditLibraryBookDialog(book)}><Pencil size={15} /></button>
          <button type="button" title="删除书籍" aria-label="删除书籍" onClick={() => deleteLibraryBook(book)}><Trash2 size={15} /></button>
        </div>
        <div>
          <span>{book.type || '其它'}</span>
          <strong>{book.name || '未命名书目'}</strong>
          <p>{book.totalPages ? `共 ${book.totalPages} 页` : '总页数未设置'} · 读完奖励 +{book.rewardPoints || 10}</p>
        </div>
        <em>{status}</em>
        {planLabel && <p className="library-plan-range">计划时间：{planLabel}</p>}
        {history.length > 0 && (
          <div className="library-book-history">
            <b>阅读历史</b>
            {history.slice(0, 3).map((record) => (
              <span key={record.key}>{record.monthLabel} {record.day}日{record.note ? ` · ${record.note}` : ''}</span>
            ))}
          </div>
        )}
        {status === '未安排' && <button type="button" onClick={jumpToReadingSettings}>去安排阅读任务</button>}
      </article>
    );
  };
  const renderLibraryBookRow = (book) => {
    const status = libraryBookStatus(book);
    const statusClass = libraryBookStatusClass(status);
    const planLabel = libraryBookPlanLabel(book);
    return (
      <article className={`library-book-row ${statusClass}`} key={book.id}>
        <div>
          <span>类别</span>
          <strong>{book.type || '其它'}</strong>
        </div>
        <div className="library-row-title">
          <span>书名</span>
          <strong>{book.name || '未命名书目'}</strong>
        </div>
        <div>
          <span>页数</span>
          <strong>{book.totalPages ? `${book.totalPages} 页` : '未设置'}</strong>
        </div>
        <div>
          <span>积分</span>
          <strong>+{book.rewardPoints || 10}</strong>
        </div>
        <div>
          <span>计划时间</span>
          <strong>{planLabel || '未安排'}</strong>
        </div>
        <div>
          <span>状态</span>
          <strong>{status}</strong>
        </div>
        <div className="library-row-actions">
          <button type="button" title="编辑书籍" aria-label="编辑书籍" onClick={() => openEditLibraryBookDialog(book)}><Pencil size={15} /></button>
          <button type="button" title="删除书籍" aria-label="删除书籍" onClick={() => deleteLibraryBook(book)}><Trash2 size={15} /></button>
        </div>
      </article>
    );
  };
  const renderReadingBookCard = ({ book, stats }) => {
    const readingPlanRows = stats.rangeDays.map((day, index) => {
      const status = normalizeStatus(month.checks?.[book.id]?.[day] || 'empty');
      const note = month.notes?.[book.id]?.[day];
      const pageNote = typeof note === 'object' && note ? note : {};
      const isCompleted = status !== 'empty';
      const isToday = Boolean(todayDay && day === todayDay && isCurrentMonth);
      const isMissed = !isCompleted && isBeforeToday(month.key, day);
      return {
        day,
        dayIndex: index + 1,
        isCompleted,
        isToday,
        isMissed,
        startPage: pageNote.startPage || '',
        endPage: pageNote.endPage || '',
      };
    });
    const showReadingPlan = book.checkMode !== 'stage' && readingPlanRows.length > 0;
    const isReadingPlanOpen = Boolean(expandedReadingPlans[book.id]);
    const showReadingCheckinAction = !stats.isComplete && stats.statusGroup !== 'upcoming';
    const showReadingSettingsAction = !stats.isComplete && stats.statusGroup === 'upcoming';
    const formatReadingDate = (day) => `${month.year}年${month.month}月${day}日`;
    const readingDateRange = `${formatReadingDate(stats.startDay)} - ${formatReadingDate(stats.endDay)}`;

    return (
    <article className={`reading-book-card reading-status-${stats.statusGroup} ${stats.isComplete ? 'finished' : ''}`} key={book.id}>
      <div className="reading-book-head">
        <div>
          <span>{readingDateRange}</span>
          <h3>{book.name || '未命名书目'}</h3>
        </div>
        <strong>+{stats.rewardPoints}分</strong>
      </div>

      <div className="reading-progress-wrap">
        <div className="reading-progress-copy">
          <span>{stats.isComplete ? '已完成阅读计划' : stats.currentPage ? `读到第 ${stats.currentPage} 页` : '还没有页码记录'}</span>
          {stats.progress === null && !stats.isComplete ? (
            <button className="set-pages-inline" type="button" onClick={() => openBookPagesDialog(book)}>总页数未设置</button>
          ) : (
            <b>{stats.isComplete ? '已读完' : `${stats.progress}%`}</b>
          )}
        </div>
        <div className="reading-progress-track">
          <i style={{ width: `${stats.displayProgress}%` }} />
        </div>
        <p>{stats.isComplete ? `阶段内 ${stats.totalDays} 天已全部完成打卡，可兑换读完奖励。` : stats.totalPages ? `共 ${stats.totalPages} 页` : '点击“总页数未设置”即可补充页数。'}</p>
      </div>

      <div className="reading-book-meta">
        <span><Check size={15} />{stats.checkedDays}/{stats.totalDays} 天打卡</span>
        <span><Gift size={15} />{stats.isClaimed ? '已领取奖励' : stats.isComplete ? '可领取奖励' : '读完后获得'}</span>
      </div>

      {showReadingPlan && (
        <div className="reading-plan">
          <button className="reading-plan-toggle" type="button" aria-expanded={isReadingPlanOpen} onClick={() => setExpandedReadingPlans((current) => ({ ...current, [book.id]: !current[book.id] }))}>
            <span>
              <strong>阅读计划</strong>
              <em>{stats.startDay}日 - {stats.endDay}日 · {stats.totalDays} 天</em>
            </span>
            <b>{isReadingPlanOpen ? '收起' : '展开编辑'}</b>
          </button>
          {isReadingPlanOpen && (
            <>
              <div className="reading-plan-head">
                <span>日期</span>
                <span>阅读范围</span>
                <span>状态</span>
              </div>
              <div className="reading-plan-list">
                {readingPlanRows.map((record) => (
                  <div className={`reading-plan-row ${record.isToday ? 'today' : ''} ${record.isMissed ? 'missed' : ''}`} key={`${book.id}-plan-${record.day}`}>
                    <span>第{record.dayIndex}天</span>
                    {record.startPage && record.endPage ? (
                      <strong className="reading-plan-range">{record.startPage} 至 {record.endPage} 页</strong>
                    ) : (
                      <button className="reading-plan-unset" type="button" onClick={() => setReadingPlanEditor({ bookId: book.id, bookName: book.name || '未命名书目', day: record.day, startPage: record.startPage, endPage: record.endPage })}>未设置</button>
                    )}
                    <i className={record.isCompleted ? 'record-done' : record.isMissed ? 'record-missed' : 'record-plan'}>{record.isCompleted ? '已读' : record.isMissed ? '未完成' : '未开始'}</i>
                    {record.isMissed && <em className="reading-plan-alert">未按计划完成</em>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="reading-reward-stage">
        {stats.isComplete && !stats.isClaimed ? (
          <button className="claim-reward" onClick={() => claimReadingReward(book, stats)}>
            <Gift size={24} />
            <span>兑换积分</span>
            <strong>+{stats.rewardPoints}</strong>
          </button>
        ) : stats.isClaimed ? (
          <div className="claimed-reward">
            <Gift size={18} />
            已兑换 +{stats.rewardPoints} 分
          </div>
        ) : (
          <div className="reward-locked">
            <Gift size={18} />
            完成全部 {stats.totalDays} 天后可兑换 +{stats.rewardPoints} 分
          </div>
        )}
      </div>

      {(showReadingCheckinAction || showReadingSettingsAction) && (
        <div className="reading-book-actions">
          {showReadingCheckinAction && <button onClick={() => jumpToReadingTask(book)}>去打卡</button>}
          {showReadingSettingsAction && <button className="ghost" onClick={jumpToReadingSettings}>去设置</button>}
        </div>
      )}
    </article>
    );
  };
  const renderReadingBookRow = ({ book, stats }) => (
    <article className={`reading-list-row ${stats.isComplete ? 'finished' : ''}`} key={book.id}>
      <div className="reading-list-book">
        <strong>{book.name || '未命名书目'}</strong>
        <span>{stats.startDay}日 - {stats.endDay}日</span>
      </div>
      <div>
        <span>已读多久</span>
        <strong>{stats.checkedDays}/{stats.totalDays} 天</strong>
      </div>
      <div>
        <span>当前状态</span>
        <strong>{readingStatusLabel(stats)}</strong>
      </div>
      <div>
        <span>当前进度</span>
        {stats.progress === null && !stats.isComplete ? (
          <button className="set-pages-inline compact" type="button" onClick={() => openBookPagesDialog(book)}>总页数未设置</button>
        ) : (
          <strong>{readingProgressLabel(stats)}</strong>
        )}
      </div>
      <div>
        <span>积分</span>
        <strong>+{stats.rewardPoints} 分</strong>
      </div>
      <div>
        <span>兑换状态</span>
        <strong className={stats.isClaimed ? 'claimed' : stats.isComplete ? 'claimable' : ''}>{readingRedeemLabel(stats)}</strong>
      </div>
      <div className="reading-list-actions">
        {stats.isComplete && !stats.isClaimed ? (
          <button className="mini-claim" onClick={() => claimReadingReward(book, stats)}>兑换积分</button>
        ) : stats.isComplete ? null : stats.statusGroup === 'upcoming' ? (
          <button className="ghost" onClick={jumpToReadingSettings}>去设置</button>
        ) : (
          <button onClick={() => jumpToReadingTask(book)}>去打卡</button>
        )}
      </div>
    </article>
  );
  const renderTodayTaskCard = (row) => {
    const day = taskCheckDayForToday(row, todayDay);
    const isStageRangeTask = row.typeKey === 'stage' || row.typeKey === 'reading';
    const isStageCheckMode = row.checkMode === 'stage';
    const completedStageDay = stageCompletedDay(row, month, todayDay);
    const effectiveDay = completedStageDay || day;
    const noteDay = (row.typeKey === 'stage' || row.typeKey === 'reading') && row.checkMode === 'stage' ? Number(row.startDay || effectiveDay) : effectiveDay;
    const value = getStatus(row.id, effectiveDay);
    const visualStatus = completedStageDay ? 'done' : value;
    const note = month.notes?.[row.id]?.[noteDay];
    const isReading = row.typeKey === 'reading';
    const readingNote = typeof note === 'object' && note ? note : {};
    const noteText = formatCellNote(note);
    const isHabit = row.subject === '好习惯';
    const statusLabel = isHabit && visualStatus !== 'empty' ? '完成' : completedStageDay ? '已完成' : value === 'empty' ? '未打卡' : STATUS[value].label;
    const taskTypeLabel = isStageRangeTask ? '阶段' : '每日';
    const checkModeLabel = isStageCheckMode ? '阶段打卡' : '每日打卡';
    const isCollapsed = isStageCheckMode && !completedStageDay && hiddenTodayStageTasks[`${todayHidePrefix}-${row.id}`];
    const statusChips = isHabit
      ? [{ key: 'habit', label: `完成 +${Number(row.habitPoints || 2)} 分`, active: visualStatus !== 'empty' }]
      : [
        { key: 'done', label: '已完成 0 分', active: visualStatus === 'done' },
        { key: 'excellent', label: '优秀 +1 分', active: visualStatus === 'excellent' },
        { key: 'super', label: '玫瑰 +2 分', active: visualStatus === 'super' },
      ];

    if (isCollapsed) {
      return (
        <article className={`today-collapsed-task row-${row.color}`} key={row.id}>
          <div>
            <i>{row.badge}</i>
            <span>阶段打卡已暂不打卡</span>
            <strong>{row.item}</strong>
          </div>
          <button onClick={() => setHiddenTodayStageTasks((current) => {
            const next = { ...current };
            delete next[`${todayHidePrefix}-${row.id}`];
            return next;
          })} type="button">
            展开
          </button>
        </article>
      );
    }

    return (
      <article className={`today-task-card row-${row.color} task-${row.typeKey} ${isStageRangeTask ? 'today-stage-task' : 'today-daily-task'} ${todayFocusTaskId === row.id ? 'today-task-focus' : ''}`} data-today-task-id={row.id} key={row.id}>
        <div className="today-task-main">
          <div className="today-task-badge">
            <i>{row.badge}</i>
            <span>{row.subject}</span>
          </div>
          <div className="today-task-copy">
            <p>
              {row.importance === 'important' && <Flag className="important-mark" size={16} fill="currentColor" title="重要任务" />}
              {row.item}
            </p>
            <div>
              <span>{taskTypeLabel}</span>
              <span className={isStageCheckMode ? 'stage-pill' : ''}>{checkModeLabel}</span>
              {isStageRangeTask && <span>{row.startDay}日 - {row.endDay}日</span>}
              <span className="score-chip-group">
                {statusChips.map((chip) => (
                  <b key={chip.key} className={`score-chip ${chip.active ? 'active' : ''}`}>{chip.label}</b>
                ))}
              </span>
            </div>
          </div>
        </div>

        <div className="today-check-panel">
          <button className={`today-status-button status-${visualStatus}`} onClick={() => cycleStatus(row.id, day, { allowActiveToday: true })} type="button" disabled={Boolean(completedStageDay)}>
            {!isHabit && (value === 'done' || completedStageDay) && <Check size={26} strokeWidth={3.2} />}
            {!isHabit && value === 'excellent' && <Star size={28} fill="currentColor" strokeWidth={2.8} />}
            {((isHabit && visualStatus !== 'empty') || value === 'super') && <span className="rose-icon" aria-hidden="true">🌹</span>}
            {value === 'empty' && <span className="empty-ring" />}
            <strong>{statusLabel}</strong>
          </button>
          {isStageCheckMode && !completedStageDay && (
            <button className="today-skip-button" onClick={() => setHiddenTodayStageTasks((current) => ({ ...current, [`${todayHidePrefix}-${row.id}`]: true }))} type="button">
              未完成，暂不打卡
            </button>
          )}
        </div>

        <div className="today-note-panel">
          <div className="today-note-title">
            <strong>{noteText ? '已备注' : '今日备注'}</strong>
            {noteText && <span>{noteText}</span>}
          </div>
          {isReading ? (
            <div className="today-reading-note">
              <label>
                <span>从第</span>
                <input inputMode="numeric" value={readingNote.startPage || ''} placeholder="页码" onChange={(event) => updateReadingPageNote(row.id, noteDay, 'startPage', event.target.value)} />
                <em>页</em>
              </label>
              <label>
                <span>读到</span>
                <input inputMode="numeric" value={readingNote.endPage || ''} placeholder="页码" onChange={(event) => updateReadingPageNote(row.id, noteDay, 'endPage', event.target.value)} />
                <em>页</em>
              </label>
            </div>
          ) : (
            <input className="today-note-input" value={typeof note === 'string' ? note : ''} placeholder="写下今天完成了什么、哪里需要改进..." onChange={(event) => updateCellNote(row.id, noteDay, event.target.value)} />
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="premium-app">
      <aside className="side-rail">
        <div className="rail-card">
          <nav>
            {NAV_ITEMS.map(({ label, icon: Icon }, index) => (
              <button
                key={label}
                className={(label === '今日打卡' && (activeView === 'today' || activeView === 'home')) || (label === '积分奖励' && activeView === 'rewards') || (label === '历史记录' && activeView === 'history') || (label === '设置中心' && activeView === 'settings') || (label === '阅读书单' && activeView === 'books') || (label === '学习工具' && activeView === 'tools') ? 'active' : ''}
                onClick={() => {
                  if (label === '今日打卡') setActiveView('today');
                  if (label === '历史记录') setActiveView('history');
                  if (label === '设置中心') setActiveView('settings');
                  if (label === '积分奖励') setActiveView('rewards');
                  if (label === '阅读书单') setActiveView('books');
                  if (label === '学习工具') setActiveView('tools');
                }}
              >
                <Icon size={25} strokeWidth={((label === '今日打卡' && (activeView === 'today' || activeView === 'home')) || (label === '积分奖励' && activeView === 'rewards') || (label === '历史记录' && activeView === 'history') || (label === '设置中心' && activeView === 'settings') || (label === '阅读书单' && activeView === 'books') || (label === '学习工具' && activeView === 'tools')) ? 2.6 : 2.2} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-main">
            <div className="brand-block">
              <div className="mascot-card">
                <img src={mascotImage} alt="严艺欣小朋友" />
              </div>
              <div className="brand-copy">
                <h1>{month.title || '学习好习惯·快乐成长每一天'}<Star className="title-star" size={25} fill="#ffc84a" /></h1>
                <p>每天进步一点点，成长收获满满！</p>
              </div>
            </div>

            <div className="points-strip" aria-label="积分概览">
              <div className="score-card today-score">
                <span><Star size={15} fill="currentColor" />今日积分</span>
                <strong>{todayPoints}</strong>
                <em>分</em>
              </div>
              <div className="score-card month-score">
                <span><Medal size={15} />本月积分</span>
                <strong>{monthPoints}</strong>
                <em>分</em>
              </div>
              <div className="score-card total-score">
                <span><Trophy size={15} />累计积分</span>
                <strong>{allMonthPoints}</strong>
                <em>分</em>
              </div>
              <div className="score-card available-score">
                <span><Gift size={15} />可用积分</span>
                <strong>{availableRewardPoints}</strong>
                <em>分</em>
              </div>
            </div>
          </div>
        </header>

        <nav className="mobile-tabs" aria-label="移动端导航">
          <button className={(activeView === 'today' || activeView === 'home') ? 'active' : ''} onClick={() => setActiveView('today')}>
            <Home size={20} />
            今日
          </button>
          <button className={activeView === 'books' ? 'active' : ''} onClick={() => setActiveView('books')}>
            <BookOpen size={20} />
            阅读
          </button>
          <button className={activeView === 'tools' ? 'active' : ''} onClick={() => setActiveView('tools')}>
            <Pencil size={20} />
            工具
          </button>
          <button className={activeView === 'rewards' ? 'active' : ''} onClick={() => setActiveView('rewards')}>
            <Trophy size={20} />
            奖励
          </button>
          <button className={activeView === 'settings' ? 'active' : ''} onClick={() => setActiveView('settings')}>
            <Settings size={20} />
            设置
          </button>
        </nav>

        {activeView === 'today' ? (
          <section className="today-page">
            <div className="content-tabbar">
              <div className="month-switch tab-month-switch today-month-switch">
                <button onClick={() => changeMonth(-1)} aria-label="上个月">
                  <ChevronLeft size={21} />
                </button>
                <div>
                  <CalendarDays size={20} />
                  <strong>{month.label}</strong>
                </div>
                <button onClick={() => changeMonth(1)} aria-label="下个月">
                  <ChevronRight size={21} />
                </button>
              </div>
              <div className="content-goal-box">
                <div className="goal-box">
                  <Target size={24} />
                  <span>本月目标：</span>
                  <strong>{month.goal || '未设置'}</strong>
                </div>
              </div>
              <div className="check-view-tabs" aria-label="打卡视图切换">
                <button className="active" onClick={() => setActiveView('today')} type="button">今日打卡</button>
                <button onClick={() => setActiveView('home')} type="button">全月表</button>
              </div>
            </div>

            <div className="today-hero">
              <div>
                <p>今日打卡</p>
                <h2>{todayDay ? `${month.label} ${todayDay}日 · ${weekday(month.key, todayDay)}` : '当前月份不是今天所在月份'}</h2>
                <span>把今天要做的事情一项项完成，备注也可以在这里直接写清楚。</span>
              </div>
              <div className="today-hero-actions">
                <button onClick={saveCurrentState}><Save size={18} />保存状态</button>
              </div>
            </div>

            <div className="today-summary">
              <article className="points">
                <span>今日积分</span>
                <strong>{todayPoints}</strong>
              </article>
              <article className="tasks">
                <span>今日任务</span>
                <strong>{todayRows.length}</strong>
                <small>含 <b>{todayRequiredRows.length}</b> 个必打卡</small>
              </article>
              <article className="done">
                <span>已打卡</span>
                <strong>{todayCompletedCount}</strong>
                <small>已完成 <b>{todayRequiredCompletedCount}</b> 个必打卡</small>
              </article>
              <article className={`pending ${todayRequiredPendingCount > 0 ? 'clickable' : ''}`} role={todayRequiredPendingCount > 0 ? 'button' : undefined} tabIndex={todayRequiredPendingCount > 0 ? 0 : undefined} onClick={todayRequiredPendingCount > 0 ? jumpToFirstRequiredPendingTask : undefined} onKeyDown={todayRequiredPendingCount > 0 ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  jumpToFirstRequiredPendingTask();
                }
              } : undefined}>
                <span>未打卡</span>
                <strong>{todayPendingCount}</strong>
                <small>含 <b>{todayRequiredPendingCount}</b> 个必打卡</small>
              </article>
            </div>

            {todayRows.length ? (
              <div className="today-task-list">
                {todayRows.map(renderTodayTaskCard)}
              </div>
            ) : (
              <div className="today-empty">
                <CalendarDays size={46} />
                <strong>今天没有可打卡任务</strong>
                <p>如果需要查看或调整任务安排，可以进入全月表或设置中心。</p>
                <div>
                  <button className="ghost" onClick={() => setActiveView('settings')}>去设置</button>
                </div>
              </div>
            )}
          </section>
        ) : activeView === 'home' ? (
        <>
        <section className="matrix-card">
          <div className="content-tabbar">
            <div className="month-switch tab-month-switch today-month-switch">
              <button onClick={() => changeMonth(-1)} aria-label="上个月">
                <ChevronLeft size={21} />
              </button>
              <div>
                <CalendarDays size={20} />
                <strong>{month.label}</strong>
              </div>
              <button onClick={() => changeMonth(1)} aria-label="下个月">
                <ChevronRight size={21} />
              </button>
            </div>
            <div className="content-goal-box">
              <div className="goal-box">
                <Target size={24} />
                <span>本月目标：</span>
                <strong>{month.goal || '未设置'}</strong>
              </div>
            </div>
            <div className="check-view-tabs" aria-label="打卡视图切换">
              <button onClick={() => setActiveView('today')} type="button">今日打卡</button>
              <button className="active" onClick={() => setActiveView('home')} type="button">全月表</button>
            </div>
          </div>

          <div className="legend-bar">
            <div className="legend-items">
              <span><i className="legend-dot status-done"><Check size={12} /></i>已完成</span>
              <span><i className="legend-dot status-excellent"><Star size={12} fill="currentColor" /></i>优秀 +1分</span>
              <span><i className="legend-dot status-super"><span className="rose-icon">🌹</span></i>非常优秀 +2分</span>
            </div>
            <p>小贴士：点击圆点打卡，点格子右上角“+”记录当天具体内容。</p>
            <div className="legend-controls">
              <div className={`database-pill ${databaseReady ? 'ready' : 'offline'} ${hasUnsavedChanges ? 'dirty' : ''}`}>
                {databaseStatus}
              </div>
              <button className={`legend-backfill ${isBackfillMode ? 'active' : ''}`} onClick={enableBackfillMode} type="button" title="补录历史打卡" aria-label="补录历史打卡">
                补录
              </button>
              <button className="legend-save" onClick={saveCurrentState} title="保存当前状态" aria-label="保存当前状态">
                <Save size={15} />
              </button>
              <button className="legend-settings" onClick={() => setActiveView('settings')} title="设置当前月份" aria-label="设置当前月份">
                <Settings size={15} />
              </button>
              <label className="toggle">
                显示周末
                <input type="checkbox" checked readOnly />
                <span />
              </label>
            </div>
          </div>

          <div className="matrix-frame">
            <table className="check-table">
              <thead>
                <tr>
                  <th className="cat-col">记录分类</th>
                  <th className="type-col">类型</th>
                  <th className="plan-col">计划安排</th>
                  {Array.from({ length: month.days }, (_, index) => {
                    const day = index + 1;
                    const dayName = weekday(month.key, day);
                    return (
                      <th key={day} className={dayName === '周六' || dayName === '周日' ? 'weekend' : ''}>
                        <b>{day}</b>
                        <small>{dayName}</small>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={`row-${row.color} task-${row.typeKey} ${row.firstSubjectRow ? 'subject-start-row' : ''}`}>
                    {row.firstSubjectRow && (
                      <th className="subject-cell" rowSpan={row.subjectRowSpan}>
                        <i>{row.badge}</i>
                        <span>{row.subject}</span>
                      </th>
                    )}
                    {row.firstTypeRow && (
                      <td className="type-cell" rowSpan={row.typeRowSpan}><span>{row.type}</span></td>
                    )}
                    <td className="plan-cell">
                      <p>
                        {row.importance === 'important' && <Flag className="important-mark" size={15} fill="currentColor" title="重要任务" />}
                        {row.item}
                      </p>
                    </td>
                    {(row.typeKey === 'stage' || row.typeKey === 'reading') && row.checkMode === 'stage' ? (() => {
                      const startDay = Math.max(1, Math.min(month.days, Number(row.startDay || 1)));
                      const endDay = Math.max(startDay, Math.min(month.days, Number(row.endDay || startDay)));
                      const value = getStatus(row.id, startDay);
                      const isPast = isBeforeToday(month.key, startDay);
                      const canBackfill = Boolean(isBackfillMode && isCurrentMonth && todayDay && startDay < todayDay);
                      const canEdit = !isPast || canBackfill;
                      const note = month.notes?.[row.id]?.[startDay];
                      const noteText = formatCellNote(note);
                      return (
                        <>
                          {Array.from({ length: startDay - 1 }, (_, index) => (
                            <td key={`before-${index}`} className="mark-cell inactive-cell" />
                          ))}
                          <td
                            colSpan={endDay - startDay + 1}
                            className={`mark-cell stage-span-cell ${isPast && !canBackfill ? 'past-cell' : ''} ${canBackfill ? 'backfill-cell' : ''} ${note ? 'has-note' : ''}`}
                            title={noteText || undefined}
                            onClick={() => {
                              if (canEdit) cycleStatus(row.id, startDay, { allowActiveToday: canBackfill, manualSaveOnly: true });
                            }}
                          >
                            <StatusButton value={value} disabled={isPast && !canBackfill} label={`${row.subject}${row.type}${startDay}日至${endDay}日${STATUS[value].label}${isPast && !canBackfill ? '，已锁定' : ''}`} />
                            {note && <span className="note-corner" aria-hidden="true" />}
                          </td>
                          {Array.from({ length: month.days - endDay }, (_, index) => (
                            <td key={`after-${index}`} className="mark-cell inactive-cell" />
                          ))}
                        </>
                      );
                    })() : Array.from({ length: month.days }, (_, index) => {
                        const day = index + 1;
                        const value = getStatus(row.id, day);
                        const isActive = isTaskActiveOnDay(row, day);
                        const isCheckable = isTaskCheckableOnDay(row, day);
                        const isPast = isBeforeToday(month.key, day);
                        const canBackfill = Boolean(isBackfillMode && isCurrentMonth && todayDay && day < todayDay);
                        const canEdit = isCheckable && (!isPast || canBackfill);
                        const note = month.notes?.[row.id]?.[day];
                        const noteText = formatCellNote(note);
                        return (
                          <td
                            key={day}
                            className={`mark-cell ${isActive ? '' : 'inactive-cell'} ${isActive && !isCheckable ? 'range-cell' : ''} ${isCheckable && isPast && !canBackfill ? 'past-cell' : ''} ${isCheckable && canBackfill ? 'backfill-cell' : ''} ${note ? 'has-note' : ''}`}
                            title={noteText || undefined}
                            onClick={() => {
                              if (canEdit) cycleStatus(row.id, day, { allowActiveToday: canBackfill, manualSaveOnly: true });
                            }}
                          >
                            {isCheckable && (
                              <>
                                <StatusButton value={value} disabled={isPast && !canBackfill} label={`${row.subject}${row.type}${day}日${STATUS[value].label}${isPast && !canBackfill ? '，已锁定' : ''}`} />
                                {note && <span className="note-corner" aria-hidden="true" />}
                              </>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))}
                <tr className="daily-row">
                  <th colSpan={3}>每日积分合计</th>
                  {dailyPoints.map((value, index) => <td key={index}>{value || '-'}</td>)}
                </tr>
                <tr className="sum-row">
                  <th colSpan={3}>本月积分合计（含已兑换阅读奖励{readingRewardPoints ? ` +${readingRewardPoints}` : ''}）</th>
                  {cumulativePoints.map((value, index) => <td key={index}>{value || '-'}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel-grid">
          <article className="info-panel reading">
            <h2><BookOpen size={24} />暑假阅读书目</h2>
            <ul>
              {books.slice(0, 5).map((book) => <li key={book}>{book}</li>)}
            </ul>
            <button onClick={() => setActiveView('books')}>查看完整书单 <ChevronRight size={18} /></button>
          </article>

          <article className="info-panel rules">
            <h2><Star size={26} fill="#ffc84a" />积分说明</h2>
            <div className="rules-list">
              <div className="rule-status-row">
                <span><i className="legend-dot status-done"><Check size={12} /></i>已完成</span>
                <b>0分</b>
                <p>只记录任务已做完，不增加积分。</p>
              </div>
              <div className="rule-status-row">
                <span><i className="legend-dot status-excellent"><Star size={12} fill="currentColor" /></i>优秀</span>
                <b>+1分</b>
                <p>完成质量较好时使用，计入本月积分。</p>
              </div>
              <div className="rule-status-row">
                <span><i className="legend-dot status-super"><span className="rose-icon">🌹</span></i>非常优秀</span>
                <b>+2分</b>
                <p>完成质量特别好时使用，计入本月积分。</p>
              </div>
              <div className="rule-formula">
                <strong>可用积分 = 本月积分 - 已兑换积分</strong>
                <span>好习惯按设置分值计算；阅读奖励需领取后才计入。</span>
              </div>
            </div>
            <button onClick={() => setActivePanel('rules')}>了解更多积分规则 <ChevronRight size={18} /></button>
          </article>

          <article className="info-panel rewards">
            <h2><Gift size={25} />积分奖励兑换</h2>
            <div className="reward-cards">
              {rewardConfig.slice(0, 3).map((item) => (
                <div className="reward-card" key={`${item.points}-${item.name}`}>
                  <Medal size={42} />
                  <strong>{item.name}</strong>
                  <span>{item.points || '____'}分</span>
                  <button>兑换</button>
                </div>
              ))}
            </div>
            <button className="wide-button" onClick={() => setActiveView('rewards')}>查看全部奖励 <ChevronRight size={18} /></button>
          </article>

          <article className="info-panel reminder">
            <h2>温馨提醒</h2>
            <ul>
              {reminders.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
            </ul>
            <button onClick={() => setActivePanel('reminders')}>编辑提醒内容 <ChevronRight size={18} /></button>
          </article>
        </section>
        </>
        ) : activeView === 'rewards' ? (
          <section className="reward-page">
            <div className="reward-page-hero">
              <div>
                <p>积分奖励商店</p>
                <h2>把每天的努力，换成闪闪发光的小奖励</h2>
                <span>当前可用积分：<strong>{availableRewardPoints}</strong> 分</span>
              </div>
              <div className="reward-hero-actions">
                <button className="reward-add-button" onClick={() => setNewRewardDialog({ name: '', points: '', description: '', icon: 'gift' })}>
                  <Gift size={18} />
                  新增奖励
                </button>
                <div className="reward-hero-badge">
                  <Trophy size={35} />
                  <b>{redeemedRewards.length}</b>
                  <small>已兑换奖励</small>
                </div>
              </div>
            </div>

            <div className="reward-wallet">
              <article className="primary">
                <span>可用积分</span>
                <strong>{availableRewardPoints}</strong>
                <em>可以兑换奖励啦</em>
              </article>
              <article>
                <span>本月累计</span>
                <strong>{monthPoints}</strong>
                <em>任务和读书积分</em>
              </article>
              <article>
                <span>已使用</span>
                <strong>{redeemedRewardPoints}</strong>
                <em>兑换小奖励</em>
              </article>
            </div>

            <section className="reward-shelf">
              <header>
                <div>
                  <p>奖励货架</p>
                  <h3>挑一个想兑换的小奖励吧</h3>
                </div>
                <span>{rewardConfig.length} 个奖励</span>
              </header>
              <div className="reward-gallery">
                {rewardConfig.map((item, index) => (
                  (() => {
                    const points = Number(item.points || 0);
                    const key = rewardKey(item, index);
                    const redeemedCount = redeemedRewards.filter((record) => record.rewardId === key).length;
                    const canRedeem = points > 0 && availableRewardPoints >= points;
                    const missingPoints = Math.max(0, points - availableRewardPoints);
                    const iconOption = REWARD_ICON_OPTIONS.find((option) => option.value === item.icon) || REWARD_ICON_OPTIONS[index % REWARD_ICON_OPTIONS.length];
                    return (
                      <article className={`reward-shop-card ${canRedeem ? 'can-redeem' : ''} ${redeemedCount ? 'redeemed' : ''}`} key={key}>
                        <div className="reward-card-tools">
                          <button type="button" title="编辑奖励" aria-label={`编辑${item.name || '奖励'}`} onClick={() => openEditRewardDialog(item)}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" title="删除奖励" aria-label={`删除${item.name || '奖励'}`} onClick={() => deleteReward(item)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        {redeemedCount > 0 && <em className="reward-redeemed-count">已兑换 {redeemedCount} 次</em>}
                        <div className="reward-product-icon">
                          <span aria-hidden="true">{iconOption.symbol}</span>
                        </div>
                        <h3>{item.name || '未命名奖励'}</h3>
                        <strong>{item.points || '____'} 分</strong>
                        <p>{item.description || (canRedeem ? '可以兑换啦' : `还差 ${missingPoints} 分`)}</p>
                        <button className={canRedeem ? 'ready' : redeemedCount ? 'redeemed' : ''} disabled={!canRedeem} onClick={() => redeemReward(item, index)}>
                          {canRedeem ? '立即兑换' : '继续攒分'}
                        </button>
                      </article>
                    );
                  })()
                ))}
              </div>
            </section>

            <section className="reward-history-panel">
              <header>
                <div>
                  <p>兑换记录</p>
                  <h3>每一次兑换，都是努力留下的小勋章</h3>
                </div>
                <strong>{redeemedRewards.length} 次</strong>
              </header>
              {redeemedRewards.length ? (
                <div className="reward-history-list">
                  {redeemedRewards.map((record) => (
                    <article className="reward-history-item" key={record.id}>
                      <Medal size={22} />
                      <span>{record.name}</span>
                      <b>-{record.points} 分</b>
                      <time>{new Date(record.redeemedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="reward-history-empty">还没有兑换记录，攒够积分后可以来这里领取小惊喜。</div>
              )}
            </section>
          </section>
        ) : activeView === 'books' ? (
          <section className="reading-page">
            <div className="reading-page-hero">
              <div>
                <p>阅读书单</p>
                <h2>对世界保持好奇，让书成为打开美好世界的伙伴</h2>
                <span>{month.label} · 当前月份清单中的阅读计划</span>
              </div>
              <button className={`library-hero-button ${readingScope === 'library' ? 'active' : ''}`} onClick={() => setReadingScope('library')} type="button" aria-label="我的图书馆">
                <BookOpen size={34} />
                <span>我的图书馆</span>
              </button>
            </div>

            <div className="reading-scope-row">
              <div className="reading-hero-actions">
                <div className="month-switch tab-month-switch today-month-switch reading-month-switch">
                  <button onClick={() => changeMonth(-1)} aria-label="上个月">
                    <ChevronLeft size={21} />
                  </button>
                  <button
                    className={`reading-month-current ${readingScope === 'library' ? 'return-month' : ''}`}
                    type="button"
                    aria-label={readingScope === 'library' ? '返回本月书单' : '当前月份书单'}
                    onClick={() => {
                      if (readingScope === 'library') setReadingScope('month');
                    }}
                  >
                    <CalendarDays size={20} />
                    <strong>{readingScope === 'library' ? `返回本月书单 · ${month.label}` : month.label}</strong>
                  </button>
                  <button onClick={() => changeMonth(1)} aria-label="下个月">
                    <ChevronRight size={21} />
                  </button>
                </div>
              </div>
            </div>

            {readingScope === 'library' ? (
              <section className="library-section">
                <div className="library-toolbar">
                  <div>
                    <strong>我的图书馆</strong>
                    <span>新买的书先放在这里，再安排到具体月份阅读。</span>
                  </div>
                  <button className="new-book-button" onClick={openNewBookDialog}><BookOpen size={20} />新建书单</button>
                </div>
                <div className="reading-summary library-summary library-reading-summary">
                  <article
                    className={!libraryStatusFilter && libraryTypeFilter === '所有' ? 'active-summary-filter' : ''}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setLibraryStatusFilter('');
                      setLibraryTypeFilter('所有');
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      setLibraryStatusFilter('');
                      setLibraryTypeFilter('所有');
                    }}
                  >
                    <span>所有书单</span>
                    <strong>{libraryBooks.length}</strong>
                  </article>
                  <article className="active library-type-summary">
                    <div className="summary-title-row">
                      <span>书籍种类</span>
                      <button type="button" className="summary-icon-button" onClick={openBookTypesDialog} aria-label="维护书籍分类">
                        <Settings size={16} />
                      </button>
                    </div>
                    <strong>{libraryTypeStats.length}</strong>
                  </article>
                  <article
                    className={`done ${libraryStatusFilter === 'finished' ? 'active-summary-filter' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setLibraryStatusFilter('finished');
                      setLibraryTypeFilter('所有');
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      setLibraryStatusFilter('finished');
                      setLibraryTypeFilter('所有');
                    }}
                  >
                    <span>已读书单</span>
                    <strong>{finishedLibraryBookIds.size}</strong>
                  </article>
                  <article className="points">
                    <span>未读书单</span>
                    <strong>{Math.max(0, libraryBooks.length - finishedLibraryBookIds.size)}</strong>
                  </article>
                </div>
                <div className="library-controls-row">
                  <div className="library-type-mobile-filter">
                    <button
                      type="button"
                      className={isLibraryTypeMenuOpen ? 'open' : ''}
                      onClick={() => setIsLibraryTypeMenuOpen((value) => !value)}
                      aria-expanded={isLibraryTypeMenuOpen}
                      aria-label="选择书籍分类"
                    >
                      <span>
                        <small>书籍分类</small>
                        <strong>{currentLibraryFilter.type}</strong>
                      </span>
                      <em>{currentLibraryFilter.count}</em>
                      <ChevronDown size={18} />
                    </button>
                    {isLibraryTypeMenuOpen && (
                      <>
                        <button className="library-type-menu-backdrop" type="button" aria-label="关闭书籍分类" onClick={() => setIsLibraryTypeMenuOpen(false)} />
                        <div className="library-type-menu" role="menu" aria-label="书籍分类">
                          {libraryCategoryTabs.map((item) => (
                            <button
                              className={!libraryStatusFilter && libraryTypeFilter === item.type ? 'active' : ''}
                              type="button"
                              key={item.type}
                              onClick={() => {
                                setLibraryTypeFilter(item.type);
                                setLibraryStatusFilter('');
                                setIsLibraryTypeMenuOpen(false);
                              }}
                              role="menuitem"
                            >
                              <span>{item.type}</span>
                              <em>{item.count}</em>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="library-type-tabs" aria-label="书籍分类">
                    {libraryCategoryTabs.map((item) => (
                      <button
                        className={!libraryStatusFilter && libraryTypeFilter === item.type ? 'active' : ''}
                        type="button"
                        key={item.type}
                        onClick={() => {
                          setLibraryTypeFilter(item.type);
                          setLibraryStatusFilter('');
                        }}
                      >
                        {item.type}<span>{item.count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="reading-view-switch" aria-label="我的图书馆显示方式">
                    <button className={libraryViewMode === 'card' ? 'active' : ''} onClick={() => setLibraryViewMode('card')} type="button">卡片显示</button>
                    <button className={libraryViewMode === 'list' ? 'active' : ''} onClick={() => setLibraryViewMode('list')} type="button">列表显示</button>
                  </div>
                </div>
                {filteredLibraryBooks.length ? (
                  libraryViewMode === 'card' ? (
                    <div className="library-book-grid">
                      {filteredLibraryBooks.map(renderLibraryBookCard)}
                    </div>
                  ) : (
                    <div className="library-list-view">
                      {filteredLibraryBooks.map(renderLibraryBookRow)}
                    </div>
                  )
                ) : (
                  <div className="reading-empty">
                    <BookOpen size={48} />
                    <strong>{libraryBooks.length ? '这个分类还没有书' : '全局书单还是空的'}</strong>
                    <p>{libraryBooks.length ? '换一个分类看看，或者新增一本这个类别的书。' : '以后给小朋友买了新书，就先添加到这里，再安排到具体月份阅读。'}</p>
                    <button onClick={openNewBookDialog}>新建书单</button>
                  </div>
                )}
              </section>
            ) : (
              <>
              <div className="reading-summary month-reading-summary">
                <article>
                  <span>本月书单</span>
                  <strong>{readingBooksWithStats.length}</strong>
                </article>
                <article className="active">
                  <span>正在读</span>
                  <strong>{readingGroups.reading.length}</strong>
                </article>
                <article className="done">
                  <span>已读完</span>
                  <strong>{readingGroups.finished.length}</strong>
                </article>
                <article className="points">
                  <span>已兑换/未兑换积分</span>
                  <strong>{readingRewardPoints}/{claimableReadingPoints}</strong>
                </article>
              </div>

              {readingBooksWithStats.length === 0 ? (
              <div className="reading-empty">
                <BookOpen size={48} />
                <strong>这个月份还没有阅读书单</strong>
                <p>先在全局书单添加书，再到设置页为这本书安排阅读任务。</p>
                <button onClick={openNewBookDialog}>新建书单</button>
              </div>
              ) : (
              <div className="reading-sections">
                <div className="reading-controls-row">
                  <div className="reading-tabbar" role="tablist" aria-label="阅读书单分类">
                    {Object.entries(readingTabMeta).map(([key, item]) => (
                      <button key={key} className={readingTab === key ? 'active' : ''} onClick={() => setReadingTab(key)} type="button" role="tab" aria-selected={readingTab === key}>
                        {item.label}
                        <span>{item.count}</span>
                        {item.badge && <em>{item.badge}</em>}
                      </button>
                    ))}
                  </div>
                  <div className="reading-view-switch" aria-label="阅读书单显示方式">
                    <button className={readingViewMode === 'card' ? 'active' : ''} onClick={() => setReadingViewMode('card')} type="button">卡片显示</button>
                    <button className={readingViewMode === 'list' ? 'active' : ''} onClick={() => setReadingViewMode('list')} type="button">列表显示</button>
                  </div>
                </div>

                <section className={`reading-section ${readingTab}`}>
                  <header>
                    <h3>{readingTabMeta[readingTab].label}</h3>
                    <span>{readingTabMeta[readingTab].count} 本</span>
                  </header>
                  {readingViewMode === 'card' ? (
                    <div className="reading-book-grid">
                      {currentReadingBooks.length ? currentReadingBooks.map(renderReadingBookCard) : <p className="reading-section-empty">{readingTabMeta[readingTab].empty}</p>}
                    </div>
                  ) : (
                    <div className="reading-list-view">
                      {currentReadingBooks.length ? currentReadingBooks.map(renderReadingBookRow) : <p className="reading-section-empty">{readingTabMeta[readingTab].empty}</p>}
                    </div>
                  )}
                </section>
              </div>
              )}
              </>
            )}
          </section>
        ) : activeView === 'tools' ? (
          <section className="learning-tools-page">
            <div className="learning-hero">
              <div>
                <p>学习工具</p>
                <h2>拍照批改作业，错题自动整理成练习卷</h2>
                <span>按学期和学科收纳错题，复习时可以直接生成试卷打印。</span>
                <em className="ai-config-status">{aiConfigStatus}</em>
              </div>
              <div className="learning-hero-side">
                <button className="ai-config-button" onClick={openAiConfigDialog} type="button">
                  <Settings size={18} />
                  AI配置
                </button>
                <div className="learning-hero-metrics">
                  <article>
                    <ClipboardCheck size={24} />
                    <strong>{homeworkReviews.length}</strong>
                    <span>次批改</span>
                  </article>
                  <article>
                    <FileText size={24} />
                    <strong>{mistakeItems.length}</strong>
                    <span>道错题</span>
                  </article>
                </div>
              </div>
            </div>

            <div className="learning-tabs" role="tablist" aria-label="学习工具切换">
              <button className={learningTab === 'grader' ? 'active' : ''} onClick={() => setLearningTab('grader')} type="button">
                <Sparkles size={18} />
                AI作业批改
              </button>
              <button className={learningTab === 'mistakes' ? 'active' : ''} onClick={() => setLearningTab('mistakes')} type="button">
                <FileText size={18} />
                错题集
              </button>
            </div>

            {learningTab === 'grader' ? (
              <div className="grader-layout">
                <section className="grader-panel">
                  <header>
                    <div>
                      <p>拍照批改</p>
                      <h3>手机拍一张作业，生成批改结果</h3>
                    </div>
                    <Camera size={32} />
                  </header>
                  <div className="grader-form-grid">
                    <label>
                      <span>学期</span>
                      <select value={graderDraft.term} onChange={(event) => setGraderDraft((current) => ({ ...current, term: event.target.value }))}>
                        {LEARNING_TERMS.map((term) => <option key={term} value={term}>{term}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>学科</span>
                      <select value={graderDraft.subject} onChange={(event) => setGraderDraft((current) => ({ ...current, subject: event.target.value }))}>
                        {LEARNING_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>作业名称</span>
                      <input value={graderDraft.title} placeholder="如：口算练习第3页" onChange={(event) => setGraderDraft((current) => ({ ...current, title: event.target.value }))} />
                    </label>
                    <label>
                      <span>补充说明</span>
                      <input value={graderDraft.note} placeholder="可写题目范围、老师要求等" onChange={(event) => setGraderDraft((current) => ({ ...current, note: event.target.value }))} />
                    </label>
                  </div>
                  <label className="homework-uploader">
                    <input type="file" accept="image/*" capture="environment" onChange={handleHomeworkImageChange} />
                    {graderDraft.imageData ? (
                      <img src={graderDraft.imageData} alt="作业照片预览" />
                    ) : (
                      <span><Upload size={34} />点击拍照或上传作业照片</span>
                    )}
                  </label>
                  {isPreparingHomeworkImage ? <p className="upload-hint">正在处理图片，请稍等...</p> : graderDraft.imageName && <p className="upload-hint">已压缩：{graderDraft.imageName}</p>}
                  {gradingError && !displayHomeworkReview && <p className="upload-error">{gradingError}</p>}
                  <div className="grader-actions">
                    <button onClick={generateHomeworkReview} disabled={isGradingHomework || isPreparingHomeworkImage}>
                      <Sparkles size={18} />
                      {isPreparingHomeworkImage ? '正在处理图片...' : isGradingHomework ? `正在批改 ${gradingElapsedSeconds}s...` : '生成批改结果'}
                    </button>
                    <button className="ghost" onClick={() => { homeworkImageRef.current = ''; setGraderDraft(DEFAULT_GRADER_DRAFT); setLatestReview(null); setShowPreviousReview(true); setGradingError(''); }} disabled={isGradingHomework || isPreparingHomeworkImage}>重新开始</button>
                  </div>
                </section>

                <section className="review-panel">
                  <header>
                    <div>
                      <p>批改结果</p>
                      <h3>{displayHomeworkReview?.title || '等待生成批改结果'}</h3>
                    </div>
                    {displayHomeworkReview && <strong>{displayHomeworkReview.score} 分</strong>}
                  </header>
                  {displayHomeworkReview ? (
                    (() => {
                      const review = displayHomeworkReview;
                      const reviewMistakes = normalizeReviewMistakes(review.mistakes);
                      const reviewAnnotations = normalizeReviewAnnotations(review.imageAnnotations);
                      const visibleAnnotations = reviewAnnotations.length ? reviewAnnotations : buildFallbackAnnotations(review.mistakes);
                      const isApproximateAnnotations = !reviewAnnotations.length && visibleAnnotations.length > 0;
                      const reviewImageUrl = review.annotatedImageUrl || (review.id === latestReview?.id ? homeworkImageRef.current || graderDraft.imageData : '');
                      return (
                        <>
                          {gradingError && <div className="grading-error">{gradingError}</div>}
                          {review.provider === 'demo' && <div className="grading-provider-note">当前服务器未配置 AI Key，下面是演示批改结果。</div>}
                          <div className="review-result-overview">
                            <span>{review.detectedSubject || review.subject}</span>
                            <h4>{review.detectedTitle || review.title}</h4>
                            <p>{review.summary}</p>
                          </div>
                          {reviewImageUrl && (
                            <>
                              <div className="review-section-title">
                                <strong>原图批改</strong>
                                <button className="download-annotated-button" onClick={() => downloadAnnotatedHomeworkImage(review)} disabled={!visibleAnnotations.length} type="button">下载批改图片</button>
                                <span>{visibleAnnotations.length} 处{isApproximateAnnotations ? '大致' : ''}标注</span>
                              </div>
                              <div className="annotated-homework">
                                <img src={reviewImageUrl} alt="原图批改标注" />
                                {visibleAnnotations.length ? visibleAnnotations.map((annotation) => (
                                  <i
                                    key={`${annotation.order}-${annotation.status}`}
                                    className={`homework-mark ${annotation.status} ${annotation.approximate ? 'approximate' : ''}`}
                                    style={{
                                      left: `${annotation.area.left}%`,
                                      top: `${annotation.area.top}%`,
                                      width: `${annotation.area.width}%`,
                                      height: `${annotation.area.height}%`,
                                    }}
                                  >
                                    <b>{annotation.order}</b>
                                    <span>{annotation.label}</span>
                                  </i>
                                )) : <div className="annotation-empty-note">本次批改没有返回原图坐标，请重新批改或换一张更清晰、拍正的照片。</div>}
                                {isApproximateAnnotations && <div className="annotation-empty-note">本次使用错题顺序生成大致标注；想要更精确的位置，请拍正整页并确保题目清晰。</div>}
                              </div>
                            </>
                          )}
                          <div className="review-section-title">
                            <strong>错题明细</strong>
                            <span>{reviewMistakes.length} 道</span>
                          </div>
                          <div className="review-mistake-list">
                            {reviewMistakes.length ? reviewMistakes.map((mistake) => (
                              <article key={mistake.id}>
                                <i className="wrong-stamp">错题</i>
                                {mistake.questionImageUrl && <img className="mistake-question-image" src={mistake.questionImageUrl} alt="原题截图" />}
                                <b>题目：{mistake.order ? `${mistake.order}. ` : ''}{mistake.question}</b>
                                <span>小朋友答案：{mistake.answer || '未识别'}</span>
                                <strong>标准答案：{mistake.correctAnswer}</strong>
                                <p><em>解题过程：</em>{mistake.explanation}</p>
                              </article>
                            )) : <div className="review-no-mistake">这次批改没有发现明确错题。</div>}
                          </div>
                          <div className="review-section-title">
                            <strong>订正建议</strong>
                          </div>
                          <div className="review-suggestions">
                            {normalizeReviewSuggestions(review.suggestions).map((item) => <span key={item}>{item}</span>)}
                          </div>
                          <button className="collect-mistakes" onClick={() => addReviewMistakesToCollection(review)}>
                            <PlusCircle size={18} />
                            收录到错题集
                          </button>
                        </>
                      );
                    })()
                  ) : (
                    <div className="review-empty">
                      <ClipboardCheck size={42} />
                      <strong>{isGradingHomework ? `AI批改中，已等待 ${gradingElapsedSeconds} 秒` : '上传照片后，这里会显示批改结果'}</strong>
                      <p>{gradingError || (isGradingHomework ? '真实拍照作业需要高清识别和推理，通常需要 30-120 秒，请先不要重复点击。' : '会列出错题、正确答案、原因和练习建议。')}</p>
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <section className="mistake-book-page">
                <div className="mistake-toolbar">
                  <div className="term-tabs" aria-label="学期筛选">
                    {['全部学期', ...LEARNING_TERMS].map((term) => (
                      <button key={term} className={mistakeTermFilter === term ? 'active' : ''} onClick={() => setMistakeTermFilter(term)} type="button">{term}</button>
                    ))}
                  </div>
                  <div className="subject-filter" aria-label="学科筛选">
                    {['全部', ...LEARNING_SUBJECTS].map((subject) => (
                      <button key={subject} className={mistakeSubjectFilter === subject ? 'active' : ''} onClick={() => setMistakeSubjectFilter(subject)} type="button">{subject}</button>
                    ))}
                  </div>
                  <button className="print-paper-button" onClick={() => printMistakePaper()}>
                    <Printer size={18} />
                    生成试卷打印
                  </button>
                </div>

                <div className="mistake-summary">
                  {mistakeStats.map((item) => (
                    <article key={item.subject}>
                      <span>{item.subject}</span>
                      <strong>{item.count}</strong>
                      <em>道错题</em>
                    </article>
                  ))}
                  <article className="paper-ready">
                    <span>可组卷</span>
                    <strong>{printableMistakes.length}</strong>
                    <em>道未掌握</em>
                  </article>
                </div>

                <div className="mistake-list">
                  {filteredMistakes.length ? filteredMistakes.map((mistake) => (
                    <article className={mistake.mastered ? 'mastered' : ''} key={mistake.id}>
                      <div className="mistake-card-head">
                        <span>{mistake.term}</span>
                        <b>{mistake.subject}</b>
                      </div>
                      <h3>{mistake.question}</h3>
                      <p>原答案：{mistake.answer || '未记录'}</p>
                      <strong>正确答案：{mistake.correctAnswer}</strong>
                      <em>{mistake.explanation}</em>
                      <div className="mistake-card-actions">
                        <button onClick={() => toggleMistakeMastered(mistake.id)}>{mistake.mastered ? '恢复练习' : '标记掌握'}</button>
                        <button className="danger" onClick={() => deleteMistake(mistake.id)}>删除</button>
                      </div>
                    </article>
                  )) : (
                    <div className="mistake-empty">
                      <FileText size={46} />
                      <strong>当前筛选下还没有错题</strong>
                      <p>先去 AI 作业批改里生成结果，然后点击“收录到错题集”。</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </section>
        ) : activeView === 'history' ? (
          <section className="history-page">
            <div className="history-hero">
              <div>
                <p>历史记录</p>
                <h2>保存当前打卡状态，误点后可以恢复</h2>
                <span>最多保留最近 20 个保存点</span>
              </div>
              <button onClick={createSnapshot}><Save size={20} />保存当前状态</button>
            </div>

            <div className="snapshot-list">
              {snapshots.length === 0 ? (
                <div className="empty-snapshot">
                  <CalendarDays size={42} />
                  <strong>还没有保存点</strong>
                  <p>打卡到一个比较满意的状态后，点击“保存当前状态”。</p>
                </div>
              ) : (
                snapshots.map((snapshot, index) => (
                  <article className="snapshot-card" key={snapshot.id}>
                    <div>
                      <span>保存点 {snapshots.length - index}</span>
                      <h3>{snapshot.label}</h3>
                      <p>保存月份：{snapshot.month}</p>
                    </div>
                    <div className="snapshot-actions">
                      <button onClick={() => restoreSnapshot(snapshot)}><RotateCcw size={18} />恢复</button>
                      <button className="danger" onClick={() => deleteSnapshot(snapshot.id)}><Trash2 size={18} />删除</button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="settings-page">
            <div className="settings-page-hero">
              <div>
                <p>设置中心</p>
                <h2>长期学习打卡配置</h2>
                <span>{databaseStatus}</span>
              </div>
              <button className="compact-primary" onClick={addMonth}>+ 新建月份清单</button>
            </div>

            <div className="settings-layout">
              <aside className="settings-months">
                <div className="settings-block-head">
                  <div>
                    <h3>月份清单</h3>
                    <p>可长期复用，寒暑假和平时都能使用</p>
                  </div>
                </div>
                <div className="month-list">
                  {months.map((item, index) => (
                    <button key={item.id} className={item.id === month.id ? 'active' : ''} onClick={() => setMonthIndex(index)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </aside>

              <div className="month-detail">
                <section className="month-detail-card">
                  <div className="settings-block-head">
                    <div>
                      <h3>{month.label}</h3>
                      <p>当前月份目标、任务分类、阅读书单都会保存到这个月份清单中</p>
                    </div>
                    <button className="save-config" onClick={saveConfiguration}><Save size={15} />保存本月配置</button>
                  </div>
                  <label className="month-goal-field">
                    <span>本月标题</span>
                    <input value={month.title || ''} placeholder="例如：夏日好习惯·快乐成长每一天" onChange={(event) => updateMonth({ title: event.target.value })} />
                  </label>
                  <label className="month-goal-field">
                    <span>本月目标</span>
                    <input value={month.goal || ''} onChange={(event) => updateMonth({ goal: event.target.value })} />
                  </label>
                </section>

                <section className="config-section compact-config">
                  <header>
                    <div>
                      <h3>分类与任务项</h3>
                      <p>固定分类适合分享给其他家长，自定义分类可按家庭需求补充。</p>
                    </div>
                    <div className="add-category-control">
                      <select value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)}>
                        {FIXED_CATEGORIES.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                        <option value="custom">自定义分类</option>
                      </select>
                      <button onClick={addCategory}>新增分类</button>
                    </div>
                  </header>

                  <div className="category-config-list">
                    {month.categories.map((category) => {
                      const isHabit = category.name === '好习惯';
                      const isReading = category.name === '阅读';
                      const readingBookOptions = isReading ? normalizeLibraryBooks([...(libraryBooks || []), ...(month.readingBooks || [])]) : [];
                      return (
                        <article className={`category-config-card category-${category.color} ${settingsFocusCategory === category.name ? 'settings-category-focus' : ''}`} data-setting-category-name={category.name} key={category.id}>
                          <div className="category-config-head">
                            <div className="category-title">
                              <i>{category.badge}</i>
                              <input value={category.name} disabled={FIXED_CATEGORIES.some((item) => item.name === category.name)} onChange={(event) => updateCategory(category.id, { name: event.target.value, badge: event.target.value.slice(0, 1) || category.badge })} />
                            </div>
                            <select value={category.color} onChange={(event) => updateCategory(category.id, { color: event.target.value })}>
                              <option value="blue">蓝色</option>
                              <option value="green">绿色</option>
                              <option value="red">红色</option>
                              <option value="purple">紫色</option>
                              <option value="orange">橙色</option>
                            </select>
                            <button className="icon-danger" title="删除分类" aria-label="删除分类" onClick={() => deleteCategory(category.id)}><Trash2 size={15} /></button>
                          </div>

                          <div className={`task-config-grid ${isHabit ? 'habit-grid' : ''}`}>
                            <div className="task-config-header">
                              <span>任务名称</span>
                              <span>类型</span>
                              <span>打卡方式</span>
                              <span>重要度</span>
                              <span>开始日</span>
                              <span>结束日</span>
                              {isHabit && <span>积分</span>}
                              <span>操作</span>
                            </div>
                            {category.tasks.map((task) => (
                              <div className="task-config-row" key={task.id}>
                                {isReading ? (
                                  <div className="reading-task-title">
                                    <select value={task.bookId || ''} onChange={(event) => updateTask(category.id, task.id, { bookId: event.target.value })}>
                                      <option value="">手动输入任务</option>
                                      {readingBookOptions.map((book) => (
                                        <option key={book.id} value={book.id}>{book.name || '未命名书目'} · {book.type || '其它'}</option>
                                      ))}
                                    </select>
                                    {!task.bookId && <input value={task.title} placeholder="输入阅读任务名称" onChange={(event) => updateTask(category.id, task.id, { title: event.target.value })} />}
                                  </div>
                                ) : (
                                  <input value={task.title} placeholder={isHabit ? '新的好习惯' : '新的任务'} onChange={(event) => updateTask(category.id, task.id, { title: event.target.value })} />
                                )}
                                <select value={task.type} disabled={Boolean(task.bookId)} onChange={(event) => updateTask(category.id, task.id, { type: event.target.value })}>
                                  <option value="daily">每日固定</option>
                                  <option value="stage">阶段任务</option>
                                </select>
                                <select value={task.checkMode || 'daily'} disabled={task.type !== 'stage' && !task.bookId} onChange={(event) => updateTask(category.id, task.id, { checkMode: event.target.value })}>
                                  <option value="daily">每天打卡</option>
                                  <option value="stage">阶段打卡</option>
                                </select>
                                <select value={task.importance || 'normal'} onChange={(event) => updateTask(category.id, task.id, { importance: event.target.value })}>
                                  <option value="normal">普通</option>
                                  <option value="important">重要</option>
                                </select>
                                <label className="compact-number">
                                  <span>开始日</span>
                                  <input type="number" min="1" max={month.days} value={task.startDay} disabled={task.type === 'daily'} onChange={(event) => updateTask(category.id, task.id, { startDay: event.target.value })} />
                                </label>
                                <label className="compact-number">
                                  <span>结束日</span>
                                  <input type="number" min="1" max={month.days} value={task.endDay} disabled={task.type === 'daily'} onChange={(event) => updateTask(category.id, task.id, { endDay: event.target.value })} />
                                </label>
                                {isHabit && (
                                  <label className="compact-number">
                                    <span>积分</span>
                                    <input type="number" min="0" value={task.habitPoints || 2} onChange={(event) => updateTask(category.id, task.id, { habitPoints: event.target.value })} />
                                  </label>
                                )}
                                <button className="icon-danger" title="删除任务" aria-label="删除任务" onClick={() => deleteTask(category.id, task.id)}><Trash2 size={14} /></button>
                              </div>
                            ))}
                          </div>
                          <div className="config-row-actions">
                            <button className="add-inline" data-setting-add-category={category.name} onClick={() => addTask(category.id)}>+ 添加任务项</button>
                            <button className="quick-save" onClick={saveConfiguration}><Save size={14} />快速保存</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

              </div>
            </div>
          </section>
        )}
      </section>

      {activePanel && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="内容管理">
          <div className="settings-panel mini-panel">
            <header>
              <div>
                <h2>
                  {activePanel === 'books' && '阅读书单管理'}
                  {activePanel === 'rules' && '积分规则说明'}
                  {activePanel === 'reminders' && '温馨提醒编辑'}
                </h2>
                <p>
                  {activePanel === 'books' && '每行一本书，保存后阅读书目区会同步更新。'}
                  {activePanel === 'rules' && '这里展示打卡状态对应的积分规则。'}
                  {activePanel === 'reminders' && '每行一条提醒，底部温馨提醒区会同步更新。'}
                </p>
              </div>
              <button onClick={() => setActivePanel(null)}>完成</button>
            </header>

            <div className="feature-editor">
              {activePanel === 'books' && (
                <label>
                  <span>完整阅读书单</span>
                  <textarea value={books.join('\n')} onChange={(event) => updateBooks(event.target.value)} rows={Math.max(6, books.length)} />
                </label>
              )}

              {activePanel === 'rules' && (
                <div className="rules-detail">
                  <section className="rules-detail-section">
                    <h3>打卡状态分值</h3>
                    {POINT_RULES.map((rule) => (
                      <article key={rule.status}>
                        <i className={`legend-dot status-${rule.status}`}>
                          {rule.status === 'done' && <Check size={12} />}
                          {rule.status === 'excellent' && <Star size={12} fill="currentColor" />}
                          {rule.status === 'super' && <span className="rose-icon">🌹</span>}
                        </i>
                        <strong>{rule.label}</strong>
                        <b>{rule.score}</b>
                        <p>{rule.note}</p>
                      </article>
                    ))}
                  </section>
                  <section className="rules-detail-section">
                    <h3>系统积分口径</h3>
                    {POINT_RULE_DETAILS.map((rule) => (
                      <article key={rule.title}>
                        <i className="rule-badge">{rule.badge}</i>
                        <strong>{rule.title}</strong>
                        <b>{rule.score}</b>
                        <p>{rule.note}</p>
                      </article>
                    ))}
                  </section>
                </div>
              )}

              {activePanel === 'reminders' && (
                <label>
                  <span>温馨提醒内容</span>
                  <textarea value={reminders.join('\n')} onChange={(event) => updateReminders(event.target.value)} rows={Math.max(5, reminders.length)} />
                </label>
              )}
            </div>
          </div>
        </section>
      )}

      {readingPlanEditor && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="设置阅读范围">
          <div className="reading-note-panel">
            <header>
              <div>
                <h2>设置阅读范围</h2>
                <p>{readingPlanEditor.bookName} · {readingPlanEditor.day}日</p>
              </div>
            </header>
            <div className="reading-page-range">
              <label>
                <span>从第</span>
                <input
                  inputMode="numeric"
                  value={readingPlanEditor.startPage}
                  onChange={(event) => setReadingPlanEditor((current) => ({ ...current, startPage: event.target.value.replace(/[^\d]/g, '') }))}
                />
                <em>页</em>
              </label>
              <label>
                <span>读到</span>
                <input
                  inputMode="numeric"
                  value={readingPlanEditor.endPage}
                  onChange={(event) => setReadingPlanEditor((current) => ({ ...current, endPage: event.target.value.replace(/[^\d]/g, '') }))}
                />
                <em>页</em>
              </label>
            </div>
            <footer>
              <button className="ghost" onClick={() => setReadingPlanEditor(null)}>取消</button>
              <button onClick={saveReadingPlanRange} disabled={!readingPlanEditor.startPage || !readingPlanEditor.endPage}>保存范围</button>
            </footer>
          </div>
        </section>
      )}

      {readingNoteEditor && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="阅读进度记录">
          <div className="reading-note-panel">
            <header>
              <div>
                <h2>记录阅读进度</h2>
                <p>{readingNoteEditor.title} · {readingNoteEditor.day}日</p>
              </div>
            </header>
            <div className="reading-page-range">
              <label>
                <span>从第</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={readingNoteEditor.startPage}
                  onChange={(event) => setReadingNoteEditor((current) => ({ ...current, startPage: event.target.value.replace(/[^\d]/g, '') }))}
                />
                <em>页</em>
              </label>
              <label>
                <span>读到第</span>
                <input
                  inputMode="numeric"
                  value={readingNoteEditor.endPage}
                  onChange={(event) => setReadingNoteEditor((current) => ({ ...current, endPage: event.target.value.replace(/[^\d]/g, '') }))}
                />
                <em>页</em>
              </label>
            </div>
            {readingNoteEditor.legacyNote && <p className="legacy-reading-note">旧备注：{readingNoteEditor.legacyNote}</p>}
            <footer>
              <button className="ghost" onClick={() => setReadingNoteEditor(null)}>取消</button>
              <button onClick={saveReadingNote}>保存</button>
            </footer>
          </div>
        </section>
      )}

      {newBookDialog && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="新建书单">
          <div className="book-dialog-panel">
            <header>
              <div>
                <h2>{newBookDialog.id ? '编辑书籍' : '新建书单'}</h2>
                <p>这里只设置书本信息，阅读时间和打卡方式在“新建阅读任务”里设置。</p>
              </div>
            </header>
            <div className="book-dialog-fields">
              <label>
                <span>书名</span>
                <input
                  autoFocus
                  value={newBookDialog.name}
                  placeholder="例如：《尼尔斯骑鹅旅行记》"
                  onChange={(event) => setNewBookDialog((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                <span>书的类型</span>
                <select
                  value={newBookDialog.type}
                  onChange={(event) => setNewBookDialog((current) => ({ ...current, type: event.target.value }))}
                >
                  {bookTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label>
                <span>总页数</span>
                <input
                  inputMode="numeric"
                  value={newBookDialog.totalPages}
                  placeholder="可不填"
                  onChange={(event) => setNewBookDialog((current) => ({ ...current, totalPages: event.target.value.replace(/[^\d]/g, '') }))}
                />
              </label>
              <label>
                <span>读完奖励积分</span>
                <input
                  inputMode="numeric"
                  value={newBookDialog.rewardPoints}
                  onChange={(event) => setNewBookDialog((current) => ({ ...current, rewardPoints: event.target.value.replace(/[^\d]/g, '') }))}
                />
              </label>
            </div>
            <footer>
              <button className="ghost" onClick={() => setNewBookDialog(null)}>取消</button>
              <button onClick={confirmNewBook}>{newBookDialog.id ? '保存修改' : '确认新建'}</button>
            </footer>
          </div>
        </section>
      )}

      {bookTypesDialog !== null && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="维护书籍分类">
          <div className="book-dialog-panel book-types-dialog-panel">
            <header>
              <div>
                <h2>维护书籍分类</h2>
                <p>每行一个分类，保存后会同步到图书馆筛选栏和新建书单选项。</p>
              </div>
            </header>
            <div className="book-dialog-fields">
              <label>
                <span>书籍分类</span>
                <textarea
                  className="book-types-editor"
                  value={bookTypesDialog}
                  onChange={(event) => setBookTypesDialog(event.target.value)}
                />
              </label>
            </div>
            <footer>
              <button className="ghost" onClick={() => setBookTypesDialog(null)}>取消</button>
              <button onClick={saveBookTypes}>保存分类</button>
            </footer>
          </div>
        </section>
      )}

      {bookPagesDialog && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="设置总页数">
          <div className="book-dialog-panel">
            <header>
              <div>
                <h2>设置总页数</h2>
                <p>{bookPagesDialog.name}</p>
              </div>
            </header>
            <div className="book-dialog-fields">
              <label>
                <span>总页数</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={bookPagesDialog.totalPages}
                  placeholder="例如：128"
                  onChange={(event) => setBookPagesDialog((current) => ({ ...current, totalPages: event.target.value.replace(/[^\d]/g, '') }))}
                />
              </label>
            </div>
            <footer>
              <button className="ghost" onClick={() => setBookPagesDialog(null)}>取消</button>
              <button onClick={confirmBookPages} disabled={Number(bookPagesDialog.totalPages || 0) <= 0}>保存页数</button>
            </footer>
          </div>
        </section>
      )}

      {newRewardDialog && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label={newRewardDialog.id ? '编辑奖励' : '新增奖励'}>
          <div className="book-dialog-panel reward-dialog-panel">
            <header>
              <div>
                <h2>{newRewardDialog.id ? '编辑奖励' : '新增奖励'}</h2>
                <p>{newRewardDialog.id ? '修改奖励内容、图标和所需积分，保存后会重新排序。' : '设置一个可以用积分兑换的小奖励，确认后会放到奖励货架里。'}</p>
              </div>
            </header>
            <div className="book-dialog-fields">
              <div className="reward-icon-picker">
                <span>物品图标</span>
                <div>
                  {REWARD_ICON_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={newRewardDialog.icon === option.value ? 'active' : ''}
                      type="button"
                      onClick={() => setNewRewardDialog((current) => ({ ...current, icon: option.value }))}
                    >
                      <b>{option.image ? <img src={option.image} alt="" /> : option.symbol}</b>
                      <small>{option.label}</small>
                    </button>
                  ))}
                </div>
              </div>
              <label>
                <span>奖励内容</span>
                <input
                  autoFocus
                  value={newRewardDialog.name}
                  placeholder="例如：彩色贴纸、漂亮铅笔"
                  onChange={(event) => setNewRewardDialog((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                <span>内容说明</span>
                <input
                  value={newRewardDialog.description}
                  placeholder="例如：完成后和家人一起领取"
                  onChange={(event) => setNewRewardDialog((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <label>
                <span>所需积分</span>
                <input
                  inputMode="numeric"
                  value={newRewardDialog.points}
                  placeholder="例如：120"
                  onChange={(event) => setNewRewardDialog((current) => ({ ...current, points: event.target.value.replace(/[^\d]/g, '') }))}
                />
              </label>
            </div>
            <footer>
              <button className="ghost" onClick={() => setNewRewardDialog(null)}>取消</button>
              <button onClick={confirmNewReward} disabled={!newRewardDialog.name.trim() || Number(newRewardDialog.points || 0) <= 0}>{newRewardDialog.id ? '保存修改' : '确认新增'}</button>
            </footer>
          </div>
        </section>
      )}

      {aiConfigDialogOpen && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="AI批改配置">
          <div className="book-dialog-panel ai-config-panel">
            <header>
              <div>
                <h2>AI批改配置</h2>
                <p>先选择要配置的服务；只有点击“保存并启用”才会切换实际批改模型。</p>
              </div>
            </header>
            <div className="book-dialog-fields ai-config-fields">
              <div className="ai-provider-switch">
                <button className={selectedAiProvider === 'aliyun' ? 'active' : ''} onClick={() => setSelectedAiProvider('aliyun')} type="button">阿里 qwen3-vl-plus{aiConfigDraft.activeProvider === 'aliyun' ? ' · 当前启用' : ''}</button>
                <button className={selectedAiProvider === 'baidu' ? 'active' : ''} onClick={() => setSelectedAiProvider('baidu')} type="button">百度智能作业批改{aiConfigDraft.activeProvider === 'baidu' ? ' · 当前启用' : ''}</button>
              </div>
              {selectedAiProvider === 'aliyun' && <section className="ai-config-section">
                <h3>阿里百炼</h3>
                <label>
                  <span>API Key</span>
                  <input type="password" value={aiConfigDraft.aliyun.apiKey || ''} placeholder={aiConfigDraft.aliyun.configured ? '已配置，留空保持原密钥' : '填写 DashScope API Key'} onChange={(event) => setAiConfigDraft((current) => ({ ...current, aliyun: { ...current.aliyun, apiKey: event.target.value } }))} />
                </label>
                <label>
                  <span>Base URL</span>
                  <input value={aiConfigDraft.aliyun.baseUrl || ''} onChange={(event) => setAiConfigDraft((current) => ({ ...current, aliyun: { ...current.aliyun, baseUrl: event.target.value } }))} />
                </label>
                <label>
                  <span>模型名</span>
                  <input value={aiConfigDraft.aliyun.model || ''} onChange={(event) => setAiConfigDraft((current) => ({ ...current, aliyun: { ...current.aliyun, model: event.target.value } }))} />
                </label>
              </section>}
              {selectedAiProvider === 'baidu' && <section className="ai-config-section muted">
                <h3>百度智能作业批改</h3>
                <label>
                  <span>API Key</span>
                  <input value={aiConfigDraft.baidu.apiKey || ''} placeholder={aiConfigDraft.baidu.configured ? '已配置，留空保持原 API Key' : '填写百度 API Key'} onChange={(event) => setAiConfigDraft((current) => ({ ...current, baidu: { ...current.baidu, apiKey: event.target.value } }))} />
                </label>
                <label>
                  <span>Secret Key</span>
                  <input type="password" value={aiConfigDraft.baidu.secretKey || ''} placeholder={aiConfigDraft.baidu.configured ? '已配置，留空保持原 Secret Key' : '填写百度 Secret Key'} onChange={(event) => setAiConfigDraft((current) => ({ ...current, baidu: { ...current.baidu, secretKey: event.target.value } }))} />
                </label>
                <div className="ai-config-two">
                  <label>
                    <span>轮询间隔 ms</span>
                    <input inputMode="numeric" value={aiConfigDraft.baidu.pollIntervalMs || 6000} onChange={(event) => setAiConfigDraft((current) => ({ ...current, baidu: { ...current.baidu, pollIntervalMs: event.target.value.replace(/[^\d]/g, '') } }))} />
                  </label>
                  <label>
                    <span>最大等待 ms</span>
                    <input inputMode="numeric" value={aiConfigDraft.baidu.timeoutMs || 60000} onChange={(event) => setAiConfigDraft((current) => ({ ...current, baidu: { ...current.baidu, timeoutMs: event.target.value.replace(/[^\d]/g, '') } }))} />
                  </label>
                </div>
              </section>}
            </div>
            <footer>
              <button className="ghost" onClick={() => setAiConfigDialogOpen(false)}>取消</button>
              <button className="ghost" onClick={() => confirmAiConfig(false)}>只保存配置</button>
              <button onClick={() => confirmAiConfig(true)}>保存并启用{selectedAiProvider === 'baidu' ? '百度' : '阿里'}</button>
            </footer>
          </div>
        </section>
      )}

      {saveToast && (
        <div className={`save-toast ${saveToast.type}`} role="status" aria-live="polite">
          <Check size={16} />
          <span>{saveToast.message}</span>
        </div>
      )}

      {rewardCelebration && (
        <section className="celebration-mask" role="status" aria-live="polite" onClick={() => setRewardCelebration(null)}>
          <div className="fireworks" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="celebration-card">
            <Gift size={54} />
            <span>阅读奖励到账</span>
            <h2>太棒啦！</h2>
            <p>读完《{rewardCelebration.bookName.replace(/^《|》$/g, '')}》，获得</p>
            <strong>+{rewardCelebration.points} 分</strong>
          </div>
        </section>
      )}

      {rewardExchangeCelebration && (
        <section className="celebration-mask reward-shop-celebration" role="status" aria-live="polite" onClick={() => setRewardExchangeCelebration(null)}>
          <div className="fireworks" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="celebration-card">
            <Trophy size={56} />
            <span>奖励兑换成功</span>
            <h2>领取小奖励！</h2>
            <p>{rewardExchangeCelebration.name}</p>
            <strong>-{rewardExchangeCelebration.points} 分</strong>
          </div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
