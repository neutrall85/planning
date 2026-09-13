import { useMemo } from 'react';
import { computeScope, assigneeOptions as getAssigneeOptions } from '../utils/permissions';

export const useProjectOptions = (db, ur, filters = {}) => {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  return useMemo(() => {
    let projects = scope.all ? db.projects : db.projects.filter(p => scope.projIds.has(p.id));
    if (filters.activeOnly) projects = projects.filter(p => p.status === 'active' && !p.archived);
    if (filters.includeArchived) projects = projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled');
    return projects.sort((a, b) => a.code.localeCompare(b.code));
  }, [db.projects, scope, filters]);
};

export const useAssigneeOptions = (db, ur, filters = {}) => {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  return useMemo(() => {
    let employees = scope.all ? db.employees : db.employees.filter(e => scope.empIds.has(e.id) || e.id === ur.id);
    if (filters.excludeFired) employees = employees.filter(e => !e.fired);
    if (filters.excludeSelf) employees = employees.filter(e => e.id !== ur.id);
    return employees.sort((a, b) => a.last.localeCompare(b.last));
  }, [db.employees, scope, filters]);
};

export const useDepartmentOptions = (db) => {
  return useMemo(() => db.departments.sort((a, b) => a.name.localeCompare(b.name)), [db.departments]);
};

export const useKbOptions = (db) => {
  return useMemo(() => db.kbs.sort((a, b) => a.name.localeCompare(b.name)), [db.kbs]);
};