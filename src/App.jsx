import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  BookOpen,
  BadgePlus,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Cookie,
  Crown,
  Download,
  Dumbbell,
  EyeOff,
  FileText,
  Flag,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartHandshake,
  Home,
  MapPinned,
  Medal,
  PackageOpen,
  Palette,
  Pencil,
  PenLine,
  PiggyBank,
  PlusCircle,
  Printer,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  Trophy,
  Trees,
  Upload,
  UserRound,
  Wrench,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import './styles.css';
import {
  MISTAKE_ERROR_TYPES,
  calculateRewardWallet,
  createTaskTemplate,
  filterMistakes,
  filterIgnoredReviewAnnotations,
  getMistakeKnowledgePointCounts,
  mistakeCollectionKey,
  mergeCatalogItems,
  normalizeMistakeErrorType,
  normalizeMistakeKnowledgePoint,
  normalizeReviewMistakeDecision,
} from './state-utils.js';
import mascotImage from './assets/child-mascot.png';
import growthSeedImage from './assets/growth-tree/seed.png';
import growthSproutImage from './assets/growth-tree/sprout.png';
import growthSeedlingImage from './assets/growth-tree/seedling.png';
import growthYoungTreeImage from './assets/growth-tree/young-tree.png';
import growthBloomingTreeImage from './assets/growth-tree/blooming-tree.png';
import growthMatureTreeImage from './assets/growth-tree/mature-tree.png';

const LEGACY_MONTHS = [
  { key: '2026-07', label: '2026年7月', short: '7月', days: 31 },
  { key: '2026-08', label: '2026年8月', short: '8月', days: 31 },
];

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const STORAGE_KEY = 'little-growth-planet-state-v1';
const VIEW_STORAGE_KEY = 'little-growth-planet-active-view';
const READING_SCOPE_STORAGE_KEY = 'little-growth-planet-reading-scope';
const LEGACY_STORAGE_KEY = 'yan-yixin-summer-dashboard-v4';
const LEGACY_READING_SCOPE_STORAGE_KEY = 'yan-yixin-reading-scope';
const API_STATE_URL = '/api/state';
const API_STATE_EVENTS_URL = '/api/state/events';
const API_GRADE_HOMEWORK_URL = '/api/grade-homework';
const API_AI_CONFIG_URL = '/api/ai-config';
const API_MISTAKE_IMAGES_URL = '/api/mistake-images';
const STATUS_ORDER = ['empty', 'done', 'excellent', 'super'];
const VALID_VIEWS = ['today', 'home', 'rewards', 'books', 'tools', 'settings'];
const TEMPORARY_TASK_TITLE = '临时打卡任务';
const GROWTH_TREE_IMAGES = [
  growthSeedImage,
  growthSproutImage,
  growthSeedlingImage,
  growthYoungTreeImage,
  growthBloomingTreeImage,
  growthMatureTreeImage,
];

const STATUS = {
  empty: { label: '未打卡', points: 0 },
  done: { label: '已完成', points: 0 },
  excellent: { label: '优秀', points: 2 },
  super: { label: '非常优秀', points: 5 },
};
const MONTH_EXPORT_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'completed', label: '已完成' },
  { value: 'unfinished', label: '未完成' },
];
const MONTH_EXPORT_COLORS = {
  blue: { header: '#347fd1', light: '#eaf5ff', text: '#1f67b4' },
  green: { header: '#38a85a', light: '#eef9ea', text: '#258844' },
  red: { header: '#f05a57', light: '#fff0f0', text: '#d8403d' },
  purple: { header: '#825ee0', light: '#f5efff', text: '#6f48c8' },
  orange: { header: '#f29325', light: '#fff5dc', text: '#c46a13' },
};

const REQUIRED_TODAY_SUBJECTS = ['语文', '数学', '英语', '阅读'];
const DEFAULT_POINT_CONFIG = {
  excellent: 2,
  super: 5,
  habit: 5,
  readingBook: 20,
};
const DEFAULT_PROFILE = {
  avatarData: '',
  avatarHistory: [],
  name: '小小星',
  gender: '女孩',
  birthday: '',
  school: '',
  grade: '二年级',
};
const PROFILE_GENDERS = ['女孩', '男孩'];
const PROFILE_GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
const DEFAULT_READING_REWARD_POINTS = DEFAULT_POINT_CONFIG.readingBook;
const DEFAULT_HABIT_POINTS = DEFAULT_POINT_CONFIG.habit;
const READING_REWARD_VERSION = 2;

const NAV_ITEMS = [
  { label: '今日打卡', icon: Home },
  { label: '积分奖励', icon: Trophy },
  { label: '阅读书单', icon: BookOpen },
  { label: '学习工具', icon: Pencil },
  { label: '设置中心', icon: Settings },
];

const LEARNING_SUBJECTS = ['语文', '数学', '英语'];
const LEARNING_TERMS = ['二年级上学期', '二年级下学期', '一年级下学期', '三年级上学期'];
const MISTAKE_PAGE_SIZE = 30;

const DEFAULT_GRADER_DRAFT = {
  term: '二年级上学期',
  title: '',
  note: '',
  imageData: '',
  imageName: '',
};

const DEFAULT_AI_CONFIG_DRAFT = {
  activeProvider: 'deepseek',
  deepseek: {
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash-vision-exp',
    configured: false,
    keySource: 'none',
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

const DEFAULT_REMINDERS = [
  '每天安排固定的学习和休息时间，劳逸结合哦！',
  '记得每天阅读20分钟，积累知识。',
  '完成计划后及时打卡，养成好习惯！',
];

const POINT_RULES = [
  { status: 'done', label: '已完成', score: '0分', note: '任务完成，打勾记录，不额外加积分。' },
  { status: 'excellent', label: '优秀', score: '+2分', note: '完成质量好，奖励2个积分。' },
  { status: 'super', label: '非常优秀', score: '+5分', note: '完成质量非常棒，奖励5个积分。' },
];

const POINT_RULE_DETAILS = [
  {
    title: '普通学习任务',
    badge: '打卡',
    score: '0 / +2 / +5',
    note: '语文、数学、英语、阅读等普通任务有三种有效状态：已完成只记录进度不加分；优秀 +2 分；非常优秀 +5 分。',
  },
  {
    title: '好习惯任务',
    badge: '习惯',
    score: '完成即加分',
    note: '好习惯不区分优秀等级，只要当天完成，就按该习惯设置的积分计入本月积分；默认每项 +5 分。',
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

const REWARD_TYPES = [
  { type: '文具用品', icon: 'PenLine' },
  { type: '图书阅读', icon: 'BookOpen' },
  { type: '玩具礼物', icon: 'Gift' },
  { type: '美食零食', icon: 'Cookie' },
  { type: '娱乐时间', icon: 'Gamepad2' },
  { type: '户外活动', icon: 'Trees' },
  { type: '亲子陪伴', icon: 'HeartHandshake' },
  { type: '家庭特权', icon: 'Crown' },
  { type: '学习成长', icon: 'Sparkles' },
  { type: '运动健康', icon: 'Dumbbell' },
  { type: '创意手工', icon: 'Palette' },
  { type: '旅行出游', icon: 'MapPinned' },
  { type: '惊喜盲盒', icon: 'PackageOpen' },
  { type: '现金储蓄', icon: 'PiggyBank' },
  { type: '荣誉成就', icon: 'Trophy' },
  { type: '自定义', icon: 'BadgePlus' },
];

const REWARD_CATALOG_VERSION = 2;

const DEFAULT_REWARDS = [
  { id: 'reward-sticker-pack', points: '20', name: '可爱贴纸', description: '选一张喜欢的贴纸装饰本子。', type: '文具用品', icon: 'PenLine' },
  { id: 'reward-pencil', points: '20', name: '卡通铅笔', description: '奖励一支喜欢的铅笔。', type: '文具用品', icon: 'PenLine' },
  { id: 'reward-eraser', points: '30', name: '趣味橡皮', description: '挑一个可爱造型橡皮。', type: '文具用品', icon: 'PenLine' },
  { id: 'reward-notebook', points: '100', name: '精美笔记本', description: '换一本专属小笔记本。', type: '文具用品', icon: 'PenLine' },
  { id: 'reward-bookmark', points: '20', name: '可爱书签', description: '给正在读的书配一个书签。', type: '图书阅读', icon: 'BookOpen' },
  { id: 'reward-bedtime-story', points: '30', name: '睡前故事加长', description: '今晚多听一个小故事。', type: '图书阅读', icon: 'BookOpen' },
  { id: 'reward-comic-book', points: '150', name: '选一本漫画', description: '去书架里选一本漫画读。', type: '图书阅读', icon: 'BookOpen' },
  { id: 'reward-new-book', points: '300', name: '买一本新书', description: '去书店挑一本喜欢的新书。', type: '图书阅读', icon: 'BookOpen' },
  { id: 'reward-mini-blindbox', points: '50', name: '小盲盒', description: '领取一个小惊喜盲盒。', type: '玩具礼物', icon: 'Gift' },
  { id: 'reward-puzzle', points: '100', name: '拼图玩具', description: '选一个适合自己的拼图。', type: '玩具礼物', icon: 'Gift' },
  { id: 'reward-blocks', points: '300', name: '积木小套装', description: '兑换一个小型积木套装。', type: '玩具礼物', icon: 'Gift' },
  { id: 'reward-plush', points: '250', name: '毛绒挂件', description: '挑一个喜欢的小挂件。', type: '玩具礼物', icon: 'Gift' },
  { id: 'reward-fruit', points: '20', name: '喜欢的水果', description: '今天安排一份喜欢的水果。', type: '美食零食', icon: 'Cookie' },
  { id: 'reward-cookie', points: '30', name: '小饼干', description: '兑换一份小饼干。', type: '美食零食', icon: 'Cookie' },
  { id: 'reward-icecream', points: '80', name: '冰激凌', description: '周末领取一个冰激凌。', type: '美食零食', icon: 'Cookie' },
  { id: 'reward-family-meal', points: '300', name: '美味大餐', description: '选择一次喜欢的家庭餐。', type: '美食零食', icon: 'Cookie' },
  { id: 'reward-cartoon-10', points: '20', name: '动画片 10 分钟', description: '兑换 10 分钟动画时间。', type: '娱乐时间', icon: 'Gamepad2' },
  { id: 'reward-game-15', points: '50', name: '游戏 15 分钟', description: '兑换 15 分钟游戏时间。', type: '娱乐时间', icon: 'Gamepad2' },
  { id: 'reward-movie-night', points: '150', name: '家庭电影夜', description: '选一部适合全家看的电影。', type: '娱乐时间', icon: 'Gamepad2' },
  { id: 'reward-tablet-time', points: '120', name: '平板娱乐时间', description: '兑换一次约定好的平板时间。', type: '娱乐时间', icon: 'Gamepad2' },
  { id: 'reward-park', points: '100', name: '去公园玩', description: '安排一次公园活动。', type: '户外活动', icon: 'Trees' },
  { id: 'reward-bike', points: '60', name: '骑车时间', description: '出去骑车放松一下。', type: '户外活动', icon: 'Trees' },
  { id: 'reward-kite', points: '120', name: '放风筝', description: '天气合适时去放风筝。', type: '户外活动', icon: 'Trees' },
  { id: 'reward-camping', points: '600', name: '户外露营', description: '兑换一次小型户外露营计划。', type: '户外活动', icon: 'Trees' },
  { id: 'reward-parent-play', points: '50', name: '陪玩 30 分钟', description: '爸爸妈妈专心陪玩半小时。', type: '亲子陪伴', icon: 'HeartHandshake' },
  { id: 'reward-board-game', points: '80', name: '亲子桌游', description: '全家一起玩一局桌游。', type: '亲子陪伴', icon: 'HeartHandshake' },
  { id: 'reward-handcraft-together', points: '120', name: '一起做手工', description: '和家人一起完成一个手工作品。', type: '亲子陪伴', icon: 'HeartHandshake' },
  { id: 'reward-parent-date', points: '250', name: '亲子约会', description: '安排一次专属亲子时间。', type: '亲子陪伴', icon: 'HeartHandshake' },
  { id: 'reward-dinner-choice', points: '50', name: '今天选晚饭', description: '由小朋友决定今天晚饭吃什么。', type: '家庭特权', icon: 'Crown' },
  { id: 'reward-captain', points: '30', name: '当一天小队长', description: '今天做家庭小队长。', type: '家庭特权', icon: 'Crown' },
  { id: 'reward-weekend-choice', points: '150', name: '决定周末活动', description: '选择一次周末家庭活动。', type: '家庭特权', icon: 'Crown' },
  { id: 'reward-room-decor', points: '200', name: '布置小角落', description: '给自己的书桌或房间添一点装饰。', type: '家庭特权', icon: 'Crown' },
  { id: 'reward-science-kit', points: '150', name: '科学小实验', description: '做一次安全有趣的小实验。', type: '学习成长', icon: 'Sparkles' },
  { id: 'reward-museum', points: '300', name: '博物馆参观', description: '去看一次展览或博物馆。', type: '学习成长', icon: 'Sparkles' },
  { id: 'reward-interest-class', points: '800', name: '兴趣课体验', description: '体验一次感兴趣的课程。', type: '学习成长', icon: 'Sparkles' },
  { id: 'reward-learning-tool', points: '300', name: '学习小工具', description: '选择一个有帮助的学习小工具。', type: '学习成长', icon: 'Sparkles' },
  { id: 'reward-jump-rope', points: '30', name: '跳绳挑战奖励', description: '完成运动挑战后领取。', type: '运动健康', icon: 'Dumbbell' },
  { id: 'reward-ball-game', points: '80', name: '球类活动', description: '安排一次球类运动。', type: '运动健康', icon: 'Dumbbell' },
  { id: 'reward-swimming', points: '300', name: '去游泳', description: '兑换一次游泳活动。', type: '运动健康', icon: 'Dumbbell' },
  { id: 'reward-sport-gear', points: '500', name: '运动装备', description: '挑一件运动小装备。', type: '运动健康', icon: 'Dumbbell' },
  { id: 'reward-origami', points: '30', name: '折纸材料', description: '领取一套折纸材料。', type: '创意手工', icon: 'Palette' },
  { id: 'reward-clay', points: '80', name: '黏土时间', description: '玩一次彩色黏土。', type: '创意手工', icon: 'Palette' },
  { id: 'reward-painting-set', points: '150', name: '画画材料', description: '补充一份画画材料。', type: '创意手工', icon: 'Palette' },
  { id: 'reward-diy-kit', points: '250', name: 'DIY 手工套装', description: '兑换一个完整手工套装。', type: '创意手工', icon: 'Palette' },
  { id: 'reward-zoo', points: '600', name: '动物园', description: '去动物园看喜欢的动物。', type: '旅行出游', icon: 'MapPinned' },
  { id: 'reward-aquarium', points: '800', name: '海洋馆', description: '安排一次海洋馆之旅。', type: '旅行出游', icon: 'MapPinned' },
  { id: 'reward-theme-park', points: '1500', name: '游乐园', description: '兑换一次游乐园计划。', type: '旅行出游', icon: 'MapPinned' },
  { id: 'reward-short-trip', points: '2500', name: '短途旅行', description: '攒够后安排一次短途出游。', type: '旅行出游', icon: 'MapPinned' },
  { id: 'reward-little-surprise', points: '30', name: '小惊喜', description: '领取一个家长准备的小惊喜。', type: '惊喜盲盒', icon: 'PackageOpen' },
  { id: 'reward-mystery-box', points: '100', name: '神秘盲盒', description: '不知道是什么，但一定很开心。', type: '惊喜盲盒', icon: 'PackageOpen' },
  { id: 'reward-lucky-draw', points: '80', name: '幸运抽奖', description: '从奖励盒里抽一次奖。', type: '惊喜盲盒', icon: 'PackageOpen' },
  { id: 'reward-big-gift', points: '500', name: '神秘大礼包', description: '兑换一份大惊喜。', type: '惊喜盲盒', icon: 'PackageOpen' },
  { id: 'reward-save-5', points: '50', name: '存入 5 元', description: '放进自己的储蓄罐。', type: '现金储蓄', icon: 'PiggyBank' },
  { id: 'reward-book-fund', points: '100', name: '买书基金', description: '攒到买书基金里。', type: '现金储蓄', icon: 'PiggyBank' },
  { id: 'reward-save-20', points: '200', name: '存入 20 元', description: '用于长期目标储蓄。', type: '现金储蓄', icon: 'PiggyBank' },
  { id: 'reward-money-plan', points: '300', name: '零花钱计划', description: '和家长一起制定使用计划。', type: '现金储蓄', icon: 'PiggyBank' },
  { id: 'reward-today-star', points: '10', name: '今日之星', description: '获得一次家庭表扬。', type: '荣誉成就', icon: 'Trophy' },
  { id: 'reward-progress-badge', points: '20', name: '进步徽章', description: '记录一次明显进步。', type: '荣誉成就', icon: 'Trophy' },
  { id: 'reward-certificate', points: '30', name: '成就证书', description: '打印或手写一张成就证书。', type: '荣誉成就', icon: 'Trophy' },
  { id: 'reward-honor-wall', points: '50', name: '家庭表扬墙', description: '把本周表现贴到表扬墙。', type: '荣誉成就', icon: 'Trophy' },
  { id: 'reward-custom-small', points: '50', name: '自定义小奖励', description: '家长临时设置的小奖励。', type: '自定义', icon: 'BadgePlus' },
  { id: 'reward-custom-medium', points: '200', name: '自定义大奖励', description: '留给家长自由安排。', type: '自定义', icon: 'BadgePlus' },
];

const REWARD_ICON_COMPONENTS = {
  BadgePlus,
  BookOpen,
  Cookie,
  Crown,
  Dumbbell,
  Gamepad2,
  Gift,
  HeartHandshake,
  MapPinned,
  PackageOpen,
  Palette,
  PenLine,
  PiggyBank,
  Sparkles,
  Trees,
  Trophy,
};

const LEGACY_REWARD_ICON_TYPES = {
  gift: '玩具礼物',
  star: '荣誉成就',
  medal: '荣誉成就',
  trophy: '荣誉成就',
  book: '图书阅读',
  pencil: '文具用品',
  toy: '玩具礼物',
  car: '玩具礼物',
  puzzle: '玩具礼物',
};

function normalizeStatus(status) {
  return STATUS[status] ? status : 'empty';
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

function rewardTypeMeta(type) {
  return REWARD_TYPES.find((item) => item.type === type) || REWARD_TYPES[REWARD_TYPES.length - 1];
}

function normalizeRewardConfig(config = DEFAULT_REWARDS) {
  const source = config?.length ? config : DEFAULT_REWARDS;
  return source.map((item, index) => {
    const type = item.type || LEGACY_REWARD_ICON_TYPES[item.icon] || '自定义';
    const meta = rewardTypeMeta(type);
    const icon = REWARD_ICON_COMPONENTS[item.icon] ? item.icon : meta.icon;
    return {
      id: item.id || `reward-${index}`,
      points: item.points ?? '',
      name: item.name ?? '',
      description: item.description ?? '',
      type: meta.type,
      icon,
    };
  });
}

function normalizePointConfig(config = {}) {
  return {
    excellent: Math.max(0, Number(config.excellent ?? DEFAULT_POINT_CONFIG.excellent)),
    super: Math.max(0, Number(config.super ?? DEFAULT_POINT_CONFIG.super)),
    habit: Math.max(0, Number(config.habit ?? DEFAULT_POINT_CONFIG.habit)),
    readingBook: Math.max(0, Number(config.readingBook ?? DEFAULT_POINT_CONFIG.readingBook)),
  };
}

function normalizeProfile(value = {}) {
  const gender = PROFILE_GENDERS.includes(value.gender) ? value.gender : DEFAULT_PROFILE.gender;
  const grade = PROFILE_GRADES.includes(value.grade) ? value.grade : (value.grade || DEFAULT_PROFILE.grade);
  const avatarData = typeof value.avatarData === 'string' && value.avatarData.startsWith('data:image/') ? value.avatarData : '';
  const avatarHistory = Array.from(new Set([
    avatarData,
    ...((value.avatarHistory || []).filter((item) => typeof item === 'string' && item.startsWith('data:image/'))),
  ].filter(Boolean))).slice(0, 3);
  return {
    ...DEFAULT_PROFILE,
    ...(value || {}),
    avatarData,
    avatarHistory,
    name: String(value.name || DEFAULT_PROFILE.name).trim(),
    gender,
    birthday: String(value.birthday || ''),
    school: String(value.school || '').trim(),
    grade,
  };
}

function upgradeLegacyReadingRewardPoints(state) {
  const targetPoints = normalizePointConfig(state.pointConfig).readingBook;
  const upgradeBook = (book) => {
    if (Number(book.rewardPoints) === 10) book.rewardPoints = targetPoints;
    return book;
  };
  state.months = (state.months || []).map((month) => ({
    ...month,
    readingBooks: (month.readingBooks || []).map((book) => upgradeBook({ ...book })),
  }));
  state.libraryBooks = (state.libraryBooks || []).map((book) => upgradeBook({ ...book }));
  state.readingRewardVersion = READING_REWARD_VERSION;
  return state;
}

function statusPoints(status, pointConfig = DEFAULT_POINT_CONFIG) {
  if (status === 'excellent') return Number(pointConfig.excellent ?? DEFAULT_POINT_CONFIG.excellent);
  if (status === 'super') return Number(pointConfig.super ?? DEFAULT_POINT_CONFIG.super);
  return STATUS[status]?.points || 0;
}

function habitPoints(value, pointConfig = DEFAULT_POINT_CONFIG) {
  if (value === undefined || value === null || value === '') return Number(pointConfig.habit ?? DEFAULT_POINT_CONFIG.habit);
  return Math.max(0, Number(value || 0));
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
  const savedScope = localStorage.getItem(READING_SCOPE_STORAGE_KEY) || localStorage.getItem(LEGACY_READING_SCOPE_STORAGE_KEY);
  return savedScope === 'library' ? 'library' : 'month';
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
        ...(subject.name === '好习惯' ? { habitPoints: DEFAULT_HABIT_POINTS } : {}),
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
      rewardPoints: DEFAULT_READING_REWARD_POINTS,
    }));
    return nextMonth;
  });
}

function createSummerTemplate(months = createDefaultMonths()) {
  return createTaskTemplate(months[0], '7-8月暑假模板', 'template-summer-2026');
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
      rewardPoints: Number(book.rewardPoints || DEFAULT_READING_REWARD_POINTS),
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
        rewardPoints: Number(book.rewardPoints || DEFAULT_READING_REWARD_POINTS),
        addedAt: book.addedAt || `${month.key || month.id}-01`,
      });
    });
  });
  if (!books.length) {
    (state.books || DEFAULT_BOOKS).forEach((name, index) => {
      books.push({ id: `library-default-${index}`, name, type: '其它', totalPages: '', rewardPoints: DEFAULT_READING_REWARD_POINTS });
    });
  }
  return normalizeLibraryBooks(books);
}

function readingCategoryFor(month) {
  const existing = month.categories.find((category) => category.name === '阅读');
  if (existing) return existing;
  return { id: 'cat-reading', name: '阅读', color: 'purple', badge: '阅', tasks: [] };
}

function taskDisplayType(task) {
  if (task?.bookId) return 'reading';
  return task?.type || 'daily';
}

function taskSortGroup(task) {
  const type = taskDisplayType(task);
  if (type === 'daily') return 0;
  if (type === 'temporary') return 2;
  return 1;
}

function temporaryTaskIndex(task, fallback = 0) {
  return Math.max(1, Number(task?.temporaryIndex || fallback || 1));
}

function createTemporaryTask(slot, monthDays) {
  return {
    id: createId('temp-task'),
    title: TEMPORARY_TASK_TITLE,
    type: 'temporary',
    temporaryIndex: slot,
    startDay: 1,
    endDay: monthDays,
    checkMode: 'daily',
    importance: 'normal',
  };
}

function formatTemporaryTaskNote(content, remark) {
  const title = String(content || '').trim();
  const detail = String(remark || '').trim();
  if (title && detail) return `${title}｜${detail}`;
  return title || detail;
}

function temporaryTaskTitleFromNote(note) {
  if (typeof note !== 'string') return '';
  return note.split('｜')[0]?.trim() || '';
}

function temporaryTaskDisplayTitle(month, taskId, preferredDay) {
  const notes = month?.notes?.[taskId] || {};
  const preferredTitle = temporaryTaskTitleFromNote(notes[preferredDay]);
  if (preferredTitle) return preferredTitle;
  const firstRecordedDay = Object.keys(notes)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .find((day) => temporaryTaskTitleFromNote(notes[day]));
  return temporaryTaskTitleFromNote(notes[firstRecordedDay]) || TEMPORARY_TASK_TITLE;
}

function temporaryTaskRemarkFromNote(note) {
  if (typeof note !== 'string') return '';
  const parts = note.split('｜');
  return parts.length > 1 ? parts.slice(1).join('｜').trim() : '';
}

function temporaryTaskRemarkInputFromNote(note) {
  if (typeof note !== 'string') return '';
  const parts = note.split('｜');
  return parts.length > 1 ? parts.slice(1).join('｜') : '';
}

function formatTemporaryTaskMonthNote(note) {
  const title = temporaryTaskTitleFromNote(note);
  const remark = temporaryTaskRemarkFromNote(note);
  if (!title && !remark) return '';
  return [
    `任务内容：${title || '未填写'}`,
    `备注信息：${remark || '无'}`,
  ].join('\n');
}

