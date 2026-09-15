// src/utils/reactions.js

/**
 * Единственный источник правды о доступных реакциях: эмодзи и подпись
 * (для title/aria-label). Из этого же списка выводится множество
 * допустимых эмодзи для валидации на уровне домена.
 */
export const REACTIONS = [
  { emoji: '👍', label: 'Нравится' },
  { emoji: '❤️', label: 'Люблю' },
  { emoji: '🔥', label: 'Огонь' },
  { emoji: '😂', label: 'Смешно' },
  { emoji: '😮', label: 'Удивление' },
  { emoji: '😢', label: 'Грустно' },
  { emoji: '✅', label: 'Согласен' },
];

const ALLOWED = new Set(REACTIONS.map(r => r.emoji));

/** Предикат для домена: можно ли вообще такую реакцию поставить. */
export const isAllowedReaction = (emoji) => ALLOWED.has(emoji);