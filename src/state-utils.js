export function mergeCatalogItems(defaultItems = [], savedItems = []) {
  const saved = Array.isArray(savedItems) ? savedItems : [];
  const used = new Set();
  const mergedDefaults = defaultItems.map((defaultItem) => {
    const matchIndex = saved.findIndex((item, index) => (
      !used.has(index) && (
        (item?.id && item.id === defaultItem.id) ||
        (item?.name && item.name === defaultItem.name)
      )
    ));
    if (matchIndex < 0) return defaultItem;
    used.add(matchIndex);
    return saved[matchIndex];
  });

  return [
    ...mergedDefaults,
    ...saved.filter((_item, index) => !used.has(index)),
  ];
}

export function calculateRewardWallet(months = [], earnedPointsForMonth = () => 0) {
  return months.reduce((wallet, month) => {
    wallet.earned += Math.max(0, Number(earnedPointsForMonth(month) || 0));
    wallet.redeemed += (month?.redeemedRewards || []).reduce(
      (sum, record) => sum + Math.max(0, Number(record?.points || 0)),
      0,
    );
    wallet.redemptions += month?.redeemedRewards?.length || 0;
    return wallet;
  }, { earned: 0, redeemed: 0, redemptions: 0 });
}

export const MISTAKE_ERROR_TYPES = Object.freeze([
  '审题错误',
  '知识点错误',
  '方法步骤错误',
  '计算或拼写错误',
  '表达不完整',
  '漏答',
  '其他',
]);

export const REVIEW_MISTAKE_DECISIONS = Object.freeze(['pending', 'collected', 'ignored']);

export function normalizeReviewMistakeDecision(value = '') {
  return REVIEW_MISTAKE_DECISIONS.includes(value) ? value : 'pending';
}

export function mistakeCollectionKey(item = {}, fallbackReviewId = '') {
  return JSON.stringify([
    String(item.reviewId || fallbackReviewId || '').trim(),
    String(item.question || '').replace(/\s+/g, ' ').trim(),
    String(item.correctAnswer || '').replace(/\s+/g, ' ').trim(),
  ]);
}

export function filterIgnoredReviewAnnotations(annotations = [], mistakes = []) {
  const ignoredMistakes = mistakes.filter((mistake) => normalizeReviewMistakeDecision(mistake?.reviewDecision) === 'ignored');
  if (!ignoredMistakes.length) return annotations;
  return annotations.filter((annotation) => !ignoredMistakes.some((mistake) => {
    const annotationOrder = Number(annotation?.order || 0);
    const mistakeOrder = Number(mistake?.order || 0);
    if (annotationOrder > 0 && mistakeOrder > 0) return annotationOrder === mistakeOrder;
    const annotationNumber = String(annotation?.questionNumber || '').replace(/\s+/g, '').toLowerCase();
    const mistakeNumber = String(mistake?.questionNumber || '').replace(/\s+/g, '').toLowerCase();
    return Boolean(annotationNumber && mistakeNumber && annotationNumber === mistakeNumber);
  }));
}

export function normalizeMistakeKnowledgePoint(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40) || '待分类';
}

export function normalizeMistakeErrorType(value = '') {
  const normalized = String(value || '').trim();
  return MISTAKE_ERROR_TYPES.includes(normalized) ? normalized : '其他';
}

function mistakeTimestamp(item, status) {
  const value = status === 'archived' ? item.archivedAt || item.createdAt : item.createdAt;
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function filterMistakes(items = [], filters = {}) {
  const {
    status = 'active',
    term = '全部学期',
    subject = '全部',
    knowledgePoint = '全部知识点',
    errorType = '全部错误类型',
    source = '全部来源',
    search = '',
    sort = 'newest',
  } = filters;
  const archived = status === 'archived';
  const keyword = String(search || '').trim().toLocaleLowerCase('zh-CN');

  return (Array.isArray(items) ? items : [])
    .filter((item) => Boolean(item?.mastered) === archived)
    .filter((item) => term === '全部学期' || item.term === term)
    .filter((item) => subject === '全部' || item.subject === subject)
    .filter((item) => knowledgePoint === '全部知识点' || normalizeMistakeKnowledgePoint(item.knowledgePoint) === knowledgePoint)
    .filter((item) => errorType === '全部错误类型' || normalizeMistakeErrorType(item.errorType) === errorType)
    .filter((item) => source === '全部来源' || item.sourceTitle === source)
    .filter((item) => {
      if (!keyword) return true;
      return [
        item.questionNumber,
        item.question,
        item.sourceTitle,
        item.knowledgePoint,
        item.errorType,
        item.errorReason,
      ].some((value) => String(value || '').toLocaleLowerCase('zh-CN').includes(keyword));
    })
    .sort((first, second) => {
      const difference = mistakeTimestamp(second, status) - mistakeTimestamp(first, status);
      return sort === 'oldest' ? -difference : difference;
    });
}

export function getMistakeKnowledgePointCounts(items = []) {
  const counts = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const knowledgePoint = normalizeMistakeKnowledgePoint(item?.knowledgePoint);
    counts.set(knowledgePoint, (counts.get(knowledgePoint) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([knowledgePoint, count]) => ({ knowledgePoint, count }))
    .sort((first, second) => second.count - first.count || first.knowledgePoint.localeCompare(second.knowledgePoint, 'zh-CN'));
}

export function createTaskTemplate(month = {}, name = '任务模板', id = '') {
  return {
    id,
    name: String(name || '任务模板').trim() || '任务模板',
    categories: (month.categories || [])
      .map((category) => ({
        id: category.id || '',
        name: category.name || '未命名分类',
        color: category.color || 'blue',
        badge: category.badge || category.name?.slice(0, 1) || '类',
        tasks: (category.tasks || [])
          .filter((task) => task?.type === 'daily' && !task.bookId && String(task.title || '').trim())
          .map((task) => ({
            ...task,
            title: String(task.title).trim(),
            type: 'daily',
            checkMode: 'daily',
          })),
      }))
      .filter((category) => category.tasks.length > 0),
    readingBooks: [],
  };
}
