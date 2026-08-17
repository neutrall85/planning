/**
 * useTaskOperations Hook
 * Encapsulates all task-related business logic
 * Separates business logic from UI components
 */

import { useCallback, useMemo } from 'react';
import { Task, Employee, Project, Vacation, NotificationTargetType } from '../../types';
import { sanitizeHtml } from '../../utils/sanitization';

interface UseTaskOperationsParams {
  tasks: Task[];
  employees: Employee[];
  projects: Project[];
  vacations: Vacation[];
  currentUser: Employee | null;
  onUpsertTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddNotification: (userId: string, text: string, target: NotificationTargetType | null, targetId: string | null) => void;
  onAddAudit: (action: string, details: string, targetType?: string | null, targetId?: string | null) => void;
}

export const useTaskOperations = ({
  tasks,
  employees,
  projects,
  vacations,
  currentUser,
  onUpsertTask,
  onDeleteTask,
  onAddNotification,
  onAddAudit,
}: UseTaskOperationsParams) => {
  
  // Helper to find employee by ID
  const findEmployee = useCallback((id: string): Employee | undefined => {
    return employees.find(e => e.id === id);
  }, [employees]);

  // Helper to find project by ID
  const findProject = useCallback((id: string): Project | undefined => {
    return projects.find(p => p.id === id);
  }, [projects]);

  // Check budget constraints before upserting task
  const validateBudget = useCallback((task: Task): { valid: boolean; error?: string } => {
    if (!task.projectId) return { valid: true };
    
    const project = findProject(task.projectId);
    if (!project || project.ptype === 'admin' || project.archived) {
      return { valid: true };
    }
    
    if (project.budget == null) {
      return { valid: true };
    }
    
    const otherTasksSum = tasks
      .filter(t => t.projectId === task.projectId && t.id !== task.id)
      .reduce((sum, t) => sum + (t.plannedHours || 0), 0);
    
    const newTotal = otherTasksSum + (task.plannedHours || 0);
    
    if (newTotal > project.budget) {
      return {
        valid: false,
        error: `Превышение бюджета проекта! Бюджет: ${project.budget} ч, сумма остальных задач: ${otherTasksSum} ч, запрошено: ${task.plannedHours || 0} ч. Требуется увеличение бюджета проекта.`
      };
    }
    
    return { valid: true };
  }, [tasks, findProject]);

  // Send notifications for status changes
  const notifyStatusChange = useCallback((oldTask: Task, newTask: Task) => {
    const actorName = currentUser ? `${currentUser.last} ${currentUser.first}` : 'Система';
    const safeTitle = sanitizeHtml(newTask.title);
    
    // 1. Исполнитель отправляет задачу на проверку (inwork → review)
    if (oldTask.status === 'inwork' && newTask.status === 'review') {
      const assignees = newTask.assigneeIds || [];
      const message = `Задача "${safeTitle}" отправлена на проверку исполнителем ${actorName}`;
      
      // Уведомить автора задачи
      if (newTask.creatorId && !assignees.includes(newTask.creatorId)) {
        onAddNotification(newTask.creatorId, message, 'task', newTask.id);
      }
      
      // Уведомить ответственного по проекту
      const project = findProject(newTask.projectId);
      if (project?.managerId && project.managerId !== newTask.creatorId && !assignees.includes(project.managerId)) {
        onAddNotification(project.managerId, message, 'task', newTask.id);
      }
    }
    
    // 2. Возврат на доработку (review → inwork)
    if (oldTask.status === 'review' && newTask.status === 'inwork') {
      const assignees = newTask.assigneeIds || [];
      const message = `Задача "${safeTitle}" возвращена на доработку пользователем ${actorName}`;
      
      assignees.forEach(id => {
        if (id !== currentUser?.id) {
          onAddNotification(id, message, 'task', newTask.id);
        }
      });
      
      if (newTask.creatorId && !assignees.includes(newTask.creatorId) && newTask.creatorId !== currentUser?.id) {
        onAddNotification(newTask.creatorId, message, 'task', newTask.id);
      }
    }
    
    // 3. Закрытие/отмена задачи
    if (newTask.status === 'closed' || newTask.status === 'cancelled') {
      const assignees = newTask.assigneeIds || [];
      const actionText = newTask.status === 'closed' ? 'закрыта' : 'отменена';
      const message = `Задача "${safeTitle}" ${actionText} пользователем ${actorName}`;
      
      assignees.forEach(id => {
        if (id !== currentUser?.id) {
          onAddNotification(id, message, 'task', newTask.id);
        }
      });
      
      if (newTask.creatorId && !assignees.includes(newTask.creatorId) && newTask.creatorId !== currentUser?.id) {
        onAddNotification(newTask.creatorId, message, 'task', newTask.id);
      }
      
      const project = findProject(newTask.projectId);
      if (project?.managerId && 
          project.managerId !== newTask.creatorId && 
          !assignees.includes(project.managerId) && 
          project.managerId !== currentUser?.id) {
        onAddNotification(project.managerId, message, 'task', newTask.id);
      }
    }
  }, [currentUser, findProject, onAddNotification]);

  // Main upsert operation with validation and notifications
  const upsertTask = useCallback((task: Task) => {
    // Validate budget first
    const budgetValidation = validateBudget(task);
    if (!budgetValidation.valid) {
      throw new Error(budgetValidation.error);
    }
    
    const existingTask = tasks.find(t => t.id === task.id);
    
    if (existingTask) {
      // Update existing task
      notifyStatusChange(existingTask, task);
      
      // Handle status change to closed/cancelled
      if ((task.status === 'closed' || task.status === 'cancelled') && !existingTask.closedAt) {
        task.closedAt = new Date().toISOString();
      }
    } else {
      // Create new task
      if (!task.createdAt) {
        task.createdAt = new Date().toISOString();
      }
      
      // Notify assignees
      (task.assigneeIds || []).forEach(id => {
        if (id !== currentUser?.id) {
          onAddNotification(id, `Вам назначена задача "${sanitizeHtml(task.title)}"`, 'task', task.id);
        }
      });
      
      onAddAudit('Создание задачи', task.title, 'task', task.id);
    }
    
    onUpsertTask(task);
  }, [tasks, currentUser, validateBudget, notifyStatusChange, onUpsertTask, onAddNotification, onAddAudit]);

  // Delete operation with audit logging
  const deleteTask = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      onAddAudit('Удаление задачи', task.title, 'task', id);
    }
    onDeleteTask(id);
  }, [tasks, onDeleteTask, onAddAudit]);

  // Memoized statistics
  const stats = useMemo(() => {
    const userTasks = currentUser 
      ? tasks.filter(t => t.assigneeIds?.includes(currentUser.id))
      : [];
    
    return {
      total: tasks.length,
      assignedToUser: userTasks.length,
      byStatus: {
        new: tasks.filter(t => t.status === 'new').length,
        inwork: tasks.filter(t => t.status === 'inwork').length,
        review: tasks.filter(t => t.status === 'review').length,
        closed: tasks.filter(t => t.status === 'closed').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
      },
      overdue: tasks.filter(t => {
        if (!t.deadline || ['closed', 'cancelled'].includes(t.status)) return false;
        return new Date(t.deadline) < new Date();
      }).length,
    };
  }, [tasks, currentUser]);

  return {
    upsertTask,
    deleteTask,
    stats,
    validateBudget,
  };
};

export default useTaskOperations;
