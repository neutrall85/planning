import { addDays, daysDiff, iso, parseISO } from './date';

/**
 * Зависимости задач.
 *
 * Каждый тип фиксирует ОДНО поле последователя от ОДНОГО поля
 * предшественника:
 *
 *   FS (Finish-to-Start): B.start    = A.deadline
 *   SS (Start-to-Start):   B.start    = A.start
 *   FF (Finish-to-Finish): B.deadline = A.deadline
 *   SF (Start-to-Finish):  B.deadline = A.start
 *
 * Правило одно на все операции: подстановка зафиксированного поля в
 * форме и сдвиг последователя при изменении предшественника читают
 * одну и ту же таблицу RULES.
 *
 * Модуль чистый: работа только с «плоскими» задачами. Поиск
 * предшественника в репозитории — ответственность вызывающего кода.
 */
const RULES = Object.freeze({
  FS: Object.freeze({ locked: 'start',    source: 'deadline' }),
  SS: Object.freeze({ locked: 'start',    source: 'start'    }),
  FF: Object.freeze({ locked: 'deadline', source: 'deadline' }),
  SF: Object.freeze({ locked: 'deadline', source: 'start'    }),
});

/** Правило для типа зависимости, либо null. */
export const dependencyRule = (type) => RULES[type] || null;

/**
 * Поле задачи, зафиксированное её собственной зависимостью, или null.
 */
export const lockedField = (task) => {
  if (!task?.dependencyId) return null;
  return dependencyRule(task.dependencyType)?.locked ?? null;
};

/**
 * Значение зафиксированного поля, вычисленное из предшественника.
 * null — тип неизвестен или у предшественника нет нужной даты.
 */
export const deriveLockedValue = (type, predecessor) => {
  const rule = dependencyRule(type);
  if (!rule || !predecessor) return null;
  return predecessor[rule.source] ?? null;
};

/**
 * Проставить в задаче зафиксированное поле по предшественнику.
 * Возвращает тот же объект, если менять нечего, — это позволяет
 * вызывать функцию в рендере/сервисе без лишних обновлений.
 */
export const applyDependency = (task, predecessor) => {
  const field = lockedField(task);
  if (!field || !predecessor) return task;
  const value = deriveLockedValue(task.dependencyType, predecessor);
  if (value == null || task[field] === value) return task;
  return { ...task, [field]: value };
};

/**
 * Сдвиг предшественника (в днях) в отслеживаемой зависимости поля.
 *
 *   0    — изменение не касается отслеживаемого поля;
 *   N    — сдвиг (положительный — вперёд);
 *   null — данных недостаточно (нет одной из дат).
 */
export const predecessorDelta = (type, before, after) => {
  const rule = dependencyRule(type);
  if (!rule || !before || !after) return 0;
  const prev = before[rule.source];
  const next = after[rule.source];
  if (!prev || !next) return null;
  return daysDiff(prev, next);
};

/**
 * Сдвиг дат задачи на delta дней. Возвращает тот же объект, если
 * delta ноль или у задачи нет дат.
 */
export const shiftDates = (task, delta) => {
  if (!delta) return task;
  const patch = {};
  if (task.start)    patch.start    = iso(addDays(parseISO(task.start),    delta));
  if (task.deadline) patch.deadline = iso(addDays(parseISO(task.deadline), delta));
  return Object.keys(patch).length ? { ...task, ...patch } : task;
};