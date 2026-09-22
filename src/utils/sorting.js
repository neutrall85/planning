// src/utils/sorting.js
import {
  PRIORITIES,
  PROJECT_PRIORITIES,
  ADMIN_PROJECT_PRIORITIES,
  PROJECT_STATUS_ORDER,
} from './constants';

// Индексы числовых рядов. Порядок ключей в справочниках осмыслен:
// PRIORITIES объявлен «от низкого к критическому», PROJECT_STATUS_ORDER —
// «от неактивного к отменённому». Из этого и берём числовые эквиваленты,
// чтобы не дублировать значения рядом.
const TASK_PRIORITY_INDEX = new Map(
  Object.keys(PRIORITIES).map((k, i) => [k, i]),
);
const PROJECT_STATUS_INDEX = new Map(
  PROJECT_STATUS_ORDER.map((k, i) => [k, i]),
);

/**
 * Числовой «вес» приоритета проекта для сортировки.
 *
 * В справочниках order — «1 = самый высокий» (AOG=1, NORM=3 у prod;
 * high=1, low=3 у admin). Для сортировки это неудобно: пользователь
 * ожидает, что «по убыванию» для приоритета показывает сначала самые
 * важные, как и для чисел. Поэтому инвертируем знак: order 1 (AOG)
 * становится -1, order 3 (NORM) — -3. Тогда desc (по убыванию
 * значения) = сначала AOG/high, asc = сначала NORM/low.
 */
function projectPriorityWeight(project) {
  const map = project.ptype === 'admin' ? ADMIN_PROJECT_PRIORITIES : PROJECT_PRIORITIES;
  const def = map[project.priority];
  return def ? -def.order : -99;
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Универсальный компаратор: применяет valueOf() к обоим элементам и
 * сравнивает результат с учётом направления.
 *
 * Пустые значения (null/undefined/'') всегда уходят в конец, независимо
 * от направления. Иначе при сортировке задач по сроку «по возрастанию»
 * задачи без срока всплывали бы в начало (null < любая дата в нашем
 * сравнении), а при «по убыванию» — падали бы в конец: место «пустых»
 * в списке зависело бы от направления. Такая зависимость неочевидна
 * пользователю, фиксация «пустые всегда внизу» читается одинаково
 * в обоих режимах.
 */
export function makeComparator(valueOf, dir) {
  const mul = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    const aEmpty = va === null || va === undefined || va === '';
    const bEmpty = vb === null || vb === undefined || vb === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    return mul * cmp(va, vb);
  };
}

/**
 * Значение задачи по полю сортировки. lookup'ы (projectsById,
 * employeesById, getTaskSpent) переданы из вьюхи, чтобы сортировщик
 * не знал про структуру db и не тянул её сам.
 */
export function taskSortValue(task, field, { projectsById, employeesById, getTaskSpent }) {
  switch (field) {
    case 'title':
      return (task.title || '').toLowerCase();
    case 'priority':
      return TASK_PRIORITY_INDEX.get(task.priority) ?? 99;
    case 'deadline':
      return task.deadline || null;
    case 'assignee': {
      const e = task.assigneeId ? employeesById.get(task.assigneeId) : null;
      return e ? `${e.last} ${e.first}`.toLowerCase() : null;
    }
    case 'project': {
      const p = projectsById.get(task.projectId);
      return p ? (p.code || '').toLowerCase() : null;
    }
    case 'planned':
      return task.plannedHours ?? null;
    case 'fact':
      return getTaskSpent(task);
    default:
      return null;
  }
}

/** Значение проекта по полю сортировки. */
export function projectSortValue(project, field, { employeesById }) {
  switch (field) {
    case 'name':
      return (project.name || '').toLowerCase();
    case 'code':
      return (project.code || '').toLowerCase();
    case 'priority':
      return projectPriorityWeight(project);
    case 'status':
      return PROJECT_STATUS_INDEX.get(project.status) ?? 99;
    case 'start':
      return project.start || null;
    case 'end':
      return project.end || null;
    case 'budget':
      return project.budget ?? null;
    case 'manager': {
      const e = project.managerId ? employeesById.get(project.managerId) : null;
      return e ? `${e.last} ${e.first}`.toLowerCase() : null;
    }
    default:
      return null;
  }
}