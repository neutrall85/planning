import React, { useState, useMemo } from 'react';
import { Modal } from '../Modal';
import Discussion, { extractMentions } from '../Discussion';
import { useDataHelpers } from '../../hooks';
import {
  TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, DEPENDENCY_TYPES,
} from '../../utils/constants';
import {
  TODAY, fmtDMY, fmtDT, iso, addDays, addMonths, addYears, uid, fmtD, parseISO,
} from '../../utils/date';
import {
  canCreateTask, canEditTaskFields, hasRole, has,
  assigneeOptions, computeScope, canChangeTaskStatus,
} from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import Avatar from '../Avatar';

// Вспомогательные функции для генерации дат повторения
function generateRepeatDates(startDate, deadline, repeatConfig, endDate, maxCount = 100) {
  const { type, interval, days, endType, endValue } = repeatConfig;
  const result = [];
  let currentStart = new Date(startDate);
  let currentDeadline = deadline ? new Date(deadline) : null;
  let count = 0;

  if (type === 'none') {
    return [{ start: iso(currentStart), deadline: deadline ? iso(currentDeadline) : null }];
  }

  const endDateObj = endType === 'date' ? new Date(endValue) : null;
  const maxCountLimit = endType === 'count' ? parseInt(endValue, 10) : null;

  let diffDays = 0;
  if (currentDeadline) {
    diffDays = Math.round((currentDeadline - currentStart) / (1000 * 60 * 60 * 24));
  }

  while (count < maxCount) {
    result.push({
      start: iso(currentStart),
      deadline: currentDeadline ? iso(currentDeadline) : null
    });
    count++;

    let shouldStop = false;
    if (endType === 'date' && endDateObj && currentStart >= endDateObj) {
      shouldStop = true;
    }
    if (endType === 'count' && count >= maxCountLimit) {
      shouldStop = true;
    }
    if (shouldStop) break;
    if (count >= maxCount) break;

    let nextStart = new Date(currentStart);
    let nextDeadline = currentDeadline ? new Date(currentDeadline) : null;

    switch (type) {
      case 'daily':
        nextStart = addDays(currentStart, interval || 1);
        if (nextDeadline) nextDeadline = addDays(currentDeadline, interval || 1);
        break;
      case 'weekly_days': {
        const dayNumbers = days.map(d => parseInt(d, 10));
        const currentDay = currentStart.getDay() || 7;
        let found = false;
        for (let i = 1; i <= 7; i++) {
          const nextDay = new Date(currentStart);
          nextDay.setDate(currentStart.getDate() + i);
          const dayOfWeek = nextDay.getDay() || 7;
          if (dayNumbers.includes(dayOfWeek)) {
            nextStart = nextDay;
            if (nextDeadline) {
              nextDeadline = addDays(nextDeadline, i);
            }
            found = true;
            break;
          }
        }
        if (!found) {
          const nextWeek = addDays(currentStart, 7);
          nextStart = nextWeek;
          if (nextDeadline) nextDeadline = addDays(currentDeadline, 7);
        }
        break;
      }
      case 'workdays': {
        let next = addDays(currentStart, 1);
        while (next.getDay() === 0 || next.getDay() === 6) {
          next = addDays(next, 1);
        }
        nextStart = next;
        if (nextDeadline) {
          let nd = addDays(currentDeadline, 1);
          while (nd.getDay() === 0 || nd.getDay() === 6) {
            nd = addDays(nd, 1);
          }
          nextDeadline = nd;
        }
        break;
      }
      case 'monthly':
        nextStart = addMonths(currentStart, interval || 1);
        if (nextDeadline) nextDeadline = addMonths(currentDeadline, interval || 1);
        break;
      case 'yearly':
        nextStart = addYears(currentStart, interval || 1);
        if (nextDeadline) nextDeadline = addYears(currentDeadline, interval || 1);
        break;
      case 'custom':
        nextStart = addDays(currentStart, interval || 1);
        if (nextDeadline) nextDeadline = addDays(currentDeadline, interval || 1);
        break;
      default:
        break;
    }

    if (nextStart <= currentStart) break;
    currentStart = nextStart;
    currentDeadline = nextDeadline;
  }

  return result;
}

