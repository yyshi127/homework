import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAppState } from '../server/state-validation.js';

const validState = {
  months: [{
    id: 'month-1',
    year: 2026,
    month: 7,
    categories: [{ id: 'cat-1', name: '语文', tasks: [] }],
    readingBooks: [],
    redeemedRewards: [],
    checks: {},
    notes: {},
  }],
  rewardConfig: [],
  profile: {},
  snapshots: [],
};

test('accepts a valid application state', () => {
  assert.deepEqual(validateAppState(validState), []);
});

test('rejects malformed core state structures', () => {
  const invalid = structuredClone(validState);
  invalid.months[0].categories[0].tasks = 'not-an-array';
  invalid.months[0].checks = [];

  assert.deepEqual(validateAppState(invalid), [
    'months[0].categories[0].tasks 必须是数组且不超过 500 项',
    'months[0].checks 必须是对象',
  ]);
});

test('validates saved task template structures', () => {
  const invalid = structuredClone(validState);
  invalid.templates = [{ id: 'template-1', name: '模板', categories: [{ name: '语文', tasks: 'not-an-array' }] }];

  assert.deepEqual(validateAppState(invalid), [
    'templates[0].categories[0].tasks 必须是数组且不超过 500 项',
  ]);
});
