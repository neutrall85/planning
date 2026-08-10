import React, { useMemo } from 'react';
import { TASK_STATUSES, PRIORITIES } from '../utils/constants';
import { fmtD, initials, isTaskActive, daysDiff, TODAY } from '../utils/date';
import { Ic, ICONS } from './Icons';
import { computeScope, taskVisible, hasRole } from '../utils/permissions';

export default function TaskList({ db, ur, openTask, onMove, onNew, showOnlyMyTasks: parentShowOnlyMyTasks, sortBy: parentSortBy }) {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const canSeeAll = hasRole(ur, "admin", "director", "economist", "kb_chief", "head", "project_lead", "project_manager");
  const isOnlyExecutor = ur.roles.length === 1 && ur.roles[0] === 'executor';
  
  const showOnlyMyTasks = parentShowOnlyMyTasks !== undefined ? parentShowOnlyMyTasks : false;
  const sortBy = parentSortBy !== undefined ? parentSortBy : "deadline";

  let list = db.tasks.filter((t) => isTaskActive(t) && taskVisible(ur, scope, t, db));
  
  if (showOnlyMyTasks) {
    list = list.filter(t => (t.assigneeIds || []).includes(ur.id));
  }

  // Сортировка
  list = [...list].sort((a, b) => {
    switch (sortBy) {
      case 'deadline':
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      case 'deadlineDesc':
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(b.deadline) - new Date(a.deadline);
      case 'created':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'alpha':
        return a.title.localeCompare(b.title, 'ru');
      case 'alphaDesc':
        return b.title.localeCompare(a.title, 'ru');
      case 'hours':
        return (a.plannedHours || 0) - (b.plannedHours || 0);
      case 'hoursDesc':
        return (b.plannedHours || 0) - (a.plannedHours || 0);
      default:
        return 0;
    }
  });

  const getCategoryColor = (task) => {
    const project = db.projects.find(p => p.id === task.projectId);
    return project?.color || '#64748b';
  };

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Задача</th>
            <th>Проект</th>
            <th>Статус</th>
            <th>Приоритет</th>
            <th>Исполнители</th>
            <th>План / факт</th>
            <th>Дедлайн</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={7} className="mut">Нет задач</td></tr>
          ) : (
            list.map(t => {
              const project = db.projects.find(p => p.id === t.projectId);
              const assignees = (t.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
              const spent = t.logs.reduce((s, l) => s + l.hours, 0);
              const overdue = t.deadline && !["closed", "cancelled"].includes(t.status) && t.deadline < TODAY;
              const soon = t.deadline && !overdue && !["closed", "cancelled"].includes(t.status) && daysDiff(TODAY, t.deadline) <= 3;
              const prioColor = PRIORITIES[t.priority]?.color || PRIORITIES.mid.color;
              const categoryColor = getCategoryColor(t);

              return (
                <tr 
                  key={t.id} 
                  onClick={() => openTask(t.id)}
                  style={{ cursor: 'pointer' }}
                  className={t.status === 'cancelled' ? 'dim' : ''}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="pdot" style={{ background: prioColor, minWidth: 8, minHeight: 8 }} />
                      <b>{t.title}</b>
                    </div>
                  </td>
                  <td>
                    {project && (
                      <span className="pj-code" style={{ background: categoryColor + '22', color: categoryColor }}>
                        {project.code}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`pj-st ${t.status}`} style={{ fontSize: 12 }}>
                      {TASK_STATUSES[t.status]?.label || t.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: prioColor, fontWeight: 500 }}>
                      {PRIORITIES[t.priority]?.label || '—'}
                    </span>
                  </td>
                  <td>
                    <div className="pj-avatars" style={{ display: 'flex', gap: -4 }}>
                      {assignees.slice(0, 3).map(a => (
                        <span key={a.id} className="avatar xs" title={`${a.last} ${a.first}`}>
                          {a.photo ? (
                            <img src={a.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            initials(a.first, a.last)
                          )}
                        </span>
                      ))}
                      {assignees.length > 3 && (
                        <span className="mut sm">+{assignees.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={spent > (t.plannedHours || 0) ? 'red' : ''}>
                      {spent}/{t.plannedHours ?? "—"} ч
                    </span>
                  </td>
                  <td>
                    <span className={overdue ? 'red' : soon ? 'soon' : ''}>
                      {t.deadline ? (overdue ? `просрочено ${-daysDiff(TODAY, t.deadline)} дн` : fmtD(t.deadline)) : "—"}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
