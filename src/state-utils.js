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
