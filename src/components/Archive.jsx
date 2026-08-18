import React, { useState } from 'react';
import { PROJECT_TYPES, TASK_STATUSES } from '../utils/constants';
import { fmtDMY, TODAY } from '../utils/date';
import { canRestore } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import { useDataHelpers } from '../hooks';

export default function Archive({ db, ur, openTask, openProject, restoreTask, restoreProject }) {
  const { getTaskSpent, empName } = useDataHelpers(db);
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fProj, setFProj] = useState('all');
  const [fExec, setFExec] = useState('all');
  const [fDept, setFDept] = useState('all');
  
  // ОШИБКА БЫЛА ЗДЕСЬ: отсутствовало объявление openProj
  const [openProj, setOpenProj] = useState(null);

  const archProjects = db.projects.filter(p => p.archived);
  const archTasks = db.tasks.filter(t => t.archived);
  const fit = (archivedAt) => (!fFrom || archivedAt >= fFrom) && (!fTo || archivedAt <= fTo);
  const projList = archProjects.filter(p => fit(p.archivedAt || TODAY));
  const taskList = archTasks.filter(t => {
    if (!fit(t.archivedAt || TODAY)) return false;
    if (fProj !== 'all' && t.projectId !== fProj) return false;
    if (fExec !== 'all' && (t.assigneeIds || []).includes(fExec)) return false;
    if (fDept !== 'all') {
      const assignees = (t.assigneeIds || []).map(id => db.employees.find(x => x.id === id)).filter(Boolean);
      if (!assignees.some(a => a.departments.some(d => d.deptId === fDept))) return false;
    }
    return true;
  });

  const execs = [...new Set(archTasks.flatMap(t => t.assigneeIds || []))].map(id => db.employees.find(e => e.id === id)).filter(Boolean);
  const projOptions = [...new Set(archTasks.map(t => t.projectId))].map(id => db.projects.find(p => p.id === id)).filter(Boolean);

  return (
    <div>
      <div className="sec-head">
        <div className="sec-note">Архив закрытых задач и проектов. Только чтение.</div>
      </div>

      <div className="toolbar">
        <input className="inp arch-date-inp" type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} />
        <input className="inp arch-date-inp" type="date" value={fTo} onChange={e => setFTo(e.target.value)} />
        <select className="inp sel sm" value={fProj} onChange={e => setFProj(e.target.value)}>
          <option value="all">Все проекты</option>{projOptions.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>
        <select className="inp sel sm" value={fExec} onChange={e => setFExec(e.target.value)}>
          <option value="all">Все исполнители</option>{execs.map(e => <option key={e.id} value={e.id}>{e.last}</option>)}
        </select>
        <select className="inp sel sm" value={fDept} onChange={e => setFDept(e.target.value)}>
          <option value="all">Все подразделения</option>{db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="rep-panel">
        <div className="rep-panel-title">Архивные проекты ({projList.length})</div>
        <table className="tbl">
          <thead><tr><th>Код</th><th>Название</th><th>Тип</th><th>В архиве с</th><th></th></tr></thead>
          <tbody>
            {projList.map(p => (
              <tr key={p.id}>
                <td><span className="pj-code" style={{ background: p.color + '22', color: p.color }}>{p.code}</span></td>
                <td><b>{p.name}</b></td>
                <td>{PROJECT_TYPES[p.ptype || 'prod']}</td>
                <td>{fmtDMY(p.archivedAt)}</td>
                <td>
                  {/* ИЗМЕНЕНИЕ: вызываем openProject вместо локального окна */}
                  <button className="btn ghost sm" onClick={() => openProject(p.id)}>Открыть</button>
                  {canRestore(ur) && <button className="btn ghost sm" onClick={() => restoreProject(p.id)}><Ic d={ICONS.restore} size={12} /> Восстановить</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rep-panel">
        <div className="rep-panel-title">Архивные задачи ({taskList.length})</div>
        <table className="tbl">
          <thead><tr><th>Задача</th><th>Проект</th><th>Исполнители</th><th>В архиве с</th><th></th></tr></thead>
          <tbody>
            {taskList.map(t => (
              <tr key={t.id}>
                <td><b>{t.title}</b></td>
                <td>{db.projects.find(x => x.id === t.projectId)?.code}</td>
                <td>{(t.assigneeIds || []).map(id => empName(id)).join(', ')}</td>
                <td>{fmtDMY(t.archivedAt)}</td>
                <td>
                  <button className="btn ghost sm" onClick={() => openTask(t.id)}>Открыть</button>
                  {canRestore(ur) && <button className="btn ghost sm" onClick={() => restoreTask(t.id)}><Ic d={ICONS.restore} size={12} /> Восстановить</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openProj && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenProj(null); }}>
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-head"><h3>{openProj.code} — {openProj.name}</h3><button className="icon-btn" onClick={() => setOpenProj(null)}><Ic d={ICONS.x} size={16} /></button></div>
            <div className="modal-body">
              <div className="info-box">Режим «только чтение».</div>
              <table className="tbl">
                <thead><tr><th>Задача</th><th>Статус</th><th>План / факт</th></tr></thead>
                <tbody>
                  {db.tasks.filter(t => t.projectId === openProj.id).map(t => (
                    <tr key={t.id}>
                      <td><b>{t.title}</b></td>
                      <td>{TASK_STATUSES[t.status]?.label || t.status}</td>
                      <td>{t.plannedHours ?? '—'} / {getTaskSpent(t)} ч</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}