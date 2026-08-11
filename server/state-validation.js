const MAX_MONTHS = 120;
const MAX_CATEGORIES_PER_MONTH = 50;
const MAX_TASKS_PER_CATEGORY = 500;
const MAX_TEMPLATES = 50;
const MAX_REWARDS = 500;
const MAX_SNAPSHOTS = 20;
const MAX_STRING_LENGTH = 2_000_000;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateJsonValue(value, path, errors, depth = 0) {
  if (errors.length >= 20) return;
  if (depth > 24) {
    errors.push(`${path} 层级过深`);
    return;
  }
  if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
    errors.push(`${path} 文本过长`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 20_000) errors.push(`${path} 条目过多`);
    value.forEach((item, index) => validateJsonValue(item, `${path}[${index}]`, errors, depth + 1));
    return;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length > 20_000) errors.push(`${path} 字段过多`);
    entries.forEach(([key, item]) => validateJsonValue(item, `${path}.${key}`, errors, depth + 1));
  }
}

export function validateAppState(state) {
  const errors = [];
  if (!isRecord(state)) return ['state 必须是对象'];

  if (!Array.isArray(state.months) || state.months.length < 1 || state.months.length > MAX_MONTHS) {
    errors.push(`months 必须包含 1-${MAX_MONTHS} 个月份`);
  } else {
    state.months.forEach((month, monthIndex) => {
      const path = `months[${monthIndex}]`;
      if (!isRecord(month)) {
        errors.push(`${path} 必须是对象`);
        return;
      }
      if (!Number.isInteger(Number(month.year)) || Number(month.year) < 2000 || Number(month.year) > 2100) {
        errors.push(`${path}.year 无效`);
      }
      if (!Number.isInteger(Number(month.month)) || Number(month.month) < 1 || Number(month.month) > 12) {
        errors.push(`${path}.month 无效`);
      }
      if (!Array.isArray(month.categories) || month.categories.length > MAX_CATEGORIES_PER_MONTH) {
        errors.push(`${path}.categories 必须是数组且不超过 ${MAX_CATEGORIES_PER_MONTH} 项`);
      } else {
        month.categories.forEach((category, categoryIndex) => {
          const categoryPath = `${path}.categories[${categoryIndex}]`;
          if (!isRecord(category) || !Array.isArray(category.tasks) || category.tasks.length > MAX_TASKS_PER_CATEGORY) {
            errors.push(`${categoryPath}.tasks 必须是数组且不超过 ${MAX_TASKS_PER_CATEGORY} 项`);
          }
        });
      }
      if (!isRecord(month.checks)) errors.push(`${path}.checks 必须是对象`);
      if (!isRecord(month.notes)) errors.push(`${path}.notes 必须是对象`);
      if (month.readingBooks !== undefined && !Array.isArray(month.readingBooks)) errors.push(`${path}.readingBooks 必须是数组`);
      if (month.redeemedRewards !== undefined && !Array.isArray(month.redeemedRewards)) errors.push(`${path}.redeemedRewards 必须是数组`);
    });
  }

  if (state.rewardConfig !== undefined && (!Array.isArray(state.rewardConfig) || state.rewardConfig.length > MAX_REWARDS)) {
    errors.push(`rewardConfig 必须是数组且不超过 ${MAX_REWARDS} 项`);
  }
  if (state.templates !== undefined) {
    if (!Array.isArray(state.templates) || state.templates.length > MAX_TEMPLATES) {
      errors.push(`templates 必须是数组且不超过 ${MAX_TEMPLATES} 项`);
    } else {
      state.templates.forEach((template, templateIndex) => {
        if (!isRecord(template) || !Array.isArray(template.categories) || template.categories.length > MAX_CATEGORIES_PER_MONTH) {
          errors.push(`templates[${templateIndex}].categories 必须是数组且不超过 ${MAX_CATEGORIES_PER_MONTH} 项`);
          return;
        }
        template.categories.forEach((category, categoryIndex) => {
          if (!isRecord(category) || !Array.isArray(category.tasks) || category.tasks.length > MAX_TASKS_PER_CATEGORY) {
            errors.push(`templates[${templateIndex}].categories[${categoryIndex}].tasks 必须是数组且不超过 ${MAX_TASKS_PER_CATEGORY} 项`);
          }
        });
      });
    }
  }
  if (state.profile !== undefined && !isRecord(state.profile)) errors.push('profile 必须是对象');
  if (state.snapshots !== undefined && (!Array.isArray(state.snapshots) || state.snapshots.length > MAX_SNAPSHOTS)) {
    errors.push(`snapshots 必须是数组且不超过 ${MAX_SNAPSHOTS} 项`);
  }

  validateJsonValue(state, 'state', errors);
  return errors.slice(0, 20);
}
