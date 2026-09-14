// src/utils/mentionParser.js

/**
 * Единая точка парсинга @-упоминаний для комментариев и уведомлений.
 *
 * Клиент передаёт только текст; список сотрудников берётся из data.employees,
 * поэтому подставить «произвольного получателя уведомления» нельзя —
 * сравниваем фамилию с реально существующими сотрудниками.
 *
 * Формат: @Фамилия или @Фамилия Имя. Регистр фамилии не важен,
 * токен ограничен первым словом до разделителя.
 */

const TOKEN_BOUNDARY = /[\s,.!?:;()[\]{}"']/;

export function extractMentions(text, employees) {
  if (!text || !Array.isArray(employees) || !employees.length) return [];

  const found = new Set();
  for (const part of String(text).split('@').slice(1)) {
    const token = part.trim().split(TOKEN_BOUNDARY)[0]?.toLowerCase();
    if (!token) continue;
    const emp = employees.find(e => e.last.toLowerCase() === token);
    if (emp) found.add(emp.id);
  }
  return [...found];
}

export function isMentioned(text, employee) {
  if (!text || !employee) return false;
  return extractMentions(text, [employee]).length > 0;
}

/**
 * Кандидаты для выпадающего меню автодополнения.
 * Фильтрация по подстроке «Фамилия Имя», регистронезависимо.
 */
export function filterMentionCandidates(query, employees, limit = 8) {
  if (!Array.isArray(employees)) return [];
  const q = (query || '').trim().toLowerCase();
  if (!q) return employees.slice(0, limit);
  return employees
    .filter(e => `${e.last} ${e.first}`.toLowerCase().includes(q))
    .slice(0, limit);
}

/**
 * Вставляет выбранного сотрудника вместо открытого @query.
 * Возвращает новый текст и позицию курсора для последующей установки.
 */
export function insertMention(text, lastAtIndex, employee) {
  const prefix = text.slice(0, lastAtIndex + 1);
  const suffix = text.slice(lastAtIndex + 1);
  const insert = `${employee.last} ${employee.first}, `;
  return {
    text: prefix + insert + suffix,
    cursor: prefix.length + insert.length,
  };
}