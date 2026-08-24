import React from 'react';
import { TASK_STATUSES, PRIORITIES } from '../../utils/constants';
import { fmtDMY, TODAY } from '../../utils/date';
import Avatar from '../Avatar';

export default function TasksList({ tasks, db, openTask }) {
  if (!tasks.length) {
    return <div className="empty-note" style={{ padding: '40px 0' }}>Нет задач, соответствующих фильтрам</div>;
  }

  return (
    <div className="pj-grid">
      {tasks.map(task => {
        const project = db.projects.find(p => p.id === task.projectId);
        const assignees = (task.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
        const factHours = task.logs.reduce((sum, log) => sum + log.hours, 0);
        const overdue = task.deadline && !['closed','cancelled'].includes(task.status) && task.deadline < TODAY;
        const status = TASK_STATUSES[task.status]?.label || task.status;
        const priority = PRIORITIES[task.priority]?.label || task.priority;
        const priorityColor = PRIORITIES[task.priority]?.color || '#e2e8f0';

        return (
          <div 
            key={task.id} 
            className="pj-card" 
            onClick={() => openTask(task.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="pj-top">
              <span className="pj-code" style={{ background: project?.color + '22', color: project?.color || '#64748b' }}>
                {project?.code || 'Без проекта'}
              </span>
              <span className={`pj-st ${task.status}`}>{status}</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{priority}</span>
            </div>
            <div className="pj-name">{task.title}</div>
            <div className="pj-row">
              <span className="mut">Срок исполнения: </span> 
              {task.deadline ? (
                <span className={overdue ? 'red' : ''}>{fmtDMY(task.deadline)}</span>
              ) : 'не задан'}
            </div>
            <div className="pj-row">
              <span className="mut">Исполнители: </span>
              <span>
                {assignees.length ? assignees.map(a => `${a.last} ${a.first}`).join(', ') : 'не назначены'}
              </span>
            </div>
            <div className="pj-budget" style={{ marginTop: 8 }}>
              <div className="pj-budget-row">
                <span>Часы: <b>{factHours}</b> / <b>{task.plannedHours ?? '—'}</b></span>
              </div>
              {task.plannedHours > 0 && (
                <div className="pj-progress">
                  <div 
                    className="pj-progress-fill" 
                    style={{ width: Math.min(100, (factHours / task.plannedHours) * 100) + '%', background: project?.color || '#3b82f6' }} 
                  />
                </div>
              )}
            </div>
            <div className="pj-foot">
              {/* Удалён блок с аватарами */}
              {overdue && <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>Просрочено</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}