/**
 * Русская форма слова по числу: одна / две-четыре / пять и больше.
 * Возвращает одну из трёх форм, переданных вызывающим.
 *
 * Единственное место с правилом «11–14 — всегда "много"» — оно
 * неочевидно и легко забывается при копировании.
 */
export function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  if (abs >= 11 && abs <= 19) return many;
  const last = abs % 10;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export const taskWord = (n) => plural(n, "задача", "задачи", "задач");
export const messageWord = (n) => plural(n, "сообщение", "сообщения", "сообщений");