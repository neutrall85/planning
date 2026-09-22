// src/components/Discussion.jsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { extractMentions } from '../utils/mentionParser';
import { TOASTS } from '../utils/constants';
import { Lightbox } from './Lightbox';

import { DiscussionProvider } from './discussion/context';
import { CommentPolicy } from './discussion/CommentPolicy';
import { useCommentList } from '../hooks';
import { readLastReadAt } from '../hooks/useChatStats';
import DiscussionHeader from './discussion/DiscussionHeader';
import SortToolbar from './discussion/SortToolbar';
import CommentTree from './discussion/CommentTree';
import CommentComposer from './discussion/CommentComposer';

export { extractMentions };

/**
 * Скролл к комментарию по id: подсветить и доскроллить до центра.
 *
 * Таймер снятия класса «comment-flash» держим в ref и снимаем в
 * cleanup-эффекте при размонтировании Discussion - чтобы после ухода
 * с вкладки он не пытался трогать DOM.
 *
 * `comments` в deps - чтобы повторный вызов на тот же targetId после
 * изменения списка сработал снова.
 */
function useScrollToComment(comments) {
  const [targetId, setTargetId] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useLayoutEffect(() => {
    if (!targetId) return;
    const el = document.getElementById(`comment-${targetId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('comment-flash');
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (el.isConnected) el.classList.remove('comment-flash');
    }, 2000);
    setTargetId(null);
  }, [targetId, comments]);

  return setTargetId;
}

/**
 * Обсуждение - чат задачи или проекта.
 *
 * Принимает projectId и taskId отдельными пропсами. Один из них может
 * быть null:
 *   - чат проекта (ProjectChat): только projectId;
 *   - чат задачи (TaskModal): оба.
 */
export default function Discussion({
  store,
  projectId = null,
  taskId = null,
  currentUser,
  candidates = [],
  readOnly = false,
  toast,
  employees = [],
  onTaskClick = null,
  showTaskLink = false,
  tasks = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('new');
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [lightbox, setLightbox] = useState({ index: null, list: [] });

  /**
   * Точка отсчёта «прочитано до». Всё, что старше и чужое, считается
   * прочитанным; всё, что новее - подсвечивается как непрочитанное.
   *
   * Стартовое значение - что успело прочитаться до открытия чата
   * (из store, через readLastReadAt - разовое чтение без подписки).
   * Первое открытие - cutoff = 0, вся история подсвечена.
   *
   * Дальше cutoff двигается вперёд:
   *   - при открытии чата (эффект ниже);
   *   - при отправке своего сообщения (handleCommentCreated) - старые
   *     непрочитанные «гаснут».
   */
  const [readCutoff, setReadCutoff] = useState(() =>
    readLastReadAt(store, currentUser.id, { projectId, taskId })
  );

  const isCommentUnread = useCallback(
    (c) => c.authorId !== currentUser.id && c.createdAt > readCutoff,
    [currentUser.id, readCutoff],
  );

  // Пометка «прочитано = сейчас» при открытии чата и при закрытии:
  // счётчики на вкладке и карточке обнуляются сразу, а не по закрытию
  // модалки. Cleanup закрывает окно между открытием и закрытием -
  // если во время просмотра пришли новые сообщения, они тоже попадут
  // в прочитанные.
  useEffect(() => {
    const userId = currentUser.id;
    const filter = { projectId, taskId };
    store.markChatRead(userId, filter);
    return () => store.markChatRead(userId, filter);
  }, [store, currentUser.id, projectId, taskId]);

  const { comments, visibleComments, matchSteps } = useCommentList(
    projectId, taskId, searchQuery, sortOrder,
  );

  const scrollToComment = useScrollToComment(comments);

  /**
   * Отправка нового сообщения: сдвигаем readCutoff вперёд - все
   * прежние непрочитанные гаснут; отмечаем чат прочитанным в store -
   * счётчики на вкладке и карточке обнуляются; прокручиваем к
   * созданному комментарию.
   */
  const handleCommentCreated = useCallback((commentId) => {
    setReadCutoff(Date.now());
    store.markChatRead(currentUser.id, { projectId, taskId });
    scrollToComment(commentId);
  }, [store, currentUser.id, projectId, taskId, scrollToComment]);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  useEffect(() => {
    setCurrentMatchIndex(-1);
  }, [searchQuery]);

  const goToMatch = useCallback((delta) => {
    if (!matchSteps.length) return;
    const next = currentMatchIndex === -1
      ? (delta > 0 ? 0 : matchSteps.length - 1)
      : (currentMatchIndex + delta + matchSteps.length) % matchSteps.length;
    setCurrentMatchIndex(next);
    scrollToComment(matchSteps[next].commentId);
  }, [currentMatchIndex, matchSteps, scrollToComment]);

  const goToPrevMatch = useCallback(() => goToMatch(-1), [goToMatch]);
  const goToNextMatch = useCallback(() => goToMatch(1), [goToMatch]);

  const currentMatchNumber = currentMatchIndex === -1 ? 0 : currentMatchIndex + 1;
  const activeStep = currentMatchIndex >= 0 ? matchSteps[currentMatchIndex] : null;

  // Резолв автора по Map<id, employee>. Раньше был линейный .find -
  // он вызывался для каждого комментария (и его потомков) в дереве,
  // и на больших ветках складывался в O(N²). Стабильная ссылка на
  // Map и на useCallback - чтобы getAuthor не менялся при каждом
  // ре-рендере Discussion и не срывал возможный memo в потомках.
  const employeesById = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees],
  );
  const getAuthor = useCallback(
    (id) => employeesById.get(id),
    [employeesById],
  );

  const policy = useMemo(
    () => new CommentPolicy({ currentUser, comments, readOnly }),
    [currentUser, comments, readOnly]
  );

  const pinnedComments = useMemo(
    () => comments.filter(c => c.pinned),
    [comments]
  );

  const saveEdit = useCallback((c) => {
    if (!editText.trim()) return;
    store.updateComment(c.id, editText.trim());
    setEditingId(null);
    setEditText('');
    toast?.('Комментарий обновлён');
  }, [editText, store, toast]);

  const togglePin = useCallback((c) => {
    try {
      if (!c.pinned && pinnedComments.length >= 5) {
        toast?.('Нельзя закрепить более 5 сообщений', 'warning');
        return;
      }
      const updated = store.togglePinComment(c.id);
      toast?.(updated.pinned ? 'Комментарий закреплён' : 'Закрепление снято', 'success');
    } catch (err) {
      toast?.(err.message, 'error');
    }
  }, [pinnedComments.length, store, toast]);

  const setReaction = useCallback((commentId, emoji) => {
    try {
      store.setReaction(commentId, emoji);
    } catch (err) {
      toast?.(err.message, 'error');
    }
  }, [store, toast]);

  const onDelete = useCallback((c) => {
    store.deleteComment(c.id);
    toast?.(TOASTS.commentDeleted, 'success');
  }, [store, toast]);

  const openLightbox = useCallback((list, index) => setLightbox({ list, index }), []);
  const closeLightbox = useCallback(() => setLightbox({ list: [], index: null }), []);
  const prevLightbox = useCallback(() =>
    setLightbox(s => ({ ...s, index: s.index === 0 ? s.list.length - 1 : s.index - 1 })), []);
  const nextLightbox = useCallback(() =>
    setLightbox(s => ({ ...s, index: s.index === s.list.length - 1 ? 0 : s.index + 1 })), []);

  // Контекст пересобирается на каждый рендер - это неизбежно, потому
  // что часть полей (editingId, editText, activeStep) меняется от
  // действий внутри дерева. Мемоизация не даст выигрыша: её зависимости
  // - почти все поля объекта. Если понадобится - разделим контекст на
  // «данные» и «интерфейс».
  const ctx = {
    currentUser,
    employees,
    getAuthor,
    policy,
    comments,
    visibleComments,
    sortOrder,
    searchQuery,
    activeOccurrence: activeStep,
    editingId, setEditingId,
    editText, setEditText,
    saveEdit,
    togglePin,
    setReaction,
    onDelete,
    openLightbox,
    showTaskLink,
    onTaskClick,
    tasks,
    readOnly,
    onReply: setReplyTo,
    isCommentUnread,
  };

  return (
    <DiscussionProvider value={ctx}>
      <div className="chat">
        <DiscussionHeader
          pinned={pinnedComments}
          onJump={scrollToComment}
          onSearchChange={setSearchQuery}
          totalMatches={matchSteps.length}
          currentMatch={currentMatchNumber}
          onPrevMatch={goToPrevMatch}
          onNextMatch={goToNextMatch}
        />

        {comments.length > 1 && (
          <SortToolbar value={sortOrder} onChange={setSortOrder} />
        )}

        <CommentTree />

        {visibleComments.length === 0 && searchQuery && (
          <div className="mut sm">Ничего не найдено</div>
        )}
        {comments.length === 0 && !searchQuery && (
          <div className="mut sm">Обсуждений пока нет - начните диалог.</div>
        )}

        {!readOnly ? (
          <CommentComposer
            store={store}
            projectId={projectId}
            taskId={taskId}
            currentUser={currentUser}
            candidates={candidates}
            toast={toast}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            comments={comments}
            getAuthor={getAuthor}
            readOnly={readOnly}
            onCommentCreated={handleCommentCreated}
          />
        ) : readOnly ? (
          <div className="info-box">
            Обсуждение сохранено. Добавление комментариев к архивным объектам запрещено.
          </div>
        ) : (
          <div className="info-box">
            У вас нет прав для комментирования этого объекта.
          </div>
        )}

        {lightbox.index !== null && lightbox.list.length > 0 && (
          <Lightbox
            photos={lightbox.list}
            currentIndex={lightbox.index}
            onClose={closeLightbox}
            onPrev={prevLightbox}
            onNext={nextLightbox}
          />
        )}
      </div>
    </DiscussionProvider>
  );
}