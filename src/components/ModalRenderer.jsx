// src/components/ModalRenderer.jsx
import { useCallback, useMemo } from 'react';
import { useSelector } from '../context/StoreContext';
import {
  TaskModal,
  ProjectModal,
  HoursRequestModal,
  RolesModal,
  DeptsModal,
  VacationModal,
  DelegationModal,
  VacNowModal,
  CreateEmployeeModal,
  EditEmployeeModal,
  YearCalendarModal,
  EmployeeTasksModal,
} from './Modals';
import { TemplateModal } from './Templates';
import { collectTaskPayloads } from '../utils/templateNesting';

export default function ModalRenderer({
  modal,
  onClose,
  ur,
  store,
  openTask,
  openProject,
  openHoursReq,
  openEmployeeTasks,
  openCopyTask,
  openCopyProject,
  onTabChange,
  toast,
}) {
  const tasks       = useSelector(s => s.tasks);
  const projects    = useSelector(s => s.projects);
  const employees   = useSelector(s => s.employees);
  const vacations   = useSelector(s => s.vacations);
  const departments = useSelector(s => s.departments);
  const kbs         = useSelector(s => s.kbs);

  // Мини-db под каждую модалку: изменение vacations не должно пересоздавать
  // ссылку db у ProjectModal и HoursRequestModal, которым vacations не нужен.
  // ModalRenderer всё равно подписан на все шесть срезов, но модалка
  // перерисовывается только если поменялся её собственный набор.
  const taskDb = useMemo(
    () => ({ tasks, projects, employees, departments, vacations }),
    [tasks, projects, employees, departments, vacations],
  );
  const projectDb = useMemo(
    () => ({ tasks, projects, employees, kbs }),
    [tasks, projects, employees, kbs],
  );
  const hoursDb = useMemo(
    () => ({ tasks, projects }),
    [tasks, projects],
  );
  const vacationDb = useMemo(
    () => ({ employees, departments, kbs, vacations }),
    [employees, departments, kbs, vacations],
  );
  const delegationDb = useMemo(
    () => ({ employees }),
    [employees],
  );
  const vacNowDb = useMemo(
    () => ({ employees, departments, kbs, vacations }),
    [employees, departments, kbs, vacations],
  );
  const employeeTasksDb = useMemo(
    () => ({ employees, tasks, projects }),
    [employees, tasks, projects],
  );

  const handleError = useCallback((error) => {
    console.error(error);
    if (toast) toast(error.message || 'Произошла ошибка', 'error');
  }, [toast]);

  const reportTemplateResult = useCallback((label, res) => {
    if (!res) return;
    if (res.failed > 0) {
      toast?.(`${label}: создано ${res.created}, с ошибками ${res.failed}`, 'warning');
    } else if (res.created > 0) {
      toast?.(`${label}: создано ${res.created}`, 'success');
    }
  }, [toast]);

  const closeTaskWithReturn = useCallback(() => {
    if (modal.returnToEmployeeTasksId) {
      openEmployeeTasks(modal.returnToEmployeeTasksId);
      return;
    }
    if (modal.returnToTaskId) {
      openTask(modal.returnToTaskId, modal.returnToTaskTab || 'subtasks');
      return;
    }
    if (modal.returnToProjectId) {
      openProject(modal.returnToProjectId, modal.returnToProjectTab || 'info');
      return;
    }
    onClose();
  }, [modal, onClose, openEmployeeTasks, openTask, openProject]);

  const closeProjectWithReturn = useCallback(() => {
    if (modal.returnToProjectId) {
      openProject(modal.returnToProjectId, modal.returnToProjectTab || 'info');
      return;
    }
    onClose();
  }, [modal, onClose, openProject]);

  // Копирование, инициированное кнопкой "Копировать" в футере модалки.
  // Отличие от копирования из контекстного меню карточки в канбане/
  // списке/календаре: при копировании изнутри модалки пользователь
  // ожидает возврата в исходную сущность (кнопка "Назад" и закрытие
  // через X). При копировании из меню карточки возврат не нужен -
  // закрытие уводит с копии, пользователь остаётся на исходном экране.
  //
  // Один обработчик на задачу и проект: контекст копирования известен
  // из modal.type, поэтому ветвление внутри - честнее, чем две почти
  // идентичные обёртки. Колбэк стабилен, пока не сменился тип модалки
  // (строковое сравнение в deps), значит проп onCopy у модалок не
  // пересоздаётся между рендерами одного и того же modal.type.
  //
  // Вторая ветка копирования - из канбана/списка/календаря - не проходит
  // через ModalRenderer: buildTaskMenu / buildProjectMenu вызывают
  // openCopyTask / openCopyProject напрямую, без флага returnToModal.
  const copySourceType = modal?.type;

  const handleCopyFromModal = useCallback((sourceId) => {
    if (copySourceType === 'task') {
      openCopyTask(sourceId, { returnToModal: true });
    } else if (copySourceType === 'project') {
      openCopyProject(sourceId, { returnToModal: true });
    }
  }, [copySourceType, openCopyTask, openCopyProject]);

  const handleTaskSave = useCallback(async (task, isNew, extras = {}) => {
    try {
      await store.upsertTask(task);
      if (extras.templateSubtasks?.length) {
        const res = store.instantiateTemplateSubtasks(task.id, extras.templateSubtasks);
        reportTemplateResult('Подзадачи из шаблона', res);
      }
      closeTaskWithReturn();
    } catch (error) {
      handleError(error);
    }
  }, [store, reportTemplateResult, closeTaskWithReturn, handleError]);

  const handleTaskDelete = useCallback(async (id) => {
    try {
      await store.deleteTask(id);
      closeTaskWithReturn();
    } catch (error) {
      handleError(error);
    }
  }, [store, closeTaskWithReturn, handleError]);

  const handleProjectSave = useCallback(async (p, isNew, extras = {}) => {
    try {
      await store.upsertProject(p);
      if (extras.templateTasks?.length) {
        const res = store.instantiateTemplateTasks(p.id, extras.templateTasks);
        reportTemplateResult('Задачи из шаблона', res);
      }
      closeProjectWithReturn();
    } catch (error) {
      handleError(error);
    }
  }, [store, reportTemplateResult, closeProjectWithReturn, handleError]);

  const handleProjectDelete = useCallback(async (id) => {
    try {
      await store.deleteProject(id);
      closeProjectWithReturn();
    } catch (error) {
      handleError(error);
    }
  }, [store, closeProjectWithReturn, handleError]);

  const handleHoursSubmit = useCallback(async (r) => {
    try {
      const directorIds = employees
        .filter(e => e.roles.includes('director') && !e.fired)
        .map(e => e.id);
      store.addHoursRequest(r, directorIds);
      onClose();
    } catch (error) {
      handleError(error);
    }
  }, [employees, store, onClose, handleError]);

  const handleVacationSave = useCallback(async (v) => {
    try {
      await store.upsertVacation(v);
      onClose();
    } catch (error) {
      handleError(error);
    }
  }, [store, onClose, handleError]);

  const handleDelegationSubmit = useCallback(async (rd) => {
    try {
      await store.upsertRoleDelegation(rd);
      store.notifyRoleDelegationCreated(rd);
      onClose();
    } catch (error) {
      handleError(error);
    }
  }, [store, onClose, handleError]);

  if (!modal) return null;

  switch (modal.type) {
    case 'task':
      return (
        <TaskModal
          db={taskDb}
          ur={ur}
          taskId={modal.taskId}
          copyFromId={modal.copyFromId}
          initialTab={modal.initialTab || 'form'}
          parentTaskId={modal.parentTaskId}
          initialProjectId={modal.initialProjectId}
          returnToProjectId={modal.returnToProjectId}
          returnToTaskId={modal.returnToTaskId}
          returnToEmployeeTasksId={modal.returnToEmployeeTasksId}
          onClose={closeTaskWithReturn}
          onCopy={handleCopyFromModal}
          onTabChange={onTabChange}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
          onHoursReq={openHoursReq}
          store={store}
          openTask={openTask}
          toast={toast}
        />
      );

    case 'project':
      return (
        <ProjectModal
          db={projectDb}
          ur={ur}
          projectId={modal.projectId}
          copyFromId={modal.copyFromId}
          returnToProjectId={modal.returnToProjectId}
          initialTab={modal.initialTab || 'info'}
          onClose={closeProjectWithReturn}
          onCopy={handleCopyFromModal}
          onTabChange={onTabChange}
          onSave={handleProjectSave}
          onDelete={handleProjectDelete}
          store={store}
          openTask={openTask}
          toast={toast}
        />
      );

    case 'hours':
      return (
        <HoursRequestModal
          db={hoursDb}
          ur={ur}
          kind={modal.kind}
          targetId={modal.targetId}
          onClose={onClose}
          onSubmit={handleHoursSubmit}
          toast={toast}
        />
      );

    case 'roles':
      return (
        <RolesModal
          store={store}
          empId={modal.empId}
          onClose={onClose}
          toast={toast}
        />
      );

    case 'depts':
      return (
        <DeptsModal
          store={store}
          empId={modal.empId}
          onClose={onClose}
          toast={toast}
        />
      );

    case 'vacation':
      return (
        <VacationModal
          db={vacationDb}
          ur={ur}
          vacationId={modal.vacationId}
          forEmpId={modal.forEmpId || null}
          onClose={onClose}
          onSave={handleVacationSave}
          toast={toast}
        />
      );

    case 'delegation':
      return (
        <DelegationModal
          db={delegationDb}
          ur={ur}
          onClose={onClose}
          onSubmit={handleDelegationSubmit}
          toast={toast}
        />
      );

    case 'vacnow':
      return <VacNowModal db={vacNowDb} onClose={onClose} toast={toast} />;

    case 'yearCalendar':
      return <YearCalendarModal store={store} onClose={onClose} />;

    case 'employeeTasks':
      return (
        <EmployeeTasksModal
          db={employeeTasksDb}
          employeeId={modal.empId}
          openTask={openTask}
          onClose={onClose}
        />
      );

    case 'templateFromTask': {
      const task = tasks.find(t => t.id === modal.taskId);
      if (!task) return null;
      return (
        <TemplateModal
          mode="create"
          kind="task"
          source={task}
          nested={collectTaskPayloads(tasks, task.id)}
          onClose={onClose}
          toast={toast}
        />
      );
    }

    case 'templateFromProject': {
      const project = projects.find(p => p.id === modal.projectId);
      if (!project) return null;
      return (
        <TemplateModal
          mode="create"
          kind="project"
          source={project}
          nested={collectTaskPayloads(
            tasks.filter(t => t.projectId === project.id && !t.archived)
          )}
          onClose={onClose}
          toast={toast}
        />
      );
    }

    case 'createEmployee':
      return (
        <CreateEmployeeModal
          store={store}
          ur={ur}
          onClose={onClose}
          toast={toast}
        />
      );

    case 'editEmployee':
      return (
        <EditEmployeeModal
          store={store}
          ur={ur}
          employeeId={modal.employeeId}
          onClose={onClose}
          toast={toast}
        />
      );

    default:
      return null;
  }
}