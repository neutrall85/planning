import { useMemo } from 'react';

export const useDataHelpers = (data) => {
  const empName = (id) => {
    if (!data || !data.employees) return '—';
    const e = data.employees.find(x => x.id === id);
    return e ? `${e.last} ${e.first}` : '—';
  };

  const primaryDept = (emp) => {
    if (!emp || !data || !data.departments) return null;
    const p = emp.departments?.find(x => x.primary) || emp.departments?.[0];
    return p ? data.departments.find(d => d.id === p.deptId) : null;
  };

  const getTaskSpent = (task) => {
    if (!task || !task.logs || !Array.isArray(task.logs)) return 0;
    return task.logs.reduce((s, l) => s + (l.hours || 0), 0);
  };

  const getProjectStats = (projectId) => {
    if (!data || !data.tasks) return { plan: 0, fact: 0, count: 0 };
    const tasks = data.tasks.filter(t => t.projectId === projectId && !t.archived);
    const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
    const fact = tasks.reduce((s, t) => s + getTaskSpent(t), 0);
    return { plan, fact, count: tasks.length };
  };

  const getEmployeeLoad = (empId) => {
    if (!data || !data.tasks) return { plan: 0, cnt: 0 };
    const active = data.tasks.filter(t => !t.archived && (t.assigneeIds || []).includes(empId) && !['closed','cancelled'].includes(t.status));
    return { plan: active.reduce((s, t) => s + (t.plannedHours || 0), 0), cnt: active.length };
  };

  const vacOverlap = (empId, from, to) => {
    if (!data || !data.vacations || !from || !to) return null;
    return data.vacations.find(v => v.empId === empId && v.status === 'approved' && v.start <= to && v.end >= from) || null;
  };

  return { empName, primaryDept, getTaskSpent, getProjectStats, getEmployeeLoad, vacOverlap };
};