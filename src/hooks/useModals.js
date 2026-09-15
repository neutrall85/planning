import { useRef, useState } from 'react';

export function useModals({ store, data, user }) {
  const [modal, setModal] = useState(null);

  // Счётчик монтирований модалок. MainLayout использует его как key у
  // ModalRenderer: при каждом открытии модалка монтируется с нуля, поэтому
  // внутреннее состояние useForm инициализируется новыми initialValues.
  // Без этого React переиспользовал бы инстанс (тот же тип на той же
  // позиции в дереве), и форма показала бы значения предыдущей сущности.
  const seqRef = useRef(0);

  const open = (state) => {
    seqRef.current += 1;
    setModal({ ...state, _seq: seqRef.current });
  };

  const openTask = (
    taskId = null,
    initialTab = 'form',
    parentTaskId = null,
    initialProjectId = null,
    returnToProjectId = null,
    returnToProjectTab = 'info',
    returnToTaskId = null,
    returnToTaskTab = 'subtasks'
  ) =>
    open({
      type: 'task',
      taskId,
      initialTab,
      parentTaskId,
      initialProjectId,
      returnToProjectId,
      returnToProjectTab,
      returnToTaskId,
      returnToTaskTab,
    });

  const openProject = (
    projectId = null,
    initialTab = 'info',
    returnToProjectId = null,
    returnToProjectTab = 'info'
  ) =>
    open({
      type: 'project',
      projectId,
      initialTab,
      returnToProjectId,
      returnToProjectTab,
    });

  const openHoursReq = (kind, targetId) => open({ type: 'hours', kind, targetId });
  const openRoles = (empId) => open({ type: 'roles', empId });
  const openDepts = (empId) => open({ type: 'depts', empId });
  const openVacation = (vacationId = null, forEmpId = null) =>
    open({ type: 'vacation', vacationId, forEmpId });
  const openDelegation = () => open({ type: 'delegation' });
  const openVacNow = () => open({ type: 'vacnow' });

  // Копирование = «шаблон из живой сущности»: тот же конвейер черновиков
  // (collectTaskPayloads → pendingTemplate* → instantiateTemplate*), что и
  // при сохранении в шаблон. Никаких новых путей создания задач/подзадач.
  const openCopyTask = (sourceTaskId) =>
    open({
      type: 'task',
      taskId: null,
      copyFromId: sourceTaskId,
      initialTab: 'form',
      parentTaskId: null,
      initialProjectId: null,
      returnToProjectId: null,
      returnToProjectTab: 'info',
      returnToTaskId: sourceTaskId,
      returnToTaskTab: 'form',
    });

  const openCopyProject = (sourceProjectId) =>
    open({
      type: 'project',
      projectId: null,
      copyFromId: sourceProjectId,
      initialTab: 'info',
      returnToProjectId: sourceProjectId,
      returnToProjectTab: 'info',
    });

  const closeModal = () => setModal(null);

  return {
    modal,
    openTask,
    openProject,
    openHoursReq,
    openRoles,
    openDepts,
    openVacation,
    openDelegation,
    openVacNow,
    openCopyTask,
    openCopyProject,
    closeModal,
  };
}