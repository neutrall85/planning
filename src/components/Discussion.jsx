// src/components/Discussion.jsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { uid, fmtDT, initials } from '../utils/date';
import { has } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import { COMMENT_EDIT_WINDOW } from '../utils/constants';
import Avatar from './Avatar';
import { Lightbox } from './Lightbox';
import {
  extractMentions,
  filterMentionCandidates,
  insertMention,
} from '../utils/mentionParser';

const ALLOWED_REACTIONS = ['👍', '✅'];

function highlightText(text, query) {
  if (!query || !query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
  );
}

function renderMentionText(text) {
  return text.split('@').map((part, i) => {
    if (i === 0) return <span key={i}>{part}</span>;
    const tokens = part.split(/(\s+)/);
    let mention = tokens[0];
    let restStart = 1;
    if (tokens.length > 2 && /^[А-ЯA-ZЁ]/.test(tokens[2])) {
      mention += ' ' + tokens[2];
      restStart = 3;
    }
    return (
      <span key={i}>
        <span className="mention">@{mention}</span>
        {tokens.slice(restStart).join('')}
      </span>
    );
  });
}

export { extractMentions };

export default function Discussion({
  store,
  filter,
  currentUser,
  candidates = [],
  readOnly = false,
  canComment = true,
  toast,
  employees = [],
  onTaskClick = null,
  showTaskLink = false,
  tasks = [],
}) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [mentionQ, setMentionQ] = useState(null);
  const [mentionPopup, setMentionPopup] = useState({ visible: false, x: 0, y: 0 });
  const textareaRef = useRef(null);
  const cursorPosRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lightboxAttachments, setLightboxAttachments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Единый источник комментариев — CommentService (через DataStore).
  // Полный список без поиска — для тредов и закреплённых.
  const [comments, setComments] = useState(() =>
    store.getComments({ ...filter, search: undefined })
  );

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setComments(store.getComments({ ...filter, search: undefined }));
    });
    return unsub;
  }, [store, filter]);

  // Локальная выборка для отображения — с учётом поиска, но берётся из
  // того же сервиса, что и полный список.
  const visibleComments = useMemo(() => {
    if (!searchQuery.trim()) return comments;
    return store.getComments({ ...filter, search: searchQuery });
  }, [comments, searchQuery, store, filter]);

  const pinnedComments = useMemo(
    () => comments.filter(c => c.pinned),
    [comments]
  );

  const filteredCandidates = useMemo(
    () => filterMentionCandidates(mentionQ || '', candidates),
    [mentionQ, candidates]
  );

  useEffect(() => {
    if (mentionQ !== null && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setMentionPopup({ visible: true, x: rect.left, y: rect.bottom + 4 });
    } else {
      setMentionPopup(prev => ({ ...prev, visible: false }));
    }
  }, [mentionQ]);

  useEffect(() => {
    if (cursorPosRef.current !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(cursorPosRef.current, cursorPosRef.current);
      cursorPosRef.current = null;
    }
  }, [text]);

  const getAuthor = (id) => employees.find(e => e.id === id);

  const onType = (val) => {
    setText(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0) {
      const suffix = val.slice(lastAt + 1);
      if (!/\s/.test(suffix) && suffix.length <= 30) {
        setMentionQ(suffix);
      } else {
        setMentionQ(null);
      }
    } else {
      setMentionQ(null);
    }
  };

  const pickMention = (emp) => {
    const lastAt = text.lastIndexOf('@');
    if (lastAt === -1) return;
    const { text: newText, cursor } = insertMention(text, lastAt, emp);
    cursorPosRef.current = cursor;
    setText(newText);
    setMentionQ(null);
    textareaRef.current?.focus();
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (readOnly || !canComment) {
      toast?.('У вас нет прав для загрузки файлов', 'warning');
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    if (validFiles.length !== files.length) {
      toast?.('Некоторые файлы пропущены (только изображения до 5 МБ)', 'warning');
    }
    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      toast?.(`Добавлено ${validFiles.length} файлов`, 'success');
    }
  }, [readOnly, canComment, toast]);

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const send = async () => {
    if (readOnly || !canComment) return;
    if (!text.trim() && attachments.length === 0) {
      toast?.('Введите текст или прикрепите изображение', 'warning');
      return;
    }
    const commentData = {
      projectId: filter.projectId || null,
      taskId: filter.taskId || null,
      parentId: replyTo || null,
      authorId: currentUser.id,
      text: text.trim(),
      attachments: [],
    };
    const created = store.addComment(commentData);
    for (const file of attachments) {
      try {
        await store.addAttachment(created.id, file);
      } catch (err) {
        toast?.(`Ошибка загрузки ${file.name}: ${err.message}`, 'error');
      }
    }
    setText('');
    setReplyTo(null);
    setAttachments([]);
    setMentionQ(null);
    toast?.('Комментарий добавлен', 'success');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const target = e.target;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newText = text.substring(0, start) + '\n' + text.substring(end);
        setText(newText);
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 1;
        });
        return;
      }
      e.preventDefault();
      send();
    }
  };

  const canDelete = (c) => {
    const hasReplies = comments.some(x => x.parentId === c.id);
    if (has(currentUser, 'admin', 'director')) return true;
    return c.authorId === currentUser.id && !hasReplies;
  };

  const canEdit = (c) =>
    c.authorId === currentUser.id &&
    Date.now() - c.createdAt < COMMENT_EDIT_WINDOW;

  const canPin = (c) => has(currentUser, 'admin', 'director', 'project_lead', 'project_manager');

  const del = (c) => {
    if (!window.confirm('Удалить комментарий и все ответы?')) return;
    store.deleteComment(c.id);
    toast?.('Комментарий удалён');
  };

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

  const toggleReaction = (commentId, emoji) => {
    try {
      store.toggleReaction(commentId, emoji);
    } catch (err) {
      toast?.(err.message, 'error');
    }
  };

  const scrollToComment = (commentId) => {
    const el = document.getElementById(`comment-${commentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background 0.3s';
      el.style.background = '#fef3c7';
      setTimeout(() => { el.style.background = ''; }, 2000);
    }
  };

  const openLightbox = (list, index) => {
    setLightboxAttachments(list);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setLightboxAttachments([]);
  };

  const handlePrev = () => {
    if (lightboxIndex === null || lightboxIndex === undefined) return;
    setLightboxIndex(prev => (prev === 0 ? lightboxAttachments.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (lightboxIndex === null || lightboxIndex === undefined) return;
    setLightboxIndex(prev => (prev === lightboxAttachments.length - 1 ? 0 : prev + 1));
  };

  const getFilteredChildren = (parentId) => {
    const pool = searchQuery.trim() ? visibleComments : comments;
    return pool
      .filter(c => (c.parentId || null) === parentId)
      .sort((a, b) => a.createdAt - b.createdAt);
  };

  const renderTree = (parentId, depth) => {
    const children = getFilteredChildren(parentId);
    return children.map(c => {
      const author = getAuthor(c.authorId);
      const task = c.taskId ? tasks.find(t => t.id === c.taskId) : null;
      const attachmentsList = c.attachments || [];
      const textContent = searchQuery.trim()
        ? highlightText(c.text, searchQuery.trim())
        : renderMentionText(c.text);
      const reactions = c.reactions || {};

      return (
        <div key={c.id} id={`comment-${c.id}`}>
          <div className={'cm' + (depth > 0 ? ' reply' : '') + (c.pinned ? ' pinned' : '')}>
            <div className="cm-head">
              <Avatar employee={author} size="xs" />
              <span className="cm-author">{author ? `${author.last} ${author.first}` : '—'}</span>
              <span className="mut sm">{fmtDT(c.createdAt)}</span>
              {c.updatedAt > c.createdAt && <span className="mut sm">(ред.)</span>}
              {c.pinned && <span className="pinned-badge" title="Закреплено">📌</span>}
              {showTaskLink && c.taskId && task && onTaskClick && (
                <button
                  className="link"
                  onClick={(e) => { e.stopPropagation(); onTaskClick(c.taskId); }}
                  title="Открыть задачу"
                >
                  {task.title}
                </button>
              )}
            </div>

            {editingId === c.id ? (
              <div className="cm-edit">
                <textarea
                  className="inp"
                  rows="2"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <div className="cm-actions">
                  <button className="btn primary sm" onClick={() => saveEdit(c)}>Сохранить</button>
                  <button className="btn ghost sm" onClick={() => setEditingId(null)}>Отмена</button>
                </div>
              </div>
            ) : (
              <div className="cm-text">{textContent}</div>
            )}

            {attachmentsList.length > 0 && (
              <div className="attachment-grid">
                {attachmentsList.map((att, idx) => (
                  <div
                    key={att.id}
                    className="attachment-item"
                    onClick={() => openLightbox(attachmentsList, idx)}
                  >
                    <img src={att.url} alt={att.name} className="attachment-thumb" />
                    <div className="attachment-overlay">
                      <a
                        href={att.url}
                        download={att.name}
                        className="attachment-download"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Ic d={ICONS.download} size={16} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Реакции — фиксированный набор, защита от произвольных строк */}
            <div className="cm-reactions">
              {ALLOWED_REACTIONS.map(emoji => {
                const users = reactions[emoji] || [];
                const mine = users.includes(currentUser.id);
                const title = users.length
                  ? users.map(id => {
                      const e = getAuthor(id);
                      return e ? `${e.last} ${e.first}` : id;
                    }).join(', ')
                  : 'Поставить реакцию';
                return (
                  <button
                    key={emoji}
                    type="button"
                    className={`reaction-btn${mine ? ' on' : ''}`}
                    onClick={() => toggleReaction(c.id, emoji)}
                    title={title}
                    disabled={readOnly}
                  >
                    <span>{emoji}</span>
                    {users.length > 0 && <span className="reaction-count">{users.length}</span>}
                  </button>
                );
              })}
            </div>

            {!readOnly && canComment && (
              <div className="cm-actions">
                <button className="link" onClick={() => setReplyTo(c.id)}>Ответить</button>
                {canEdit(c) && editingId !== c.id && (
                  <button
                    className="link"
                    onClick={() => { setEditingId(c.id); setEditText(c.text); }}
                  >
                    Редактировать
                  </button>
                )}
                {canPin(c) && (
                  <button className="link" onClick={() => togglePin(c)}>
                    {c.pinned ? 'Открепить' : 'Закрепить'}
                  </button>
                )}
                {canDelete(c) && (
                  <button className="link red-link" onClick={() => del(c)}>Удалить</button>
                )}
              </div>
            )}
          </div>
          {renderTree(c.id, depth + 1)}
        </div>
      );
    });
  };

  const mentionPopupEl = mentionPopup.visible && filteredCandidates.length > 0
    ? createPortal(
        <div
          className="mention-pop"
          style={{ position: 'fixed', left: mentionPopup.x, top: mentionPopup.y, zIndex: 10001 }}
        >
          {filteredCandidates.map(e => (
            <div key={e.id} className="mention-item" onClick={() => pickMention(e)}>
              <span className="avatar xs">{initials(e.first, e.last)}</span>
              {e.last} {e.first}
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="chat">
      <div className="discussion-header">
        <div className="pinned-messages">
          {pinnedComments.length > 0 && (
            <>
              <div className="pinned-label">📌 Закреплено</div>
              {pinnedComments.map(c => {
                const author = getAuthor(c.authorId);
                const canUnpin = canPin(c);
                return (
                  <div
                    key={c.id}
                    className="pinned-item"
                    onClick={() => scrollToComment(c.id)}
                    title="Перейти к сообщению"
                  >
                    <Avatar employee={author} size="xs" />
                    <span className="pinned-author">
                      {author ? `${author.last} ${author.first}` : '—'}
                    </span>
                    <span className="mut sm">{fmtDT(c.createdAt)}</span>
                    <span className="pinned-preview">
                      {c.text.length > 50 ? c.text.substring(0, 50) + '...' : c.text}
                    </span>
                    {canUnpin && (
                      <button
                        className="icon-btn xs pinned-remove"
                        onClick={(e) => { e.stopPropagation(); togglePin(c); }}
                        title="Открепить"
                      >
                        <Ic d={ICONS.x} size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className="search-toggle">
          <button
            className={`icon-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Поиск"
          >
            <Ic d={ICONS.search} size={18} />
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="chat-search">
          <div className="search-box">
            <Ic d={ICONS.search} size={15} />
            <input
              type="text"
              placeholder="Поиск по обсуждению..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="chat-search-input"
              autoFocus
            />
            {searchQuery && (
              <button className="icon-btn xs" onClick={() => setSearchQuery('')}>
                <Ic d={ICONS.x} size={14} />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="search-result-count">
              Найдено: {visibleComments.length}
            </span>
          )}
        </div>
      )}

      {renderTree(null, 0)}

      {visibleComments.length === 0 && searchQuery && (
        <div className="mut sm">Ничего не найдено</div>
      )}

      {comments.length === 0 && !searchQuery && (
        <div className="mut sm">Обсуждений пока нет — начните диалог.</div>
      )}

      {!readOnly && canComment ? (
        <>
          {replyTo && (
            <div className="reply-banner">
              Ответ на комментарий{' '}
              {(() => {
                const parent = comments.find(x => x.id === replyTo);
                const author = parent ? getAuthor(parent.authorId) : null;
                return author ? `${author.last} ${author.first}` : '';
              })()}
              <button className="link" onClick={() => setReplyTo(null)}>отменить</button>
            </div>
          )}

          <div
            className={`cm-input-wrap${isDragOver ? ' drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {mentionPopupEl}
            <textarea
              ref={textareaRef}
              className="inp"
              rows="2"
              placeholder="Комментарий… Введите @ для упоминания участника. Перетащите изображения сюда."
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={readOnly || !canComment}
            />
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                  <span className="text-sm">{file.name}</span>
                  <button className="icon-btn xs" onClick={() => removeAttachment(idx)}>
                    <Ic d={ICONS.x} size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="cm-foot">
            <span className="mut sm">
              Участники получат уведомление; упомянутые — отдельно.
            </span>
            <div className="flex gap-2">
              <button className="btn primary sm" onClick={send}>
                <Ic d={ICONS.chat} size={13} /> Отправить
              </button>
            </div>
          </div>
        </>
      ) : readOnly ? (
        <div className="info-box">
          Обсуждение сохранено. Добавление комментариев к архивным объектам запрещено.
        </div>
      ) : (
        !canComment && (
          <div className="info-box">У вас нет прав для комментирования этого объекта.</div>
        )
      )}

      {lightboxIndex !== null && lightboxAttachments.length > 0 && (
        <Lightbox
          photos={lightboxAttachments}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
}