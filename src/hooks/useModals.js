// src/hooks/useModals.js
import { useCallback, useRef, useState } from 'react';
import { ROUTE, DEFAULT_TAB, TABS } from '../utils/routes';

/**
 * Привести вкладку к значению из белого списка. Тот же набор
 * констант, что использует buildRoute / parseRoute — гарантирует,
 * что modal.initialTab всегда совпадает с route.tab после нормализации
 * и guard в MainLayout «модалка уже на этой вкладке» не проскакивает.
 */
const normalizeTab = (kind, tab) =>
  (TABS[kind] || []).includes(tab) ? tab : DEFAULT_TAB[kind];

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
    taskId,
    initialTab: normalizeTab(ROUTE.TASK, initialTab),
    parentTaskId, initialProjectId,
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
    type: 'project',
    projectId,
    initialTab: normalizeTab(ROUTE.PROJECT, initialTab),
    returnToProjectId, returnToProjectTab,
  }), [open]);

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

  const openProjectAccess = useCallback((projectId) =>
    open({ type: 'projectAccess', projectId }), [open]);

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