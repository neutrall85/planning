import React, { useState, useMemo, useCallback } from 'react';
import { TODAY, iso, addDays, parseISO, fmtD, fmtDMY } from '../utils/date';
import { TASK_STATUSES, PRIORITIES } from '../utils/constants';
import { useDataHelpers } from '../hooks';
import { computeScope, taskVisible } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import Avatar from './Avatar';
import { getProjectColor } from '../utils/projectHelpers';

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
const buildTaskTree = (tasks) => {
  const map = {};
  const roots = [];
  tasks.forEach(t => { map[t.id] = { ...t, children: [] }; });
  tasks.forEach(t => {
    // ПРИВЕДЕНИЕ К СТРОКЕ – ГЛАВНОЕ ИСПРАВЛЕНИЕ
    const parentId = t.parentTaskId ? String(t.parentTaskId) : null;
    if (parentId && map[parentId]) {
      map[parentId].children.push(map[t.id]);
    } else {
      roots.push(map[t.id]);
    }
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
  const critical = new Set();
  tasks.forEach(t => {
    if (t.dependencyId) {
      const dep = tasks.find(d => d.id === t.dependencyId);
      if (dep && t.deadline === dep.deadline) {
        critical.add(t.id);
        critical.add(dep.id);
      }
    }
  });
  return critical;
};

// ===== СТРОКА ЗАДАЧИ =====
const TaskRow = ({
  task,
  level,
  hasChildren,
  expanded,
  onToggle,
  days,
  DW,
  viewStart,
  viewEnd,
  db,
  openTask,
  getTaskSpent,
  vacOverlap,
  isCritical,
}) => {
  const assignee = task.assigneeId ? db.employees.find(e => e.id === task.assigneeId) : null;
  const project = db.projects.find(p => p.id === task.projectId);

  // Нормализация дат (обрезаем время до YYYY-MM-DD)
  const normalizeDate = (dateStr) => (dateStr ? dateStr.slice(0, 10) : '');

  let sIdx = days.indexOf(normalizeDate(task.start));
  let eIdx = days.indexOf(normalizeDate(task.deadline));

  // Если дата не найдена, но задача покрывает весь видимый диапазон
  if (sIdx === -1 && eIdx === -1) {
    if (task.start < viewStart && task.deadline > viewEnd) {
      sIdx = 0;
      eIdx = days.length - 1;
    } else return null;
  }
  // Если одна из дат не найдена, но другая есть – пытаемся найти по другой
  if (sIdx === -1 && eIdx !== -1) {
    const startDate = parseISO(task.start);
    const deadlineDate = parseISO(task.deadline);
    const diffDays = Math.round((deadlineDate - startDate) / 86400000);
    const possibleStartIdx = eIdx - diffDays;
    if (possibleStartIdx >= 0) sIdx = possibleStartIdx;
    else sIdx = 0;
  }
  if (eIdx === -1 && sIdx !== -1) {
    const startDate = parseISO(task.start);
    const deadlineDate = parseISO(task.deadline);
    const diffDays = Math.round((deadlineDate - startDate) / 86400000);
    const possibleEndIdx = sIdx + diffDays;
    if (possibleEndIdx < days.length) eIdx = possibleEndIdx;
    else eIdx = days.length - 1;
  }

  if (sIdx === -1 || eIdx === -1 || sIdx > eIdx) return null;

  const left = sIdx * DW + 2;
  const w = Math.max((eIdx - sIdx + 1) * DW - 4, DW - 8);
  const sp = getTaskSpent(task);
  const pct = Math.min(100, (sp / Math.max(1, task.plannedHours || 0)) * 100);
  const fillWidth = pct > 0 ? Math.max(pct, 2) : 0;
  const vac = assignee ? vacOverlap(assignee.id, task.start, task.deadline) : null;
  const isMilestone = task.start === task.deadline;
  const priorityColor = PRIORITIES[task.priority]?.color || '#64748b';
  const bgColor = priorityColor + '33';

  const tooltipLines = [
    `${task.title}`,
    `Проект: ${project?.code || '—'}`,
    `Статус: ${TASK_STATUSES[task.status]?.label || task.status}`,
    `Приоритет: ${PRIORITIES[task.priority]?.label || task.priority}`,
    `План: ${task.plannedHours ?? '—'} ч, Факт: ${sp} ч`,
    `Срок: ${fmtD(task.start)} — ${fmtD(task.deadline)}`,
    ...(assignee ? [`Исполнитель: ${assignee.last} ${assignee.first}`] : []),
    ...(vac ? [`⚠️ В отпуске ${fmtDMY(vac.start)}–${fmtDMY(vac.end)}`] : []),
    ...(isCritical ? ['🔴 Критическая задача'] : []),
  ].join('\n');

  return (
    <div className={`gantt-row${level > 0 ? ' gantt-row-child' : ''}${isCritical ? ' gantt-critical' : ''} relative`}>
      <div 
        className="gantt-label" 
        onClick={() => openTask(task.id)}
        style={{ '--indent-level': level * 20 + 'px' }}
      >
        <div className="flex items-center gap-1">
          {hasChildren && (
            <button
              className={`gantt-expand-btn${expanded ? ' expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(task.id);
              }}
              title={expanded ? 'Свернуть' : 'Развернуть'}
            >
              ▶
            </button>
          )}
          <span className={`gtitle${task.status === 'cancelled' ? ' dim' : ''}`}>
            {task.title}
          </span>
        </div>
        <span className="gsub">
          {assignee && <Avatar employee={assignee} size="xs" />} · {task.plannedHours ?? '—'} ч · {TASK_STATUSES[task.status]?.label || task.status}
        </span>
      </div>
      <div className="gantt-track">
        {isMilestone ? (
          <div className="gantt-milestone" style={{ left: left + w/2 - 8, top: 8, borderColor: priorityColor }} title={tooltipLines} />
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
            onClick={() => openTask(task.id)}
            title={tooltipLines}
          >
            <div className="gbar-fill" />
            {vac && <span className="gbar-vac">🏖</span>}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== ГРУППА ПРОЕКТА =====
const ProjectGroup = ({
  project,
  tasks,
  days,
  DW,
  viewStart,
  viewEnd,
  db,
  openTask,
  openProject,
  getTaskSpent,
  vacOverlap,
  expandedTasks,
  setExpandedTasks,
  criticalIds,
  cornerWidth,
}) => {
  const projectColor = getProjectColor(project);
  const tree = buildTaskTree(tasks);
  const flat = flattenTree(tree);

  const renderRows = () => {
    const rows = [];
    const visited = new Set();
    const traverse = (node, level = 0) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      const isExpanded = expandedTasks.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      rows.push(
        <TaskRow
          key={node.id}
          task={node}
          level={level}
          hasChildren={hasChildren}
          expanded={isExpanded}
          onToggle={(id) => {
            setExpandedTasks((prev) => {
              const newSet = new Set(prev);
              if (newSet.has(id)) newSet.delete(id);
              else newSet.add(id);
              return newSet;
            });
          }}
          days={days}
          DW={DW}
          viewStart={viewStart}
          viewEnd={viewEnd}
          db={db}
          openTask={openTask}
          getTaskSpent={getTaskSpent}
          vacOverlap={vacOverlap}
          isCritical={criticalIds.has(node.id)}
        />
      );
      if (isExpanded) {
        node.children.forEach((child) => traverse(child, level + 1));
      }
    };
    tree.forEach((root) => traverse(root));
    return rows;
  };

  const rows = renderRows();
  if (rows.length === 0) return null;

  return (
    <div key={project.id}>
      <div className="gantt-group">
        <div
          className="gantt-group-name cursor-pointer underline"
          onClick={() => openProject && openProject(project.id)}
          title="Открыть проект"
        >
          <span className="pdot" style={{ background: projectColor }} />
          {project.code} · {project.name}
          <span className="mut sm ml-2">({rows.length} задач)</span>
        </div>
        <div style={{ width: days.length * DW }} />
      </div>
      {rows}
    </div>
  );
};

// ===== ОСНОВНОЙ КОМПОНЕНТ =====
export default function Gantt({ db, ur, openTask, openProject }) {
  const { getTaskSpent, vacOverlap } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  const [filters, setFilters] = useState({
    projectId: 'all',
    assigneeId: 'all',
    status: 'all',
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const DW_BASE = 34;
  const DW = Math.round(DW_BASE * zoomLevel);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(() => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [cornerWidth, setCornerWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);

  // Обработчик перетаскивания разделителя
  const handleResizerMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = cornerWidth;

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(150, Math.min(500, startWidth + diff));
      setCornerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [cornerWidth]);

  const getDaysInRange = useCallback((anchorDate, mode) => {
    const start = parseISO(anchorDate);
    const days = [];
    if (mode === 'month') {
      const year = start.getFullYear();
      const month = start.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 0; i < daysInMonth; i++) {
        days.push(iso(new Date(year, month, i + 1)));
      }
    } else if (mode === 'quarter') {
      for (let i = 0; i < 90; i++) {
        days.push(iso(addDays(start, i)));
      }
    } else {
      for (let i = 0; i < 365; i++) {
        days.push(iso(addDays(start, i)));
      }
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

  // Получаем все задачи (исключаем только закрытые и отменённые)
  const allTasks = useMemo(() => {
    let tasks = db.tasks.filter(
      (t) =>
        !t.archived &&
        taskVisible(ur, scope, t, db) &&
        t.start &&
        t.deadline &&
        !['closed', 'cancelled'].includes(t.status)
    );
    // Нормализуем даты (обрезаем время до YYYY-MM-DD)
    tasks = tasks.map(t => ({
      ...t,
      start: t.start ? t.start.slice(0, 10) : null,
      deadline: t.deadline ? t.deadline.slice(0, 10) : null,
    }));
    if (filters.projectId !== 'all') tasks = tasks.filter((t) => t.projectId === filters.projectId);
    if (filters.assigneeId !== 'all') tasks = tasks.filter((t) => t.assigneeId === filters.assigneeId);
    if (filters.status !== 'all') tasks = tasks.filter((t) => t.status === filters.status);
    return tasks;
  }, [db.tasks, ur, scope, filters]);

  // Группировка по проектам
  const projectGroups = useMemo(() => {
    const groups = new Map();
    allTasks.forEach((t) => {
      if (!groups.has(t.projectId)) {
        const project = db.projects.find((p) => p.id === t.projectId);
        if (project) groups.set(t.projectId, { project, tasks: [] });
      }
      const group = groups.get(t.projectId);
      if (group) group.tasks.push(t);
    });
    return Array.from(groups.values());
  }, [allTasks, db.projects]);

  const criticalIds = useMemo(() => computeCriticalPath(allTasks), [allTasks]);

  const projectOptions = useMemo(() => {
    const ids = new Set(allTasks.map((t) => t.projectId));
    return db.projects.filter((p) => ids.has(p.id));
  }, [allTasks, db.projects]);

  const assigneeOptions = useMemo(() => {
    const ids = new Set(allTasks.map((t) => t.assigneeId).filter(Boolean));
    return db.employees.filter((e) => ids.has(e.id));
  }, [allTasks, db.employees]);

  const days = useMemo(() => getDaysInRange(anchor, mode), [anchor, mode, getDaysInRange]);
  const months = useMemo(() => {
    const result = [];
    days.forEach((day, i) => {
      const d = parseISO(day);
      const lbl = `${
        [
          'Январь',
          'Февраль',
          'Март',
          'Апрель',
          'Май',
          'Июнь',
          'Июль',
          'Август',
          'Сентябрь',
          'Октябрь',
          'Ноябрь',
          'Декабрь',
        ][d.getMonth()]
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
  const viewEnd = days[days.length - 1];
  const width = days.length * DW;
  const totalWidth = width + cornerWidth;

  if (projectGroups.length === 0) {
    return (
      <div className="gantt-panel">
        <div className="cal-head p-3 border-b">
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
            <div className="cal-title" style={{ minWidth: '120px', fontSize: '15px', fontWeight: 700 }}>{fmtDMY(anchor)}</div>
            <button className="icon-btn" onClick={() => shift(1)}><Ic d={ICONS.right} size={16} /></button>
          </div>
          <div className="cal-right">
            <div className="seg">
              {[['month','Месяц'], ['quarter','Квартал'], ['year','Год']].map(([m,l]) => (
                <button key={m} className={`seg-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="empty-note p-4">Нет доступных задач в выбранном периоде</div>
      </div>
    );
  }

  return (
    <div className="gantt-panel">
      <div className="gantt-filter-bar">
        <select className="inp sel gantt-filter-select" value={filters.projectId} onChange={(e) => setFilters(prev => ({ ...prev, projectId: e.target.value }))}>
          <option value="all">Все проекты</option>
          {projectOptions.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>
        <select className="inp sel gantt-filter-select" value={filters.assigneeId} onChange={(e) => setFilters(prev => ({ ...prev, assigneeId: e.target.value }))}>
          <option value="all">Все исполнители</option>
          {assigneeOptions.map(e => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
        </select>
        <select className="inp sel gantt-filter-select" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
          <option value="all">Все статусы</option>
          {Object.entries(TASK_STATUSES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
        </select>
        <div className="gantt-zoom">
          <button className="icon-btn" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}>−</button>
          <span className="zoom-value">{Math.round(zoomLevel * 100)}%</span>
          <button className="icon-btn" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}>+</button>
        </div>
        <button className="btn ghost sm" onClick={() => setExpandedTasks(new Set())}>Свернуть всё</button>
        <button className="btn ghost sm" onClick={() => {
          const allIds = [];
          projectGroups.forEach(({ tasks }) => {
            const tree = buildTaskTree(tasks);
            const flat = flattenTree(tree);
            flat.forEach(n => { if (n.hasChildren) allIds.push(n.id); });
          });
          setExpandedTasks(new Set(allIds));
        }}>Развернуть всё</button>
      </div>

      <div className="cal-head p-3 border-b">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
          <div className="cal-title" style={{ minWidth: '120px', fontSize: '15px', fontWeight: 700 }}>{fmtDMY(anchor)}</div>
          <button className="icon-btn" onClick={() => shift(1)}><Ic d={ICONS.right} size={16} /></button>
        </div>
        <div className="cal-right">
          <div className="seg">
            {[['month','Месяц'], ['quarter','Квартал'], ['year','Год']].map(([m,l]) => (
              <button key={m} className={`seg-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="gantt-scroll">
        <div className="gantt" style={{ '--gantt-width': totalWidth + 'px', '--corner-width': cornerWidth + 'px' }}>
          <div className="gantt-top">
            <div className="gantt-corner">
              Проект / задача
              <div 
                className={`gantt-resizer${isResizing ? ' dragging' : ''}`}
                onMouseDown={handleResizerMouseDown}
              />
            </div>
            <div className="gantt-axis" style={{ width }}>
              <div className="gantt-months" style={{ display: 'flex', flexWrap: 'nowrap', width }}>
                {months.map((m, i) => (
                  <div key={i} className="gantt-month" style={{ width: (m.to - m.from + 1) * DW, flex: 'none' }}>{m.label}</div>
                ))}
              </div>
              <div className="gantt-days" style={{ display: 'flex', flexWrap: 'nowrap', width }}>
                {days.map(d => {
                  const dt = parseISO(d);
                  const wk = dt.getDay();
                  return (
                    <div key={d} className={`gday${wk === 0 || wk === 6 ? ' wk' : ''}${d === TODAY ? ' td' : ''}`} style={{ width: DW, flex: 'none', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
                      {dt.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="gantt-body">
            <div className="gantt-grid" style={{ width, left: cornerWidth }}>
              {days.map(d => <div key={d} className={`gcell${[0,6].includes(parseISO(d).getDay()) ? ' wk' : ''}`} style={{ width: DW, flex: 'none' }} />)}
              <div className="gtoday" style={{ left: days.indexOf(TODAY) * DW + DW/2 }} />
            </div>
            {projectGroups.map(({ project, tasks }) => (
              <ProjectGroup
                key={project.id}
                project={project}
                tasks={tasks}
                days={days}
                DW={DW}
                viewStart={viewStart}
                viewEnd={viewEnd}
                db={db}
                openTask={openTask}
                openProject={openProject}
                getTaskSpent={getTaskSpent}
                vacOverlap={vacOverlap}
                expandedTasks={expandedTasks}
                setExpandedTasks={setExpandedTasks}
                criticalIds={criticalIds}
                cornerWidth={cornerWidth}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="gantt-legend p-2 border-t flex flex-wrap gap-4 items-center">
        <span className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }} /> сегодня</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#e2e8f0' }} /> выходные</span>
        <span className="legend-item"><span className="legend-dot milestone" /> веха</span>
        <span className="legend-item"><span className="legend-dot critical" /> критический путь</span>
        <span className="legend-item">🏖 — исполнитель в отпуске</span>
        <span className="legend-item">Заполнение полосы — факт / план</span>
      </div>
    </div>
  );
}