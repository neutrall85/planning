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

  /**
   * Открытие владельца по share-ссылке на файл или папку.
   *
   * Общая идея: share-ссылка не открывает собственное окно - она
   * открывает карточку владельца (задачи или проекта) на вкладке
   * «Вложения» и просит FileManager подсветить конкретный узел.
   *
   * highlightFileId / highlightFolderId - транзитные поля дескриптора:
   * их читает ModalRenderer и прокидывает в TaskModal/ProjectModal,
   * оттуда - в FileManager. Сама модалка их семантику не знает, для
   * неё это «пожелание сфокусироваться на узле».
   *
   * Раздельные методы openAtFile / openAtFolder, а не один openAt с
   * kind-параметром: вызовы читаются лучше (openAtFile(...) понятнее,
   * чем openAt('file', ...)), а внутренняя ветка task/project всё
   * равно дублируется в обоих.
   */
  const openAtFile = useCallback((ownerKind, ownerId, fileId) => {
    if (ownerKind === 'task') {
      open({ type: 'task', taskId: ownerId, initialTab: 'files', highlightFileId: fileId });
    } else {
      open({ type: 'project', projectId: ownerId, initialTab: 'files', highlightFileId: fileId });
    }
  }, [open]);

  const openAtFolder = useCallback((ownerKind, ownerId, folderId) => {
    if (ownerKind === 'task') {
      open({ type: 'task', taskId: ownerId, initialTab: 'files', highlightFolderId: folderId });
    } else {
      open({ type: 'project', projectId: ownerId, initialTab: 'files', highlightFolderId: folderId });
    }
  }, [open]);

  /**
   * Отдельный тип модалки под управление доступом к проекту.
   *
   * Внутри карточки проекта доступ открывается локальным состоянием
   * ProjectModal (кнопка в футере), но из контекстного меню карточки
   * канбана/списка самой карточки нет - клик должен открывать модалку
   * доступа сразу, минуя карточку. Тот же приём, что у openEmployeeTasks:
   * собственный тип модалки на самостоятельное окно.
   */
  const openProjectAccess = useCallback((projectId) =>
    open({ type: 'projectAccess', projectId }), [open]);

  /**
   * Открыть модалку запроса на изменение.
   *
   * changeKind — id правила из utils/changeKinds ('hours' | 'deadline').
   * targetType — 'task' | 'project' (у deadline — только task).
   * targetId   — id целевой сущности.
   *
   * Единый метод вместо отдельного openHoursReq/openDeadlineReq: вид
   * изменения — параметр, а не повод для отдельной точки входа. Новые
   * виды изменений (приоритет, статус) не потребуют правок здесь.
   */
  const openChangeReq = useCallback((changeKind, targetType, targetId) =>
    open({ type: 'changeReq', changeKind, targetType, targetId }), [open]);

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
    openTask, openProject, openProjectAccess,
    openAtFile, openAtFolder,
    openChangeReq,
    openRoles, openDepts,
    openVacation, openDelegation, openVacNow, openYearCalendar,
    openEmployeeTasks, openCopyTask, openCopyProject,
    openTemplateFromTask, openTemplateFromProject,
    closeModal, setModalTab,
  };
}