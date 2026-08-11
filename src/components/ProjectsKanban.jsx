import React, { useMemo, useState } from 'react';
import { PROJECT_STATUSES, PROJECT_TYPES, PROJECT_CATEGORIES } from '../utils/constants';
import { fmtDMY, initials, isTaskActive } from '../utils/date';
import { Ic, ICONS } from './Icons';
import { computeScope, hasRole, canChangeProjectStatus } from '../utils/permissions';
import { useToast } from './Toast';
import EmployeeTooltip from './EmployeeTooltip';

const PROJECT_STATUS_ORDER = ['inactive', 'active', 'closed', 'cancelled'];

const PROJECT_STATUS_CONFIG = {
  active: { label: 'Активный', color: '#3b82f6' },
  inactive: { label: 'Неактивный', color: '#94a3b8' },
  closed: { label: 'Закрыт', color: '#10b981' },
  cancelled: { label: 'Отменён', color: '#94a3b8' },
};

export default function ProjectsKanban({ db, ur, openProject, moveProject, showOnlyMyProjects: parentShowOnlyMyProjects, sortBy: parentSortBy, toast }) {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const showToast = useToast(toast);
  const [tooltip, setTooltip] = useState({ visible: false, employee: null, x: 0, y: 0 });

  const showOnlyMyProjects = parentShowOnlyMyProjects !== undefined ? parentShowOnlyMyProjects : false;
  const sortBy = parentSortBy !== undefined ? parentSortBy : "name";
  const [dragOverCol, setDragOverCol] = useState(null);
  
  let list = scope.all 
    ? db.projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled') 
    : db.projects.filter(p => (!p.archived || p.status === 'closed' || p.status === 'cancelled') && scope.projIds.has(p.id));

  if (showOnlyMyProjects) {
    const myTasks = db.tasks.filter(t => (t.assigneeIds || []).includes(ur.id) && !t.archived);
    const myProjectIds = new Set(myTasks.map(t => t.projectId));
    list = list.filter(p => myProjectIds.has(p.id));
  }
  
  list = [...list].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name, 'ru');
      case 'nameDesc': return b.name.localeCompare(a.name, 'ru');
      case 'created': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'budget': return (a.budget || 0) - (b.budget || 0);
      case 'budgetDesc': return (b.budget || 0) - (a.budget || 0);
      default: return 0;
    }
  });

  return (
    <div className="kanban">
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
                  showToast('У вас нет прав на перевод проекта в статус ' + statusConfig.label);
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
                  const uniqueAssignees = [...new Set(tasks.flatMap(t => t.assigneeIds || []))];
                  const canDrag = canChangeProjectStatus(ur, p, status, db);
                  
                  return (
                    <div 
                      key={p.id} 
                      className={`kcard${p.status === 'cancelled' ? ' dim' : ''}`}
                      onClick={() => openProject(p.id)}
                      draggable={canDrag}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                      style={{ borderLeft: `4px solid ${PROJECT_CATEGORIES[p.category || 'NORM']?.color || '#10b981'}` }}
                    >
                      <div className="kcard-title">{p.name}</div>
                      <div className="kcard-proj">
                        <span className="pdot" style={{ background: PROJECT_CATEGORIES[p.category || 'NORM']?.color || '#10b981' }} />
                        {p.code}
                      </div>
                      <div className="kcard-meta" style={{ flexWrap: 'wrap', gap: '4px' }}>
                        <span className="mut sm">{PROJECT_TYPES[p.ptype || 'prod']}</span>
                        <span className="mut sm" style={{ color: PROJECT_CATEGORIES[p.category || 'NORM']?.color || '#10b981', fontWeight: 600 }}>{PROJECT_CATEGORIES[p.category || 'NORM']?.label || 'NORM'}</span>
                        {p.budget != null && (
                          <span className="khours" style={{ whiteSpace: 'nowrap' }}>
                            <Ic d={ICONS.clock} size={13} /> {fact}/{p.budget} ч ({usePct}%)
                          </span>
                        )}
                      </div>
                      <div className="kcard-foot">
                        <div className="pj-avatars">
                          {uniqueAssignees.slice(0, 4).map(id => {
                            const a = db.employees.find(e => e.id === id);
                            return a ? (
                              <span 
                                key={id} 
                                className="avatar xs" 
                                title={`${a.last} ${a.first}`}
                                onMouseEnter={(e) => setTooltip(prev => ({ ...prev, visible: true, employee: a, x: e.clientX, y: e.clientY }))}
                                onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                                onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                              >
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
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
      <EmployeeTooltip {...tooltip} />
    </div>
  );
}