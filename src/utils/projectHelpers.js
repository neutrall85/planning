import { PROJECT_PRIORITIES } from './constants';

export const getProjectColor = (project) => {
  if (!project) return '#64748b';
  return PROJECT_PRIORITIES[project.priority]?.color || '#64748b';
};