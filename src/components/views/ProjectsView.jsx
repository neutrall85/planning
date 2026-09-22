// src/components/views/ProjectsView.jsx
import { useState, useMemo, useCallback, memo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Kanban from '../Kanban';
import { Select } from '../Select';
import { SearchBox } from '../SearchBox';
import { SortControl } from '../SortControl';
import { ToggleSwitch } from '../ToggleSwitch';
import { ViewFooter } from '../ViewFooter';
import { ViewModeToggle } from '../ViewModeToggle';
import Avatar from '../Avatar';
import { UnreadBadge } from '../UnreadBadge';
import FloatingMenu from '../FloatingMenu';
import ProjectProgress from '../ProjectProgress';
import { Ic, ICONS } from '../Icons';
import Projects from '../Projects';
import { useFilters } from '../../hooks/useFilters';
import { useSort } from '../../hooks/useSort';
import { useTasksDb } from '../../hooks/useDb';
import { useUnreadCommentIndex } from '../../hooks/useChatStats';
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_CONFIG,
  PROJECT_STATUS_ORDER,
  PROJECT_TYPES,
  PROJECT_PRIORITIES,
  DIALOGS,
  TOASTS,
} from '../../utils/constants';
import {
  computeScope,
  canSeeAllContent,
  canChangeProjectStatus,
  canCreateProject,
} from '../../utils/permissions';
import { chatKey } from '../../utils/chatKey';
import { buildProjectMenu } from '../menus/projectMenu';
import { projectSortValue, makeComparator } from '../../utils/sorting';
import { optionsFromMap, optionsFromList } from '../../utils/selectOptions';
import { getProjectColor } from '../../utils/projectHelpers';
import { TODAY } from '../../utils/date';

const INITIAL_FILTERS = Object.freeze({
  query: '',
  status: 'all',
  type: 'all',
  priority: 'all',
  participant: 'all',
  deptId: 'all',
  showOnlyMy: false,
  sortField: 'priority',
  sortDir: 'desc',
});

const SORT_OPTIONS = [
  { value: 'priority', label: 'По приоритету' },
  { value: 'start', label: 'По дате начала' },
  { value: 'end', label: 'По дате окончания' },
  { value: 'name', label: 'По названию' },
  { value: 'code', label: 'По коду' },
  { value: 'status', label: 'По статусу' },
  { value: 'budget', label: 'По плану' },
  { value: 'manager', label: 'По ответственному' },
];

const NUMERIC_SORTS = new Set(['budget']);

const STATUS_SELECT_OPTIONS = optionsFromMap(PROJECT_STATUSES, 'Статус');
const TYPE_SELECT_OPTIONS = optionsFromMap(PROJECT_TYPES, 'Тип');
const PRIORITY_SELECT_OPTIONS = optionsFromMap(PROJECT_PRIORITIES, 'Приоритет');

const ProjectCard = memo(function ProjectCard({
  project, plan, fact, assigneeIds, unread, employeesById,
  db, user, openProject, onMove, onCopy, onMakeTemplate, onOpenAccess,
}) {
  const projectColor = getProjectColor(project);

  const menuItems = buildProjectMenu({
    project, user, openProject, onMove, onCopy, onMakeTemplate, onOpenAccess,
  });

  const handleOpen = () => openProject(project.id);

  return (
    <FloatingMenu
      items={menuItems}
      children={({ anchorProps }) => (
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
              {assigneeIds.map(id => {
                const a = employeesById.get(id);
                return a ? <Avatar key={id} employee={a} size="xs" /> : null;
              })}
            </div>
          </div>
          <UnreadBadge count={unread} />
        </div>
      )}
    />
  );
});

