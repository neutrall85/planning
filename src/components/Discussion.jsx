import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { uid, fmtDT, initials } from '../utils/date';
import { has } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import { COMMENT_EDIT_WINDOW } from '../utils/constants';
import Avatar from './Avatar';

/**
 * Рендерит текст с подсветкой @упоминаний
 */
function renderMentionText(text) {
  return text.split("@").map((part, i) => {
    if (i === 0) return <span key={i}>{part}</span>;
    const tokens = part.split(/(\s+)/);
    let mention = tokens[0];
    let restStart = 1;
    if (tokens.length > 2 && /^[А-ЯA-ZЁ]/.test(tokens[2])) {
      mention += " " + tokens[2];
      restStart = 3;
    }
    return (
      <span key={i}>
        <span className="mention">@{mention}</span>
        {tokens.slice(restStart).join("")}
      </span>
    );
  });
}

/**
 * Извлекает ID сотрудников, упомянутых через @фамилия
 * Экспортируется для использования в родительских компонентах (например, для уведомлений)
 */
export function extractMentions(text, employees) {
  const found = [];
  text.split("@").slice(1).forEach((part) => {
    const token = part.trim().split(/[\s,.!?:;]/)[0].toLowerCase();
    if (!token) return;
    const emp = employees.find((e) => e.last.toLowerCase() === token);
    if (emp && !found.includes(emp.id)) found.push(emp.id);
  });
  return found;
}

/**
 * Универсальный компонент обсуждения (дерево комментариев с ответами, упоминаниями, редактированием)
 */
