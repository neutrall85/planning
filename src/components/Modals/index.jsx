/* eslint-disable react-hooks/purity, no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { useDataHelpers } from '../../hooks';
import {
  TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, VACATION_TYPES,
  ROLES, PROJECT_STATUSES, PROJECT_TYPES, COMMENT_EDIT_WINDOW
} from '../../utils/constants';
import {
  TODAY, fmtDMY, fmtDT, iso, addDays, uid, fmtD, parseISO, addMonths, daysDiff, initials
} from '../../utils/date';
import {
  canCreateTask, canEditTask, hasRole, canManageAllVacations, canApproveVacation,
  assigneeOptions, projectEditable, has, canManageManager, canRestore,
  computeScope, taskVisible, canChangeTaskStatus
} from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';

// ----- Вспомогательные функции для обсуждений -----
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

// ----- Discussion -----
function Discussion({ db, ur, task, patchTask, notify, toast, readOnly }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [mentionQ, setMentionQ] = useState(null);
  const comments = task.comments || [];
  const { primaryDept } = useDataHelpers(db);
  const candidates = useMemo(() => projectParticipants(db, task.projectId).filter((e) => e.id !== ur.id), [db, task.projectId, ur.id]);

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
    if (readOnly) return;
    if (!text.trim()) return;
    const c = { id: uid(), parentId: replyTo, authorId: ur.id, ts: Date.now(), text: text.trim() };
    const upd = { 
      ...task, 
      comments: [...comments, c], 
      history: [...task.history, { ts: Date.now(), who: ur.id, text: "Добавлен комментарий" + (replyTo ? " (ответ)" : "") }] 
    };
    patchTask(upd);
    const mentioned = extractMentions(c.text, db.employees);
    const pj = db.projects.find((p) => p.id === task.projectId);
    const subs = new Set(mentioned);
    task.assigneeIds?.forEach(id => subs.add(id));
    if (pj && pj.managerId) subs.add(pj.managerId);
    if (replyTo) { const parent = comments.find((x) => x.id === replyTo); if (parent) subs.add(parent.authorId); }
    subs.delete(ur.id);
    subs.forEach((uidX) => notify(uidX, `${ur.last} ${ur.first}: новый комментарий к задаче «${task.title}»${mentioned.includes(uidX) ? " (вас упомянули)" : ""}.`));
    setText(""); setReplyTo(null); setMentionQ(null);
  };
  
  const canDelete = (c) => {
    const hasReplies = comments.some((x) => x.parentId === c.id);
    if (has(ur, "admin", "director")) return true;
    return c.authorId === ur.id && !hasReplies;
  };
  const canEdit = (c) => c.authorId === ur.id && Date.now() - c.ts < COMMENT_EDIT_WINDOW;
  const del = (c) => {
    const subtree = new Set([c.id]);
    let changed = true;
    while (changed) { changed = false; comments.forEach((x) => { if (x.parentId && subtree.has(x.parentId) && !subtree.has(x.id)) { subtree.add(x.id); changed = true; } }); }
    patchTask({ ...task, comments: comments.filter((x) => !subtree.has(x.id)), history: [...task.history, { ts: Date.now(), who: ur.id, text: "Комментарий удалён" }] });
    toast("Комментарий удалён");
  };
  const saveEdit = (c) => {
    if (!editText.trim()) return;
    patchTask({ ...task, comments: comments.map((x) => (x.id === c.id ? { ...x, text: editText.trim() } : x)) });
    setEditingId(null); setEditText("");
  };
  const renderTree = (parentId, depth) => comments.filter((c) => (c.parentId || null) === parentId).sort((a, b) => a.ts - b.ts).map((c) => {
    const author = db.employees.find((e) => e.id === c.authorId);
    return (
      <div key={c.id}>
        <div className={"cm" + (depth > 0 ? " reply" : "")}>
          <div className="cm-head">
            <span className="avatar xs">{author ? initials(author.first, author.last) : "??"}</span>
            <span className="cm-author">{author ? `${author.last} ${author.first}` : "—"}</span>
            <span className="mut sm">{fmtDT(c.ts)}</span>
            {!readOnly && editingId !== c.id && Date.now() - c.ts < COMMENT_EDIT_WINDOW && c.authorId === ur.id && <span className="mut sm">· можно редактировать</span>}
          </div>
          {editingId === c.id ? (
            <div className="cm-edit">
              <textarea className="inp" rows="2" value={editText} onChange={(e) => setEditText(e.target.value)} />
              <div className="cm-actions"><button className="btn primary sm" onClick={() => saveEdit(c)}>Сохранить</button><button className="btn ghost sm" onClick={() => setEditingId(null)}>Отмена</button></div>
            </div>
          ) : (
            <div className="cm-text">{renderMentionText(c.text)}</div>
          )}
          {!readOnly && (
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

  return (
    <div className="chat">
      {renderTree(null, 0)}
      {comments.length === 0 && <div className="mut sm">Комментариев пока нет — начните обсуждение.</div>}
      {!readOnly && (<>
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
      </>)}
      {readOnly && <div className="info-box">Обсуждение сохранено. Добавление комментариев к архивным объектам запрещено.</div>}
    </div>
  );
}

// ----- TaskModal -----
export const TaskModal = ({ db, ur, taskId, spent, planSum, onClose, onSave, onDelete, onHoursReq, toast, patchTask, notify }) => {
  const { empName, getTaskSpent, vacOverlap, primaryDept } = useDataHelpers(db);
  const existing = taskId ? db.tasks.find((t) => t.id === taskId) : null;
  const readOnly = !!(existing && existing.archived);
  const editable = !readOnly && (existing ? canEditTask(ur, existing, db) : canCreateTask(ur));
  
  const scope = computeScope(ur, db) || { all: false, empIds: new Set(), projIds: new Set() };
  const projs = (scope.all ? db.projects : db.projects.filter((p) => scope.projIds.has(p.id))).filter((p) => p.status === "active" && !p.archived);
  const asOpts = assigneeOptions(ur, db);
  
  const [f, setF] = useState(existing ? { ...existing, comments: existing.comments || [] } : {
    id: "t_" + uid(), title: "", desc: "", projectId: "", assigneeIds: [], priority: "mid",
    plannedHours: 8, start: TODAY, deadline: iso(addDays(new Date(), 14)), status: "new", logs: [], comments: [], history: [], delegatedFrom: null, archived: false, archivedAt: null, closedAt: null,
  });
  const [logH, setLogH] = useState("");
  const [logNote, setLogNote] = useState("");
  const [tab, setTab] = useState("form");
  const [confirmVac, setConfirmVac] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  
  const proj = db.projects.find((p) => p.id === f.projectId);
  const isAdminProj = proj && proj.ptype === "admin";
  const sp = f.logs.reduce((s, l) => s + l.hours, 0);
  const remainProj = proj && proj.budget != null && !proj.archived ? proj.budget - (planSum(proj.id) - (existing ? (existing.plannedHours || 0) : 0)) : null;
  const vacWarn = !readOnly && f.assigneeIds && f.assigneeIds.length > 0 && f.deadline ? f.assigneeIds.some(id => vacOverlap(id, f.start || f.deadline, f.deadline)) : null;
  const isExec = existing && (existing.assigneeIds || []).includes(ur.id);
  const canLog = !readOnly && ((existing ? isExec : f.assigneeIds?.includes(ur.id)) || has(ur, "admin"));

  const statusOptions = useMemo(() => {
    if (isExec && !canChangeTaskStatus(ur, f, 'closed', db) && !canChangeTaskStatus(ur, f, 'cancelled', db)) {
      return TASK_STATUS_ORDER.filter(s => ['new', 'inwork', 'review'].includes(s));
    }
    return TASK_STATUS_ORDER;
  }, [isExec, f, ur, db]);

  const localPatchTask = (updatedTask) => {
    setF(prev => ({ ...prev, ...updatedTask }));
  };

  const doSave = () => {
    const history = [...(f.history || [])];
    if (existing) {
      if (existing.status !== f.status) history.push({ ts: Date.now(), who: ur.id, text: `Статус: ${TASK_STATUSES[existing.status].label} → ${TASK_STATUSES[f.status].label}` });
      if (JSON.stringify(existing.assigneeIds || []) !== JSON.stringify(f.assigneeIds || [])) history.push({ ts: Date.now(), who: ur.id, text: `Исполнители: ${(existing.assigneeIds || []).map(id => empName(id)).join(', ')} → ${(f.assigneeIds || []).map(id => empName(id)).join(', ')}` });
      if ((existing.plannedHours || null) !== (f.plannedHours === "" ? null : +f.plannedHours)) history.push({ ts: Date.now(), who: ur.id, text: `Плановые часы: ${existing.plannedHours ?? "—"} → ${f.plannedHours === "" ? "—" : f.plannedHours}` });
      if (existing.deadline !== (f.deadline || null)) history.push({ ts: Date.now(), who: ur.id, text: `Дедлайн: ${existing.deadline ? fmtDMY(existing.deadline) : "—"} → ${f.deadline ? fmtDMY(f.deadline) : "—"}` });
    }
    const newClosed = f.status === "closed" && (!existing || existing.status !== "closed");
    onSave({ ...f, plannedHours: f.plannedHours === "" || f.plannedHours == null ? null : +f.plannedHours, deadline: f.deadline || null, closedAt: newClosed ? TODAY : (existing ? existing.closedAt : null), history }, !existing);
  };

  const save = () => {
    if (!f.title.trim()) return toast("Укажите название задачи", "err");
    if (!f.projectId) return toast("Задача обязательно назначается в рамках проекта", "err");
    if (!f.assigneeIds || f.assigneeIds.length === 0) return toast("Выберите хотя бы одного исполнителя", "err");
    if (!isAdminProj) {
      if (!f.plannedHours || +f.plannedHours <= 0) return toast("Для производственного проекта плановые часы обязательны", "err");
      if (!f.deadline) return toast("Для производственного проекта дедлайн обязателен", "err");
    }
    if (vacWarn) { setConfirmVac(vacWarn); return; }
    doSave();
  };

  const addLog = () => {
    const h = parseFloat(String(logH).replace(",", "."));
    if (!h || h <= 0) return toast("Введите корректное количество часов", "err");
    if (f.plannedHours && sp + h > f.plannedHours) return toast(`Нельзя внести больше плановых: доступно ещё ${Math.max(0, f.plannedHours - sp)} ч`, "err");
    const newLogs = [...f.logs, { id: uid(), userId: ur.id, date: TODAY, hours: h, note: logNote.trim() }];
    setF((s) => ({ ...s, logs: newLogs }));
    setLogH(""); setLogNote("");
    toast("Часы учтены");
  };

  const [showAssigneeSelector, setShowAssigneeSelector] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState('');

  const addAssignee = () => {
    if (!newAssigneeId) return;
    if (f.assigneeIds.includes(newAssigneeId)) {
      toast("Этот исполнитель уже добавлен", "err");
      return;
    }
    setF(prev => ({ ...prev, assigneeIds: [...prev.assigneeIds, newAssigneeId] }));
    setNewAssigneeId('');
    setShowAssigneeSelector(false);
  };

  const removeAssignee = (id) => {
    setF(prev => ({ ...prev, assigneeIds: prev.assigneeIds.filter(x => x !== id) }));
  };

  const availableCandidates = useMemo(() => {
    return asOpts.filter(e => !f.assigneeIds.includes(e.id));
  }, [asOpts, f.assigneeIds]);

  return (
    <Modal title={(readOnly ? "Архивная задача — только чтение" : existing ? "Карточка задачи" : "Новая задача")} onClose={onClose} width={720}>
      {readOnly && <div className="info-box">Задача в архиве с {fmtDMY(existing.archivedAt)}. Редактирование, изменение статусов и комментирование запрещены.</div>}
      <div className="tabs sm">{[["form", "Данные"], ["time", `Учёт времени (${sp}/${f.plannedHours ?? "—"})`], ...(existing ? [["chat", `Обсуждение (${f.comments.length})`], ["hist", "История"]] : [])].map(([id, l]) => <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>)}</div>

      {tab === "form" && (<>
        {vacWarn && <div className="warn-box"><Ic d={ICONS.beach} size={15} /> Один из исполнителей находится в отпуске с {fmtDMY(vacWarn.start)} по {fmtDMY(vacWarn.end)}. Даты пересекаются с периодом задачи.</div>}
        {remainProj !== null && remainProj - (+f.plannedHours || 0) < 0 && <div className="warn-box">Внимание: задача превысит остаток бюджета проекта ({remainProj} ч). Потребуется утверждение ГД.</div>}
        {isAdminProj && !readOnly && <div className="info-box">Административный проект: дедлайн и плановые часы задачи — по желанию.</div>}
        <div className="form-grid">
          <label className="lbl">Название *</label><input className="inp" disabled={!editable} value={f.title} onChange={(e) => set("title", e.target.value)} />
          <label className="lbl">Описание</label><textarea className="inp" rows="2" disabled={!editable} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          <label className="lbl">Проект * <span className="mut">(активные)</span></label>
          {readOnly ? <input className="inp" disabled value={proj ? `${proj.code} — ${proj.name}` : ""} /> : (
              <select className="inp sel" disabled={!editable} value={f.projectId} onChange={(e) => set("projectId", e.target.value)}>
                <option value="">— выберите проект —</option>
                {projs.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}{p.ptype === "admin" ? " (административный)" : ""}</option>)}
              </select>
            )}
          <label className="lbl">Приоритет *</label>
          <select className="inp sel" disabled={!editable} value={f.priority} onChange={(e) => set("priority", e.target.value)}>
            {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          
          <label className="lbl">Исполнители *</label>
          {readOnly ? (
            <input className="inp" disabled value={(f.assigneeIds || []).map(id => empName(id)).join(', ')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {f.assigneeIds.map(id => {
                  const e = db.employees.find(x => x.id === id);
                  return e ? (
                    <span key={id} style={{ display: 'inline-flex', alignItems: 'center', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '13px' }}>
                      {e.last} {e.first}
                      {editable && <button type="button" onClick={() => removeAssignee(id)} style={{ marginLeft: '6px', border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>×</button>}
                    </span>
                  ) : null;
                })}
                {f.assigneeIds.length === 0 && <span className="mut sm">Нет исполнителей</span>}
              </div>
              {editable && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn ghost sm" onClick={() => setShowAssigneeSelector(!showAssigneeSelector)}>
                    <Ic d={ICONS.plus} size={13} /> Добавить
                  </button>
                  {showAssigneeSelector && (
                    <select className="inp sel sm" style={{ width: '200px' }} value={newAssigneeId} onChange={e => setNewAssigneeId(e.target.value)}>
                      <option value="">— выберите —</option>
                      {availableCandidates.map(e => (
                        <option key={e.id} value={e.id}>{e.last} {e.first} — {primaryDept(e)?.name || ''}</option>
                      ))}
                    </select>
                  )}
                  {showAssigneeSelector && (
                    <button className="btn primary sm" onClick={addAssignee} disabled={!newAssigneeId}>Добавить</button>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="lbl">Начало работы</label><input className="inp" type="date" disabled={!editable} value={f.start} onChange={(e) => set("start", e.target.value)} />
          <label className="lbl">Дедлайн {!isAdminProj && "*"}</label><input className="inp" type="date" disabled={!editable} value={f.deadline || ""} onChange={(e) => set("deadline", e.target.value)} />
          <label className="lbl">Плановые часы {!isAdminProj && "*"}</label>
          <div className="duo">
            <input className="inp" type="number" min="0.5" step="0.5" disabled={!editable} value={f.plannedHours ?? ""} onChange={(e) => set("plannedHours", e.target.value)} />
            {(!editable || isExec || readOnly) ? null : (has(ur, "pm", "head", "kb_chief", "director", "admin") && existing && !isAdminProj) ? <button className="btn ghost sm" type="button" onClick={() => onHoursReq("task", existing.id)}><Ic d={ICONS.clock} size={13} /> Запросить изменение часов</button> : <span className="duo-note">{isAdminProj ? "опционально" : "отдельно от дедлайна"}</span>}
          </div>
          <label className="lbl">Статус *</label>
          <select className="inp sel" disabled={!editable && !isExec} value={f.status} onChange={(e) => set("status", e.target.value)}>
            {statusOptions.map((s) => <option key={s} value={s}>{TASK_STATUSES[s].label}</option>)}
          </select>
          {isExec && !editable && !readOnly && <div className="mut sm" style={{ gridColumn: "1 / -1" }}>Исполнитель может переводить задачу в «В работе» и «На проверке»; закрытие и отмена — у ответственного/руководителя.</div>}
        </div>
        {remainProj !== null && <div className="budget-hint">Остаток бюджета проекта «{proj.code}»: <b>{remainProj} ч</b> из {proj.budget} ч</div>}
      </>)}

      {tab === "time" && (
        <div className="tm-block" style={{ marginTop: 0 }}>
          <div className="tm-progress"><div className="tm-progress-fill" style={{ width: Math.min(100, (sp / Math.max(1, f.plannedHours || 0)) * 100) + "%" }} /></div>
          {f.logs.length > 0 && (
            <div className="tm-logs">
              {f.logs.map((l) => (
                <div key={l.id} className="tm-log">
                  <span className="tm-log-name">{empName(l.userId)}</span>
                  <span className="mut">{fmtD(l.date)}</span>
                  <span className="tm-log-note">{l.note}</span>
                  <b className="tm-log-h">{l.hours} ч</b>
                </div>
              ))}
            </div>
          )}
          {canLog ? (
            <div className="tm-add">
              <input className="inp" style={{ width: 90 }} type="number" min="0.5" step="0.5" placeholder="часы" value={logH} onChange={(e) => setLogH(e.target.value)} />
              <input className="inp" placeholder="комментарий" value={logNote} onChange={(e) => setLogNote(e.target.value)} />
              <button className="btn ghost" onClick={addLog}><Ic d={ICONS.clock} size={14} /> Внести часы</button>
            </div>
          ) : <div className="mut sm">{readOnly ? "Учёт часов для архивных задач недоступен." : "Часы вносит только исполнитель задачи."}</div>}
          <div className="mut sm" style={{ marginTop: 8 }}>{f.plannedHours ? `Часы не могут превышать плановые: доступно ещё ${Math.max(0, f.plannedHours - sp)} ч.` : "Плановые часы не заданы — ограничение не применяется."}</div>
        </div>
      )}

      {tab === "chat" && existing && <Discussion db={db} ur={ur} task={f} patchTask={localPatchTask} notify={notify} toast={toast} readOnly={readOnly} />}

      {tab === "hist" && existing && (
        <div className="tm-logs" style={{ maxHeight: 260 }}>
          {[...f.history].reverse().map((h, i) => (
            <div key={i} className="tm-log"><span className="tm-log-name">{h.who === "system" ? "Система" : empName(h.who)}</span><span className="mut sm">{fmtDT(h.ts)}</span><span className="tm-log-note">{h.text}</span></div>
          ))}
        </div>
      )}

      <div className="modal-foot">
        <div className="spacer" />
        
        {!readOnly && (editable || isExec) ? (
          <>
            <button className="btn ghost" onClick={onClose}>Отмена</button>
            <button className="btn primary" onClick={save}>{existing ? "Сохранить" : "Создать задачу"}</button>
          </>
        ) : (
          <button className="btn ghost" onClick={onClose}>Закрыть</button>
        )}
        
        {existing && editable && !readOnly && (
          <button className="btn danger" onClick={() => onDelete(existing.id)}>
            <Ic d={ICONS.trash} size={14} /> Удалить
          </button>
        )}
      </div>

      {confirmVac && (
        <Modal title="Конфликт с отпуском исполнителя" onClose={() => setConfirmVac(null)} width={460}>
          <p>Один из исполнителей находится в отпуске с {fmtDMY(confirmVac.start)} по {fmtDMY(confirmVac.end)}. Вы уверены, что хотите назначить задачу?</p>
          <div className="modal-foot">
            <div className="spacer" />
            <button className="btn ghost" onClick={() => setConfirmVac(null)}>Отмена</button>
            <button className="btn primary" onClick={() => { setConfirmVac(null); doSave(); }}>Назначить</button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

// ----- ProjectModal -----
export const ProjectModal = ({ db, ur, projectId, onClose, onSave, onDelete, toast, openTask }) => {
  const existing = projectId ? db.projects.find((p) => p.id === projectId) : null;
  const { empName, getTaskSpent } = useDataHelpers(db);
  const scope = computeScope(ur, db);
  const isExec = !scope.all && !hasRole(ur, 'director', 'economist', 'kb_chief', 'head', 'pm');

  const [f, setF] = useState(existing ? { ...existing } : {
    id: "p_" + uid(), code: "", name: "", desc: "", kbId: "", managerId: "",
    start: TODAY, end: iso(addDays(new Date(), 30)), status: "active", budget: 100,
    color: ["#0ea5e9", "#8b5cf6", "#f43f5e", "#f59e0b", "#10b981", "#ec4899"][Math.floor(Math.random() * 6)],
    ptype: "prod", longterm: false, archived: false, archivedAt: null, closedAt: null,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const canMgr = canManageManager(ur);
  const isAdminType = f.ptype === "admin";
  const canEdit = hasRole(ur, 'admin');
  const isClosed = existing && existing.status === 'closed';

  const statusOptions = useMemo(() => {
    if (existing) {
      return [
        { value: 'active', label: 'Активный' },
        { value: 'suspended', label: 'Приостановлен' },
        { value: 'closed', label: 'Закрыт' }
      ];
    }
    return [
      { value: 'active', label: 'Активный' },
      { value: 'inactive', label: 'Неактивный' }
    ];
  }, [existing]);

  const save = () => {
    if (!f.name.trim()) return toast("Укажите название проекта", "err");
    if (!f.code.trim()) return toast("Укажите код проекта", "err");
    if (!f.start) return toast("Укажите дату начала", "err");
    if (!isAdminType) {
      if (!f.managerId) return toast("Для производственного проекта ответственный обязателен", "err");
      if (!f.end) return toast("Для производственного проекта дата окончания обязательна", "err");
      if (!f.budget || +f.budget <= 0) return toast("Для производственного проекта бюджет обязателен", "err");
    }
    onSave({ ...f, kbId: f.kbId || null, budget: isAdminType ? null : +f.budget, managerId: isAdminType ? (f.managerId || "") : f.managerId, end: isAdminType ? (f.end || null) : f.end, longterm: isAdminType ? !!f.longterm : false }, !existing);
  };

  const taskList = useMemo(() => {
    if (!existing) return [];
    let list = db.tasks.filter(t => t.projectId === projectId && !t.archived);
    if (isExec) {
      list = list.filter(t => (t.assigneeIds || []).includes(ur.id));
    }
    return list;
  }, [db, projectId, ur.id, isExec, existing]);

  return (
    <Modal title={existing ? (canEdit ? "Проект (Редактирование)" : "Проект (Просмотр)") : "Новый проект"} onClose={onClose} width={900}>
      {(!existing || canEdit) && (
        <div className="form-grid">
          <label className="lbl">Тип проекта *</label>
          <select className="inp sel" disabled={isClosed || !canEdit} value={f.ptype} onChange={(e) => set("ptype", e.target.value)}>
            {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="lbl">Код *</label><input className="inp" disabled={isClosed || !canEdit} value={f.code} onChange={(e) => set("code", e.target.value)} />
          <label className="lbl">Название *</label><input className="inp" disabled={isClosed || !canEdit} value={f.name} onChange={(e) => set("name", e.target.value)} />
          <label className="lbl">Описание</label><textarea className="inp" rows="2" disabled={isClosed || !canEdit} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          <label className="lbl">Привязка к КБ</label>
          <select className="inp sel" disabled={isClosed || !canEdit} value={f.kbId || ""} onChange={(e) => set("kbId", e.target.value)}>
            <option value="">Общеорганизационный</option>
            {db.kbs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <label className="lbl">Ответственный {!isAdminType && "*"}</label>
          <select className="inp sel" disabled={isClosed || !canEdit} value={f.managerId || ""} onChange={(e) => set("managerId", e.target.value)}>
            <option value="">— {isAdminType ? "не требуется" : "выберите"} —</option>
            {db.employees.map((e) => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
          </select>
          <label className="lbl">Дата начала *</label><input className="inp" type="date" disabled={isClosed || !canEdit} value={f.start} onChange={(e) => set("start", e.target.value)} />
          <label className="lbl">Дата окончания {!isAdminType && "*"}</label><input className="inp" type="date" disabled={isClosed || !canEdit} value={f.end || ""} onChange={(e) => set("end", e.target.value)} />
          <label className="lbl">Бюджет, ч {!isAdminType && "*"}</label><input className="inp" type="number" min="1" disabled={isClosed || !canEdit} value={isAdminType ? "" : f.budget} placeholder={isAdminType ? "не применяется" : ""} onChange={(e) => set("budget", e.target.value)} />
          <label className="lbl">Статус</label>
          <select className="inp sel" disabled={isClosed || !canEdit} value={f.status || 'active'} onChange={(e) => set("status", e.target.value)}>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {isAdminType && (<>
            <label className="lbl">Долгосрочный</label>
            <label className="dept-pick" style={{ gridColumn: 2 }}><input type="checkbox" disabled={!canEdit} checked={!!f.longterm} onChange={(e) => set("longterm", e.target.checked)} /> исключить из автоматической архивации</label>
          </>)}
        </div>
      )}

      {existing && (
        <div className="tm-block" style={{ marginTop: 16 }}>
          <div className="rep-panel-title">Задачи проекта ({taskList.length})</div>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 800, fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Задача</th>
                  <th>Исполнители</th>
                  <th>Статус</th>
                  <th>План (ч)</th>
                  <th>Факт (ч)</th>
                  <th>Остаток</th>
                  <th>Создал</th>
                  <th>Дедлайн</th>
                </tr>
              </thead>
              <tbody>
                {taskList.map(t => {
                  const assignees = (t.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
                  const creatorId = t.history?.length > 0 ? t.history.find(h => h.who !== 'system')?.who || t.history[0]?.who : null;
                  const creator = creatorId ? db.employees.find(e => e.id === creatorId) : null;
                  const spent = getTaskSpent(t);
                  const remaining = (t.plannedHours || 0) - spent;
                  
                  return (
                    <tr 
                      key={t.id} 
                      style={{ cursor: 'pointer' }} 
                      onClick={() => { onClose(); openTask(t.id); }}
                    >
                      <td><b>{t.title}</b></td>
                      <td>{assignees.map(a => `${a.last} ${a.first}`).join(', ') || '—'}</td>
                      <td><span className="st-chip" style={{ background: TASK_STATUSES[t.status].color + '22', color: TASK_STATUSES[t.status].color }}>{TASK_STATUSES[t.status].label}</span></td>
                      <td>{t.plannedHours ?? '—'}</td>
                      <td>{spent}</td>
                      <td style={{ color: remaining < 0 ? '#dc2626' : 'var(--mut)' }}>{t.plannedHours ? remaining : '—'}</td>
                      <td className="mut sm">{creator ? `${creator.last} ${creator.first}` : 'Система'}</td>
                      <td className="mut sm">{t.deadline ? fmtDMY(t.deadline) : '—'}</td>
                    </tr>
                  );
                })}
                {taskList.length === 0 && <tr><td colSpan="8" className="mut" style={{ textAlign: 'center' }}>У вас нет задач в этом проекте</td></tr>}
              </tbody>
            </table>
          </div>
          
          <div className="mut sm" style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
             Проект создан: {existing && existing.history?.length > 0 ? (() => {
               const creatorId = existing.history.find(h => h.who !== 'system')?.who || existing.history[0]?.who;
               const creator = creatorId ? db.employees.find(e => e.id === creatorId) : null;
               return `${creator ? creator.last + ' ' + creator.first : '—'}, ${fmtDT(existing.history[0].ts)}`;
             })() : '—'}
          </div>
        </div>
      )}

      <div className="modal-foot">
        {existing && hasRole(ur, 'admin') && (
          <button className="btn danger" onClick={() => onDelete(existing)}>
            <Ic d={ICONS.trash} size={14} /> Удалить
          </button>
        )}
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Закрыть</button>
        {(!existing || canEdit) && !isClosed && (
          <button className="btn primary" onClick={save}>{existing ? "Сохранить изменения" : "Создать проект"}</button>
        )}
        {existing && !canEdit && <span className="mut sm">Режим только для чтения</span>}
      </div>
    </Modal>
  );
};

// ----- HoursRequestModal -----
export const HoursRequestModal = ({ db, ur, kind, targetId, onClose, onSubmit }) => {
  const target = kind === "task" ? db.tasks.find((t) => t.id === targetId) : db.projects.find((p) => p.id === targetId);
  const cur = kind === "task" ? target?.plannedHours : target?.budget;
  const [newH, setNewH] = useState(cur);
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Запрос изменения часов — ${kind === "task" ? "задача" : "бюджет проекта"}`} onClose={onClose} width={480}>
      <p className="mut sm">{kind === "task" ? target?.title : target?.name}. Запрос будет направлен генеральному директору.</p>
      <div className="form-grid">
        <label className="lbl">Текущее значение</label><input className="inp" disabled value={(cur ?? "—") + " ч"} />
        <label className="lbl">Новое значение *</label><input className="inp" type="number" min="1" step="0.5" value={newH} onChange={(e) => setNewH(e.target.value)} />
        <label className="lbl">Обоснование *</label><textarea className="inp" rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Почему требуется изменение…" />
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" disabled={!reason.trim() || !newH} onClick={() => onSubmit({ id: uid(), kind, targetId, oldH: cur, newH: +newH, reason: reason.trim(), reqId: ur.id, status: "pending", ts: Date.now() })}>Отправить запрос</button>
      </div>
    </Modal>
  );
};

// ----- RolesModal -----
export const RolesModal = ({ db, setDb, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  const [roles, setRoles] = useState(emp.roles);
  const [kbIds, setKbIds] = useState(emp.kbIds || []);
  const [headDeptIds, setHeadDeptIds] = useState(emp.headDeptIds || []);
  const toggle = (r) => setRoles((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const save = () => {
    setDb((s) => ({ ...s, employees: s.employees.map((e) => (e.id === empId ? { ...e, roles, kbIds: roles.includes("kb_chief") ? kbIds : [], headDeptIds: roles.includes("head") ? headDeptIds : [] } : e)) }));
    audit("Назначение ролей", `${emp.last} ${emp.first}: ${roles.map((r) => ROLES[r].short).join(", ")}`);
    toast("Роли сохранены");
    onClose();
  };
  return (
    <Modal title={`Роли — ${emp.last} ${emp.first}`} onClose={onClose} width={520}>
      <p className="mut sm">Сотрудник может иметь несколько ролей. Для «Главного конструктора» укажите КБ, для «Руководителя отдела» — перечень отделов.</p>
      <div className="roles-list">
        {Object.entries(ROLES).map(([k, v]) => (
          <div key={k}>
            <label className="roles-item">
              <input type="checkbox" checked={roles.includes(k)} onChange={() => toggle(k)} />
              <span className="role-chip" style={{ background: v.color + "1e", color: v.color }}>{v.short}</span>{v.label}
            </label>
            {k === "kb_chief" && roles.includes("kb_chief") && (
              <div className="sub-picks">{db.kbs.map((kb) => <label key={kb.id} className="dept-pick"><input type="checkbox" checked={kbIds.includes(kb.id)} onChange={() => setKbIds((s) => s.includes(kb.id) ? s.filter((x) => x !== kb.id) : [...s, kb.id])} />{kb.name}</label>)}</div>
            )}
            {k === "head" && roles.includes("head") && (
              <div className="sub-picks">{db.departments.map((d) => <label key={d.id} className="dept-pick"><input type="checkbox" checked={headDeptIds.includes(d.id)} onChange={() => setHeadDeptIds((s) => s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id])} />{d.name}{d.kbId ? ` (${db.kbs.find((x) => x.id === d.kbId)?.name})` : ""}</label>)}</div>
            )}
          </div>
        ))}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить роли</button>
      </div>
    </Modal>
  );
};

// ----- DeptsModal -----
export const DeptsModal = ({ db, setDb, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  const [sel, setSel] = useState(emp.departments);
  const toggle = (deptId) => {
    setSel((s) => {
      if (s.some((x) => x.deptId === deptId)) {
        const next = s.filter((x) => x.deptId !== deptId);
        return next.length && !next.some((x) => x.primary) ? next.map((x, i) => ({ ...x, primary: i === 0 })) : next;
      }
      return [...s, { deptId, primary: s.length === 0 }];
    });
  };
  const setPrimary = (deptId) => setSel((s) => s.map((x) => ({ ...x, primary: x.deptId === deptId })));
  const save = () => {
    if (!sel.length) return toast("Выберите хотя бы одно подразделение", "err");
    if (!sel.some((x) => x.primary)) return toast("Укажите основное подразделение", "err");
    const before = emp.departments.map((x) => x.deptId).join(",");
    setDb((s) => ({ ...s, employees: s.employees.map((e) => (e.id === empId ? { ...e, departments: sel } : e)) }));
    audit("Изменение подразделений сотрудника", `${emp.last} ${emp.first}: [${before}] → [${sel.map((x) => x.deptId).join(",")}]`);
    toast("Подразделения обновлены");
    onClose();
  };
  return (
    <Modal title={`Подразделения — ${emp.last} ${emp.first}`} onClose={onClose} width={520}>
      <p className="mut sm">Сотрудник может числиться в нескольких отделах (в том числе разных КБ). Отметьте основное подразделение.</p>
      <div className="roles-list">
        {db.departments.map((d) => {
          const cur = sel.find((x) => x.deptId === d.id);
          const kb = db.kbs.find((k) => k.id === d.kbId);
          return (
            <label key={d.id} className="roles-item">
              <input type="checkbox" checked={!!cur} onChange={() => toggle(d.id)} />
              <span style={{ flex: 1 }}>{d.name} <span className="mut sm">{kb ? `· ${kb.name}` : "· вне КБ"}</span></span>
              {cur && <button className={"btn ghost sm" + (cur.primary ? " prim-btn" : "")} onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}>{cur.primary ? "основное ✓" : "сделать основным"}</button>}
            </label>
          );
        })}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить</button>
      </div>
    </Modal>
  );
};

// ----- VacationModal -----
export const VacationModal = ({ db, ur, vacationId, forEmpId, onClose, onSave }) => {
  const existing = vacationId ? db.vacations.find((v) => v.id === vacationId) : null;
  const canPick = canManageAllVacations(ur);
  const { empName, primaryDept } = useDataHelpers(db);
  const [f, setF] = useState(existing ? { ...existing, delegation: { ...existing.delegation } } : {
    id: "v_" + uid(), empId: forEmpId || ur.id, start: TODAY, end: iso(addDays(new Date(), 7)), type: "annual", comment: "",
    status: canManageAllVacations(ur) && forEmpId ? "approved" : "pending",
    delegation: { enabled: false, subId: "", statuses: [], state: null },
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = () => {
    if (!f.start || !f.end || f.end < f.start) return;
    if (f.delegation.enabled && !f.delegation.subId) return;
    onSave({ ...f }, !existing);
  };
  return (
    <Modal title={existing ? "Отпуск" : "Новый отпуск"} onClose={onClose} width={560}>
      <div className="form-grid">
        {canPick && (<>
          <label className="lbl">Сотрудник *</label>
          <select className="inp sel" value={f.empId} onChange={(e) => set("empId", e.target.value)}>
            {db.employees.map((e) => <option key={e.id} value={e.id}>{empName(e.id)} — {primaryDept(e)?.name || ""}</option>)}
          </select>
        </>)}
        <label className="lbl">Дата начала *</label><input className="inp" type="date" value={f.start} onChange={(e) => set("start", e.target.value)} />
        <label className="lbl">Дата окончания *</label><input className="inp" type="date" value={f.end} onChange={(e) => set("end", e.target.value)} />
        <label className="lbl">Тип отпуска *</label>
        <select className="inp sel" value={f.type} onChange={(e) => set("type", e.target.value)}>
          {Object.entries(VACATION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="lbl">Комментарий</label><input className="inp" value={f.comment} onChange={(e) => set("comment", e.target.value)} />
        {canManageAllVacations(ur) && (<>
          <label className="lbl">Статус</label>
          <select className="inp sel" value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="pending">На утверждении</option>
            <option value="approved">Утверждён</option>
            <option value="rejected">Отклонён</option>
          </select>
        </>)}
      </div>
      <div className="tm-block">
        <label className="roles-item" style={{ border: "none", padding: 0 }}>
          <input type="checkbox" checked={f.delegation.enabled} onChange={(e) => set("delegation", { ...f.delegation, enabled: e.target.checked })} />
          <b>Делегировать задачи на время отпуска</b>
        </label>
        {f.delegation.enabled && (<>
          <label className="lbl">Замещающий сотрудник *</label>
          <select className="inp sel" value={f.delegation.subId} onChange={(e) => set("delegation", { ...f.delegation, subId: e.target.value })}>
            <option value="">— выберите —</option>
            {db.employees.filter((e) => e.id !== f.empId).map((e) => <option key={e.id} value={e.id}>{empName(e.id)} — {primaryDept(e)?.name || ""}</option>)}
          </select>
          <label className="lbl">Какие задачи делегировать</label>
          <div className="sub-picks">
            {["new", "inwork", "review"].map((st) => (
              <label key={st} className="dept-pick">
                <input type="checkbox" checked={f.delegation.statuses.includes(st)} onChange={() => set("delegation", { ...f.delegation, statuses: f.delegation.statuses.includes(st) ? f.delegation.statuses.filter((x) => x !== st) : [...f.delegation.statuses, st] })} />
                {TASK_STATUSES[st].label}
              </label>
            ))}
            <span className="mut sm">пусто = все активные задачи</span>
          </div>
          <p className="mut sm">Делегирование утверждает руководитель до начала отпуска. Задачи вернутся автоматически после окончания отпуска. Задачи, где сотрудник — ответственный по проекту, передаются только через делегирование ролей.</p>
        </>)}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить</button>
      </div>
    </Modal>
  );
};

// ----- DelegationModal -----
export const DelegationModal = ({ db, ur, onClose, onSubmit }) => {
  const [toId, setToId] = useState("");
  const [roles, setRoles] = useState([]);
  const [start, setStart] = useState(TODAY);
  const [end, setEnd] = useState(iso(addDays(new Date(), 14)));
  const [openEnd, setOpenEnd] = useState(false);
  const [reason, setReason] = useState("");
  const allowed = ur.roles.filter((r) => !["admin", "director"].includes(r));
  return (
    <Modal title="Временная передача ролей" onClose={onClose} width={520}>
      <div className="form-grid">
        <label className="lbl">Сотрудник-получатель *</label>
        <select className="inp sel" value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">— выберите —</option>
          {db.employees.filter((e) => e.id !== ur.id).map((e) => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
        </select>
        <label className="lbl">Передаваемые роли *</label>
        <div className="sub-picks">
          {allowed.length ? allowed.map((r) => <label key={r} className="dept-pick"><input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles((s) => s.includes(r) ? s.filter((x) => x !== r) : [...s, r])} />{ROLES[r].label}</label>) : <span className="mut sm">Нет ролей, доступных для передачи</span>}
        </div>
        <label className="lbl">Дата начала *</label><input className="inp" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <label className="lbl">Дата окончания</label>
        <div className="duo"><input className="inp" type="date" disabled={openEnd} value={end} onChange={(e) => setEnd(e.target.value)} /><label className="dept-pick"><input type="checkbox" checked={openEnd} onChange={(e) => setOpenEnd(e.target.checked)} /> до отмены</label></div>
        <label className="lbl">Обоснование *</label><textarea className="inp" rows="2" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" disabled={!toId || !roles.length || !reason.trim()} onClick={() => onSubmit({ id: uid(), fromId: ur.id, toId, roles, start, end: openEnd ? null : end, reason: reason.trim(), status: "pending" })}>Отправить запрос</button>
      </div>
    </Modal>
  );
};

// ----- VacNowModal -----
export const VacNowModal = ({ db, onClose, toast }) => {
  const [fDept, setFDept] = useState("all");
  const [sort, setSort] = useState("start");
  const [, setTick] = useState(0);
  const { primaryDept } = useDataHelpers(db);
  const rows = db.vacations
    .filter((v) => v.status === "approved" && v.start <= TODAY && TODAY <= v.end)
    .map((v) => { const e = db.employees.find((x) => x.id === v.empId); return { v, e, dept: primaryDept(e) }; })
    .filter((r) => fDept === "all" || (r.dept && r.dept.id === fDept))
    .sort((a, b) => (sort === "start" ? (a.v.start < b.v.start ? -1 : 1) : (a.v.end < b.v.end ? -1 : 1)));
  return (
    <Modal title="Сотрудники в отпусках (сейчас)" onClose={onClose} width={760}>
      <div className="toolbar">
        <select className="inp sel sm" value={fDept} onChange={(e) => setFDept(e.target.value)}>
          <option value="all">Все подразделения</option>
          {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="seg sm">
          <button className={"seg-btn" + (sort === "start" ? " on" : "")} onClick={() => setSort("start")}>по началу</button>
          <button className={"seg-btn" + (sort === "end" ? " on" : "")} onClick={() => setSort("end")}>по окончанию</button>
        </div>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={() => { setTick((x) => x + 1); toast("Список обновлён"); }}>⟳ Обновить</button>
      </div>
      <table className="tbl">
        <thead><tr><th>ФИО</th><th>Подразделение (основное)</th><th>Начало</th><th>Окончание</th><th>Тип</th><th>Комментарий</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.v.id}>
              <td><b>{r.e ? `${r.e.last} ${r.e.first}` : "—"}</b></td><td>{r.dept?.name || "—"}</td>
              <td>{fmtDMY(r.v.start)}</td><td>{fmtDMY(r.v.end)}</td><td>{VACATION_TYPES[r.v.type]}</td><td className="mut">{r.v.comment || "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan="6" className="mut">Сейчас никто не находится в отпуске</td></tr>}
        </tbody>
      </table>
      <p className="mut sm">Список доступен всем сотрудникам без ограничений по ролям (п. 6.6 ТЗ).</p>
    </Modal>
  );
};