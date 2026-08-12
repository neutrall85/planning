import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { uid, fmtDT, initials } from '../../utils/date';
import { has } from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import { COMMENT_EDIT_WINDOW_MS } from '../../utils/config';
import { useDataHelpers } from '../../hooks';
import { sanitizeHtml } from '../../utils/string';

function renderMentionText(text) {
  const safeText = sanitizeHtml(text);
  return safeText.split("@").map((part, i) => {
    if (i === 0) return <span key={i}>{part}</span>;
    const tokens = part.split(/(\s+)/);
    let mention = tokens[0];
    let restStart = 1;
    if (tokens.length > 2 && /^[А-ЯA-ZЁ]/.test(tokens[2])) { mention += " " + tokens[2]; restStart = 3; }
    return <span key={i}><span className="mention">@{mention}</span>{tokens.slice(restStart).join("")}</span>;
  });
}

function extractMentions(text, employees) {
  const found = [];
  text.split("@").slice(1).forEach((part) => {
    const token = part.trim().split(/[\s,.!?:;]/)[0].toLowerCase();
    if (!token) return;
    const emp = employees.find((e) => e.last.toLowerCase() === token);
    if (emp && !found.includes(emp.id)) found.push(emp.id);
  });
  return found;
}

function taskParticipants(db, taskId, comments = []) {
  const ids = new Set();
  
  // Добавляем исполнителей задачи
  const task = db.tasks.find((t) => t.id === taskId);
  if (task && task.assigneeIds) {
    task.assigneeIds.forEach((id) => ids.add(id));
  }
  
  // Добавляем автора задачи
  if (task && task.creatorId) ids.add(task.creatorId);
  
  // Добавляем авторов комментариев
  comments.forEach((c) => {
    if (c.authorId) ids.add(c.authorId);
  });
  
  return [...ids].map((id) => db.employees.find((e) => e.id === id)).filter(Boolean);
}

function projectParticipants(db, projectId, comments = []) {
  const ids = new Set();
  
  // Добавляем исполнителей задач проекта
  db.tasks
    .filter((t) => t.projectId === projectId)
    .forEach((t) => (t.assigneeIds || []).forEach((id) => ids.add(id)));
  
  // Добавляем менеджера проекта
  const p = db.projects.find((x) => x.id === projectId);
  if (p) {
    if (p.managerId) ids.add(p.managerId);
    if (p.creatorId) ids.add(p.creatorId);
  }
  
  // Добавляем авторов комментариев
  comments.forEach((c) => {
    if (c.authorId) ids.add(c.authorId);
  });
  
  // Если участников всё ещё мало, добавляем всех с ролями project_manager и project_lead
  if (ids.size < 3) {
    db.employees.forEach((e) => {
      if ((e.roles || []).includes('project_manager') || 
          (e.roles || []).includes('project_lead')) {
        ids.add(e.id);
      }
    });
  }
  
  return [...ids].map((id) => db.employees.find((e) => e.id === id)).filter(Boolean);
}

