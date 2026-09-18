// src/components/Gantt.jsx
import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useDataHelpers } from '../hooks/useDataHelpers';
import { useFilters } from '../hooks/useFilters';
import { useScheduleDb } from '../hooks/useDb';
import { computeScope, taskVisible } from '../utils/permissions';
import { TASK_STATUSES, PRIORITIES } from '../utils/constants';
import { fmtDMY, fmtD, TODAY, iso, parseISO, addDays } from '../utils/date';
import { getProjectColor } from '../utils/projectHelpers';
import { Ic, ICONS } from './Icons';
import Avatar from './Avatar';

const buildTaskTree = (tasks) => {
  const map = {};
  const roots = [];
  tasks.forEach(t => { map[t.id] = { ...t, children: [] }; });
  tasks.forEach(t => {
    const parentId = t.parentTaskId ? String(t.parentTaskId) : null;
    if (parentId && map[parentId]) map[parentId].children.push(map[t.id]);
    else roots.push(map[t.id]);
  });
  const sortChildren = (node) => {
    node.children.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    node.children.forEach(sortChildren);
  };
  roots.forEach(sortChildren);
  return roots;
};

const flattenTree = (nodes, level = 0, acc = []) => {
  nodes.forEach((node) => {
    acc.push({ ...node, level, hasChildren: node.children.length > 0 });
    flattenTree(node.children, level + 1, acc);
  });
  return acc;
};

const computeCriticalPath = (tasks) => {
  // dependencyId → задача; find по массиву внутри forEach - O(N²). Строим
  // карту заранее, чтобы остался один линейный проход.
  const byId = new Map(tasks.map(t => [t.id, t]));
  const critical = new Set();
  tasks.forEach(t => {
    if (!t.dependencyId) return;
    const dep = byId.get(t.dependencyId);
    if (dep && t.deadline === dep.deadline) {
      critical.add(t.id);
      critical.add(dep.id);
    }
  });
  return critical;
};

/**
 * Индексы начала/конца задачи в массиве days.
 *
 * Раньше искал `days.indexOf(...)` - O(days) на каждый вызов, то есть
 * O(N·D) на рендер Ганта. Сейчас принимает Map<isoDate, index>,
 * построенную один раз в Gantt: O(1) на задачу.
 */
const computeTaskIndices = (task, dayIndexByIso, daysLength, viewStart, viewEnd) => {
  const normalizeDate = (s) => (s ? s.slice(0, 10) : '');
  const sRaw = dayIndexByIso.get(normalizeDate(task.start));
  const eRaw = dayIndexByIso.get(normalizeDate(task.deadline));
  let sIdx = sRaw === undefined ? -1 : sRaw;
  let eIdx = eRaw === undefined ? -1 : eRaw;

  if (sIdx === -1 && eIdx === -1) {
    if (task.start < viewStart && task.deadline > viewEnd) {
      sIdx = 0;
      eIdx = daysLength - 1;
    } else return null;
  }
  if (sIdx === -1 && eIdx !== -1) {
    const startDate = parseISO(task.start);
    const deadlineDate = parseISO(task.deadline);
    const diffDays = Math.round((deadlineDate - startDate) / 864e5);
    sIdx = eIdx - diffDays >= 0 ? eIdx - diffDays : 0;
  }
  if (eIdx === -1 && sIdx !== -1) {
    const startDate = parseISO(task.start);
    const deadlineDate = parseISO(task.deadline);
    const diffDays = Math.round((deadlineDate - startDate) / 864e5);
    eIdx = sIdx + diffDays < daysLength ? sIdx + diffDays : daysLength - 1;
  }
  if (sIdx === -1 || eIdx === -1 || sIdx > eIdx) return null;
  return { sIdx, eIdx };
};

const getTasksWord = (count) => {
  const n = Math.abs(count) % 100;
  if (n >= 11 && n <= 19) return 'задач';
  const last = n % 10;
  if (last === 1) return 'задача';
  if (last >= 2 && last <= 4) return 'задачи';
  return 'задач';
};

