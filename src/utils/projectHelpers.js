import { PROJECT_PRIORITIES, ADMIN_PROJECT_PRIORITIES } from './constants';

export const getProjectColor = (project) => {
  if (!project) return '#64748b';
  const priorities = project.ptype === 'admin' ? ADMIN_PROJECT_PRIORITIES : PROJECT_PRIORITIES;
  return priorities[project.priority]?.color || '#64748b';
};