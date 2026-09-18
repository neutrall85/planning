// src/components/views/ProjectsView.jsx
import { useState, useMemo, useCallback, memo } from 'react';
import Kanban from '../Kanban';
import Projects from '../Projects';
import FloatingMenu from '../FloatingMenu';
import { SearchBox } from '../SearchBox';
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_STATUS_CONFIG,
  PROJECT_STATUS_ORDER,
  PROJECT_PRIORITIES,
  DIALOGS,
  TOASTS,
} from '../../utils/constants';
import { TODAY } from '../../utils/date';
import { computeScope, hasRole, canChangeProjectStatus } from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import Avatar from '../Avatar';
import { getProjectColor } from '../../utils/projectHelpers';
import ProjectProgress from '../ProjectProgress';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useFilters } from '../../hooks/useFilters';
import { useTasksDb } from '../../hooks/useDb';
import { buildProjectMenu } from '../menus';

const INITIAL_FILTERS = Object.freeze({
  query: '',
  status: 'all',
  type: 'all',
  priority: 'all',
  participant: 'all',
  deptId: 'all',
  showOnlyMy: false,
});

/**
 * Карточка проекта на канбан-доске.
 *
 * memo-компонент: агрегаты (plan, fact, assigneeIds) приходят готовыми
 * из projectStatsById; раскладка карточки не пересчитывает ничего сама.
 * memo сравнивает plan/fact по значению (числа), assigneeIds - по
 * ссылке из стабильной карты, поэтому на hover колонки карточки не
 * перерисовываются.
 */
