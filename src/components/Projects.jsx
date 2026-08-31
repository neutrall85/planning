import React from 'react';
import { PROJECT_STATUSES, PROJECT_TYPES, PROJECT_PRIORITIES } from '../utils/constants';
import { fmtDMY, initials, isTaskActive } from '../utils/date';
import { Ic, ICONS } from './Icons';
import { hasRole } from '../utils/permissions';
import { getProjectColor } from '../utils/projectHelpers';
import ProjectProgress from './ProjectProgress';

export default function Projects({ db, ur, openProject, openHoursReq, closeProject, cancelProject, projects }) {
  const canCloseProject = (project) => {
    const creatorId = project.creatorId || (project.history?.find(h => h.who !== 'system')?.who);
    return hasRole(ur, 'admin') || hasRole(ur, 'director') || (creatorId && creatorId === ur.id);
  };

  return (
    <div>
      <div className="pj-grid">
        {projects.map(p => {
          const tasks = db.tasks.filter(t => t.projectId === p.id && isTaskActive(t));
          const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
          const fact = tasks.reduce((s, t) => s + t.logs.reduce((lsum, l) => lsum + l.hours, 0), 0);
          const usePct = p.budget ? Math.round((fact / Math.max(1, p.budget)) * 100) : 0;
          const overPlan = p.budget != null && plan > p.budget;
          const projectColor = getProjectColor(p);

          return (
            <div 
              key={p.id} 
              className="pj-card cursor-pointer" 
              onClick={() => openProject(p.id)}
            >
              <div className="pj-top">
                <span className="pj-code" style={{ background: projectColor + '22', color: projectColor }}>
                  {p.code}
                </span>
                <span className={`pj-st ${p.status}`}>{PROJECT_STATUSES[p.status]}</span>
                <span className="text-xs text-mut">{PROJECT_TYPES[p.ptype || 'prod']}</span>
                <span className="pj-priority font-semibold" style={{ color: PROJECT_PRIORITIES[p.priority]?.color || '#64748b' }}>
                  {p.priority || 'NORM'}
                </span>
              </div>
              <div className="pj-name">{p.name}</div>
              <div className="pj-row">
                <span className="mut">Сроки:</span> {fmtDMY(p.start)} — {p.end ? fmtDMY(p.end) : 'не задан'}
              </div>
              <ProjectProgress project={p} plan={plan} fact={fact} />
              <div className="pj-foot">
                <div className="pj-avatars">
                  {tasks.slice(0, 6).map(t => {
                    const a = t.assigneeId ? db.employees.find(e => e.id === t.assigneeId) : null;
                    return a && (
                      <span
                        key={t.id}
                        className="avatar xs"
                        title={`${a.last} ${a.first}`}
                      >
                        {initials(a.first, a.last)}
                      </span>
                    );
                  })}
                </div>
                <div className="pj-actions" onClick={(e) => e.stopPropagation()}>
                  {((hasRole(ur, 'project_lead') && p.managerId === ur.id) || hasRole(ur, 'admin', 'director', 'economist', 'kb_chief')) && p.status === 'active' && p.ptype !== 'admin' && (
                    <button className="btn ghost sm" onClick={() => openHoursReq('project', p.id)}>
                      <Ic d={ICONS.clock} size={13} /> Запросить изменение часов
                    </button>
                  )}
                  {hasRole(ur, 'admin', 'director', 'economist', 'kb_chief') && (
                    <button className="icon-btn" title="Редактировать" onClick={() => openProject(p.id)}>
                      <Ic d={ICONS.edit} size={15} />
                    </button>
                  )}
                  {canCloseProject(p) && p.status !== 'closed' && p.status !== 'cancelled' && (
                    <button className="icon-btn danger" title="Закрыть/Отменить проект" onClick={() => {
                      const action = window.confirm(`Закрыть проект "${p.name}"? Все задачи проекта будут переведены в статус "Закрыта".`) 
                        ? 'close' 
                        : (window.confirm(`Отменить проект "${p.name}"? Все задачи проекта будут переведены в статус "Отменена".`) ? 'cancel' : null);
                      if (action === 'close') closeProject(p);
                      else if (action === 'cancel') cancelProject(p);
                    }}>
                      <Ic d={ICONS.x} size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}