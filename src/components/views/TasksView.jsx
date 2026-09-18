// src/components/views/TasksView.jsx
import { useMemo, useState, useCallback, memo } from 'react';
import Kanban from '../Kanban';
import TasksList from './TasksList';
import FloatingMenu from '../FloatingMenu';
import { SearchBox } from '../SearchBox';
import { Select } from '../Select';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES } from '../../utils/constants';
import { fmtDMY, daysDiff, TODAY } from '../../utils/date';
import { isTaskActive } from '../../utils/entityState';
import { taskVisible, computeScope, hasRole, canCreateTask } from '../../utils/permissions';
import { changeTaskStatus, deleteTask } from '../../utils/taskActions';
import { useToast } from '../../context/ToastContext';
import { ICONS, Ic } from '../Icons';
import { useDataHelpers } from '../../hooks/useDataHelpers';
import { useFilters } from '../../hooks/useFilters';
import { useTasksDb } from '../../hooks/useDb';
import Avatar from '../Avatar';
import { getProjectColor } from '../../utils/projectHelpers';
import { buildTaskMenu } from '../menus';
import { optionsFromMap, optionsFromList } from '../../utils/selectOptions';

const INITIAL_FILTERS = Object.freeze({
  projectId: 'all',
  assigneeId: 'all',
  priority: 'all',
  deptId: 'all',
  query: '',
  showOnlyMy: false,
});

// Источник константный - useMemo не нужен, массив строится один раз
// при импорте модуля.
const PRIORITY_SELECT_OPTIONS = optionsFromMap(PRIORITIES, 'Приоритет');

const TaskCard = memo(function TaskCard({
  task,
  project,
  assignee,
  spent,
  db,
  user,
  openTask,
  onMove,
  onDelete,
  onCopy,
  onMakeTemplate,
}) {
  const overdue = task.deadline && !['closed', 'cancelled'].includes(task.status) && task.deadline < TODAY;
  const soon = task.deadline && !overdue && !['closed', 'cancelled'].includes(task.status) && daysDiff(TODAY, task.deadline) <= 3;
  const priorityDef = PRIORITIES[task.priority] || { label: task.priority || 'Нет', color: '#64748b' };

  const menuItems = buildTaskMenu({
    task, user, db, openTask,
    onMove, onDelete, onCopy, onMakeTemplate,
  });

  const handleOpen = () => openTask(task.id);

  return (
    <FloatingMenu items={menuItems}>
      {({ anchorProps }) => (
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
            <span className={'kdl' + (overdue ? ' late' : soon ? ' soon' : '')}>
              {task.deadline
                ? (overdue
                  ? `просрочено ${-daysDiff(TODAY, task.deadline)} дн`
                  : `до ${fmtDMY(task.deadline)}`)
                : 'без дедлайна'}
            </span>
          </div>
        </div>
      )}
    </FloatingMenu>
  );
});

function TasksView({
  ur, openTask, store,
  openCopyTask, openTemplateFromTask,
}) {
  const db = useTasksDb();
  const { tasks, projects, employees, departments } = db;

  const employeesById = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees],
  );
  const projectsById = useMemo(
    () => new Map(projects.map(p => [p.id, p])),
    [projects],
  );

  const { showToast } = useToast();
  const { getTaskSpent } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const canSeeAll = hasRole(ur, 'admin', 'director', 'economist', 'kb_chief', 'head', 'project_lead', 'project_manager');

  const [viewMode, setViewMode] = useState('kanban');
  const { filters, setFilter } = useFilters(INITIAL_FILTERS);
  const { projectId, assigneeId, priority, deptId, query, showOnlyMy } = filters;

  const baseTasks = useMemo(
    () => tasks.filter(t => isTaskActive(t) && taskVisible(ur, scope, t, db)),
    [tasks, ur, scope, db],
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
        t.title.toLowerCase().includes(s) ||
        (projectsById.get(t.projectId)?.name || '').toLowerCase().includes(s)
      );
    }
    if (showOnlyMy) list = list.filter(t => t.assigneeId === ur.id);
    return list;
  }, [baseTasks, employeesById, projectsById, ur, projectId, assigneeId, priority, deptId, query, showOnlyMy]);

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
    const task = tasks.find(t => t.id === taskId);
    const ok = changeTaskStatus({ task, newStatus, user: ur, db, store });
    if (ok === false) {
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
    return (
      <TaskCard
        task={task}
        project={project}
        assignee={assignee}
        spent={spent}
        db={db}
        user={ur}
        openTask={openTask}
        onMove={handleMoveTask}
        onDelete={handleDeleteTask}
        onCopy={openCopyTask}
        onMakeTemplate={openTemplateFromTask}
      />
    );
  }, [
    projectsById, employeesById, getTaskSpent, db, ur,
    openTask, handleMoveTask, handleDeleteTask,
    openCopyTask, openTemplateFromTask,
  ]);

  const canCreate = canCreateTask(ur);

  // Динамические опции - через optionsFromList. useMemo здесь нужен:
  // источник меняется вместе с фильтрами (набор проектов и исполнителей
  // зависит от baseTasks).
  const projectSelectOptions = useMemo(
    () => optionsFromList(projOptions, 'Проект', p => ({ value: p.id, label: p.code })),
    [projOptions],
  );

  const assigneeSelectOptions = useMemo(
    () => optionsFromList(execOptions, 'Исполнитель', e => ({ value: e.id, label: e.last })),
    [execOptions],
  );

  const deptSelectOptions = useMemo(
    () => optionsFromList(departments, 'Отдел', d => ({ value: d.id, label: d.name })),
    [departments],
  );

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

        {canSeeAll && (
          <label className="dept-pick ml-auto">
            <input
              type="checkbox"
              checked={showOnlyMy}
              onChange={e => setFilter('showOnlyMy', e.target.checked)}
            />
            <span>Мои задачи</span>
          </label>
        )}

        {canCreate && (
          <button className="btn primary" onClick={() => openTask(null)}>
            <Ic d={ICONS.plus} size={15} /> Создать
          </button>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <Kanban
          items={filteredTasks}
          statusOrder={TASK_STATUS_ORDER}
          statusMap={TASK_STATUSES}
          renderCard={renderTaskCard}
          onDrop={handleMoveTask}
        />
      ) : (
        <TasksList
          tasks={filteredTasks}
          db={db}
          user={ur}
          openTask={openTask}
          onMove={handleMoveTask}
          onDelete={handleDeleteTask}
          onCopy={openCopyTask}
          onMakeTemplate={openTemplateFromTask}
        />
      )}
    </>
  );
}

export default memo(TasksView);