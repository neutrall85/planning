// src/hooks/useModals.js
import { useCallback, useRef, useState } from 'react';

export function useModals({ store, user }) {
  const [modal, setModal] = useState(null);
  const seqRef = useRef(0);

  const open = useCallback((state) => {
    seqRef.current += 1;
    setModal({ ...state, _seq: seqRef.current });
  }, []);

  const openTask = useCallback((
    taskId = null,
    initialTab = 'form',
    parentTaskId = null,
    initialProjectId = null,
    returnToProjectId = null,
    returnToProjectTab = 'info',
    returnToTaskId = null,
    returnToTaskTab = 'subtasks',
    returnToEmployeeTasksId = null,
  ) => open({
    type: 'task',
    taskId, initialTab, parentTaskId, initialProjectId,
    returnToProjectId, returnToProjectTab,
    returnToTaskId, returnToTaskTab,
    returnToEmployeeTasksId,
  }), [open]);

  const openProject = useCallback((
    projectId = null,
    initialTab = 'info',
    returnToProjectId = null,
    returnToProjectTab = 'info',
  ) => open({
    type: 'project', projectId, initialTab, returnToProjectId, returnToProjectTab,
  }), [open]);

  const openHoursReq = useCallback((kind, targetId) =>
    open({ type: 'hours', kind, targetId }), [open]);

  const openRoles = useCallback((empId) =>
    open({ type: 'roles', empId }), [open]);

  const openDepts = useCallback((empId) =>
    open({ type: 'depts', empId }), [open]);

  const openVacation = useCallback((vacationId = null, forEmpId = null) =>
    open({ type: 'vacation', vacationId, forEmpId }), [open]);

  const openDelegation = useCallback(() =>
    open({ type: 'delegation' }), [open]);

  const openVacNow = useCallback(() =>
    open({ type: 'vacnow' }), [open]);

  const openYearCalendar = useCallback(() =>
    open({ type: 'yearCalendar' }), [open]);

  const openEmployeeTasks = useCallback((empId) =>
    open({ type: 'employeeTasks', empId }), [open]);

  // Копирование задачи и проекта - две ветки одного правила:
  //   options.returnToModal === true - открыто изнутри модалки-источника
  //     (кнопка "Копировать" в футере). Кнопка "Назад" и закрытие по X
  //     вернут в исходную сущность.
  //   без опции - открыто из канбана/списка/календаря (контекстное меню
  //     карточки). Возврат не задан: закрытие просто закрывает модалку,
  //     пользователь остаётся на исходном экране.
  // Различие выражается одним булевым флагом в дескрипторе модалки;
  // closeTaskWithReturn / closeProjectWithReturn уже читают его через
  // modal.returnToTaskId / modal.returnToProjectId.
  const openCopyTask = useCallback((sourceTaskId, options) => {
    const returnToModal = options?.returnToModal === true;
    return open({
      type: 'task',
      taskId: null,
      copyFromId: sourceTaskId,
      initialTab: 'form',
      parentTaskId: null,
      initialProjectId: null,
      returnToProjectId: null,
      returnToProjectTab: 'info',
      returnToTaskId: returnToModal ? sourceTaskId : null,
      returnToTaskTab: 'form',
      returnToEmployeeTasksId: null,
    });
  }, [open]);

  const openCopyProject = useCallback((sourceProjectId, options) => {
    const returnToModal = options?.returnToModal === true;
    return open({
      type: 'project',
      projectId: null,
      copyFromId: sourceProjectId,
      initialTab: 'info',
      returnToProjectId: returnToModal ? sourceProjectId : null,
      returnToProjectTab: 'info',
    });
  }, [open]);

  const openTemplateFromTask = useCallback((taskId) =>
    open({ type: 'templateFromTask', taskId }), [open]);

  const openTemplateFromProject = useCallback((projectId) =>
    open({ type: 'templateFromProject', projectId }), [open]);

  const setModalTab = useCallback((tab) => {
    setModal(prev => prev ? { ...prev, initialTab: tab } : prev);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  return {
    modal,
    openTask, openProject, openHoursReq, openRoles, openDepts,
    openVacation, openDelegation, openVacNow, openYearCalendar,
    openEmployeeTasks, openCopyTask, openCopyProject,
    openTemplateFromTask, openTemplateFromProject,
    closeModal, setModalTab,
  };
}