/**
 * Строка задачи Ганта.
 *
 * memo-компонент: перерисовывается только когда меняется сама задача,
 * её окружение (уровень, развёрнутость, критичность) или стабильные
 * ссылки (days, map-ы, колбэки). Раскрытие/сворачивание соседней группы
 * больше не тянет за собой все строки.
 *
 * `employee` и `project` приходят снаружи как резолвнутые объекты - в
 * строке не остаётся `.find` по массивам. Раньше каждый рендер каждой
 * строки делал два линейных поиска.
 */
const TaskRow = memo(function TaskRow({
  task, level, hasChildren, expanded, onToggle,
  daysLength, dayIndexByIso, DW, viewStart, viewEnd,
  employee, project,
  openTask, getTaskSpent, vacOverlap, isCritical,
}) {
  const indices = computeTaskIndices(task, dayIndexByIso, daysLength, viewStart, viewEnd);
  if (!indices) return null;

  const { sIdx, eIdx } = indices;
  const left = sIdx * DW + 2;
  const w = Math.max((eIdx - sIdx + 1) * DW - 4, DW - 8);
  const sp = getTaskSpent(task);
  const pct = Math.min(100, (sp / Math.max(1, task.plannedHours || 0)) * 100);
  const fillWidth = pct > 0 ? Math.max(pct, 2) : 0;
  const vac = employee ? vacOverlap(employee.id, task.start, task.deadline) : null;
  const isMilestone = task.start === task.deadline;
  const priorityColor = PRIORITIES[task.priority]?.color || '#64748b';
  const bgColor = priorityColor + '33';

  const tooltipLines = [
    `${task.title}`,
    `Проект: ${project?.code || '-'}`,
    `Статус: ${TASK_STATUSES[task.status]?.label || task.status}`,
    `Приоритет: ${PRIORITIES[task.priority]?.label || task.priority}`,
    `План: ${task.plannedHours ?? '-'} ч, Факт: ${sp} ч`,
    `Срок: ${fmtD(task.start)} - ${fmtD(task.deadline)}`,
    ...(employee ? [`Исполнитель: ${employee.last} ${employee.first}`] : []),
    ...(vac ? [`⚠️ В отпуске ${fmtDMY(vac.start)}–${fmtDMY(vac.end)}`] : []),
    ...(isCritical ? ['🔴 Критическая задача'] : []),
  ].join('\n');

  // Стабильные обработчики, чтобы memo на строке не срывался инлайн-стрелками.
  const handleToggleClick = useCallback((e) => {
    e.stopPropagation();
    onToggle(task.id);
  }, [onToggle, task.id]);

  const handleOpen = useCallback(() => {
    openTask(task.id);
  }, [openTask, task.id]);

  return (
    <div className={`gantt-row${isCritical ? ' gantt-critical' : ''} relative`}>
      <div
        className="gantt-label"
        onClick={handleOpen}
        style={{ '--indent-level': level * 20 + 'px' }}
      >
        <div className="flex items-center gap-1">
          {hasChildren && (
            <button
              className={`gantt-expand-btn${expanded ? ' expanded' : ''}`}
              onClick={handleToggleClick}
              title={expanded ? 'Свернуть' : 'Развернуть'}
            >▶</button>
          )}
          <span className={`gtitle${task.status === 'cancelled' ? ' dim' : ''}`}>
            {task.title}
          </span>
        </div>
        <span className="gsub">
          {employee && <Avatar employee={employee} size="xs" />} · {task.plannedHours ?? '-'} ч ·{' '}
          {TASK_STATUSES[task.status]?.label || task.status}
        </span>
      </div>

      <div className="gantt-track">
        {isMilestone ? (
          <div
            className="gantt-milestone"
            style={{ left: left + w / 2 - 8, top: 8, borderColor: priorityColor }}
            title={tooltipLines}
          />
        ) : (
          <div
            className="gbar"
            style={{
              '--bar-left': left + 'px',
              '--bar-width': w + 'px',
              '--bar-bg': bgColor,
              '--bar-opacity': task.status === 'cancelled' ? 0.45 : 1,
              '--fill-width': fillWidth + '%',
              '--fill-color': task.status === 'closed' ? '#10b981' : priorityColor,
            }}
            onClick={handleOpen}
            title={tooltipLines}
          >
            <div className="gbar-fill" />
            {vac && <span className="gbar-vac">🏖</span>}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Группа задач одного проекта.
 *
 * memo-компонент. От родителя получает уже готовые карты сущностей
 * (`employeesById`, `projectsById`), стабильный `onToggleTask` и
 * `dayIndexByIso` - всё это не пересоздаётся на каждый рендер Ганта,
 * поэтому memo реально работает и раскрытие одной группы не трогает
 * соседние.
 */
const ProjectGroup = memo(function ProjectGroup({
  project, tasks, daysLength, dayIndexByIso, DW, viewStart, viewEnd,
  employeesById, projectsById,
  openTask, openProject, getTaskSpent, vacOverlap,
  expandedTasks, onToggleTask, criticalIds,
}) {
  const projectColor = getProjectColor(project);
  const tree = useMemo(() => buildTaskTree(tasks), [tasks]);

  const rows = [];
  const visited = new Set();
  const traverse = (node, level = 0) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    const isExpanded = expandedTasks.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    // Резолвим связи один раз здесь - строка получает готовые объекты.
    const employee = node.assigneeId ? employeesById.get(node.assigneeId) : null;
    const taskProject = projectsById.get(node.projectId) || project;

    rows.push(
      <TaskRow
        key={node.id}
        task={node}
        level={level}
        hasChildren={hasChildren}
        expanded={isExpanded}
        onToggle={onToggleTask}
        daysLength={daysLength}
        dayIndexByIso={dayIndexByIso}
        DW={DW}
        viewStart={viewStart}
        viewEnd={viewEnd}
        employee={employee}
        project={taskProject}
        openTask={openTask}
        getTaskSpent={getTaskSpent}
        vacOverlap={vacOverlap}
        isCritical={criticalIds.has(node.id)}
      />,
    );
    if (isExpanded) node.children.forEach(child => traverse(child, level + 1));
  };
  tree.forEach(root => traverse(root));

  if (rows.length === 0) return null;

  const handleOpenProject = () => {
    if (openProject) openProject(project.id);
  };

  return (
    <div>
      <div className="gantt-group">
        <div
          className="gantt-group-name cursor-pointer underline"
          onClick={handleOpenProject}
          title="Открыть проект"
        >
          <span className="pdot" style={{ background: projectColor }} />
          {project.code} · {project.name}
          <span className="mut sm ml-2">({rows.length} {getTasksWord(rows.length)})</span>
        </div>
      </div>
      {rows}
    </div>
  );
});

const INITIAL_FILTERS = Object.freeze({
  projectId: 'all',
  assigneeId: 'all',
  status: 'all',
});

function Gantt({ ur, openTask, openProject }) {
  const db = useScheduleDb();
  const { tasks, projects, employees } = db;

  const { getTaskSpent, vacOverlap } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const { filters, setFilter } = useFilters(INITIAL_FILTERS);
  const { projectId, assigneeId, status } = filters;

  // Карты идентификаторов - один раз на срез. Через них идут все
  // резолвы assignee/project: никаких .find() в рендере.
  const employeesById = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees],
  );
  const projectsById = useMemo(
    () => new Map(projects.map(p => [p.id, p])),
    [projects],
  );

  const [zoomLevel, setZoomLevel] = useState(1);
  const DW = Math.round(34 * zoomLevel);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(
    () => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [cornerWidth, setCornerWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);

  const statusOptions = useMemo(
    () => Object.entries(TASK_STATUSES).filter(([key]) => key !== 'closed' && key !== 'cancelled'),
    [],
  );

  useEffect(() => {
    if (status === 'closed' || status === 'cancelled') setFilter('status', 'all');
  }, [status, setFilter]);

  // Стабильный тогл раскрытия. Функциональное обновление setState -
  // единственный способ не зависеть от текущего expandedTasks в замыкании.
  const onToggleTask = useCallback((id) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleResizerMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = cornerWidth;
    let rafId = null;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const diff = moveEvent.clientX - startX;
        setCornerWidth(Math.max(150, Math.min(500, startWidth + diff)));
        rafId = null;
      });
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [cornerWidth]);

  const getDaysInRange = useCallback((anchorDate, modeArg) => {
    const start = parseISO(anchorDate);
    const days = [];
    if (modeArg === 'month') {
      const year = start.getFullYear();
      const month = start.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 0; i < daysInMonth; i++) days.push(iso(new Date(year, month, i + 1)));
    } else if (modeArg === 'quarter') {
      for (let i = 0; i < 90; i++) days.push(iso(addDays(start, i)));
    } else {
      for (let i = 0; i < 365; i++) days.push(iso(addDays(start, i)));
    }
    return days;
  }, []);

  const shift = (dir) => {
    let newAnchor;
    if (mode === 'month') {
      const d = parseISO(anchor); d.setMonth(d.getMonth() + dir); newAnchor = iso(d);
    } else if (mode === 'quarter') {
      const d = parseISO(anchor); d.setMonth(d.getMonth() + dir * 3); newAnchor = iso(d);
    } else {
      const d = parseISO(anchor); d.setFullYear(d.getFullYear() + dir); newAnchor = iso(d);
    }
    setAnchor(newAnchor);
  };

  const baseTasks = useMemo(
    () => tasks
      .filter(t =>
        !t.archived &&
        taskVisible(ur, scope, t, db) &&
        t.start && t.deadline &&
        !['closed', 'cancelled'].includes(t.status)
      )
      .map(t => ({
        ...t,
        start: t.start ? t.start.slice(0, 10) : null,
        deadline: t.deadline ? t.deadline.slice(0, 10) : null,
      })),
    [tasks, ur, scope, db],
  );

  const allTasks = useMemo(() => {
    let list = baseTasks;
    if (projectId !== 'all') list = list.filter(t => t.projectId === projectId);
    if (assigneeId !== 'all') list = list.filter(t => t.assigneeId === assigneeId);
    if (status !== 'all') list = list.filter(t => t.status === status);
    return list;
  }, [baseTasks, projectId, assigneeId, status]);

  const projectOptions = useMemo(() => {
    const ids = new Set(baseTasks.map(t => t.projectId).filter(Boolean));
    return projects.filter(p => ids.has(p.id));
  }, [baseTasks, projects]);

  const tasksForAssignee = useMemo(() => {
    let list = baseTasks;
    if (projectId !== 'all') list = list.filter(t => t.projectId === projectId);
    return list;
  }, [baseTasks, projectId]);

  const assigneeOptions = useMemo(() => {
    const ids = new Set(tasksForAssignee.map(t => t.assigneeId).filter(Boolean));
    return employees.filter(e => ids.has(e.id));
  }, [tasksForAssignee, employees]);

  const projectGroups = useMemo(() => {
    const groups = new Map();
    allTasks.forEach(t => {
      if (!groups.has(t.projectId)) {
        const project = projectsById.get(t.projectId);
        if (project) groups.set(t.projectId, { project, tasks: [] });
      }
      const group = groups.get(t.projectId);
      if (group) group.tasks.push(t);
    });
    return Array.from(groups.values());
  }, [allTasks, projectsById]);

  const criticalIds = useMemo(() => computeCriticalPath(allTasks), [allTasks]);

  const days = useMemo(() => getDaysInRange(anchor, mode), [anchor, mode, getDaysInRange]);
  const daysLength = days.length;

  // Быстрый обратный индекс iso-даты. Строится один раз на диапазон,
  // используется в computeTaskIndices - там раньше был days.indexOf().
  const dayIndexByIso = useMemo(() => {
    const m = new Map();
    days.forEach((d, i) => m.set(d, i));
    return m;
  }, [days]);

  const months = useMemo(() => {
    const result = [];
    days.forEach((day, i) => {
      const d = parseISO(day);
      const lbl = `${['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][d.getMonth()]} ${d.getFullYear()}`;
      if (!result.length || result[result.length - 1].label !== lbl) {
        result.push({ label: lbl, from: i, to: i });
      } else result[result.length - 1].to = i;
    });
    return result;
  }, [days]);

  const viewStart = days[0];
  const viewEnd = days[daysLength - 1];
  const width = daysLength * DW;
  const totalWidth = width + cornerWidth;

  const ROW_HEIGHT = 46;
  const GROUP_HEADER_HEIGHT = 40;

  const taskPositions = useMemo(() => {
    const positions = [];
    projectGroups.forEach((group, groupIndex) => {
      const tree = buildTaskTree(group.tasks);
      let localRowIndex = 0;
      const traverse = (node) => {
        const isExpanded = expandedTasks.has(node.id);
        const indices = computeTaskIndices(node, dayIndexByIso, daysLength, viewStart, viewEnd);
        if (indices) {
          const { sIdx, eIdx } = indices;
          const left = sIdx * DW + 2;
          const w = Math.max((eIdx - sIdx + 1) * DW - 4, DW - 8);
          const top = groupIndex * GROUP_HEADER_HEIGHT + localRowIndex * ROW_HEIGHT;
          positions.push({
            id: node.id, left, width: w, right: left + w,
            top, height: ROW_HEIGHT, dependencyId: node.dependencyId,
          });
          localRowIndex++;
        }
        if (isExpanded) node.children.forEach(child => traverse(child));
      };
      tree.forEach(root => traverse(root));
    });
    return positions;
  }, [projectGroups, dayIndexByIso, daysLength, DW, viewStart, viewEnd, expandedTasks]);

  const dependencyLines = useMemo(() => {
    const lines = [];
    const posMap = new Map(taskPositions.map(p => [p.id, p]));
    taskPositions.forEach(pos => {
      if (pos.dependencyId) {
        const pred = posMap.get(pos.dependencyId);
        if (pred) {
          lines.push({
            x1: cornerWidth + pred.right,
            y1: pred.top + pred.height / 2,
            x2: cornerWidth + pos.left,
            y2: pos.top + pos.height / 2,
          });
        }
      }
    });
    return lines;
  }, [taskPositions, cornerWidth]);

  const handleCollapseAll = useCallback(() => {
    setExpandedTasks(new Set());
  }, []);

  const handleExpandAll = useCallback(() => {
    const allIds = [];
    projectGroups.forEach(({ tasks: ts }) => {
      flattenTree(buildTaskTree(ts)).forEach(n => { if (n.hasChildren) allIds.push(n.id); });
    });
    setExpandedTasks(new Set(allIds));
  }, [projectGroups]);

  return (
    <div className="gantt-panel">
      <div className="gantt-filter-bar">
        <select className="inp sel gantt-filter-select" value={projectId}
          onChange={e => setFilter('projectId', e.target.value)}>
          <option value="all">Все проекты</option>
          {projectOptions.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>

        <select className="inp sel gantt-filter-select" value={assigneeId}
          onChange={e => setFilter('assigneeId', e.target.value)}>
          <option value="all">Все исполнители</option>
          {assigneeOptions.map(e => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
        </select>

        <select className="inp sel gantt-filter-select" value={status}
          onChange={e => setFilter('status', e.target.value)}>
          <option value="all">Все статусы</option>
          {statusOptions.map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
        </select>

        <div className="gantt-zoom">
          <button className="icon-btn" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}>−</button>
          <span className="zoom-value">{Math.round(zoomLevel * 100)}%</span>
          <button className="icon-btn" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}>+</button>
        </div>

        <button className="btn ghost sm" onClick={handleCollapseAll}>Свернуть всё</button>
        <button className="btn ghost sm" onClick={handleExpandAll}>Развернуть всё</button>
      </div>

      <div className="cal-head p-3 border-b">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}>
            <Ic d={ICONS.left} size={16} />
          </button>
          <div className="cal-title">{fmtDMY(anchor)}</div>
          <button className="icon-btn" onClick={() => shift(1)}>
            <Ic d={ICONS.right} size={16} />
          </button>
        </div>
        <div className="cal-right">
          <div className="seg">
            {[['month','Месяц'],['quarter','Квартал'],['year','Год']].map(([m, l]) => (
              <button key={m} className={`seg-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="gantt-scroll">
        {projectGroups.length === 0 ? (
          <div className="empty-note p-4">Нет доступных задач в выбранном периоде</div>
        ) : (
          <div
            className="gantt"
            style={{
              '--gantt-width': totalWidth + 'px',
              '--corner-width': cornerWidth + 'px',
              '--gantt-days-width': width + 'px',
            }}
          >
            <div className="gantt-top">
              <div className="gantt-corner">
                Проект / задача
                <div
                  className={`gantt-resizer${isResizing ? ' dragging' : ''}`}
                  onMouseDown={handleResizerMouseDown}
                />
              </div>
              <div className="gantt-axis">
                <div className="gantt-months">
                  {months.map((m, i) => (
                    <div key={i} className="gantt-month" style={{ width: (m.to - m.from + 1) * DW }}>
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="gantt-days">
                  {days.map(d => {
                    const dt = parseISO(d);
                    const wk = dt.getDay();
                    return (
                      <div
                        key={d}
                        className={`gday${wk === 0 || wk === 6 ? ' wk' : ''}${d === TODAY ? ' td' : ''}`}
                        style={{ width: DW }}
                      >
                        {dt.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="gantt-body" style={{ position: 'relative' }}>
              <div className="gantt-grid" style={{ left: cornerWidth }}>
                {days.map(d => (
                  <div
                    key={d}
                    className={`gcell${[0, 6].includes(parseISO(d).getDay()) ? ' wk' : ''}`}
                    style={{ width: DW }}
                  />
                ))}
                <div className="gtoday" style={{ left: days.indexOf(TODAY) * DW + DW / 2 }} />
              </div>

              {dependencyLines.length > 0 && (
                <svg
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    pointerEvents: 'none', zIndex: 2,
                  }}
                >
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                    </marker>
                  </defs>
                  {dependencyLines.map((line, i) => (
                    <line
                      key={i}
                      x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                      stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowhead)"
                    />
                  ))}
                </svg>
              )}

              {projectGroups.map(({ project, tasks: ts }) => (
                <ProjectGroup
                  key={project.id}
                  project={project}
                  tasks={ts}
                  daysLength={daysLength}
                  dayIndexByIso={dayIndexByIso}
                  DW={DW}
                  viewStart={viewStart}
                  viewEnd={viewEnd}
                  employeesById={employeesById}
                  projectsById={projectsById}
                  openTask={openTask}
                  openProject={openProject}
                  getTaskSpent={getTaskSpent}
                  vacOverlap={vacOverlap}
                  expandedTasks={expandedTasks}
                  onToggleTask={onToggleTask}
                  criticalIds={criticalIds}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="gantt-legend p-2 border-t flex flex-wrap gap-4 items-center">
        <span className="legend-item">🏖 - исполнитель в отпуске</span>
        <span className="legend-item">Заполнение полосы - факт / план</span>
        <span className="legend-item">→ - зависимость задач</span>
      </div>
    </div>
  );
}

export default memo(Gantt);