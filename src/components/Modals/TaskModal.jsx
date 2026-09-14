// src/components/Modals/TaskModal.jsx
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ModalShell } from '../ModalShell';
import { Tabs } from '../Tabs';
import { FileManager } from '../FileManager';
import { TaskTable } from '../TaskTable';
import { FormField } from '../FormField';
import Discussion from '../Discussion';
import { useForm } from '../../hooks/useForm';
import { useDataHelpers } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, DEPENDENCY_TYPES } from '../../utils/constants';
import { TODAY, iso, addDays, uid, fmtDMY, fmtD, fmtDT } from '../../utils/date';
import { canEditTaskFields, canChangeTaskStatus, canCreateTask, computeScope } from '../../utils/permissions';
import { validateAttachment } from '../../utils/fileValidation';
import { appendFileVersion } from '../../utils/fileVersions';
import { Ic, ICONS } from '../Icons';

export const TaskModal = ({ 
  db, ur, taskId, initialTab = 'form', parentTaskId, initialProjectId, returnToProjectId,
  returnToTaskId,
  onClose, onSave, onDelete, onHoursReq, patchTask, notify, store,
  openTask, spent, planSum,
}) => {
  const { showToast } = useToast();
  const { empName, getTaskSpent, vacOverlap } = useDataHelpers(db);
  const existing = taskId ? db.tasks.find(t => t.id === taskId) : null;
  const isNew = !existing;
  const readOnly = !!(existing && existing.archived);
  const canEditFields = !readOnly && (existing ? canEditTaskFields(ur, existing, db) : canCreateTask(ur));
  const canChangeStatus = !readOnly && existing && canChangeTaskStatus(ur, existing, null, db);
  const isAssignee = existing && existing.assigneeId === ur.id;
  const isAuthor = existing && existing.creatorId === ur.id;
  const canLog = !readOnly && (existing ? isAssignee : true) && !existing?.isSummary;

  const isProjectLocked = !!(initialProjectId || parentTaskId);

  const effectiveProjectId = useMemo(() => {
    if (initialProjectId) return initialProjectId;
    if (parentTaskId) {
      const parent = db.tasks.find(t => t.id === parentTaskId);
      if (parent) return parent.projectId;
    }
    return '';
  }, [initialProjectId, parentTaskId, db.tasks]);

  const initialValues = existing ? { ...existing } : {
    id: 't_' + uid(),
    title: '',
    desc: '',
    projectId: effectiveProjectId,
    assigneeId: null,
    priority: 'mid',
    plannedHours: 8,
    start: TODAY,
    deadline: iso(addDays(new Date(), 14)),
    status: 'new',
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
    files: [],
    isSummary: false,
    parentTaskId: parentTaskId || null,
    repeatType: 'none',
    repeatInterval: 1,
    repeatDays: [],
    repeatEndType: 'date',
    repeatEndValue: '',
  };

  const validate = useCallback((values) => {
    const errors = {};
    if (!values.title?.trim()) errors.title = 'Название обязательно';
    if (isProjectLocked) {
      if (!values.projectId) errors.projectId = 'Проект не определён';
    } else {
      if (!values.projectId || values.projectId === '') errors.projectId = 'Выберите проект';
    }
    if (!values.assigneeId || values.assigneeId === '') errors.assigneeId = 'Выберите исполнителя';
    if (!values.start) errors.start = 'Дата начала обязательна';
    const project = db.projects.find(p => p.id === values.projectId);
    const isAdminProj = project && project.ptype === 'admin';
    if (!isAdminProj) {
      const planned = parseFloat(values.plannedHours);
      if (isNaN(planned) || planned <= 0) errors.plannedHours = 'Плановые часы обязательны (число > 0)';
      if (!values.deadline) errors.deadline = 'Срок исполнения обязателен';
    }
    if (!values.priority) errors.priority = 'Приоритет обязателен';
    if (!values.status) errors.status = 'Статус обязателен';
    return errors;
  }, [db, isProjectLocked]);

  const { values, handleChange, handleSubmit, errors, touched, setFieldValue, isValid, isDirty } = useForm(initialValues, validate);

  useEffect(() => {
    if (isNew && parentTaskId && !values.projectId) {
      const parent = db.tasks.find(t => t.id === parentTaskId);
      if (parent && parent.projectId) {
        setFieldValue('projectId', parent.projectId);
      }
    }
  }, [parentTaskId, db.tasks, isNew, values.projectId, setFieldValue]);

  const project = db.projects.find(p => p.id === values.projectId);
  const isAdminProject = project && project.ptype === 'admin';
  const subtasks = useMemo(() => db.tasks.filter(t => t.parentTaskId === values.id), [db.tasks, values.id]);

  const isSummaryChecked = values.isSummary || subtasks.length > 0;
  const isSummaryDisabled = !canEditFields || (!isNew && subtasks.length > 0) || subtasks.length > 0;

  const saveHandler = useCallback((vals) => {
    const proj = db.projects.find(p => p.id === vals.projectId);
    const isAdminProj = proj && proj.ptype === 'admin';
    if (!vals.title.trim()) { showToast('Укажите название', 'error'); return; }
    if (!vals.projectId) { showToast('Выберите проект', 'error'); return; }
    if (!vals.assigneeId) { showToast('Выберите исполнителя', 'error'); return; }
    if (!vals.start) { showToast('Укажите дату начала', 'error'); return; }
    if (!vals.priority) { showToast('Выберите приоритет', 'error'); return; }
    if (!vals.status) { showToast('Выберите статус', 'error'); return; }
    if (!isAdminProj) {
      const planned = parseFloat(vals.plannedHours);
      if (isNaN(planned) || planned <= 0) { showToast('Плановые часы обязательны (число > 0)', 'error'); return; }
      if (!vals.deadline) { showToast('Срок исполнения обязателен', 'error'); return; }
    }
    if (proj && proj.budget != null && !proj.archived && !isAdminProj) {
      const currentPlanSum = db.tasks.filter(t => t.projectId === proj.id && t.id !== vals.id).reduce((s, t) => s + (t.plannedHours || 0), 0);
      if (currentPlanSum + (parseFloat(vals.plannedHours) || 0) > proj.budget) {
        showToast(`Превышение бюджета проекта! Бюджет: ${proj.budget} ч, текущая сумма: ${currentPlanSum} ч`, 'error');
        return;
      }
    }
    const vacWarn = vals.assigneeId && vals.deadline ? vacOverlap(vals.assigneeId, vals.start || vals.deadline, vals.deadline) : null;
    if (vacWarn && !window.confirm(`Исполнитель в отпуске ${fmtDMY(vacWarn.start)}–${fmtDMY(vacWarn.end)}. Продолжить?`)) return;

    if (subtasks.length > 0) {
      vals.isSummary = true;
    }

    const taskToSave = {
      ...vals,
      plannedHours: vals.plannedHours === '' ? null : parseFloat(vals.plannedHours),
      closedAt: vals.status === 'closed' && (!existing || existing.status !== 'closed') ? TODAY : existing?.closedAt || null,
      history: [
        ...(existing?.history || []),
        ...(existing && existing.status !== vals.status ? [{ ts: Date.now(), who: ur.id, text: `Статус: ${TASK_STATUSES[existing.status].label} → ${TASK_STATUSES[vals.status].label}` }] : [])
      ],
      creatorId: existing?.creatorId || ur.id,
    };
    onSave(taskToSave, isNew);
  }, [existing, isNew, db, vacOverlap, showToast, onSave, ur, subtasks]);

  const deleteHandler = useCallback(() => {
    if (window.confirm('Удалить задачу?')) {
      onDelete(existing.id);
    }
  }, [existing, onDelete]);

  const hasSubtasks = subtasks.length > 0 || values.isSummary;

  const tabs = [
    { id: 'form', label: 'Данные' },
    { id: 'time', label: `Учёт времени (${getTaskSpent(values)}/${values.plannedHours ?? '—'})` },
    ...(hasSubtasks ? [{ id: 'subtasks', label: `Подзадачи (${subtasks.length})` }] : []),
    ...(existing ? [
      { id: 'chat', label: `Обсуждение (${store.getComments({ taskId: values.id }).length})` },
      { id: 'files', label: `Файлы (${values.files?.length || 0})` },
      { id: 'hist', label: 'История' }
    ] : []),
  ];
  const [activeTab, setActiveTab] = useState(initialTab);

  const projectOptions = useMemo(() => {
    const scope = computeScope(ur, db);
    let list = scope.all ? db.projects : db.projects.filter(p => scope.projIds.has(p.id));
    const filtered = list.filter(p => p.status === 'active' && !p.archived);
    const options = [
      { value: '', label: '— Выберите проект —' },
      ...filtered.map(p => ({ value: p.id, label: `${p.code} — ${p.name}${p.ptype === 'admin' ? ' (административный)' : ''}` }))
    ];
    if (isProjectLocked && effectiveProjectId) {
      const exists = options.some(opt => opt.value === effectiveProjectId);
      if (!exists) {
        const proj = db.projects.find(p => p.id === effectiveProjectId);
        if (proj) {
          options.push({ value: proj.id, label: `${proj.code} — ${proj.name}${proj.ptype === 'admin' ? ' (административный)' : ''}` });
        }
      }
    }
    return options;
  }, [db, ur, isProjectLocked, effectiveProjectId]);

  const assigneeOptionsList = useMemo(() => {
    const scope = computeScope(ur, db);
    let list = scope.all ? db.employees : db.employees.filter(e => scope.empIds.has(e.id) || e.id === ur.id);
    const filtered = list.filter(e => !e.fired);
    return [
      { value: '', label: '— Выберите исполнителя —' },
      ...filtered.map(e => ({ value: e.id, label: `${e.last} ${e.first}` }))
    ];
  }, [db, ur]);

  const priorityOptions = Object.entries(PRIORITIES).map(([k, v]) => ({ value: k, label: v.label }));
  const statusOptions = TASK_STATUS_ORDER.filter(s => {
    if (isAssignee && !canChangeStatus) return ['new', 'inwork', 'review'].includes(s);
    return true;
  }).map(s => ({ value: s, label: TASK_STATUSES[s].label }));

  const dependencyOptions = useMemo(() => {
    const tasks = db.tasks
      .filter(t => t.id !== values.id && t.projectId === values.projectId && t.status !== 'closed' && t.status !== 'cancelled')
      .map(t => ({ value: t.id, label: t.title }));
    return [{ value: '', label: '—' }, ...tasks];
  }, [db.tasks, values.id, values.projectId]);

  const dependencyTypeOptions = Object.entries(DEPENDENCY_TYPES).map(([k, v]) => ({ value: k, label: `${v.label} — ${v.desc}` }));

  const candidates = useMemo(() => {
    const ids = new Set(
      db.tasks
        .filter(t => t.projectId === values.projectId)
        .map(t => t.assigneeId)
        .filter(Boolean)
    );
    const pj = db.projects.find(p => p.id === values.projectId);
    if (pj && pj.managerId) ids.add(pj.managerId);
    return [...ids].map(id => db.employees.find(e => e.id === id)).filter(Boolean);
  }, [db, values.projectId]);

  const handleFileUpload = useCallback((file) => {
    const check = validateAttachment(file);
    if (!check.ok) {
      showToast(check.reason, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newFile = {
        id: uid(),
        name: file.name,
        size: file.size,
        url: ev.target.result,
        uploadedBy: ur.id,
        uploadedAt: new Date().toISOString(),
      };
      const updatedFiles = appendFileVersion(values.files || [], newFile);
      setFieldValue('files', updatedFiles);
      if (existing) patchTask({ ...values, files: updatedFiles });
      showToast('Файл загружен', 'success');
    };
    reader.readAsDataURL(file);
  }, [values, existing, patchTask, setFieldValue, showToast, ur.id]);

  const handleFileDelete = useCallback((fileId) => {
    if (!window.confirm('Удалить файл?')) return;
    const updatedFiles = (values.files || []).filter(f => f.id !== fileId);
    setFieldValue('files', updatedFiles);
    if (existing) patchTask({ ...values, files: updatedFiles });
    showToast('Файл удалён', 'info');
  }, [values, existing, patchTask, setFieldValue, showToast]);

  const [logHours, setLogHours] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logDate, setLogDate] = useState(TODAY);

  const addLog = useCallback(() => {
    const h = parseFloat(logHours);
    if (!h || h <= 0) { showToast('Введите корректное количество часов', 'error'); return; }
    const sp = getTaskSpent(values);
    if (values.plannedHours && sp + h > values.plannedHours) {
      showToast(`Нельзя внести больше плановых: доступно ещё ${Math.max(0, values.plannedHours - sp)} ч`, 'error');
      return;
    }
    const newLog = { id: uid(), userId: ur.id, date: logDate, hours: h, note: logNote.trim() };
    const updatedTask = { ...values, logs: [...values.logs, newLog] };
    store.upsertTask(updatedTask);
    setFieldValue('logs', [...values.logs, newLog]);
    setLogHours('');
    setLogNote('');
    showToast('Часы учтены', 'success');
  }, [logHours, logNote, logDate, values, store, ur, showToast, setFieldValue, getTaskSpent]);

  const showBackButton = returnToProjectId || returnToTaskId;

  const saveDisabled = !(canEditFields || (existing && canChangeStatus)) || (isNew ? !isValid : !isValid || !isDirty);

  const footer = (
    <div className="modal-foot">
      {!readOnly && existing && (canEditFields || isAuthor) && (
        <button className="btn danger" onClick={deleteHandler}>
          <Ic d={ICONS.trash} size={14} /> Удалить
        </button>
      )}
      <div className="spacer" />
      <button className="btn ghost" onClick={onClose}>Отмена</button>
      <button className="btn primary" onClick={handleSubmit(saveHandler)} disabled={saveDisabled}>
        {existing ? 'Сохранить' : 'Создать задачу'}
      </button>
    </div>
  );

  return (
    <ModalShell
      title={readOnly ? 'Архивная задача — только чтение' : existing ? 'Карточка задачи' : 'Новая задача'}
      onClose={onClose}
      width={770}
      className="modal-task"
      showSave={false}
      footer={footer}
      headerBefore={showBackButton ? (
        <button className="btn ghost sm" onClick={onClose}>
          <Ic d={ICONS.left} size={14} /> Назад
        </button>
      ) : undefined}
    >
      {readOnly && <div className="info-box">Задача в архиве с {fmtDMY(existing.archivedAt)}. Редактирование запрещено.</div>}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} className="tabs-nowrap" />

      {activeTab === 'form' && (
        <div className="project-info-fields">
          <FormField
            label="Название"
            required
            value={values.title}
            onChange={(v) => handleChange('title', v)}
            error={touched.title && errors.title}
            disabled={!canEditFields}
            inline
          />

          <div className="field-row">
            <label className="field-label"></label>
            <div className="flex-1">
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={isSummaryChecked}
                  onChange={(e) => handleChange('isSummary', e.target.checked)}
                  disabled={isSummaryDisabled}
                />
                Суммарная задача (плановые часы = сумма подзадач)
                {subtasks.length > 0 && <span className="mut sm ml-2">(задача имеет подзадачи, флаг зафиксирован)</span>}
              </label>
            </div>
          </div>

          <FormField
            label="Описание"
            type="textarea"
            rows={2}
            value={values.desc}
            onChange={(v) => handleChange('desc', v)}
            disabled={!canEditFields}
            inline
          />

          <FormField
            label="Проект"
            required
            type="select"
            options={projectOptions}
            value={values.projectId ?? ''}
            onChange={(v) => handleChange('projectId', v)}
            error={touched.projectId && errors.projectId}
            disabled={!canEditFields || isProjectLocked}
            inline
          />

          <div className="fields-row">
            <FormField
              label="Исполнитель"
              required
              type="select"
              options={assigneeOptionsList}
              value={values.assigneeId ?? ''}
              onChange={(v) => handleChange('assigneeId', v)}
              error={touched.assigneeId && errors.assigneeId}
              disabled={!canEditFields}
              inline
            />
            <FormField
              label="Плановые часы"
              required={!isAdminProject}
              type="number"
              min="0.5"
              step="0.5"
              value={values.plannedHours ?? ''}
              onChange={(v) => handleChange('plannedHours', v)}
              error={touched.plannedHours && errors.plannedHours}
              disabled={!canEditFields || values.isSummary}
              inline
            />
          </div>

          <div className="fields-row">
            <FormField
              label="Приоритет"
              required
              type="select"
              options={priorityOptions}
              value={values.priority ?? ''}
              onChange={(v) => handleChange('priority', v)}
              error={touched.priority && errors.priority}
              disabled={!canEditFields}
              inline
            />
            <FormField
              label="Статус"
              required
              type="select"
              options={statusOptions}
              value={values.status ?? ''}
              onChange={(v) => handleChange('status', v)}
              error={touched.status && errors.status}
              disabled={!canChangeStatus && !isAuthor && !isAssignee}
              inline
            />
          </div>

          <div className="fields-row">
            <FormField
              label="Начало"
              required
              type="date"
              value={values.start}
              onChange={(v) => handleChange('start', v)}
              error={touched.start && errors.start}
              disabled={!canEditFields}
              inline
            />
            <FormField
              label="Срок исполнения"
              required={!isAdminProject}
              type="date"
              value={values.deadline}
              onChange={(v) => handleChange('deadline', v)}
              error={touched.deadline && errors.deadline}
              disabled={!canEditFields || isAdminProject}
              inline
            />
          </div>

          {!readOnly && onHoursReq && existing && isAssignee && (
            <div className="field-row">
              <label className="field-label"></label>
              <div className="flex-1">
                <button className="btn ghost" onClick={() => onHoursReq('task', values.id)}>
                  <Ic d={ICONS.clock} size={14} /> Запросить изменение часов
                </button>
              </div>
            </div>
          )}

          <FormField
            label="Зависит от задачи"
            type="select"
            options={dependencyOptions}
            value={values.dependencyId ?? ''}
            onChange={(v) => handleChange('dependencyId', v)}
            disabled={!canEditFields}
            inline
          />
          <FormField
            label="Тип зависимости"
            type="select"
            options={dependencyTypeOptions}
            value={values.dependencyType ?? ''}
            onChange={(v) => handleChange('dependencyType', v)}
            disabled={!canEditFields || !values.dependencyId}
            inline
          />

          {values.isSummary && (
            <div className="info-box" style={{ marginLeft: '120px' }}>
              Суммарная задача – плановые часы рассчитываются как сумма подзадач.
            </div>
          )}
        </div>
      )}

      {activeTab === 'time' && (
        <div className="tm-block">
          <div className="tm-progress">
            <div className="tm-progress-fill" style={{ width: Math.min(100, (getTaskSpent(values) / Math.max(1, values.plannedHours || 0)) * 100) + '%' }} />
          </div>
          {values.logs.map(l => (
            <div key={l.id} className="tm-log">
              <span className="tm-log-name">{empName(l.userId)}</span>
              <span className="mut">{fmtD(l.date)}</span>
              <span className="tm-log-note">{l.note}</span>
              <b className="tm-log-h">{l.hours} ч</b>
            </div>
          ))}
          {canLog && (
            <div className="tm-add">
              <input className="inp tm-add-date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} max={TODAY} />
              <input className="inp tm-add-hours" type="number" min="0.5" step="0.5" placeholder="часы" value={logHours} onChange={(e) => setLogHours(e.target.value)} />
              <input className="inp tm-add-note" placeholder="комментарий" value={logNote} onChange={(e) => setLogNote(e.target.value)} />
              <button className="btn ghost" onClick={addLog}><Ic d={ICONS.clock} size={14} /> Внести часы</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'subtasks' && hasSubtasks && (
        <div className="tm-block">
          <div className="subtask-header">
            <div className="rep-panel-title">Подзадачи</div>
            <button
              className="btn primary sm"
              onClick={() => {
                onClose();
                setTimeout(() => openTask(null, 'form', values.id, null, null, null, values.id), 50);
              }}
              disabled={readOnly}
            >
              <Ic d={ICONS.plus} size={14} /> Создать подзадачу
            </button>
          </div>
          <TaskTable
            tasks={subtasks}
            onRowClick={(id) => {
              onClose();
              setTimeout(() => openTask(id, 'form', null, null, null, null, values.id), 50);
            }}
            columns={['title', 'assignee', 'status', 'planned', 'fact', 'deadline']}
            db={db}
            getTaskSpent={getTaskSpent}
            empName={empName}
          />
        </div>
      )}

      {activeTab === 'chat' && (
        <Discussion
          store={store}
          filter={{ projectId: values.projectId, taskId: values.id }}
          currentUser={ur}
          candidates={candidates}
          readOnly={readOnly}
          canComment={!readOnly && (canEditFields || isAssignee || isAuthor)}
          toast={showToast}
          employees={db.employees}
        />
      )}

      {activeTab === 'files' && existing && (
        <FileManager
          files={values.files}
          onUpload={handleFileUpload}
          onDelete={handleFileDelete}
          canUpload={!readOnly && (canEditFields || isAssignee || isAuthor)}
          canDelete={!readOnly && (canEditFields || isAssignee || isAuthor)}
          employeeName={empName}
        />
      )}

      {activeTab === 'hist' && existing && (
        <div className="tm-logs" style={{ maxHeight: 260 }}>
          {[...values.history].reverse().map((h, i) => (
            <div key={i} className="tm-log">
              <span className="tm-log-name">{h.who === 'system' ? 'Система' : empName(h.who)}</span>
              <span className="mut sm">{fmtDT(h.ts)}</span>
              <span className="tm-log-note">{h.text}</span>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
};