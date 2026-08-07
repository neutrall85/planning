import React, { useMemo, useState } from 'react';
import { PROJECT_STATUSES, PROJECT_TYPES } from '../utils/constants';
import { fmtDMY, initials, isTaskActive } from '../utils/date';
import { Ic, ICONS } from './Icons';
import { computeScope, hasRole } from '../utils/permissions';

export default function Projects({ db, ur, openProject, openHoursReq, closeProject, cancelProject }) {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const [showOnlyMyProjects, setShowOnlyMyProjects] = useState(false);
  const canSeeAllProjects = hasRole(ur, "admin", "director", "economist", "kb_chief", "head", "pm", "project_manager");

  let list = scope.all 
    ? db.projects.filter(p => !p.archived) 
    : db.projects.filter(p => !p.archived && scope.projIds.has(p.id));

  // Фильтр "проекты с моими задачами"
  if (showOnlyMyProjects) {
    const myTasks = db.tasks.filter(t => (t.assigneeIds || []).includes(ur.id) && !t.archived);
    const myProjectIds = new Set(myTasks.map(t => t.projectId));
    list = list.filter(p => myProjectIds.has(p.id));
  }

  const canCloseProject = (project) => {
    const creatorId = project.creatorId || (project.history?.find(h => h.who !== 'system')?.who);
    return hasRole(ur, 'admin') || hasRole(ur, 'director') || (creatorId && creatorId === ur.id);
  };

  return (
    <div>
      <div className="sec-head">
        <div className="sec-note">Производственные и административные проекты.</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {canSeeAllProjects && (
            <label className="dept-pick">
              <input type="checkbox" checked={showOnlyMyProjects} onChange={(e) => setShowOnlyMyProjects(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Показать проекты с моими задачами</span>
            </label>
          )}
          {hasRole(ur, 'admin', 'director', 'kb_chief', 'project_manager') && (
            <button className="btn primary" onClick={() => openProject(null)}>
              <Ic d={ICONS.plus} size={15} /> Проект
            </button>
          )}
        </div>
      </div>
      <div className="pj-grid">
        {list.map(p => {
          const tasks = db.tasks.filter(t => t.projectId === p.id && isTaskActive(t));
          const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
          const fact = tasks.reduce((s, t) => s + t.logs.reduce((lsum, l) => lsum + l.hours, 0), 0);
          const usePct = p.budget ? Math.round((fact / Math.max(1, p.budget)) * 100) : 0;
          const overPlan = p.budget != null && plan > p.budget;

          return (
            <div 
              key={p.id} 
              className="pj-card" 
              onClick={() => openProject(p.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="pj-top">
                <span className="pj-code" style={{ background: p.color + '22', color: p.color }}>{p.code}</span>
                <span className={`pj-st ${p.status}`}>{PROJECT_STATUSES[p.status]}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{PROJECT_TYPES[p.ptype || 'prod']}</span>
              </div>
              <div className="pj-name">{p.name}</div>
              <div className="pj-row">
                <span className="mut">Сроки:</span> {fmtDMY(p.start)} — {p.end ? fmtDMY(p.end) : 'не задан'}
              </div>
              {p.ptype !== 'admin' && p.budget != null && (
                <div className="pj-budget">
                  <div className="pj-budget-row">
                    <span>Бюджет: <b>{p.budget} ч</b></span>
                    <span>План: <b className={overPlan ? 'red' : ''}>{plan} ч</b></span>
                    <span>Факт: <b>{fact} ч</b></span>
                    <span>Использовано: <b>{usePct}%</b></span>
                  </div>
                  <div className="pj-progress">
                    <div className={`pj-progress-fill${usePct > 100 ? ' over' : ''}`} style={{ width: Math.min(100, usePct) + '%', background: p.color }} />
                  </div>
                </div>
              )}
              <div className="pj-foot">
                <div className="pj-avatars">
                  {tasks.slice(0, 6).flatMap(t =>
                    (t.assigneeIds || []).map(id => {
                      const a = db.employees.find(e => e.id === id);
                      return a && (
                        <span
                          key={`${t.id}-${a.id}`}  // <--- УНИКАЛЬНЫЙ КЛЮЧ
                          className="avatar xs"
                          title={`${a.last} ${a.first}`}
                        >
                          {initials(a.first, a.last)}
                        </span>
                      );
                    })
                  )}
                </div>
                <div className="pj-actions" onClick={(e) => e.stopPropagation()}>
                  {((hasRole(ur, 'pm') && p.managerId === ur.id) || hasRole(ur, 'admin', 'director', 'economist', 'kb_chief')) && p.status === 'active' && p.ptype !== 'admin' && (
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