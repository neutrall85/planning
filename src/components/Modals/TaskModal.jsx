import React, { useState, useMemo } from 'react';
import { Modal } from '../Modal';
import Discussion from './Discussion';
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

// Вспомогательные функции для генерации дат повторения
function generateRepeatDates(startDate, deadline, repeatConfig, endDate, maxCount = 100) {
  const { type, interval, days, endType, endValue } = repeatConfig;
  const result = [];
  let currentStart = new Date(startDate);
  let currentDeadline = deadline ? new Date(deadline) : null;
  let count = 0;

  // Если тип 'none' – возвращаем только одну дату
  if (type === 'none') {
    return [{ start: iso(currentStart), deadline: deadline ? iso(currentDeadline) : null }];
  }

  const endDateObj = endType === 'date' ? new Date(endValue) : null;
  const maxCountLimit = endType === 'count' ? parseInt(endValue, 10) : null;

  // Сохраняем разницу между дедлайном и стартом (если дедлайн есть)
  let diffDays = 0;
  if (currentDeadline) {
    diffDays = Math.round((currentDeadline - currentStart) / (1000 * 60 * 60 * 24));
  }

  while (count < maxCount) {
    // Для первой итерации добавляем исходную дату
    result.push({
      start: iso(currentStart),
      deadline: currentDeadline ? iso(currentDeadline) : null
    });
    count++;

    // Проверяем условие завершения
    let shouldStop = false;
    if (endType === 'date' && endDateObj && currentStart >= endDateObj) {
      shouldStop = true;
    }
    if (endType === 'count' && count >= maxCountLimit) {
      shouldStop = true;
    }
    if (shouldStop) break;
    if (count >= maxCount) break;

    // Вычисляем следующую дату
    let nextStart = new Date(currentStart);
    let nextDeadline = currentDeadline ? new Date(currentDeadline) : null;

    switch (type) {
      case 'daily':
        nextStart = addDays(currentStart, interval || 1);
        if (nextDeadline) nextDeadline = addDays(currentDeadline, interval || 1);
        break;
      case 'weekly_days': {
        // Ищем следующий день недели из списка days (1-7, где 1-пн, 7-вс)
        const dayNumbers = days.map(d => parseInt(d, 10));
        const currentDay = currentStart.getDay() || 7; // 0->7
        let found = false;
        for (let i = 1; i <= 7; i++) {
          const nextDay = new Date(currentStart);
          nextDay.setDate(currentStart.getDate() + i);
          const dayOfWeek = nextDay.getDay() || 7;
          if (dayNumbers.includes(dayOfWeek)) {
            nextStart = nextDay;
            if (nextDeadline) {
              // Сдвигаем дедлайн на ту же разницу
              nextDeadline = addDays(nextDeadline, i);
            }
            found = true;
            break;
          }
        }
        if (!found) {
          // fallback
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

    // Если следующая дата <= текущей (защита от бесконечного цикла), прерываем
    if (nextStart <= currentStart) break;

    currentStart = nextStart;
    currentDeadline = nextDeadline;
  }

  return result;
}

export const TaskModal = ({ db, ur, taskId, initialTab = 'form', spent, planSum, onClose, onSave, onDelete, onHoursReq, toast, patchTask, notify, store, initialProjectId, vacationData }) => {
  const { empName, getTaskSpent, vacOverlap, primaryDept } = useDataHelpers(db);
  const existing = taskId ? db.tasks.find((t) => t.id === taskId) : null;
  const readOnly = !!(existing && existing.archived);
  
  // Проверяем, есть ли данные об отпуске, переданные из Gantt
  const hasVacationWarning = vacationData && vacationData.vacation && vacationData.employee && !vacationData.hasDelegate;
  const vacationInfo = hasVacationWarning ? vacationData.vacation : null;
  const employeeInfo = hasVacationWarning ? vacationData.employee : null;
  
  const currentProjectId = initialProjectId || (existing ? existing.projectId : '');
  const isProjectFromInitial = !!initialProjectId && !existing;
  
  const canEditFields = !readOnly && (existing ? canEditTaskFields(ur, existing, db) : canCreateTask(ur));
  const canChangeStatus = !readOnly && existing && canChangeTaskStatus(ur, existing, null, db);
  const canEditPlannedHours = hasRole(ur, 'admin', 'director');
  const isAuthor = existing && existing.creatorId === ur.id;
  const isReview = existing && existing.status === 'review';
  
  const scope = computeScope(ur, db) || { all: false, empIds: new Set(), projIds: new Set() };
  const projs = (scope.all ? db.projects : db.projects.filter((p) => scope.projIds.has(p.id))).filter((p) => p.status === "active" && !p.archived);
  const asOpts = assigneeOptions(ur, db);
  
  const [f, setF] = useState(existing ? { ...existing, comments: existing.comments || [] } : {
    id: "t_" + uid(), title: "", desc: "", projectId: currentProjectId, assigneeIds: [], priority: "mid",
    plannedHours: 8, start: TODAY, deadline: iso(addDays(new Date(), 14)), status: "new", logs: [], comments: [], history: [], delegatedFrom: null, archived: false, archivedAt: null, closedAt: null,
    creatorId: ur.id,
    dependencyId: null, // Связанная задача (должна быть выполнена перед текущей)
    dependencyType: 'FS', // Тип зависимости: FS, SS, FF, SF
    // Поля для повторения (только для новых задач)
    repeatType: 'none',
    repeatInterval: 1,
    repeatDays: [], // массив номеров дней недели 1-7 (пн-вс)
    repeatEndType: 'date', // 'date' или 'count'
    repeatEndValue: '',
  });
  const [logH, setLogH] = useState("");
  const [logNote, setLogNote] = useState("");
  const [tab, setTab] = useState(initialTab);
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

  const ensureExecutorRole = (empId) => {
    const emp = db.employees.find(e => e.id === empId);
    if (emp && !emp.roles.includes('executor')) {
      const updated = { ...emp, roles: [...emp.roles, 'executor'] };
      store.upsertEmployee(updated);
    }
  };

  const doSave = (newStatus) => {
    const history = [...(f.history || [])];
    const statusToSave = newStatus || f.status;
    if (existing && existing.status !== statusToSave) {
      history.push({ ts: Date.now(), who: ur.id, text: `Статус: ${TASK_STATUSES[existing.status].label} → ${TASK_STATUSES[statusToSave].label}` });
    }
    
    // Обработка зависимостей и синхронизация дат
    let finalStart = f.start;
    let finalDeadline = f.deadline;
    
    if (f.dependencyId && f.dependencyType) {
      const depTask = db.tasks.find(t => t.id === f.dependencyId);
      if (depTask) {
        switch (f.dependencyType) {
          case 'SS': // Начало-Начало: синхронизируем начало с зависимой задачей
            finalStart = depTask.start;
            // Если есть дедлайн, сохраняем разницу между старым дедлайном и стартом
            if (f.deadline && depTask.start) {
              const diffDays = Math.round((new Date(f.deadline) - new Date(f.start || TODAY)) / (1000 * 60 * 60 * 24));
              finalDeadline = iso(addDays(parseISO(depTask.start), diffDays));
            }
            break;
          case 'FF': // Окончание-Окончание: синхронизируем дедлайн с зависимой задачей
            if (depTask.deadline) {
              finalDeadline = depTask.deadline;
              // Сохраняем длительность задачи
              if (f.start && f.deadline) {
                const duration = Math.round((new Date(f.deadline) - new Date(f.start)) / (1000 * 60 * 60 * 24));
                finalStart = iso(addDays(parseISO(depTask.deadline), -duration));
              }
            }
            break;
          case 'SF': // Начало-Окончание: задача завершается после начала зависимой
            if (depTask.start) {
              finalDeadline = depTask.start;
              if (f.start && f.deadline) {
                const duration = Math.round((new Date(f.deadline) - new Date(f.start)) / (1000 * 60 * 60 * 24));
                finalStart = iso(addDays(parseISO(depTask.start), -duration));
              }
            }
            break;
          case 'FS': // Окончание-Начало: задача начинается после завершения зависимой
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
      creatorId: existing ? existing.creatorId : ur.id
    };

    // Убираем поля повторения из сохраняемой задачи (чтобы не засорять)
    delete taskToSave.repeatType;
    delete taskToSave.repeatInterval;
    delete taskToSave.repeatDays;
    delete taskToSave.repeatEndType;
    delete taskToSave.repeatEndValue;

    try {
      // Если повторение задано и это создание новой задачи (не редактирование)
      if (!existing && f.repeatType !== 'none') {
        // Генерируем серию задач
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
        console.log('Generated dates:', dates); // отладка

        // Создаём каждую задачу отдельно
        dates.forEach((d, index) => {
          const taskCopy = {
            ...taskToSave,
            id: "t_" + uid(),
            start: d.start,
            deadline: d.deadline,
          };
          // Для первой задачи используем оригинальный id, чтобы не дублировать
          if (index === 0) {
            // Сохраняем первую задачу с оригинальным id
            onSave({ ...taskCopy, id: taskToSave.id }, true);
          } else {
            onSave(taskCopy, true);
          }
        });
        // Закрываем модалку после создания всех задач
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
      if (!f.deadline) return toast("Для производственного проекта дедлайн обязателен", "err");
    }

    // Проверка бюджета
    const projForBudget = db.projects.find(p => p.id === f.projectId);
    if (projForBudget && projForBudget.budget != null && !projForBudget.archived && !isAdminProj) {
      const currentPlanSum = planSum(projForBudget.id);
      const newTotal = currentPlanSum + (+f.plannedHours || 0);
      if (newTotal > projForBudget.budget) {
        toast(
          `Превышение бюджета проекта! Бюджет: ${projForBudget.budget} ч, текущая сумма задач: ${currentPlanSum} ч, запрошено: ${f.plannedHours || 0} ч. Требуется увеличение бюджета проекта.`,
          "err"
        );
        return;
      }
    }

    // Валидация повторения
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
      // Проверка, что дата окончания больше даты начала
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
      <div className="tabs sm">{[["form", "Данные"], ["time", `Учёт времени (${sp}/${f.plannedHours ?? "—"})`], ...(existing ? [["chat", `Обсуждение (${f.comments.length})`], ["hist", "История"]] : [])].map(([id, l]) => <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>)}</div>

      {tab === "form" && (<>
        {hasVacationWarning && vacationInfo && employeeInfo && (<div className="warn-box"><Ic d={ICONS.beach} size={15} />  Внимание! Исполнитель <strong>{employeeInfo.last} {employeeInfo.first}</strong> находится в отпуске с {fmtDMY(vacationInfo.start)} по {fmtDMY(vacationInfo.end)}. Даты пересекаются с периодом задачи.</div>)}
        {vacWarn && !hasVacationWarning && <div className="warn-box"><Ic d={ICONS.beach} size={15} />  Один из исполнителей находится в отпуске с {fmtDMY(vacWarn.start)} по {fmtDMY(vacWarn.end)}. Даты пересекаются с периодом задачи.</div>}
        {remainProj !== null && remainProj - (+f.plannedHours || 0) < 0 && <div className="warn-box">Внимание: задача превысит остаток бюджета проекта ({remainProj} ч). Потребуется увеличение бюджета проекта.</div>}
        {isAdminProj && !readOnly && <div className="info-box">Административный проект: дедлайн и плановые часы задачи — по желанию.</div>}
        <div className="form-grid">
          <label className="lbl">Название *</label><input className="inp" disabled={!canEditFields} value={f.title} onChange={(e) => set("title", e.target.value)} />
          <label className="lbl">Описание</label><textarea className="inp" rows="2" disabled={!canEditFields} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          <label className="lbl">Проект * <span className="mut">(активные)</span></label>
          {readOnly ? <input className="inp" disabled value={proj ? `${proj.code} — ${proj.name}` : ""} /> : (
              <select className="inp sel" disabled={!canEditFields || isProjectFromInitial} value={f.projectId} onChange={(e) => set("projectId", e.target.value)}>
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
                    <span key={id} style={{ display: 'inline-flex', alignItems: 'center', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '13px' }}>
                      {e.last} {e.first}
                      {canEditFields && <button type="button" onClick={() => removeAssignee(id)} style={{ marginLeft: '6px', border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>×</button>}
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
          <label className="lbl">Дедлайн {!isAdminProj && "*"}</label><input className="inp" type="date" disabled={!canEditFields} value={f.deadline || ""} onChange={(e) => set("deadline", e.target.value)} />
          <label className="lbl">Плановые часы {!isAdminProj && "*"}</label>
          <div className="duo">
            <input className="inp" type="number" min="0.5" step="0.5" disabled={!canEditPlannedHours} value={f.plannedHours ?? ""} onChange={(e) => set("plannedHours", e.target.value)} />
            {(!canEditFields && !readOnly) ? null : (has(ur, "project_lead", "head", "kb_chief", "director", "admin") && existing && !isAdminProj) ? <button className="btn ghost sm" type="button" onClick={() => onHoursReq("task", existing.id)}><Ic d={ICONS.clock} size={13} /> Запросить изменение часов</button> : <span className="duo-note">{isAdminProj ? "опционально" : "отдельно от дедлайна"}</span>}
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

        {/* Блок повторения (только для новых задач, не для редактирования) */}
        {!existing && !readOnly && (
          <div className="tm-block" style={{ marginTop: '12px' }}>
            <div className="rep-panel-title">Повторение {isAdminProj ? '' : '(только для административных проектов)'}</div>
            <div className="form-grid" style={{ gridTemplateColumns: '150px 1fr' }}>
              <label className="lbl">Тип повторения</label>
              <select className="inp sel" disabled={!isAdminProj} value={f.repeatType} onChange={(e) => set("repeatType", e.target.value)}>
                <option value="none">Нет</option>
                {!isAdminProj && <option value="" disabled>— недоступно —</option>}
                {isAdminProj && (
                  <>
                    <option value="daily">Ежедневно</option>
                    <option value="weekly_days">Еженедельно по дням</option>
                    <option value="workdays">Каждый рабочий день</option>
                    <option value="monthly">Ежемесячно</option>
                    <option value="yearly">Ежегодно</option>
                    <option value="custom">Произвольно (через N дней)</option>
                  </>
                )}
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
                      const dayNum = idx + 1; // 1-7
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