export const TaskModal = ({ db, ur, taskId, initialTab = 'form', spent, planSum, onClose, onSave, onDelete, onHoursReq, toast, patchTask, notify, store }) => {
  const { empName, getTaskSpent, vacOverlap, primaryDept } = useDataHelpers(db);
  const existing = taskId ? db.tasks.find((t) => t.id === taskId) : null;
  const readOnly = !!(existing && existing.archived);
  
  const canEditFields = !readOnly && (existing ? canEditTaskFields(ur, existing, db) : canCreateTask(ur));
  const canChangeStatus = !readOnly && existing && canChangeTaskStatus(ur, existing, null, db);
  const isAssignee = existing && (existing.assigneeIds || []).includes(ur.id);
  const canEditPlannedHours = hasRole(ur, 'admin') && !isAssignee;
  const isAuthor = existing && existing.creatorId === ur.id;
  const isReview = existing && existing.status === 'review';
  
  const scope = computeScope(ur, db) || { all: false, empIds: new Set(), projIds: new Set() };
  const projs = (scope.all ? db.projects : db.projects.filter((p) => scope.projIds.has(p.id))).filter((p) => p.status === "active" && !p.archived);
  const asOpts = assigneeOptions(ur, db);
  
  const [f, setF] = useState(existing ? { 
    ...existing, 
    comments: existing.comments || [], 
    files: existing.files || [] 
  } : {
    id: "t_" + uid(), title: "", desc: "", projectId: "", assigneeIds: [], priority: "mid",
    plannedHours: 8, start: TODAY, deadline: iso(addDays(new Date(), 14)), status: "new", logs: [], comments: [], history: [], delegatedFrom: null, archived: false, archivedAt: null, closedAt: null,
    creatorId: ur.id,
    dependencyId: null,
    dependencyType: 'FS',
    repeatType: 'none',
    repeatInterval: 1,
    repeatDays: [],
    repeatEndType: 'date',
    repeatEndValue: '',
    files: [],
  });
  const [logH, setLogH] = useState("");
  const [logNote, setLogNote] = useState("");
  const [logDate, setLogDate] = useState(TODAY);
  const [tab, setTab] = useState(initialTab);
  const [confirmVac, setConfirmVac] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  
  const proj = db.projects.find((p) => p.id === f.projectId);
  const isAdminProj = proj && proj.ptype === "admin";
  const sp = f.logs.reduce((s, l) => s + l.hours, 0);
  const remainProj = proj && proj.budget != null && !proj.archived ? proj.budget - (planSum(proj.id) - (existing ? (existing.plannedHours || 0) : 0)) : null;
  const vacWarn = !readOnly && f.assigneeIds && f.assigneeIds.length > 0 && f.deadline ? f.assigneeIds.map(id => vacOverlap(id, f.start || f.deadline, f.deadline)).find(v => v !== null) : null;
  const isExec = existing && (existing.assigneeIds || []).includes(ur.id);
  
  const canLog = !readOnly && (existing ? isExec : f.assigneeIds?.includes(ur.id));

  const statusOptions = useMemo(() => {
    if (isExec && !canChangeTaskStatus(ur, f, 'closed', db) && !canChangeTaskStatus(ur, f, 'cancelled', db)) {
      return TASK_STATUS_ORDER.filter(s => ['new', 'inwork', 'review'].includes(s));
    }
    return TASK_STATUS_ORDER;
  }, [isExec, f, ur, db]);

  const localPatchTask = (updatedTask) => {
    setF(prev => ({ ...prev, ...updatedTask }));
  };

  const ensureExecutorRole = (empId) => {
    const emp = db.employees.find(e => e.id === empId);
    if (emp && !emp.roles.includes('executor')) {
      const updated = { ...emp, roles: [...emp.roles, 'executor'] };
      store.upsertEmployee(updated);
    }
  };

  // --- Интеграция Discussion ---
  const candidates = useMemo(() => {
    const ids = new Set(
      db.tasks
        .filter((t) => t.projectId === f.projectId)
        .map((t) => t.assigneeIds || [])
        .flat()
    );
    const pj = db.projects.find((p) => p.id === f.projectId);
    if (pj && pj.managerId) ids.add(pj.managerId);
    return [...ids]
      .map((id) => db.employees.find((e) => e.id === id))
      .filter(Boolean);
  }, [db, f.projectId]);

  const handleUpdateComments = (newComments) => {
    const updatedTask = { ...f, comments: newComments };
    localPatchTask(updatedTask);
    if (existing) {
      patchTask(updatedTask);
    }
  };

  const handleCommentAdded = (comment) => {
    const mentioned = extractMentions(comment.text, db.employees);
    const pj = db.projects.find((p) => p.id === f.projectId);
    const subs = new Set(mentioned);
    (f.assigneeIds || []).forEach(id => subs.add(id));
    if (pj && pj.managerId) subs.add(pj.managerId);
    if (comment.parentId) {
      const parent = f.comments.find((x) => x.id === comment.parentId);
      if (parent) subs.add(parent.authorId);
    }
    subs.delete(ur.id);
    subs.forEach((uidX) =>
      notify(
        uidX,
        `${ur.last} ${ur.first}: новый комментарий к задаче «${f.title}»${
          mentioned.includes(uidX) ? " (вас упомянули)" : ""
        }.`
      )
    );
  };
  // --- Конец Discussion ---

  // --- Файлы ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("Файл слишком большой (максимум 10 МБ)", "err");
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileData = ev.target.result;
      const newFile = {
        id: uid(),
        name: file.name,
        size: file.size,
        url: fileData,
        uploadedBy: ur.id,
        uploadedAt: new Date().toISOString(),
      };
      const updatedFiles = [...(f.files || []), newFile];
      setF(prev => ({ ...prev, files: updatedFiles }));
      if (existing && patchTask) {
        const updatedTask = { ...f, files: updatedFiles };
        patchTask(updatedTask);
      }
      toast("Файл загружен");
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleFileDelete = (fileId) => {
    if (!window.confirm("Удалить файл?")) return;
    const updatedFiles = (f.files || []).filter(file => file.id !== fileId);
    setF(prev => ({ ...prev, files: updatedFiles }));
    if (existing && patchTask) {
      const updatedTask = { ...f, files: updatedFiles };
      patchTask(updatedTask);
    }
    toast("Файл удалён");
  };
  // --- Конец файлов ---

  const doSave = (newStatus) => {
    const history = [...(f.history || [])];
    const statusToSave = newStatus || f.status;
    if (existing && existing.status !== statusToSave) {
      history.push({ ts: Date.now(), who: ur.id, text: `Статус: ${TASK_STATUSES[existing.status].label} → ${TASK_STATUSES[statusToSave].label}` });
    }
    
    let finalStart = f.start;
    let finalDeadline = f.deadline;
    
    if (f.dependencyId && f.dependencyType) {
      const depTask = db.tasks.find(t => t.id === f.dependencyId);
      if (depTask) {
        switch (f.dependencyType) {
          case 'SS':
            finalStart = depTask.start;
            if (f.deadline && depTask.start) {
              const diffDays = Math.round((new Date(f.deadline) - new Date(f.start || TODAY)) / (1000 * 60 * 60 * 24));
              finalDeadline = iso(addDays(parseISO(depTask.start), diffDays));
            }
            break;
          case 'FF':
            if (depTask.deadline) {
              finalDeadline = depTask.deadline;
              if (f.start && f.deadline) {
                const duration = Math.round((new Date(f.deadline) - new Date(f.start)) / (1000 * 60 * 60 * 24));
                finalStart = iso(addDays(parseISO(depTask.deadline), -duration));
              }
            }
            break;
          case 'SF':
            if (depTask.start) {
              finalDeadline = depTask.start;
              if (f.start && f.deadline) {
                const duration = Math.round((new Date(f.deadline) - new Date(f.start)) / (1000 * 60 * 60 * 24));
                finalStart = iso(addDays(parseISO(depTask.start), -duration));
              }
            }
            break;
          case 'FS':
          default:
            if (depTask.deadline) {
              finalStart = depTask.deadline;
              if (f.deadline) {
                const diffDays = Math.round((new Date(f.deadline) - new Date(f.start || TODAY)) / (1000 * 60 * 60 * 24));
                finalDeadline = iso(addDays(parseISO(depTask.deadline), diffDays));
              }
            }
            break;
        }
      }
    }
    
    const newClosed = statusToSave === "closed" && (!existing || existing.status !== "closed");
    const taskToSave = {
      ...f,
      start: finalStart,
      deadline: finalDeadline,
      status: statusToSave,
      plannedHours: f.plannedHours === "" || f.plannedHours == null ? null : +f.plannedHours,
      closedAt: newClosed ? TODAY : (existing ? existing.closedAt : null),
      history,
      creatorId: existing ? existing.creatorId : ur.id,
      files: f.files || [],
    };

    delete taskToSave.repeatType;
    delete taskToSave.repeatInterval;
    delete taskToSave.repeatDays;
    delete taskToSave.repeatEndType;
    delete taskToSave.repeatEndValue;

    try {
      if (!existing && f.repeatType !== 'none') {
        const repeatConfig = {
          type: f.repeatType,
          interval: parseInt(f.repeatInterval, 10) || 1,
          days: f.repeatDays.map(Number),
          endType: f.repeatEndType,
          endValue: f.repeatEndValue,
        };
        const startDate = f.start;
        const deadline = f.deadline;
        const dates = generateRepeatDates(startDate, deadline, repeatConfig, f.repeatEndValue, 50);
        dates.forEach((d, index) => {
          const taskCopy = {
            ...taskToSave,
            id: "t_" + uid(),
            start: d.start,
            deadline: d.deadline,
          };
          if (index === 0) {
            onSave({ ...taskCopy, id: taskToSave.id }, true);
          } else {
            onSave(taskCopy, true);
          }
        });
        onClose();
      } else {
        onSave(taskToSave, !existing);
      }
    } catch (error) {
      toast(error.message || 'Ошибка сохранения задачи', 'err');
    }
  };

  const save = () => {
    if (!f.title.trim()) return toast("Укажите название задачи", "err");
    if (!f.projectId) return toast("Задача обязательно назначается в рамках проекта", "err");
    if (!f.assigneeIds || f.assigneeIds.length === 0) return toast("Выберите хотя бы одного исполнителя", "err");
    if (!isAdminProj) {
      if (!f.plannedHours || +f.plannedHours <= 0) return toast("Для производственного проекта плановые часы обязательны", "err");
      if (!f.deadline) return toast("Для производственного проекта срок исполнения обязателен", "err");
    }

    const projForBudget = db.projects.find(p => p.id === f.projectId);
    if (projForBudget && projForBudget.budget != null && !projForBudget.archived && !isAdminProj) {
      const currentPlanSum = planSum(projForBudget.id);
      const newTotal = currentPlanSum + (+f.plannedHours || 0);
      if (newTotal > projForBudget.budget) {
        toast(
          `Превышение бюджета проекта! Бюджет: ${projForBudget.budget} ч, текущая сумма задач: ${currentPlanSum} ч, запрошено: ${f.plannedHours || 0} ч. Уменьшите плановые часы.`,
          "err"
        );
        return;
      }
    }

    if (f.repeatType !== 'none') {
      if (f.repeatType === 'weekly_days' && (!f.repeatDays || f.repeatDays.length === 0)) {
        return toast("Выберите хотя бы один день недели", "err");
      }
      if (f.repeatEndType === 'date' && !f.repeatEndValue) {
        return toast("Укажите дату окончания повторения", "err");
      }
      if (f.repeatEndType === 'count' && (!f.repeatEndValue || parseInt(f.repeatEndValue, 10) <= 0)) {
        return toast("Укажите количество повторений", "err");
      }
      if (f.repeatEndType === 'date' && f.repeatEndValue && f.repeatEndValue <= f.start) {
        return toast("Дата окончания должна быть позже даты начала", "err");
      }
    }

    if (f.assigneeIds && f.assigneeIds.length > 0) {
      f.assigneeIds.forEach(id => ensureExecutorRole(id));
    }
    if (vacWarn) { setConfirmVac(vacWarn); return; }
    doSave(f.status);
  };

  const addLog = () => {
    const h = parseFloat(String(logH).replace(",", "."));
    if (!h || h <= 0) return toast("Введите корректное количество часов", "err");
    if (f.plannedHours && sp + h > f.plannedHours) return toast(`Нельзя внести больше плановых: доступно ещё ${Math.max(0, f.plannedHours - sp)} ч`, "err");
    const newLogs = [...f.logs, { id: uid(), userId: ur.id, date: logDate, hours: h, note: logNote.trim() }];
    setF((s) => ({ ...s, logs: newLogs }));
    setLogH("");
    setLogNote("");
    setLogDate(TODAY);
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

  const handleAccept = () => {
    if (!isAuthor || !isReview) return;
    doSave('closed');
  };
  const handleRework = () => {
    if (!isAuthor || !isReview) return;
    doSave('inwork');
  };

  return (
    <Modal title={(readOnly ? "Архивная задача — только чтение" : existing ? "Карточка задачи" : "Новая задача")} onClose={onClose} width={720}>
      {readOnly && <div className="info-box">Задача в архиве с {fmtDMY(existing.archivedAt)}. Редактирование, изменение статусов и комментирование запрещены.</div>}
      <div className="tabs sm">
        {[["form", "Данные"], ["time", `Учёт времени (${sp}/${f.plannedHours ?? "—"})`], ...(existing ? [["chat", `Обсуждение (${f.comments.length})`], ["files", `Файлы (${f.files?.length || 0})`], ["hist", "История"]] : [])].map(([id, l]) => 
          <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>
        )}
      </div>

      {tab === "form" && (<>
        {vacWarn && <div className="warn-box"><Ic d={ICONS.beach} size={15} /> Один из исполнителей находится в отпуске с {fmtDMY(vacWarn.start)} по {fmtDMY(vacWarn.end)}. Даты пересекаются с периодом задачи.</div>}
        {remainProj !== null && remainProj - (+f.plannedHours || 0) < 0 && <div className="warn-box">Внимание: задача превысит остаток бюджета проекта ({remainProj} ч). Потребуется утверждение ГД.</div>}
        {isAdminProj && !readOnly && <div className="info-box">Административный проект: срок исполнения и плановые часы задачи — по желанию.</div>}
        <div className="form-grid">
          <label className="lbl">Название *</label><input className="inp" disabled={!canEditFields} value={f.title} onChange={(e) => set("title", e.target.value)} />
          <label className="lbl">Описание</label><textarea className="inp" rows="2" disabled={!canEditFields} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          <label className="lbl">Проект * <span className="mut">(активные)</span></label>
          {readOnly ? <input className="inp" disabled value={proj ? `${proj.code} — ${proj.name}` : ""} /> : (
              <select className="inp sel" disabled={!canEditFields} value={f.projectId} onChange={(e) => set("projectId", e.target.value)}>
                <option value="">— выберите проект —</option>
                {projs.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}{p.ptype === "admin" ? " (административный)" : ""}</option>)}
              </select>
            )}
          <label className="lbl">Приоритет *</label>
          <select className="inp sel" disabled={!canEditFields} value={f.priority} onChange={(e) => set("priority", e.target.value)}>
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
                    <span key={id} className="assigned-executor">
                      <Avatar employee={e} size="xs" />
                      <span>{e.last} {e.first}</span>
                      <button type="button" onClick={() => removeAssignee(id)}>×</button>
                    </span>
                  ) : null;
                })}
                {f.assigneeIds.length === 0 && <span className="mut sm">Нет исполнителей</span>}
              </div>
              {canEditFields && (
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

          <label className="lbl">Начало работы</label><input className="inp" type="date" disabled={!canEditFields} value={f.start} onChange={(e) => set("start", e.target.value)} />
          <label className="lbl">Срок исполнения {!isAdminProj && "*"}</label><input className="inp" type="date" disabled={!canEditFields} value={f.deadline || ""} onChange={(e) => set("deadline", e.target.value)} />
          <label className="lbl">Плановые часы {!isAdminProj && "*"}</label>
          <div className="duo">
            <input 
              className="inp" 
              type="number" 
              min="0.5" 
              step="0.5" 
              disabled={!canEditPlannedHours} 
              value={f.plannedHours ?? ""} 
              onChange={(e) => set("plannedHours", e.target.value)} 
            />
            {!readOnly && existing && !canEditPlannedHours && (
              <button 
                className="btn ghost sm" 
                type="button" 
                onClick={() => onHoursReq("task", existing.id)}
              >
                <Ic d={ICONS.clock} size={13} /> Запросить изменение часов
              </button>
            )}
            {!existing && isAdminProj && (
              <span className="duo-note">опционально</span>
            )}
          </div>
          <label className="lbl">Статус *</label>
          <select className="inp sel" disabled={!canChangeStatus && !isAuthor && !isExec} value={f.status} onChange={(e) => set("status", e.target.value)}>
            {statusOptions.map((s) => <option key={s} value={s}>{TASK_STATUSES[s].label}</option>)}
          </select>
          {isExec && !canEditFields && !readOnly && <div className="mut sm" style={{ gridColumn: "1 / -1" }}>Исполнитель может переводить задачу в «В работе» и «На проверке»; закрытие и отмена — у ответственного/руководителя.</div>}
          
          <label className="lbl">Зависит от задачи</label>
          <select 
            className="inp sel" 
            disabled={!canEditFields} 
            value={f.dependencyId || ''} 
            onChange={(e) => set("dependencyId", e.target.value || null)}
          >
            <option value="">— нет зависимости —</option>
            {db.tasks
              .filter(t => t.id !== f.id && t.projectId === f.projectId && t.status !== 'closed' && t.status !== 'cancelled')
              .map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))
            }
          </select>
          
          <label className="lbl">Тип зависимости</label>
          <select 
            className="inp sel" 
            disabled={!canEditFields || !f.dependencyId} 
            value={f.dependencyType || 'FS'} 
            onChange={(e) => set("dependencyType", e.target.value)}
          >
            {Object.entries(DEPENDENCY_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.label} — {val.desc}</option>
            ))}
          </select>
        </div>

        {!existing && !readOnly && (
          <div className="tm-block" style={{ marginTop: '12px' }}>
            <div className="rep-panel-title">Повторение</div>
            <div className="form-grid" style={{ gridTemplateColumns: '150px 1fr' }}>
              <label className="lbl">Тип повторения</label>
              <select className="inp sel" value={f.repeatType} onChange={(e) => set("repeatType", e.target.value)}>
                <option value="none">Нет</option>
                <option value="daily">Ежедневно</option>
                <option value="weekly_days">Еженедельно по дням</option>
                <option value="workdays">Каждый рабочий день</option>
                <option value="monthly">Ежемесячно</option>
                <option value="yearly">Ежегодно</option>
                <option value="custom">Произвольно (через N дней)</option>
              </select>

              {f.repeatType === 'custom' && (
                <>
                  <label className="lbl">Интервал (дней)</label>
                  <input className="inp" type="number" min="1" value={f.repeatInterval} onChange={(e) => set("repeatInterval", e.target.value)} />
                </>
              )}
              {f.repeatType === 'weekly_days' && (
                <>
                  <label className="lbl">Дни недели</label>
                  <div className="duo" style={{ flexWrap: 'wrap', gap: '6px' }}>
                    {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((day, idx) => {
                      const dayNum = idx + 1;
                      const checked = f.repeatDays.includes(String(dayNum));
                      return (
                        <label key={dayNum} className="dept-pick" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const newDays = checked
                                ? f.repeatDays.filter(d => d !== String(dayNum))
                                : [...f.repeatDays, String(dayNum)];
                              set("repeatDays", newDays);
                            }}
                          />
                          {day}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
              {f.repeatType !== 'none' && (
                <>
                  <label className="lbl">Окончание</label>
                  <div className="duo" style={{ display: 'flex', gap: '8px' }}>
                    <select className="inp sel" value={f.repeatEndType} onChange={(e) => set("repeatEndType", e.target.value)} style={{ width: '120px' }}>
                      <option value="date">По дате</option>
                      <option value="count">По количеству</option>
                    </select>
                    {f.repeatEndType === 'date' ? (
                      <input className="inp" type="date" value={f.repeatEndValue} onChange={(e) => set("repeatEndValue", e.target.value)} style={{ flex: 1 }} />
                    ) : (
                      <input className="inp" type="number" min="1" value={f.repeatEndValue} onChange={(e) => set("repeatEndValue", e.target.value)} placeholder="кол-во" style={{ width: '100px' }} />
                    )}
                    <span className="mut sm" style={{ alignSelf: 'center' }}>всего {f.repeatEndType === 'count' ? 'задач' : ''}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {remainProj !== null && <div className="budget-hint">Остаток бюджета проекта «{proj.code}»: <b>{remainProj} ч</b> из {proj.budget} ч</div>}
        
        {isAuthor && isReview && !readOnly && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="btn primary" onClick={handleAccept}><Ic d={ICONS.check} size={15} /> Принять (закрыть)</button>
            <button className="btn ghost" onClick={handleRework}><Ic d={ICONS.refresh} size={15} /> Отправить на доработку</button>
          </div>
        )}
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
            <>
              <div className="tm-add">
                <input
                  className="inp"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  max={TODAY}
                  style={{ width: '150px' }}
                />
                <input
                  className="inp"
                  style={{ width: 90 }}
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="часы"
                  value={logH}
                  onChange={(e) => setLogH(e.target.value)}
                />
                <input
                  className="inp"
                  placeholder="комментарий"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                />
                <button className="btn ghost" onClick={addLog}>
                  <Ic d={ICONS.clock} size={14} /> Внести часы
                </button>
              </div>
              <div className="mut sm" style={{ marginTop: 8 }}>
                {f.plannedHours ? `Часы не могут превышать плановые: доступно ещё ${Math.max(0, f.plannedHours - sp)} ч.` : "Плановые часы не заданы — ограничение не применяется."}
                <br />
                <span style={{ fontSize: '13px', color: 'var(--mut)' }}>Выберите дату за прошлые дни или сегодня (будущие даты недоступны).</span>
              </div>
            </>
          ) : <div className="mut sm">{readOnly ? "Учёт часов для архивных задач недоступен." : "Часы вносит только исполнитель задачи."}</div>}
        </div>
      )}

      {tab === "chat" && existing && (
        <Discussion
          comments={f.comments || []}
          currentUser={ur}
          candidates={candidates}
          onUpdateComments={handleUpdateComments}
          onCommentAdded={handleCommentAdded}
          readOnly={readOnly}
          canComment={!readOnly}
          toast={toast}
          employees={db.employees}
        />
      )}

      {tab === "files" && (
        <div className="tm-block" style={{ marginTop: 0 }}>
          <div className="rep-panel-title">Файлы задачи</div>
          {!readOnly && (canEditFields || f.assigneeIds?.includes(ur.id) || f.creatorId === ur.id) && (
            <div className="toolbar">
              <input
                type="file"
                id="task-file-upload-input"
                className="file-input-hidden"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="task-file-upload-input" className="btn primary sm">
                <Ic d={ICONS.file} size={14} /> Выбрать файл
              </label>
            </div>
          )}
          {(!f.files || f.files.length === 0) && (
            <div className="mut sm">Файлы не загружены</div>
          )}
          {f.files && f.files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {f.files.map(file => {
                const uploader = db.employees.find(e => e.id === file.uploadedBy);
                const fileSize = file.size < 1024
                  ? file.size + ' Б'
                  : file.size < 1048576
                    ? (file.size / 1024).toFixed(1) + ' КБ'
                    : (file.size / 1048576).toFixed(1) + ' МБ';
                return (
                  <div
                    key={file.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)'
                    }}
                  >
                    <Ic d={ICONS.file} size={24} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{file.name}</div>
                      <div className="mut sm">
                        {fileSize} · загрузил {uploader ? `${uploader.last} ${uploader.first}` : '—'}{' '}
                        {file.uploadedAt ? fmtDMY(file.uploadedAt) : ''}
                      </div>
                    </div>
                    <a
                      href={file.url}
                      download={file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn ghost sm"
                    >
                      Скачать
                    </a>
                    {!readOnly && (canEditFields || f.assigneeIds?.includes(ur.id) || f.creatorId === ur.id) && (
                      <button
                        className="icon-btn danger"
                        onClick={() => handleFileDelete(file.id)}
                        title="Удалить файл"
                      >
                        <Ic d={ICONS.trash} size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "hist" && existing && (
        <div className="tm-logs" style={{ maxHeight: 260 }}>
          {[...f.history].reverse().map((h, i) => (
            <div key={i} className="tm-log"><span className="tm-log-name">{h.who === "system" ? "Система" : empName(h.who)}</span><span className="mut sm">{fmtDT(h.ts)}</span><span className="tm-log-note">{h.text}</span></div>
          ))}
        </div>
      )}

      <div className="modal-foot">
        <div className="spacer" />
        {!readOnly && (canEditFields || isExec) ? (
          <>
            <button className="btn ghost" onClick={onClose}>Отмена</button>
            <button className="btn primary" onClick={save}>{existing ? "Сохранить" : "Создать задачу"}</button>
          </>
        ) : (
          <button className="btn ghost" onClick={onClose}>Закрыть</button>
        )}
        {existing && canEditFields && !readOnly && (
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
            <button className="btn primary" onClick={() => { setConfirmVac(null); doSave(f.status); }}>Назначить</button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};