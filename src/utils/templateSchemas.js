import { PROJECT_TYPES } from './constants';

const MAX_STR = 500;
const MAX_DEPTH = 5;
const MAX_NODES = 100;

const TASK_PRIORITIES = ['low', 'mid', 'high', 'crit'];
const DEPENDENCY_TYPES = ['FS', 'SS', 'FF', 'SF'];
const PROJECT_PRIORITIES = ['AOG', 'CRIT', 'NORM', 'high', 'mid', 'low'];

const trimmedString = (value, max = MAX_STR) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : '';
};

const nonNegativeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const enumValue = (allowed) => (value) => (allowed.includes(value) ? value : null);

const sanitizeBySchema = (schema, source) => {
  const result = {};
  for (const field of Object.keys(schema)) {
    const sanitized = schema[field](source[field]);
    if (sanitized !== null && sanitized !== '') result[field] = sanitized;
  }
  return result;
};

const TASK_FIELDS = Object.freeze({
  title: trimmedString,
  desc: trimmedString,
  priority: enumValue(TASK_PRIORITIES),
  plannedHours: nonNegativeNumber,
  dependencyType: enumValue(DEPENDENCY_TYPES),
  projectId: trimmedString,
});

const PROJECT_FIELDS = Object.freeze({
  name: trimmedString,
  desc: trimmedString,
  customer: trimmedString,
  aircraftType: trimmedString,
  projectType: trimmedString,
  ptype: enumValue(Object.keys(PROJECT_TYPES)),
  priority: enumValue(PROJECT_PRIORITIES),
  budget: nonNegativeNumber,
});

const sanitizeTaskTree = (source, depth, budget) => {
  if (depth > MAX_DEPTH || budget.remaining <= 0) return null;
  if (!source || typeof source !== 'object') return null;

  budget.remaining -= 1;
  const node = sanitizeBySchema(TASK_FIELDS, source);

  const rawChildren = Array.isArray(source.subtasks) ? source.subtasks : [];
  const children = [];
  for (const child of rawChildren) {
    const clean = sanitizeTaskTree(child, depth + 1, budget);
    if (clean) children.push(clean);
  }
  if (children.length) node.subtasks = children;

  return Object.keys(node).length ? node : null;
};

const sanitizeTaskList = (source, budget) => {
  if (!Array.isArray(source)) return [];
  const list = [];
  for (const item of source) {
    const clean = sanitizeTaskTree(item, 1, budget);
    if (clean) list.push(clean);
  }
  return list;
};

export const TEMPLATE_KINDS = Object.freeze({
  task: Object.freeze({
    label: 'задачи',
    nestedKey: 'subtasks',
    nestedLabel: 'подзадачи',
    nestedSingular: 'подзадача',
  }),
  project: Object.freeze({
    label: 'проекта',
    nestedKey: 'tasks',
    nestedLabel: 'задачи',
    nestedSingular: 'задача',
  }),
});

export const TEMPLATE_KIND_LABELS = Object.freeze({
  task: 'задача',
  project: 'проект',
});

export const TEMPLATE_FIELDS_META = Object.freeze({
  task: Object.freeze({
    title: { label: 'Название', type: 'text', required: true },
    desc: { label: 'Описание', type: 'textarea' },
    priority: {
      label: 'Приоритет',
      type: 'select',
      options: [
        { value: 'low', label: 'Низкий' },
        { value: 'mid', label: 'Средний' },
        { value: 'high', label: 'Высокий' },
        { value: 'crit', label: 'Критический' },
      ],
    },
    plannedHours: { label: 'Плановые часы', type: 'number' },
    dependencyType: {
      label: 'Тип зависимости',
      type: 'select',
      options: [
        { value: 'FS', label: 'Окончание-Начало (FS)' },
        { value: 'SS', label: 'Начало-Начало (SS)' },
        { value: 'FF', label: 'Окончание-Окончание (FF)' },
        { value: 'SF', label: 'Начало-Окончание (SF)' },
      ],
    },
  }),
  project: Object.freeze({
    name: { label: 'Название', type: 'text', required: true },
    desc: { label: 'Описание', type: 'textarea' },
    customer: { label: 'Заказчик', type: 'text' },
    aircraftType: { label: 'Тип ВС', type: 'text' },
    projectType: { label: 'Категория', type: 'text' },
    ptype: {
      label: 'Тип проекта',
      type: 'select',
      options: [
        { value: 'prod', label: 'Производственный' },
        { value: 'admin', label: 'Административный' },
      ],
    },
    priority: {
      label: 'Приоритет',
      type: 'select',
      options: [
        { value: 'AOG', label: 'AOG' },
        { value: 'CRIT', label: 'CRIT' },
        { value: 'NORM', label: 'NORM' },
        { value: 'high', label: 'Высокий (адм.)' },
        { value: 'mid', label: 'Средний (адм.)' },
        { value: 'low', label: 'Низкий (адм.)' },
      ],
    },
    budget: { label: 'Бюджет, ч', type: 'number' },
  }),
});

export const isValidTemplateKind = (kind) =>
  Object.prototype.hasOwnProperty.call(TEMPLATE_KINDS, kind);

export function extractTemplatePayload(kind, source) {
  if (!isValidTemplateKind(kind) || !source || typeof source !== 'object') return null;
  const budget = { remaining: MAX_NODES };

  if (kind === 'task') {
    const payload = sanitizeBySchema(TASK_FIELDS, source);
    if (Array.isArray(source.subtasks)) {
      const subtasks = sanitizeTaskList(source.subtasks, budget);
      if (subtasks.length) payload.subtasks = subtasks;
    }
    return Object.keys(payload).length ? payload : null;
  }

  const payload = sanitizeBySchema(PROJECT_FIELDS, source);
  if (Array.isArray(source.tasks)) {
    const tasks = sanitizeTaskList(source.tasks, budget);
    if (tasks.length) payload.tasks = tasks;
  }
  return Object.keys(payload).length ? payload : null;
}

export function applyTemplatePayload(kind, payload) {
  if (!isValidTemplateKind(kind) || !payload || typeof payload !== 'object') return {};
  const budget = { remaining: MAX_NODES };

  if (kind === 'task') {
    const result = sanitizeBySchema(TASK_FIELDS, payload);
    if (Array.isArray(payload.subtasks)) {
      const subtasks = sanitizeTaskList(payload.subtasks, budget);
      if (subtasks.length) result.subtasks = subtasks;
    }
    return result;
  }

  const result = sanitizeBySchema(PROJECT_FIELDS, payload);
  if (Array.isArray(payload.tasks)) {
    const tasks = sanitizeTaskList(payload.tasks, budget);
    if (tasks.length) result.tasks = tasks;
  }
  return result;
}