function ProjectsView({
  ur,
  openProject,
  store,
  openCopyProject,
  openTemplateFromProject,
  openProjectAccess,
}) {
  const db = useTasksDb();
  const { projects, tasks, employees, departments } = db;

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const [viewMode, setViewMode] = useState('kanban');

  const canSeeAll = canSeeAllContent(ur);
  const canCreate = canCreateProject(ur);
  const unreadIndex = useUnreadCommentIndex(ur.id);

  const { filters, setFilter } = useFilters(INITIAL_FILTERS);
  const { query, status, type, priority, participant, deptId, showOnlyMy } = filters;

  const {
    field: sortField,
    dir: sortDir,
    handleFieldChange: handleSortFieldChange,
    handleDirToggle: handleSortDirToggle,
  } = useSort({ filters, setFilter, numericFields: NUMERIC_SORTS });

  const employeesById = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees]
  );

  const baseProjects = useMemo(() => {
    let list = scope.all
      ? projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled')
      : projects.filter(p =>
          (!p.archived || p.status === 'closed' || p.status === 'cancelled')
          && scope.projIds.has(p.id)
        );
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
        p.name.toLowerCase().includes(q)
        || (p.code && p.code.toLowerCase().includes(q))
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

  const sortedProjects = useMemo(() => {
    const valueOf = p => projectSortValue(p, sortField, { employeesById });
    return [...filteredProjects].sort(makeComparator(valueOf, sortDir));
  }, [filteredProjects, sortField, sortDir, employeesById]);

  const projectStatsById = useMemo(() => {
    const map = new Map();
    const byProject = new Map();
    tasks.forEach(t => {
      if (t.archived) return;
      let list = byProject.get(t.projectId);
      if (!list) {
        list = [];
        byProject.set(t.projectId, list);
      }
      list.push(t);
    });
    byProject.forEach((list, projectId) => {
      let plan = 0;
      let fact = 0;
      const assigneeIds = [];
      const seen = new Set();
      list.forEach(t => {
        plan += t.plannedHours || 0;
        if (Array.isArray(t.logs)) for (const l of t.logs) fact += l.hours || 0;
        if (t.assigneeId && !seen.has(t.assigneeId)) {
          seen.add(t.assigneeId);
          assigneeIds.push(t.assigneeId);
        }
      });
      map.set(projectId, { plan, fact, assigneeIds });
    });
    return map;
  }, [tasks]);

  const handleMoveProject = useCallback(async (id, newStatus) => {
    const project = projects.find(p => p.id === id);
    if (!project || project.status === newStatus) return;
    if (!canChangeProjectStatus(ur, project, newStatus)) {
      showToast('У вас нет прав на изменение статуса этого проекта.', 'error');
      return;
    }
    if (newStatus === 'closed' || newStatus === 'cancelled') {
      const dialog = newStatus === 'closed'
        ? DIALOGS.closeProject(project.name)
        : DIALOGS.cancelProject(project.name);
      const ok = await confirm(dialog);
      if (!ok) return;
    }
    const patch = { ...project, status: newStatus };
    if (newStatus === 'closed') patch.closedAt = TODAY;
    store.upsertProject(patch);
    if (newStatus === 'closed') showToast(TOASTS.projectClosed, 'success');
    else if (newStatus === 'cancelled') showToast(TOASTS.projectCancelled, 'success');
  }, [projects, ur, store, showToast, confirm]);

  const renderProjectCard = useCallback((project) => {
    const stats = projectStatsById.get(project.id) || { plan: 0, fact: 0, assigneeIds: [] };
    const unread = unreadIndex.get(chatKey({ projectId: project.id })) || 0;
    return (
      <ProjectCard
        project={project}
        plan={stats.plan}
        fact={stats.fact}
        assigneeIds={stats.assigneeIds}
        unread={unread}
        employeesById={employeesById}
        db={db}
        user={ur}
        openProject={openProject}
        onMove={handleMoveProject}
        onCopy={openCopyProject}
        onMakeTemplate={openTemplateFromProject}
        onOpenAccess={openProjectAccess}
      />
    );
  }, [projectStatsById, unreadIndex, employeesById, db, ur, openProject, handleMoveProject, openCopyProject, openTemplateFromProject, openProjectAccess]);

  const participantSelectOptions = useMemo(
    () => optionsFromList(participantOptions, 'Участник', emp => ({
      value: emp.id,
      label: `${emp.last} ${emp.first}`,
    })),
    [participantOptions]
  );
  const deptSelectOptions = useMemo(
    () => optionsFromList(deptOptions, 'Отдел', d => ({
      value: d.id,
      label: d.name,
    })),
    [deptOptions]
  );

  return (
    <>
      <div className="toolbar toolbar-wrap">
        <SearchBox
          value={query}
          onChange={v => setFilter('query', v)}
          placeholder="Поиск..."
          className="filter-search"
        />
        <Select
          className="filter-select"
          value={status}
          onChange={v => setFilter('status', v)}
          options={STATUS_SELECT_OPTIONS}
        />
        <Select
          className="filter-select"
          value={type}
          onChange={v => setFilter('type', v)}
          options={TYPE_SELECT_OPTIONS}
        />
        <Select
          className="filter-select"
          value={priority}
          onChange={v => setFilter('priority', v)}
          options={PRIORITY_SELECT_OPTIONS}
        />
        <Select
          className="filter-select"
          value={participant}
          onChange={v => setFilter('participant', v)}
          options={participantSelectOptions}
        />
        <Select
          className="filter-select filter-select-dept"
          value={deptId}
          onChange={v => setFilter('deptId', v)}
          options={deptSelectOptions}
        />
        <SortControl
          options={SORT_OPTIONS}
          field={sortField}
          dir={sortDir}
          onFieldChange={handleSortFieldChange}
          onToggleDir={handleSortDirToggle}
        />
      </div>

      {viewMode === 'kanban' ? (
        <Kanban
          items={sortedProjects}
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
          projects={sortedProjects}
          unreadIndex={unreadIndex}
          onMoveProject={handleMoveProject}
          openCopyProject={openCopyProject}
          openTemplateFromProject={openTemplateFromProject}
          openProjectAccess={openProjectAccess}
        />
      )}

      <ViewFooter
        action={canCreate && (
          <button
            className="btn primary"
            onClick={() => openProject(null)}
          >
            <Ic d={ICONS.plus} size={15} /> Проект
          </button>
        )}
      >
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        {canSeeAll && (
          <ToggleSwitch
            checked={showOnlyMy}
            onChange={v => setFilter('showOnlyMy', v)}
            label="Проекты с моими задачами"
          />
        )}
      </ViewFooter>
    </>
  );
}

export default memo(ProjectsView);