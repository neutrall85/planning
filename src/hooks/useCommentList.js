// src/hooks/useCommentList.js
import { useMemo } from 'react';
import { useSelector } from '../context/StoreContext';
import { flattenInRenderOrder, countOccurrences } from '../utils/commentTree';
import { commentInChat } from '../utils/commentFilter';

// Стабильная ссылка на пустой массив: useSelector должен возвращать
// одну и ту же ссылку, пока срез не менялся, иначе useSyncExternalStore
// уйдёт в бесконечный цикл на `s.comments || []` каждый вызов.
const EMPTY = Object.freeze([]);

/**
 * Список комментариев и производные выборки.
 *
 * Принадлежность чату определяется общей функцией commentInChat - тем
 * же правилом, что используют useChatUnreadCount и useUnreadCommentIndex.
 * Единственный источник правды, расхождений между рендером и счётчиком
 * не бывает.
 */
export function useCommentList(projectId, taskId, searchQuery, sortOrder) {
  const allComments = useSelector((s) => s.comments || EMPTY);

  const comments = useMemo(() => {
    return allComments
      .filter((c) => commentInChat(c, projectId, taskId))
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [allComments, projectId, taskId]);

  const visibleComments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return comments;
    const matchesText = (text) => String(text || '').toLowerCase().includes(q);
    const byId = new Map(comments.map((c) => [c.id, c]));
    const keep = new Set();
    for (const c of comments) {
      if (!matchesText(c.text)) continue;
      keep.add(c.id);
      let cur = c;
      while (cur.parentId && byId.has(cur.parentId)) {
        cur = byId.get(cur.parentId);
        keep.add(cur.id);
      }
    }
    return comments.filter((c) => keep.has(c.id));
  }, [comments, searchQuery]);

  const matchSteps = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const matched = comments.filter((c) =>
      String(c.text || '').toLowerCase().includes(q.toLowerCase())
    );
    if (!matched.length) return [];
    const idSet = new Set(matched.map((c) => c.id));
    const ordered = flattenInRenderOrder(visibleComments, sortOrder)
      .filter((c) => idSet.has(c.id));
    const steps = [];
    for (const c of ordered) {
      const count = countOccurrences(c.text, q);
      for (let i = 0; i < count; i++) {
        steps.push({ commentId: c.id, occurrence: i });
      }
    }
    return steps;
  }, [comments, visibleComments, sortOrder, searchQuery]);

  return { comments, visibleComments, matchSteps };
}