// src/hooks/useDb.js
import { useMemo } from 'react';
import { useSelector } from '../context/StoreContext';

/**
 * Точечные подписки на срезы стора, из которых собирается «db» для
 * конкретной вьюхи.
 *
 * ВАЖНО. Любой пресет, чьи потребители вызывают computeScope / taskVisible /
 * projectVisible, ОБЯЗАН включать departments: computeBaseScope обращается
 * к db.departments при расчёте видимости для ролей kb_chief / head.
 * Отсутствие departments — молчаливое падение с TypeError, как было
 * в useScheduleDb (Gantt / Calendar ломались под КБ-ролями).
 */

// Пресеты, которым нужен полный набор полей для scope-вычислений.
// Используйте useTasksDb / useScopeDb, если компонент вызывает
// computeScope, taskVisible или projectVisible.

export const useTasksDb = () => {
  const tasks = useSelector((s) => s.tasks);
  const projects = useSelector((s) => s.projects);
  const employees = useSelector((s) => s.employees);
  const departments = useSelector((s) => s.departments);

  return useMemo(
    () => ({ tasks, projects, employees, departments }),
    [tasks, projects, employees, departments],
  );
};

/**
 * Явный пресет для компонентов, которым нужен «db, полный по scope».
 *
 * По составу идентичен useTasksDb, но имя выражает намерение: «я буду
 * звать computeScope / taskVisible и мне нужны все четыре среза».
 * Если однажды computeScope начнёт требовать ещё какой-то срез,
 * правится только этот хук — и все его потребители получат его
 * автоматически.
 */
export const useScopeDb = () => {
  const tasks = useSelector((s) => s.tasks);
  const projects = useSelector((s) => s.projects);
  const employees = useSelector((s) => s.employees);
  const departments = useSelector((s) => s.departments);

  return useMemo(
    () => ({ tasks, projects, employees, departments }),
    [tasks, projects, employees, departments],
  );
};

export const useScheduleDb = () => {
  const tasks = useSelector((s) => s.tasks);
  const projects = useSelector((s) => s.projects);
  const employees = useSelector((s) => s.employees);
  const departments = useSelector((s) => s.departments);

  return useMemo(
    () => ({ tasks, projects, employees, departments }),
    [tasks, projects, employees, departments],
  );
};

export const useStaffDb = () => {
  const employees = useSelector((s) => s.employees);
  const departments = useSelector((s) => s.departments);
  const kbs = useSelector((s) => s.kbs);
  const vacations = useSelector((s) => s.vacations);
  const tasks = useSelector((s) => s.tasks);

  return useMemo(
    () => ({ employees, departments, kbs, vacations, tasks }),
    [employees, departments, kbs, vacations, tasks],
  );
};

export const useReportsDb = () => {
  const tasks = useSelector((s) => s.tasks);
  const projects = useSelector((s) => s.projects);
  const employees = useSelector((s) => s.employees);
  const departments = useSelector((s) => s.departments);
  const kbs = useSelector((s) => s.kbs);
  const vacations = useSelector((s) => s.vacations);

  return useMemo(
    () => ({ tasks, projects, employees, departments, kbs, vacations }),
    [tasks, projects, employees, departments, kbs, vacations],
  );
};

export const useWorkloadDb = () => {
  const employees = useSelector((s) => s.employees);
  const departments = useSelector((s) => s.departments);
  const kbs = useSelector((s) => s.kbs);
  const projects = useSelector((s) => s.projects);
  const tasks = useSelector((s) => s.tasks);

  return useMemo(
    () => ({ employees, departments, kbs, projects, tasks }),
    [employees, departments, kbs, projects, tasks],
  );
};

export const useRequestsDb = () => {
  const changeRequests = useSelector((s) => s.changeRequests);
  const vacations = useSelector((s) => s.vacations);
  const roleDelegations = useSelector((s) => s.roleDelegations);
  const regRequests = useSelector((s) => s.regRequests);
  const tasks = useSelector((s) => s.tasks);
  const projects = useSelector((s) => s.projects);
  const employees = useSelector((s) => s.employees);

  return useMemo(
    () => ({
      changeRequests, vacations, roleDelegations, regRequests,
      tasks, projects, employees,
    }),
    [
      changeRequests, vacations, roleDelegations, regRequests,
      tasks, projects, employees,
    ],
  );
};

export const useJournalDb = () => {
  const audit = useSelector((s) => s.audit);
  const employees = useSelector((s) => s.employees);

  return useMemo(
    () => ({ audit, employees }),
    [audit, employees],
  );
};

export const useCabinetDb = () => {
  const tasks = useSelector((s) => s.tasks);
  const projects = useSelector((s) => s.projects);
  const employees = useSelector((s) => s.employees);
  const departments = useSelector((s) => s.departments);
  const kbs = useSelector((s) => s.kbs);
  const vacations = useSelector((s) => s.vacations);
  const roleDelegations = useSelector((s) => s.roleDelegations);

  return useMemo(
    () => ({
      tasks, projects, employees, departments,
      kbs, vacations, roleDelegations,
    }),
    [
      tasks, projects, employees, departments,
      kbs, vacations, roleDelegations,
    ],
  );
};