// src/components/Gantt.jsx
import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { Ic, ICONS } from './Icons';
import { Select } from './Select';
import { SearchBox } from './SearchBox';
import Avatar from './Avatar';
import { useFilters } from '../hooks/useFilters';
import { useScopeDb } from '../hooks/useDb';
import { useDataHelpers } from '../hooks/useDataHelpers';
import { computeScope, taskVisible } from '../utils/permissions';
import { TASK_STATUSES, PRIORITIES } from '../utils/constants';
import { getProjectColor } from '../utils/projectHelpers';
import { fmtD, fmtDMY, iso, parseISO, addDays, TODAY } from '../utils/date';
import { optionsFromList } from '../utils/selectOptions';
import { taskWord } from '../utils/pluralize';
import { formatPeriodLabel } from '../utils/periodLabel';
import { dependencyPath } from '../utils/ganttDependency';

// ────────────────────────────────────────────────────────────────────
// Вспомогательные предикаты и геометрия
// ────────────────────────────────────────────────────────────────────

const isMilestoneTask = (task) => task.isMilestone === true;

const MILESTONE_SIZE = 14;

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
  nodes.forEach(node => {
    acc.push({ ...node, level, hasChildren: node.children.length > 0 });
    flattenTree(node.children, level + 1, acc);
  });
  return acc;
};

const computeCriticalPath = (tasks) => {
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
    const diffDays = Math.round((parseISO(task.deadline) - parseISO(task.start)) / 86400000);
    sIdx = eIdx - diffDays >= 0 ? eIdx - diffDays : 0;
  }
  if (eIdx === -1 && sIdx !== -1) {
    const diffDays = Math.round((parseISO(task.deadline) - parseISO(task.start)) / 86400000);
    eIdx = sIdx + diffDays < daysLength ? sIdx + diffDays : daysLength - 1;
  }
  if (sIdx === -1 || eIdx === -1 || sIdx > eIdx) return null;
  return { sIdx, eIdx };
};

const computeBarGeometry = (task, indices, DW, top, rowHeight) => {
  const { sIdx, eIdx } = indices;

  if (isMilestoneTask(task)) {
    const cellCenter = sIdx * DW + DW / 2;
    const left = cellCenter - MILESTONE_SIZE / 2;
    return {
      left,
      width: MILESTONE_SIZE,
      right: left + MILESTONE_SIZE,
      centerY: top + rowHeight / 2,
    };
  }

  const left = sIdx * DW + 2;
  const width = Math.max((eIdx - sIdx + 1) * DW - 4, DW - 8);
  return {
    left,
    width,
    right: left + width,
    centerY: top + rowHeight / 2,
  };
};

const isOverdue = (task) =>
  task.deadline &&
  task.deadline < TODAY &&
  task.status !== 'closed' &&
  task.status !== 'cancelled';

// ────────────────────────────────────────────────────────────────────
// Порядок строк с учётом зависимостей
// ────────────────────────────────────────────────────────────────────

/**
 * Плоский список строк проекта в порядке отображения.
 *
 * Правило:
 *   1. Узел дерева выводится сам.
 *   2. Сразу за ним — задачи, которые от него зависят
 *      (dependencyId указывает на него). Они выводятся на его уровне:
 *      это последовательность исполнения, а не иерархия подчинения.
 *   3. После цепочки зависимостей — дочерние узлы (подзадачи), если
 *      родитель раскрыт.
 *
 * Возвращаемый массив — единственный источник порядка строк и для
 * рендера, и для расчёта координат полос. Хранится в родителе и
 * передаётся в ProjectGroup как проп: если бы каждая сторона считала
 * порядок сама, любой рассинхрон (разные зависимости useMemo,
 * порядок обхода) привёл бы к тому, что стрелки уезжали бы к чужим
 * строкам — ровно как в баге с задачей «1».
 */
