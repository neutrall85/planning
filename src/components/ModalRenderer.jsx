// src/components/ModalRenderer.jsx
import { useCallback, useMemo } from 'react';
import { useSelector } from '../context/StoreContext';
import {
  TaskModal,
  ProjectModal,
  ChangeRequestModal,
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
  openChangeReq,
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

  const taskDb = useMemo(
    () => ({ tasks, projects, employees, departments, vacations }),
    [tasks, projects, employees, departments, vacations],
  );
  const projectDb = useMemo(
    () => ({ tasks, projects, employees, kbs, departments }),
    [tasks, projects, employees, kbs, departments],
  );
  // Мини-db под модалку запроса изменения: ей нужны только целевые
  // сущности, чтобы показать текущее значение.
  const changeReqDb = useMemo(
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
      // Порядок важен: MainLayout полагается на то, что к моменту,
      // когда route-эффект увидит route ещё указывающим на удалённую
      // задачу, её уже не будет в tasks (см. комментарий в
      // MainLayout.jsx над обработкой ROUTE.TASK). Если сначала
      // переключить модалку на родителя, а task ещё жива в tasks,
      // route-эффект застаёт modal=P, route=S, tasks содержит S -
      // и вызывает openTask(S, ...) заново, открывая уже удаляемую
      // подзадачу. Это гоняет desiredHash/route друг за другом и
      // даёт Maximum update depth exceeded.
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

  /**
   * Создание запроса на изменение.
   *
   * Получатели (директора и админы) собираются здесь и передаются в
   * store.addChangeRequest вторым аргументом — сервис отправит им
   * уведомление. Раньше этот шаг вычислялся, но до сервиса не доходил:
   * директор узнавал о запросе, только если сам открывал раздел.
   */
  const handleChangeReqSubmit = useCallback(async (r) => {
    try {
      const recipientIds = employees
        .filter(e =>
          !e.fired && (e.roles.includes('director') || e.roles.includes('admin'))
        )
        .map(e => e.id);
      store.addChangeRequest(r, recipientIds);
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

  const handleVacationDelete = useCallback(async (id) => {
    store.deleteVacation(id);
  }, [store]);

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
          highlightFileId={modal.highlightFileId || null}
          highlightFolderId={modal.highlightFolderId || null}
          onClose={closeTaskWithReturn}
          onCopy={handleCopyFromModal}
          onTabChange={onTabChange}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
          onChangeReq={openChangeReq}
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
          highlightFileId={modal.highlightFileId || null}
          highlightFolderId={modal.highlightFolderId || null}
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

    case 'changeReq':
      return (
        <ChangeRequestModal
          db={changeReqDb}
          ur={ur}
          changeKind={modal.changeKind}
          targetType={modal.targetType}
          targetId={modal.targetId}
          onClose={onClose}
          onSubmit={handleChangeReqSubmit}
          toast={toast}
        />
      );

    case 'roles':
      return (
        <RolesModal store={store} empId={modal.empId} onClose={onClose} toast={toast} />
      );

    case 'depts':
      return (
        <DeptsModal store={store} empId={modal.empId} onClose={onClose} toast={toast} />
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
          onDelete={handleVacationDelete}
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
        <CreateEmployeeModal store={store} ur={ur} onClose={onClose} toast={toast} />
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