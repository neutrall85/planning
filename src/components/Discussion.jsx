// src/components/Discussion.jsx
import React, { useCallback, useMemo, useState } from 'react';
import { extractMentions } from '../utils/mentionParser';
import { Lightbox } from './Lightbox';

import { DiscussionProvider } from './discussion/context';
import { CommentPolicy } from './discussion/CommentPolicy';
import { useCommentList } from './discussion/useCommentList';
import DiscussionHeader from './discussion/DiscussionHeader';
import SortToolbar from './discussion/SortToolbar';
import CommentTree from './discussion/CommentTree';
import CommentComposer from './discussion/CommentComposer';

export { extractMentions };

export default function Discussion({
  store,
  filter,
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

  const { comments, visibleComments } = useCommentList(store, filter, searchQuery);

  const getAuthor = useCallback(
    (id) => employees.find(e => e.id === id),
    [employees]
  );

  const policy = useMemo(
    () => new CommentPolicy({ currentUser, comments, readOnly }),
    [currentUser, comments, readOnly ]
  );

  const pinnedComments = useMemo(
    () => comments.filter(c => c.pinned),
    [comments]
  );

  const scrollToComment = useCallback((id) => {
    const el = document.getElementById(`comment-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('comment-flash');
    setTimeout(() => el.classList.remove('comment-flash'), 2000);
  }, []);

  const saveEdit = (c) => {
    if (!editText.trim()) return;
    store.updateComment(c.id, editText.trim());
    setEditingId(null);
    setEditText('');
    toast?.('Комментарий обновлён');
  };

  const togglePin = (c) => {
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
  };

  const setReaction = useCallback((commentId, emoji) => {
    try {
      store.setReaction(commentId, emoji);
    } catch (err) {
      toast?.(err.message, 'error');
    }
  }, [store, toast]);

  const onDelete = (c) => {
    if (!window.confirm('Удалить комментарий и все ответы?')) return;
    store.deleteComment(c.id);
    toast?.('Комментарий удалён');
  };

  const openLightbox = (list, index) => setLightbox({ list, index });
  const closeLightbox = () => setLightbox({ list: [], index: null });
  const prevLightbox = () =>
    setLightbox(s => ({ ...s, index: s.index === 0 ? s.list.length - 1 : s.index - 1 }));
  const nextLightbox = () =>
    setLightbox(s => ({ ...s, index: s.index === s.list.length - 1 ? 0 : s.index + 1 }));

  const ctx = {
    currentUser,
    employees,
    getAuthor,
    policy,
    comments,
    visibleComments,
    sortOrder,
    searchQuery,
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
  };

  return (
    <DiscussionProvider value={ctx}>
      <div className="chat">
        <DiscussionHeader
          pinned={pinnedComments}
          onJump={scrollToComment}
          onSearchChange={setSearchQuery}
          resultCount={visibleComments.length}
        />

        {comments.length > 1 && (
          <SortToolbar value={sortOrder} onChange={setSortOrder} />
        )}

        <CommentTree />

        {visibleComments.length === 0 && searchQuery && (
          <div className="mut sm">Ничего не найдено</div>
        )}
        {comments.length === 0 && !searchQuery && (
          <div className="mut sm">Обсуждений пока нет — начните диалог.</div>
        )}

        {!readOnly ? (
          <CommentComposer
            store={store}
            filter={filter}
            currentUser={currentUser}
            candidates={candidates}
            toast={toast}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            comments={comments}
            getAuthor={getAuthor}
            readOnly={readOnly}
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