// src/components/views/TasksView.jsx
import { useState, useMemo, useCallback, memo } from 'react';
import { useToast } from '../../context/ToastContext';
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
import { Ic, ICONS } from '../Icons';
import TasksList from './TasksList';
import { useFilters } from '../../hooks/useFilters';
import { useSort } from '../../hooks/useSort';
import { useTasksDb } from '../../hooks/useDb';
import { useDataHelpers } from '../../hooks/useDataHelpers';
import { useUnreadCommentIndex } from '../../hooks/useChatStats';
import {
  TASK_STATUSES,
  TASK_STATUS_ORDER,
  PRIORITIES,
} from '../../utils/constants';
import {
  computeScope,
  taskVisible,
  canSeeAllContent,
  canCreateTask,
} from '../../utils/permissions';
import { isTaskActive } from '../../utils/entityState';
import { chatKey } from '../../utils/chatKey';
import { buildTaskMenu } from '../menus/taskMenu';
import { changeTaskStatus, deleteTask } from '../../utils/taskActions';
import { taskSortValue, makeComparator } from '../../utils/sorting';
import { optionsFromMap, optionsFromList } from '../../utils/selectOptions';
import { getProjectColor } from '../../utils/projectHelpers';
import { TODAY, fmtDMY, daysDiff } from '../../utils/date';

const INITIAL_FILTERS = Object.freeze({
  projectId: 'all',
  assigneeId: 'all',
  priority: 'all',
  deptId: 'all',
  query: '',
  showOnlyMy: false,
  sortField: 'priority',
  sortDir: 'desc',
});

const SORT_OPTIONS = [
  { value: 'priority', label: 'По приоритету' },
  { value: 'deadline', label: 'По сроку' },
  { value: 'title', label: 'По названию' },
  { value: 'assignee', label: 'По исполнителю' },
  { value: 'project', label: 'По проекту' },
  { value: 'planned', label: 'По плановым часам' },
  { value: 'fact', label: 'По фактическим часам' },
];

const NUMERIC_SORTS = new Set(['planned', 'fact']);
const PRIORITY_SELECT_OPTIONS = optionsFromMap(PRIORITIES, 'Приоритет');

const TaskCard = memo(function TaskCard({
  task, project, assignee, spent, unread, db, user,
  openTask, onMove, onDelete, onCopy, onMakeTemplate,
}) {
  const overdue = task.deadline
    && !['closed', 'cancelled'].includes(task.status)
    && task.deadline < TODAY;
  const soon = task.deadline
    && !overdue
    && !['closed', 'cancelled'].includes(task.status)
    && daysDiff(TODAY, task.deadline) <= 3;

  const priorityDef = PRIORITIES[task.priority] || {
    label: task.priority || 'Нет',
    color: '#64748b',
  };

  const menuItems = buildTaskMenu({
    task, user, db, openTask, onMove, onDelete, onCopy, onMakeTemplate,
  });

  const handleOpen = () => openTask(task.id);

  return (
    <FloatingMenu
      items={menuItems}
      children={({ anchorProps }) => (
        <div {...anchorProps} onClick={handleOpen}>
          <div className="kcard-prio" style={{ background: priorityDef.color }} />
          <div className="kcard-title">{task.title}</div>
          <div className="kcard-proj">
            <span className="pdot" style={{ background: getProjectColor(project) }} />
            {project?.code}
          </div>
          <div className="kcard-meta">
            {assignee && (
              <span className="kassignee">
                <Avatar employee={assignee} size="xs" />
              </span>
            )}
            <span className="khours">
              <Ic d={ICONS.clock} size={13} /> {spent}/{task.plannedHours ?? '-'} ч
            </span>
            <span className="prio-chip" style={{ color: priorityDef.color }}>
              {priorityDef.label}
            </span>
          </div>
          <div className="kcard-foot">
            <span className={`kdl${overdue ? ' late' : soon ? ' soon' : ''}`}>
              {task.deadline
                ? overdue
                  ? `просрочено ${-daysDiff(TODAY, task.deadline)} дн`
                  : `до ${fmtDMY(task.deadline)}`
                : 'без дедлайна'}
            </span>
          </div>
          <UnreadBadge
            count={unread}
            onClick={() => openTask(task.id, 'chat')}
          />
        </div>
      )}
    />
  );
});

