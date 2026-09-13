import { useState, useMemo } from 'react';
import { TASK_STATUSES } from '../utils/constants';
import { fmtDMY } from '../utils/date';

export const TaskTable = ({ 
  tasks, 
  onRowClick, 
  columns = ['title', 'assignee', 'status', 'planned', 'fact', 'deadline'],
  db,
  getTaskSpent,
  empName,
  showProject = false,
}) => {
  const [sortField, setSortField] = useState('title');
  const [sortDir, setSortDir] = useState('asc');

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'assignee':
          const nameA = a.assigneeId ? empName(a.assigneeId) : '';
          const nameB = b.assigneeId ? empName(b.assigneeId) : '';
          valA = nameA.toLowerCase();
          valB = nameB.toLowerCase();
          break;
        case 'status':
          valA = TASK_STATUSES[a.status]?.label || a.status;
          valB = TASK_STATUSES[b.status]?.label || b.status;
          break;
        case 'planned':
          valA = a.plannedHours ?? -1;
          valB = b.plannedHours ?? -1;
          break;
        case 'fact':
          valA = getTaskSpent(a);
          valB = getTaskSpent(b);
          break;
        case 'deadline':
          valA = a.deadline || '';
          valB = b.deadline || '';
          break;
        case 'project':
          const pA = db.projects.find(p => p.id === a.projectId);
          const pB = db.projects.find(p => p.id === b.projectId);
          valA = pA?.code || '';
          valB = pB?.code || '';
          break;
        default:
          return 0;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [tasks, sortField, sortDir, db, empName, getTaskSpent]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortableHeader = (field, label) => (
    <th className="sortable" onClick={() => handleSort(field)}>
      {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
  );

  return (
    <div className="tasks-table-wrap">
      <table className="tbl tasks-table">
        <thead>
          <tr>
            {columns.includes('title') && sortableHeader('title', 'Задача')}
            {columns.includes('assignee') && sortableHeader('assignee', 'Исполнитель')}
            {columns.includes('status') && sortableHeader('status', 'Статус')}
            {columns.includes('planned') && sortableHeader('planned', 'План (ч)')}
            {columns.includes('fact') && sortableHeader('fact', 'Факт (ч)')}
            {columns.includes('deadline') && sortableHeader('deadline', 'Дедлайн')}
            {showProject && columns.includes('project') && sortableHeader('project', 'Проект')}
          </tr>
        </thead>
        <tbody>
          {sortedTasks.length === 0 ? (
            <tr><td colSpan={columns.length} className="mut text-center">Нет задач</td></tr>
          ) : (
            sortedTasks.map(task => (
              <tr key={task.id} className="clickable-row" onClick={() => onRowClick(task.id)}>
                {columns.includes('title') && <td><b>{task.title}</b></td>}
                {columns.includes('assignee') && <td>{task.assigneeId ? empName(task.assigneeId) : '—'}</td>}
                {columns.includes('status') && (
                  <td>
                    <span className="st-chip" style={{ background: TASK_STATUSES[task.status]?.color + '22', color: TASK_STATUSES[task.status]?.color }}>
                      {TASK_STATUSES[task.status]?.label || task.status}
                    </span>
                  </td>
                )}
                {columns.includes('planned') && <td>{task.plannedHours ?? '—'}</td>}
                {columns.includes('fact') && <td>{getTaskSpent(task)}</td>}
                {columns.includes('deadline') && <td>{task.deadline ? fmtDMY(task.deadline) : '—'}</td>}
                {showProject && columns.includes('project') && (
                  <td>{db.projects.find(p => p.id === task.projectId)?.code || '—'}</td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};