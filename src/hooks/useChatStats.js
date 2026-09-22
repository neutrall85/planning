// src/hooks/useChatStats.js
import { useMemo } from 'react';
import { useSelector } from '../context/StoreContext';
import { chatKeysFor } from '../utils/chatKey';
import { commentInChat } from '../utils/commentFilter';

const EMPTY_COMMENTS = Object.freeze([]);
const EMPTY_READS = Object.freeze([]);

function buildLastReadMap(chatReads, userId) {
  const map = new Map();
  for (const r of chatReads) {
    if (r.userId === userId) map.set(r.chatKey, r.lastReadAt);
  }
  return map;
}

function effectiveLastRead(comment, lastReadByKey) {
  let max = 0;
  for (const key of chatKeysFor(comment)) {
    const v = lastReadByKey.get(key) || 0;
    if (v > max) max = v;
  }
  return max;
}

/**
 * Разовое чтение отметки «прочитано до» для чата без подписки.
 *
 * Возвращает максимум отметок по всем чатам, в которых виден хотя бы
 * один комментарий этого чата:
 *   - чат задачи N проекта P  - max(task:N, project:P);
 *   - чат проекта P           - max(project:P, task:N, task:M, ...)
 *                                по всем задачам, чьи комментарии
 *                                видны в этом проекте.
 *
 * Именно поэтому чтение в проекте «гасит» подсветку в его задачах
 * и наоборот. Формула согласована с effectiveLastRead: расхождений
 * между подсветкой и счётчиками быть не может.
 */
export function readLastReadAt(store, userId, filter) {
  const snap = store.getSnapshot();
  const reads = snap.chatReads || EMPTY_READS;
  const comments = snap.comments || EMPTY_COMMENTS;

  const keys = new Set();
  for (const c of comments) {
    if (!commentInChat(c, filter.projectId, filter.taskId)) continue;
    for (const k of chatKeysFor(c)) keys.add(k);
  }
  if (keys.size === 0) {
    for (const k of chatKeysFor(filter)) keys.add(k);
  }

  let max = 0;
  for (const r of reads) {
    if (r.userId !== userId) continue;
    if (!keys.has(r.chatKey)) continue;
    if (r.lastReadAt > max) max = r.lastReadAt;
  }
  return max;
}

/**
 * Отметки прочтения и правило «сообщение непрочитано».
 * Единственная точка правды для двух потребителей:
 *   - useChatUnreadCount    (бейдж на вкладке);
 *   - useUnreadCommentIndex (бейдж на карточке).
 */
export function useChatReadLookup(userId) {
  const chatReads = useSelector((s) => s.chatReads || EMPTY_READS);

  return useMemo(() => {
    const lastReadByKey = buildLastReadMap(chatReads, userId);
    return {
      getLastReadAt: (key) => lastReadByKey.get(key) || 0,
      isUnread: (comment) =>
        comment.authorId !== userId &&
        comment.createdAt > effectiveLastRead(comment, lastReadByKey),
    };
  }, [chatReads, userId]);
}

/**
 * Число непрочитанных сообщений в одном чате для текущего пользователя.
 */
export function useChatUnreadCount(userId, projectId, taskId = null) {
  const comments = useSelector((s) => s.comments || EMPTY_COMMENTS);
  const lookup = useChatReadLookup(userId);

  return useMemo(() => {
    if (!userId) return 0;
    let count = 0;
    for (const c of comments) {
      if (!commentInChat(c, projectId, taskId)) continue;
      if (lookup.isUnread(c)) count += 1;
    }
    return count;
  }, [comments, lookup, userId, projectId, taskId]);
}

/**
 * Индекс непрочитанных по всем чатам сразу: Map<chatKey, count>.
 */
export function useUnreadCommentIndex(userId) {
  const comments = useSelector((s) => s.comments || EMPTY_COMMENTS);
  const lookup = useChatReadLookup(userId);

  return useMemo(() => {
    if (!userId) return new Map();
    const counts = new Map();

    for (const c of comments) {
      if (!lookup.isUnread(c)) continue;
      for (const key of chatKeysFor(c)) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return counts;
  }, [comments, lookup, userId]);
}

/**
 * Общее число сообщений в чате (без фильтра «прочитано»).
 *
 * Правило принадлежности то же, что у useChatUnreadCount -
 * commentInChat: чат задачи видит только свои комментарии, чат проекта -
 * все комментарии проекта, включая комментарии его задач.
 *
 * Отдельный хук, а не переиспользование useCommentList: там подписка на
 * срез + сортировка + подготовка matchSteps, всё это в подписи вкладки
 * не нужно. Здесь только счётчик.
 *
 * Ноль при пустом чате - значимое значение: подпись «Обсуждение (0)»
 * читается как факт, а не как «данных нет». Поэтому хук не отсеивает
 * нулевой результат.
 */
export function useChatTotalCount(projectId, taskId = null) {
  const comments = useSelector((s) => s.comments || EMPTY_COMMENTS);
  return useMemo(() => {
    if (!projectId && !taskId) return 0;
    let count = 0;
    for (const c of comments) {
      if (commentInChat(c, projectId, taskId)) count += 1;
    }
    return count;
  }, [comments, projectId, taskId]);
}