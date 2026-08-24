// src/components/views/ProjectsView.jsx
import React, { useState, useMemo } from 'react';
import Kanban from '../Kanban';
import Projects from '../Projects';
import { PROJECT_STATUSES, PROJECT_TYPES, PROJECT_STATUS_CONFIG, PROJECT_STATUS_ORDER, PROJECT_PRIORITIES } from '../../utils/constants';
import { TODAY } from '../../utils/date';
import { computeScope, hasRole } from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import Avatar from '../Avatar';
import { getProjectColor } from '../../utils/projectHelpers';
import ProjectProgress from '../ProjectProgress';

export default function ProjectsView({ db, ur, openProject, openHoursReq, store }) {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const [viewMode, setViewMode] = useState('kanban');
  const [showOnlyMyProjects, setShowOnlyMyProjects] = useState(false);
  const canSeeAll = hasRole(ur, 'admin', 'director', 'economist', 'kb_chief', 'head', 'project_lead', 'project_manager');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterParticipant, setFilterParticipant] = useState('all');
  const [filterDept, setFilterDept] = useState('all');

  const baseProjects = useMemo(() => {
    let list = scope.all
      ? db.projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled')
      : db.projects.filter(p => (!p.archived || p.status === 'closed' || p.status === 'cancelled') && scope.projIds.has(p.id));
    if (showOnlyMyProjects) {
      const myTasks = db.tasks.filter(t => (t.assigneeIds || []).includes(ur.id) && !t.archived);
      const myProjectIds = new Set(myTasks.map(t => t.projectId));
      list = list.filter(p => myProjectIds.has(p.id));
    }
    return list;
  }, [db, scope, showOnlyMyProjects, ur.id]);

  const participantOptions = useMemo(() => {
    const activeProjectIds = new Set(db.projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled').map(p => p.id));
    const involvedIds = new Set();
    db.tasks.forEach(t => {
      if (activeProjectIds.has(t.projectId) && !t.archived) {
        (t.assigneeIds || []).forEach(id => involvedIds.add(id));
      }
    });
    return db.employees.filter(e => involvedIds.has(e.id));
  }, [db]);

  const deptOptions = useMemo(() => {
    const deptIds = new Set();
    participantOptions.forEach(e => e.departments.forEach(d => deptIds.add(d.deptId)));
    return db.departments.filter(d => deptIds.has(d.id));
  }, [participantOptions, db.departments]);

  const filteredProjects = useMemo(() => {
    let list = baseProjects;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
      );
    }

    if (filterStatus !== 'all') {
      list = list.filter(p => p.status === filterStatus);
    }

    if (filterType !== 'all') {
      list = list.filter(p => (p.ptype || 'prod') === filterType);
    }

    if (filterPriority !== 'all') {
      list = list.filter(p => p.priority === filterPriority);
    }

    if (filterParticipant !== 'all') {
      const projectIdsWithParticipant = new Set();
      db.tasks.forEach(t => {
        if (!t.archived && (t.assigneeIds || []).includes(filterParticipant)) {
          projectIdsWithParticipant.add(t.projectId);
        }
      });
      list = list.filter(p => projectIdsWithParticipant.has(p.id));
    }

    if (filterDept !== 'all') {
      const projectIdsWithDept = new Set();
      db.tasks.forEach(t => {
        if (!t.archived) {
          const assignees = (t.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
          if (assignees.some(a => a.departments.some(d => d.deptId === filterDept))) {
            projectIdsWithDept.add(t.projectId);
          }
        }
      });
      list = list.filter(p => projectIdsWithDept.has(p.id));
    }

    return list;
  }, [baseProjects, searchQuery, filterStatus, filterType, filterPriority, filterParticipant, filterDept, db]);

  const renderProjectCard = (project) => {
    const tasks = db.tasks.filter(t => t.projectId === project.id && !t.archived);
    const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
    const fact = tasks.reduce((s, t) => s + t.logs.reduce((lsum, l) => lsum + l.hours, 0), 0);
    const uniqueAssignees = [...new Set(tasks.flatMap(t => t.assigneeIds || []))];
    const canClose = () => {
      const creatorId = project.creatorId || project.history?.find(h => h.who !== 'system')?.who;
      return hasRole(ur, 'admin') || hasRole(ur, 'director') || (creatorId && creatorId === ur.id);
    };
    const projectColor = getProjectColor(project);
    return (
      <div onClick={() => openProject(project.id)}>
        <div className="kcard-title">{project.name}</div>
        <div className="kcard-proj">
          <span className="pdot" style={{ background: projectColor }} />
          {project.code}
        </div>
        <div className="kcard-meta">
          <span className="mut sm">{PROJECT_STATUSES[project.ptype || 'prod']}</span>
          <span className="mut sm" style={{ marginLeft: 8, color: PROJECT_PRIORITIES[project.priority]?.color || '#64748b' }}>
            {project.priority || 'NORM'}
          </span>
          <ProjectProgress project={project} plan={plan} fact={fact} />
        </div>
        <div className="kcard-foot">
          <div className="pj-avatars" style={{ flex: 1 }}>
            {uniqueAssignees.slice(0,4).map(id => {
              const a = db.employees.find(e => e.id === id);
              return a ? <Avatar key={id} employee={a} size="xs" /> : null;
            })}
            {uniqueAssignees.length > 4 && <span className="mut sm">+{uniqueAssignees.length-4}</span>}
          </div>
          <div className="pj-actions" onClick={(e) => e.stopPropagation()}>
            {canClose() && project.status !== 'closed' && project.status !== 'cancelled' && (
              <button className="icon-btn danger" title="Закрыть/Отменить проект" onClick={() => {
                const action = window.confirm(`Закрыть проект "${project.name}"?`) ? 'close' : window.confirm(`Отменить проект "${project.name}"?`) ? 'cancel' : null;
                if (action === 'close') store.upsertProject({ ...project, status: 'closed', closedAt: TODAY });
                else if (action === 'cancel') store.upsertProject({ ...project, status: 'cancelled' });
              }}>
                <Ic d={ICONS.x} size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleMoveProject = (id, newStatus) => {
    const project = db.projects.find(p => p.id === id);
    if (project && project.status !== newStatus) {
      store.upsertProject({ ...project, status: newStatus });
    }
  };

  const closeProject = (p) => store.upsertProject({ ...p, status: 'closed', closedAt: TODAY });
  const cancelProject = (p) => store.upsertProject({ ...p, status: 'cancelled' });

  return (
    <>
      <div className="toolbar">
        <div className="btn-group">
          <button className={`btn ghost sm ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            <Ic d={ICONS.list} size={15} /> Список
          </button>
          <button className={`btn ghost sm ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>
            <Ic d={ICONS.kanban} size={15} /> Канбан
          </button>
        </div>

        <input
          className="inp sm filter-search"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        <select className="inp sel sm filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Статус</option>
          {Object.entries(PROJECT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select className="inp sel sm filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Тип</option>
          {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select className="inp sel sm filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">Приоритет</option>
          {Object.entries(PROJECT_PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select className="inp sel sm filter-select" value={filterParticipant} onChange={e => setFilterParticipant(e.target.value)}>
          <option value="all">Участник</option>
          {participantOptions.map(emp => <option key={emp.id} value={emp.id}>{emp.last} {emp.first}</option>)}
        </select>

        {/* Нативный селект для отдела с классом filter-select-dept */}
        <select className="inp sel sm filter-select filter-select-dept" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">Отдел</option>
          {deptOptions.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
        </select>

        {canSeeAll && (
          <label className="dept-pick" style={{ marginLeft: 'auto' }}>
            <input type="checkbox" checked={showOnlyMyProjects} onChange={e => setShowOnlyMyProjects(e.target.checked)} />
            <span>Проекты с моими задачами</span>
          </label>
        )}

        {hasRole(ur, 'admin', 'director', 'kb_chief', 'project_manager') && (
          <button className="btn primary" onClick={() => openProject(null)}>
            <Ic d={ICONS.plus} size={15} /> Проект
          </button>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <Kanban
          items={filteredProjects}
          statusOrder={PROJECT_STATUS_ORDER}
          statusMap={PROJECT_STATUS_CONFIG}
          renderCard={renderProjectCard}
          onDrop={handleMoveProject}
          columns={4}
        />
      ) : (
        <Projects
          db={db}
          ur={ur}
          openProject={openProject}
          openHoursReq={openHoursReq}
          closeProject={closeProject}
          cancelProject={cancelProject}
          projects={filteredProjects}
        />
      )}
    </>
  );
}