const ProjectCard = memo(function ProjectCard({
  project,
  plan,
  fact,
  assigneeIds,
  employeesById,
  db,
  user,
  openProject,
  onClose,
  onCancel,
  onCopy,
  onMakeTemplate,
}) {
  const projectColor = getProjectColor(project);

  const menuItems = buildProjectMenu({
    project, user, openProject,
    onClose, onCancel, onCopy, onMakeTemplate,
  });

  const handleOpen = () => openProject(project.id);

  return (
    <FloatingMenu items={menuItems}>
      {({ anchorProps }) => (
        <div {...anchorProps} onClick={handleOpen}>
          <div className="kcard-title">{project.name}</div>
          <div className="kcard-proj">
            <span className="pdot" style={{ background: projectColor }} />
            {project.code}
          </div>
          <div className="kcard-meta">
            <span
              className="mut sm ml-8"
              style={{ color: PROJECT_PRIORITIES[project.priority]?.color || '#64748b' }}
            >
              {project.priority || 'NORM'}
            </span>
            <ProjectProgress project={project} plan={plan} fact={fact} />
          </div>
          <div className="kcard-foot">
            <div className="pj-avatars flex-1">
              {assigneeIds.slice(0, 4).map(id => {
                const a = employeesById.get(id);
                return a ? <Avatar key={id} employee={a} size="xs" /> : null;
              })}
              {assigneeIds.length > 4 && (
                <span className="mut sm">+{assigneeIds.length - 4}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </FloatingMenu>
  );
});

function ProjectsView({
  ur, openProject, store,
  openCopyProject, openTemplateFromProject,
}) {
  const db = useTasksDb();
  const { projects, tasks, employees, departments } = db;

  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const [viewMode, setViewMode] = useState('kanban');
  const canSeeAll = hasRole(ur, 'admin', 'director', 'economist', 'kb_chief', 'head', 'project_lead', 'project_manager');

  const { filters, setFilter } = useFilters(INITIAL_FILTERS);
  const { query, status, type, priority, participant, deptId, showOnlyMy } = filters;

  const employeesById = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees],
  );

  const baseProjects = useMemo(() => {
    let list = scope.all
      ? projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled')
      : projects.filter(p =>
          (!p.archived || p.status === 'closed' || p.status === 'cancelled') &&
          scope.projIds.has(p.id));
    if (showOnlyMy) {
      const myTasks = tasks.filter(t => t.assigneeId === ur.id && !t.archived);
      const myProjectIds = new Set(myTasks.map(t => t.projectId));
      list = list.filter(p => myProjectIds.has(p.id));
    }
    return list;
  }, [projects, tasks, scope, showOnlyMy, ur.id]);

  const participantOptions = useMemo(() => {
    const activeProjectIds = new Set(
      projects
        .filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled')
        .map(p => p.id)
    );
    const involvedIds = new Set();
    tasks.forEach(t => {
      if (activeProjectIds.has(t.projectId) && !t.archived && t.assigneeId) {
        involvedIds.add(t.assigneeId);
      }
    });
    return employees.filter(e => involvedIds.has(e.id));
  }, [projects, tasks, employees]);

  const deptOptions = useMemo(() => {
    const deptIds = new Set();
    participantOptions.forEach(e => e.departments.forEach(d => deptIds.add(d.deptId)));
    return departments.filter(d => deptIds.has(d.id));
  }, [participantOptions, departments]);

  const filteredProjects = useMemo(() => {
    let list = baseProjects;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
      );
    }

    if (status !== 'all') list = list.filter(p => p.status === status);
    if (type !== 'all') list = list.filter(p => (p.ptype || 'prod') === type);
    if (priority !== 'all') list = list.filter(p => p.priority === priority);

    if (participant !== 'all') {
      const projectIdsWithParticipant = new Set();
      tasks.forEach(t => {
        if (!t.archived && t.assigneeId === participant) {
          projectIdsWithParticipant.add(t.projectId);
        }
      });
      list = list.filter(p => projectIdsWithParticipant.has(p.id));
    }

    if (deptId !== 'all') {
      const projectIdsWithDept = new Set();
      tasks.forEach(t => {
        if (!t.archived && t.assigneeId) {
          const assignee = employeesById.get(t.assigneeId);
          if (assignee && assignee.departments.some(d => d.deptId === deptId)) {
            projectIdsWithDept.add(t.projectId);
          }
        }
      });
      list = list.filter(p => projectIdsWithDept.has(p.id));
    }

    return list;
  }, [baseProjects, query, status, type, priority, participant, deptId, tasks, employeesById]);

  // Агрегаты по проектам считаются один раз на срез tasks. Раньше это
  // делалось в renderProjectCard, то есть N раз за рендер, и каждый раз
  // пробегало по всем задачам. Сейчас один проход по задачам, результат
  // в Map; карточка получает уже готовые числа и стабильную по ссылке
  // копию assigneeIds.
  const projectStatsById = useMemo(() => {
    const map = new Map();
    const byProject = new Map();
    tasks.forEach(t => {
      if (t.archived) return;
      let list = byProject.get(t.projectId);
      if (!list) { list = []; byProject.set(t.projectId, list); }
      list.push(t);
    });
    byProject.forEach((list, projectId) => {
      let plan = 0;
      let fact = 0;
      const assigneeIds = [];
      const seen = new Set();
      list.forEach(t => {
        plan += t.plannedHours || 0;
        if (Array.isArray(t.logs)) {
          for (const l of t.logs) fact += l.hours || 0;
        }
        if (t.assigneeId && !seen.has(t.assigneeId)) {
          seen.add(t.assigneeId);
          assigneeIds.push(t.assigneeId);
        }
      });
      map.set(projectId, { plan, fact, assigneeIds });
    });
    return map;
  }, [tasks]);

  const handleMoveProject = useCallback((id, newStatus) => {
    const project = projects.find(p => p.id === id);
    if (!project || project.status === newStatus) return;
    if (!canChangeProjectStatus(ur, project, newStatus)) {
      showToast('У вас нет прав на изменение статуса этого проекта.', 'error');
      return;
    }
    store.upsertProject({ ...project, status: newStatus });
  }, [projects, ur, store, showToast]);

  const handleCloseProject = useCallback(async (project) => {
    const ok = await confirm(DIALOGS.closeProject(project.name));
    if (!ok) return;
    store.upsertProject({ ...project, status: 'closed', closedAt: TODAY });
    showToast(TOASTS.projectClosed, 'success');
  }, [confirm, store, showToast]);

  const handleCancelProject = useCallback(async (project) => {
    const ok = await confirm(DIALOGS.cancelProject(project.name));
    if (!ok) return;
    store.upsertProject({ ...project, status: 'cancelled' });
    showToast(TOASTS.projectCancelled, 'success');
  }, [confirm, store, showToast]);

  const renderProjectCard = useCallback((project) => {
    const stats = projectStatsById.get(project.id) || { plan: 0, fact: 0, assigneeIds: [] };
    return (
      <ProjectCard
        project={project}
        plan={stats.plan}
        fact={stats.fact}
        assigneeIds={stats.assigneeIds}
        employeesById={employeesById}
        db={db}
        user={ur}
        openProject={openProject}
        onClose={handleCloseProject}
        onCancel={handleCancelProject}
        onCopy={openCopyProject}
        onMakeTemplate={openTemplateFromProject}
      />
    );
  }, [
    projectStatsById, employeesById, db, ur,
    openProject, handleCloseProject, handleCancelProject,
    openCopyProject, openTemplateFromProject,
  ]);

  const canCreateProject = hasRole(ur, 'admin', 'director', 'kb_chief', 'project_manager');

  return (
    <>
      <div className="toolbar">
        <div className="btn-group">
          <button
            className={`btn ghost sm ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <Ic d={ICONS.list} size={15} /> Список
          </button>
          <button
            className={`btn ghost sm ${viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => setViewMode('kanban')}
          >
            <Ic d={ICONS.kanban} size={15} /> Канбан
          </button>
        </div>

        <SearchBox
          value={query}
          onChange={v => setFilter('query', v)}
          placeholder="Поиск..."
          className="filter-search"
        />

        <select className="inp sel sm filter-select" value={status} onChange={e => setFilter('status', e.target.value)}>
          <option value="all">Статус</option>
          {Object.entries(PROJECT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select className="inp sel sm filter-select" value={type} onChange={e => setFilter('type', e.target.value)}>
          <option value="all">Тип</option>
          {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select className="inp sel sm filter-select" value={priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="all">Приоритет</option>
          {Object.entries(PROJECT_PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select className="inp sel sm filter-select" value={participant} onChange={e => setFilter('participant', e.target.value)}>
          <option value="all">Участник</option>
          {participantOptions.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.last} {emp.first}</option>
          ))}
        </select>

        <select className="inp sel sm filter-select filter-select-dept" value={deptId} onChange={e => setFilter('deptId', e.target.value)}>
          <option value="all">Отдел</option>
          {deptOptions.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
        </select>

        {canSeeAll && (
          <label className="dept-pick ml-auto">
            <input
              type="checkbox"
              checked={showOnlyMy}
              onChange={e => setFilter('showOnlyMy', e.target.checked)}
            />
            <span>Проекты с моими задачами</span>
          </label>
        )}

        {canCreateProject && (
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
          projects={filteredProjects}
          onCloseProject={handleCloseProject}
          onCancelProject={handleCancelProject}
          openCopyProject={openCopyProject}
          openTemplateFromProject={openTemplateFromProject}
        />
      )}
    </>
  );
}

export default memo(ProjectsView);