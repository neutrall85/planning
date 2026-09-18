// src/hooks/useTaskSelectOptions.js
import { useMemo } from 'react';
import { PRIORITIES, TASK_STATUS_ORDER, TASK_STATUSES, DEPENDENCY_TYPES } from '../utils/constants';
import { computeScope } from '../utils/permissions';

/**
 * Списки опций для селектов карточки задачи (проект, исполнитель,
 * приоритет, статус, зависимость) и кандидатов для обсуждения задачи.
 *
 * Держим их в одном хуке, а не по одному useMemo прямо в компоненте:
 * все они читают одно и то же db/ur и пересчитываются по одному и тому
 * же поводу - смене проекта/сотрудников - так что раздельные файлы или
 * несколько мест вызова дали бы только лишнее дробление без выигрыша.
 */
export function useTaskSelectOptions({
  db, ur, isProjectLocked, effectiveProjectId, taskId, projectId, isAssignee, canChangeStatus,
}) {
  const projectOptions = useMemo(() => {
    const scope = computeScope(ur, db);
    let list = scope.all ? db.projects : db.projects.filter(p => scope.projIds.has(p.id));
    const filtered = list.filter(p => p.status === 'active' && !p.archived);
    const options = [
      { value: '', label: '- Выберите проект -' },
      ...filtered.map(p => ({ value: p.id, label: `${p.code} - ${p.name}${p.ptype === 'admin' ? ' (административный)' : ''}` }))
    ];
    if (isProjectLocked && effectiveProjectId) {
      const exists = options.some(opt => opt.value === effectiveProjectId);
      if (!exists) {
        const proj = db.projects.find(p => p.id === effectiveProjectId);
        if (proj) {
          options.push({ value: proj.id, label: `${proj.code} - ${proj.name}${proj.ptype === 'admin' ? ' (административный)' : ''}` });
        }
      }
    }
    return options;
  }, [db, ur, isProjectLocked, effectiveProjectId]);

  const assigneeOptionsList = useMemo(() => {
    const scope = computeScope(ur, db);
    let list = scope.all ? db.employees : db.employees.filter(e => scope.empIds.has(e.id) || e.id === ur.id);
    const filtered = list.filter(e => !e.fired);
    return [
      { value: '', label: '- Выберите исполнителя -' },
      ...filtered.map(e => ({ value: e.id, label: `${e.last} ${e.first}` }))
    ];
  }, [db, ur]);

  const priorityOptions = useMemo(
    () => Object.entries(PRIORITIES).map(([k, v]) => ({ value: k, label: v.label })),
    []
  );

  const statusOptions = useMemo(() => TASK_STATUS_ORDER.filter(s => {
    if (isAssignee && !canChangeStatus) return ['new', 'inwork', 'review'].includes(s);
    return true;
  }).map(s => ({ value: s, label: TASK_STATUSES[s].label })), [isAssignee, canChangeStatus]);

  const dependencyOptions = useMemo(() => {
    const tasks = db.tasks
      .filter(t => t.id !== taskId && t.projectId === projectId && t.status !== 'closed' && t.status !== 'cancelled')
      .map(t => ({ value: t.id, label: t.title }));
    return [{ value: '', label: '-' }, ...tasks];
  }, [db.tasks, taskId, projectId]);

  const dependencyTypeOptions = useMemo(
    () => Object.entries(DEPENDENCY_TYPES).map(([k, v]) => ({ value: k, label: `${v.label} - ${v.desc}` })),
    []
  );

  const candidates = useMemo(() => {
    const ids = new Set(
      db.tasks
        .filter(t => t.projectId === projectId)
        .map(t => t.assigneeId)
        .filter(Boolean)
    );
    const pj = db.projects.find(p => p.id === projectId);
    if (pj && pj.managerId) ids.add(pj.managerId);
    return [...ids].map(id => db.employees.find(e => e.id === id)).filter(Boolean);
  }, [db, projectId]);

  return {
    projectOptions, assigneeOptionsList, priorityOptions, statusOptions,
    dependencyOptions, dependencyTypeOptions, candidates,
  };
}