export default function Discussion({
  db,
  ur,
  entity,
  entityType = 'task',
  onUpdate,
  notify,
  toast,
  readOnly = false,
  canComment = true,
}) {
  // Если entity не передан, ничего не рендерим
  if (!entity) return null;

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [mentionQ, setMentionQ] = useState(null);
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef(null);

  const comments = entity.comments || [];
  const { primaryDept } = useDataHelpers(db);
  
  const candidates = useMemo(
    () => {
      if (entityType === 'project') {
        return projectParticipants(db, entity.id, comments).filter((e) => e.id !== ur.id);
      } else {
        return taskParticipants(db, entity.id, comments).filter((e) => e.id !== ur.id);
      }
    },
    [db, entityType, entity.id, ur.id, comments.length, db.tasks?.length]
  );

  useEffect(() => {
    if (mentionQ !== null && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setMentionPos({
        top: rect.top,
        left: rect.left,
      });
    }
  }, [mentionQ]);

  const onType = (val) => {
    setText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0) {
      const suffix = val.slice(lastAt + 1);
      if (!/\s/.test(suffix) && suffix.length <= 30) setMentionQ(suffix);
      else setMentionQ(null);
    } else setMentionQ(null);
  };

  const pickMention = (e) => {
    const lastAt = text.lastIndexOf("@");
    setText(text.slice(0, lastAt + 1) + `${e.last} ${e.first} `);
    setMentionQ(null);
  };

  const filtered = mentionQ === null ? [] : candidates.filter((e) =>
    (`${e.last} ${e.first}`).toLowerCase().includes(mentionQ.toLowerCase())
  );

  const send = () => {
    if (readOnly || !canComment) return;
    if (!text.trim()) return;

    const c = {
      id: uid(),
      parentId: replyTo,
      authorId: ur.id,
      ts: Date.now(),
      text: text.trim(),
    };

    const updatedEntity = {
      ...entity,
      comments: [...comments, c],
      history: [
        ...(entity.history || []),
        { ts: Date.now(), who: ur.id, text: "Добавлен комментарий" + (replyTo ? " (ответ)" : "") },
      ],
    };

    onUpdate(updatedEntity);

    // Уведомления
    const mentioned = extractMentions(c.text, db.employees);
    const pj = db.projects.find((p) => p.id === entity.projectId);
    const subs = new Set(mentioned);

    // Для задач – добавить исполнителей, для проектов – только менеджера
    if (entityType === 'task' && entity.assigneeIds) {
      entity.assigneeIds.forEach((id) => subs.add(id));
    }
    if (pj && pj.managerId) subs.add(pj.managerId);
    if (replyTo) {
      const parent = comments.find((x) => x.id === replyTo);
      if (parent) subs.add(parent.authorId);
    }
    subs.delete(ur.id);

    const entityLabel = entityType === 'task' ? 'задаче' : 'проекту';
    const entityTitle = entity.title || '';

    subs.forEach((uidX) => {
      notify(
        uidX,
        `${ur.last} ${ur.first}: новый комментарий к ${entityLabel} «${entityTitle}»${
          mentioned.includes(uidX) ? " (вас упомянули)" : ""
        }.`
      );
    });

    setText("");
    setReplyTo(null);
    setMentionQ(null);
  };

  const canDelete = (c) => {
    const hasReplies = comments.some((x) => x.parentId === c.id);
    if (has(ur, "admin", "director")) return true;
    return c.authorId === ur.id && !hasReplies;
  };

  const canEdit = (c) =>
    c.authorId === ur.id && Date.now() - c.ts < COMMENT_EDIT_WINDOW_MS;

  const del = (c) => {
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
    const updatedEntity = {
      ...entity,
      comments: comments.filter((x) => !subtree.has(x.id)),
      history: [
        ...(entity.history || []),
        { ts: Date.now(), who: ur.id, text: "Комментарий удалён" },
      ],
    };
    onUpdate(updatedEntity);
    toast("Комментарий удалён");
  };

  const saveEdit = (c) => {
    if (!editText.trim()) return;
    const updatedEntity = {
      ...entity,
      comments: comments.map((x) =>
        x.id === c.id ? { ...x, text: editText.trim() } : x
      ),
    };
    onUpdate(updatedEntity);
    setEditingId(null);
    setEditText("");
  };

  const renderTree = (parentId, depth) =>
    comments
      .filter((c) => (c.parentId || null) === parentId)
      .sort((a, b) => a.ts - b.ts)
      .map((c) => {
        const author = db.employees.find((e) => e.id === c.authorId);
        return (
          <div key={c.id}>
            <div className={"cm" + (depth > 0 ? " reply" : "")}>
              <div className="cm-head">
                <span className="avatar xs">
                  {author ? initials(author.first, author.last) : "??"}
                </span>
                <span className="cm-author">
                  {author ? `${author.last} ${author.first}` : "—"}
                </span>
                <span className="mut sm">{fmtDT(c.ts)}</span>
                {!readOnly &&
                  editingId !== c.id &&
                  Date.now() - c.ts < COMMENT_EDIT_WINDOW_MS &&
                  c.authorId === ur.id && (
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
                    <button className="btn ghost sm" onClick={() => setEditingId(null)}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cm-text">{renderMentionText(c.text)}</div>
              )}
              {!readOnly && (
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

  return (
    <div className="chat">
      {renderTree(null, 0)}
      {comments.length === 0 && (
        <div className="mut sm">Комментариев пока нет — начните обсуждение.</div>
      )}
      {!readOnly && canComment && (
        <>
          {replyTo && (
            <div className="reply-banner">
              Ответ на комментарий{" "}
              {(() => {
                const a = db.employees.find(
                  (e) => e.id === (comments.find((x) => x.id === replyTo) || {}).authorId
                );
                return a ? `${a.last} ${a.first}` : "";
              })()}
              <button className="link" onClick={() => setReplyTo(null)}>
                отменить
              </button>
            </div>
          )}
          <div className="cm-input-wrap">
            <textarea
              ref={textareaRef}
              className="inp"
              rows="2"
              placeholder="Комментарий… Введите @ для упоминания участника проекта"
              value={text}
              onChange={(e) => onType(e.target.value)}
            />
            {mentionQ !== null && filtered.length > 0 && ReactDOM.createPortal(
              <div className="mention-pop" style={{ top: mentionPos.top - 170, left: mentionPos.left }}>
                {filtered.slice(0, 6).map((e) => (
                  <div key={e.id} className="mention-item" onClick={() => pickMention(e)}>
                    <span className="avatar xs">{initials(e.first, e.last)}</span>
                    {e.last} {e.first}{" "}
                    <span className="mut sm">· {primaryDept(e)?.name || ""}</span>
                  </div>
                ))}
              </div>,
              document.body
            )}
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
      )}
      {readOnly && (
        <div className="info-box">
          Обсуждение сохранено. Добавление комментариев к архивным объектам запрещено.
        </div>
      )}
      {!readOnly && !canComment && (
        <div className="info-box">У вас нет прав для комментирования.</div>
      )}
    </div>
  );
}