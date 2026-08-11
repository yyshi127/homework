import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRewardWallet, createTaskTemplate, mergeCatalogItems } from '../src/state-utils.js';

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
