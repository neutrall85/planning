// src/components/Archive.jsx
import React from 'react';
import { PROJECT_TYPES } from '../utils/constants';
import { fmtDMY, TODAY } from '../utils/date';
import { canRestore, canRestoreTask } from '../utils/permissions';
import { isArchived } from '../utils/entityState';
import { Ic, ICONS } from './Icons';
import { useDataHelpers, useFilters } from '../hooks';

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

  // isArchived - единый предикат: закрытые, отменённые и архивированные
  // сущности одинаково попадают в «архивный список».
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

  /**
   * Ячейка действий над архивной задачей.
   *
   * Три состояния, каждое - явная проверка:
   *   1. задача в архиве И права есть И проект позволяет
   *      восстановление (canRestoreTask) → кнопка «Восстановить»;
   *   2. задача в архиве И права есть, но проект в архиве →
   *      подсказка, что сначала восстанавливают проект;
   *   3. прочее (нет прав или задача не архивная) → ничего.
   *
   * Проверка isArchived(task) вынесена наружу намеренно: canRestoreTask
   * отвечает только за «права + проект», а не за текущее состояние
   * задачи. Так одна и та же функция подходит и для UI (здесь, где
   * задача действительно архивная), и для сервиса (где восстанавливают
   * задачу со снятым флагом архива).
   */
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
        <select className="inp sel sm" value={projectId} onChange={e => setFilter('projectId', e.target.value)}>
          <option value="all">Все проекты</option>
          {projOptions.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>
        <select className="inp sel sm" value={assigneeId} onChange={e => setFilter('assigneeId', e.target.value)}>
          <option value="all">Все исполнители</option>
          {execs.map(e => <option key={e.id} value={e.id}>{e.last}</option>)}
        </select>
        <select className="inp sel sm" value={deptId} onChange={e => setFilter('deptId', e.target.value)}>
          <option value="all">Все подразделения</option>
          {db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
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