function TasksView({ ur, openTask, store, openCopyTask, openTemplateFromTask }) {
  const db = useTasksDb();
  const { tasks, projects, employees, departments } = db;

  const employeesById = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees]
  );
  const projectsById = useMemo(
    () => new Map(projects.map(p => [p.id, p])),
    [projects]
  );

  const { showToast } = useToast();
  const { getTaskSpent } = useDataHelpers(db);

  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const canSeeAll = canSeeAllContent(ur);
  const unreadIndex = useUnreadCommentIndex(ur.id);

  const [viewMode, setViewMode] = useState('kanban');

  const { filters, setFilter } = useFilters(INITIAL_FILTERS);
  const { projectId, assigneeId, priority, deptId, query, showOnlyMy } = filters;

  const {
    field: sortField,
    dir: sortDir,
    handleFieldChange: handleSortFieldChange,
    handleDirToggle: handleSortDirToggle,
  } = useSort({ filters, setFilter, numericFields: NUMERIC_SORTS });

  const baseTasks = useMemo(
    () => tasks.filter(t => isTaskActive(t) && taskVisible(ur, scope, t, db)),
    [tasks, ur, scope, db]
  );

  const filteredTasks = useMemo(() => {
    let list = baseTasks;
    if (projectId !== 'all') list = list.filter(t => t.projectId === projectId);
    if (assigneeId !== 'all') list = list.filter(t => t.assigneeId === assigneeId);
    if (priority !== 'all') list = list.filter(t => t.priority === priority);
    if (deptId !== 'all') {
      list = list.filter(t => {
        const assignee = t.assigneeId ? employeesById.get(t.assigneeId) : null;
        return assignee && assignee.departments.some(d => d.deptId === deptId);
      });
    }
    if (query.trim()) {
      const s = query.trim().toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(s)
        || (projectsById.get(t.projectId)?.name || '').toLowerCase().includes(s)
      );
    }
    if (showOnlyMy) list = list.filter(t => t.assigneeId === ur.id);
    return list;
  }, [baseTasks, employeesById, projectsById, ur, projectId, assigneeId, priority, deptId, query, showOnlyMy]);

  const sortedTasks = useMemo(() => {
    const valueOf = t => taskSortValue(t, sortField, { projectsById, employeesById, getTaskSpent });
    return [...filteredTasks].sort(makeComparator(valueOf, sortDir));
  }, [filteredTasks, sortField, sortDir, projectsById, employeesById, getTaskSpent]);

  const projOptions = useMemo(() => {
    const ids = new Set(baseTasks.map(t => t.projectId).filter(Boolean));
    return projects.filter(p => ids.has(p.id) && !p.archived);
  }, [baseTasks, projects]);

  const execOptions = useMemo(() => {
    const ids = new Set(baseTasks.map(t => t.assigneeId).filter(Boolean));
    return employees.filter(e => ids.has(e.id));
  }, [baseTasks, employees]);

  const isOnlyExecutor = ur.roles.length === 1 && ur.roles[0] === 'executor';

  const handleMoveTask = useCallback((taskId, newStatus) => {
    if (changeTaskStatus({
      task: tasks.find(t => t.id === taskId),
      newStatus, user: ur, db, store,
    }) === false) {
      showToast('У вас нет прав на изменение статуса этой задачи.', 'error');
    }
  }, [tasks, ur, db, store, showToast]);

  const handleDeleteTask = useCallback((task) => {
    deleteTask({ task, store });
    showToast(`Задача «${task.title}» удалена`, 'success');
  }, [store, showToast]);

  const renderTaskCard = useCallback((task) => {
    const project = projectsById.get(task.projectId);
    const assignee = task.assigneeId ? employeesById.get(task.assigneeId) : null;
    const spent = getTaskSpent(task);
    const unread = unreadIndex.get(chatKey({ taskId: task.id })) || 0;
    return (
      <TaskCard
        task={task}
        project={project}
        assignee={assignee}
        spent={spent}
        unread={unread}
        db={db}
        user={ur}
        openTask={openTask}
        onMove={handleMoveTask}
        onDelete={handleDeleteTask}
        onCopy={openCopyTask}
        onMakeTemplate={openTemplateFromTask}
      />
    );
  }, [projectsById, employeesById, getTaskSpent, unreadIndex, db, ur, openTask, handleMoveTask, handleDeleteTask, openCopyTask, openTemplateFromTask]);

  const canCreate = canCreateTask(ur);

  const projectSelectOptions = useMemo(
    () => optionsFromList(projOptions, 'Проект', p => ({ value: p.id, label: p.code })),
    [projOptions]
  );
  const assigneeSelectOptions = useMemo(
    () => optionsFromList(execOptions, 'Исполнитель', e => ({ value: e.id, label: e.last })),
    [execOptions]
  );
  const deptSelectOptions = useMemo(
    () => optionsFromList(departments, 'Отдел', d => ({ value: d.id, label: d.name })),
    [departments]
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
          value={projectId}
          onChange={v => setFilter('projectId', v)}
          options={projectSelectOptions}
        />
        {!isOnlyExecutor && (
          <Select
            className="filter-select"
            value={assigneeId}
            onChange={v => setFilter('assigneeId', v)}
            options={assigneeSelectOptions}
          />
        )}
        <Select
          className="filter-select"
          value={priority}
          onChange={v => setFilter('priority', v)}
          options={PRIORITY_SELECT_OPTIONS}
        />
        {!isOnlyExecutor && (
          <Select
            className="filter-select filter-select-dept"
            value={deptId}
            onChange={v => setFilter('deptId', v)}
            options={deptSelectOptions}
          />
        )}
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
          items={sortedTasks}
          statusOrder={TASK_STATUS_ORDER}
          statusMap={TASK_STATUSES}
          renderCard={renderTaskCard}
          onDrop={handleMoveTask}
        />
      ) : (
        <TasksList
          tasks={sortedTasks}
          db={db}
          user={ur}
          unreadIndex={unreadIndex}
          openTask={openTask}
          onMove={handleMoveTask}
          onDelete={handleDeleteTask}
          onCopy={openCopyTask}
          onMakeTemplate={openTemplateFromTask}
        />
      )}

      <ViewFooter
        action={canCreate && (
          <button
            className="btn primary"
            onClick={() => openTask(null)}
          >
            <Ic d={ICONS.plus} size={15} /> Создать
          </button>
        )}
      >
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        {canSeeAll && (
          <ToggleSwitch
            checked={showOnlyMy}
            onChange={v => setFilter('showOnlyMy', v)}
            label="Мои задачи"
          />
        )}
      </ViewFooter>
    </>
  );
}

export default memo(TasksView);