// src/components/modals/ProjectModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import Discussion from '../Discussion';
import { useDataHelpers } from '../../hooks';
import {
  PROJECT_STATUSES, PROJECT_TYPES, TASK_STATUSES, PROJECT_PRIORITIES,
  ADMIN_PROJECT_PRIORITIES,
} from '../../utils/constants';
import {
  TODAY, iso, addDays, uid, fmtDT, fmtDMY,
} from '../../utils/date';
import {
  hasRole, computeScope, canEditProjectFields, canChangeProjectStatus, canCreateProject,
} from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import { getProjectColor } from '../../utils/projectHelpers';

const AIRCRAFT_TYPES = [
  'Су-57', 'МиГ-35', 'Ту-160', 'Ил-76', 'Ка-52', 'Другой'
];
const PROJECT_TYPE_OPTIONS = ['Ремонт', 'Модификация', 'КС', 'ИКУ'];

const ADMIN_PRIORITY_MAP = {
  AOG: 'high',
  CRIT: 'mid',
  NORM: 'low',
};

export const ProjectModal = ({ db, ur, projectId, onClose, onSave, onDelete, toast, openTask, store }) => {
  const existing = projectId ? db.projects.find((p) => p.id === projectId) : null;
  const { empName, getTaskSpent } = useDataHelpers(db);
  const scope = computeScope(ur, db);
  const isExec = !scope.all && !hasRole(ur, 'director', 'economist', 'kb_chief', 'head', 'project_lead');

  const getInitialPriority = (proj) => {
    if (!proj) return 'NORM';
    if (proj.ptype === 'admin' && ADMIN_PRIORITY_MAP[proj.priority]) {
      return ADMIN_PRIORITY_MAP[proj.priority];
    }
    return proj.priority || 'NORM';
  };

  const [f, setF] = useState(existing ? { ...existing, priority: getInitialPriority(existing) } : {
    id: "p_" + uid(),
    code: "",
    name: "",
    desc: "",
    kbId: "",
    managerId: "",
    start: TODAY,
    end: iso(addDays(new Date(), 30)),
    status: "active",
    budget: 100,
    color: PROJECT_PRIORITIES['NORM'].color,
    ptype: "prod",
    longterm: false,
    archived: false,
    archivedAt: null,
    closedAt: null,
    creatorId: ur.id,
    customer: "",
    aircraftType: "",
    projectType: "",
    priority: "NORM",
    comments: existing?.comments || [],
    history: existing?.history || [{ ts: Date.now(), who: ur.id, text: "Проект создан" }],
    files: existing?.files || [],
  });

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isAdminType = f.ptype === "admin";

  useEffect(() => {
    if (isAdminType) {
      if (!ADMIN_PRIORITY_MAP[f.priority] && !Object.keys(ADMIN_PROJECT_PRIORITIES).includes(f.priority)) {
        setF(prev => ({ ...prev, priority: 'high' }));
      }
    } else {
      if (!PROJECT_PRIORITIES[f.priority]) {
        setF(prev => ({ ...prev, priority: 'NORM' }));
      }
    }
  }, [isAdminType, f.priority]);

  const isNew = !existing;
  const canEditFields = isNew ? canCreateProject(ur) : canEditProjectFields(ur, f);
  const canChangeStatus = isNew ? canCreateProject(ur) : canChangeProjectStatus(ur, f, f.status);

  const [tab, setTab] = useState('info');
  const [taskSortField, setTaskSortField] = useState('created');
  const [taskSortDir, setTaskSortDir] = useState('desc');

  const handlePriorityChange = (val) => {
    setF(prev => ({ ...prev, priority: val, color: getProjectColor({ ...prev, priority: val }) }));
  };

  const statusOptions = [
    { value: 'active', label: 'Активный' },
    { value: 'inactive', label: 'Неактивный' },
    { value: 'closed', label: 'Закрыт' },
    { value: 'cancelled', label: 'Отменён' }
  ];
  const creationStatusOptions = [
    { value: 'active', label: 'Активный' },
    { value: 'inactive', label: 'Неактивный' }
  ];

  const save = () => {
    if (!f.name.trim()) return toast("Укажите название проекта", "err");
    if (!f.code.trim()) return toast("Укажите код проекта", "err");
    if (!f.start) return toast("Укажите дату начала", "err");
    if (!f.customer?.trim()) return toast("Укажите заказчика", "err");
    if (!isAdminType) {
      if (!f.aircraftType) return toast("Выберите тип ВС", "err");
      if (!f.projectType) return toast("Выберите категорию", "err");
      if (!f.managerId) return toast("Для производственного проекта ответственный обязателен", "err");
      if (!f.end) return toast("Для производственного проекта дата окончания обязательна", "err");
      if (!f.kbId) return toast("Для производственного проекта необходимо выбрать подразделение (КБ)", "err");
    }
    const budgetValue = f.budget !== '' && f.budget != null ? +f.budget : null;
    if (!isAdminType && (!f.budget || +f.budget <= 0)) {
      return toast("Для производственного проекта бюджет обязателен и должен быть больше 0", "err");
    }
    if (!f.priority) return toast("Выберите приоритет проекта", "err");

    const finalColor = getProjectColor(f);
    onSave({ 
      ...f, 
      color: finalColor, 
      kbId: f.kbId || null, 
      budget: budgetValue,
      managerId: isAdminType ? "" : f.managerId, 
      end: isAdminType ? null : f.end, 
      longterm: false 
    }, !existing);
  };

  const taskList = useMemo(() => {
    if (!existing) return [];
    let list = db.tasks.filter(t => t.projectId === projectId);
    if (!existing.archived) {
      list = list.filter(t => !t.archived);
    }
    if (isExec) {
      list = list.filter(t => t.assigneeId === ur.id);
    }

    const sortFn = (a, b) => {
      let valA, valB;
      switch (taskSortField) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'assignees':
          const assigneeA = a.assigneeId ? db.employees.find(e => e.id === a.assigneeId) : null;
          const assigneeB = b.assigneeId ? db.employees.find(e => e.id === b.assigneeId) : null;
          valA = assigneeA ? assigneeA.last.toLowerCase() : '';
          valB = assigneeB ? assigneeB.last.toLowerCase() : '';
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'planned':
          valA = a.plannedHours ?? -1;
          valB = b.plannedHours ?? -1;
          break;
        case 'fact':
          valA = a.logs.reduce((s, l) => s + l.hours, 0);
          valB = b.logs.reduce((s, l) => s + l.hours, 0);
          break;
        case 'remaining':
          valA = (a.plannedHours || 0) - a.logs.reduce((s, l) => s + l.hours, 0);
          valB = (b.plannedHours || 0) - b.logs.reduce((s, l) => s + l.hours, 0);
          break;
        case 'creator':
          const getCreator = (task) => {
            const id = task.history?.find(h => h.who !== 'system')?.who || task.history?.[0]?.who;
            return id ? db.employees.find(e => e.id === id)?.last || '' : '';
          };
          valA = getCreator(a).toLowerCase();
          valB = getCreator(b).toLowerCase();
          break;
        case 'deadline':
          valA = a.deadline || '';
          valB = b.deadline || '';
          break;
        case 'created':
        default:
          valA = a.history?.[0]?.ts || 0;
          valB = b.history?.[0]?.ts || 0;
          break;
      }
      if (valA < valB) return taskSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return taskSortDir === 'asc' ? 1 : -1;
      return 0;
    };
    list.sort(sortFn);
    return list;
  }, [db, projectId, ur.id, isExec, existing, taskSortField, taskSortDir]);

  const handleSort = (field) => {
    if (taskSortField === field) {
      setTaskSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTaskSortField(field);
      setTaskSortDir('asc');
    }
  };

  const canComment = hasRole(ur, 'admin', 'director', 'kb_chief', 'project_lead', 'project_manager');
  const isProjectManager = existing && existing.managerId === ur.id;
  const canCommentFinal = canComment || isProjectManager;

  const canUploadFiles = hasRole(ur, 'admin', 'director', 'project_manager') || (existing && existing.managerId === ur.id);

  const candidates = useMemo(() => {
    const ids = new Set(
      db.tasks
        .filter((t) => t.projectId === f.id)
        .map((t) => t.assigneeId)
        .filter(Boolean)
    );
    if (f.managerId) ids.add(f.managerId);
    return [...ids]
      .map((id) => db.employees.find((e) => e.id === id))
      .filter(Boolean);
  }, [db, f.id, f.managerId]);

  const handleUpdateComments = (newComments) => {
    setF(prev => ({ ...prev, comments: newComments }));
    if (existing && store) {
      const updatedProject = { ...f, comments: newComments };
      store.upsertProject(updatedProject);
    }
  };

  const handleCommentAdded = () => {};

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
      if (existing && store) {
        const updatedProject = { ...f, files: updatedFiles };
        store.upsertProject(updatedProject);
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
    if (existing && store) {
      const updatedProject = { ...f, files: updatedFiles };
      store.upsertProject(updatedProject);
    }
    toast("Файл удалён");
  };

  const priorityOptions = isAdminType ? ADMIN_PROJECT_PRIORITIES : PROJECT_PRIORITIES;

  return (
    <Modal title={existing ? (canEditFields ? "Проект (Редактирование)" : "Проект (Просмотр)") : "Новый проект"} onClose={onClose} width={760}>
      {existing && existing.archived && <div className="info-box">Этот проект находится в архиве. Редактирование недоступно.</div>}

      <div className="tabs sm">
        <button className={`tab${tab === 'info' ? ' on' : ''}`} onClick={() => setTab('info')}>Информация</button>
        <button className={`tab${tab === 'tasks' ? ' on' : ''}`} onClick={() => setTab('tasks')}>Задачи ({taskList.length})</button>
        <button className={`tab${tab === 'discussion' ? ' on' : ''}`} onClick={() => setTab('discussion')}>Обсуждение ({f.comments?.length || 0})</button>
        <button className={`tab${tab === 'files' ? ' on' : ''}`} onClick={() => setTab('files')}>Файлы ({f.files?.length || 0})</button>
      </div>

      {tab === 'info' && (
        <div className="project-info-fields">
          <div className="field-row">
            <label className="field-label">Название *</label>
            <input className="inp" disabled={!canEditFields} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="field-row">
            <label className="field-label">Описание</label>
            <textarea className="inp" rows="2" disabled={!canEditFields} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          </div>

          <div className="field-row">
            <label className="field-label">Заказчик *</label>
            <input className="inp" disabled={!canEditFields} value={f.customer} onChange={(e) => set("customer", e.target.value)} placeholder="Наименование заказчика" />
          </div>

          <div className="pj-pair-row">
            <div className="pj-pair-item">
              <label className="pj-pair-label">Тип проекта *</label>
              <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.ptype} onChange={(e) => set("ptype", e.target.value)}>
                {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="pj-pair-item">
              <label className="pj-pair-label">Код *</label>
              <input className="inp pj-pair-input" disabled={!canEditFields} value={f.code} onChange={(e) => set("code", e.target.value)} />
            </div>
          </div>

          {!isAdminType && (
            <div className="pj-pair-row">
              <div className="pj-pair-item">
                <label className="pj-pair-label">Тип ВС *</label>
                <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.aircraftType} onChange={(e) => set("aircraftType", e.target.value)}>
                  <option value="">— выберите —</option>
                  {AIRCRAFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="pj-pair-item">
                <label className="pj-pair-label">Категория *</label>
                <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.projectType} onChange={(e) => set("projectType", e.target.value)}>
                  <option value="">— выберите —</option>
                  {PROJECT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="pj-pair-row">
            <div className="pj-pair-item">
              <label className="pj-pair-label">Приоритет</label>
              <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.priority} onChange={(e) => handlePriorityChange(e.target.value)}>
                {Object.entries(priorityOptions).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="pj-pair-item">
              <label className="pj-pair-label">Подразделение</label>
              <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.kbId || ""} onChange={(e) => set("kbId", e.target.value)}>
                {isAdminType && <option value="">Общеорганизационный</option>}
                {db.kbs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
          </div>

          <div className="pj-pair-row">
            <div className="pj-pair-item">
              <label className="pj-pair-label">Дата начала *</label>
              <input className="inp pj-pair-input" type="date" disabled={!canEditFields} value={f.start} onChange={(e) => set("start", e.target.value)} />
            </div>
            <div className="pj-pair-item">
              <label className="pj-pair-label">Дата окончания {!isAdminType && "*"}</label>
              <input className="inp pj-pair-input" type="date" disabled={!canEditFields || isAdminType} value={f.end || ""} onChange={(e) => set("end", e.target.value)} />
            </div>
          </div>

          <div className="pj-pair-row">
            <div className="pj-pair-item">
              <label className="pj-pair-label">Бюджет, ч {!isAdminType && "*"}</label>
              <input 
                className="inp pj-pair-input" 
                type="number" 
                min="0" 
                step="0.5"
                disabled={!canEditFields} 
                value={f.budget ?? ""} 
                placeholder={isAdminType ? "опционально" : ""}
                onChange={(e) => set("budget", e.target.value === "" ? null : +e.target.value)} 
              />
            </div>
            <div className="pj-pair-item">
              <label className="pj-pair-label">Статус</label>
              <select className="inp sel pj-pair-input" disabled={!canChangeStatus} value={f.status || 'active'} onChange={(e) => set("status", e.target.value)}>
                {(existing ? statusOptions : creationStatusOptions).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {!isAdminType && (
            <div className="field-row">
              <label className="field-label">Ответственный *</label>
              <select className="inp sel" disabled={!canEditFields} value={f.managerId || ""} onChange={(e) => set("managerId", e.target.value)}>
                <option value="">— выберите —</option>
                {db.employees.map((e) => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && existing && (
        <div className="tm-block">
          <div className="tm-block-header flex justify-between items-center">
            <div className="rep-panel-title">Задачи проекта ({taskList.length})</div>
            <button className="btn primary sm" onClick={() => openTask(null, 'form', null, existing.id)} disabled={existing.archived}>
              <Ic d={ICONS.plus} size={14} /> Создать задачу
            </button>
          </div>
          <div className="tasks-table-wrap">
            <table className="tbl tasks-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('title')}>
                    Задача {taskSortField === 'title' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('assignees')}>
                    Исполнитель {taskSortField === 'assignees' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('status')}>
                    Статус {taskSortField === 'status' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('planned')}>
                    План (ч) {taskSortField === 'planned' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('fact')}>
                    Факт (ч) {taskSortField === 'fact' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('remaining')}>
                    Остаток {taskSortField === 'remaining' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('creator')}>
                    Создал {taskSortField === 'creator' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('deadline')}>
                    Дедлайн {taskSortField === 'deadline' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {taskList.map(t => {
                  const assignee = t.assigneeId ? db.employees.find(e => e.id === t.assigneeId) : null;
                  const creatorId = t.history?.length > 0 ? t.history.find(h => h.who !== 'system')?.who || t.history[0]?.who : null;
                  const creator = creatorId ? db.employees.find(e => e.id === creatorId) : null;
                  const spent = getTaskSpent(t);
                  const remaining = (t.plannedHours || 0) - spent;
                  return (
                    <tr key={t.id} className="clickable-row" onClick={() => { onClose(); openTask(t.id); }}>
                      <td><b>{t.title}</b></td>
                      <td>{assignee ? `${assignee.last} ${assignee.first}` : '—'}</td>
                      <td><span className="st-chip" style={{ background: TASK_STATUSES[t.status].color + '22', color: TASK_STATUSES[t.status].color }}>{TASK_STATUSES[t.status].label}</span></td>
                      <td>{t.plannedHours ?? '—'}</td>
                      <td>{spent}</td>
                      <td className={remaining < 0 ? 'text-danger' : ''}>{t.plannedHours ? remaining : '—'}</td>
                      <td className="mut sm">{creator ? `${creator.last} ${creator.first}` : 'Система'}</td>
                      <td className="mut sm">{t.deadline ? fmtDMY(t.deadline) : '—'}</td>
                    </tr>
                  );
                })}
                {taskList.length === 0 && <tr><td colSpan="8" className="mut text-center">Нет задач</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="project-meta mt-8">
            Проект создан: {existing && existing.history?.length > 0 ? (() => {
              const creatorId = existing.history.find(h => h.who !== 'system')?.who || existing.history[0]?.who;
              const creator = creatorId ? db.employees.find(e => e.id === creatorId) : null;
              return `${creator ? creator.last + ' ' + creator.first : '—'}, ${fmtDT(existing.history[0].ts)}`;
            })() : '—'}
          </div>
        </div>
      )}

      {tab === 'discussion' && (
        <Discussion
          comments={f.comments || []}
          currentUser={ur}
          candidates={candidates}
          onUpdateComments={handleUpdateComments}
          onCommentAdded={handleCommentAdded}
          readOnly={existing?.archived}
          canComment={canCommentFinal}
          toast={toast}
          employees={db.employees}
        />
      )}

      {tab === 'files' && (
        <div className="tm-block">
          <div className="rep-panel-title">Файлы проекта</div>
          {!existing?.archived && canUploadFiles && (
            <div className="toolbar">
              <input type="file" id="file-upload-input" className="file-input-hidden" onChange={handleFileUpload} />
              <label htmlFor="file-upload-input" className="btn primary sm">
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
                const fileSize = file.size < 1024 ? file.size + ' Б' : file.size < 1048576 ? (file.size / 1024).toFixed(1) + ' КБ' : (file.size / 1048576).toFixed(1) + ' МБ';
                return (
                  <div key={file.id} className="file-item">
                    <Ic d={ICONS.file} size={24} />
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-meta">{fileSize} · загрузил {uploader ? `${uploader.last} ${uploader.first}` : '—'} {file.uploadedAt ? fmtDMY(file.uploadedAt) : ''}</div>
                    </div>
                    <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer" className="btn ghost sm">Скачать</a>
                    {!existing?.archived && canUploadFiles && (
                      <button className="icon-btn danger" onClick={() => handleFileDelete(file.id)} title="Удалить файл">
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

      <div className="modal-foot">
        {existing && hasRole(ur, 'admin') && !existing.archived && (
          <button className="btn danger" onClick={() => onDelete(existing)}>
            <Ic d={ICONS.trash} size={14} /> Удалить
          </button>
        )}
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Закрыть</button>
        {(isNew || canEditFields || canChangeStatus) && !existing?.archived && (
          <button className="btn primary" onClick={save}>{isNew ? "Создать проект" : "Сохранить изменения"}</button>
        )}
        {existing && !canEditFields && !canChangeStatus && <span className="mut sm">Режим только для чтения</span>}
      </div>
    </Modal>
  );
};