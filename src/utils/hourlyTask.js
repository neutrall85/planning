// src/utils/hourlyTask.js
//
// Доменные правила «часовой» задачи (задача с фиксированным интервалом времени).
// Модуль не знает о React - только чистые функции над значениями формы.

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/**
 * Парсит строку времени "HH:MM" в минуты от начала суток.
 * Возвращает null, если формат невалиден.
 */
export const parseTimeToMinutes = (s) => {
  if (typeof s !== 'string') return null;
  const m = TIME_RE.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/**
 * Возвращает разницу между двумя "HH:MM" в часах.
 * null, если ввод невалиден или конец не позже начала.
 */
export const hoursBetween = (start, end) => {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (s === null || e === null || e <= s) return null;
  return (e - s) / 60;
};

/**
 * Применяет инварианты часовой задачи к значениям формы.
 *
 *   deadline      === start
 *   plannedHours  === hoursBetween(startTime, endTime)
 *
 * Единственная точка правды: для не-часовой задачи возвращает входной
 * объект без изменений (ссылочно), поэтому вызов безопасен в любом
 * апдейте - никаких лишних ре-рендеров.
 */
export const applyHourlyMode = (values) => {
  if (!values.isHourly) return values;
  const next = { ...values };
  next.deadline = next.start;
  const h = hoursBetween(next.startTime, next.endTime);
  if (h !== null) next.plannedHours = h;
  return next;
};