function temporaryDraftKey(monthId, categoryId, day) {
  return `${monthId || 'month'}-${categoryId || 'category'}-${day || 'day'}`;
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
    const tasks = (subject.tasks || [])
      .map((task, index) => ({ task, index }))
      .sort((a, b) => {
        const groupDiff = taskSortGroup(a.task) - taskSortGroup(b.task);
        if (groupDiff !== 0) return groupDiff;
        const aType = taskDisplayType(a.task);
        const bType = taskDisplayType(b.task);
        if (aType === 'temporary' && bType === 'temporary') {
          const slotDiff = temporaryTaskIndex(a.task, a.index + 1) - temporaryTaskIndex(b.task, b.index + 1);
          if (slotDiff !== 0) return slotDiff;
        }
        if (taskSortGroup(a.task) === 1 && taskSortGroup(b.task) === 1) {
          const startDiff = Number(a.task.startDay || 1) - Number(b.task.startDay || 1);
          if (startDiff !== 0) return startDiff;
        }
        return a.index - b.index;
      })
      .map(({ task }) => task);
    const subjectRowSpan = Math.max(1, tasks.length);
    let isFirstSubjectRow = true;

    return tasks.map((task, itemIndex) => {
        const linkedBook = task.bookId ? month.readingBooks?.find((book) => book.id === task.bookId) : null;
        const effectiveType = linkedBook ? 'reading' : task.type;
        const typeLabel = effectiveType === 'temporary' ? '当日任务' : effectiveType === 'stage' || effectiveType === 'reading' ? '阶段任务' : '每日固定';
        const taskRow = {
          id: linkedBook?.id || task.id,
          categoryId: subject.id,
          subject: subject.name,
          color: subject.color,
          badge: subject.badge,
          subjectRowSpan,
          firstSubjectRow: isFirstSubjectRow,
          type: typeLabel,
          typeKey: effectiveType,
          typeRowSpan: 1,
          firstTypeRow: true,
          item: linkedBook ? `${linkedBook.name}（读完奖励 +${Number(linkedBook.rewardPoints || DEFAULT_READING_REWARD_POINTS)}分）` : effectiveType === 'temporary' ? TEMPORARY_TASK_TITLE : task.title || '未命名任务',
          task,
          book: linkedBook,
          startDay: Number(task.startDay || 1),
          endDay: Number(task.endDay || month.days),
          checkMode: task.checkMode || 'daily',
          importance: task.importance || 'normal',
          habitPoints: habitPoints(task.habitPoints),
        };
        isFirstSubjectRow = false;
        return taskRow;
      });
  });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
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

function isTextEditingElement(element) {
  return Boolean(element?.matches?.([
    'textarea',
    'input:not([type])',
    'input[type="text"]',
    'input[type="search"]',
    'input[type="email"]',
    'input[type="number"]',
    'input[type="date"]',
    'input[type="password"]',
    'input[type="url"]',
    'input[type="tel"]',
    '[contenteditable="true"]',
  ].join(',')));
}

async function saveDatabaseState(state, expectedVersion, clientId) {
  const response = await fetch(API_STATE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state: createLocalCacheState(state),
      expectedVersion,
      clientId,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || '保存数据库失败');
    error.code = payload.code || '';
    error.currentVersion = payload.currentVersion;
    throw error;
  }
  return payload;
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

function loadBrowserImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('原题图片读取失败'));
    image.src = source;
  });
}

function cropQuestionImage(image, rawArea) {
  const area = normalizePercentArea(rawArea);
  if (!area) return '';
  const left = Math.max(0, area.left - 5);
  const top = Math.max(0, area.top - 4);
  const right = Math.min(100, area.left + area.width + 20);
  const bottom = Math.min(100, area.top + area.height + 0.6);
  const sourceX = Math.round(image.naturalWidth * left / 100);
  const sourceY = Math.round(image.naturalHeight * top / 100);
  const sourceWidth = Math.max(1, Math.round(image.naturalWidth * (right - left) / 100));
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight * (bottom - top) / 100));
  const scale = Math.min(1, 1200 / sourceWidth, 800 / sourceHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(16, Math.round(sourceWidth * scale));
  canvas.height = Math.max(16, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

async function uploadMistakeQuestionImage(imageData) {
  const response = await fetch(API_MISTAKE_IMAGES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url) throw new Error(payload.error || '原题截图保存失败');
  return payload.url;
}

async function attachQuestionImages(sourceImageData, mistakes) {
  if (!sourceImageData || !mistakes.some((mistake) => !mistake.questionImageUrl && (mistake.cropArea || mistake.area))) return mistakes;
  let image;
  try {
    image = await loadBrowserImage(sourceImageData);
  } catch {
    return mistakes;
  }
  return Promise.all(mistakes.map(async (mistake) => {
    const cropArea = mistake.cropArea || mistake.area;
    if (mistake.questionImageUrl || !cropArea) return mistake;
    try {
      const crop = cropQuestionImage(image, cropArea);
      if (!crop) return mistake;
      return { ...mistake, questionImageUrl: await uploadMistakeQuestionImage(crop) };
    } catch {
      return mistake;
    }
  }));
}

function sanitizeLoadedState(saved) {
  const next = structuredClone(saved);
  if (!next.months) {
    return migrateLegacyState(next);
  }
  next.months = next.months.map(normalizeMonth);
  next.templates = (next.templates || [])
    .map((template) => createTaskTemplate(template, template.name, template.id || createId('template')));
  if (next.rewardCatalogVersion !== REWARD_CATALOG_VERSION) {
    next.rewardConfig = normalizeRewardConfig(mergeCatalogItems(
      DEFAULT_REWARDS,
      normalizeRewardConfig(next.rewardConfig || []),
    ));
    next.rewardCatalogVersion = REWARD_CATALOG_VERSION;
  } else {
    next.rewardConfig = normalizeRewardConfig(next.rewardConfig || DEFAULT_REWARDS);
  }
  next.pointConfig = normalizePointConfig(next.pointConfig);
  next.profile = normalizeProfile(next.profile);
  if (next.readingRewardVersion !== READING_REWARD_VERSION) {
    upgradeLegacyReadingRewardPoints(next);
  }
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
    rewardConfig: normalizeRewardConfig(current.rewardConfig || DEFAULT_REWARDS),
    rewardCatalogVersion: current.rewardCatalogVersion || REWARD_CATALOG_VERSION,
    pointConfig: normalizePointConfig(current.pointConfig),
    readingRewardVersion: current.readingRewardVersion || READING_REWARD_VERSION,
    profile: normalizeProfile(current.profile),
    libraryBooks: normalizeLibraryBooks(current.libraryBooks || []),
    bookTypes: normalizeBookTypes(current.bookTypes),
    learningTools: normalizeLearningTools(current.learningTools),
    snapshots: [],
  };
}

function databaseStateFingerprint(current) {
  return JSON.stringify(createLocalCacheState(current));
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
      subjectConfidence: ['高', '中', '低'].includes(review.subjectConfidence) ? review.subjectConfidence : '',
      detectedTitle: review.detectedTitle || '',
      recognizedQuestionCount: Number(review.recognizedQuestionCount || 0),
      uncertainQuestionCount: Number(review.uncertainQuestionCount || 0),
      annotationQuality: ['precise', 'approximate', 'none'].includes(review.annotationQuality)
        ? review.annotationQuality
        : normalizeReviewAnnotations(review.imageAnnotations).length ? 'approximate' : 'none',
      gradingWarning: review.gradingWarning || '',
      localizationWarning: review.localizationWarning || '',
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
  const mastered = Boolean(mistake.mastered);
  return {
    id: mistake.id || createId('mistake'),
    reviewId: mistake.reviewId || '',
    term: mistake.term || '二年级上学期',
    subject: LEARNING_SUBJECTS.includes(mistake.subject) ? mistake.subject : fallbackSubject,
    isWrong: mistake.isWrong !== false,
    order: Number(mistake.order || 0),
    questionNumber: String(mistake.questionNumber || mistake.printedNumber || ''),
    question: String(mistake.question || '未命名错题').trim(),
    answer: mistake.answer || '',
    correctAnswer: mistake.correctAnswer || '',
    shortComment: mistake.shortComment || '',
    errorReason: mistake.errorReason || mistake.shortComment || '',
    knowledgePoint: normalizeMistakeKnowledgePoint(mistake.knowledgePoint),
    errorType: normalizeMistakeErrorType(mistake.errorType),
    reviewDecision: normalizeReviewMistakeDecision(mistake.reviewDecision),
    solutionSteps: normalizeSolutionSteps(mistake.solutionSteps, mistake.explanation),
    explanation: mistake.explanation || '',
    questionImageUrl: mistake.questionImageUrl || '',
    area: normalizePercentArea(mistake.area),
    cropArea: normalizePercentArea(mistake.cropArea),
    sourceTitle: mistake.sourceTitle || 'AI作业批改',
    createdAt: mistake.createdAt || new Date().toISOString(),
    mastered,
    archivedAt: mastered ? (mistake.archivedAt || '') : '',
  };
}

function normalizePercentArea(rawArea = {}) {
  const area = Array.isArray(rawArea)
    ? { left: rawArea[0], top: rawArea[1], width: rawArea[2], height: rawArea[3] }
    : rawArea;
  const leftValue = Number(area?.left);
  const topValue = Number(area?.top);
  const widthValue = Number(area?.width);
  const heightValue = Number(area?.height);
  if (![leftValue, topValue, widthValue, heightValue].every(Number.isFinite) || widthValue <= 0 || heightValue <= 0) return null;
  const left = Math.max(0, Math.min(99, leftValue));
  const top = Math.max(0, Math.min(99, topValue));
  return {
    left,
    top,
    width: Math.max(1, Math.min(100 - left, widthValue)),
    height: Math.max(1, Math.min(100 - top, heightValue)),
  };
}

function normalizeReviewAnnotations(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const area = normalizePercentArea(item?.area);
      if (!area) return null;
      const status = item.status === 'wrong' ? 'wrong' : item.status === 'correct' ? 'correct' : 'pending';
      return {
        order: Number(item.order || index + 1),
        questionNumber: String(item.questionNumber || item.printedNumber || item.order || index + 1),
        status,
        label: item.label || (status === 'correct' ? '✓' : status === 'wrong' ? '错' : String(item.order || index + 1)),
        comment: String(item.comment || '').trim(),
        correctAnswer: String(item.correctAnswer || '').trim(),
        area,
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
      questionNumber: String(mistake.questionNumber || order),
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

function normalizeSolutionSteps(value, fallback = '') {
  const items = Array.isArray(value) ? value : [];
  const normalized = items
    .map((item) => String(item || '').trim().replace(/^(?:步骤\s*)?(?:\d{1,2}\.\s+|\d{1,2}\s*[、:：）)]\s*|[（(]\d{1,2}[）)]\s*)/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
  if (normalized.length) return normalized;
  const fallbackText = String(fallback || '').trim();
  return fallbackText ? [fallbackText] : [];
}

function questionNumberKey(text = '') {
  const value = String(text || '').trim();
  return value.toLowerCase().replace(/\s+/g, '').slice(0, 180);
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
  if (!config.deepseek?.configured) return 'DeepSeek 未配置，暂时无法进行 AI 批改';
  const sourceLabel = config.deepseek.keySource === 'file'
    ? '本机密钥文件'
    : config.deepseek.keySource === 'environment'
      ? '服务器环境变量'
      : '已保存密钥';
  return `当前启用：DeepSeek Vision（${sourceLabel}）`;
}

function aiConfigDraftFromPublic(config = {}) {
  return {
    ...DEFAULT_AI_CONFIG_DRAFT,
    ...config,
    activeProvider: 'deepseek',
    deepseek: { ...DEFAULT_AI_CONFIG_DRAFT.deepseek, ...(config.deepseek || {}), apiKey: '' },
  };
}

function homeworkGradingStatusText(stage = '', seconds = 0) {
  const stageText = {
    queued: '正在等待批改',
    vision: '正在识别题目',
    grading: '正在逐题判分并生成解析',
    localization: '正在精确定位错题',
    cancelling: '正在取消批改',
  }[stage];
  if (stageText) return stageText;
  if (seconds < 15) return '正在识别题目';
  if (seconds < 40) return '正在核对学生答案';
  return '正在逐题生成解析';
}

function waitForRequest(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    };
    const timer = window.setTimeout(finish, milliseconds);
    const cancel = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      const error = new Error('批改已取消');
      error.name = 'AbortError';
      reject(error);
    };
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
  });
}

async function readJsonResponse(response) {
  const responseText = await response.text();
  if (!responseText) throw new Error('批改服务连接中断，请重新点击生成批改结果');
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error('AI 返回格式异常，请重新批改');
  }
}

async function fetchWithRequestTimeout(url, options = {}, timeoutMs = 20000) {
  const timeoutController = new AbortController();
  const callerSignal = options.signal;
  let timedOut = false;
  const abortFromCaller = () => timeoutController.abort();
  if (callerSignal?.aborted) timeoutController.abort();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timer = window.setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, timeoutMs);
  try {
    return await fetch(url, { ...options, signal: timeoutController.signal });
  } catch (error) {
    if (timedOut && !callerSignal?.aborted) {
      const timeoutError = new Error('网络请求超时');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}

function formatMistakeDate(value = '') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未记录';
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
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
      const normalizedType = selectedBook ? 'stage' : task.type === 'temporary' ? 'temporary' : task.type || 'daily';
      const normalizedTask = {
        id: task.id || createId('task'),
        title: normalizedType === 'temporary' ? TEMPORARY_TASK_TITLE : selectedBook?.name || task.title || '',
        type: normalizedType,
        startDay: Math.max(1, Math.min(normalized.days, Number(task.startDay || 1))),
        endDay: Math.max(1, Math.min(normalized.days, Number(task.endDay || normalized.days))),
        checkMode: normalizedType === 'stage' ? task.checkMode || 'daily' : 'daily',
        importance: task.importance === 'important' ? 'important' : 'normal',
        ...(selectedBook ? { bookId: selectedBook.id, checkMode: task.checkMode || 'daily' } : {}),
        ...(normalizedType === 'temporary' ? { temporaryIndex: temporaryTaskIndex(task) } : {}),
      };
      if (category.name === '好习惯') normalizedTask.habitPoints = habitPoints(task.habitPoints);
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
    rewardPoints: Number(book.rewardPoints || DEFAULT_READING_REWARD_POINTS),
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
      rewardPoints: DEFAULT_READING_REWARD_POINTS,
    }));
    nextMonth.checks = structuredClone(saved.checks?.[legacyMonth.key] || {});
    return nextMonth;
  });
  return {
    ...saved,
    months,
    templates: saved.templates?.length ? saved.templates : [createSummerTemplate(months)],
    activeMonthId: months[0]?.id,
    snapshots: [],
    rewardConfig: DEFAULT_REWARDS,
    rewardCatalogVersion: REWARD_CATALOG_VERSION,
    pointConfig: DEFAULT_POINT_CONFIG,
    readingRewardVersion: READING_REWARD_VERSION,
    profile: DEFAULT_PROFILE,
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
    rewardCatalogVersion: REWARD_CATALOG_VERSION,
    pointConfig: DEFAULT_POINT_CONFIG,
    readingRewardVersion: READING_REWARD_VERSION,
    profile: DEFAULT_PROFILE,
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
  if (row.typeKey === 'daily' || row.typeKey === 'temporary') return true;
  return day >= Number(row.startDay || 1) && day <= Number(row.endDay || 31);
}

function isTaskCheckableOnDay(row, day) {
  if (!isTaskActiveOnDay(row, day)) return false;
  return true;
}

