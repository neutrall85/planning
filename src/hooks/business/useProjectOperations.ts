/**
 * useProjectOperations Hook
 * Encapsulates all project-related business logic
 * Separates business logic from UI components
 */

import { useCallback } from 'react';
import { Project, Employee, Task, NotificationTargetType } from '../../types';
import { sanitizeHtml } from '../../utils/sanitization';
import { PROJECT_STATUSES } from '../../utils/constants';

interface UseProjectOperationsParams {
  projects: Project[];
  tasks: Task[];
  employees: Employee[];
  currentUser: Employee | null;
  onUpsertProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onAddNotification: (userId: string, text: string, target: NotificationTargetType | null, targetId: string | null) => void;
  onAddAudit: (action: string, details: any, targetType?: string | null, targetId?: string | null) => void;
}

export const useProjectOperations = ({
  projects,
  tasks,
  employees,
  currentUser,
  onUpsertProject,
  onDeleteProject,
  onAddNotification,
  onAddAudit,
}: UseProjectOperationsParams) => {
  
  // Helper to find employee by ID
  const findEmployee = useCallback((id: string): Employee | undefined => {
    return employees.find(e => e.id === id);
  }, [employees]);

  // Check budget constraints before upserting project
  const validateBudget = useCallback((project: Project): { valid: boolean; error?: string } => {
    if (project.budget == null) {
      return { valid: true };
    }
    
    const projectTasksSum = tasks
      .filter(t => t.projectId === project.id)
      .reduce((sum, t) => sum + (t.plannedHours || 0), 0);
    
    if (projectTasksSum > project.budget) {
      return {
        valid: false,
        error: `Бюджет проекта меньше суммы часов задач! Бюджет: ${project.budget} ч, сумма задач: ${projectTasksSum} ч.`
      };
    }
    
    return { valid: true };
  }, [tasks]);

  // Send notifications for status changes
  const notifyStatusChange = useCallback((oldProject: Project, newProject: Project) => {
    const actorName = currentUser ? `${currentUser.last} ${currentUser.first}` : 'Система';
    const safeName = sanitizeHtml(newProject.name);
    
    // Project closed/archived
    if ((newProject.status === 'closed' || newProject.archived) && 
        (oldProject.status !== 'closed' && !oldProject.archived)) {
      const message = `Проект "${safeName}" закрыт пользователем ${actorName}`;
      
      // Notify project manager
      if (newProject.managerId && newProject.managerId !== currentUser?.id) {
        onAddNotification(newProject.managerId, message, 'project', newProject.id);
      }
      
      // Notify all task assignees in this project
      const projectTaskAssignees = tasks
        .filter(t => t.projectId === newProject.id)
        .flatMap(t => t.assigneeIds || []);
      
      const uniqueAssignees = [...new Set(projectTaskAssignees)];
      uniqueAssignees.forEach(id => {
        if (id !== currentUser?.id && id !== newProject.managerId) {
          onAddNotification(id, message, 'project', newProject.id);
        }
      });
    }
  }, [currentUser, tasks, onAddNotification]);

  // Main upsert operation with validation and notifications
  const upsertProject = useCallback((project: Project) => {
    // Validate budget first
    const budgetValidation = validateBudget(project);
    if (!budgetValidation.valid) {
      throw new Error(budgetValidation.error);
    }
    
    const existingProject = projects.find(p => p.id === project.id);
    
    if (existingProject) {
      // Update existing project
      notifyStatusChange(existingProject, project);
      
      // Handle status change to closed
      if ((project.status === 'closed' || project.archived) && 
          (existingProject.status !== 'closed' && !existingProject.archived)) {
        onAddAudit('Изменение проекта', {
          name: project.name,
          status: `${typeof existingProject.status === 'string' ? PROJECT_STATUSES[existingProject.status as keyof typeof PROJECT_STATUSES] || existingProject.status : existingProject.status} → Закрыт`
        }, 'project', project.id);
      } else {
        onAddAudit('Изменение проекта', {
          name: project.name,
          field: Object.keys(project).find(k => project[k] !== existingProject[k]) || 'multiple'
        }, 'project', project.id);
      }
    } else {
      // Create new project
      onAddAudit('Создание проекта', project.name, 'project', project.id);
      
      // Notify project manager if not self
      if (project.managerId && project.managerId !== currentUser?.id) {
        onAddNotification(project.managerId, `Вам назначен проект "${sanitizeHtml(project.name)}"`, 'project', project.id);
      }
    }
    
    onUpsertProject(project);
  }, [projects, currentUser, validateBudget, notifyStatusChange, onUpsertProject, onAddNotification, onAddAudit]);

  // Delete operation with audit logging
  const deleteProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      onAddAudit('Удаление проекта', {
        name: project.name,
        status: typeof project.status === 'string' ? PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES] || project.status : project.status
      }, 'project', id);
      
      // Notify all stakeholders
      const message = `Проект "${sanitizeHtml(project.name)}" удалён`;
      
      if (project.managerId && project.managerId !== currentUser?.id) {
        onAddNotification(project.managerId, message, 'project', id);
      }
      
      const projectTaskAssignees = tasks
        .filter(t => t.projectId === id)
        .flatMap(t => t.assigneeIds || []);
      
      const uniqueAssignees = [...new Set(projectTaskAssignees)];
      uniqueAssignees.forEach(assigneeId => {
        if (assigneeId !== currentUser?.id && assigneeId !== project.managerId) {
          onAddNotification(assigneeId, message, 'project', id);
        }
      });
    }
    onDeleteProject(id);
  }, [projects, tasks, currentUser, onDeleteProject, onAddNotification, onAddAudit]);

  return {
    upsertProject,
    deleteProject,
    validateBudget,
  };
};

export default useProjectOperations;
