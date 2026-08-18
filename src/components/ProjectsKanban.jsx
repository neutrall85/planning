import React, { useMemo, useState } from 'react';
import { PROJECT_STATUSES, PROJECT_TYPES } from '../utils/constants';
import { fmtDMY, initials, isTaskActive } from '../utils/date';
import { Ic, ICONS } from './Icons';
import { computeScope, hasRole, canChangeProjectStatus } from '../utils/permissions';

// Порядок статусов для канбан-доски
const PROJECT_STATUS_ORDER = ['inactive', 'active', 'closed', 'cancelled'];

// Конфигурация цветов для статусов проектов
const PROJECT_STATUS_CONFIG = {
  active: { label: 'Активный', color: '#10b981' },
  inactive: { label: 'Неактивный', color: '#94a3b8' },
  closed: { label: 'Закрыт', color: '#3b82f6' },
  cancelled: { label: 'Отменён', color: '#ef4444' },
};

export default function ProjectsKanban({ db, ur, openProject, closeProject, cancelProject, moveProject }) {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const [showOnlyMyProjects, setShowOnlyMyProjects] = useState(false);
  const [dragOverCol, setDragOverCol] = useState(null);
  const canSeeAllProjects = hasRole(ur, "admin", "director", "economist", "kb_chief", "head", "project_lead", "project_manager");
  
  let list = scope.all 
    ? db.projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled') 
    : db.projects.filter(p => (!p.archived || p.status === 'closed' || p.status === 'cancelled') && scope.projIds.has(p.id));

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

  const canCreateProject = hasRole(ur, 'admin', 'director', 'kb_chief', 'project_manager');

  return (
    <div>
      <div className="toolbar">
        <div className="sec-note" style={{ flex: 1 }}>Производственные и административные проекты.</div>
        {canSeeAllProjects && (
          <label className="dept-pick">
            <input type="checkbox" checked={showOnlyMyProjects} onChange={(e) => setShowOnlyMyProjects(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Показать проекты с моими задачами</span>
          </label>
        )}
        {canCreateProject && (
          <button className="btn primary" onClick={() => openProject(null)}>
            <Ic d={ICONS.plus} size={15} /> Проект
          </button>
        )}
      </div>
      
      <div className="kanban k5">
        {PROJECT_STATUS_ORDER.map((status) => {
          const projects = list.filter(p => p.status === status);
          const statusConfig = PROJECT_STATUS_CONFIG[status];
          
          return (
            <div 
              key={status} 
              className={`kcol${dragOverCol === status ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(status); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => { 
                e.preventDefault(); 
                setDragOverCol(null); 
                const id = e.dataTransfer.getData("text/plain"); 
                if (id) {
                  const project = db.projects.find(p => p.id === id);
                  if (project && !canChangeProjectStatus(ur, project, status, db)) {
                    alert('У вас нет прав на перевод проекта в статус ' + statusConfig.label);
                    return;
                  }
                  if (moveProject) {
                    moveProject(id, status);
                  }
                }
              }}
            >
              <div className="kcol-head">
                <span className="kdot" style={{ background: statusConfig.color }} />
                {statusConfig.label}
                <span className="kcount">{projects.length}</span>
              </div>
              <div className="kcol-body">
                {projects.length === 0 ? (
                  <div className="kempty">Нет проектов</div>
                ) : (
                  projects.map(p => {
                    const tasks = db.tasks.filter(t => t.projectId === p.id && isTaskActive(t));
                    const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
                    const fact = tasks.reduce((s, t) => s + t.logs.reduce((lsum, l) => lsum + l.hours, 0), 0);
                    const usePct = p.budget ? Math.round((fact / Math.max(1, p.budget)) * 100) : 0;
                    const overPlan = p.budget != null && plan > p.budget;
                    const uniqueAssignees = [...new Set(tasks.flatMap(t => t.assigneeIds || []))];
                    const canDrag = canChangeProjectStatus(ur, p, status, db);
                    
                    return (
                      <div 
                        key={p.id} 
                        className="kcard"
                        onClick={() => openProject(p.id)}
                        draggable={canDrag}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="kcard-title">{p.name}</div>
                        <div className="kcard-proj"><span className="pdot" style={{ background: p.color }} />{p.code}</div>
                        <div className="kcard-meta">
                          <span className="mut sm">{PROJECT_TYPES[p.ptype || 'prod']}</span>
                          {p.budget != null && (
                            <span className="khours">
                              <Ic d={ICONS.clock} size={13} /> {fact}/{p.budget} ч ({usePct}%)
                            </span>
                          )}
                        </div>
                        <div className="kcard-foot">
                          <div className="pj-avatars" style={{ flex: 1 }}>
                            {uniqueAssignees.slice(0, 4).map(id => {
                              const a = db.employees.find(e => e.id === id);
                              return a ? (
                                <span key={id} className="avatar xs" title={`${a.last} ${a.first}`}>
                                  {a.photo ? (
                                    <img src={a.photo} alt="Аватар" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                  ) : (
                                    initials(a.first, a.last)
                                  )}
                                </span>
                              ) : null;
                            })}
                            {uniqueAssignees.length > 4 && (
                              <span className="mut sm">+{uniqueAssignees.length - 4}</span>
                            )}
                          </div>
                          <div className="pj-actions" onClick={(e) => e.stopPropagation()}>
                            {canCloseProject(p) && p.status !== 'closed' && p.status !== 'cancelled' && (
                              <button 
                                className="icon-btn danger" 
                                title="Закрыть/Отменить проект" 
                                onClick={() => {
                                  const action = window.confirm(`Закрыть проект "${p.name}"? Все задачи проекта будут переведены в статус "Закрыта".`) 
                                    ? 'close' 
                                    : (window.confirm(`Отменить проект "${p.name}"? Все задачи проекта будут переведены в статус "Отменена".`) ? 'cancel' : null);
                                  if (action === 'close') closeProject(p);
                                  else if (action === 'cancel') cancelProject(p);
                                }}
                              >
                                <Ic d={ICONS.x} size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