function taskCheckDayForToday(row, day) {
  if (!row || !isTaskActiveOnDay(row, day)) return null;
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

function excelEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function excelSheetName(value) {
  return String(value || 'Sheet')
    .replace(/[\\/?*[\]:]/g, ' ')
    .slice(0, 31)
    .trim() || 'Sheet';
}

function formatExportDate(month, day) {
  return `${month.year}-${String(month.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function exportStatusLabel(status) {
  return status === 'empty' ? '未完成' : STATUS.done.label;
}

function exportQualityLabel(status) {
  if (status === 'done') return '普通';
  if (status === 'excellent') return STATUS.excellent.label;
  if (status === 'super') return STATUS.super.label;
  return '';
}

function chunkByCalendarWeek(items, month) {
  return items.reduce((weeks, item) => {
    if (!weeks.length) weeks.push([]);
    weeks[weeks.length - 1].push(item);
    const dayOfWeek = new Date(Number(month.year), Number(month.month) - 1, item.day).getDay();
    if (dayOfWeek === 0) weeks.push([]);
    return weeks;
  }, []).filter((week) => week.length);
}

function completedReadingRewards(month, pointConfig = DEFAULT_POINT_CONFIG) {
  return (month.readingBooks || []).reduce((sum, book) => {
    const start = Number(book.startDay || 1);
    const end = Number(book.endDay || month.days);
    const isComplete = book.checkMode === 'stage'
      ? normalizeStatus(month.checks?.[book.id]?.[start] || 'empty') !== 'empty'
      : Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
        .every((day) => normalizeStatus(month.checks?.[book.id]?.[day] || 'empty') !== 'empty');
    return sum + (isComplete && month.claimedReadingRewards?.[book.id] ? Number(book.rewardPoints || pointConfig.readingBook) : 0);
  }, 0);
}

function completedReadingRewardsThroughDay(month, day, pointConfig = DEFAULT_POINT_CONFIG) {
  return (month.readingBooks || []).reduce((sum, book) => {
    const start = Number(book.startDay || 1);
    const end = Number(book.endDay || month.days);
    if (day < end) return sum;
    const isComplete = book.checkMode === 'stage'
      ? normalizeStatus(month.checks?.[book.id]?.[start] || 'empty') !== 'empty'
      : Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
        .every((checkDay) => normalizeStatus(month.checks?.[book.id]?.[checkDay] || 'empty') !== 'empty');
    return sum + (isComplete && month.claimedReadingRewards?.[book.id] ? Number(book.rewardPoints || pointConfig.readingBook) : 0);
  }, 0);
}

function readingBookStats(month, book, pointConfig = DEFAULT_POINT_CONFIG) {
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
    rewardPoints: Number(book.rewardPoints || pointConfig.readingBook),
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
  const monthIndexRef = useRef(monthIndex);
  const avatarInputRef = useRef(null);
  const loadingFromDatabase = useRef(true);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState('正在连接数据库...');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const [saveToast, setSaveToast] = useState(null);
  const localSaveTimerRef = useRef(null);
  const databaseSaveTimerRef = useRef(null);
  const databaseVersionRef = useRef(0);
  const currentStateFingerprint = useMemo(() => databaseStateFingerprint(state), [state]);
  const currentStateFingerprintRef = useRef(currentStateFingerprint);
  const lastSavedStateFingerprintRef = useRef('');
  const databaseWriteChainRef = useRef(Promise.resolve());
  const databaseSyncRequestRef = useRef(null);
  const syncClientIdRef = useRef(globalThis.crypto?.randomUUID?.() || `client-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const saveAfterTextBlurRef = useRef(false);
  const saveToastTimerRef = useRef(null);
  const manualSavePendingRef = useRef(false);
  currentStateFingerprintRef.current = currentStateFingerprint;
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
  const [newMonthDialog, setNewMonthDialog] = useState(null);
  const [templateManagerDialog, setTemplateManagerDialog] = useState(null);
  const [bookTypesDialog, setBookTypesDialog] = useState(null);
  const [bookPagesDialog, setBookPagesDialog] = useState(null);
  const [profileDialog, setProfileDialog] = useState(null);
  const [newRewardDialog, setNewRewardDialog] = useState(null);
  const [pointConfigDialog, setPointConfigDialog] = useState(null);
  const [rewardTypeFilter, setRewardTypeFilter] = useState('全部');
  const [expandedReadingPlans, setExpandedReadingPlans] = useState({});
  const [temporaryTaskDrafts, setTemporaryTaskDrafts] = useState({});
  const [selectedTodayDay, setSelectedTodayDay] = useState(null);
  const [monthExportStatusFilter, setMonthExportStatusFilter] = useState('all');
  const [monthExportDialog, setMonthExportDialog] = useState(null);
  const [learningTab, setLearningTab] = useState('grader');
  const [graderDraft, setGraderDraft] = useState(DEFAULT_GRADER_DRAFT);
  const [latestReview, setLatestReview] = useState(null);
  const [showPreviousReview, setShowPreviousReview] = useState(true);
  const [reviewMistakeActionId, setReviewMistakeActionId] = useState('');
  const reviewMistakeActionRef = useRef('');
  const [isGradingHomework, setIsGradingHomework] = useState(false);
  const [gradingElapsedSeconds, setGradingElapsedSeconds] = useState(0);
  const [gradingStage, setGradingStage] = useState('');
  const [isPreparingHomeworkImage, setIsPreparingHomeworkImage] = useState(false);
  const [gradingError, setGradingError] = useState('');
  const homeworkImageRef = useRef(DEFAULT_GRADER_DRAFT.imageData);
  const homeworkDetailImagesRef = useRef([]);
  const homeworkLocalizationImageRef = useRef('');
  const gradingRequestRef = useRef(null);
  const gradingRequestIdRef = useRef('');
  const [aiConfigDraft, setAiConfigDraft] = useState(DEFAULT_AI_CONFIG_DRAFT);
  const [aiConfigDialogOpen, setAiConfigDialogOpen] = useState(false);
  const [aiConfigStatus, setAiConfigStatus] = useState('未读取 AI 配置');
  const [mistakePage, setMistakePage] = useState('active');
  const [mistakeTermFilter, setMistakeTermFilter] = useState('二年级上学期');
  const [mistakeSubjectFilter, setMistakeSubjectFilter] = useState('全部');
  const [mistakeKnowledgeFilter, setMistakeKnowledgeFilter] = useState('全部知识点');
  const [mistakeErrorFilter, setMistakeErrorFilter] = useState('全部错误类型');
  const [mistakeSourceFilter, setMistakeSourceFilter] = useState('全部来源');
  const [mistakeSearch, setMistakeSearch] = useState('');
  const [mistakeSort, setMistakeSort] = useState('newest');
  const [selectedMistakeId, setSelectedMistakeId] = useState('');
  const [mistakeVisibleLimit, setMistakeVisibleLimit] = useState(MISTAKE_PAGE_SIZE);
  const [mistakeFiltersOpen, setMistakeFiltersOpen] = useState(false);
  const [mistakeDetailOpen, setMistakeDetailOpen] = useState(false);
  const [mistakeMetadataDraft, setMistakeMetadataDraft] = useState(null);
  const [archiveUndo, setArchiveUndo] = useState(null);
  const archiveUndoTimerRef = useRef(null);
  const mistakeArchiveOperationRef = useRef(new Map());
  const [expandedTodayStageTasks, setExpandedTodayStageTasks] = useState({});
  const [expandedTodayNotes, setExpandedTodayNotes] = useState({});
  const [collapsedTodaySubjects, setCollapsedTodaySubjects] = useState({});
  const [todayFocusTaskId, setTodayFocusTaskId] = useState('');
  const [settingsFocusCategory, setSettingsFocusCategory] = useState('');
  const [isBackfillMode, setIsBackfillMode] = useState(false);
  const [appDialog, setAppDialog] = useState(null);
  const [saveScheduleRevision, setSaveScheduleRevision] = useState(0);
  const appDialogResolverRef = useRef(null);
  const months = useMemo(() => (state.months?.length ? state.months.map(normalizeMonth) : createDefaultMonths()), [state.months]);
  monthIndexRef.current = monthIndex;
  const month = months[Math.min(monthIndex, months.length - 1)] || months[0];
  const profile = normalizeProfile(state.profile);
  const pointConfig = useMemo(() => normalizePointConfig(state.pointConfig), [state.pointConfig]);
  const rewardConfig = useMemo(() => sortRewardsByPoints(normalizeRewardConfig(state.rewardConfig || DEFAULT_REWARDS)), [state.rewardConfig]);
  const pointRules = useMemo(() => [
    { status: 'done', label: '已完成', score: '0分', note: '任务完成，打勾记录，不额外加积分。' },
    { status: 'excellent', label: '优秀', score: `+${pointConfig.excellent}分`, note: `完成质量好，奖励${pointConfig.excellent}个积分。` },
    { status: 'super', label: '非常优秀', score: `+${pointConfig.super}分`, note: `完成质量非常棒，奖励${pointConfig.super}个积分。` },
  ], [pointConfig]);
  const pointRuleDetails = useMemo(() => [
    {
      title: '普通学习任务',
      badge: '打卡',
      score: `0 / +${pointConfig.excellent} / +${pointConfig.super}`,
      note: `语文、数学、英语、阅读等普通任务有三种有效状态：已完成只记录进度不加分；优秀 +${pointConfig.excellent} 分；非常优秀 +${pointConfig.super} 分。`,
    },
    {
      title: '好习惯任务',
      badge: '习惯',
      score: '完成即加分',
      note: `好习惯不区分优秀等级，只要当天完成，就按该习惯设置的积分计入本月积分；默认每项 +${pointConfig.habit} 分。`,
    },
    {
      title: '阅读奖励',
      badge: '阅读',
      score: '领取后计入',
      note: `书本达到阅读计划后，需要在阅读页领取读完奖励；新建书单默认 +${pointConfig.readingBook} 分。领取后才会加入本月积分和可用积分。`,
    },
    POINT_RULE_DETAILS[3],
    POINT_RULE_DETAILS[4],
  ], [pointConfig]);

  const openAppDialog = (config) => new Promise((resolve) => {
    appDialogResolverRef.current = resolve;
    setAppDialog({
      variant: 'alert',
      tone: 'primary',
      title: '提示',
      message: '',
      confirmText: '知道了',
      cancelText: '取消',
      inputValue: '',
      ...config,
    });
  });

  const showAppAlert = (message, options = {}) => openAppDialog({
    variant: 'alert',
    title: '提示',
    confirmText: '知道了',
    message,
    ...options,
  });

  const showAppConfirm = (message, options = {}) => openAppDialog({
    variant: 'confirm',
    title: '确认操作',
    confirmText: '确定',
    cancelText: '取消',
    message,
    ...options,
  });

  const showAppPrompt = (message, defaultValue = '', options = {}) => openAppDialog({
    variant: 'prompt',
    title: '填写信息',
    confirmText: '确定',
    cancelText: '取消',
    message,
    inputValue: defaultValue,
    ...options,
  });

  const closeAppDialog = (confirmed) => {
    const dialog = appDialog;
    const resolver = appDialogResolverRef.current;
    appDialogResolverRef.current = null;
    setAppDialog(null);
    if (!resolver || !dialog) return;
    if (dialog.variant === 'prompt') {
      resolver(confirmed ? dialog.inputValue : null);
      return;
    }
    resolver(Boolean(confirmed));
  };
  const rewardTypeCounts = useMemo(() => rewardConfig.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {}), [rewardConfig]);
  const displayedRewards = useMemo(
    () => (rewardTypeFilter === '全部' ? rewardConfig : rewardConfig.filter((item) => item.type === rewardTypeFilter)),
    [rewardConfig, rewardTypeFilter],
  );
  const learningTools = useMemo(() => normalizeLearningTools(state.learningTools), [state.learningTools]);
  const libraryBooks = useMemo(() => normalizeLibraryBooks(state.libraryBooks || collectLibraryBooks({ ...state, months })), [state.libraryBooks, months]);
  const bookTypes = useMemo(() => normalizeBookTypes(state.bookTypes), [state.bookTypes]);
  const homeworkReviews = learningTools.reviews;
  const displayHomeworkReview = latestReview || (showPreviousReview ? homeworkReviews[0] : null);
  const mistakeItems = learningTools.mistakes;
  const books = useMemo(() => month.readingBooks?.map((book) => book.name) || state.books || DEFAULT_BOOKS, [month.readingBooks, state.books]);
  const reminders = useMemo(() => state.reminders || DEFAULT_REMINDERS, [state.reminders]);
  const showSaveToast = (message, type = 'success') => {
    setSaveToast({ message, type });
    if (saveToastTimerRef.current) window.clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = window.setTimeout(() => setSaveToast(null), 2200);
  };

  const markUnsavedChanges = (value) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChanges(value);
  };

  const applyDatabasePayload = (payload, { notify = false } = {}) => {
    if (!payload.state?.months && !payload.state?.checks) return false;
    const selectedMonthId = stateRef.current?.months?.[monthIndexRef.current]?.id;
    const loadedState = sanitizeLoadedState(payload.state);
    const selectedMonthIndex = loadedState.months?.findIndex((item) => item.id === selectedMonthId) ?? -1;

    loadingFromDatabase.current = true;
    if (databaseSaveTimerRef.current) {
      window.clearTimeout(databaseSaveTimerRef.current);
      databaseSaveTimerRef.current = null;
    }
    stateRef.current = loadedState;
    const loadedStateFingerprint = databaseStateFingerprint(loadedState);
    currentStateFingerprintRef.current = loadedStateFingerprint;
    lastSavedStateFingerprintRef.current = loadedStateFingerprint;
    databaseVersionRef.current = Number(payload.version || 0);
    setState(loadedState);
    setMonthIndex(selectedMonthIndex >= 0 ? selectedMonthIndex : findCurrentMonthIndex(loadedState.months || []));
    markUnsavedChanges(false);
    setDatabaseStatus(notify ? '已同步其他设备的最新修改' : '已连接 SQLite');
    if (notify) showSaveToast('已同步其他设备的最新修改');
    window.setTimeout(() => {
      loadingFromDatabase.current = false;
    }, 0);
    return true;
  };

  const syncDatabaseState = () => {
    if (databaseSyncRequestRef.current) return databaseSyncRequestRef.current;
    const operation = fetchDatabaseState()
      .then((payload) => {
        if (Number(payload.version || 0) <= databaseVersionRef.current) return false;
        if (hasUnsavedChangesRef.current || manualSavePendingRef.current) {
          setDatabaseStatus('另一个页面或设备有新修改，当前操作尚未保存');
          showSaveToast('服务器数据已变化，请先处理当前未保存内容', 'error');
          return false;
        }
        return applyDatabasePayload(payload, { notify: true });
      })
      .finally(() => {
        if (databaseSyncRequestRef.current === operation) databaseSyncRequestRef.current = null;
      });
    databaseSyncRequestRef.current = operation;
    return operation;
  };

  const queueDatabaseSave = (nextState) => {
    const stateSnapshot = structuredClone(createLocalCacheState(nextState));
    const savedFingerprint = JSON.stringify(stateSnapshot);
    const operation = databaseWriteChainRef.current
      .catch(() => undefined)
      .then(async () => {
        if (savedFingerprint === lastSavedStateFingerprintRef.current) {
          return {
            ok: true,
            version: databaseVersionRef.current,
            skipped: true,
            savedFingerprint,
          };
        }
        const payload = await saveDatabaseState(stateSnapshot, databaseVersionRef.current, syncClientIdRef.current);
        databaseVersionRef.current = Number(payload.version || 0);
        lastSavedStateFingerprintRef.current = savedFingerprint;
        return { ...payload, savedFingerprint };
      });
    databaseWriteChainRef.current = operation;
    return operation;
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
      markUnsavedChanges(true);
      setDatabaseStatus('本月打卡有未保存修改，请点击保存');
      if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
      return () => {
        if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
        if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
      };
    }
    markUnsavedChanges(true);
    if (isTextEditingElement(document.activeElement) && !saveAfterTextBlurRef.current) {
      setDatabaseStatus('正在编辑，离开输入框后自动保存');
      if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
      return () => {
        if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
        if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
      };
    }
    const saveDelay = saveAfterTextBlurRef.current ? 0 : 1500;
    saveAfterTextBlurRef.current = false;
    setDatabaseStatus('有未保存修改，正在自动保存...');
    if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
    databaseSaveTimerRef.current = window.setTimeout(async () => {
      try {
        const result = await queueDatabaseSave(stateRef.current);
        if (currentStateFingerprintRef.current === result.savedFingerprint) {
          markUnsavedChanges(false);
          setDatabaseStatus('已自动保存到数据库');
          if (!result.skipped) showSaveToast('已保存到数据库');
        } else {
          markUnsavedChanges(true);
          setDatabaseStatus('检测到新的修改，正在继续保存...');
        }
      } catch (error) {
        const conflict = error?.code === 'STATE_CONFLICT';
        setDatabaseStatus(conflict ? '服务器数据版本已变化，当前修改未覆盖服务器数据' : '数据库保存失败，修改暂存在本机');
        showSaveToast(conflict ? '另一个页面或设备已先保存，当前修改尚未保存' : '数据库保存失败', 'error');
      }
    }, saveDelay);

    return () => {
      if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
      if (databaseSaveTimerRef.current) window.clearTimeout(databaseSaveTimerRef.current);
    };
  }, [state, databaseReady, saveScheduleRevision]);

  useEffect(() => {
    const saveWhenTextEditingEnds = (event) => {
      if (!isTextEditingElement(event.target)) return;
      if (!hasUnsavedChangesRef.current) return;
      saveAfterTextBlurRef.current = true;
      setSaveScheduleRevision((current) => current + 1);
    };
    document.addEventListener('focusout', saveWhenTextEditingEnds);
    return () => document.removeEventListener('focusout', saveWhenTextEditingEnds);
  }, []);

  useEffect(() => () => {
    if (saveToastTimerRef.current) window.clearTimeout(saveToastTimerRef.current);
    if (archiveUndoTimerRef.current) window.clearTimeout(archiveUndoTimerRef.current);
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
          const loadedStateFingerprint = databaseStateFingerprint(loadedState);
          stateRef.current = loadedState;
          currentStateFingerprintRef.current = loadedStateFingerprint;
          lastSavedStateFingerprintRef.current = loadedStateFingerprint;
          databaseVersionRef.current = Number(payload.version || 0);
          setState(loadedState);
          setMonthIndex(findCurrentMonthIndex(loadedState.months || []));
          setDatabaseStatus('已连接 SQLite');
        } else {
          databaseVersionRef.current = Number(payload.version || 0);
          await queueDatabaseSave(stateRef.current);
          if (!active) return;
          setMonthIndex(findCurrentMonthIndex((stateRef.current?.months || []).map(normalizeMonth)));
          setDatabaseStatus('已初始化 SQLite');
        }
        setDatabaseReady(true);
        markUnsavedChanges(false);
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

  useEffect(() => {
    if (!databaseReady) return undefined;

    const eventSource = new EventSource(API_STATE_EVENTS_URL);
    const checkForUpdates = () => {
      if (document.visibilityState === 'hidden') return;
      syncDatabaseState().catch(() => undefined);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.sourceClientId === syncClientIdRef.current) return;
        if (Number(payload.version || 0) <= databaseVersionRef.current) return;
        if (hasUnsavedChangesRef.current || manualSavePendingRef.current) {
          setDatabaseStatus('另一个页面或设备有新修改，当前操作尚未保存');
          showSaveToast('服务器数据已变化，请先处理当前未保存内容', 'error');
          return;
        }
        if (payload.state) {
          applyDatabasePayload(payload, { notify: true });
          return;
        }
        checkForUpdates();
      } catch {
        // Ignore malformed event payloads; EventSource will continue listening.
      }
    };

    window.addEventListener('focus', checkForUpdates);
    document.addEventListener('visibilitychange', checkForUpdates);
    const fallbackTimer = window.setInterval(checkForUpdates, 15_000);

    return () => {
      eventSource.close();
      window.removeEventListener('focus', checkForUpdates);
      document.removeEventListener('visibilitychange', checkForUpdates);
      window.clearInterval(fallbackTimer);
    };
  }, [databaseReady]);

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

  const editCellNote = async (rowId, day) => {
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
    const note = await showAppPrompt('填写这项任务当天的具体内容，例如：完成第3页', currentNote, {
      title: '填写备注',
      inputLabel: '备注内容',
      placeholder: '例如：完成第3页',
    });
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

  const updateTemporaryTaskRemark = (row, day, value) => {
    const title = temporaryTaskTitleFromNote(month.notes?.[row.id]?.[day]) || TEMPORARY_TASK_TITLE;
    updateCellNote(row.id, day, `${title}｜${value}`);
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
    let year = now.getFullYear();
    let monthNumber = now.getMonth() + 1;
    while (months.some((item) => item.key === createMonthKey(year, monthNumber))) {
      monthNumber += 1;
      if (monthNumber > 12) {
        monthNumber = 1;
        year += 1;
      }
    }
    setNewMonthDialog({
      monthKey: createMonthKey(year, monthNumber),
      templateId: '',
    });
  };

  const confirmAddMonth = () => {
    const input = newMonthDialog?.monthKey?.trim() || '';
    const match = input.match(/^(\d{4})-(\d{1,2})$/);
    if (!match) {
      showAppAlert('月份格式请填写为 YYYY-MM，例如 2026-09', { tone: 'warning' });
      return;
    }
    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    if (monthNumber < 1 || monthNumber > 12) return;
    const monthKey = createMonthKey(year, monthNumber);
    if (months.some((item) => item.key === monthKey)) {
      showAppAlert(`${year}年${monthNumber}月的清单已经存在`, { tone: 'warning' });
      return;
    }
    const selectedTemplate = (state.templates || []).find((template) => template.id === newMonthDialog.templateId);
    setState((current) => {
      const next = structuredClone(current || {});
      next.months ||= [];
      const created = createMonthShell(year, monthNumber);
      if (selectedTemplate) {
        const template = createTaskTemplate(selectedTemplate, selectedTemplate.name, selectedTemplate.id);
        created.categories = structuredClone(template.categories || []).map((category) => ({
          ...category,
          id: createId('cat'),
          tasks: (category.tasks || []).map((task) => ({
            ...task,
            id: createId('task'),
            type: 'daily',
            checkMode: 'daily',
            importance: task.importance || 'normal',
            startDay: 1,
            endDay: created.days,
          })),
        }));
      }
      next.months.push(created);
      return next;
    });
    setMonthIndex(months.length);
    setNewMonthDialog(null);
  };

  const saveCurrentMonthAsTemplate = async () => {
    const input = await showAppPrompt('为当前任务清单填写一个模板名称。阶段任务和临时任务不会保存到模板。', `${month.label}任务模板`, {
      title: '保存为模板',
      inputLabel: '模板名称',
      placeholder: '例如：日常学习模板',
      confirmText: '保存模板',
    });
    const name = input?.trim();
    if (!name) return;
    const existing = (stateRef.current.templates || []).find((template) => template.name === name);
    if (existing) {
      const confirmed = await showAppConfirm(`已经存在“${name}”，是否用当前月份的每日固定任务覆盖它？`, {
        title: '覆盖模板',
        confirmText: '确认覆盖',
        tone: 'warning',
      });
      if (!confirmed) return;
    }

    const sourceMonth = stateRef.current.months?.find((item) => item.id === month.id) || month;
    const next = structuredClone(stateRef.current || {});
    next.templates ||= [];
    const template = createTaskTemplate(sourceMonth, name, existing?.id || createId('template'));
    const taskCount = template.categories.reduce((sum, category) => sum + category.tasks.length, 0);
    if (taskCount === 0) {
      showAppAlert('当前月份没有可保存的每日固定任务。阶段任务和临时任务不会进入模板。', { tone: 'warning' });
      return;
    }
    if (existing) {
      next.templates = next.templates.map((item) => (item.id === existing.id ? template : item));
    } else {
      next.templates.push(template);
    }

    loadingFromDatabase.current = true;
    stateRef.current = next;
    setState(next);
    const ok = await persistState(next, '任务模板已保存到 SQLite');
    window.setTimeout(() => {
      loadingFromDatabase.current = false;
    }, 0);
    if (ok) showAppAlert(`“${name}”已保存。新建月份清单时可以直接选择使用。`, { title: '模板已保存' });
  };

  const openTemplateManager = () => {
    const templates = stateRef.current.templates || [];
    if (!templates.length) {
      showAppAlert('还没有可管理的模板，请先将一个月份配置保存为模板。', { tone: 'warning' });
      return;
    }
    setTemplateManagerDialog({
      templateId: templates[0].id,
      draft: structuredClone(templates[0]),
    });
  };

  const selectManagedTemplate = (templateId) => {
    const template = (stateRef.current.templates || []).find((item) => item.id === templateId);
    if (!template) return;
    setTemplateManagerDialog({ templateId, draft: structuredClone(template) });
  };

  const updateTemplateDraft = (updater) => {
    setTemplateManagerDialog((current) => {
      if (!current) return current;
      const draft = structuredClone(current.draft);
      updater(draft);
      return { ...current, draft };
    });
  };

  const persistTemplateList = async (templates, successMessage) => {
    const next = structuredClone(stateRef.current || {});
    next.templates = templates;
    loadingFromDatabase.current = true;
    stateRef.current = next;
    setState(next);
    const ok = await persistState(next, successMessage);
    window.setTimeout(() => {
      loadingFromDatabase.current = false;
    }, 0);
    return ok;
  };

  const saveManagedTemplate = async () => {
    const draft = templateManagerDialog?.draft;
    if (!draft) return;
    const name = draft.name?.trim();
    if (!name) {
      showAppAlert('模板名称不能为空。', { tone: 'warning' });
      return;
    }
    const duplicate = (stateRef.current.templates || []).find((item) => item.id !== draft.id && item.name === name);
    if (duplicate) {
      showAppAlert(`已经存在名为“${name}”的模板，请使用其他名称。`, { tone: 'warning' });
      return;
    }
    const normalized = createTaskTemplate(draft, name, draft.id);
    const taskCount = normalized.categories.reduce((sum, category) => sum + category.tasks.length, 0);
    if (!taskCount) {
      showAppAlert('模板至少需要保留一个每日固定任务。', { tone: 'warning' });
      return;
    }
    const templates = (stateRef.current.templates || []).map((item) => (item.id === draft.id ? normalized : item));
    const ok = await persistTemplateList(templates, '任务模板修改已保存到 SQLite');
    if (ok) {
      setTemplateManagerDialog({ templateId: normalized.id, draft: structuredClone(normalized) });
      showSaveToast('模板修改已保存');
    }
  };

  const deleteManagedTemplate = async () => {
    const draft = templateManagerDialog?.draft;
    if (!draft) return;
    const confirmed = await showAppConfirm(`确定删除模板“${draft.name}”吗？已创建的月份不会受到影响。`, {
      title: '删除模板',
      confirmText: '确认删除',
      tone: 'danger',
    });
    if (!confirmed) return;
    const templates = (stateRef.current.templates || []).filter((item) => item.id !== draft.id);
    const ok = await persistTemplateList(templates, '任务模板已删除');
    if (!ok) return;
    if (!templates.length) {
      setTemplateManagerDialog(null);
    } else {
      setTemplateManagerDialog({ templateId: templates[0].id, draft: structuredClone(templates[0]) });
    }
  };

  const isCurrentCalendarMonth = (targetMonth) => {
    const now = new Date();
    return targetMonth?.key === createMonthKey(now.getFullYear(), now.getMonth() + 1);
  };

  const deleteMonth = async (targetMonth, targetIndex) => {
    if (!targetMonth) return;
    if (months.length <= 1) {
      showAppAlert('至少需要保留一个月份清单，不能删除最后一个月份。', { tone: 'warning' });
      return;
    }
    if (isCurrentCalendarMonth(targetMonth)) {
      showAppAlert('不能删除当前自然月份的清单。', { tone: 'warning' });
      return;
    }
    const confirmed = await showAppConfirm(`即将删除“${targetMonth.label}”月份清单。该月份下的任务、打卡、阅读和兑换记录都会一起删除。确定继续吗？`, {
      title: '删除月份清单',
      confirmText: '继续删除',
      tone: 'danger',
    });
    if (!confirmed) return;
    const typed = await showAppPrompt(`这是高风险操作。请输入完整月份名称“${targetMonth.label}”确认删除：`, '', {
      title: '严格确认',
      inputLabel: '完整月份名称',
      placeholder: targetMonth.label,
      confirmText: '确认删除',
      tone: 'danger',
    });
    if (typed !== targetMonth.label) {
      showAppAlert('月份名称输入不一致，已取消删除。', { tone: 'warning' });
      return;
    }
    const nextIndex = Math.max(0, Math.min(monthIndex >= targetIndex ? monthIndex - 1 : monthIndex, months.length - 2));
    setState((current) => {
      const next = structuredClone(current || {});
      next.months = (next.months || []).filter((item) => item.id !== targetMonth.id);
      next.activeMonthId = next.months[nextIndex]?.id || next.months[0]?.id;
      return next;
    });
    setMonthIndex(nextIndex);
  };

  const addCategory = async () => {
    const fixed = FIXED_CATEGORIES.find((item) => item.name === categoryDraft);
    const customName = categoryDraft === 'custom'
      ? (await showAppPrompt('请输入自定义分类名称', '', { title: '新增自定义分类', inputLabel: '分类名称' }))?.trim()
      : '';
    const name = fixed?.name || customName;
    if (!name) return;
    if (month.categories.some((item) => item.name === name)) {
      showAppAlert(`${name} 分类已经存在`, { tone: 'warning' });
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

  const deleteCategory = async (categoryId) => {
    if (!await showAppConfirm('确定删除这个分类和下面所有任务吗？', {
      title: '删除分类',
      confirmText: '删除',
      tone: 'danger',
    })) return;
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
        ...(category.name === '好习惯' ? { habitPoints: pointConfig.habit } : {}),
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
            rewardPoints: Number(sourceBook.rewardPoints || DEFAULT_READING_REWARD_POINTS),
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
      if (category.name === '好习惯') task.habitPoints = habitPoints(task.habitPoints, pointConfig);
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
      type: rewardTypeMeta(newRewardDialog.type).type,
      icon: newRewardDialog.icon || rewardTypeMeta(newRewardDialog.type).icon,
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
      type: rewardTypeMeta(item.type).type,
      icon: item.icon || rewardTypeMeta(item.type).icon,
    });
  };

  const deleteReward = async (item) => {
    if (!await showAppConfirm(`确定删除奖励“${item.name || '未命名奖励'}”吗？已兑换记录会保留。`, {
      title: '删除奖励',
      confirmText: '删除',
      tone: 'danger',
    })) return;
    const next = structuredClone(stateRef.current || state || {});
    next.rewardConfig = normalizeRewardConfig(next.rewardConfig || DEFAULT_REWARDS).filter((reward) => reward.id !== item.id);
    if (!next.rewardConfig.length) next.rewardConfig = DEFAULT_REWARDS;
    setState(next);
    await persistState(next, '奖励已删除并保存到 SQLite');
  };

  const openPointConfigDialog = () => {
    setPointConfigDialog({
      excellent: String(pointConfig.excellent),
      super: String(pointConfig.super),
      habit: String(pointConfig.habit),
      readingBook: String(pointConfig.readingBook),
    });
  };

  const confirmPointConfig = async () => {
    if (!pointConfigDialog) return;
    const nextPointConfig = normalizePointConfig(pointConfigDialog);
    const next = structuredClone(stateRef.current || state || {});
    next.pointConfig = nextPointConfig;
    setState(next);
    setPointConfigDialog(null);
    await persistState(next, '积分默认值已保存到 SQLite');
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
        { id: createId('book'), type: '其它', totalPages: '', rewardPoints: pointConfig.readingBook, addedAt: new Date().toISOString(), ...bookPatch },
      ]);
      return next;
    });
    setReadingScope('library');
  };

  const openNewBookDialog = () => {
    setNewBookDialog({ name: '', type: '其它', totalPages: '', rewardPoints: String(pointConfig.readingBook) });
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
      rewardPoints: String(book.rewardPoints || pointConfig.readingBook),
    });
  };

  const deleteLibraryBook = async (book) => {
    if (!await showAppConfirm(`确定从“我的图书馆”移出“${book.name || '未命名书目'}”吗？已安排月份和阅读历史会保留。`, {
      title: '移出书籍',
      confirmText: '移出',
      tone: 'danger',
    })) return;
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
      showAppAlert('请填写大于 0 的总页数', { tone: 'warning' });
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
      showAppAlert('请先填写书名', { tone: 'warning' });
      return;
    }
    const bookPatch = {
      name,
      type: newBookDialog.type || '其它',
      totalPages: newBookDialog.totalPages === '' ? '' : Math.max(0, Number(newBookDialog.totalPages || 0)),
      rewardPoints: Math.max(0, Number(newBookDialog.rewardPoints || pointConfig.readingBook)),
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
      book.rewardPoints = Math.max(0, Number(book.rewardPoints || pointConfig.readingBook));
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
        const maxSize = 2048;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(16, Math.round(image.width * scale));
        canvas.height = Math.max(16, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const sliceStarts = [0, 0.27, 0.54];
        const detailImages = sliceStarts.map((start) => {
          const portrait = canvas.height >= canvas.width;
          const area = portrait
            ? { left: 0, top: start * 100, width: 100, height: 46 }
            : { left: start * 100, top: 0, width: 46, height: 100 };
          const sourceX = Math.round(canvas.width * area.left / 100);
          const sourceY = Math.round(canvas.height * area.top / 100);
          const sourceWidth = Math.min(canvas.width - sourceX, Math.round(canvas.width * area.width / 100));
          const sourceHeight = Math.min(canvas.height - sourceY, Math.round(canvas.height * area.height / 100));
          const detailScale = Math.min(2, 2048 / Math.max(sourceWidth, sourceHeight));
          const detailCanvas = document.createElement('canvas');
          detailCanvas.width = Math.max(16, Math.round(sourceWidth * detailScale));
          detailCanvas.height = Math.max(16, Math.round(sourceHeight * detailScale));
          const detailContext = detailCanvas.getContext('2d');
          detailContext.fillStyle = '#fff';
          detailContext.fillRect(0, 0, detailCanvas.width, detailCanvas.height);
          detailContext.imageSmoothingEnabled = true;
          detailContext.imageSmoothingQuality = 'high';
          detailContext.drawImage(
            canvas,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            detailCanvas.width,
            detailCanvas.height,
          );
          return {
            area: {
              ...area,
              width: sourceWidth / canvas.width * 100,
              height: sourceHeight / canvas.height * 100,
            },
            imageData: detailCanvas.toDataURL('image/jpeg', 0.9),
          };
        });
        const localizationCanvas = document.createElement('canvas');
        localizationCanvas.width = canvas.width;
        localizationCanvas.height = canvas.height;
        const localizationContext = localizationCanvas.getContext('2d');
        localizationContext.drawImage(canvas, 0, 0);
        localizationContext.save();
        localizationContext.strokeStyle = 'rgba(16, 105, 178, 0.72)';
        localizationContext.fillStyle = '#075b9a';
        localizationContext.lineWidth = Math.max(1, Math.round(Math.min(canvas.width, canvas.height) / 1000));
        const gridFontSize = Math.max(14, Math.min(24, Math.round(canvas.width * 0.014)));
        localizationContext.font = `600 ${gridFontSize}px Arial, sans-serif`;
        localizationContext.textBaseline = 'middle';
        for (let index = 1; index < 10; index += 1) {
          const x = Math.round(canvas.width * index / 10);
          const y = Math.round(canvas.height * index / 10);
          localizationContext.beginPath();
          localizationContext.moveTo(x, 0);
          localizationContext.lineTo(x, canvas.height);
          localizationContext.stroke();
          localizationContext.beginPath();
          localizationContext.moveTo(0, y);
          localizationContext.lineTo(canvas.width, y);
          localizationContext.stroke();
          const label = `Y=${index * 100}`;
          const labelWidth = Math.ceil(localizationContext.measureText(label).width) + 10;
          localizationContext.fillStyle = 'rgba(255, 255, 255, 0.9)';
          localizationContext.fillRect(2, y - gridFontSize / 2 - 3, labelWidth, gridFontSize + 6);
          localizationContext.fillStyle = '#075b9a';
          localizationContext.fillText(label, 7, y);
        }
        localizationContext.restore();
        URL.revokeObjectURL(objectUrl);
        resolve({
          imageData: canvas.toDataURL('image/jpeg', 0.88),
          detailImages,
          localizationImageData: localizationCanvas.toDataURL('image/jpeg', 0.86),
        });
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

  const readAvatarImage = (file) => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片格式的头像'));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const size = 360;
        const sourceSize = Math.min(image.width, image.height);
        const sourceX = Math.max(0, Math.round((image.width - sourceSize) / 2));
        const sourceY = Math.max(0, Math.round((image.height - sourceSize) / 2));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, size, size);
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('头像图片读取失败，请换一张清晰图片'));
    };
    image.src = objectUrl;
  });

  const openProfileDialog = () => {
    setProfileDialog(normalizeProfile(stateRef.current?.profile || profile));
  };

  const updateProfileDialog = (patch) => {
    setProfileDialog((current) => ({ ...(current || profile), ...patch }));
  };

  const handleAvatarImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const avatarData = await readAvatarImage(file);
      setProfileDialog((current) => {
        const base = normalizeProfile(current || profile);
        return normalizeProfile({
          ...base,
          avatarData,
          avatarHistory: [avatarData, base.avatarData, ...(base.avatarHistory || [])],
        });
      });
    } catch (error) {
      showAppAlert(error?.message || '头像更换失败，请重试', { tone: 'warning' });
    } finally {
      event.target.value = '';
    }
  };

  const chooseProfileHistoryAvatar = (avatarData) => {
    updateProfileDialog({
      avatarData,
      avatarHistory: [avatarData, ...(profileDialog?.avatarHistory || [])],
    });
  };

  const saveProfileDialog = async () => {
    if (!profileDialog) return;
    const nextProfile = normalizeProfile(profileDialog);
    const next = structuredClone(stateRef.current || state || {});
    next.profile = nextProfile;
    setState(next);
    setProfileDialog(null);
    await persistState(next, '小朋友信息已保存到 SQLite');
  };

  const cancelHomeworkGrading = () => {
    const requestId = gradingRequestIdRef.current;
    if (requestId) {
      void fetch(`${API_GRADE_HOMEWORK_URL}/${encodeURIComponent(requestId)}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    }
    gradingRequestRef.current?.abort();
  };

  const handleHomeworkImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isGradingHomework) cancelHomeworkGrading();
    homeworkImageRef.current = '';
    homeworkDetailImagesRef.current = [];
    homeworkLocalizationImageRef.current = '';
    setLatestReview(null);
    setShowPreviousReview(false);
    setGradingError('');
    setIsPreparingHomeworkImage(true);
    setGraderDraft((current) => ({ ...current, imageData: '', imageName: file.name }));
    try {
      const { imageData, detailImages, localizationImageData } = await readHomeworkImage(file);
      homeworkImageRef.current = imageData;
      homeworkDetailImagesRef.current = detailImages;
      homeworkLocalizationImageRef.current = localizationImageData;
      setGraderDraft((current) => ({ ...current, imageData, imageName: file.name }));
    } catch (error) {
      homeworkImageRef.current = '';
      homeworkDetailImagesRef.current = [];
      homeworkLocalizationImageRef.current = '';
      setGraderDraft((current) => ({ ...current, imageData: '', imageName: '' }));
      setGradingError(error?.message || '图片上传失败，请重新拍照');
    } finally {
      setIsPreparingHomeworkImage(false);
      event.target.value = '';
    }
  };

  const generateHomeworkReview = async () => {
    const currentImageData = homeworkImageRef.current || graderDraft.imageData;
    const currentDetailImages = homeworkDetailImagesRef.current;
    const currentLocalizationImageData = homeworkLocalizationImageRef.current;
    if (isPreparingHomeworkImage) {
      showAppAlert('图片还在处理中，请等预览出现后再批改', { tone: 'warning' });
      return;
    }
    if (!currentImageData) {
      showAppAlert('请先拍照或上传一张作业照片', { tone: 'warning' });
      return;
    }
    if (isGradingHomework) return;
    const term = graderDraft.term || '二年级上学期';
    const controller = new AbortController();
    const requestId = createId('grading');
    const requestBody = JSON.stringify({
      requestId,
      term,
      title: graderDraft.title.trim(),
      note: graderDraft.note.trim(),
      imageData: currentImageData,
      detailImages: currentDetailImages,
      localizationImageData: currentLocalizationImageData,
    });
    gradingRequestRef.current = controller;
    gradingRequestIdRef.current = requestId;
    setIsGradingHomework(true);
    setGradingStage('queued');
    setGradingError('');
    try {
      const responseError = (response, payload) => {
        const stageLabel = {
          vision: '题目识别',
          grading: '逐题判分',
          localization: '错题定位',
        }[payload?.stage];
        const message = payload?.error || 'AI批改失败，请稍后再试';
        const error = new Error(stageLabel ? `${stageLabel}阶段失败：${message}` : message);
        error.httpStatus = response.status;
        error.code = payload?.code || '';
        return error;
      };
      const startJob = async () => {
        let lastError;
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          try {
            const response = await fetchWithRequestTimeout(API_GRADE_HOMEWORK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: requestBody,
            }, 30000);
            const payload = await readJsonResponse(response);
            if (!response.ok) throw responseError(response, payload);
            return payload;
          } catch (error) {
            if (error?.name === 'AbortError' || error?.httpStatus || attempt === 2) throw error;
            lastError = error;
            await waitForRequest(900, controller.signal);
          }
        }
        throw lastError || new Error('批改任务提交失败，请检查网络后重试');
      };

      let jobPayload = await startJob();
      let payload = jobPayload?.detectedSubject ? jobPayload : null;
      let consecutivePollFailures = 0;
      let restartedAfterMissing = false;
      const pollingDeadline = Date.now() + 135000;
      while (!payload) {
        if (jobPayload?.status === 'completed') {
          payload = jobPayload.result;
          break;
        }
        if (jobPayload?.status === 'failed' || jobPayload?.status === 'cancelled') {
          const error = new Error(jobPayload.error || (jobPayload.status === 'cancelled' ? '批改已取消' : 'AI批改失败，请稍后再试'));
          error.name = jobPayload.status === 'cancelled' ? 'AbortError' : 'Error';
          throw error;
        }
        setGradingStage(jobPayload?.stage || 'queued');
        if (Date.now() >= pollingDeadline) {
          void fetch(`${API_GRADE_HOMEWORK_URL}/${encodeURIComponent(requestId)}`, { method: 'DELETE', keepalive: true }).catch(() => {});
          throw new Error('AI 批改等待超过 135 秒，任务已停止，请裁切到单页后重试');
        }
        await waitForRequest(1400, controller.signal);
        try {
          const response = await fetchWithRequestTimeout(`${API_GRADE_HOMEWORK_URL}/${encodeURIComponent(requestId)}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal,
          }, 12000);
          const nextPayload = await readJsonResponse(response);
          if (response.status === 404 && !restartedAfterMissing) {
            restartedAfterMissing = true;
            jobPayload = await startJob();
            continue;
          }
          if (!response.ok) throw responseError(response, nextPayload);
          jobPayload = nextPayload;
          consecutivePollFailures = 0;
        } catch (error) {
          if (error?.name === 'AbortError' || error?.httpStatus) throw error;
          consecutivePollFailures += 1;
          if (consecutivePollFailures >= 12) {
            throw new Error('与批改服务的连接多次中断，请检查网络后重试');
          }
        }
      }
      if (!payload) throw new Error('批改任务已完成，但没有返回可用结果');

      if (!LEARNING_SUBJECTS.includes(payload.detectedSubject)) {
        throw new Error('AI 只识别到模糊或被遮挡的内容，无法判断学科；请直接上传作业原图，或重新拍摄清晰的整页照片');
      }
      const detectedSubject = payload.detectedSubject;
      const detectedTitle = String(payload.detectedTitle || '').trim();
      const reviewTitle = detectedTitle || graderDraft.title.trim() || `${term}${detectedSubject}作业批改`;
      let selectedMistakes = normalizeReviewMistakes(payload.mistakes).map((item) => ({
        id: createId('mistake'),
        term,
        subject: detectedSubject,
        isWrong: item.isWrong !== false,
        order: Number(item.order || 0),
        questionNumber: String(item.questionNumber || item.printedNumber || ''),
        question: item.question || '未命名错题',
        answer: item.answer || '',
        correctAnswer: item.correctAnswer || '',
        shortComment: item.shortComment || '',
        errorReason: item.errorReason || item.shortComment || '',
        knowledgePoint: normalizeMistakeKnowledgePoint(item.knowledgePoint),
        errorType: normalizeMistakeErrorType(item.errorType),
        reviewDecision: 'pending',
        solutionSteps: normalizeSolutionSteps(item.solutionSteps, item.explanation),
        explanation: item.explanation || '',
        questionImageUrl: item.questionImageUrl || '',
        area: normalizePercentArea(item.area),
        cropArea: normalizePercentArea(item.cropArea),
        sourceTitle: reviewTitle,
        createdAt: new Date().toISOString(),
        mastered: false,
        archivedAt: '',
      }));
      const [mistakesWithImages, persistedReviewImageUrl] = await Promise.all([
        attachQuestionImages(currentImageData, selectedMistakes),
        payload.annotatedImageUrl
          ? Promise.resolve(payload.annotatedImageUrl)
          : uploadMistakeQuestionImage(currentImageData),
      ]);
      selectedMistakes = mistakesWithImages;
      const nextReview = {
        id: createId('review'),
        term,
        subject: detectedSubject,
        title: reviewTitle,
        note: graderDraft.note.trim(),
        imageData: '',
        imageName: graderDraft.imageName,
        provider: payload.provider || 'deepseek',
        detectedSubject,
        subjectConfidence: ['高', '中', '低'].includes(payload.subjectConfidence) ? payload.subjectConfidence : '',
        detectedTitle,
        recognizedQuestionCount: Number(payload.recognizedQuestionCount || 0),
        uncertainQuestionCount: Number(payload.uncertainQuestionCount || 0),
        annotationQuality: ['precise', 'approximate', 'none'].includes(payload.annotationQuality) ? payload.annotationQuality : 'approximate',
        gradingWarning: payload.gradingWarning || '',
        localizationWarning: payload.localizationWarning || '',
        score: Number(payload.score ?? Math.max(72, 96 - selectedMistakes.length * 8)),
        summary: payload.summary || `已完成${term}${detectedSubject}作业批改，发现 ${selectedMistakes.length} 个需要订正的地方。`,
        suggestions: normalizeReviewSuggestions(payload.suggestions).length ? normalizeReviewSuggestions(payload.suggestions) : ['订正后建议隔天再练一次同类题，确认真正掌握。'],
        imageAnnotations: normalizeReviewAnnotations(payload.imageAnnotations),
        annotatedImageUrl: persistedReviewImageUrl,
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
      await persistState(next, 'AI批改结果已保存到 SQLite');
    } catch (error) {
      if (error?.name === 'AbortError' && gradingRequestIdRef.current === requestId) {
        void fetch(`${API_GRADE_HOMEWORK_URL}/${encodeURIComponent(requestId)}`, { method: 'DELETE', keepalive: true }).catch(() => {});
      }
      setGradingError(error?.name === 'AbortError' ? '批改已取消，可以重新点击生成批改结果' : (error?.message || 'AI批改失败，请稍后再试'));
    } finally {
      if (gradingRequestRef.current === controller) gradingRequestRef.current = null;
      if (gradingRequestIdRef.current === requestId) gradingRequestIdRef.current = '';
      setGradingStage('');
      setIsGradingHomework(false);
    }
  };

  const setReviewMistakeDecision = async (review, mistake, decision) => {
    const normalizedDecision = normalizeReviewMistakeDecision(decision);
    if (!review?.id || !mistake?.id || reviewMistakeActionRef.current) return;
    const actionId = `${review.id}-${mistake.id}`;
    reviewMistakeActionRef.current = actionId;
    setReviewMistakeActionId(actionId);

    let previousDecision = 'pending';
    let addedMistakeId = '';
    try {
      const sourceImageData = review.id === latestReview?.id ? homeworkImageRef.current || graderDraft.imageData : '';
      const [preparedMistake] = normalizedDecision === 'collected'
        ? await attachQuestionImages(sourceImageData, [mistake])
        : [mistake];
      const next = structuredClone(stateRef.current || state || {});
      next.learningTools = normalizeLearningTools(next.learningTools);
      const targetReview = next.learningTools.reviews.find((item) => item.id === review.id);
      const targetKey = mistakeCollectionKey(mistake, review.id);
      const targetMistake = targetReview?.mistakes.find((item) => item.id === mistake.id)
        || targetReview?.mistakes.find((item) => mistakeCollectionKey(item, review.id) === targetKey);
      if (!targetReview || !targetMistake) throw new Error('没有找到这道批改题，请刷新后重试');

      previousDecision = normalizeReviewMistakeDecision(targetMistake.reviewDecision);
      targetMistake.reviewDecision = normalizedDecision;
      if (!targetMistake.questionImageUrl && preparedMistake?.questionImageUrl) {
        targetMistake.questionImageUrl = preparedMistake.questionImageUrl;
      }

      if (normalizedDecision === 'collected') {
        const collectionKey = mistakeCollectionKey(targetMistake, review.id);
        const alreadyCollected = next.learningTools.mistakes.some((item) => mistakeCollectionKey(item) === collectionKey);
        if (!alreadyCollected) {
          const collectedMistake = normalizeMistake({
            ...targetMistake,
            ...preparedMistake,
            id: createId('mistake'),
            term: review.term,
            reviewId: review.id,
            sourceTitle: review.title,
            reviewDecision: 'pending',
            mastered: false,
            archivedAt: '',
          }, review.subject);
          addedMistakeId = collectedMistake.id;
          next.learningTools.mistakes.unshift(collectedMistake);
        }
      }

      stateRef.current = next;
      setState(next);
      if (latestReview?.id === review.id) setLatestReview(targetReview);
      const successMessage = normalizedDecision === 'collected'
        ? '这道错题已收录到 SQLite'
        : normalizedDecision === 'ignored'
          ? '这道题已忽略'
          : '这道题已恢复为待处理';
      const saved = await persistState(next, successMessage);
      if (saved) return;

      const rollback = structuredClone(stateRef.current || next);
      rollback.learningTools = normalizeLearningTools(rollback.learningTools);
      const rollbackReview = rollback.learningTools.reviews.find((item) => item.id === review.id);
      const rollbackMistake = rollbackReview?.mistakes.find((item) => item.id === mistake.id)
        || rollbackReview?.mistakes.find((item) => mistakeCollectionKey(item, review.id) === targetKey);
      if (rollbackMistake && normalizeReviewMistakeDecision(rollbackMistake.reviewDecision) === normalizedDecision) {
        rollbackMistake.reviewDecision = previousDecision;
      }
      if (addedMistakeId) {
        rollback.learningTools.mistakes = rollback.learningTools.mistakes.filter((item) => item.id !== addedMistakeId);
      }
      stateRef.current = rollback;
      setState(rollback);
      if (latestReview?.id === review.id && rollbackReview) setLatestReview(rollbackReview);
    } catch (error) {
      showSaveToast(error?.message || '错题处理失败，请重试', 'error');
    } finally {
      if (reviewMistakeActionRef.current === actionId) reviewMistakeActionRef.current = '';
      setReviewMistakeActionId((current) => (current === actionId ? '' : current));
    }
  };

  const downloadAnnotatedHomeworkImage = async (review = latestReview) => {
    const reviewMistakes = normalizeReviewMistakes(review?.mistakes);
    const includedMistakes = reviewMistakes.filter((mistake) => normalizeReviewMistakeDecision(mistake.reviewDecision) !== 'ignored');
    const annotations = filterIgnoredReviewAnnotations(normalizeReviewAnnotations(review?.imageAnnotations), reviewMistakes);
    const fallbackAnnotations = annotations.length ? annotations : includedMistakes.length ? buildFallbackAnnotations(includedMistakes) : [];
    const imageUrl = review?.annotatedImageUrl || (review?.id === latestReview?.id ? homeworkImageRef.current || graderDraft.imageData : '');
    if (!imageUrl || !fallbackAnnotations.length) {
      showAppAlert(includedMistakes.length ? '当前批改结果还没有可生成图片的作业原图' : '已忽略全部 AI 错题标记', { tone: 'warning' });
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
      const wrapCanvasText = (text, maxWidth, maxLines) => {
        const lines = [];
        let current = '';
        for (const character of String(text || '')) {
          const next = current + character;
          if (current && context.measureText(next).width > maxWidth) {
            lines.push(current);
            current = character;
            if (lines.length === maxLines) break;
          } else {
            current = next;
          }
        }
        if (lines.length < maxLines && current) lines.push(current);
        if (lines.length === maxLines && String(text || '').length > lines.join('').length) {
          lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
        }
        return lines;
      };
      fallbackAnnotations.forEach((annotation) => {
        const x = annotation.area.left / 100 * canvas.width;
        const y = annotation.area.top / 100 * canvas.height;
        const w = annotation.area.width / 100 * canvas.width;
        const h = annotation.area.height / 100 * canvas.height;
        const wrong = annotation.status === 'wrong';
        const color = wrong ? '#ef4444' : annotation.status === 'correct' ? '#22c55e' : '#f59e0b';
        const lineWidth = Math.max(4, canvas.width * 0.0035);
        const radius = Math.max(20, canvas.width * 0.021);
        const badgeX = Math.min(canvas.width - radius, Math.max(radius, x + radius * 0.25));
        const badgeY = Math.min(canvas.height - radius, Math.max(radius, y + radius * 0.25));
        context.save();
        if (wrong) {
          context.strokeStyle = color;
          context.lineWidth = lineWidth;
          context.globalAlpha = 0.92;
          context.strokeRect(x, y, w, h);
        }
        context.globalAlpha = 1;
        context.fillStyle = color;
        context.beginPath();
        context.arc(badgeX, badgeY, radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#fff';
        context.font = `900 ${Math.round(radius * 0.92)}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(String(annotation.questionNumber || annotation.order || annotation.label || '错'), badgeX, badgeY);

        const comment = [annotation.comment, annotation.correctAnswer ? `正确：${annotation.correctAnswer}` : '']
          .filter(Boolean)
          .join('  ');
        if (comment) {
          const fontSize = Math.max(18, Math.round(canvas.width * 0.017));
          const padding = Math.max(12, Math.round(fontSize * 0.72));
          const lineHeight = Math.round(fontSize * 1.42);
          const boxWidth = Math.min(canvas.width * 0.52, Math.max(canvas.width * 0.28, fontSize * 18));
          context.font = `700 ${fontSize}px "Microsoft YaHei", Arial`;
          const lines = wrapCanvasText(comment, boxWidth - padding * 2, 3);
          const boxHeight = padding * 2 + lineHeight * lines.length;
          let boxX = x + w + padding;
          if (boxX + boxWidth > canvas.width - padding) boxX = x - boxWidth - padding;
          boxX = Math.max(padding, Math.min(canvas.width - boxWidth - padding, boxX));
          const boxY = Math.max(padding, Math.min(canvas.height - boxHeight - padding, y));
          context.fillStyle = 'rgba(255, 250, 248, 0.96)';
          context.fillRect(boxX, boxY, boxWidth, boxHeight);
          context.strokeStyle = color;
          context.lineWidth = Math.max(2, lineWidth * 0.62);
          context.strokeRect(boxX, boxY, boxWidth, boxHeight);
          context.fillStyle = color;
          context.textAlign = 'left';
          context.textBaseline = 'top';
          lines.forEach((line, lineIndex) => {
            context.fillText(line, boxX + padding, boxY + padding + lineIndex * lineHeight);
          });
        }
        context.restore();
      });
      const link = document.createElement('a');
      link.download = `${review.title || '作业批改'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
    } catch {
      showAppAlert('批改图片生成失败，请重新上传后再试', { tone: 'warning' });
    }
  };

  const setMistakeArchived = async (mistakeId, mastered, { offerUndo = false } = {}) => {
    const pendingOperation = mistakeArchiveOperationRef.current.get(mistakeId);
    if (pendingOperation) await pendingOperation;

    const next = structuredClone(stateRef.current || state || {});
    next.learningTools = normalizeLearningTools(next.learningTools);
    const mistake = next.learningTools.mistakes.find((item) => item.id === mistakeId);
    if (!mistake || mistake.mastered === mastered) return true;
    const previous = { mastered: mistake.mastered, archivedAt: mistake.archivedAt || '' };
    mistake.mastered = mastered;
    mistake.archivedAt = mastered ? new Date().toISOString() : '';
    stateRef.current = next;
    setState(next);

    if (mastered && offerUndo) {
      if (archiveUndoTimerRef.current) window.clearTimeout(archiveUndoTimerRef.current);
      setArchiveUndo({ mistakeId, question: mistake.questionNumber || mistake.question });
      archiveUndoTimerRef.current = window.setTimeout(() => {
        setArchiveUndo(null);
        archiveUndoTimerRef.current = null;
      }, 5000);
    }

    const operation = (async () => {
      const saved = await persistState(
        next,
        mastered ? '错题已归档' : '错题已恢复到待复习',
        { showToast: !offerUndo },
      );
      if (saved) return true;

      const rollback = structuredClone(stateRef.current || next);
      rollback.learningTools = normalizeLearningTools(rollback.learningTools);
      const rollbackMistake = rollback.learningTools.mistakes.find((item) => item.id === mistakeId);
      if (rollbackMistake && rollbackMistake.mastered === mastered) {
        rollbackMistake.mastered = previous.mastered;
        rollbackMistake.archivedAt = previous.archivedAt;
        stateRef.current = rollback;
        setState(rollback);
      }
      if (archiveUndo?.mistakeId === mistakeId || offerUndo) {
        if (archiveUndoTimerRef.current) window.clearTimeout(archiveUndoTimerRef.current);
        archiveUndoTimerRef.current = null;
        setArchiveUndo(null);
      }
      return false;
    })();
    mistakeArchiveOperationRef.current.set(mistakeId, operation);
    try {
      return await operation;
    } finally {
      if (mistakeArchiveOperationRef.current.get(mistakeId) === operation) {
        mistakeArchiveOperationRef.current.delete(mistakeId);
      }
    }
  };

  const undoMistakeArchive = async () => {
    const mistakeId = archiveUndo?.mistakeId;
    if (!mistakeId) return;
    if (archiveUndoTimerRef.current) window.clearTimeout(archiveUndoTimerRef.current);
    archiveUndoTimerRef.current = null;
    setArchiveUndo(null);
    const restored = await setMistakeArchived(mistakeId, false);
    if (restored) {
      setMistakePage('active');
      setSelectedMistakeId(mistakeId);
    }
  };

  const startMistakeMetadataEdit = (mistake) => {
    setMistakeMetadataDraft({
      id: mistake.id,
      knowledgePoint: mistake.knowledgePoint,
      errorType: mistake.errorType,
    });
  };

  const saveMistakeMetadata = async () => {
    if (!mistakeMetadataDraft?.id) return;
    const next = structuredClone(stateRef.current || state || {});
    next.learningTools = normalizeLearningTools(next.learningTools);
    const mistake = next.learningTools.mistakes.find((item) => item.id === mistakeMetadataDraft.id);
    if (!mistake) return;
    const previous = { knowledgePoint: mistake.knowledgePoint, errorType: mistake.errorType };
    mistake.knowledgePoint = normalizeMistakeKnowledgePoint(mistakeMetadataDraft.knowledgePoint);
    mistake.errorType = normalizeMistakeErrorType(mistakeMetadataDraft.errorType);
    stateRef.current = next;
    setState(next);
    const saved = await persistState(next, '错题分类已保存');
    if (saved) {
      setMistakeMetadataDraft(null);
      if (mistakeKnowledgeFilter === previous.knowledgePoint && mistake.knowledgePoint !== previous.knowledgePoint) {
        setMistakeKnowledgeFilter('全部知识点');
      }
      return;
    }
    const rollback = structuredClone(stateRef.current || next);
    rollback.learningTools = normalizeLearningTools(rollback.learningTools);
    const rollbackMistake = rollback.learningTools.mistakes.find((item) => item.id === mistakeMetadataDraft.id);
    if (rollbackMistake) Object.assign(rollbackMistake, previous);
    stateRef.current = rollback;
    setState(rollback);
  };

  const deleteMistake = async (mistakeId) => {
    const currentMistakes = normalizeLearningTools(stateRef.current?.learningTools).mistakes;
    const removedIndex = currentMistakes.findIndex((item) => item.id === mistakeId);
    if (removedIndex < 0) return;
    const removedMistake = currentMistakes[removedIndex];
    const confirmed = await showAppConfirm(
      `确定永久删除“${removedMistake.questionNumber || removedMistake.question.slice(0, 24)}”吗？删除后无法恢复。`,
      { title: '永久删除错题', confirmText: '永久删除', tone: 'danger' },
    );
    if (!confirmed) return;
    const next = structuredClone(stateRef.current || state || {});
    next.learningTools = normalizeLearningTools(next.learningTools);
    next.learningTools.mistakes = next.learningTools.mistakes.filter((item) => item.id !== mistakeId);
    stateRef.current = next;
    setState(next);
    setMistakeMetadataDraft(null);
    const saved = await persistState(next, '错题已删除');
    if (saved) return;
    const rollback = structuredClone(stateRef.current || next);
    rollback.learningTools = normalizeLearningTools(rollback.learningTools);
    if (!rollback.learningTools.mistakes.some((item) => item.id === mistakeId)) {
      rollback.learningTools.mistakes.splice(removedIndex, 0, removedMistake);
      stateRef.current = rollback;
      setState(rollback);
    }
  };

  const openAiConfigDialog = () => {
    setAiConfigDialogOpen(true);
  };

  const confirmAiConfig = async () => {
    setAiConfigStatus('正在保存 AI 配置...');
    try {
      const payload = await saveAiConfig(aiConfigDraft);
      setAiConfigDraft(aiConfigDraftFromPublic(payload.config || {}));
      setAiConfigDialogOpen(false);
      setAiConfigStatus(aiConfigStatusText(payload.config || {}));
    } catch (error) {
      setAiConfigStatus(error?.message || 'AI 配置保存失败');
    }
  };

  const printMistakePaper = (subject = mistakeSubjectFilter, term = mistakeTermFilter) => {
    const selected = filterMistakes(mistakeItems, {
      status: 'active',
      term,
      subject,
      knowledgePoint: mistakeKnowledgeFilter,
      errorType: mistakeErrorFilter,
      source: mistakeSourceFilter,
      search: mistakeSearch,
      sort: mistakeSort,
    });
    if (!selected.length) {
      showAppAlert('当前筛选下没有可生成试卷的未掌握错题', { tone: 'warning' });
      return;
    }
    const paperWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!paperWindow) {
      showAppAlert('浏览器拦截了打印窗口，请允许弹窗后再试', { tone: 'warning' });
      return;
    }
    const escapeHtml = (value) => String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
    const printableImageUrl = (value) => {
      try {
        const url = new URL(String(value || ''), window.location.origin);
        return ['http:', 'https:'].includes(url.protocol) ? escapeHtml(url.href) : '';
      } catch {
        return '';
      }
    };
    const rowsHtml = selected.map((item, index) => {
      const questionImageUrl = printableImageUrl(item.questionImageUrl);
      const solutionSteps = normalizeSolutionSteps(item.solutionSteps, item.explanation)
        .map((step) => `<li>${escapeHtml(step)}</li>`)
        .join('');
      return `
      <section class="question">
        ${questionImageUrl ? `<img class="question-image" src="${questionImageUrl}" alt="第 ${index + 1} 题原题" />` : ''}
        <h3>${index + 1}. ${escapeHtml(item.question).replaceAll('\n', '<br>')}</h3>
        <div class="answer-line">作答：__________________________________________________</div>
        <details>
          <summary>参考答案</summary>
          <p><strong>${escapeHtml(item.correctAnswer)}</strong></p>
          ${item.errorReason ? `<p>错误原因：${escapeHtml(item.errorReason)}</p>` : ''}
          ${solutionSteps ? `<ol>${solutionSteps}</ol>` : ''}
          ${item.explanation ? `<p>方法总结：${escapeHtml(item.explanation).replaceAll('\n', '<br>')}</p>` : ''}
        </details>
      </section>
    `;
    }).join('');
    const paperTerm = escapeHtml(term === '全部学期' ? '综合学期' : term);
    const paperSubject = escapeHtml(subject === '全部' ? '综合' : subject);
    paperWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${paperTerm}${paperSubject}错题练习卷</title>
          <style>
            body { margin: 32px; color: #19333a; font-family: "Microsoft YaHei", sans-serif; }
            header { border-bottom: 3px solid #19333a; padding-bottom: 14px; margin-bottom: 20px; }
            h1 { margin: 0 0 10px; font-size: 28px; }
            .meta { display: flex; gap: 28px; font-size: 15px; }
            .question { break-inside: avoid; padding: 18px 0; border-bottom: 1px dashed #b9c6c8; }
            h3 { margin: 0 0 18px; font-size: 18px; }
            .question-image { display: block; max-width: 100%; max-height: 110mm; margin: 0 auto 14px; object-fit: contain; }
            .answer-line { margin: 12px 0 18px; color: #53666b; }
            details { color: #6b777a; font-size: 13px; }
            @media print { details { display: none; } body { margin: 18mm; } }
          </style>
        </head>
        <body>
          <header>
            <h1>${paperTerm} · ${paperSubject}错题练习卷</h1>
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

  const persistState = async (nextState, successMessage = '已保存到 SQLite', options = {}) => {
    if (databaseSaveTimerRef.current) {
      window.clearTimeout(databaseSaveTimerRef.current);
      databaseSaveTimerRef.current = null;
    }
    setDatabaseStatus('正在保存到 SQLite...');
    try {
      const result = await queueDatabaseSave(nextState);
      if (currentStateFingerprintRef.current === result.savedFingerprint) {
        markUnsavedChanges(false);
        setDatabaseStatus(successMessage);
        if (options.showToast !== false) showSaveToast(successMessage.replace(' SQLite', '数据库'));
      } else {
        markUnsavedChanges(true);
        setDatabaseStatus('本次内容已保存，另有新的修改尚未保存');
      }
      return true;
    } catch (error) {
      const conflict = error?.code === 'STATE_CONFLICT';
      setDatabaseStatus(conflict ? '服务器数据版本已变化，当前修改未覆盖服务器数据' : '数据库保存失败，修改暂存在本机');
      showSaveToast(conflict ? '另一个页面或设备已先保存，当前修改尚未保存' : '数据库保存失败', 'error');
      return false;
    }
  };

  const saveConfiguration = async () => {
    const ok = await persistState(stateRef.current, '配置已保存到 SQLite');
    if (ok) showAppAlert('月份清单配置已保存', { title: '保存成功' });
  };

  const saveCurrentState = async () => {
    const ok = await persistState(stateRef.current, '当前状态已保存到 SQLite');
    if (ok) {
      manualSavePendingRef.current = false;
      setIsBackfillMode(false);
    }
  };

  const openTemporaryTaskDraft = (group) => {
    const key = temporaryDraftKey(month.id, group.categoryId, selectedCheckDay);
    setTemporaryTaskDrafts((current) => ({
      ...current,
      [key]: { content: '', remark: '' },
    }));
  };

  const updateTemporaryTaskDraft = (group, patch) => {
    const key = temporaryDraftKey(month.id, group.categoryId, selectedCheckDay);
    setTemporaryTaskDrafts((current) => ({
      ...current,
      [key]: { content: '', remark: '', ...(current[key] || {}), ...patch },
    }));
  };

  const cancelTemporaryTaskDraft = (group) => {
    const key = temporaryDraftKey(month.id, group.categoryId, selectedCheckDay);
    setTemporaryTaskDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const saveTemporaryTaskDraft = async (group) => {
    if (!selectedCheckDay) return;
    const key = temporaryDraftKey(month.id, group.categoryId, selectedCheckDay);
    const draft = temporaryTaskDrafts[key] || {};
    const content = String(draft.content || '').trim();
    const remark = String(draft.remark || '').trim();
    if (!content) {
      showAppAlert('请先填写临时任务内容。', { tone: 'warning' });
      return;
    }
    const next = structuredClone(stateRef.current || state || {});
    const targetMonth = next.months.find((item) => item.id === month.id);
    const category = targetMonth?.categories?.find((item) => item.id === group.categoryId || item.name === group.subject);
    if (!targetMonth || !category) return;
    category.tasks ||= [];
    targetMonth.checks ||= {};
    targetMonth.notes ||= {};
    const temporaryTasks = category.tasks
      .filter((task) => task.type === 'temporary')
      .sort((a, b) => temporaryTaskIndex(a) - temporaryTaskIndex(b));
    const usedSlots = new Set(temporaryTasks
      .filter((task) => targetMonth.checks?.[task.id]?.[selectedCheckDay] || targetMonth.notes?.[task.id]?.[selectedCheckDay])
      .map((task) => temporaryTaskIndex(task)));
    let slot = 1;
    while (usedSlots.has(slot)) slot += 1;
    let task = temporaryTasks.find((item) => temporaryTaskIndex(item) === slot);
    if (!task) {
      task = createTemporaryTask(slot, targetMonth.days);
      category.tasks.push(task);
    }
    task.title = TEMPORARY_TASK_TITLE;
    task.type = 'temporary';
    task.temporaryIndex = slot;
    task.startDay = 1;
    task.endDay = targetMonth.days;
    task.checkMode = 'daily';
    targetMonth.checks[task.id] ||= {};
    targetMonth.notes[task.id] ||= {};
    delete targetMonth.checks[task.id][selectedCheckDay];
    targetMonth.notes[task.id][selectedCheckDay] = formatTemporaryTaskNote(content, remark);
    setState(next);
    cancelTemporaryTaskDraft(group);
    await persistState(next, '临时任务已保存到 SQLite');
  };

  const deleteTemporaryTaskEntry = async (row, day) => {
    if (!row || row.typeKey !== 'temporary' || !day) return;
    if (!await showAppConfirm('确定删除这条临时任务吗？删除后会同步清除本月打卡对应日期的状态和备注。', {
      title: '删除临时任务',
      confirmText: '删除',
      tone: 'danger',
    })) return;
    const next = structuredClone(stateRef.current || state || {});
    const targetMonth = next.months.find((item) => item.id === month.id);
    const category = targetMonth?.categories?.find((item) => item.id === row.categoryId || item.name === row.subject);
    if (!targetMonth || !category) return;
    targetMonth.checks ||= {};
    targetMonth.notes ||= {};
    if (targetMonth.checks[row.id]) {
      delete targetMonth.checks[row.id][day];
      if (!Object.keys(targetMonth.checks[row.id]).length) delete targetMonth.checks[row.id];
    }
    if (targetMonth.notes[row.id]) {
      delete targetMonth.notes[row.id][day];
      if (!Object.keys(targetMonth.notes[row.id]).length) delete targetMonth.notes[row.id];
    }
    const hasAnyTemporaryRecord = Boolean(
      Object.keys(targetMonth.checks?.[row.id] || {}).length ||
      Object.keys(targetMonth.notes?.[row.id] || {}).length
    );
    if (!hasAnyTemporaryRecord) {
      category.tasks = (category.tasks || []).filter((task) => task.id !== row.id);
      delete targetMonth.checks[row.id];
      delete targetMonth.notes[row.id];
    }
    setState(next);
    await persistState(next, '临时任务已删除并保存到 SQLite');
  };

  const enableBackfillMode = async () => {
    if (isBackfillMode) return;
    if (!await showAppConfirm('开启补录后，可以修改本月今天以前的打卡记录。补录完成后必须点击保存才会写入数据库，确定开启吗？', {
      title: '开启补录模式',
      confirmText: '开启补录',
      tone: 'warning',
    })) return;
    setIsBackfillMode(true);
  };

  const dayPoints = (day) =>
    rows.reduce((sum, row) => {
      if (!isTaskCheckableOnDay(row, day)) return sum;
      const status = getStatus(row.id, day);
      const base = row.subject === '好习惯' && status !== 'empty' ? habitPoints(row.habitPoints, pointConfig) : statusPoints(status, pointConfig);
      return sum + base;
    }, 0);

  const buildMonthExportSections = (targetMonth, statusFilter = monthExportStatusFilter) => {
    const shouldIncludeStatus = (status) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return status !== 'empty';
      if (statusFilter === 'unfinished') return status === 'empty';
      return true;
    };
    const now = new Date();
    const currentMonthKey = createMonthKey(now.getFullYear(), now.getMonth() + 1);
    const exportEndDay = targetMonth.key === currentMonthKey ? Math.min(targetMonth.days, now.getDate()) : targetMonth.days;
    const exportDays = Array.from({ length: exportEndDay }, (_, index) => index + 1);
    const targetRows = buildTaskRows(targetMonth);
    return exportDays.map((day) => {
      const dayRows = targetRows.flatMap((row) => {
        if (!isTaskActiveOnDay(row, day)) return [];
        const status = normalizeStatus(targetMonth?.checks?.[row.id]?.[day] || 'empty');
        if (!shouldIncludeStatus(status)) return [];
        const note = targetMonth.notes?.[row.id]?.[day];
        if (row.typeKey === 'temporary' && status === 'empty' && !note) return [];
        return [{
          row,
          task: row.typeKey === 'temporary' ? temporaryTaskTitleFromNote(note) || TEMPORARY_TASK_TITLE : row.item,
          status,
          statusLabel: exportStatusLabel(status),
          qualityLabel: exportQualityLabel(status),
          note: row.typeKey === 'temporary' ? temporaryTaskRemarkFromNote(note) : formatCellNote(note),
        }];
      });
      return { day, rows: dayRows };
    });
  };

  const buildMonthExportTableHtml = (targetMonth, statusFilter = monthExportStatusFilter) => {
    const dailySections = buildMonthExportSections(targetMonth, statusFilter);
    if (!dailySections.some((section) => section.rows.length)) {
      return '';
    }

    const withDayGaps = (items) => items.map((item, index) => (
      `${item}${index < items.length - 1 ? '<th class="day-gap"></th>' : ''}`
    )).join('');
    const weekSections = chunkByCalendarWeek(dailySections, targetMonth);
    const weekRows = weekSections.map((week, weekIndex) => {
      const colSpan = week.length * 5 + Math.max(0, week.length - 1);
      const maxRows = Math.max(...week.map((section) => Math.max(1, section.rows.length)));
      const dayHeaderCells = withDayGaps(week.map((section) => (
        `<th class="day-block" colspan="5">${excelEscape(`${targetMonth.month}月${section.day}日 ${weekday(targetMonth.key, section.day)}`)}</th>`
      )));
      const subHeaderCells = withDayGaps(week.map(() => (
        '<th class="fixed-head">分类</th><th class="task-head">每日任务</th><th>状态</th><th>完成质量</th><th>备注信息</th>'
      )));
      const bodyRows = Array.from({ length: maxRows }, (_, index) => (
        `<tr>${withDayGaps(week.map((section) => {
          const record = section.rows[index];
          if (!record) return '<td class="empty-day" colspan="5">&nbsp;</td>';
          const color = MONTH_EXPORT_COLORS[record.row.color] || MONTH_EXPORT_COLORS.blue;
          const statusClass = record.status === 'empty' ? 'status-empty' : 'status-done';
          return `<td class="subject" style="background:${color.header};color:#fff;">${excelEscape(record.row.subject)}</td><td class="task" style="background:${color.light};color:${color.text};">${excelEscape(record.task)}</td><td class="${statusClass}">${excelEscape(record.statusLabel)}</td><td class="quality">${excelEscape(record.qualityLabel)}</td><td class="note">${excelEscape(record.note)}</td>`;
        }))}</tr>`
      )).join('');
      return `<tr><th class="week-title" colspan="${colSpan}">第 ${weekIndex + 1} 周</th></tr><tr>${dayHeaderCells}</tr><tr>${subHeaderCells}</tr>${bodyRows}<tr class="week-gap"><td colspan="${colSpan}"></td></tr>`;
    }).join('');
    return `<table><tbody>${weekRows}</tbody></table>`;
  };

  const buildMonthExportFileHtml = (targetMonths, statusFilter = monthExportStatusFilter) => {
    const tablesHtml = targetMonths.map((targetMonth) => buildMonthExportTableHtml(targetMonth, statusFilter)).filter(Boolean).join('<br style="mso-data-placement:same-cell;" />');
    if (!tablesHtml) return '';
    const html = `<!doctype html><html><head><meta charset="UTF-8"><style>
      body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #273238; }
      table { border-collapse: collapse; mso-cellspacing: 0; mso-padding-alt: 0; }
      th, td { border: 1px solid #d8e1dc; padding: 8px 10px; font-size: 13px; vertical-align: middle; }
      th { background: #f4f8f6; color: #334247; font-weight: 700; text-align: center; }
      .week-title { background: #f29325; color: #fff; font-size: 16px; text-align: center; padding: 11px 14px; font-weight: 800; }
      .fixed-head { background: #edf6ef; color: #244730; min-width: 90px; }
      .task-head { background: #edf6ef; color: #244730; min-width: 220px; }
      .day-block { background: #dff3e5; color: #255f3b; font-size: 15px; text-align: center; padding: 11px 14px; }
      .day-gap { min-width: 30px; width: 30px; border: 0; background: #fff; padding: 0; }
      .subject { text-align: center; font-weight: 700; min-width: 78px; }
      .task { font-weight: 700; min-width: 240px; }
      .status-done { background: #edf9f0; color: #23733c; text-align: center; font-weight: 700; }
      .status-empty { background: #f7f8f7; color: #8a9692; text-align: center; }
      .quality { background: #fffdf8; text-align: center; font-weight: 700; color: #4f6658; }
      .note { background: #fff; min-width: 260px; color: #42525a; }
      .empty-day { background: #fff; color: #fff; text-align: center; border: 0; }
      .week-gap td { height: 36px; padding: 8px 10px; border: 0; background: #fff; }
    </style></head><body>${tablesHtml}</body></html>`;
    return html;
  };

  const downloadMonthExport = (targetMonths, filenamePrefix, statusFilter = monthExportStatusFilter) => {
    const html = buildMonthExportFileHtml(targetMonths, statusFilter);
    if (!html) {
      showAppAlert('当前筛选条件下没有可导出的打卡记录。', { title: '暂无记录', tone: 'warning' });
      return false;
    }
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filterLabel = MONTH_EXPORT_STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label || '全部状态';
    link.href = url;
    link.download = `${filenamePrefix}-本月打卡记录-${filterLabel}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  };

  const buildMonthWorksheetXml = (targetMonth, statusFilter = monthExportStatusFilter) => {
    const dailySections = buildMonthExportSections(targetMonth, statusFilter);
    if (!dailySections.some((section) => section.rows.length)) return '';

    const withDayGaps = (items) => items.map((item, index) => (
      `${item}${index < items.length - 1 ? '<Cell ss:StyleID="gap"/>' : ''}`
    )).join('');
    const weekSections = chunkByCalendarWeek(dailySections, targetMonth);
    const weekRows = weekSections.map((week, weekIndex) => {
      const colSpan = week.length * 5 + Math.max(0, week.length - 1);
      const maxRows = Math.max(...week.map((section) => Math.max(1, section.rows.length)));
      const dayHeaderCells = withDayGaps(week.map((section) => (
        `<Cell ss:MergeAcross="4" ss:StyleID="day"><Data ss:Type="String">${excelEscape(`${targetMonth.month}月${section.day}日 ${weekday(targetMonth.key, section.day)}`)}</Data></Cell>`
      )));
      const subHeaderCells = withDayGaps(week.map(() => (
        '<Cell ss:StyleID="head"><Data ss:Type="String">分类</Data></Cell><Cell ss:StyleID="head-task"><Data ss:Type="String">每日任务</Data></Cell><Cell ss:StyleID="head"><Data ss:Type="String">状态</Data></Cell><Cell ss:StyleID="head"><Data ss:Type="String">完成质量</Data></Cell><Cell ss:StyleID="head-note"><Data ss:Type="String">备注信息</Data></Cell>'
      )));
      const bodyRows = Array.from({ length: maxRows }, (_, index) => (
        `<Row ss:Height="18">${withDayGaps(week.map((section) => {
          const record = section.rows[index];
          if (!record) return '<Cell ss:MergeAcross="4" ss:StyleID="empty"/>';
          const statusClass = record.status === 'empty' ? 'status-empty' : 'status-done';
          const colorKey = MONTH_EXPORT_COLORS[record.row.color] ? record.row.color : 'blue';
          return `<Cell ss:StyleID="subject-${colorKey}"><Data ss:Type="String">${excelEscape(record.row.subject)}</Data></Cell><Cell ss:StyleID="task-${colorKey}"><Data ss:Type="String">${excelEscape(record.task)}</Data></Cell><Cell ss:StyleID="${statusClass}"><Data ss:Type="String">${excelEscape(record.statusLabel)}</Data></Cell><Cell ss:StyleID="quality"><Data ss:Type="String">${excelEscape(record.qualityLabel)}</Data></Cell><Cell ss:StyleID="note"><Data ss:Type="String">${excelEscape(record.note)}</Data></Cell>`;
        }))}</Row>`
      )).join('');
      return `<Row ss:Height="18"><Cell ss:MergeAcross="${colSpan - 1}" ss:StyleID="week"><Data ss:Type="String">第 ${weekIndex + 1} 周</Data></Cell></Row><Row ss:Height="20">${dayHeaderCells}</Row><Row ss:Height="18">${subHeaderCells}</Row>${bodyRows}<Row ss:Height="22"><Cell ss:MergeAcross="${colSpan - 1}" ss:StyleID="gap"/></Row>`;
    }).join('');
    const columns = Array.from({ length: 7 }, () => (
      '<Column ss:Width="52"/><Column ss:Width="235"/><Column ss:Width="42"/><Column ss:Width="52"/><Column ss:Width="90"/><Column ss:Width="18"/>'
    )).join('');
    return `<Worksheet ss:Name="${excelEscape(excelSheetName(targetMonth.short || targetMonth.label))}"><Table>${columns}${weekRows}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DoNotDisplayGridlines/></WorksheetOptions></Worksheet>`;
  };

  const buildYearExportWorkbookXml = (targetMonths, statusFilter = monthExportStatusFilter) => {
    const worksheets = targetMonths.map((targetMonth) => buildMonthWorksheetXml(targetMonth, statusFilter)).filter(Boolean).join('');
    if (!worksheets) return '';
    const borderXml = '<Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E1DC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E1DC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E1DC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E1DC"/></Borders>';
    const colorStyles = Object.entries(MONTH_EXPORT_COLORS).map(([key, color]) => (
      `<Style ss:ID="subject-${key}"><Font ss:Size="8" ss:Color="#FFFFFF"/><Interior ss:Color="${color.header}" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>${borderXml}</Style><Style ss:ID="task-${key}"><Font ss:Size="8" ss:Color="${color.text}"/><Interior ss:Color="${color.light}" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:WrapText="0" ss:ShrinkToFit="1"/>${borderXml}</Style>`
    )).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Microsoft YaHei" ss:Size="8"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style>
<Style ss:ID="week"><Font ss:Size="9" ss:Color="#FFFFFF"/><Interior ss:Color="#F29325" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>${borderXml}</Style>
<Style ss:ID="day"><Font ss:Size="9" ss:Color="#255F3B"/><Interior ss:Color="#DFF3E5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>${borderXml}</Style>
<Style ss:ID="head"><Font ss:Size="8" ss:Color="#244730"/><Interior ss:Color="#EDF6EF" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>${borderXml}</Style>
<Style ss:ID="head-task"><Font ss:Size="8" ss:Color="#244730"/><Interior ss:Color="#EDF6EF" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>${borderXml}</Style>
<Style ss:ID="head-note"><Font ss:Size="8" ss:Color="#244730"/><Interior ss:Color="#EDF6EF" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>${borderXml}</Style>
<Style ss:ID="status-done"><Font ss:Size="8" ss:Color="#23733C"/><Interior ss:Color="#EDF9F0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>${borderXml}</Style>
<Style ss:ID="status-empty"><Font ss:Size="8" ss:Color="#8A9692"/><Interior ss:Color="#F7F8F7" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>${borderXml}</Style>
<Style ss:ID="quality"><Font ss:Size="8" ss:Color="#4F6658"/><Interior ss:Color="#FFFDF8" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/>${borderXml}</Style>
<Style ss:ID="note"><Font ss:Size="8" ss:Color="#42525A"/><Alignment ss:Vertical="Center" ss:WrapText="1"/>${borderXml}</Style>
<Style ss:ID="empty"><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
<Style ss:ID="gap"><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
${colorStyles}
</Styles>${worksheets}</Workbook>`;
  };

  const downloadYearExport = (targetMonths, filenamePrefix, statusFilter = monthExportStatusFilter) => {
    const workbookXml = buildYearExportWorkbookXml(targetMonths, statusFilter);
    if (!workbookXml) {
      showAppAlert('当前筛选条件下没有可导出的打卡记录。', { title: '暂无记录', tone: 'warning' });
      return false;
    }
    const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filterLabel = MONTH_EXPORT_STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label || '全部状态';
    link.href = url;
    link.download = `${filenamePrefix}-本月打卡记录-${filterLabel}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  };

  const openMonthExportDialog = () => {
    setMonthExportDialog({
      scope: 'month',
      monthId: month.id,
      year: String(month.year),
      status: monthExportStatusFilter,
    });
  };

  const confirmMonthExport = () => {
    if (!monthExportDialog) return;
    setMonthExportStatusFilter(monthExportDialog.status || 'all');
    const targetMonths = monthExportDialog.scope === 'year'
      ? months.filter((item) => String(item.year) === String(monthExportDialog.year))
      : months.filter((item) => item.id === monthExportDialog.monthId);
    const filenamePrefix = monthExportDialog.scope === 'year' ? `${monthExportDialog.year}年` : targetMonths[0]?.label || month.label;
    const previousStatus = monthExportStatusFilter;
    const nextStatus = monthExportDialog.status || 'all';
    if (previousStatus !== nextStatus) {
      setMonthExportStatusFilter(nextStatus);
    }
    const ok = monthExportDialog.scope === 'year'
      ? downloadYearExport(targetMonths, filenamePrefix, nextStatus)
      : downloadMonthExport(targetMonths, filenamePrefix, nextStatus);
    if (ok) setMonthExportDialog(null);
  };

  const dailyPoints = Array.from({ length: month.days }, (_, index) => dayPoints(index + 1));
  const cumulativePoints = dailyPoints.reduce((list, value, index) => {
    list.push(value + (list[index - 1] || 0));
    return list;
  }, []);
  const cumulativePointsWithReadingRewards = cumulativePoints.map((value, index) => (
    value + completedReadingRewardsThroughDay(month, index + 1, pointConfig)
  ));
  const today = new Date();
  const isCurrentMonth = month.key === createMonthKey(today.getFullYear(), today.getMonth() + 1);
  const todayDay = isCurrentMonth ? today.getDate() : null;
  useEffect(() => {
    setSelectedTodayDay(isCurrentMonth && todayDay ? todayDay : 1);
  }, [month.id]);
  const selectedCheckDay = Math.max(1, Math.min(month.days, Number(selectedTodayDay || todayDay || 1)));
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedCheckDate = new Date(month.year, month.month - 1, selectedCheckDay);
  const isSelectedCheckFuture = selectedCheckDate > todayDateOnly;
  const isSelectedCheckToday = isCurrentMonth && selectedCheckDay === todayDay;
  const selectedCheckDayLabel = `${month.label} ${selectedCheckDay}日 · ${weekday(month.key, selectedCheckDay)}`;
  const selectedCheckViewLabel = isSelectedCheckFuture ? '未来日程' : isSelectedCheckToday ? '今日打卡' : '历史打卡';
  const changeTodayViewDay = (delta) => {
    setSelectedTodayDay((current) => Math.max(1, Math.min(month.days, Number(current || selectedCheckDay) + delta)));
  };
  const todayHidePrefix = selectedCheckDay ? `${month.key}-${selectedCheckDay}` : '';
  const todayRows = selectedCheckDay ? rows.filter((row) => taskCheckDayForToday(row, selectedCheckDay) !== null) : [];
  const isTodayRowCompleted = (row) => {
    const checkDay = stageCompletedDay(row, month, selectedCheckDay) || taskCheckDayForToday(row, selectedCheckDay);
    return checkDay !== null && getStatus(row.id, checkDay) !== 'empty';
  };
  const todayCompletedCount = selectedCheckDay ? todayRows.filter((row) => {
    return isTodayRowCompleted(row);
  }).length : 0;
  const isRequiredTodayTask = (row) => (
    REQUIRED_TODAY_SUBJECTS.includes(row.subject) &&
    row.typeKey !== 'stage' &&
    row.typeKey !== 'temporary' &&
    row.checkMode !== 'stage'
  );
  const todayRequiredRows = selectedCheckDay ? todayRows.filter(isRequiredTodayTask) : [];
  const todayRequiredCompletedCount = selectedCheckDay ? todayRequiredRows.filter((row) => {
    const checkDay = taskCheckDayForToday(row, selectedCheckDay);
    return checkDay !== null && getStatus(row.id, checkDay) !== 'empty';
  }).length : 0;
  const todayPendingCount = Math.max(0, todayRows.length - todayCompletedCount);
  const todayRequiredPendingRows = selectedCheckDay ? todayRows.filter((row) => {
    if (!isRequiredTodayTask(row)) return false;
    const checkDay = taskCheckDayForToday(row, selectedCheckDay);
    return checkDay !== null && getStatus(row.id, checkDay) === 'empty';
  }) : [];
  const todayRequiredPendingCount = todayRequiredPendingRows.length;
  const todayTaskGroups = todayRows.reduce((groups, row) => {
    const existing = groups.find((group) => group.subject === row.subject);
    if (existing) {
      existing.rows.push(row);
      return groups;
    }
    groups.push({
      categoryId: row.categoryId,
      subject: row.subject,
      color: row.color,
      badge: row.badge,
      rows: [row],
    });
    return groups;
  }, []).map((group) => ({
    ...group,
    completedCount: group.rows.filter(isTodayRowCompleted).length,
    requiredPendingCount: group.rows.filter((row) => {
      if (!isRequiredTodayTask(row)) return false;
      const checkDay = taskCheckDayForToday(row, selectedCheckDay);
      return checkDay !== null && getStatus(row.id, checkDay) === 'empty';
    }).length,
  }));
  const jumpToFirstRequiredPendingTask = () => {
    const target = todayRequiredPendingRows[0];
    if (!target) return;
    setCollapsedTodaySubjects((current) => ({ ...current, [target.subject]: false }));
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
    setCollapsedTodaySubjects((current) => ({ ...current, [target.subject]: false }));
    setTodayFocusTaskId(target.id);
    setExpandedTodayStageTasks((current) => ({ ...current, [`${todayHidePrefix}-${target.id}`]: true }));
    window.setTimeout(() => {
      const element = document.querySelector(`[data-today-task-id="${target.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
    window.setTimeout(() => setTodayFocusTaskId((current) => (current === target.id ? '' : current)), 1800);
  };
  const todayPoints = selectedCheckDay ? todayRows.reduce((sum, row) => {
    const checkDay = stageCompletedDay(row, month, selectedCheckDay) || taskCheckDayForToday(row, selectedCheckDay);
    const status = getStatus(row.id, checkDay);
    const base = row.subject === '好习惯' && status !== 'empty' ? habitPoints(row.habitPoints, pointConfig) : statusPoints(status, pointConfig);
    return sum + base;
  }, 0) : 0;
  const todayCompletionPercent = todayRows.length ? Math.round((todayCompletedCount / todayRows.length) * 100) : 0;
  const growthStageIndex = todayCompletionPercent <= 0 ? 0 : Math.min(GROWTH_TREE_IMAGES.length - 1, Math.ceil(todayCompletionPercent / 20));
  const growthTreeImage = GROWTH_TREE_IMAGES[growthStageIndex] || GROWTH_TREE_IMAGES[0];
  const dayHasCheckin = (day) => rows.some((row) => {
    if (!isTaskCheckableOnDay(row, day)) return false;
    return getStatus(row.id, day) !== 'empty';
  });
  const wateredDays = Array.from({ length: month.days }, (_, index) => index + 1)
    .filter((day) => dayHasCheckin(day)).length;
  const readingRewardPoints = completedReadingRewards(month, pointConfig);
  const monthPoints = cumulativePointsWithReadingRewards.at(-1) || 0;
  const earnedPointsForMonth = (candidateMonth) => {
    const candidateRows = buildTaskRows(candidateMonth);
    const taskPoints = Array.from({ length: candidateMonth.days }, (_, index) => index + 1).reduce((daySum, day) => (
      daySum + candidateRows.reduce((rowSum, row) => {
        if (!isTaskCheckableOnDay(row, day)) return rowSum;
        const status = normalizeStatus(candidateMonth.checks?.[row.id]?.[day] || 'empty');
        const base = row.subject === '好习惯' && status !== 'empty' ? habitPoints(row.habitPoints, pointConfig) : statusPoints(status, pointConfig);
        return rowSum + base;
      }, 0)
    ), 0);
    return taskPoints + completedReadingRewards(candidateMonth, pointConfig);
  };
  const rewardWallet = calculateRewardWallet(months, earnedPointsForMonth);
  const allMonthPoints = rewardWallet.earned;
  const redeemedRewards = months
    .flatMap((candidateMonth) => (candidateMonth.redeemedRewards || []).map((record) => ({ ...record, monthLabel: candidateMonth.label })))
    .sort((a, b) => String(b.redeemedAt || '').localeCompare(String(a.redeemedAt || '')));
  const redeemedRewardPoints = rewardWallet.redeemed;
  const availableRewardPoints = Math.max(0, allMonthPoints - redeemedRewardPoints);
  const readingBooksWithStats = (month.readingBooks || []).map((book) => ({ book, stats: readingBookStats(month, book, pointConfig) }));
  const plannedLibraryBookIds = new Set(months.flatMap((item) => item.readingBooks || []).map((book) => book.id));
  const finishedLibraryBookIds = new Set(months.flatMap((item) => (
    (item.readingBooks || [])
      .filter((book) => readingBookStats(item, book, pointConfig).isComplete)
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
  const activeMistakes = mistakeItems.filter((item) => !item.mastered);
  const archivedMistakes = mistakeItems.filter((item) => item.mastered);
  const mistakeStatus = mistakePage === 'archived' ? 'archived' : 'active';
  const mistakeFacetFilters = {
    status: mistakeStatus,
    term: mistakeTermFilter,
    subject: mistakeSubjectFilter,
    errorType: mistakeErrorFilter,
    source: mistakeSourceFilter,
    search: mistakeSearch,
    sort: mistakeSort,
  };
  const mistakeKnowledgeBase = filterMistakes(mistakeItems, mistakeFacetFilters);
  const mistakeKnowledgeStats = getMistakeKnowledgePointCounts(mistakeKnowledgeBase);
  const filteredMistakes = filterMistakes(mistakeItems, {
    ...mistakeFacetFilters,
    knowledgePoint: mistakeKnowledgeFilter,
  });
  const visibleMistakes = filteredMistakes.slice(0, mistakeVisibleLimit);
  const selectedMistake = filteredMistakes.find((item) => item.id === selectedMistakeId) || filteredMistakes[0] || null;
  const printableMistakes = filterMistakes(mistakeItems, {
    ...mistakeFacetFilters,
    status: 'active',
    knowledgePoint: mistakeKnowledgeFilter,
  });
  const mistakeSourceOptions = [...new Set(
    (mistakeStatus === 'archived' ? archivedMistakes : activeMistakes).map((item) => item.sourceTitle).filter(Boolean),
  )].sort((first, second) => first.localeCompare(second, 'zh-CN'));
  const mistakeTermOptions = [...new Set([
    ...LEARNING_TERMS,
    ...mistakeItems.map((item) => item.term).filter(Boolean),
  ])];
  const mistakePageSubjectStats = LEARNING_SUBJECTS.map((subject) => ({
    subject,
    count: filterMistakes(mistakeItems, {
      status: mistakeStatus,
      term: mistakeTermFilter,
      subject,
      errorType: mistakeErrorFilter,
      source: mistakeSourceFilter,
      search: mistakeSearch,
    }).length,
  }));
  const activeMistakeFilterCount = [
    mistakeTermFilter !== '全部学期',
    mistakeErrorFilter !== '全部错误类型',
    mistakeSourceFilter !== '全部来源',
    mistakeSort !== 'newest',
  ].filter(Boolean).length;

  useEffect(() => {
    setMistakeVisibleLimit(MISTAKE_PAGE_SIZE);
  }, [mistakePage, mistakeTermFilter, mistakeSubjectFilter, mistakeKnowledgeFilter, mistakeErrorFilter, mistakeSourceFilter, mistakeSearch, mistakeSort]);

  useEffect(() => {
    setMistakeMetadataDraft(null);
  }, [selectedMistake?.id]);
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
      const stats = readingBookStats(month, currentMonthBook, pointConfig);
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
          <p>{book.totalPages ? `共 ${book.totalPages} 页` : '总页数未设置'} · 读完奖励 +{book.rewardPoints || pointConfig.readingBook}</p>
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
          <strong>+{book.rewardPoints || pointConfig.readingBook}</strong>
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
          <button className={`reading-plan-toggle ${isReadingPlanOpen ? 'open' : ''}`} type="button" aria-expanded={isReadingPlanOpen} onClick={() => setExpandedReadingPlans((current) => ({ ...current, [book.id]: !current[book.id] }))}>
            <span>
              <strong>阅读计划</strong>
              <em>{stats.startDay}日 - {stats.endDay}日 · {stats.totalDays} 天</em>
            </span>
            <b aria-label={isReadingPlanOpen ? '收起阅读计划' : '展开阅读计划'}>
              <ChevronDown size={18} />
            </b>
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
                      <button
                        className="reading-plan-range"
                        type="button"
                        title="修改阅读范围"
                        aria-label={`修改第${record.dayIndex}天阅读范围：${record.startPage}至${record.endPage}页`}
                        onClick={() => setReadingPlanEditor({ bookId: book.id, bookName: book.name || '未命名书目', day: record.day, startPage: record.startPage, endPage: record.endPage })}
                      >
                        {record.startPage} 至 {record.endPage} 页
                      </button>
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
    const day = taskCheckDayForToday(row, selectedCheckDay);
    const isStageRangeTask = row.typeKey === 'stage' || row.typeKey === 'reading';
    const isTemporaryTask = row.typeKey === 'temporary';
    const isStageCheckMode = row.checkMode === 'stage';
    const completedStageDay = stageCompletedDay(row, month, selectedCheckDay);
    const effectiveDay = completedStageDay || day;
    const noteDay = (row.typeKey === 'stage' || row.typeKey === 'reading') && row.checkMode === 'stage' ? Number(row.startDay || effectiveDay) : effectiveDay;
    const value = getStatus(row.id, effectiveDay);
    const visualStatus = value;
    const note = month.notes?.[row.id]?.[noteDay];
    const notePanelKey = `${todayHidePrefix}-${row.id}-${noteDay}`;
    const isNoteExpanded = Boolean(expandedTodayNotes[notePanelKey]);
    const isReading = row.typeKey === 'reading';
    const readingNote = typeof note === 'object' && note ? note : {};
    const noteText = isTemporaryTask ? temporaryTaskRemarkFromNote(note) : formatCellNote(note);
    const isHabit = row.subject === '好习惯';
    const displayTitle = isTemporaryTask ? temporaryTaskTitleFromNote(note) || TEMPORARY_TASK_TITLE : row.item;
    const taskTypeLabel = isTemporaryTask ? '临时' : isStageRangeTask ? '阶段' : '每日';
    const checkModeLabel = isTemporaryTask ? '临时打卡' : isStageCheckMode ? '阶段打卡' : '每日打卡';
    const stageTaskKey = `${todayHidePrefix}-${row.id}`;
    const isCollapsed = isStageCheckMode && !expandedTodayStageTasks[stageTaskKey];
    const statusChips = isHabit
      ? [{ key: 'habit', label: `完成 +${habitPoints(row.habitPoints, pointConfig)} 分`, active: visualStatus !== 'empty' }]
      : [
        { key: 'done', label: '完成', active: visualStatus === 'done' },
        { key: 'excellent', label: `优秀 +${pointConfig.excellent} 分`, active: visualStatus === 'excellent' },
        { key: 'super', label: `非常优秀 +${pointConfig.super} 分`, active: visualStatus === 'super' },
      ];

    const todayStatusLabel = isHabit && visualStatus !== 'empty' ? '完成' : value === 'empty' ? '未打卡' : STATUS[value].label;

    if (isCollapsed) {
      return (
        <article className={`today-collapsed-task row-${row.color}`} key={row.id}>
          <div>
            <i>{row.badge}</i>
            <span>阶段打卡 · {row.startDay}日 - {row.endDay}日</span>
            <strong>{row.item}</strong>
          </div>
          <button onClick={() => setExpandedTodayStageTasks((current) => ({ ...current, [stageTaskKey]: true }))} type="button">
            展开打卡
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
              {displayTitle}
            </p>
            <div>
              <span className={`task-type-pill ${isTemporaryTask ? 'temporary-type' : isStageRangeTask ? 'stage-type' : 'daily-type'}`}>
                {isTemporaryTask ? <PlusCircle size={13} strokeWidth={2.8} /> : isStageRangeTask ? <CalendarDays size={13} strokeWidth={2.8} /> : <ClipboardCheck size={13} strokeWidth={2.8} />}
                {taskTypeLabel}
              </span>
              <span className={`check-mode-pill ${isTemporaryTask ? 'temporary-mode' : isStageCheckMode ? 'stage-mode' : 'daily-mode'}`}>{checkModeLabel}</span>
              {isStageRangeTask && <span className="task-date-range">{row.startDay}日 - {row.endDay}日</span>}
              <span className="score-chip-group">
                {statusChips.map((chip) => (
                  <b key={chip.key} className={`score-chip ${chip.active ? 'active' : ''}`}>{chip.label}</b>
                ))}
              </span>
            </div>
          </div>
        </div>

        <div className="today-check-panel">
          <button
            className={`today-status-button status-${visualStatus}`}
            disabled={isSelectedCheckFuture}
            onClick={() => {
              if (!isSelectedCheckFuture) cycleStatus(row.id, day, { allowActiveToday: true });
            }}
            title={isSelectedCheckFuture ? '未来日期只能查看、添加临时任务和编辑备注，不能提前打卡' : undefined}
            type="button"
          >
            {!isHabit && value === 'done' && <Check size={26} strokeWidth={3.2} />}
            {!isHabit && value === 'excellent' && <Star size={28} fill="currentColor" strokeWidth={2.8} />}
            {((isHabit && visualStatus !== 'empty') || value === 'super') && <span className="rose-icon" aria-hidden="true">🌹</span>}
            <strong>{todayStatusLabel}</strong>
          </button>
          {isStageCheckMode && (
            <button className="today-skip-button" onClick={() => setExpandedTodayStageTasks((current) => {
              const next = { ...current };
              delete next[stageTaskKey];
              return next;
            })} type="button">
              <span>阶段任务可以暂不打卡</span>
              <strong>点击这里可以收起</strong>
            </button>
          )}
        </div>

        <div className={`today-note-panel ${isNoteExpanded ? 'mobile-note-expanded' : 'mobile-note-collapsed'}`}>
          <button className="today-note-title" type="button" onClick={() => setExpandedTodayNotes((current) => ({ ...current, [notePanelKey]: !current[notePanelKey] }))}>
            <strong>{noteText ? '已备注' : '今日备注'}</strong>
            {noteText && <span>{noteText}</span>}
            <ChevronDown size={16} />
          </button>
          {isTemporaryTask && (
            <button className="today-temporary-delete" type="button" onClick={() => deleteTemporaryTaskEntry(row, effectiveDay)} title="删除临时任务" aria-label="删除临时任务">
              <Trash2 size={15} />
            </button>
          )}
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
            <input
              className="today-note-input"
              value={isTemporaryTask ? temporaryTaskRemarkInputFromNote(note) : typeof note === 'string' ? note : ''}
              placeholder="写下今天完成了什么、哪里需要改进..."
              onChange={(event) => {
                if (isTemporaryTask) {
                  updateTemporaryTaskRemark(row, noteDay, event.target.value);
                } else {
                  updateCellNote(row.id, noteDay, event.target.value);
                }
              }}
            />
          )}
        </div>
      </article>
    );
  };
  const renderTodayTaskGroup = (group) => {
    const isCollapsed = Boolean(collapsedTodaySubjects[group.subject]);
    const total = group.rows.length;
    const draftKey = temporaryDraftKey(month.id, group.categoryId, selectedCheckDay);
    const temporaryDraft = temporaryTaskDrafts[draftKey];
    return (
      <section className={`today-task-group row-${group.color} ${isCollapsed ? 'collapsed' : ''}`} key={group.subject}>
        <button
          className="today-task-group-head"
          type="button"
          aria-expanded={!isCollapsed}
          onClick={() => setCollapsedTodaySubjects((current) => ({ ...current, [group.subject]: !current[group.subject] }))}
        >
          <div className="today-task-group-title">
            <i>{group.badge}</i>
            <span>
              <strong>{group.subject}</strong>
              <em>{group.completedCount}/{total} 已打卡{group.requiredPendingCount ? ` · ${group.requiredPendingCount} 个必打卡未完成` : ''}</em>
            </span>
          </div>
          <div className="today-task-group-meta">
            <b>{total} 项</b>
            <ChevronDown size={20} />
          </div>
        </button>
        {!isCollapsed && (
          <div className="today-task-group-body">
            {group.rows.map(renderTodayTaskCard)}
            {temporaryDraft && (
              <div className="temporary-task-panel">
                <div className="temporary-task-panel-head">
                  <PlusCircle size={18} />
                  <strong>添加临时任务</strong>
                  <span>会同步到本月打卡的临时任务行</span>
                </div>
                <div className="temporary-task-fields">
                  <label>
                    <span>任务内容</span>
                    <input value={temporaryDraft.content || ''} placeholder="例如：整理错题、背诵课文第3段" onChange={(event) => updateTemporaryTaskDraft(group, { content: event.target.value })} />
                  </label>
                  <label>
                    <span>备注信息</span>
                    <input value={temporaryDraft.remark || ''} placeholder="补充页码、要求或完成情况" onChange={(event) => updateTemporaryTaskDraft(group, { remark: event.target.value })} />
                  </label>
                </div>
                <div className="temporary-task-actions">
                  <p>保存后先显示为未打卡，再像其它任务一样点击打卡。</p>
                  <div className="temporary-task-save-actions">
                    <button className="ghost" type="button" onClick={() => cancelTemporaryTaskDraft(group)}>取消</button>
                    <button className="primary" type="button" onClick={() => saveTemporaryTaskDraft(group)}>
                      <Save size={16} />保存
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button className="temporary-task-add-button" type="button" onClick={() => openTemporaryTaskDraft(group)}>
              <PlusCircle size={17} />添加临时任务
            </button>
          </div>
        )}
      </section>
    );
  };

  const renderMonthExportTools = () => (
    <div className="month-export-tools">
      <button className="month-export-button" onClick={openMonthExportDialog} type="button" title="导出打卡记录">
        <Download size={16} />
        导出
      </button>
    </div>
  );

  return (
    <main className="premium-app">
      <aside className="side-rail">
        <div className="rail-card">
          <div className="rail-sapling-card" aria-label="今日成长树">
            <div className="sapling-scene">
              <img src={growthTreeImage} alt="" />
            </div>
            <strong>成长中</strong>
            <span>{todayCompletedCount}/{todayRows.length || 0} 今日打卡</span>
            <div className="sapling-progress" style={{ '--growth-percent': `${todayCompletionPercent}%` }}>
              <i />
            </div>
            <em>已浇水 {wateredDays} 天</em>
          </div>
          <nav>
            {NAV_ITEMS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={(label === '今日打卡' && (activeView === 'today' || activeView === 'home')) || (label === '积分奖励' && activeView === 'rewards') || (label === '设置中心' && activeView === 'settings') || (label === '阅读书单' && activeView === 'books') || (label === '学习工具' && activeView === 'tools') ? 'active' : ''}
                onClick={() => {
                  if (label === '今日打卡') setActiveView('today');
                  if (label === '设置中心') setActiveView('settings');
                  if (label === '积分奖励') setActiveView('rewards');
                  if (label === '阅读书单') setActiveView('books');
                  if (label === '学习工具') setActiveView('tools');
                }}
              >
                <Icon size={25} strokeWidth={((label === '今日打卡' && (activeView === 'today' || activeView === 'home')) || (label === '积分奖励' && activeView === 'rewards') || (label === '设置中心' && activeView === 'settings') || (label === '阅读书单' && activeView === 'books') || (label === '学习工具' && activeView === 'tools')) ? 2.6 : 2.2} />
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
              <button className="mascot-card" type="button" onClick={openProfileDialog} aria-label="设置小朋友信息" title="设置小朋友信息">
                <img src={profile.avatarData || mascotImage} alt={`${profile.name || '小朋友'}头像`} />
                <span><Pencil size={16} /></span>
              </button>
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
                <button onClick={() => setActiveView('home')} type="button">本月打卡</button>
              </div>
              {renderMonthExportTools()}
            </div>

            <div className={`today-hero ${isSelectedCheckFuture ? 'future-view' : ''}`}>
              <div>
                <p>{selectedCheckViewLabel}</p>
                <h2>{selectedCheckDayLabel}</h2>
                <span>{isSelectedCheckFuture ? '未来日期可以查看计划、添加临时任务和编辑备注，不能提前打卡。' : '把这一天要做的事情一项项完成，备注也可以在这里直接写清楚。'}</span>
              </div>
              <div className="today-hero-actions">
                <div className="today-day-switch" aria-label="切换每日打卡日期">
                  <button onClick={() => changeTodayViewDay(-1)} disabled={selectedCheckDay <= 1} aria-label="前一天" type="button">
                    <ChevronLeft size={18} />
                  </button>
                  <strong>{selectedCheckDay}日</strong>
                  <button onClick={() => changeTodayViewDay(1)} disabled={selectedCheckDay >= month.days} aria-label="后一天" type="button">
                    <ChevronRight size={18} />
                  </button>
                </div>
                {isCurrentMonth && todayDay && selectedCheckDay !== todayDay && (
                  <button className="ghost" onClick={() => setSelectedTodayDay(todayDay)} type="button">回到今天</button>
                )}
                <button onClick={saveCurrentState}><Save size={18} />保存状态</button>
              </div>
            </div>

            <div className="mobile-growth-card" aria-label="今日成长树">
              <img src={growthTreeImage} alt="" />
              <div>
                <strong>今日成长</strong>
                <span>{todayCompletedCount}/{todayRows.length || 0} 已完成 · 已浇水 {wateredDays} 天</span>
                <i style={{ '--growth-percent': `${todayCompletionPercent}%` }} />
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
                {todayTaskGroups.map(renderTodayTaskGroup)}
              </div>
            ) : (
              <div className="today-empty">
                <CalendarDays size={46} />
                <strong>这一天没有可打卡任务</strong>
                <p>如果需要查看或调整任务安排，可以进入本月打卡或设置中心。</p>
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
              <button className="active" onClick={() => setActiveView('home')} type="button">本月打卡</button>
            </div>
            {renderMonthExportTools()}
          </div>

          <div className="legend-bar">
            <div className="legend-items">
              <span><i className="legend-dot status-done"><Check size={12} /></i>已完成</span>
              <span><i className="legend-dot status-excellent"><Star size={12} fill="currentColor" /></i>优秀 +{pointConfig.excellent}分</span>
              <span><i className="legend-dot status-super"><span className="rose-icon">🌹</span></i>非常优秀 +{pointConfig.super}分</span>
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
                        {row.typeKey === 'temporary' ? temporaryTaskDisplayTitle(month, row.id, selectedCheckDay) : row.item}
                      </p>
                    </td>
                    {(row.typeKey === 'stage' || row.typeKey === 'reading') && row.checkMode === 'stage' ? (() => {
                      const startDay = Math.max(1, Math.min(month.days, Number(row.startDay || 1)));
                      const endDay = Math.max(startDay, Math.min(month.days, Number(row.endDay || startDay)));
                      const activeStageDay = isCurrentMonth && todayDay && todayDay >= startDay && todayDay <= endDay ? todayDay : null;
                      const completedDay = stageCompletedDay(row, month, todayDay || endDay);
                      const checkDay = completedDay || activeStageDay || startDay;
                      const value = getStatus(row.id, checkDay);
                      const isPast = isBeforeToday(month.key, checkDay);
                      const canBackfill = Boolean(isBackfillMode && isCurrentMonth && todayDay && checkDay < todayDay);
                      const canEdit = Boolean(activeStageDay) || !isPast || canBackfill;
                      const note = month.notes?.[row.id]?.[checkDay];
                      const noteText = formatCellNote(note);
                      return (
                        <>
                          {Array.from({ length: startDay - 1 }, (_, index) => (
                            <td key={`before-${index}`} className="mark-cell inactive-cell" />
                          ))}
                          <td
                            colSpan={endDay - startDay + 1}
                            className={`mark-cell stage-span-cell ${!canEdit ? 'past-cell' : ''} ${canBackfill ? 'backfill-cell' : ''} ${note ? 'has-note' : ''}`}
                            title={noteText || undefined}
                            onClick={() => {
                              if (canEdit) cycleStatus(row.id, checkDay, { allowActiveToday: Boolean(activeStageDay) || canBackfill, manualSaveOnly: true });
                            }}
                          >
                            <StatusButton value={value} disabled={!canEdit} label={`${row.subject}${row.type}${startDay}日至${endDay}日${STATUS[value].label}${!canEdit ? '，已锁定' : ''}`} />
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
                        const isTemporaryReadonly = row.typeKey === 'temporary';
                        const isPast = isBeforeToday(month.key, day);
                        const canBackfill = !isTemporaryReadonly && Boolean(isBackfillMode && isCurrentMonth && todayDay && day < todayDay);
                        const canEdit = isCheckable && !isTemporaryReadonly && (!isPast || canBackfill);
                        const note = month.notes?.[row.id]?.[day];
                        const noteText = isTemporaryReadonly ? formatTemporaryTaskMonthNote(note) : formatCellNote(note);
                        const cellTitle = isTemporaryReadonly ? [noteText, '操作提示：请在今日打卡中操作'].filter(Boolean).join('\n') : noteText;
                        const shouldShowTooltipLeft = day > month.days - 5;
                        return (
                          <td
                            key={day}
                            className={`mark-cell ${isActive ? '' : 'inactive-cell'} ${isActive && !isCheckable ? 'range-cell' : ''} ${isCheckable && isPast && !canBackfill ? 'past-cell' : ''} ${isCheckable && canBackfill ? 'backfill-cell' : ''} ${isTemporaryReadonly ? 'temporary-readonly-cell' : ''} ${shouldShowTooltipLeft ? 'tooltip-left' : ''} ${note ? 'has-note' : ''}`}
                            title={!isTemporaryReadonly && cellTitle ? cellTitle : undefined}
                            data-note-tooltip={cellTitle || undefined}
                            onClick={() => {
                              if (canEdit) cycleStatus(row.id, day, { allowActiveToday: canBackfill, manualSaveOnly: true });
                            }}
                          >
                            {isCheckable && (
                              <>
                                <StatusButton value={value} disabled={isTemporaryReadonly || (isPast && !canBackfill)} label={`${row.subject}${row.type}${day}日${STATUS[value].label}${isTemporaryReadonly ? '，请在今日打卡中操作' : isPast && !canBackfill ? '，已锁定' : ''}`} />
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
                  {cumulativePointsWithReadingRewards.map((value, index) => <td key={index}>{value || '-'}</td>)}
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
                <b>+2分</b>
                <p>完成质量较好时使用，计入本月积分。</p>
              </div>
              <div className="rule-status-row">
                <span><i className="legend-dot status-super"><span className="rose-icon">🌹</span></i>非常优秀</span>
                <b>+5分</b>
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
                <button className="reward-add-button" onClick={() => setNewRewardDialog({ name: '', points: '', description: '', type: '文具用品', icon: 'PenLine' })}>
                  <Gift size={18} />
                  新增奖励
                </button>
                <button className="reward-config-button" onClick={openPointConfigDialog}>
                  <Wrench size={18} />
                  积分配置
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
                <span>{displayedRewards.length} / {rewardConfig.length} 个奖励</span>
              </header>
              <div className="reward-type-filter" aria-label="奖励类型筛选">
                <button type="button" className={rewardTypeFilter === '全部' ? 'active' : ''} onClick={() => setRewardTypeFilter('全部')}>
                  全部 <b>{rewardConfig.length}</b>
                </button>
                {REWARD_TYPES.map((item) => (
                  <button type="button" key={item.type} className={rewardTypeFilter === item.type ? 'active' : ''} onClick={() => setRewardTypeFilter(item.type)}>
                    {item.type} <b>{rewardTypeCounts[item.type] || 0}</b>
                  </button>
                ))}
              </div>
              <div className="reward-gallery">
                {displayedRewards.map((item, index) => (
                  (() => {
                    const points = Number(item.points || 0);
                    const key = rewardKey(item, index);
                    const redeemedCount = redeemedRewards.filter((record) => record.rewardId === key).length;
                    const canRedeem = points > 0 && availableRewardPoints >= points;
                    const missingPoints = Math.max(0, points - availableRewardPoints);
                    const typeMeta = rewardTypeMeta(item.type);
                    const RewardIcon = REWARD_ICON_COMPONENTS[item.icon] || REWARD_ICON_COMPONENTS[typeMeta.icon] || Gift;
                    return (
                      <article className={`reward-shop-card ${canRedeem ? 'can-redeem' : ''} ${redeemedCount ? 'redeemed' : ''}`} key={key}>
                        <div className="reward-card-tools">
                          <button type="button" title="删除奖励" aria-label={`删除${item.name || '奖励'}`} onClick={() => deleteReward(item)}>
                            <Trash2 size={15} />
                          </button>
                          <button type="button" title="编辑奖励" aria-label={`编辑${item.name || '奖励'}`} onClick={() => openEditRewardDialog(item)}>
                            <Pencil size={15} />
                          </button>
                        </div>
                        <div className="reward-product-icon">
                          <RewardIcon size={38} strokeWidth={2.4} />
                        </div>
                        <span className="reward-type-badge">{typeMeta.type}</span>
                        <h3>{item.name || '未命名奖励'}</h3>
                        <strong>{item.points || '____'} 分</strong>
                        <p>{item.description || (canRedeem ? '可以兑换啦' : `还差 ${missingPoints} 分`)}</p>
                        {redeemedCount > 0 && <em className="reward-redeemed-count">已兑奖 {redeemedCount} 次</em>}
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
                    <strong>{activeMistakes.length}</strong>
                    <span>道待复习</span>
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
                      <div className="auto-subject-value"><Sparkles size={16} />AI 自动识别</div>
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
                  <div className="homework-uploader">
                    {graderDraft.imageData ? (
                      <img src={graderDraft.imageData} alt="作业照片预览" />
                    ) : (
                      <span><Upload size={34} />请拍照或上传一张清晰的作业图片</span>
                    )}
                  </div>
                  <div className="homework-source-actions">
                    <label>
                      <Camera size={18} />
                      拍照
                      <input type="file" accept="image/*" capture="environment" onChange={handleHomeworkImageChange} />
                    </label>
                    <label>
                      <Upload size={18} />
                      上传图片
                      <input type="file" accept="image/*" onChange={handleHomeworkImageChange} />
                    </label>
                  </div>
                  {isPreparingHomeworkImage ? <p className="upload-hint">正在处理图片，请稍等...</p> : graderDraft.imageName && <p className="upload-hint">已压缩：{graderDraft.imageName}</p>}
                  {gradingError && !displayHomeworkReview && <p className="upload-error">{gradingError}</p>}
                  <div className="grader-actions">
                    <button onClick={generateHomeworkReview} disabled={isGradingHomework || isPreparingHomeworkImage}>
                      <Sparkles size={18} />
                      {isPreparingHomeworkImage ? '正在处理图片...' : isGradingHomework ? `${homeworkGradingStatusText(gradingStage, gradingElapsedSeconds)} ${gradingElapsedSeconds}s` : '生成批改结果'}
                    </button>
                    <button
                      className="ghost"
                      onClick={() => {
                        if (isGradingHomework) {
                          cancelHomeworkGrading();
                          return;
                        }
                        homeworkImageRef.current = '';
                        homeworkDetailImagesRef.current = [];
                        homeworkLocalizationImageRef.current = '';
                        setGraderDraft(DEFAULT_GRADER_DRAFT);
                        setLatestReview(null);
                        setShowPreviousReview(true);
                        setGradingError('');
                      }}
                      disabled={isPreparingHomeworkImage}
                    >
                      {isGradingHomework ? '取消批改' : '重新开始'}
                    </button>
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
                      const collectedMistakeKeys = new Set(mistakeItems.map((mistake) => mistakeCollectionKey(mistake)));
                      const decidedReviewMistakes = reviewMistakes.map((mistake) => ({
                        ...mistake,
                        reviewDecision: collectedMistakeKeys.has(mistakeCollectionKey(mistake, review.id))
                          ? 'collected'
                          : normalizeReviewMistakeDecision(mistake.reviewDecision),
                      }));
                      const includedReviewMistakes = decidedReviewMistakes.filter((mistake) => mistake.reviewDecision !== 'ignored');
                      const reviewAnnotations = normalizeReviewAnnotations(review.imageAnnotations);
                      const visibleAnnotations = reviewAnnotations.length
                        ? filterIgnoredReviewAnnotations(reviewAnnotations, decidedReviewMistakes)
                        : includedReviewMistakes.length ? buildFallbackAnnotations(includedReviewMistakes) : [];
                      const isApproximateAnnotations = review.annotationQuality === 'approximate'
                        || (!reviewAnnotations.length && includedReviewMistakes.length > 0);
                      const reviewDecisionCounts = decidedReviewMistakes.reduce((counts, mistake) => ({
                        ...counts,
                        [mistake.reviewDecision]: counts[mistake.reviewDecision] + 1,
                      }), { pending: 0, collected: 0, ignored: 0 });
                      const reviewImageUrl = review.annotatedImageUrl || (review.id === latestReview?.id ? homeworkImageRef.current || graderDraft.imageData : '');
                      return (
                        <>
                          {gradingError && <div className="grading-error">{gradingError}</div>}
                          <div className="review-result-overview">
                            <span>{review.detectedSubject || review.subject}{review.subjectConfidence ? ` · ${review.subjectConfidence}置信度` : ''}</span>
                            <h4>{review.detectedTitle || review.title}</h4>
                            <p>{review.summary}</p>
                            {review.recognizedQuestionCount > 0 && <small>识别 {review.recognizedQuestionCount} 题{review.uncertainQuestionCount > 0 ? `，${review.uncertainQuestionCount} 题无法可靠判断` : ''}</small>}
                            {review.gradingWarning && <small>质量提示：{review.gradingWarning}</small>}
                          </div>
                          {reviewImageUrl && (
                            <>
                              <div className="review-section-title">
                                <strong>AI 批改图</strong>
                                <button className="download-annotated-button" onClick={() => downloadAnnotatedHomeworkImage(review)} disabled={!visibleAnnotations.length} type="button">下载批改图</button>
                                <span>{visibleAnnotations.length} 处{isApproximateAnnotations ? '大致' : ''}标注</span>
                              </div>
                              <div className="annotated-homework">
                                <img src={reviewImageUrl} alt="原图批改标注" />
                                {visibleAnnotations.length ? visibleAnnotations.map((annotation) => (
                                  <i
                                    key={`${annotation.order}-${annotation.status}`}
                                    className={`homework-mark ${annotation.status} ${annotation.approximate ? 'approximate' : ''} ${annotation.area.width > 45 ? 'wide-area' : ''}`}
                                    style={{
                                      left: `${annotation.area.left}%`,
                                      top: `${annotation.area.top}%`,
                                      width: `${annotation.area.width}%`,
                                      height: `${annotation.area.height}%`,
                                    }}
                                  >
                                    <b>{annotation.questionNumber || annotation.order}</b>
                                    <span>{annotation.label}</span>
                                    {(annotation.comment || annotation.correctAnswer) && (
                                      <em className={annotation.area.left + annotation.area.width > 62 ? 'place-left' : ''}>
                                        {annotation.comment && <small>{annotation.comment}</small>}
                                        {annotation.correctAnswer && <small>正确：{annotation.correctAnswer}</small>}
                                      </em>
                                    )}
                                  </i>
                                )) : (
                                  <div className="annotation-empty-note success">
                                    {decidedReviewMistakes.length && !includedReviewMistakes.length ? '已忽略全部 AI 错题标记。' : '本次没有发现明确错题，原图无需标记。'}
                                  </div>
                                )}
                                {isApproximateAnnotations && <div className="annotation-empty-note">{review.localizationWarning || '本次错题位置仅为大致范围；请以错题明细为准，并可忽略 AI 误判。'}</div>}
                              </div>
                            </>
                          )}
                          <div className="review-section-title">
                            <strong>错题明细</strong>
                            <span>待处理 {reviewDecisionCounts.pending} · 已收录 {reviewDecisionCounts.collected} · 已忽略 {reviewDecisionCounts.ignored}</span>
                          </div>
                          <div className="review-mistake-list">
                            {decidedReviewMistakes.length ? decidedReviewMistakes.map((mistake) => {
                              const actionId = `${review.id}-${mistake.id}`;
                              const isCurrentAction = reviewMistakeActionId === actionId;
                              const actionsDisabled = Boolean(reviewMistakeActionId);
                              return (
                              <article className={`review-mistake-item ${mistake.reviewDecision}`} key={mistake.id}>
                                <i className={`wrong-stamp ${mistake.reviewDecision === 'ignored' ? 'ignored' : ''}`}>
                                  {mistake.reviewDecision === 'ignored' ? '已忽略' : '错题'}
                                </i>
                                {mistake.questionImageUrl && <img className="mistake-question-image" src={mistake.questionImageUrl} alt="原题截图" />}
                                <b className="review-question-text">题目：{mistake.question}</b>
                                <div className="review-answer-comparison">
                                  <div>
                                    <small>本次作答</small>
                                    <strong>{mistake.answer || '未识别'}</strong>
                                  </div>
                                  <div className="correct-answer">
                                    <small>正确答案</small>
                                    <strong>{mistake.correctAnswer}</strong>
                                  </div>
                                </div>
                                <div className="review-analysis-section error-reason">
                                  <strong>错误原因</strong>
                                  <p>{mistake.errorReason || mistake.shortComment || mistake.explanation}</p>
                                </div>
                                <div className="review-analysis-section solution-process">
                                  <strong>正确解题过程</strong>
                                  <ol>
                                    {normalizeSolutionSteps(mistake.solutionSteps, mistake.explanation).map((step, index) => <li key={`${mistake.id}-step-${index}`}>{step}</li>)}
                                  </ol>
                                </div>
                                {mistake.explanation && <p className="review-method-summary"><em>方法总结：</em>{mistake.explanation}</p>}
                                <footer className="review-mistake-actions">
                                  {mistake.reviewDecision === 'pending' ? (
                                    <>
                                      <button className="collect-one" onClick={() => setReviewMistakeDecision(review, mistake, 'collected')} disabled={actionsDisabled} type="button">
                                        <PlusCircle size={17} />
                                        {isCurrentAction ? '正在收录...' : '收录这道错题'}
                                      </button>
                                      <button className="ignore-one" onClick={() => setReviewMistakeDecision(review, mistake, 'ignored')} disabled={actionsDisabled} type="button">
                                        <EyeOff size={17} />忽略误判
                                      </button>
                                    </>
                                  ) : mistake.reviewDecision === 'collected' ? (
                                    <span className="review-decision-state collected"><Check size={17} />已收录到错题集</span>
                                  ) : (
                                    <>
                                      <span className="review-decision-state ignored"><EyeOff size={17} />已忽略，不会进入错题集</span>
                                      <button className="restore-one" onClick={() => setReviewMistakeDecision(review, mistake, 'pending')} disabled={actionsDisabled} type="button">
                                        <RotateCcw size={16} />{isCurrentAction ? '正在恢复...' : '恢复待处理'}
                                      </button>
                                    </>
                                  )}
                                </footer>
                              </article>
                              );
                            }) : <div className="review-no-mistake">这次批改没有发现明确错题。</div>}
                          </div>
                          <div className="review-section-title">
                            <strong>订正建议</strong>
                          </div>
                          <div className="review-suggestions">
                            {normalizeReviewSuggestions(review.suggestions).map((item) => <span key={item}>{item}</span>)}
                          </div>
                          {decidedReviewMistakes.length > 0 && (
                            <div className="review-decision-summary">
                              <span>共 {decidedReviewMistakes.length} 道</span>
                              <b>{reviewDecisionCounts.pending} 道待处理</b>
                              <span>{reviewDecisionCounts.collected} 道已收录</span>
                              <span>{reviewDecisionCounts.ignored} 道已忽略</span>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="review-empty">
                      <ClipboardCheck size={42} />
                      <strong>{isGradingHomework ? `${homeworkGradingStatusText(gradingStage, gradingElapsedSeconds)}，已等待 ${gradingElapsedSeconds} 秒` : '上传照片后，这里会显示批改结果'}</strong>
                      <p>{gradingError || (isGradingHomework ? '服务器会在后台持续处理，网络短暂波动不会中断任务；可以随时点击“取消批改”。' : '会列出错题、正确答案、原因和练习建议。')}</p>
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <section className="mistake-book-page">
                <header className="mistake-book-header">
                  <div>
                    <p>错题集</p>
                    <h3>{mistakePage === 'archived' ? '已掌握归档' : '按知识点集中复习薄弱题目'}</h3>
                    <span>{mistakePage === 'archived' ? '归档题不参与待复习统计和组卷，可以随时恢复。' : '先选学科和知识点，再在右侧查看完整题目与解析。'}</span>
                  </div>
                  {mistakePage === 'active' && (
                    <button className="print-paper-button" onClick={() => printMistakePaper()} disabled={!printableMistakes.length} type="button">
                      <Printer size={17} />
                      生成练习卷
                      <b>{printableMistakes.length}</b>
                    </button>
                  )}
                </header>

                <div className="mistake-status-tabs" role="tablist" aria-label="错题状态">
                  <button
                    className={mistakePage === 'active' ? 'active' : ''}
                    onClick={() => {
                      setMistakePage('active');
                      setMistakeKnowledgeFilter('全部知识点');
                      setMistakeSourceFilter('全部来源');
                      setSelectedMistakeId('');
                      setMistakeDetailOpen(false);
                    }}
                    type="button"
                    role="tab"
                    aria-selected={mistakePage === 'active'}
                  >
                    <FileText size={17} />
                    待复习
                    <span>{activeMistakes.length}</span>
                  </button>
                  <button
                    className={mistakePage === 'archived' ? 'active' : ''}
                    onClick={() => {
                      setMistakePage('archived');
                      setMistakeKnowledgeFilter('全部知识点');
                      setMistakeSourceFilter('全部来源');
                      setSelectedMistakeId('');
                      setMistakeDetailOpen(false);
                    }}
                    type="button"
                    role="tab"
                    aria-selected={mistakePage === 'archived'}
                  >
                    <Archive size={17} />
                    已掌握归档
                    <span>{archivedMistakes.length}</span>
                  </button>
                </div>

                <div className="mistake-primary-filters">
                  <div className="mistake-subject-filter" role="group" aria-label="学科筛选">
                    <button
                      className={mistakeSubjectFilter === '全部' ? 'active' : ''}
                      onClick={() => {
                        setMistakeSubjectFilter('全部');
                        setMistakeKnowledgeFilter('全部知识点');
                        setSelectedMistakeId('');
                      }}
                      type="button"
                    >
                      全部 <span>{mistakePageSubjectStats.reduce((sum, item) => sum + item.count, 0)}</span>
                    </button>
                    {mistakePageSubjectStats.map((item) => (
                      <button
                        key={item.subject}
                        className={mistakeSubjectFilter === item.subject ? 'active' : ''}
                        data-subject={item.subject}
                        onClick={() => {
                          setMistakeSubjectFilter(item.subject);
                          setMistakeKnowledgeFilter('全部知识点');
                          setSelectedMistakeId('');
                        }}
                        type="button"
                      >
                        {item.subject} <span>{item.count}</span>
                      </button>
                    ))}
                  </div>
                  <label className="mistake-search-field">
                    <Search size={17} />
                    <input value={mistakeSearch} onChange={(event) => setMistakeSearch(event.target.value)} placeholder="搜索题目、知识点或来源" />
                    {mistakeSearch && (
                      <button onClick={() => setMistakeSearch('')} type="button" title="清除搜索" aria-label="清除搜索"><X size={15} /></button>
                    )}
                  </label>
                  <button className="mistake-filter-toggle" onClick={() => setMistakeFiltersOpen(true)} type="button" aria-label="打开筛选">
                    <SlidersHorizontal size={18} />
                    筛选
                    {activeMistakeFilterCount > 0 && <span>{activeMistakeFilterCount}</span>}
                  </button>
                </div>

                {mistakeFiltersOpen && <button className="mistake-filter-backdrop" onClick={() => setMistakeFiltersOpen(false)} type="button" aria-label="关闭筛选" />}
                <div className={`mistake-advanced-filters ${mistakeFiltersOpen ? 'open' : ''}`}>
                  <header>
                    <strong>筛选与排序</strong>
                    <button onClick={() => setMistakeFiltersOpen(false)} type="button" title="关闭筛选" aria-label="关闭筛选"><X size={18} /></button>
                  </header>
                  <label>
                    <span>学期</span>
                    <select value={mistakeTermFilter} onChange={(event) => {
                      setMistakeTermFilter(event.target.value);
                      setMistakeKnowledgeFilter('全部知识点');
                    }}>
                      <option value="全部学期">全部学期</option>
                      {mistakeTermOptions.map((term) => <option key={term} value={term}>{term}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>来源</span>
                    <select value={mistakeSourceFilter} onChange={(event) => setMistakeSourceFilter(event.target.value)}>
                      <option value="全部来源">全部来源</option>
                      {mistakeSourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>错误类型</span>
                    <select value={mistakeErrorFilter} onChange={(event) => setMistakeErrorFilter(event.target.value)}>
                      <option value="全部错误类型">全部错误类型</option>
                      {MISTAKE_ERROR_TYPES.map((errorType) => <option key={errorType} value={errorType}>{errorType}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>排序</span>
                    <select value={mistakeSort} onChange={(event) => setMistakeSort(event.target.value)}>
                      <option value="newest">最新在前</option>
                      <option value="oldest">最早在前</option>
                    </select>
                  </label>
                  <button
                    className="mistake-clear-filters"
                    onClick={() => {
                      setMistakeTermFilter('全部学期');
                      setMistakeSourceFilter('全部来源');
                      setMistakeErrorFilter('全部错误类型');
                      setMistakeSort('newest');
                      setMistakeKnowledgeFilter('全部知识点');
                    }}
                    type="button"
                  >
                    清除筛选
                  </button>
                </div>

                <div className="mistake-workspace">
                  <aside className="mistake-knowledge-nav">
                    <header>
                      <strong>知识点</strong>
                      <span>{mistakeKnowledgeBase.length}</span>
                    </header>
                    <button
                      className={mistakeKnowledgeFilter === '全部知识点' ? 'active' : ''}
                      onClick={() => {
                        setMistakeKnowledgeFilter('全部知识点');
                        setSelectedMistakeId('');
                      }}
                      type="button"
                    >
                      <span>全部知识点</span>
                      <b>{mistakeKnowledgeBase.length}</b>
                    </button>
                    {mistakeKnowledgeStats.map((item) => (
                      <button
                        key={item.knowledgePoint}
                        className={mistakeKnowledgeFilter === item.knowledgePoint ? 'active' : ''}
                        onClick={() => {
                          setMistakeKnowledgeFilter(item.knowledgePoint);
                          setSelectedMistakeId('');
                        }}
                        type="button"
                      >
                        <span>{item.knowledgePoint}</span>
                        <b>{item.count}</b>
                      </button>
                    ))}
                  </aside>

                  <section className="mistake-compact-list" aria-label="错题列表">
                    <header>
                      <div>
                        <strong>{mistakeKnowledgeFilter}</strong>
                        <span>共 {filteredMistakes.length} 道</span>
                      </div>
                    </header>
                    <div className="mistake-list-rows">
                      {visibleMistakes.length ? visibleMistakes.map((mistake) => (
                        <button
                          className={`mistake-list-row ${selectedMistake?.id === mistake.id ? 'active' : ''}`}
                          data-subject={mistake.subject}
                          key={mistake.id}
                          onClick={() => {
                            setSelectedMistakeId(mistake.id);
                            setMistakeDetailOpen(true);
                          }}
                          type="button"
                        >
                          {mistake.questionImageUrl ? (
                            <img src={mistake.questionImageUrl} alt="" loading="lazy" />
                          ) : (
                            <span className="mistake-list-placeholder"><FileText size={22} /></span>
                          )}
                          <span className="mistake-list-copy">
                            <span className="mistake-list-tags">
                              <b>{mistake.subject}</b>
                              <em>{mistake.knowledgePoint}</em>
                              <em>{mistake.errorType}</em>
                            </span>
                            <strong>{mistake.questionNumber ? `${mistake.questionNumber} ` : ''}{mistake.question}</strong>
                            <small>{mistake.sourceTitle} · {formatMistakeDate(mistake.mastered ? mistake.archivedAt || mistake.createdAt : mistake.createdAt)}</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      )) : (
                        <div className="mistake-empty compact">
                          {mistakePage === 'archived' ? <Archive size={38} /> : <FileText size={38} />}
                          <strong>{mistakePage === 'archived' ? '这里还没有已掌握错题' : '当前条件下没有待复习错题'}</strong>
                          <p>{mistakePage === 'archived' ? '标记掌握后，题目会归档到这里。' : '可以调整学科、知识点或筛选条件。'}</p>
                        </div>
                      )}
                    </div>
                    {visibleMistakes.length < filteredMistakes.length && (
                      <button className="mistake-load-more" onClick={() => setMistakeVisibleLimit((current) => current + MISTAKE_PAGE_SIZE)} type="button">
                        加载更多（剩余 {filteredMistakes.length - visibleMistakes.length} 道）
                      </button>
                    )}
                  </section>

                  <article className={`mistake-detail-panel ${mistakeDetailOpen ? 'mobile-open' : ''}`} aria-label="错题详情">
                    {selectedMistake ? (
                      <>
                        <header className="mistake-detail-head">
                          <div>
                            <span>{selectedMistake.term}</span>
                            <h3>{selectedMistake.questionNumber || '错题详情'}</h3>
                            <p>{selectedMistake.sourceTitle} · {formatMistakeDate(selectedMistake.mastered ? selectedMistake.archivedAt || selectedMistake.createdAt : selectedMistake.createdAt)}</p>
                          </div>
                          <div className="mistake-detail-head-actions">
                            <button onClick={() => startMistakeMetadataEdit(selectedMistake)} type="button" title="修改分类" aria-label="修改分类"><Pencil size={17} /></button>
                            <button className="mistake-detail-close" onClick={() => setMistakeDetailOpen(false)} type="button" title="关闭详情" aria-label="关闭详情"><X size={19} /></button>
                          </div>
                        </header>

                        {mistakeMetadataDraft?.id === selectedMistake.id ? (
                          <div className="mistake-classification-editor">
                            <label>
                              <span>知识点</span>
                              <input
                                value={mistakeMetadataDraft.knowledgePoint}
                                maxLength={40}
                                onChange={(event) => setMistakeMetadataDraft((current) => ({ ...current, knowledgePoint: event.target.value }))}
                                placeholder="例如：两位数进位加法"
                              />
                            </label>
                            <label>
                              <span>错误类型</span>
                              <select value={mistakeMetadataDraft.errorType} onChange={(event) => setMistakeMetadataDraft((current) => ({ ...current, errorType: event.target.value }))}>
                                {MISTAKE_ERROR_TYPES.map((errorType) => <option key={errorType} value={errorType}>{errorType}</option>)}
                              </select>
                            </label>
                            <div>
                              <button className="ghost" onClick={() => setMistakeMetadataDraft(null)} type="button">取消</button>
                              <button onClick={saveMistakeMetadata} type="button"><Save size={15} />保存分类</button>
                            </div>
                          </div>
                        ) : (
                          <div className="mistake-detail-tags">
                            <span data-subject={selectedMistake.subject}>{selectedMistake.subject}</span>
                            <span>{selectedMistake.knowledgePoint}</span>
                            <span>{selectedMistake.errorType}</span>
                            {selectedMistake.mastered && <span className="archived"><Archive size={13} />已归档</span>}
                          </div>
                        )}

                        <div className="mistake-detail-scroll">
                          {selectedMistake.questionImageUrl && <img className="mistake-detail-image" src={selectedMistake.questionImageUrl} alt={`${selectedMistake.subject}原题`} />}
                          <section className="mistake-detail-question">
                            <span>完整题目</span>
                            <p>{selectedMistake.question}</p>
                          </section>
                          <div className="mistake-answer-summary">
                            <section>
                              <span>本次作答</span>
                              <strong>{selectedMistake.answer || '未记录'}</strong>
                            </section>
                            <section>
                              <span>错误原因</span>
                              <p>{selectedMistake.errorReason || selectedMistake.shortComment || selectedMistake.explanation || '暂无错误原因'}</p>
                            </section>
                          </div>
                          <details className="mistake-answer-details" key={selectedMistake.id}>
                            <summary>
                              <span>展开正确答案与解题过程</span>
                              <ChevronDown size={18} />
                            </summary>
                            <div>
                              <section className="mistake-detail-section mistake-correct-answer">
                                <b>正确答案</b>
                                <strong>{selectedMistake.correctAnswer}</strong>
                              </section>
                              <section className="mistake-detail-section mistake-solution-process">
                                <b>正确解题过程</b>
                                <ol>
                                  {normalizeSolutionSteps(selectedMistake.solutionSteps, selectedMistake.explanation).map((step, index) => <li key={`${selectedMistake.id}-book-step-${index}`}>{step}</li>)}
                                </ol>
                              </section>
                              {selectedMistake.explanation && <p className="mistake-method-summary"><em>方法总结：</em>{selectedMistake.explanation}</p>}
                            </div>
                          </details>
                        </div>

                        <footer className="mistake-detail-actions">
                          {selectedMistake.mastered ? (
                            <button onClick={() => setMistakeArchived(selectedMistake.id, false)} type="button"><RotateCcw size={17} />恢复到待复习</button>
                          ) : (
                            <button onClick={() => setMistakeArchived(selectedMistake.id, true, { offerUndo: true })} type="button"><Archive size={17} />标记掌握并归档</button>
                          )}
                          <button className="danger" onClick={() => deleteMistake(selectedMistake.id)} type="button"><Trash2 size={17} />永久删除</button>
                        </footer>
                      </>
                    ) : (
                      <div className="mistake-detail-empty">
                        <FileText size={42} />
                        <strong>选择一道错题查看详情</strong>
                        <p>完整原题、错误原因和解题过程会显示在这里。</p>
                        <button className="mistake-detail-close" onClick={() => setMistakeDetailOpen(false)} type="button">返回列表</button>
                      </div>
                    )}
                  </article>
                </div>
              </section>
            )}
          </section>
        ) : (
          <section className="settings-page">
            <div className="settings-page-hero">
              <div>
                <p>设置中心</p>
                <h2>长期学习打卡配置</h2>
                <span>{databaseStatus}</span>
              </div>
              <div className="settings-hero-actions">
                <button className="template-manager-button" onClick={openTemplateManager}><ClipboardCheck size={15} />模板管理</button>
                <button className="compact-primary" onClick={addMonth}>+ 新建月份清单</button>
              </div>
            </div>

            <div className="settings-layout">
              <aside className="settings-months">
                <div className="settings-block-head">
                  <div>
                    <h3>月份清单</h3>
                    <p>可长期复用，寒暑假和平时都能使用</p>
                  </div>
                </div>
                <label className="settings-month-select">
                  <span>选择月份</span>
                  <select value={month.id} onChange={(event) => setMonthIndex(months.findIndex((item) => item.id === event.target.value))}>
                    {months.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="settings-month-delete-mobile"
                  type="button"
                  disabled={months.length <= 1 || isCurrentCalendarMonth(month)}
                  onClick={() => deleteMonth(month, monthIndex)}
                >
                  <Trash2 size={15} />
                  删除当前选择月份
                </button>
                <div className="month-list">
                  {months.map((item, index) => (
                    <div className={`month-list-item ${item.id === month.id ? 'active' : ''}`} key={item.id}>
                      <button className="month-pick-button" onClick={() => setMonthIndex(index)}>
                        {item.label}
                      </button>
                      <button
                        className="month-delete-button"
                        type="button"
                        title={isCurrentCalendarMonth(item) ? '当前自然月份不能删除' : `删除${item.label}`}
                        aria-label={`删除${item.label}`}
                        disabled={months.length <= 1 || isCurrentCalendarMonth(item)}
                        onClick={() => deleteMonth(item, index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                    <div className="month-config-actions">
                      <button className="save-template" onClick={saveCurrentMonthAsTemplate}><ClipboardCheck size={15} />保存为模板</button>
                      <button className="save-config" onClick={saveConfiguration}><Save size={15} />保存本月配置</button>
                    </div>
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
                            {category.tasks.filter((task) => task.type !== 'temporary').map((task) => (
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
                                    <input type="number" min="0" value={task.habitPoints ?? pointConfig.habit} onChange={(event) => updateTask(category.id, task.id, { habitPoints: event.target.value })} />
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
                    {pointRules.map((rule) => (
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
                    {pointRuleDetails.map((rule) => (
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

      {profileDialog && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="设置小朋友信息">
          <div className="book-dialog-panel profile-dialog-panel">
            <header>
              <div>
                <h2>小朋友信息</h2>
                <p>设置头像和基础信息，顶部资料卡会同步显示新的头像。</p>
              </div>
            </header>
            <div className="profile-dialog-body">
              <section className="profile-avatar-editor">
                <button className="profile-avatar-preview" type="button" onClick={() => avatarInputRef.current?.click()}>
                  <img src={profileDialog.avatarData || mascotImage} alt="小朋友头像预览" />
                  <span><Camera size={18} />更换头像</span>
                </button>
                <input ref={avatarInputRef} className="avatar-file-input" type="file" accept="image/*" onChange={handleAvatarImageChange} />
                <div className="profile-avatar-history">
                  <strong>最近头像</strong>
                  <div>
                    {profileDialog.avatarHistory?.length ? profileDialog.avatarHistory.map((avatarData, index) => (
                      <button
                        className={avatarData === profileDialog.avatarData ? 'active' : ''}
                        key={`${avatarData.slice(0, 32)}-${index}`}
                        type="button"
                        onClick={() => chooseProfileHistoryAvatar(avatarData)}
                        aria-label={`选择最近头像 ${index + 1}`}
                      >
                        <img src={avatarData} alt="" />
                      </button>
                    )) : <span>更换头像后会保留最近 3 个</span>}
                  </div>
                </div>
              </section>
              <section className="profile-form-grid">
                <label>
                  <span><UserRound size={16} />姓名</span>
                  <input value={profileDialog.name} placeholder="小朋友姓名" onChange={(event) => updateProfileDialog({ name: event.target.value })} />
                </label>
                <label>
                  <span><Sparkles size={16} />性别</span>
                  <div className="profile-gender-switch">
                    {PROFILE_GENDERS.map((gender) => (
                      <button className={profileDialog.gender === gender ? 'active' : ''} key={gender} type="button" onClick={() => updateProfileDialog({ gender })}>{gender}</button>
                    ))}
                  </div>
                </label>
                <label>
                  <span><CalendarDays size={16} />生日</span>
                  <input type="date" value={profileDialog.birthday} onChange={(event) => updateProfileDialog({ birthday: event.target.value })} />
                </label>
                <label>
                  <span><GraduationCap size={16} />年级</span>
                  <select value={profileDialog.grade} onChange={(event) => updateProfileDialog({ grade: event.target.value })}>
                    {PROFILE_GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                  </select>
                </label>
                <label className="profile-school-field">
                  <span><Home size={16} />学校</span>
                  <input value={profileDialog.school} placeholder="填写学校名称" onChange={(event) => updateProfileDialog({ school: event.target.value })} />
                </label>
              </section>
            </div>
            <footer>
              <button className="ghost" onClick={() => setProfileDialog(null)}>取消</button>
              <button onClick={saveProfileDialog}>保存信息</button>
            </footer>
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

      {templateManagerDialog && (
        <section className="settings-mask template-manager-mask" role="dialog" aria-modal="true" aria-label="模板管理">
          <div className="book-dialog-panel template-manager-panel">
            <header>
              <div>
                <h2>模板管理</h2>
                <p>管理可复用的每日固定任务。这里的修改不会影响已经创建的月份。</p>
              </div>
            </header>

            <div className="template-manager-toolbar">
              <label>
                <span>选择模板</span>
                <select value={templateManagerDialog.templateId} onChange={(event) => selectManagedTemplate(event.target.value)}>
                  {(state.templates || []).map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>模板名称</span>
                <input value={templateManagerDialog.draft.name || ''} onChange={(event) => updateTemplateDraft((draft) => { draft.name = event.target.value; })} />
              </label>
            </div>

            <div className="template-editor-list">
              {(templateManagerDialog.draft.categories || []).map((category, categoryIndex) => (
                <section className="template-category-editor" key={category.id || categoryIndex}>
                  <header>
                    <input
                      aria-label={`第${categoryIndex + 1}个分类名称`}
                      value={category.name || ''}
                      onChange={(event) => updateTemplateDraft((draft) => {
                        draft.categories[categoryIndex].name = event.target.value;
                        draft.categories[categoryIndex].badge = event.target.value.slice(0, 1) || '类';
                      })}
                    />
                    <select
                      aria-label={`${category.name || '分类'}颜色`}
                      value={category.color || 'blue'}
                      onChange={(event) => updateTemplateDraft((draft) => { draft.categories[categoryIndex].color = event.target.value; })}
                    >
                      <option value="blue">蓝色</option>
                      <option value="green">绿色</option>
                      <option value="red">红色</option>
                      <option value="purple">紫色</option>
                      <option value="orange">橙色</option>
                    </select>
                    <button
                      className="template-icon-danger"
                      type="button"
                      title="删除分类"
                      aria-label={`删除${category.name || '分类'}`}
                      onClick={() => updateTemplateDraft((draft) => { draft.categories.splice(categoryIndex, 1); })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </header>

                  <div className="template-task-list">
                    {(category.tasks || []).map((task, taskIndex) => (
                      <div className="template-task-row" key={task.id || taskIndex}>
                        <input
                          aria-label={`${category.name || '分类'}第${taskIndex + 1}项任务`}
                          value={task.title || ''}
                          placeholder="每日固定任务名称"
                          onChange={(event) => updateTemplateDraft((draft) => { draft.categories[categoryIndex].tasks[taskIndex].title = event.target.value; })}
                        />
                        <select
                          aria-label={`${task.title || '任务'}重要度`}
                          value={task.importance || 'normal'}
                          onChange={(event) => updateTemplateDraft((draft) => { draft.categories[categoryIndex].tasks[taskIndex].importance = event.target.value; })}
                        >
                          <option value="normal">普通</option>
                          <option value="important">重要</option>
                        </select>
                        {category.name === '好习惯' ? (
                          <label className="template-habit-points">
                            <input
                              type="number"
                              min="0"
                              aria-label={`${task.title || '好习惯'}积分`}
                              value={task.habitPoints ?? pointConfig.habit}
                              onChange={(event) => updateTemplateDraft((draft) => { draft.categories[categoryIndex].tasks[taskIndex].habitPoints = event.target.value; })}
                            />
                            <span>分</span>
                          </label>
                        ) : <span className="template-task-type">每日固定</span>}
                        <button
                          className="template-icon-danger"
                          type="button"
                          title="删除任务"
                          aria-label={`删除${task.title || '任务'}`}
                          onClick={() => updateTemplateDraft((draft) => { draft.categories[categoryIndex].tasks.splice(taskIndex, 1); })}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="template-add-task"
                    type="button"
                    onClick={() => updateTemplateDraft((draft) => {
                      draft.categories[categoryIndex].tasks ||= [];
                      draft.categories[categoryIndex].tasks.push({
                        id: createId('template-task'),
                        title: '',
                        type: 'daily',
                        checkMode: 'daily',
                        importance: 'normal',
                        startDay: 1,
                        endDay: 31,
                        ...(category.name === '好习惯' ? { habitPoints: pointConfig.habit } : {}),
                      });
                    })}
                  >
                    + 添加每日任务
                  </button>
                </section>
              ))}
            </div>

            <button
              className="template-add-category"
              type="button"
              onClick={() => updateTemplateDraft((draft) => {
                draft.categories ||= [];
                draft.categories.push({
                  id: createId('template-category'),
                  name: '新分类',
                  color: 'blue',
                  badge: '新',
                  tasks: [],
                });
              })}
            >
              + 添加分类
            </button>

            <footer>
              <button className="template-delete" type="button" onClick={deleteManagedTemplate}><Trash2 size={15} />删除模板</button>
              <button className="ghost" type="button" onClick={() => setTemplateManagerDialog(null)}>取消</button>
              <button type="button" onClick={saveManagedTemplate}><Save size={15} />保存修改</button>
            </footer>
          </div>
        </section>
      )}

      {newMonthDialog && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="新增月份清单">
          <div className="book-dialog-panel new-month-dialog-panel">
            <header>
              <div>
                <h2>新增月份清单</h2>
                <p>可以创建空白清单，也可以复用已保存模板中的每日固定任务和好习惯。</p>
              </div>
            </header>
            <div className="book-dialog-fields">
              <label>
                <span>月份</span>
                <input
                  autoFocus
                  type="month"
                  value={newMonthDialog.monthKey}
                  onChange={(event) => setNewMonthDialog((current) => ({ ...current, monthKey: event.target.value }))}
                />
              </label>
              <label>
                <span>创建方式</span>
                <select
                  value={newMonthDialog.templateId}
                  onChange={(event) => setNewMonthDialog((current) => ({ ...current, templateId: event.target.value }))}
                >
                  <option value="">空白月份清单</option>
                  {(state.templates || []).map((template) => {
                    const taskCount = (template.categories || []).reduce((sum, category) => sum + (category.tasks?.length || 0), 0);
                    return <option key={template.id} value={template.id}>从模板新建：{template.name}（{taskCount}项任务）</option>;
                  })}
                </select>
              </label>
            </div>
            <div className="new-month-template-note">
              模板只包含每日固定任务；阶段任务、临时任务、打卡记录和备注不会复制。
            </div>
            <footer>
              <button className="ghost" type="button" onClick={() => setNewMonthDialog(null)}>取消</button>
              <button type="button" onClick={confirmAddMonth}>创建月份清单</button>
            </footer>
          </div>
        </section>
      )}

      {pointConfigDialog && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="积分配置">
          <div className="book-dialog-panel point-config-panel">
            <header>
              <div>
                <h2>积分配置</h2>
                <p>统一配置基础积分规则，保存后会影响统计、图例和后续新建默认值。</p>
              </div>
            </header>
            <div className="point-config-summary">
              <Sparkles size={20} />
              <span>当前规则：优秀 +{pointConfigDialog.excellent || 0}，非常优秀 +{pointConfigDialog.super || 0}，好习惯 +{pointConfigDialog.habit || 0}，读完一本书 +{pointConfigDialog.readingBook || 0}</span>
            </div>
            <div className="point-config-fields">
              {[
                { key: 'excellent', title: '每日打卡优秀', desc: '普通学习任务完成质量较好时使用', icon: Star, autoFocus: true },
                { key: 'super', title: '每日打卡非常优秀', desc: '表现特别好时使用，适合少量高质量奖励', icon: Trophy },
                { key: 'habit', title: '好习惯默认', desc: '新建好习惯任务时的默认完成积分', icon: Target },
                { key: 'readingBook', title: '读完一本书默认', desc: '新建书单时默认的读完奖励积分', icon: BookOpen },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <label className={`point-config-card point-config-${item.key}`} key={item.key}>
                    <i><Icon size={22} /></i>
                    <span>{item.title}</span>
                    <small>{item.desc}</small>
                    <div>
                      <input
                        autoFocus={item.autoFocus}
                        inputMode="numeric"
                        value={pointConfigDialog[item.key]}
                        onChange={(event) => setPointConfigDialog((current) => ({ ...current, [item.key]: event.target.value.replace(/[^\d]/g, '') }))}
                      />
                      <b>分</b>
                    </div>
                  </label>
                );
              })}
            </div>
            <footer>
              <button className="ghost" onClick={() => setPointConfigDialog(null)}>取消</button>
              <button onClick={confirmPointConfig}>保存配置</button>
            </footer>
          </div>
        </section>
      )}

      {monthExportDialog && (
        <section className="settings-mask" role="dialog" aria-modal="true" aria-label="导出打卡记录">
          <div className="book-dialog-panel month-export-dialog-panel">
            <header>
              <div>
                <h2>导出打卡记录</h2>
                <p>选择要导出的月份或年份，表格样式保持当前周报格式。</p>
              </div>
            </header>
            <div className="book-dialog-fields">
              <label>
                <span>导出范围</span>
                <select
                  value={monthExportDialog.scope}
                  onChange={(event) => setMonthExportDialog((current) => ({ ...current, scope: event.target.value }))}
                >
                  <option value="month">按月导出</option>
                  <option value="year">按年导出</option>
                </select>
              </label>
              {monthExportDialog.scope === 'month' ? (
                <label>
                  <span>选择月份</span>
                  <select
                    value={monthExportDialog.monthId}
                    onChange={(event) => setMonthExportDialog((current) => ({ ...current, monthId: event.target.value }))}
                  >
                    {months.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  <span>选择年份</span>
                  <select
                    value={monthExportDialog.year}
                    onChange={(event) => setMonthExportDialog((current) => ({ ...current, year: event.target.value }))}
                  >
                    {Array.from(new Set(months.map((item) => String(item.year)))).map((year) => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <span>状态筛选</span>
                <select
                  value={monthExportDialog.status}
                  onChange={(event) => setMonthExportDialog((current) => ({ ...current, status: event.target.value }))}
                >
                  {MONTH_EXPORT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <footer>
              <button className="ghost" type="button" onClick={() => setMonthExportDialog(null)}>取消</button>
              <button type="button" onClick={confirmMonthExport}>
                <Download size={16} />导出
              </button>
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
              <label>
                <span>奖励类型</span>
                <select
                  value={rewardTypeMeta(newRewardDialog.type).type}
                  onChange={(event) => {
                    const meta = rewardTypeMeta(event.target.value);
                    setNewRewardDialog((current) => ({ ...current, type: meta.type, icon: meta.icon }));
                  }}
                >
                  {REWARD_TYPES.map((item) => <option key={item.type} value={item.type}>{item.type}</option>)}
                </select>
              </label>
              <div className="reward-type-preview">
                {(() => {
                  const meta = rewardTypeMeta(newRewardDialog.type);
                  const PreviewIcon = REWARD_ICON_COMPONENTS[newRewardDialog.icon] || REWARD_ICON_COMPONENTS[meta.icon] || Gift;
                  return (
                    <>
                      <span>推荐图标</span>
                      <b><PreviewIcon size={30} /></b>
                      <small>{meta.type}</small>
                    </>
                  );
                })()}
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
                <p>作业图片由 DeepSeek Vision 自动识别学科、逐题批改并定位错题。</p>
              </div>
            </header>
            <div className="book-dialog-fields ai-config-fields">
              <section className="ai-config-section">
                <h3>DeepSeek Vision</h3>
                <label>
                  <span>API Key</span>
                  <input type="password" value={aiConfigDraft.deepseek.apiKey || ''} placeholder={aiConfigDraft.deepseek.configured ? '已配置，留空保持当前密钥' : '填写 DeepSeek API Key'} onChange={(event) => setAiConfigDraft((current) => ({ ...current, deepseek: { ...current.deepseek, apiKey: event.target.value } }))} />
                </label>
                <label>
                  <span>Base URL</span>
                  <input value={aiConfigDraft.deepseek.baseUrl || ''} readOnly />
                </label>
                <label>
                  <span>模型名</span>
                  <input value={aiConfigDraft.deepseek.model || ''} readOnly />
                </label>
                {aiConfigDraft.deepseek.keySource === 'file' && <p className="ai-key-source-note">当前使用本机桌面的密钥文件，API Key 留空即可。</p>}
              </section>
            </div>
            <footer>
              <button className="ghost" onClick={() => setAiConfigDialogOpen(false)}>取消</button>
              <button onClick={confirmAiConfig}>保存配置</button>
            </footer>
          </div>
        </section>
      )}

      {appDialog && (
        <section className="settings-mask app-dialog-mask" role="dialog" aria-modal="true" aria-label={appDialog.title}>
          <div className={`app-dialog-panel tone-${appDialog.tone || 'primary'}`}>
            <header>
              <span>{appDialog.tone === 'danger' ? <Trash2 size={24} /> : appDialog.tone === 'warning' ? <Flag size={24} /> : <Check size={24} />}</span>
              <div>
                <h2>{appDialog.title}</h2>
                <p>{appDialog.message}</p>
              </div>
            </header>
            {appDialog.variant === 'prompt' && (
              <label className="app-dialog-input">
                <span>{appDialog.inputLabel || '输入内容'}</span>
                <input
                  autoFocus
                  value={appDialog.inputValue || ''}
                  placeholder={appDialog.placeholder || ''}
                  onChange={(event) => setAppDialog((current) => ({ ...current, inputValue: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') closeAppDialog(true);
                    if (event.key === 'Escape') closeAppDialog(false);
                  }}
                />
              </label>
            )}
            <footer>
              {appDialog.variant !== 'alert' && (
                <button className="ghost" type="button" onClick={() => closeAppDialog(false)}>{appDialog.cancelText || '取消'}</button>
              )}
              <button className={appDialog.tone === 'danger' ? 'danger' : ''} type="button" onClick={() => closeAppDialog(true)}>
                {appDialog.confirmText || '确定'}
              </button>
            </footer>
          </div>
        </section>
      )}

      {saveToast && (
        <div className={`save-toast ${saveToast.type} ${archiveUndo ? 'with-archive-undo' : ''}`} role="status" aria-live="polite">
          <Check size={16} />
          <span>{saveToast.message}</span>
        </div>
      )}

      {archiveUndo && (
        <div className="archive-undo-toast" role="status" aria-live="polite">
          <Archive size={17} />
          <span>已归档到已掌握</span>
          <button onClick={undoMistakeArchive} type="button"><Undo2 size={15} />撤销</button>
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
