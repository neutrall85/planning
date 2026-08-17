import type DataStore from '../DataStore';
import { TaskRepository } from '../repositories/TaskRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { VacationRepository } from '../repositories/VacationRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import type { Task, TaskStatus, Priority, RepeatConfig } from '../../types';
import { sanitizeHtml } from '../../utils/sanitization';
import { validateTask } from '../../utils/validation';

/**
 * Сервис для управления задачами
 * Содержит бизнес-логику работы с задачами
 */
export class TaskService {
  private taskRepo: TaskRepository;
  private projectRepo: ProjectRepository;
  private employeeRepo: EmployeeRepository;
  private vacationRepo: VacationRepository;
  private notificationRepo: NotificationRepository;
  private store: DataStore;

  constructor(store: DataStore) {
    this.store = store;
    this.taskRepo = new TaskRepository(store);
    this.projectRepo = new ProjectRepository(store);
    this.employeeRepo = new EmployeeRepository(store);
    this.vacationRepo = new VacationRepository(store);
    this.notificationRepo = new NotificationRepository(store);
  }

  /**
   * Создание новой задачи с валидацией и санитизацией
   */
  createTask(taskData: Omit<Task, 'id' | 'createdAt'>): { success: boolean; task?: Task; errors?: any[] } {
    // Валидация через Zod схемы
    const validation = validateTask(taskData);
    if (!validation.success) {
      return { success: false, errors: validation.errors };
    }

    // Санитизация текстовых полей
    const sanitizedTitle = sanitizeHtml(taskData.title);
    const sanitizedDescription = taskData.description ? sanitizeHtml(taskData.description) : undefined;

    const newTask: Task = {
      ...taskData,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: sanitizedTitle,
      description: sanitizedDescription,
      createdAt: new Date().toISOString(),
    };

    this.taskRepo.create(newTask);
    return { success: true, task: newTask };
  }

  /**
   * Обновление задачи
   */
  updateTask(id: string, updates: Partial<Task>): { success: boolean; task?: Task; error?: string } {
    const existing = this.taskRepo.getById(id);
    if (!existing) {
      return { success: false, error: 'Task not found' };
    }

    // Санитизация обновляемых полей
    if (updates.title) {
      updates.title = sanitizeHtml(updates.title);
    }
    if (updates.description) {
      updates.description = sanitizeHtml(updates.description);
    }

    const updated = this.taskRepo.update(id, updates);
    if (!updated) {
      return { success: false, error: 'Failed to update task' };
    }

    return { success: true, task: updated };
  }

  /**
   * Удаление задачи
   */
  deleteTask(id: string): boolean {
    return this.taskRepo.delete(id);
  }

  /**
   * Изменение статуса задачи с уведомлениями
   */
  changeTaskStatus(taskId: string, newStatus: TaskStatus): { success: boolean; error?: string } {
    const task = this.taskRepo.getById(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const result = this.updateTask(taskId, { 
      status: newStatus,
      closedAt: ['closed', 'cancelled'].includes(newStatus) ? new Date().toISOString() : undefined
    });

    if (result.success && task.assigneeIds) {
      // Уведомление исполнителей об изменении статуса
      const statusNames: Record<TaskStatus, string> = {
        new: 'Новая',
        inwork: 'В работе',
        review: 'На проверке',
        closed: 'Завершена',
        cancelled: 'Отменена'
      };

      task.assigneeIds.forEach(assigneeId => {
        const assignee = this.employeeRepo.getEmployeeById(assigneeId);
        if (assignee) {
          this.notificationRepo.create({
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: assigneeId,
            text: `Статус задачи "${task.title}" изменён на "${statusNames[newStatus]}"`,
            ts: Date.now(),
            targetType: 'task',
            targetId: taskId
          });
        }
      });
    }

    return result;
  }

  /**
   * Проверка пересечения с отпуском исполнителя
   */
  checkVacationOverlap(assigneeId: string, startDate: string, endDate: string): boolean {
    const vacations = this.vacationRepo.findByEmployeeId(assigneeId);
    const approved = vacations.filter(v => v.status === 'approved');

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return approved.some(vacation => {
      const vacStart = new Date(vacation.start).getTime();
      const vacEnd = new Date(vacation.end).getTime();
      return !(end < vacStart || start > vacEnd);
    });
  }

  /**
   * Получение задач проекта
   */
  getProjectTasks(projectId: string): Task[] {
    return this.taskRepo.findByProjectId(projectId);
  }

  /**
   * Получение задач исполнителя
   */
  getAssigneeTasks(assigneeId: string): Task[] {
    return this.taskRepo.findByAssigneeId(assigneeId);
  }

  /**
   * Генерация дат для повторяющихся задач
   */
  generateRepeatDates(config: RepeatConfig, startDate: string, count?: number): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const endCount = count || config.count || 10;
    const endDate = config.endDate ? new Date(config.endDate) : null;

    let current = new Date(start);
    let generated = 0;

    while (generated < endCount && (!endDate || current <= endDate)) {
      dates.push(current.toISOString().split('T')[0]);
      generated++;

      switch (config.type) {
        case 'daily':
          current.setDate(current.getDate() + (config.interval || 1));
          break;
        case 'weekly_days':
          current.setDate(current.getDate() + 7);
          break;
        case 'workdays':
          do {
            current.setDate(current.getDate() + 1);
          } while ([0, 6].includes(current.getDay()));
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + (config.interval || 1));
          break;
        case 'yearly':
          current.setFullYear(current.getFullYear() + (config.interval || 1));
          break;
        default:
          return dates;
      }
    }

    return dates;
  }
}
