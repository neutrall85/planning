import React, { useState, useMemo } from 'react';
import { uid, fmtDT, initials } from '../../utils/date';
import { has } from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import { COMMENT_EDIT_WINDOW_MS } from '../../utils/config';
const COMMENT_EDIT_WINDOW = COMMENT_EDIT_WINDOW_MS;
import { useDataHelpers } from '../../hooks';

function renderMentionText(text) {
  return text.split("@").map((part, i) => {
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

function projectParticipants(db, projectId) {
  const ids = new Set(db.tasks.filter((t) => t.projectId === projectId).map((t) => t.assigneeIds || []).flat());
  const p = db.projects.find((x) => x.id === projectId);
  if (p && p.managerId) ids.add(p.managerId);
  return [...ids].map((id) => db.employees.find((e) => e.id === id)).filter(Boolean);
}

export default function ProjectDiscussion({ project, currentUser, onAddComment, canComment, db, toast, readOnly }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [mentionQ, setMentionQ] = useState(null);
  const comments = project.comments || [];
  const { primaryDept } = useDataHelpers(db);
  const candidates = useMemo(() => projectParticipants(db, project.id).filter((e) => e.id !== currentUser.id), [db, project.id, currentUser.id]);

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
  const filtered = mentionQ === null ? [] : candidates.filter((e) => (`${e.last} ${e.first}`).toLowerCase().includes(mentionQ.toLowerCase()));

  const send = () => {
    if (readOnly || !canComment) return;
    if (!text.trim()) return;
    onAddComment(text.trim(), replyTo);
    setText("");
    setReplyTo(null);
    setMentionQ(null);
  };

  const canDelete = (c) => {
    const hasReplies = comments.some((x) => x.parentId === c.id);
    if (has(currentUser, "admin", "director")) return true;
    return c.authorId === currentUser.id && !hasReplies;
  };
  const canEdit = (c) => c.authorId === currentUser.id && Date.now() - c.ts < COMMENT_EDIT_WINDOW;

  const del = (c) => {
    if (!window.confirm("Удалить комментарий и все ответы?")) return;
    const subtree = new Set([c.id]);
    let changed = true;
    while (changed) { changed = false; comments.forEach((x) => { if (x.parentId && subtree.has(x.parentId) && !subtree.has(x.id)) { subtree.add(x.id); changed = true; } }); }
    const updatedComments = comments.filter((x) => !subtree.has(x.id));
    onAddComment(null, null, updatedComments);
    toast("Комментарий удалён");
  };

  const saveEdit = (c) => {
    if (!editText.trim()) return;
    const updatedComments = comments.map((x) => (x.id === c.id ? { ...x, text: editText.trim() } : x));
    onAddComment(null, null, updatedComments);
    setEditingId(null);
    setEditText("");
  };

  const renderTree = (parentId, depth) => {
    const children = comments.filter((c) => (c.parentId || null) === parentId).sort((a, b) => a.ts - b.ts);
    return children.map((c) => {
      const author = db.employees.find((e) => e.id === c.authorId);
      return (
        <div key={c.id}>
          <div className={"cm" + (depth > 0 ? " reply" : "")}>
            <div className="cm-head">
              <span className="avatar xs">{author ? initials(author.first, author.last) : "??"}</span>
              <span className="cm-author">{author ? `${author.last} ${author.first}` : "—"}</span>
              <span className="mut sm">{fmtDT(c.ts)}</span>
              {!readOnly && editingId !== c.id && Date.now() - c.ts < COMMENT_EDIT_WINDOW && c.authorId === currentUser.id && <span className="mut sm">· можно редактировать</span>}
            </div>
            {editingId === c.id ? (
              <div className="cm-edit">
                <textarea className="inp" rows="2" value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div className="cm-actions"><button className="btn primary sm" onClick={() => saveEdit(c)}>Сохранить</button><button className="btn ghost sm" onClick={() => setEditingId(null)}>Отмена</button></div>
              </div>
            ) : (
              <div className="cm-text">{renderMentionText(c.text)}</div>
            )}
            {!readOnly && canComment && (
              <div className="cm-actions">
                <button className="link" onClick={() => { setReplyTo(c.id); }}>Ответить</button>
                {canEdit(c) && editingId !== c.id && <button className="link" onClick={() => { setEditingId(c.id); setEditText(c.text); }}>Редактировать</button>}
                {canDelete(c) && <button className="link red-link" onClick={() => del(c)}>Удалить</button>}
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
      {comments.length === 0 && <div className="mut sm">Обсуждений пока нет — начните диалог.</div>}
      {!readOnly && canComment && (
        <>
          {replyTo && (
            <div className="reply-banner">
              Ответ на комментарий {(() => { const a = db.employees.find((e) => e.id === (comments.find((x) => x.id === replyTo) || {}).authorId); return a ? `${a.last} ${a.first}` : ""; })()}
              <button className="link" onClick={() => setReplyTo(null)}>отменить</button>
            </div>
          )}
          <div className="cm-input-wrap">
            {mentionQ !== null && filtered.length > 0 && (
              <div className="mention-pop">
                {filtered.slice(0, 6).map((e) => (
                  <div key={e.id} className="mention-item" onClick={() => pickMention(e)}>
                    <span className="avatar xs">{initials(e.first, e.last)}</span>{e.last} {e.first} <span className="mut sm">· {primaryDept(e)?.name || ""}</span>
                  </div>
                ))}
              </div>
            )}
            <textarea className="inp" rows="2" placeholder="Комментарий… Введите @ для упоминания участника проекта" value={text} onChange={(e) => onType(e.target.value)} />
          </div>
          <div className="cm-foot">
            <span className="mut sm">Участники получат уведомление; упомянутые — отдельно.</span>
            <button className="btn primary sm" onClick={send}><Ic d={ICONS.chat} size={13} /> Отправить</button>
          </div>
        </>
      )}
      {readOnly && <div className="info-box">Обсуждение сохранено. Добавление комментариев к архивным объектам запрещено.</div>}
      {!readOnly && !canComment && <div className="info-box">У вас нет прав для комментирования этого проекта.</div>}
    </div>
  );
}