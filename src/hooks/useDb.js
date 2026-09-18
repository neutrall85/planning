// src/hooks/useDb.js
import { useMemo } from 'react';
import { useSelector } from '../context/StoreContext';

/**
 * Хуки-пресеты для сборки «db» - объекта с срезами стора, которые
 * нужны конкретной вьюхе.
 *
 * Зачем пресеты, а не точечные useSelector в каждой вьюхе.
 *
 * До этого файла в восьми вьюхах лежал один и тот же паттерн:
 *
 *     const tasks = useSelector(s => s.tasks);
 *     const projects = useSelector(s => s.projects);
 *     const employees = useSelector(s => s.employees);
 *     const departments = useSelector(s => s.departments);
 *     const db = useMemo(() => ({ tasks, projects, employees, departments }),
 *       [tasks, projects, employees, departments]);
 *
 * Проблемы:
 *   - при добавлении нового среза в стор нужно было помнить, каким
 *     вьюхам он нужен, и руками править шесть строк в каждой;
 *   - состав db у двух вьюх с одинаковой ролью мог разъехаться без
 *     видимой причины (например, в одной появлялся vacations, в другой нет);
 *   - шесть строк boilerplate в каждой вьюхе ничего не сообщают о смысле:
 *     «вьюхе нужен db из tasks/projects/employees/departments» читается
 *     хуже, чем «вьюхе нужен useTasksDb()».
 *
 * Почему восемь отдельных хуков, а не один useDb('tasks', 'projects', ...).
 * Аргументы-строки пришлось бы сравнивать каждый рендер (массив
 * пересоздаётся), либо требовать от вызывающего стабильную ссылку на
 * список. Первое ломает мемоизацию, второе - Rules of Hooks
 * (useSelector нельзя вызывать в цикле). Явные пресеты - стабильный
 * контракт: каждый пресет описывает свой набор срезов и не требует
 * от потребителя никаких договорённостей.
 *
 * Пресеты именованы по роли вьюхи, а не по составу. Если состав
 * изменится (вьюхе понадобится ещё срез), поменяется тело одного
 * пресета - все его потребители получат новые срезы автоматически.
 */

export const useTasksDb = () => {
  const tasks       = useSelector(s => s.tasks);
  const projects    = useSelector(s => s.projects);
  const employees   = useSelector(s => s.employees);
  const departments = useSelector(s => s.departments);

  return useMemo(
    () => ({ tasks, projects, employees, departments }),
    [tasks, projects, employees, departments],
  );
};

export const useScheduleDb = () => {
  const tasks     = useSelector(s => s.tasks);
  const projects  = useSelector(s => s.projects);
  const employees = useSelector(s => s.employees);

  return useMemo(
    () => ({ tasks, projects, employees }),
    [tasks, projects, employees],
  );
};

export const useStaffDb = () => {
  const employees   = useSelector(s => s.employees);
  const departments = useSelector(s => s.departments);
  const kbs         = useSelector(s => s.kbs);
  const vacations   = useSelector(s => s.vacations);
  const tasks       = useSelector(s => s.tasks);

  return useMemo(
    () => ({ employees, departments, kbs, vacations, tasks }),
    [employees, departments, kbs, vacations, tasks],
  );
};

export const useReportsDb = () => {
  const tasks       = useSelector(s => s.tasks);
  const projects    = useSelector(s => s.projects);
  const employees   = useSelector(s => s.employees);
  const departments = useSelector(s => s.departments);
  const kbs         = useSelector(s => s.kbs);
  const vacations   = useSelector(s => s.vacations);

  return useMemo(
    () => ({ tasks, projects, employees, departments, kbs, vacations }),
    [tasks, projects, employees, departments, kbs, vacations],
  );
};

export const useWorkloadDb = () => {
  const employees   = useSelector(s => s.employees);
  const departments = useSelector(s => s.departments);
  const kbs         = useSelector(s => s.kbs);
  const projects    = useSelector(s => s.projects);
  const tasks       = useSelector(s => s.tasks);

  return useMemo(
    () => ({ employees, departments, kbs, projects, tasks }),
    [employees, departments, kbs, projects, tasks],
  );
};

export const useRequestsDb = () => {
  const hoursRequests   = useSelector(s => s.hoursRequests);
  const vacations       = useSelector(s => s.vacations);
  const roleDelegations = useSelector(s => s.roleDelegations);
  const regRequests     = useSelector(s => s.regRequests);
  const tasks           = useSelector(s => s.tasks);
  const projects        = useSelector(s => s.projects);
  const employees       = useSelector(s => s.employees);

  return useMemo(
    () => ({
      hoursRequests, vacations, roleDelegations, regRequests,
      tasks, projects, employees,
    }),
    [hoursRequests, vacations, roleDelegations, regRequests,
     tasks, projects, employees],
  );
};

export const useJournalDb = () => {
  const audit     = useSelector(s => s.audit);
  const employees = useSelector(s => s.employees);

  return useMemo(
    () => ({ audit, employees }),
    [audit, employees],
  );
};

export const useCabinetDb = () => {
  const tasks           = useSelector(s => s.tasks);
  const projects        = useSelector(s => s.projects);
  const employees       = useSelector(s => s.employees);
  const departments     = useSelector(s => s.departments);
  const kbs             = useSelector(s => s.kbs);
  const vacations       = useSelector(s => s.vacations);
  const roleDelegations = useSelector(s => s.roleDelegations);

  return useMemo(
    () => ({
      tasks, projects, employees, departments,
      kbs, vacations, roleDelegations,
    }),
    [tasks, projects, employees, departments, kbs, vacations, roleDelegations],
  );
};