const buildRowOrder = (tasks, expandedTasks) => {
  const tree = buildTaskTree(tasks);

  const nodeById = new Map();
  const walk = (n) => { nodeById.set(n.id, n); n.children.forEach(walk); };
  tree.forEach(walk);

  const successorsOf = new Map();
  for (const root of tree) {
    if (!root.dependencyId) continue;
    const pred = nodeById.get(root.dependencyId);
    if (!pred || pred.parentTaskId) continue;
    const list = successorsOf.get(pred.id) || [];
    list.push(root);
    successorsOf.set(pred.id, list);
  }
  for (const list of successorsOf.values()) {
    list.sort((a, b) =>
      (a.start || '').localeCompare(b.start || '') || a.id.localeCompare(b.id)
    );
  }

  const order = [];
  const visited = new Set();

  const traverse = (node, level) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);

    order.push({ id: node.id, level, hasChildren: node.children.length > 0, node });

    const successors = successorsOf.get(node.id) || [];
    for (const s of successors) traverse(s, level);

    if (expandedTasks.has(node.id)) {
      node.children.forEach(child => traverse(child, level + 1));
    }
  };

  tree.forEach(root => traverse(root, 0));
  return order;
};

// ────────────────────────────────────────────────────────────────────
// Строка задачи
// ────────────────────────────────────────────────────────────────────

