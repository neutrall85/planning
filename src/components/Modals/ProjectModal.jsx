import { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import { getTaskSpent } from '../../utils/dataHelpers';
import {
  PROJECT_TYPES, PROJECT_CATEGORIES, TASK_STATUSES,
} from '../../utils/constants';
import {
  TODAY, iso, uid, fmtDT, fmtDMY, parseISO,
} from '../../utils/date';
import {
  hasRole, computeScope, canEditProjectFields, canChangeProjectStatus, canCreateProject,
} from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import Discussion from './Discussion';

const AIRCRAFT_TYPES = [
  'Су-57', 'МиГ-35', 'Ту-160', 'Ил-76', 'Ка-52', 'Другой'
];
const PROJECT_TYPE_OPTIONS = ['Ремонт', 'Модификация'];

export const ProjectModal = ({ db, ur, projectId, onClose, onSave, onDelete, toast, openTask, store }) => {
  const existing = projectId ? db.projects.find((p) => p.id === projectId) : null;
  const scope = computeScope(ur, db);
  const isExec = !scope.all && !hasRole(ur, 'director', 'economist', 'kb_chief', 'head', 'project_lead');
  
  const [f, setF] = useState(() => {
    const randomColor = ["#0ea5e9", "#8b5cf6", "#f43f5e", "#f59e0b", "#10b981", "#ec4899"][Math.floor(Math.random() * 6)];
    const now = Date.now();
    return existing ? { 
      ...existing, 
      start: existing.start ? iso(parseISO(existing.start)) : TODAY,
      end: existing.end ? iso(parseISO(existing.end)) : "",
      aircraftType: existing.aircraftType || "",
      projectType: existing.projectType || "",
      budget: existing.budget || "",
      managerId: existing.managerId || "",
    } : {
      id: "p_" + uid(),
      code: "",
      name: "",
      desc: "",
      kbId: "",
      managerId: "",
      start: TODAY,
      end: "",
      status: "active",
      budget: "",
      color: randomColor,
      ptype: "prod",
      category: "NORM",
      longterm: false,
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: ur.id,
      customer: "",
      aircraftType: "",
      projectType: "",
      comments: [],
      history: [{ ts: now, who: ur.id, text: "Проект создан" }],
      files: [],
    };
  });
  
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isAdminType = f.ptype === "admin";

  const isNew = !existing;
  const canEditFields = isNew ? canCreateProject(ur) : canEditProjectFields(ur, f);
  const canChangeStatus = isNew ? canCreateProject(ur) : canChangeProjectStatus(ur, f, f.status);

  const [tab, setTab] = useState('info');

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
    if (!f.name.trim()) return toast("Укажите название проекта", "error");
    if (!f.code.trim()) return toast("Укажите код проекта", "error");
    if (!f.start) return toast("Укажите дату начала", "error");
    if (!f.customer?.trim()) return toast("Укажите заказчика", "error");
    
    if (!isAdminType) {
      if (!f.aircraftType) return toast("Выберите тип ВС", "error");
      if (!f.projectType) return toast("Выберите тип проекта", "error");
      if (!f.managerId) return toast("Для производственного проекта ответственный обязателен", "error");
      if (!f.end) return toast("Для производственного проекта дата окончания обязательна", "error");
      if (!f.budget || +f.budget <= 0) return toast("Для производственного проекта бюджет обязателен", "error");
    }
    onSave({ ...f, kbId: f.kbId || null, budget: isAdminType ? null : +f.budget, managerId: isAdminType ? (f.managerId || "") : f.managerId, end: isAdminType ? (f.end || null) : f.end, longterm: isAdminType ? !!f.longterm : false, files: f.files }, !existing);
  };

  const taskList = useMemo(() => {
    if (!existing) return [];
    let list = db.tasks.filter(t => t.projectId === projectId);
    if (!existing.archived) {
      list = list.filter(t => !t.archived);
    }
    if (isExec) {
      list = list.filter(t => (t.assigneeIds || []).includes(ur.id));
    }
    return list;
  }, [db, projectId, ur.id, isExec, existing]);

  const canComment = hasRole(ur, 'admin', 'director', 'kb_chief', 'project_lead', 'project_manager');
  const isProjectManager = existing && existing.managerId === ur.id;
  const canCommentFinal = canComment || isProjectManager;

  const canUploadFiles = hasRole(ur, 'admin', 'director', 'project_manager') || (existing && existing.managerId === ur.id);

  const addComment = (text, parentId, updatedComments) => {
    if (updatedComments) {
      setF(prev => ({ ...prev, comments: updatedComments }));
      if (existing && store) {
        const updatedProject = { ...f, comments: updatedComments };
        store.upsertProject(updatedProject);
      }
      return;
    }
    if (!text?.trim()) return;
    const newComment = {
      id: uid(),
      authorId: ur.id,
      ts: Date.now(),
      text: text.trim(),
      parentId: parentId || null,
    };
    const updatedCommentsList = [...(f.comments || []), newComment];
    setF(prev => ({ ...prev, comments: updatedCommentsList }));
    if (existing && store) {
      const updatedProject = { ...f, comments: updatedCommentsList };
      store.upsertProject(updatedProject);
    }
    toast("Комментарий добавлен", "success");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("Файл слишком большой (максимум 10 МБ)", "error");
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
      toast("Файл загружен", "success");
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
    toast("Файл удалён", "success");
  };

  return (
    <Modal title={existing ? (canEditFields ? "Проект (Редактирование)" : "Проект (Просмотр)") : "Новый проект"} onClose={onClose} width={900}>
      {existing && existing.archived && <div className="info-box">Этот проект находится в архиве. Редактирование недоступно.</div>}

      <div className="tabs sm">
        <button className={`tab${tab === 'info' ? ' on' : ''}`} onClick={() => setTab('info')}>Информация</button>
        <button className={`tab${tab === 'tasks' ? ' on' : ''}`} onClick={() => setTab('tasks')}>Задачи ({taskList.length})</button>
        <button className={`tab${tab === 'discussion' ? ' on' : ''}`} onClick={() => setTab('discussion')}>Обсуждение ({f.comments?.length || 0})</button>
        <button className={`tab${tab === 'files' ? ' on' : ''}`} onClick={() => setTab('files')}>Файлы ({f.files?.length || 0})</button>
      </div>

      {tab === 'info' && (
        <div className="form-grid">
          <label className="lbl">Тип проекта *</label>
          <select className="inp sel" disabled={!canEditFields} value={f.ptype} onChange={(e) => set("ptype", e.target.value)}>
            {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="lbl">Код *</label><input className="inp" disabled={!canEditFields} value={f.code} onChange={(e) => set("code", e.target.value)} />
          <label className="lbl">Название *</label><input className="inp" disabled={!canEditFields} value={f.name} onChange={(e) => set("name", e.target.value)} />
          <label className="lbl">Описание</label><textarea className="inp" rows="2" disabled={!canEditFields} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          <label className="lbl">Заказчик *</label>
          <input className="inp" disabled={!canEditFields} value={f.customer} onChange={(e) => set("customer", e.target.value)} placeholder="Наименование заказчика" />
          {!isAdminType && (<>
            <label className="lbl">Тип ВС *</label>
            <select className="inp sel" disabled={!canEditFields} value={f.aircraftType} onChange={(e) => set("aircraftType", e.target.value)}>
              <option value="">— выберите —</option>
              {AIRCRAFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="lbl">Тип проекта *</label>
            <select className="inp sel" disabled={!canEditFields} value={f.projectType} onChange={(e) => set("projectType", e.target.value)}>
              <option value="">— выберите —</option>
              {PROJECT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </>)}
          <label className="lbl">Подразделение</label>
          <select className="inp sel" disabled={!canEditFields} value={f.kbId || ""} onChange={(e) => set("kbId", e.target.value)}>
            <option value="">Общеорганизационный</option>
            {db.kbs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <label className="lbl">Ответственный {!isAdminType && "*"}</label>
          <select className="inp sel" disabled={!canEditFields} value={f.managerId || ""} onChange={(e) => set("managerId", e.target.value)}>
            <option value="">— {isAdminType ? "не требуется" : "выберите"} —</option>
            {db.employees.map((e) => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
          </select>
          <label className="lbl">Дата начала *</label><input className="inp" type="date" disabled={!canEditFields} value={f.start} onChange={(e) => set("start", e.target.value)} />
          <label className="lbl">Дата окончания {!isAdminType && "*"}</label><input className="inp" type="date" disabled={!canEditFields} value={f.end || ""} onChange={(e) => set("end", e.target.value)} />
          <label className="lbl">Бюджет, ч {!isAdminType && "*"}</label><input className="inp" type="number" min="1" disabled={!canEditFields} value={isAdminType ? "" : f.budget} placeholder={isAdminType ? "не применяется" : ""} onChange={(e) => set("budget", e.target.value)} />
          <label className="lbl">Статус</label>
          <select className="inp sel" disabled={!canChangeStatus} value={f.status || 'active'} onChange={(e) => set("status", e.target.value)}>
            {(existing ? statusOptions : creationStatusOptions).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <label className="lbl">Категория</label>
          <select className="inp sel" disabled={!canEditFields} value={f.category || 'NORM'} onChange={(e) => set("category", e.target.value)}>
            {Object.entries(PROJECT_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k} style={{ color: v.color }}>{v.label}</option>
            ))}
          </select>
          {isAdminType && (<> 
            <label className="lbl">Долгосрочный</label>
            <label className="dept-pick" style={{ gridColumn: 2 }}><input type="checkbox" disabled={!canEditFields} checked={!!f.longterm} onChange={(e) => set("longterm", e.target.checked)} /> исключить из автоматической архивации</label>
          </>)}
        </div>
      )}

      {tab === 'tasks' && existing && (
        <div className="tm-block" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="rep-panel-title">Задачи проекта ({taskList.length})</div>
            <button className="btn primary sm" onClick={() => openTask(null, 'form', projectId)} disabled={existing.archived}>
              <Ic d={ICONS.plus} size={14} /> Создать задачу
            </button>
          </div>
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
                  <th>Срок выполнения</th>
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
                {taskList.length === 0 && <tr><td colSpan="8" className="mut" style={{ textAlign: 'center' }}>Нет задач</td></tr>}
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

      {tab === 'discussion' && (
        <Discussion
          db={db}
          ur={ur}
          entity={f}
          entityType="project"
          onUpdate={(updatedProject) => {
            setF(updatedProject);
            if (store) store.upsertProject(updatedProject);
          }}
          notify={(userId, text, target) => store.addNotification(userId, text, target)}
          toast={toast}
          readOnly={existing?.archived}
          canComment={canCommentFinal}
        />
      )}

      {tab === 'files' && (
        <div className="tm-block" style={{ marginTop: 0 }}>
          <div className="rep-panel-title">Файлы проекта</div>
          {!existing?.archived && canUploadFiles && (
            <div style={{ marginBottom: '12px' }}>
              <input type="file" onChange={handleFileUpload} />
              <span className="mut sm" style={{ marginLeft: '8px' }}>(максимум 10 МБ)</span>
            </div>
          )}
          {(!f.files || f.files.length === 0) && (
            <div className="mut sm">Файлы не загружены</div>
          )}
          {f.files && f.files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {f.files.map(file => {
                const uploader = db.employees.find(e => e.id === file.uploadedBy);
                const fileSize = file.size < 1024 ? file.size + ' Б' : file.size < 1048576 ? (file.size / 1024).toFixed(1) + ' КБ' : (file.size / 1048576).toFixed(1) + ' МБ';
                return (
                  <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <Ic d={ICONS.file} size={24} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{file.name}</div>
                      <div className="mut sm">{fileSize} · загрузил {uploader ? `${uploader.last} ${uploader.first}` : '—'} {file.uploadedAt ? fmtDMY(file.uploadedAt) : ''}</div>
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