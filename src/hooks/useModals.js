import { useState } from 'react';

export function useModals({ store, data, user }) {
  const [modal, setModal] = useState(null);

  const openTask = (taskId = null, initialTab = 'form', parentTaskId = null, initialProjectId = null) =>
    setModal({ type: 'task', taskId, initialTab, parentTaskId, initialProjectId });

  const openProject = (projectId = null) =>
    setModal({ type: 'project', projectId });

  const openHoursReq = (kind, targetId) =>
    setModal({ type: 'hours', kind, targetId });

  const openRoles = (empId) =>
    setModal({ type: 'roles', empId });

  const openDepts = (empId) =>
    setModal({ type: 'depts', empId });

  const openVacation = (vacationId = null, forEmpId = null) =>
    setModal({ type: 'vacation', vacationId, forEmpId });

  const openDelegation = () =>
    setModal({ type: 'delegation' });

  const openVacNow = () =>
    setModal({ type: 'vacnow' });

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
    closeModal,
  };
}