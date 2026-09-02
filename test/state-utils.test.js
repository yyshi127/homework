import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
} from '../src/state-utils.js';

test('reward catalog upgrades preserve edits and custom rewards', () => {
  const defaults = [
    { id: 'reward-a', name: '默认A', points: 10 },
    { id: 'reward-b', name: '新增B', points: 20 },
  ];
  const saved = [
    { id: 'reward-a', name: '用户修改A', points: 99 },
    { id: 'custom-c', name: '自定义C', points: 30 },
  ];

  assert.deepEqual(mergeCatalogItems(defaults, saved), [saved[0], defaults[1], saved[1]]);
});

test('reward catalog upgrades match legacy rewards by name', () => {
  const defaultReward = { id: 'reward-a', name: '默认A', points: 10 };
  const legacyReward = { id: 'reward-0', name: '默认A', points: 88 };

  assert.deepEqual(mergeCatalogItems([defaultReward], [legacyReward]), [legacyReward]);
});

test('reward wallet includes earnings and redemptions from every month', () => {
  const months = [
    { earned: 100, redeemedRewards: [{ points: 30 }] },
    { earned: 50, redeemedRewards: [{ points: 10 }, { points: 5 }] },
  ];

  assert.deepEqual(calculateRewardWallet(months, (month) => month.earned), {
    earned: 150,
    redeemed: 45,
    redemptions: 3,
  });
});

test('task templates contain only fixed daily tasks and habits', () => {
  const template = createTaskTemplate({
    categories: [
      {
        id: 'chinese',
        name: '语文',
        tasks: [
          { id: 'daily', title: '每日练字', type: 'daily', importance: 'important' },
          { id: 'stage', title: '完成作文', type: 'stage' },
          { id: 'temporary', title: '临时打卡任务', type: 'temporary' },
        ],
      },
      {
        id: 'habit',
        name: '好习惯',
        tasks: [{ id: 'habit-daily', title: '早睡', type: 'daily', habitPoints: 2 }],
      },
      {
        id: 'reading',
        name: '阅读',
        tasks: [{ id: 'book', title: '整本书', type: 'daily', bookId: 'book-1' }],
      },
    ],
  }, '暑假模板', 'template-1');

  assert.equal(template.name, '暑假模板');
  assert.deepEqual(template.categories.map((category) => category.name), ['语文', '好习惯']);
  assert.deepEqual(template.categories[0].tasks.map((task) => task.title), ['每日练字']);
  assert.equal(template.categories[0].tasks[0].checkMode, 'daily');
  assert.equal(template.categories[1].tasks[0].habitPoints, 2);
  assert.deepEqual(template.readingBooks, []);
});

test('mistake metadata keeps valid AI categories and provides safe legacy defaults', () => {
  assert.equal(normalizeMistakeKnowledgePoint('  两位数   进位加法  '), '两位数 进位加法');
  assert.equal(normalizeMistakeKnowledgePoint(''), '待分类');
  assert.equal(normalizeMistakeErrorType('审题错误'), '审题错误');
  assert.equal(normalizeMistakeErrorType('粗心'), '其他');
});

test('review mistakes keep explicit decisions and use stable collection keys', () => {
  assert.equal(normalizeReviewMistakeDecision('ignored'), 'ignored');
  assert.equal(normalizeReviewMistakeDecision('collected'), 'collected');
  assert.equal(normalizeReviewMistakeDecision('unexpected'), 'pending');
  assert.equal(
    mistakeCollectionKey({ question: ' 38 +  27 = ', correctAnswer: '65' }, 'review-1'),
    mistakeCollectionKey({ reviewId: 'review-1', question: '38 + 27 =', correctAnswer: '65' }),
  );
  assert.notEqual(
    mistakeCollectionKey({ reviewId: 'review-2', question: '38 + 27 =', correctAnswer: '65' }),
    mistakeCollectionKey({ reviewId: 'review-1', question: '38 + 27 =', correctAnswer: '65' }),
  );
});

test('ignored review mistakes remove only their own image annotations', () => {
  const annotations = [
    { order: 1, questionNumber: '二.1' },
    { order: 2, questionNumber: '二.2' },
    { order: 3, questionNumber: '三' },
  ];
  const mistakes = [
    { order: 1, questionNumber: '二.1', reviewDecision: 'ignored' },
    { order: 2, questionNumber: '二.2', reviewDecision: 'pending' },
  ];

  assert.deepEqual(filterIgnoredReviewAnnotations(annotations, mistakes), [annotations[1], annotations[2]]);
  assert.deepEqual(filterIgnoredReviewAnnotations(annotations, [
    { questionNumber: ' 二.2 ', reviewDecision: 'ignored' },
  ]), [annotations[0], annotations[2]]);
});

test('mistake filters separate active and archived records across every facet', () => {
  const mistakes = [
    {
      id: 'active-math',
      term: '二年级上学期',
      subject: '数学',
      knowledgePoint: '两位数进位加法',
      errorType: '计算或拼写错误',
      sourceTitle: '第3页口算',
      question: '38 + 27 =',
      errorReason: '个位没有进位',
      createdAt: '2026-09-02T08:00:00.000Z',
      mastered: false,
    },
    {
      id: 'active-chinese',
      term: '二年级上学期',
      subject: '语文',
      knowledgePoint: '词语搭配',
      errorType: '知识点错误',
      sourceTitle: '语文练习册',
      question: '选择恰当的词语',
      createdAt: '2026-09-01T08:00:00.000Z',
      mastered: false,
    },
    {
      id: 'archived-math',
      term: '二年级上学期',
      subject: '数学',
      knowledgePoint: '两位数进位加法',
      errorType: '方法步骤错误',
      sourceTitle: '第2页口算',
      question: '46 + 28 =',
      createdAt: '2026-08-30T08:00:00.000Z',
      archivedAt: '2026-09-02T09:00:00.000Z',
      mastered: true,
    },
  ];

  assert.deepEqual(filterMistakes(mistakes).map((item) => item.id), ['active-math', 'active-chinese']);
  assert.deepEqual(filterMistakes(mistakes, { status: 'archived' }).map((item) => item.id), ['archived-math']);
  assert.deepEqual(filterMistakes(mistakes, {
    subject: '数学',
    knowledgePoint: '两位数进位加法',
    errorType: '计算或拼写错误',
    source: '第3页口算',
    search: '进位',
  }).map((item) => item.id), ['active-math']);
  assert.deepEqual(filterMistakes(mistakes, { sort: 'oldest' }).map((item) => item.id), ['active-chinese', 'active-math']);
});

test('knowledge point counts remain compact with hundreds of mistakes', () => {
  const mistakes = Array.from({ length: 300 }, (_, index) => ({
    knowledgePoint: index % 3 === 0 ? '' : index % 2 === 0 ? '词语搭配' : '两位数进位加法',
  }));

  assert.deepEqual(getMistakeKnowledgePointCounts(mistakes), [
    { knowledgePoint: '词语搭配', count: 100 },
    { knowledgePoint: '待分类', count: 100 },
    { knowledgePoint: '两位数进位加法', count: 100 },
  ]);
});
