// hooks/useGanttData.js
import { useMemo } from 'react';
import { taskVisible } from '../utils/permissions';
import { computeScope } from '../utils/permissions';
import { buildTaskTree, computeCriticalPath, computeTaskIndices } from '../utils/ganttHelpers';
import { parseISO } from '../utils/date';

export const useGanttData = ({
  db,
  ur,
  filters,
  expandedTasks,
  mode,
  anchor,
  cornerWidth,
  DW,
  getDaysInRange,
}) => {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  // Базовые задачи (без фильтров)
  const baseTasks = useMemo(() => {
    let tasks = db.tasks.filter(
      (t) =>
        !t.archived &&
        taskVisible(ur, scope, t, db) &&
        t.start &&
        t.deadline &&
        !['closed', 'cancelled'].includes(t.status)
    );
    return tasks.map(t => ({
      ...t,
      start: t.start ? t.start.slice(0, 10) : null,
      deadline: t.deadline ? t.deadline.slice(0, 10) : null,
    }));
  }, [db.tasks, ur, scope]);

  // Отфильтрованные задачи
  const allTasks = useMemo(() => {
    let tasks = baseTasks;
    if (filters.projectId !== 'all') tasks = tasks.filter((t) => t.projectId === filters.projectId);
    if (filters.assigneeId !== 'all') tasks = tasks.filter((t) => t.assigneeId === filters.assigneeId);
    if (filters.status !== 'all') tasks = tasks.filter((t) => t.status === filters.status);
    return tasks;
  }, [baseTasks, filters]);

  // Проекты для фильтра
  const projectOptions = useMemo(() => {
    const ids = new Set(baseTasks.map((t) => t.projectId).filter(Boolean));
    return db.projects.filter((p) => ids.has(p.id));
  }, [baseTasks, db.projects]);

  // Исполнители для фильтра
  const tasksForAssignee = useMemo(() => {
    let tasks = baseTasks;
    if (filters.projectId !== 'all') tasks = tasks.filter((t) => t.projectId === filters.projectId);
    return tasks;
  }, [baseTasks, filters.projectId]);

  const assigneeOptions = useMemo(() => {
    const ids = new Set(tasksForAssignee.map((t) => t.assigneeId).filter(Boolean));
    return db.employees.filter((e) => ids.has(e.id));
  }, [tasksForAssignee, db.employees]);

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

  // Дни и месяцы
  const days = useMemo(() => getDaysInRange(anchor, mode), [anchor, mode, getDaysInRange]);
  const viewStart = days[0];
  const viewEnd = days[days.length - 1];

  const months = useMemo(() => {
    const result = [];
    days.forEach((day, i) => {
      const d = parseISO(day);
      const lbl = `${['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][d.getMonth()]} ${d.getFullYear()}`;
      if (!result.length || result[result.length - 1].label !== lbl) {
        result.push({ label: lbl, from: i, to: i });
      } else {
        result[result.length - 1].to = i;
      }
    });
    return result;
  }, [days]);

  const width = days.length * DW;
  const totalWidth = width + cornerWidth;

  // Позиции задач для стрелок
  const ROW_HEIGHT = 46;
  const GROUP_HEADER_HEIGHT = 40;

  const taskPositions = useMemo(() => {
    const positions = [];
    projectGroups.forEach((group, groupIndex) => {
      const tree = buildTaskTree(group.tasks);
      let localRowIndex = 0;
      const traverse = (node) => {
        const isExpanded = expandedTasks.has(node.id);
        const indices = computeTaskIndices(node, days, viewStart, viewEnd);
        if (indices) {
          const { sIdx, eIdx } = indices;
          const left = sIdx * DW + 2;
          const width = Math.max((eIdx - sIdx + 1) * DW - 4, DW - 8);
          const top = groupIndex * GROUP_HEADER_HEIGHT + localRowIndex * ROW_HEIGHT;
          positions.push({
            id: node.id,
            left,
            width,
            right: left + width,
            top,
            height: ROW_HEIGHT,
            dependencyId: node.dependencyId,
          });
          localRowIndex++;
        }
        if (isExpanded) {
          node.children.forEach(child => traverse(child));
        }
      };
      tree.forEach(root => traverse(root));
    });
    return positions;
  }, [projectGroups, days, DW, viewStart, viewEnd, expandedTasks]);

  // Линии зависимостей
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

  return {
    baseTasks,
    allTasks,
    projectOptions,
    assigneeOptions,
    projectGroups,
    criticalIds,
    days,
    viewStart,
    viewEnd,
    months,
    width,
    totalWidth,
    taskPositions,
    dependencyLines,
  };
};