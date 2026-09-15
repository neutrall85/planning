import { useEffect, useMemo, useState } from 'react';
import { flattenInRenderOrder, countOccurrences } from '../utils/commentTree';

export function useCommentList(store, filter, searchQuery, sortOrder) {
  const [comments, setComments] = useState(() =>
    store.getComments({ ...filter, search: undefined })
  );

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setComments(store.getComments({ ...filter, search: undefined }));
    });
    return unsub;
  }, [store, filter]);

  const visibleComments = useMemo(() => {
    if (!searchQuery.trim()) return comments;
    return store.getComments({ ...filter, search: searchQuery });
  }, [comments, searchQuery, store, filter]);

  /**
   * Шаги навигации по найденным: по одному на каждое вхождение.
   *
   *   - «кто совпал» — репозиторий (findMatches);
   *   - «в каком порядке» — flattenInRenderOrder, тот же обход, что
   *     и в CommentTree;
   *   - «сколько вхождений в каждом комментарии» — countOccurrences,
   *     та же формула, что и в highlightText.
   *
   * Один комментарий с двумя «по» даёт две записи с одинаковым
   * commentId и разными occurrence — навигация остановится на нём дважды,
   * а подсветка сдвинет акцент с первого вхождения на второе.
   */
  const matchSteps = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];

    const matched = store.getCommentMatches({ ...filter, search: q });
    if (!matched.length) return [];

    const idSet = new Set(matched.map(c => c.id));
    const ordered = flattenInRenderOrder(visibleComments, sortOrder)
      .filter(c => idSet.has(c.id));

    const steps = [];
    for (const c of ordered) {
      const count = countOccurrences(c.text, q);
      for (let i = 0; i < count; i++) {
        steps.push({ commentId: c.id, occurrence: i });
      }
    }
    return steps;
  }, [visibleComments, sortOrder, searchQuery, store, filter]);

  return { comments, visibleComments, matchSteps };
}