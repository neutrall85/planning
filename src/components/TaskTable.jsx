import { useState, useMemo } from 'react';
import { TASK_STATUSES } from '../utils/constants';
import { fmtDMY } from '../utils/date';

/**
 * Таблица задач с сортировкой по столбцам.
 *
 * Раньше `.find` по проектам стоял прямо в компараторе sort:
 * `db.projects.find(p => p.id === a.projectId)` для каждой пары
 * сравниваемых элементов. Это O(N log N · M). Сейчас ключи сортировки
 * для всех задач вычисляются один раз перед сортировкой - O(N), а
 * компаратор только сравнивает готовые значения.
 */
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

  // Стабильная по ссылке карта проектов; сравнение в deps useMemo по
  // ссылке на массив db.projects.
  const projectsById = useMemo(
    () => new Map((db?.projects || []).map(p => [p.id, p])),
    [db?.projects],
  );

  const sortedTasks = useMemo(() => {
    const keyed = tasks.map(t => {
      let key;
      switch (sortField) {
        case 'title':    key = (t.title || '').toLowerCase(); break;
        case 'assignee': key = (t.assigneeId ? empName(t.assigneeId) : '').toLowerCase(); break;
        case 'status':   key = TASK_STATUSES[t.status]?.label || t.status || ''; break;
        case 'planned':  key = t.plannedHours ?? -1; break;
        case 'fact':     key = getTaskSpent(t); break;
        case 'deadline': key = t.deadline || ''; break;
        case 'project':  key = projectsById.get(t.projectId)?.code || ''; break;
        default:         key = '';
      }
      return { task: t, key };
    });

    keyed.sort((a, b) => {
      if (a.task._draft !== b.task._draft) return a.task._draft ? -1 : 1;
      if (a.key < b.key) return sortDir === 'asc' ? -1 : 1;
      if (a.key > b.key) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return keyed.map(k => k.task);
  }, [tasks, sortField, sortDir, projectsById, empName, getTaskSpent]);

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
            sortedTasks.map(task => {
              const isDraft = task._draft === true;
              return (
                <tr
                  key={task.id}
                  className={isDraft ? 'draft-row' : 'clickable-row'}
                  onClick={isDraft ? undefined : () => onRowClick(task.id)}
                >
                  {columns.includes('title') && (
                    <td>
                      <b>{task.title}</b>
                      {isDraft && <span className="task-draft-badge">черновик</span>}
                    </td>
                  )}
                  {columns.includes('assignee') && (
                    <td>{task.assigneeId ? empName(task.assigneeId) : '-'}</td>
                  )}
                  {columns.includes('status') && (
                    <td>
                      <span
                        className="st-chip"
                        style={{
                          background: (TASK_STATUSES[task.status]?.color || '#64748b') + '22',
                          color: TASK_STATUSES[task.status]?.color || '#64748b',
                        }}
                      >
                        {TASK_STATUSES[task.status]?.label || task.status}
                      </span>
                    </td>
                  )}
                  {columns.includes('planned') && <td>{task.plannedHours ?? '-'}</td>}
                  {columns.includes('fact') && <td>{getTaskSpent(task)}</td>}
                  {columns.includes('deadline') && (
                    <td>{task.deadline ? fmtDMY(task.deadline) : '-'}</td>
                  )}
                  {showProject && columns.includes('project') && (
                    <td>{projectsById.get(task.projectId)?.code || '-'}</td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};