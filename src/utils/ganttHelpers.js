// utils/ganttHelpers.js
import { parseISO } from './date';

export const buildTaskTree = (tasks) => {
  const map = {};
  const roots = [];
  tasks.forEach(t => { map[t.id] = { ...t, children: [] }; });
  tasks.forEach(t => {
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

export const flattenTree = (nodes, level = 0, acc = []) => {
  nodes.forEach(node => {
    acc.push({ ...node, level, hasChildren: node.children.length > 0 });
    flattenTree(node.children, level + 1, acc);
  });
  return acc;
};

export const computeCriticalPath = (tasks) => {
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

export const computeTaskIndices = (task, days, viewStart, viewEnd) => {
  const normalizeDate = (dateStr) => (dateStr ? dateStr.slice(0, 10) : '');
  let sIdx = days.indexOf(normalizeDate(task.start));
  let eIdx = days.indexOf(normalizeDate(task.deadline));
  if (sIdx === -1 && eIdx === -1) {
    if (task.start < viewStart && task.deadline > viewEnd) {
      sIdx = 0;
      eIdx = days.length - 1;
    } else return null;
  }
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
  return { sIdx, eIdx };
};

export const getTasksWord = (count) => {
  const n = Math.abs(count) % 100;
  if (n >= 11 && n <= 19) return 'задач';
  const last = n % 10;
  if (last === 1) return 'задача';
  if (last >= 2 && last <= 4) return 'задачи';
  return 'задач';
};