const TaskRow = memo(function TaskRow({
  task, level, hasChildren, expanded, onToggle,
  daysLength, dayIndexByIso, DW, viewStart, viewEnd,
  employee, project, openTask, getTaskSpent, vacOverlap, isCritical,
}) {
  const indices = computeTaskIndices(task, dayIndexByIso, daysLength, viewStart, viewEnd);
  if (!indices) return null;

  const rowHeight = 46;
  const geo = computeBarGeometry(task, indices, DW, 0, rowHeight);

  const milestone = isMilestoneTask(task);
  const overdue = isOverdue(task);
  const sp = getTaskSpent(task);
  const pct = Math.min(100, (sp / Math.max(1, task.plannedHours || 0)) * 100);
  const fillWidth = pct > 0 ? Math.max(pct, 2) : 0;
  const vac = employee ? vacOverlap(employee.id, task.start, task.deadline) : null;

  const priorityColor = PRIORITIES[task.priority]?.color || '#64748b';
  const statusColor = task.status === 'closed'
    ? '#10b981'
    : task.status === 'cancelled'
      ? '#94a3b8'
      : priorityColor;
  const bgColor = priorityColor + '33';

  const tooltipLines = [
    `${milestone ? '◆ Веха: ' : ''}${task.title}`,
    `Проект: ${project?.code || '-'}`,
    `Статус: ${TASK_STATUSES[task.status]?.label || task.status}`,
    `Приоритет: ${PRIORITIES[task.priority]?.label || task.priority}`,
    `План: ${task.plannedHours ?? '-'} ч, Факт: ${sp} ч`,
    milestone
      ? `Дата: ${fmtD(task.start)}`
      : `Срок: ${fmtD(task.start)} - ${fmtD(task.deadline)}`,
    ...(employee ? [`Исполнитель: ${employee.last} ${employee.first}`] : []),
    ...(vac ? [`⚠️ В отпуске ${fmtDMY(vac.start)}–${fmtDMY(vac.end)}`] : []),
    ...(overdue ? ['🔴 Просрочено'] : []),
    ...(isCritical ? ['🔴 Критическая задача'] : []),
  ].join('\n');

  const handleToggleClick = useCallback((e) => {
    e.stopPropagation();
    onToggle(task.id);
  }, [onToggle, task.id]);

  const handleOpen = useCallback(() => { openTask(task.id); }, [openTask, task.id]);

  return (
    <div className={`gantt-row${isCritical ? ' gantt-critical' : ''}`}>
      <div
        className="gantt-label"
        onClick={handleOpen}
        style={{ '--indent-level': (level * 20) + 'px' }}
        title={tooltipLines}
      >
        <div className="flex items-center gap-1">
          {hasChildren && (
            <button
              className={`gantt-expand-btn${expanded ? ' expanded' : ''}`}
              onClick={handleToggleClick}
              title={expanded ? 'Свернуть' : 'Развернуть'}
            >
              ▶
            </button>
          )}
          {milestone && <span className="gantt-milestone-marker" title="Веха">◆</span>}
          <span className={`gtitle${task.status === 'cancelled' ? ' dim' : ''}`}>
            {task.title}
          </span>
          {overdue && <span className="gantt-overdue-dot" title="Просрочено" />}
        </div>
        <span className="gsub">
          {employee && <Avatar employee={employee} size="xs" />}
          {' · '}
          {milestone
            ? `веха · ${fmtD(task.start)}`
            : `${task.plannedHours ?? '-'} ч · ${TASK_STATUSES[task.status]?.label || task.status}`}
        </span>
      </div>

      <div className="gantt-track">
        {milestone ? (
          <div
            className={`gantt-milestone${task.status === 'cancelled' ? ' cancelled' : ''}`}
            style={{ '--ms-left': geo.left + 'px', '--ms-color': statusColor }}
            onClick={handleOpen}
            title={tooltipLines}
          />
        ) : (
          <div
            className={`gbar${overdue ? ' overdue' : ''}`}
            style={{
              '--bar-left': geo.left + 'px',
              '--bar-width': geo.width + 'px',
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

// ────────────────────────────────────────────────────────────────────
// Группа задач одного проекта
// ────────────────────────────────────────────────────────────────────

/**
 * Порядок строк приходит готовым массивом order — ProjectGroup его
 * не пересчитывает. Это ключ к тому, что стрелки не уезжают: рендер
 * строк и taskPositions в родителе видят один и тот же массив.
 */
const ProjectGroup = memo(function ProjectGroup({
  project, order,
  daysLength, dayIndexByIso, DW, viewStart, viewEnd,
  employeesById, projectsById, openTask, openProject, getTaskSpent,
  vacOverlap, expandedTasks, onToggleTask, criticalIds,
}) {
  const projectColor = getProjectColor(project);

  const rows = order.map(({ id, level, hasChildren, node }) => {
    const employee = node.assigneeId ? employeesById.get(node.assigneeId) : null;
    const taskProject = projectsById.get(node.projectId) || project;
    return (
      <TaskRow
        key={id}
        task={node}
        level={level}
        hasChildren={hasChildren}
        expanded={expandedTasks.has(id)}
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
        isCritical={criticalIds.has(id)}
      />
    );
  });

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
          <span className="mut sm ml-2">
            ({rows.length} {taskWord(rows.length)})
          </span>
        </div>
      </div>
      {rows}
    </div>
  );
});

// ────────────────────────────────────────────────────────────────────
// Основной компонент
// ────────────────────────────────────────────────────────────────────

const INITIAL_FILTERS = Object.freeze({
  projectId: 'all',
  assigneeId: 'all',
  status: 'all',
  query: '',
});

const ROW_HEIGHT = 46;
const GROUP_HEADER_HEIGHT = 40;

function Gantt({ ur, openTask, openProject, store }) {
  const db = useScopeDb();
  const { tasks, projects, employees } = db;
  const { getTaskSpent, vacOverlap } = useDataHelpers(db);

  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  const { filters, setFilter } = useFilters(INITIAL_FILTERS);
  const { projectId, assigneeId, status, query } = filters;

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

  const [expandedTasks, setExpandedTasks] = useState(() => new Set());
  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(() => {
    const now = new Date();
    return iso(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [cornerWidth, setCornerWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);

  const scrollRef = useRef(null);

  const statusOptions = useMemo(
    () => Object.entries(TASK_STATUSES).filter(([key]) => key !== 'closed' && key !== 'cancelled'),
    [],
  );

  useEffect(() => {
    if (status === 'closed' || status === 'cancelled') {
      setFilter('status', 'all');
    }
  }, [status, setFilter]);

  const onToggleTask = useCallback((id) => {
    setExpandedTasks(prev => {
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
      const d = parseISO(anchor);
      d.setMonth(d.getMonth() + dir);
      newAnchor = iso(d);
    } else if (mode === 'quarter') {
      const d = parseISO(anchor);
      d.setMonth(d.getMonth() + dir * 3);
      newAnchor = iso(d);
    } else {
      const d = parseISO(anchor);
      d.setFullYear(d.getFullYear() + dir);
      newAnchor = iso(d);
    }
    setAnchor(newAnchor);
  };

  const baseTasks = useMemo(() => {
    return tasks
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
      }));
  }, [tasks, ur, scope, db]);

  const allTasks = useMemo(() => {
    let list = baseTasks;
    if (projectId !== 'all') list = list.filter(t => t.projectId === projectId);
    if (assigneeId !== 'all') list = list.filter(t => t.assigneeId === assigneeId);
    if (status !== 'all') list = list.filter(t => t.status === status);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(t => (t.title || '').toLowerCase().includes(q));
    }
    return list;
  }, [baseTasks, projectId, assigneeId, status, query]);

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

  const projectSelectOptions = useMemo(
    () => optionsFromList(projectOptions, 'Все проекты', (p) => ({ value: p.id, label: p.code })),
    [projectOptions],
  );
  const assigneeSelectOptions = useMemo(
    () => optionsFromList(assigneeOptions, 'Все исполнители', (e) => ({
      value: e.id,
      label: `${e.last} ${e.first}`,
    })),
    [assigneeOptions],
  );
  const statusSelectOptions = useMemo(
    () => optionsFromList(statusOptions, 'Все статусы', ([key, val]) => ({
      value: key,
      label: val.label,
    })),
    [statusOptions],
  );

  /**
   * Группы проектов вместе с готовым порядком строк.
   *
   * buildRowOrder вызывается здесь, один раз на группу. Этот же
   * массив `order` уезжает и в ProjectGroup (для рендера), и в
   * taskPositions (для Y-координат полос). Y-координата строки i
   * равна top = groupIndex * HEADER + i * ROW_HEIGHT — то же правило,
   * что визуально даёт DOM, потому что в DOM строки идут ровно в этом
   * порядке.
   *
   * Это устраняет баг «стрелка уехала к чужой строке»: раньше порядок
   * считался дважды независимо, и любой рассинхрон между двумя
   * вызовами buildRowOrder сдвигал стрелки.
   */
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
    return Array.from(groups.values()).map(g => ({
      project: g.project,
      tasks: g.tasks,
      order: buildRowOrder(g.tasks, expandedTasks),
    }));
  }, [allTasks, projectsById, expandedTasks]);

  const criticalIds = useMemo(() => computeCriticalPath(allTasks), [allTasks]);

  const days = useMemo(() => getDaysInRange(anchor, mode), [anchor, mode, getDaysInRange]);
  const daysLength = days.length;

  const dayIndexByIso = useMemo(() => {
    const m = new Map();
    days.forEach((d, i) => m.set(d, i));
    return m;
  }, [days]);

  const dayStatusByIso = useMemo(() => {
    const map = new Map();
    if (!store) return map;
    const years = new Set();
    for (const d of days) years.add(Number(d.slice(0, 4)));
    for (const y of years) {
      const months = store.getYearCalendar(y);
      for (const m of months) {
        for (const day of m.days) {
          map.set(day.iso, day.status);
        }
      }
    }
    return map;
  }, [store, days]);

  const months = useMemo(() => {
    const result = [];
    days.forEach((day, i) => {
      const d = parseISO(day);
      const lbl = `${
        ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][d.getMonth()]
      } ${d.getFullYear()}`;
      if (!result.length || result[result.length - 1].label !== lbl) {
        result.push({ label: lbl, from: i, to: i });
      } else {
        result[result.length - 1].to = i;
      }
    });
    return result;
  }, [days]);

  const viewStart = days[0];
  const viewEnd = days[daysLength - 1];
  const width = daysLength * DW;
  const totalWidth = width + cornerWidth;

  /**
   * Позиции полос и вех. Обход идёт по тому же order, что уходит в
   * ProjectGroup — обе стороны гарантированно видят одинаковый
   * вертикальный порядок строк.
   *
   * localRowIndex увеличивается только для строк с полосой (в окне
   * периода). Строки без полосы не занимают DOM-высоту? Занимают.
   * Но у них и label рендерится — см. TaskRow, который возвращает
   * null при отсутствии indices. Значит и в DOM, и здесь такие
   * строки отсутствуют — согласованно.
   */
  const taskPositions = useMemo(() => {
    const positions = [];

    projectGroups.forEach((group, groupIndex) => {
      let localRowIndex = 0;

      for (const { node } of group.order) {
        const indices = computeTaskIndices(node, dayIndexByIso, daysLength, viewStart, viewEnd);
        if (!indices) continue;
        const top = groupIndex * GROUP_HEADER_HEIGHT + localRowIndex * ROW_HEIGHT;
        const geo = computeBarGeometry(node, indices, DW, top, ROW_HEIGHT);
        positions.push({
          id: node.id,
          left: geo.left,
          width: geo.width,
          right: geo.right,
          top,
          height: ROW_HEIGHT,
          centerY: geo.centerY,
          dependencyId: node.dependencyId,
          dependencyType: node.dependencyType,
          isMilestone: isMilestoneTask(node),
        });
        localRowIndex++;
      }
    });

    return positions;
  }, [projectGroups, dayIndexByIso, daysLength, DW, viewStart, viewEnd]);

  const dependencyPaths = useMemo(() => {
    const paths = [];
    const posMap = new Map(taskPositions.map(p => [p.id, p]));

    for (const pos of taskPositions) {
      if (!pos.dependencyId) continue;
      const pred = posMap.get(pos.dependencyId);
      if (!pred) continue;

      const from = {
        left:    cornerWidth + pred.left,
        right:   cornerWidth + pred.right,
        centerY: pred.centerY,
      };
      const to = {
        left:    cornerWidth + pos.left,
        right:   cornerWidth + pos.right,
        centerY: pos.centerY,
      };

      const path = dependencyPath(pos.dependencyType || 'FS', from, to);
      if (path) paths.push(path);
    }
    return paths;
  }, [taskPositions, cornerWidth]);

  const handleCollapseAll = useCallback(() => {
    setExpandedTasks(new Set());
  }, []);

  const handleExpandAll = useCallback(() => {
    const allIds = [];
    projectGroups.forEach(({ tasks: ts }) => {
      flattenTree(buildTaskTree(ts)).forEach(n => {
        if (n.hasChildren) allIds.push(n.id);
      });
    });
    setExpandedTasks(new Set(allIds));
  }, [projectGroups]);

  const scrollToToday = useCallback(() => {
    const todayIdx = days.indexOf(TODAY);
    if (todayIdx === -1) {
      const now = new Date();
      setAnchor(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const target = cornerWidth + todayIdx * DW - el.clientWidth / 2 + DW / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [days, DW, cornerWidth]);

  const dayCellClass = (isoDate) => {
    const st = dayStatusByIso.get(isoDate);
    if (st === 'holiday') return 'gcell holiday';
    if (st === 'shortday') return 'gcell shortday';
    if (st === 'weekend') return 'gcell wk';
    return 'gcell';
  };

  const dayHeadClass = (isoDate) => {
    const st = dayStatusByIso.get(isoDate);
    const base = 'gday';
    const isToday = isoDate === TODAY ? ' td' : '';
    if (st === 'holiday') return `${base} holiday${isToday}`;
    if (st === 'shortday') return `${base} shortday${isToday}`;
    if (st === 'weekend') return `${base} wk${isToday}`;
    return `${base}${isToday}`;
  };

  return (
    <div className="gantt-panel">
      <div className="gantt-filter-bar">
        <SearchBox
          value={query}
          onChange={(v) => setFilter('query', v)}
          placeholder="Поиск по названию…"
          className="gantt-search"
        />
        <Select
          className="gantt-filter-select"
          value={projectId}
          onChange={(v) => setFilter('projectId', v)}
          options={projectSelectOptions}
        />
        <Select
          className="gantt-filter-select"
          value={assigneeId}
          onChange={(v) => setFilter('assigneeId', v)}
          options={assigneeSelectOptions}
        />
        <Select
          className="gantt-filter-select"
          value={status}
          onChange={(v) => setFilter('status', v)}
          options={statusSelectOptions}
        />
        <div className="gantt-zoom">
          <button className="icon-btn" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}>−</button>
          <span className="zoom-value">{Math.round(zoomLevel * 100)}%</span>
          <button className="icon-btn" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}>+</button>
        </div>
        <button className="btn ghost sm" onClick={scrollToToday} title="Прокрутить к текущей дате">
          К сегодня
        </button>
        <button className="btn ghost sm" onClick={handleCollapseAll}>Свернуть всё</button>
        <button className="btn ghost sm" onClick={handleExpandAll}>Развернуть всё</button>
      </div>

      <div className="cal-head p-3 border-b">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
          <div className="cal-title">{formatPeriodLabel(mode, anchor, viewStart, viewEnd)}</div>
          <button className="icon-btn" onClick={() => shift(1)}><Ic d={ICONS.right} size={16} /></button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              const now = new Date();
              setAnchor(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
            }}
          >
            Сегодня
          </button>
        </div>
        <div className="cal-right">
          <div className="seg">
            {[['month','Месяц'],['quarter','Квартал'],['year','Год']].map(([m, l]) => (
              <button
                key={m}
                className={`seg-btn${mode === m ? ' on' : ''}`}
                onClick={() => setMode(m)}
              >{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="gantt-scroll" ref={scrollRef}>
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
                    return (
                      <div key={d} className={dayHeadClass(d)} style={{ width: DW }}>
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
                  <div key={d} className={dayCellClass(d)} style={{ width: DW }} />
                ))}
                <div
                  className="gtoday"
                  style={{ left: days.indexOf(TODAY) * DW + DW / 2 }}
                />
              </div>

              {dependencyPaths.length > 0 && (
                <svg className="gantt-deps" aria-hidden="true">
                  <defs>
                    <marker
                      id="gantt-arrow"
                      markerWidth="8"
                      markerHeight="6"
                      refX="8"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                    </marker>
                  </defs>
                  {dependencyPaths.map((p, i) => (
                    <path
                      key={i}
                      d={p.d}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      markerEnd="url(#gantt-arrow)"
                    />
                  ))}
                </svg>
              )}

              {projectGroups.map(({ project, order }) => (
                <ProjectGroup
                  key={project.id}
                  project={project}
                  order={order}
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
        <span className="legend-item"><span className="legend-milestone">◆</span> веха</span>
        <span className="legend-item">🏖 исполнитель в отпуске</span>
        <span className="legend-item">Заполнение полосы — факт / план</span>
        <span className="legend-item"><span className="legend-swatch legend-swatch--holiday" /> праздник</span>
        <span className="legend-item"><span className="legend-swatch legend-swatch--shortday" /> сокращённый день</span>
        <span className="legend-item">→ зависимость задач</span>
      </div>
    </div>
  );
}

const Gantt_default = memo(Gantt);
export default Gantt_default;