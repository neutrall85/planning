import React, { useMemo, useState } from 'react';
import { PROJECT_STATUSES, PROJECT_TYPES, PROJECT_CATEGORIES } from '../utils/constants';
import { fmtDMY, initials, isTaskActive } from '../utils/date';
import { Ic, ICONS } from './Icons';
import { computeScope, hasRole, canChangeProjectStatus } from '../utils/permissions';
import { useToast } from './Toast';
import EmployeeTooltip from './EmployeeTooltip'; // <-- добавлен импорт

// Порядок статусов для канбан-доски
const PROJECT_STATUS_ORDER = ['inactive', 'active', 'closed', 'cancelled'];

// Конфигурация цветов для статусов проектов
const PROJECT_STATUS_CONFIG = {
  active: { label: 'Активный', color: '#3b82f6' },
  inactive: { label: 'Неактивный', color: '#94a3b8' },
  closed: { label: 'Закрыт', color: '#10b981' },
  cancelled: { label: 'Отменён', color: '#94a3b8' },
};

export default function ProjectsKanban({ db, ur, openProject, closeProject, cancelProject, moveProject, showOnlyMyProjects: parentShowOnlyMyProjects, sortBy: parentSortBy, toast }) {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const canSeeAllProjects = hasRole(ur, "admin", "director", "economist", "kb_chief", "head", "project_lead", "project_manager");
  
  const showToast = useToast(toast);
  
  // Состояние для tooltip
  const [tooltip, setTooltip] = useState({ visible: false, employee: null, x: 0, y: 0 }); // <-- добавлено

  const showOnlyMyProjects = parentShowOnlyMyProjects !== undefined ? parentShowOnlyMyProjects : false;
  const sortBy = parentSortBy !== undefined ? parentSortBy : "name";
  const [dragOverCol, setDragOverCol] = useState(null);
  
  let list = scope.all 
    ? db.projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled') 
    : db.projects.filter(p => (!p.archived || p.status === 'closed' || p.status === 'cancelled') && scope.projIds.has(p.id));

  // Фильтр "проекты с моими задачами"
  if (showOnlyMyProjects) {
    const myTasks = db.tasks.filter(t => (t.assigneeIds || []).includes(ur.id) && !t.archived);
    const myProjectIds = new Set(myTasks.map(t => t.projectId));
    list = list.filter(p => myProjectIds.has(p.id));
  }
  
  // Сортировка
  list = [...list].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name, 'ru');
      case 'nameDesc':
        return b.name.localeCompare(a.name, 'ru');
      case 'created':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'budget':
        return (a.budget || 0) - (b.budget || 0);
      case 'budgetDesc':
        return (b.budget || 0) - (a.budget || 0);
      default:
        return 0;
    }
  });

  const canCloseProject = (project) => {
    const creatorId = project.creatorId || (project.history?.find(h => h.who !== 'system')?.who);
    return hasRole(ur, 'admin') || hasRole(ur, 'director') || (creatorId && creatorId === ur.id);
  };

  const canCreateProject = hasRole(ur, 'admin', 'director', 'kb_chief', 'project_manager');

  return (
    <div className="w-full" style={{ maxWidth: '100%' }}>
      <div className="flex gap-6 p-6 w-full overflow-x-auto" style={{ minWidth: '100%' }}>
        {PROJECT_STATUS_ORDER.map((status) => {
          const projects = list.filter(p => p.status === status);
          const statusConfig = PROJECT_STATUS_CONFIG[status];
          
          return (
            <div 
              key={status} 
              className="flex-shrink-0 w-[320px] lg:w-[380px] xl:flex-grow bg-gray-50 rounded-lg shadow-sm border border-gray-200"
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
              <div className="kcol-head p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-gray-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <span className="kdot w-3 h-3 rounded-full" style={{ background: statusConfig.color }} />
                  <span className="font-semibold text-gray-800">{statusConfig.label}</span>
                </div>
                <span className="kcount bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">{projects.length}</span>
              </div>
              <div className="kcol-body p-3 space-y-3 min-h-[200px]">
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
                        className="kcard bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => openProject(p.id)}
                        draggable={canDrag}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                        style={{ borderLeft: `4px solid ${PROJECT_CATEGORIES[p.category || 'NORM']?.color || '#10b981'}` }}
                      >
                        <div className="kcard-title font-semibold text-gray-900 mb-2 break-words line-clamp-2">{p.name}</div>
                        <div className="kcard-proj flex items-center gap-2 mb-2">
                          <span className="pdot w-2 h-2 rounded-full" style={{ background: PROJECT_CATEGORIES[p.category || 'NORM']?.color || '#10b981' }} />
                          <span className="text-sm text-gray-600 font-mono">{p.code}</span>
                        </div>
                        <div className="kcard-meta flex flex-wrap gap-2 mb-3 text-xs">
                          <span className="mut sm bg-gray-100 px-2 py-1 rounded">{PROJECT_TYPES[p.ptype || 'prod']}</span>
                          <span className="mut sm px-2 py-1 rounded" style={{ color: PROJECT_CATEGORIES[p.category || 'NORM']?.color || '#10b981', fontWeight: 600, backgroundColor: `${PROJECT_CATEGORIES[p.category || 'NORM']?.color || '#10b981'}20` }}>{PROJECT_CATEGORIES[p.category || 'NORM']?.label || 'NORM'}</span>
                          {p.budget != null && (
                            <span className="khours flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                              <Ic d={ICONS.clock} size={13} /> <span>{fact}/{p.budget} ч ({usePct}%)</span>
                            </span>
                          )}
                        </div>
                        <div className="kcard-foot flex items-center justify-between">
                          <div className="pj-avatars flex items-center gap-1" style={{ flex: 1 }}>
                            {uniqueAssignees.slice(0, 4).map(id => {
                              const a = db.employees.find(e => e.id === id);
                              return a ? (
                                <span 
                                  key={id} 
                                  className="avatar xs w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700 overflow-hidden ring-2 ring-white"
                                  title={`${a.last} ${a.first}`}
                                  onMouseEnter={(e) => setTooltip(prev => ({ ...prev, visible: true, employee: a, x: e.clientX, y: e.clientY }))}
                                  onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                                  onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                                >
                                  {a.photo ? (
                                    <img src={a.photo} alt="Аватар" className="w-full h-full object-cover" />
                                  ) : (
                                    initials(a.first, a.last)
                                  )}
                                </span>
                              ) : null;
                            })}
                            {uniqueAssignees.length > 4 && (
                              <span className="mut sm text-gray-500 text-xs">+{uniqueAssignees.length - 4}</span>
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
      {/* Tooltip сотрудника */}
      <EmployeeTooltip {...tooltip} />
    </div>
  );
}