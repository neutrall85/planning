// src/components/modals/TaskModal.jsx
import React, { useState, useMemo } from 'react';
import { Modal } from '../Modal';
import Discussion, { extractMentions } from '../Discussion';
import { useDataHelpers } from '../../hooks';
import { useToast } from '../../context/ToastContext';
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

export const TaskModal = ({ 
  db, ur, taskId, initialTab = 'form', parentTaskId, initialProjectId,
  onClose, onSave, onDelete, onHoursReq, patchTask, notify, store,
  openTask,
  spent, planSum, 
}) => {
  const { showToast } = useToast();
  const { empName, getTaskSpent, vacOverlap, primaryDept } = useDataHelpers(db);
  const existing = taskId ? db.tasks.find((t) => t.id === taskId) : null;
  const isNew = !existing;
  const isSubtask = !isNew ? !!existing.parentTaskId : !!parentTaskId;
  
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
  
  const initialForm = existing ? { ...existing } : {
    id: "t_" + uid(),
    title: "",
    desc: "",
    projectId: initialProjectId || "",
    assigneeId: null,
    priority: "mid",
    plannedHours: 8,
    start: TODAY,
    deadline: iso(addDays(new Date(), 14)),
    status: "new",
    logs: [],
    comments: [],
    history: [],
    delegatedFrom: null,
    archived: false,
    archivedAt: null,
    closedAt: null,
    creatorId: ur.id,
    dependencyId: null,
    dependencyType: 'FS',
    repeatType: 'none',
    repeatInterval: 1,
    repeatDays: [],
    repeatEndType: 'date',
    repeatEndValue: '',
    files: [],
    isSummary: false,
    parentTaskId: null,
  };

  if (parentTaskId && isNew) {
    const parent = db.tasks.find(t => t.id === parentTaskId);
    if (parent) {
      initialForm.parentTaskId = parentTaskId;
      initialForm.isSummary = false;
      initialForm.projectId = parent.projectId || '';
    }
  }

  const [f, setF] = useState(initialForm);
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
  const vacWarn = !readOnly && f.assigneeId && f.deadline ? vacOverlap(f.assigneeId, f.start || f.deadline, f.deadline) : null;
  const isExec = existing && (existing.assigneeIds || []).includes(ur.id);
  
  const canLog = !readOnly && (existing ? isExec : f.assigneeId === ur.id);

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
    if (f.assigneeId) subs.add(f.assigneeId);
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Файл слишком большой (максимум 10 МБ)', 'error');
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
      showToast('Файл загружен', 'success');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleFileDelete = (fileId) => {
    if (!window.confirm('Удалить файл?')) return;
    const updatedFiles = (f.files || []).filter(file => file.id !== fileId);
    setF(prev => ({ ...prev, files: updatedFiles }));
    if (existing && patchTask) {
      const updatedTask = { ...f, files: updatedFiles };
      patchTask(updatedTask);
    }
    showToast('Файл удалён', 'info');
  };

  const hasSubtasks = useMemo(() => {
    return db.tasks.some(t => t.parentTaskId === f.id);
  }, [db.tasks, f.id]);

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
    let taskToSave = {
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

    if (hasSubtasks) {
      taskToSave.isSummary = true;
    }

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
      showToast(error.message || 'Ошибка сохранения задачи', 'error');
    }
  };

  const save = () => {
    if (!f.title.trim()) {
      showToast('Укажите название задачи', 'error');
      return;
    }
    if (!f.projectId) {
      showToast('Задача обязательно назначается в рамках проекта', 'error');
      return;
    }
    if (!f.assigneeId) {
      showToast('Выберите ответственного исполнителя', 'error');
      return;
    }
    if (!isAdminProj) {
      if (!f.plannedHours || +f.plannedHours <= 0) {
        showToast('Для производственного проекта плановые часы обязательны', 'error');
        return;
      }
      if (!f.deadline) {
        showToast('Для производственного проекта срок исполнения обязателен', 'error');
        return;
      }
    }

    if (!existing && !canCreateTask(ur)) {
      showToast('У вас нет прав на создание задач. Только ГК, ГД, Админ и Менеджер проектов.', 'error');
      return;
    }
    if (parentTaskId && !canCreateTask(ur)) {
      showToast('У вас нет прав на создание подзадач.', 'error');
      return;
    }

    const projForBudget = db.projects.find(p => p.id === f.projectId);
    if (projForBudget && projForBudget.budget != null && !projForBudget.archived && !isAdminProj) {
      const currentPlanSum = planSum(projForBudget.id);
      const newTotal = currentPlanSum + (+f.plannedHours || 0);
      if (newTotal > projForBudget.budget) {
        showToast(
          `Превышение бюджета проекта! Бюджет: ${projForBudget.budget} ч, текущая сумма задач: ${currentPlanSum} ч, запрошено: ${f.plannedHours || 0} ч. Уменьшите плановые часы.`,
          'error'
        );
        return;
      }
    }

    if (f.repeatType !== 'none') {
      if (f.repeatType === 'weekly_days' && (!f.repeatDays || f.repeatDays.length === 0)) {
        showToast('Выберите хотя бы один день недели', 'error');
        return;
      }
      if (f.repeatEndType === 'date' && !f.repeatEndValue) {
        showToast('Укажите дату окончания повторения', 'error');
        return;
      }
      if (f.repeatEndType === 'count' && (!f.repeatEndValue || parseInt(f.repeatEndValue, 10) <= 0)) {
        showToast('Укажите количество повторений', 'error');
        return;
      }
      if (f.repeatEndType === 'date' && f.repeatEndValue && f.repeatEndValue <= f.start) {
        showToast('Дата окончания должна быть позже даты начала', 'error');
        return;
      }
    }

    if (f.assigneeId) {
      ensureExecutorRole(f.assigneeId);
    }
    if (vacWarn) { setConfirmVac(vacWarn); return; }
    doSave(f.status);
  };

  const addLog = () => {
    const h = parseFloat(String(logH).replace(",", "."));
    if (!h || h <= 0) {
      showToast('Введите корректное количество часов', 'error');
      return;
    }
    if (f.plannedHours && sp + h > f.plannedHours) {
      showToast(`Нельзя внести больше плановых: доступно ещё ${Math.max(0, f.plannedHours - sp)} ч`, 'error');
      return;
    }
    const newLogs = [...f.logs, { id: uid(), userId: ur.id, date: logDate, hours: h, note: logNote.trim() }];
    setF((s) => ({ ...s, logs: newLogs }));
    setLogH("");
    setLogNote("");
    setLogDate(TODAY);
    showToast('Часы учтены', 'success');
  };

  const handleAccept = () => {
    if (!isAuthor || !isReview) return;
    doSave('closed');
  };
  const handleRework = () => {
    if (!isAuthor || !isReview) return;
    doSave('inwork');
  };

  const subtasks = useMemo(() => {
    return db.tasks.filter(t => t.parentTaskId === f.id);
  }, [db, f.id]);

  const parentTask = useMemo(() => {
    if (!f.parentTaskId) return null;
    return db.tasks.find(t => t.id === f.parentTaskId);
  }, [db, f.parentTaskId]);

  return (
    <Modal title={(readOnly ? "Архивная задача — только чтение" : existing ? "Карточка задачи" : "Новая задача")} onClose={onClose} width={760}>
      {readOnly && <div className="info-box">Задача в архиве с {fmtDMY(existing.archivedAt)}. Редактирование, изменение статусов и комментирование запрещены.</div>}
      <div className="tabs sm">
        {[
          ["form", "Данные"],
          ["time", `Учёт времени (${sp}/${f.plannedHours ?? "—"})`],
          ...((f.isSummary || hasSubtasks) ? [["subtasks", `Подзадачи (${subtasks.length})`]] : []),
          ...(existing ? [["chat", `Обсуждение (${f.comments.length})`], ["files", `Файлы (${f.files?.length || 0})`], ["hist", "История"]] : [])
        ].map(([id, l]) => 
          <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>
        )}
      </div>

      {tab === "form" && (
        <>
          {vacWarn && <div className="warn-box"><Ic d={ICONS.beach} size={15} /> Ответственный исполнитель находится в отпуске с {fmtDMY(vacWarn.start)} по {fmtDMY(vacWarn.end)}. Даты пересекаются с периодом задачи.</div>}
          {remainProj !== null && remainProj - (+f.plannedHours || 0) < 0 && <div className="warn-box">Внимание: задача превысит остаток бюджета проекта ({remainProj} ч). Потребуется утверждение ГД.</div>}
          {isAdminProj && !readOnly && <div className="info-box">Административный проект: срок исполнения и плановые часы задачи — по желанию.</div>}

          <div className="project-info-fields">
            <div className="field-row">
              <label className="field-label">Название *</label>
              <input className="inp" disabled={!canEditFields} value={f.title} onChange={(e) => set("title", e.target.value)} />
            </div>

            <div className="field-row">
              <label className="field-label">Суммарная задача</label>
              <div className="duo flex-1">
                <input
                  type="checkbox"
                  disabled={!canEditFields || hasSubtasks}
                  checked={hasSubtasks || f.isSummary}
                  onChange={(e) => set("isSummary", e.target.checked)}
                />
                <span className="mut sm">Отметьте, если эта задача содержит подзадачи</span>
              </div>
            </div>

            {parentTask && (
              <div className="field-row">
                <label className="field-label">Родительская задача</label>
                <div className="duo flex-1">
                  <input className="inp" disabled value={parentTask.title} />
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      onClose();
                      setTimeout(() => openTask(parentTask.id), 50);
                    }}
                  >
                    <Ic d={ICONS.external} size={14} /> Перейти
                  </button>
                </div>
              </div>
            )}

            <div className="field-row">
              <label className="field-label">Описание</label>
              <textarea className="inp" rows="2" disabled={!canEditFields} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
            </div>

            <div className="field-row">
              <label className="field-label">Проект * <span className="mut">(активные)</span></label>
              {readOnly ? (
                <input className="inp" disabled value={proj ? `${proj.code} — ${proj.name}` : ""} />
              ) : initialProjectId ? (
                <input className="inp" disabled value={proj ? `${proj.code} — ${proj.name}` : ""} />
              ) : (
                <select className="inp sel" disabled={!canEditFields || isSubtask} value={f.projectId} onChange={(e) => set("projectId", e.target.value)} style={{ flex: 1 }}>
                  <option value="">— выберите проект —</option>
                  {projs.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}{p.ptype === "admin" ? " (административный)" : ""}</option>)}
                </select>
              )}
            </div>

            <div className="field-row">
              <label className="field-label">Приоритет *</label>
              <select className="inp sel" disabled={!canEditFields} value={f.priority} onChange={(e) => set("priority", e.target.value)} style={{ flex: 1 }}>
                {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <div className="field-row">
              <label className="field-label">Ответственный *</label>
              {readOnly ? (
                <input className="inp" disabled value={empName(f.assigneeId)} />
              ) : (
                <select
                  className="inp sel"
                  disabled={!canEditFields}
                  value={f.assigneeId || ''}
                  onChange={(e) => set("assigneeId", e.target.value || null)}
                  style={{ flex: 1 }}
                >
                  <option value="">— выберите —</option>
                  {asOpts.map(e => (
                    <option key={e.id} value={e.id}>{e.last} {e.first}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="pj-pair-row">
              <div className="pj-pair-item">
                <label className="pj-pair-label">Начало работы</label>
                <input className="inp pj-pair-input" type="date" disabled={!canEditFields} value={f.start} onChange={(e) => set("start", e.target.value)} />
              </div>
              <div className="pj-pair-item">
                <label className="pj-pair-label">Срок исполнения {!isAdminProj && "*"}</label>
                <input className="inp pj-pair-input" type="date" disabled={!canEditFields} value={f.deadline || ""} onChange={(e) => set("deadline", e.target.value)} />
              </div>
            </div>

            <div className="pj-pair-row">
              <div className="pj-pair-item">
                <label className="pj-pair-label">Плановые часы {!isAdminProj && "*"}</label>
                <div className="flex flex-wrap items-center gap-8 flex-1">
                  {f.isSummary ? (
                    <input className="inp flex-1 min-w-80" disabled value={f.plannedHours ?? 0} />
                  ) : (
                    <input 
                      className="inp flex-1 min-w-80" 
                      type="number" 
                      min="0.5" 
                      step="0.5" 
                      disabled={!canEditPlannedHours} 
                      value={f.plannedHours ?? ""} 
                      onChange={(e) => set("plannedHours", e.target.value)} 
                    />
                  )}
                  {!readOnly && existing && !canEditPlannedHours && !f.isSummary && (
                    <button 
                      className="btn ghost sm nowrap" 
                      type="button" 
                      onClick={() => onHoursReq("task", existing.id)}
                    >
                      <Ic d={ICONS.clock} size={13} /> Запросить изменение
                    </button>
                  )}
                  {!existing && isAdminProj && (
                    <span className="duo-note">опционально</span>
                  )}
                  {f.isSummary && (
                    <span className="duo-note">(сумма подзадач)</span>
                  )}
                </div>
              </div>
              <div className="pj-pair-item">
                <label className="pj-pair-label">Статус *</label>
                <select className="inp sel pj-pair-input" disabled={!canChangeStatus && !isAuthor && !isExec} value={f.status} onChange={(e) => set("status", e.target.value)}>
                  {statusOptions.map((s) => <option key={s} value={s}>{TASK_STATUSES[s].label}</option>)}
                </select>
              </div>
            </div>

            {isExec && !canEditFields && !readOnly && (
              <div className="info-box">Исполнитель может переводить задачу в «В работе» и «На проверке»; закрытие и отмена — у ответственного/руководителя.</div>
            )}

            <div className="field-row">
              <label className="field-label">Зависит от задачи</label>
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
            </div>

            <div className="field-row">
              <label className="field-label">Тип зависимости</label>
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

            {remainProj !== null && <div className="budget-hint">Остаток бюджета проекта «{proj.code}»: <b>{remainProj} ч</b> из {proj.budget} ч</div>}
            
            {isAuthor && isReview && !readOnly && (
              <div className="mt-16 flex gap-10">
                <button className="btn primary" onClick={handleAccept}><Ic d={ICONS.check} size={15} /> Принять (закрыть)</button>
                <button className="btn ghost" onClick={handleRework}><Ic d={ICONS.refresh} size={15} /> Отправить на доработку</button>
              </div>
            )}
          </div>

          {!existing && !readOnly && (
            <div className="tm-block mt-12">
              <div className="rep-panel-title">Повторение</div>
              <div className="project-info-fields" style={{ gap: '8px' }}>
                <div className="field-row">
                  <label className="field-label">Тип повторения</label>
                  <select className="inp sel flex-1" value={f.repeatType} onChange={(e) => set("repeatType", e.target.value)}>
                    <option value="none">Нет</option>
                    <option value="daily">Ежедневно</option>
                    <option value="weekly_days">Еженедельно по дням</option>
                    <option value="workdays">Каждый рабочий день</option>
                    <option value="monthly">Ежемесячно</option>
                    <option value="yearly">Ежегодно</option>
                    <option value="custom">Произвольно (через N дней)</option>
                  </select>
                </div>

                {f.repeatType === 'custom' && (
                  <div className="field-row">
                    <label className="field-label">Интервал (дней)</label>
                    <input className="inp flex-1" type="number" min="1" value={f.repeatInterval} onChange={(e) => set("repeatInterval", e.target.value)} />
                  </div>
                )}
                {f.repeatType === 'weekly_days' && (
                  <div className="field-row">
                    <label className="field-label">Дни недели</label>
                    <div className="duo flex-1 flex-wrap gap-6">
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
                  </div>
                )}
                {f.repeatType !== 'none' && (
                  <div className="field-row">
                    <label className="field-label">Окончание</label>
                    <div className="duo flex-1 gap-8">
                      <select className="inp sel" style={{ width: '120px' }} value={f.repeatEndType} onChange={(e) => set("repeatEndType", e.target.value)}>
                        <option value="date">По дате</option>
                        <option value="count">По количеству</option>
                      </select>
                      {f.repeatEndType === 'date' ? (
                        <input className="inp flex-1" type="date" value={f.repeatEndValue} onChange={(e) => set("repeatEndValue", e.target.value)} />
                      ) : (
                        <input className="inp w-90" type="number" min="1" value={f.repeatEndValue} onChange={(e) => set("repeatEndValue", e.target.value)} placeholder="кол-во" />
                      )}
                      <span className="mut sm self-center">всего {f.repeatEndType === 'count' ? 'задач' : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "time" && (
        <div className="tm-block mt-0">
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
                  className="inp tm-add-date"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  max={TODAY}
                />
                <input
                  className="inp tm-add-hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="часы"
                  value={logH}
                  onChange={(e) => setLogH(e.target.value)}
                />
                <input
                  className="inp tm-add-note"
                  placeholder="комментарий"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                />
                <button className="btn ghost" onClick={addLog}>
                  <Ic d={ICONS.clock} size={14} /> Внести часы
                </button>
              </div>
              <div className="mut sm mt-8">
                {f.plannedHours ? `Часы не могут превышать плановые: доступно ещё ${Math.max(0, f.plannedHours - sp)} ч.` : "Плановые часы не заданы — ограничение не применяется."}
                <br />
                <span className="text-xs text-mut">Выберите дату за прошлые дни или сегодня (будущие даты недоступны).</span>
              </div>
            </>
          ) : <div className="mut sm">{readOnly ? "Учёт часов для архивных задач недоступен." : "Часы вносит только исполнитель задачи."}</div>}
        </div>
      )}

      {tab === "subtasks" && (f.isSummary || hasSubtasks) && (
        <div className="tm-block mt-0">
          <div className="subtask-header">
            <div className="rep-panel-title">Подзадачи</div>
            <button
              className="btn primary sm"
              onClick={() => {
                onClose();
                setTimeout(() => openTask(null, 'form', f.id), 50);
              }}
              disabled={f.archived}
            >
              <Ic d={ICONS.plus} size={14} /> Создать подзадачу
            </button>
          </div>
          {subtasks.length === 0 ? (
            <div className="mut sm">Нет подзадач</div>
          ) : (
            <div className="subtask-table-wrap">
              <table className="tbl subtask-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Статус</th>
                    <th>Исполнители</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {subtasks.map(sub => (
                    <tr key={sub.id}>
                      <td><b>{sub.title}</b></td>
                      <td><span className="st-chip" style={{ background: TASK_STATUSES[sub.status]?.color + '22', color: TASK_STATUSES[sub.status]?.color }}>{TASK_STATUSES[sub.status]?.label}</span></td>
                      <td>{sub.assigneeId ? empName(sub.assigneeId) : '—'}</td>
                      <td>
                        <button 
                          className="btn ghost sm" 
                          onClick={() => {
                            onClose();
                            setTimeout(() => {
                              if (typeof openTask === 'function') {
                                openTask(sub.id);
                              } else {
                                console.error('openTask не функция');
                              }
                            }, 50);
                          }}
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          toast={showToast}
          employees={db.employees}
        />
      )}

      {tab === "files" && (
        <div className="tm-block mt-0">
          <div className="rep-panel-title">Файлы задачи</div>
          {!readOnly && (canEditFields || f.assigneeId === ur.id || f.creatorId === ur.id) && (
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
            <div className="flex flex-col gap-8">
              {f.files.map(file => {
                const uploader = db.employees.find(e => e.id === file.uploadedBy);
                const fileSize = file.size < 1024
                  ? file.size + ' Б'
                  : file.size < 1048576
                    ? (file.size / 1024).toFixed(1) + ' КБ'
                    : (file.size / 1048576).toFixed(1) + ' МБ';
                return (
                  <div key={file.id} className="file-item">
                    <Ic d={ICONS.file} size={24} />
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-meta">
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
                    {!readOnly && (canEditFields || f.assigneeId === ur.id || f.creatorId === ur.id) && (
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
          <p>Ответственный исполнитель находится в отпуске с {fmtDMY(confirmVac.start)} по {fmtDMY(confirmVac.end)}. Вы уверены, что хотите назначить задачу?</p>
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