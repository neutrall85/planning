// src/components/Archive.jsx
import React, { useMemo } from 'react';
import { PROJECT_TYPES } from '../utils/constants';
import { fmtDMY, TODAY } from '../utils/date';
import { canRestore, canRestoreTask } from '../utils/permissions';
import { isArchived } from '../utils/entityState';
import { Ic, ICONS } from './Icons';
import { useDataHelpers, useFilters } from '../hooks';
import { Select } from './Select';
import { optionsFromList } from '../utils/selectOptions';

const INITIAL_FILTERS = Object.freeze({
  dateFrom: '',
  dateTo: '',
  projectId: 'all',
  assigneeId: 'all',
  deptId: 'all',
});

export default function Archive({ db, ur, openTask, openProject, restoreTask, restoreProject }) {
  const { getTaskSpent, empName } = useDataHelpers(db);
  const { filters, setFilter } = useFilters(INITIAL_FILTERS);
  const { dateFrom, dateTo, projectId, assigneeId, deptId } = filters;

  const archProjects = db.projects.filter(isArchived);
  const archTasks = db.tasks.filter(isArchived);

  const fit = (archivedAt) => (!dateFrom || archivedAt >= dateFrom) && (!dateTo || archivedAt <= dateTo);
  const projList = archProjects.filter(p => fit(p.archivedAt || TODAY));
  const taskList = archTasks.filter(t => {
    if (!fit(t.archivedAt || TODAY)) return false;
    if (projectId !== 'all' && t.projectId !== projectId) return false;
    if (assigneeId !== 'all' && t.assigneeId !== assigneeId) return false;
    if (deptId !== 'all') {
      const assignee = t.assigneeId ? db.employees.find(x => x.id === t.assigneeId) : null;
      if (!assignee || !assignee.departments.some(d => d.deptId === deptId)) return false;
    }
    return true;
  });

  const execs = [...new Set(archTasks.map(t => t.assigneeId).filter(Boolean))]
    .map(id => db.employees.find(e => e.id === id))
    .filter(Boolean);
  const projOptions = [...new Set(archTasks.map(t => t.projectId))]
    .map(id => db.projects.find(p => p.id === id))
    .filter(Boolean);

  const projectSelectOptions = useMemo(
    () => optionsFromList(projOptions, 'Все проекты', p => ({ value: p.id, label: p.code })),
    [projOptions],
  );
  const assigneeSelectOptions = useMemo(
    () => optionsFromList(execs, 'Все исполнители', e => ({ value: e.id, label: e.last })),
    [execs],
  );
  const deptSelectOptions = useMemo(
    () => optionsFromList(db.departments, 'Все подразделения', d => ({ value: d.id, label: d.name })),
    [db.departments],
  );

  const renderRestoreCell = (task) => {
    if (!canRestore(ur) || !isArchived(task)) return null;
    if (canRestoreTask(ur, task, db)) {
      return (
        <button className="btn ghost sm" onClick={() => restoreTask(task.id)}>
          <Ic d={ICONS.restore} size={12} /> Восстановить
        </button>
      );
    }
    return <span className="mut sm ml-2">Проект в архиве - сначала восстановите его</span>;
  };

  return (
    <div>
      <div className="sec-head">
        <div className="sec-note">Архив закрытых задач и проектов. Только чтение.</div>
      </div>

      <div className="toolbar">
        <input
          className="inp arch-date-inp"
          type="date"
          value={dateFrom}
          onChange={e => setFilter('dateFrom', e.target.value)}
        />
        <input
          className="inp arch-date-inp"
          type="date"
          value={dateTo}
          onChange={e => setFilter('dateTo', e.target.value)}
        />
        <Select
          className="sm"
          value={projectId}
          onChange={v => setFilter('projectId', v)}
          options={projectSelectOptions}
        />
        <Select
          className="sm"
          value={assigneeId}
          onChange={v => setFilter('assigneeId', v)}
          options={assigneeSelectOptions}
        />
        <Select
          className="sm"
          value={deptId}
          onChange={v => setFilter('deptId', v)}
          options={deptSelectOptions}
        />
      </div>

      <div className="rep-panel">
        <div className="rep-panel-title">Архивные проекты ({projList.length})</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Код</th>
              <th>Название</th>
              <th>Тип</th>
              <th>В архиве с</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {projList.map(p => (
              <tr key={p.id}>
                <td><span className="pj-code" style={{ background: p.color + '22', color: p.color }}>{p.code}</span></td>
                <td><b>{p.name}</b></td>
                <td>{PROJECT_TYPES[p.ptype || 'prod']}</td>
                <td>{fmtDMY(p.archivedAt)}</td>
                <td>
                  <button className="btn ghost sm" onClick={() => openProject(p.id)}>Открыть</button>
                  {canRestore(ur) && isArchived(p) && (
                    <button className="btn ghost sm" onClick={() => restoreProject(p.id)}>
                      <Ic d={ICONS.restore} size={12} /> Восстановить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rep-panel">
        <div className="rep-panel-title">Архивные задачи ({taskList.length})</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Задача</th>
              <th>Проект</th>
              <th>Исполнитель</th>
              <th>В архиве с</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {taskList.map(t => (
              <tr key={t.id}>
                <td><b>{t.title}</b></td>
                <td>{db.projects.find(x => x.id === t.projectId)?.code}</td>
                <td>{t.assigneeId ? empName(t.assigneeId) : '-'}</td>
                <td>{fmtDMY(t.archivedAt)}</td>
                <td>
                  <button className="btn ghost sm" onClick={() => openTask(t.id)}>Открыть</button>
                  {renderRestoreCell(t)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}