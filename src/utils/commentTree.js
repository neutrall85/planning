// src/utils/commentTree.js

/**
 * Порядок сортировки соседей в дереве комментариев:
 *  - корни - по выбранному порядку (новые / старые / популярные);
 *  - ответы - всегда хронологически (кто раньше ответил, тот выше).
 *
 * Единственное место, где описано правило порядка. Используется и
 * CommentTree для рендера, и flattenInRenderOrder для навигации по
 * результатам поиска, чтобы обе стороны понимали порядок одинаково.
 */
export function sortSiblings(list, isRoot, order) {
  if (!isRoot) return [...list].sort((a, b) => a.createdAt - b.createdAt);

  const sorted = [...list];
  if (order === 'new') sorted.sort((a, b) => b.createdAt - a.createdAt);
  else if (order === 'old') sorted.sort((a, b) => a.createdAt - b.createdAt);
  else if (order === 'popular') {
    sorted.sort((a, b) => {
      const diff = countReactions(b) - countReactions(a);
      return diff !== 0 ? diff : b.createdAt - a.createdAt;
    });
  }
  return sorted;
}

function countReactions(comment) {
  return Object.values(comment.reactions || {}).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );
}

/**
 * Плоский список комментариев в порядке обхода дерева - том же,
 * в каком CommentTree их отображает. Нужен для навигации по поиску:
 * «вниз» ведёт к следующему видимому совпадению, а не к следующему
 * в порядке хранилища.
 *
 * visited защищает от циклов в parentId: если данные повреждены,
 * обход не зациклится.
 */
export function flattenInRenderOrder(comments, order) {
  const byParent = new Map();
  for (const c of comments) {
    const key = c.parentId || null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c);
  }

  const result = [];
  const visited = new Set();

  const walk = (parentId) => {
    const level = byParent.get(parentId) || [];
    const ordered = sortSiblings(level, parentId === null, order);
    for (const c of ordered) {
      if (visited.has(c.id)) continue;
      visited.add(c.id);
      result.push(c);
      walk(c.id);
    }
  };
  walk(null);
  return result;
}

/**
 * Число неперекрывающихся вхождений query в text, регистронезависимо.
 * Считаем так же, как highlightText в render.jsx - иначе счётчик в бейдже
 * расходился бы с числом подсвеченных слов.
 */
export function countOccurrences(text, query) {
  if (!text || !query) return 0;
  const haystack = String(text).toLowerCase();
  const needle = String(query).toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count += 1;
    pos += needle.length;
  }
  return count;
}