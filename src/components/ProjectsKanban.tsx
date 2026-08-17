import React, { useState } from 'react';
import { Ic, ICONS } from './Icons';
import { useToast } from '../hooks/useToast';
import EmployeeTooltip from './EmployeeTooltip';
import { useDragAndDrop } from '../hooks';
import { computeScope } from '../utils/permissions';
import { canChangeProjectStatus } from '../utils/permissions';
import { isTaskActive, initials } from '../utils/date';
import { PROJECT_CATEGORIES, PROJECT_TYPES } from '../utils/constants';

const PROJECT_STATUS_ORDER = ['inactive', 'active', 'closed', 'cancelled'];

const PROJECT_STATUS_CONFIG = {
  active: { label: 'Активный', color: '#3b82f6' },
  inactive: { label: 'Неактивный', color: '#94a3b8' },
  closed: { label: 'Закрыт', color: '#10b981' },
  cancelled: { label: 'Отменён', color: '#94a3b8' },
};

export default function ProjectsKanban({
  db,
  ur,
  openProject,
  moveProject,
  showOnlyMyProjects: parentShowOnlyMyProjects,
  sortBy: parentSortBy,
  toast,
}) {
  const scope = computeScope(ur, db);
  const { toast: showToast } = useToast();
  const [tooltip, setTooltip] = useState({ visible: false, employee: null, x: 0, y: 0 });

  const showOnlyMyProjects = parentShowOnlyMyProjects !== undefined ? parentShowOnlyMyProjects : false;
  const sortBy = parentSortBy !== undefined ? parentSortBy : "name";

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

  const { dragState, handlers } = useDragAndDrop((projectId, newStatus) => {
    const project = db.projects.find(p => p.id === projectId);
    if (!project) return;
    if (!canChangeProjectStatus(ur, project, newStatus)) {
      showToast(`У вас нет прав на перевод проекта в статус "${PROJECT_STATUS_CONFIG[newStatus]?.label || newStatus}"`);
      return;
    }
    moveProject(projectId, newStatus);
  });
  const { dragItemId, dragOverCol, dragOverIndex } = dragState;

  return (
    <div className="kanban">
      {PROJECT_STATUS_ORDER.map((status) => {
        const projects = list.filter(p => p.status === status);
        const statusConfig = PROJECT_STATUS_CONFIG[status];

        return (
          <div
            key={status}
            className={`kcol${dragOverCol === status ? ' over' : ''}`}
            onDragOver={(e) => handlers.onDragOver(e, status)}
            onDrop={(e) => handlers.onDrop(e, status)}
            onDragLeave={handlers.onDragEnd}
          >
            <div className="kcol-head">
              <span className="kdot" style={{ background: statusConfig.color }} />
              {statusConfig.label}
              <span className="kcount">{projects.length}</span>
            </div>
            <div className="kcol-body">
              {projects.length === 0 && dragOverCol !== status && (
                <div className="kempty">Нет проектов</div>
              )}
              {projects.map((p, idx) => {
                const canDrag = canChangeProjectStatus(ur, p, status);
                const showPlaceholder =
                  dragItemId &&
                  dragOverCol === status &&
                  dragOverIndex === idx &&
                  p.id !== dragItemId;

                const tasks = db.tasks.filter(t => t.projectId === p.id && isTaskActive(t));
                const fact = tasks.reduce((s, t) => s + t.logs.reduce((lsum, l) => lsum + l.hours, 0), 0);
                const usePct = p.budget ? Math.round((fact / Math.max(1, p.budget)) * 100) : 0;
                const uniqueAssignees = [...new Set(tasks.flatMap(t => t.assigneeIds || []))];
                const categoryColor = PROJECT_CATEGORIES[p.category || 'NORM']?.color || '#10b981';

                return (
                  <React.Fragment key={p.id}>
                    {showPlaceholder && <div className="drag-placeholder" />}
                    <div
                      className={`kcard${p.status === 'cancelled' ? ' dim' : ''}`}
                      onClick={() => openProject(p.id)}
                      draggable={canDrag}
                      onDragStart={(e) => handlers.onDragStart(e, p.id)}
                      onDragEnd={handlers.onDragEnd}
                      style={{ borderLeft: `4px solid ${categoryColor}` }}
                    >
                      <div className="kcard-title">{p.name}</div>
                      <div className="kcard-proj">
                        <span className="pdot" style={{ background: categoryColor }} />
                        {p.code}
                      </div>
                      <div className="kcard-meta" style={{ flexWrap: 'wrap', gap: '4px' }}>
                        <span className="mut sm">{PROJECT_TYPES[p.ptype || 'prod']}</span>
                        <span className="mut sm" style={{ color: categoryColor, fontWeight: 600 }}>
                          {PROJECT_CATEGORIES[p.category || 'NORM']?.label || 'NORM'}
                        </span>
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
                  </React.Fragment>
                );
              })}
              {dragItemId && dragOverCol === status && dragOverIndex === projects.length && (
                <div className="drag-placeholder" />
              )}
              {projects.length === 0 && dragOverCol === status && (
                <div className="drag-placeholder" />
              )}
            </div>
          </div>
        );
      })}
      <EmployeeTooltip {...tooltip} />
    </div>
  );
}