export default function Discussion({
  comments,
  currentUser,
  candidates = [],           // сотрудники, доступные для @упоминаний
  onUpdateComments,          // (newComments) => void – вызывается при любом изменении
  onCommentAdded,            // (comment) => void – опционально, вызывается после добавления нового комментария
  readOnly = false,
  canComment = true,
  toast,
  employees = [],            // все сотрудники для поиска авторов
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [mentionQ, setMentionQ] = useState(null);
  const [mentionPopup, setMentionPopup] = useState({ visible: false, x: 0, y: 0 });
  const textareaRef = useRef(null);

  const allEmployees = employees;

  // Фильтрация кандидатов для упоминаний
  const filteredCandidates = useMemo(() => {
    if (mentionQ === null) return [];
    return candidates.filter((e) =>
      (`${e.last} ${e.first}`).toLowerCase().includes(mentionQ.toLowerCase())
    );
  }, [candidates, mentionQ]);

  // При изменении mentionQ вычисляем позицию для портала
  useEffect(() => {
    if (mentionQ !== null && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setMentionPopup({
        visible: true,
        x: rect.left,
        y: rect.bottom + 4,
      });
    } else {
      setMentionPopup(prev => ({ ...prev, visible: false }));
    }
  }, [mentionQ]);

  // Поиск автора по ID
  const getAuthor = (id) => allEmployees.find((e) => e.id === id);

  // Обработка ввода текста (включая поиск @)
  const onType = (val) => {
    setText(val);
    const lastAt = val.lastIndexOf("@");
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

  // Выбор упоминания из всплывающего списка
  const pickMention = (emp) => {
    const lastAt = text.lastIndexOf("@");
    setText(text.slice(0, lastAt + 1) + `${emp.last} ${emp.first} `);
    setMentionQ(null);
  };

  // Отправка комментария
  const send = () => {
    if (readOnly || !canComment) return;
    if (!text.trim()) return;

    const newComment = {
      id: uid(),
      parentId: replyTo,
      authorId: currentUser.id,
      ts: Date.now(),
      text: text.trim(),
    };

    const updatedComments = [...comments, newComment];
    onUpdateComments(updatedComments);
    if (onCommentAdded) onCommentAdded(newComment);

    setText("");
    setReplyTo(null);
    setMentionQ(null);
  };

  // Проверка права на удаление
  const canDelete = (c) => {
    const hasReplies = comments.some((x) => x.parentId === c.id);
    if (has(currentUser, "admin", "director")) return true;
    return c.authorId === currentUser.id && !hasReplies;
  };

  // Проверка права на редактирование (в течение окна)
  const canEdit = (c) =>
    c.authorId === currentUser.id &&
    Date.now() - c.ts < COMMENT_EDIT_WINDOW;

  // Удаление комментария и всех ответов
  const del = (c) => {
    if (!window.confirm("Удалить комментарий и все ответы?")) return;

    const subtree = new Set([c.id]);
    let changed = true;
    while (changed) {
      changed = false;
      comments.forEach((x) => {
        if (x.parentId && subtree.has(x.parentId) && !subtree.has(x.id)) {
          subtree.add(x.id);
          changed = true;
        }
      });
    }

    const updatedComments = comments.filter((x) => !subtree.has(x.id));
    onUpdateComments(updatedComments);
    if (toast) toast("Комментарий удалён");
  };

  // Сохранение отредактированного комментария
  const saveEdit = (c) => {
    if (!editText.trim()) return;
    const updatedComments = comments.map((x) =>
      x.id === c.id ? { ...x, text: editText.trim() } : x
    );
    onUpdateComments(updatedComments);
    setEditingId(null);
    setEditText("");
  };

  // Рекурсивное построение дерева комментариев
  const renderTree = (parentId, depth) => {
    const children = comments
      .filter((c) => (c.parentId || null) === parentId)
      .sort((a, b) => a.ts - b.ts);

    return children.map((c) => {
      const author = getAuthor(c.authorId);
      return (
        <div key={c.id}>
          <div className={"cm" + (depth > 0 ? " reply" : "")}>
            <div className="cm-head">
              <Avatar employee={author} size="xs" />
              <span className="cm-author">
                {author ? `${author.last} ${author.first}` : "—"}
              </span>
              <span className="mut sm">{fmtDT(c.ts)}</span>
              {!readOnly &&
                editingId !== c.id &&
                Date.now() - c.ts < COMMENT_EDIT_WINDOW &&
                c.authorId === currentUser.id && (
                  <span className="mut sm">· можно редактировать</span>
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
                  <button className="btn primary sm" onClick={() => saveEdit(c)}>
                    Сохранить
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => setEditingId(null)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="cm-text">{renderMentionText(c.text)}</div>
            )}

            {!readOnly && canComment && (
              <div className="cm-actions">
                <button className="link" onClick={() => setReplyTo(c.id)}>
                  Ответить
                </button>
                {canEdit(c) && editingId !== c.id && (
                  <button
                    className="link"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditText(c.text);
                    }}
                  >
                    Редактировать
                  </button>
                )}
                {canDelete(c) && (
                  <button className="link red-link" onClick={() => del(c)}>
                    Удалить
                  </button>
                )}
              </div>
            )}
          </div>
          {renderTree(c.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="chat">
      {renderTree(null, 0)}

      {comments.length === 0 && (
        <div className="mut sm">Обсуждений пока нет — начните диалог.</div>
      )}

      {!readOnly && canComment ? (
        <>
          {replyTo && (
            <div className="reply-banner">
              Ответ на комментарий{" "}
              {(() => {
                const parent = comments.find((x) => x.id === replyTo);
                const author = parent ? getAuthor(parent.authorId) : null;
                return author ? `${author.last} ${author.first}` : "";
              })()}
              <button className="link" onClick={() => setReplyTo(null)}>
                отменить
              </button>
            </div>
          )}

          <div className="cm-input-wrap">
            {/* Список упоминаний рендерится через портал */}
            {mentionPopup.visible && filteredCandidates.length > 0 && createPortal(
              <div
                className="mention-pop"
                style={{
                  position: 'fixed',
                  left: mentionPopup.x,
                  top: mentionPopup.y,
                  zIndex: 10001,
                }}
              >
                {filteredCandidates.slice(0, 6).map((e) => (
                  <div
                    key={e.id}
                    className="mention-item"
                    onClick={() => pickMention(e)}
                  >
                    <span className="avatar xs">
                      {initials(e.first, e.last)}
                    </span>
                    {e.last} {e.first}
                    <span className="mut sm">
                      {/* можно добавить отдел, если нужен */}
                    </span>
                  </div>
                ))}
              </div>,
              document.body
            )}

            <textarea
              ref={textareaRef}
              className="inp"
              rows="2"
              placeholder="Комментарий… Введите @ для упоминания участника"
              value={text}
              onChange={(e) => onType(e.target.value)}
              disabled={readOnly || !canComment}
            />
          </div>

          <div className="cm-foot">
            <span className="mut sm">
              Участники получат уведомление; упомянутые — отдельно.
            </span>
            <button className="btn primary sm" onClick={send}>
              <Ic d={ICONS.chat} size={13} /> Отправить
            </button>
          </div>
        </>
      ) : readOnly ? (
        <div className="info-box">
          Обсуждение сохранено. Добавление комментариев к архивным объектам запрещено.
        </div>
      ) : (
        !canComment && (
          <div className="info-box">
            У вас нет прав для комментирования этого объекта.
          </div>
        )
      )}
    </div>
  );
}