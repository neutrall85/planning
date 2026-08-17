import type DataStore from '../DataStore';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { TaskRepository } from '../repositories/TaskRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import type { Project, ProjectStatus, Task } from '../../types';
import { sanitizeHtml } from '../../utils/sanitization';

/**
 * Сервис для управления проектами
 */
export class ProjectService {
  private projectRepo: ProjectRepository;
  private taskRepo: TaskRepository;
  private employeeRepo: EmployeeRepository;
  private store: DataStore;

  constructor(store: DataStore) {
    this.store = store;
    this.projectRepo = new ProjectRepository(store);
    this.taskRepo = new TaskRepository(store);
    this.employeeRepo = new EmployeeRepository(store);
  }

  /**
   * Создание нового проекта
   */
  createProject(projectData: Omit<Project, 'id'>): { success: boolean; project?: Project; error?: string } {
    const manager = this.employeeRepo.getEmployeeById(projectData.managerId);
    if (!manager) {
      return { success: false, error: 'Менеджер проекта не найден' };
    }

    const sanitized = {
      ...projectData,
      name: sanitizeHtml(projectData.name),
      code: projectData.code.toUpperCase()
    };

    const newProject: Project = {
      ...sanitized,
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: projectData.status || 'active'
    };

    this.projectRepo.create(newProject);
    return { success: true, project: newProject };
  }

  /**
   * Обновление проекта
   */
  updateProject(id: string, updates: Partial<Project>): { success: boolean; project?: Project; error?: string } {
    const existing = this.projectRepo.getById(id);
    if (!existing) {
      return { success: false, error: 'Проект не найден' };
    }

    // Санитизация текстовых полей
    if (updates.name) {
      updates.name = sanitizeHtml(updates.name);
    }
    if (updates.code) {
      updates.code = updates.code.toUpperCase();
    }

    const updated = this.projectRepo.update(id, updates);
    if (!updated) {
      return { success: false, error: 'Не удалось обновить проект' };
    }

    return { success: true, project: updated };
  }

  /**
   * Удаление проекта (мягкое - через архивацию)
   */
  archiveProject(id: string): { success: boolean; error?: string } {
    const result = this.updateProject(id, { 
      archived: true, 
      archivedAt: new Date().toISOString(),
      status: 'closed'
    });
    
    return result;
  }

  /**
   * Изменение статуса проекта
   */
  changeProjectStatus(id: string, status: ProjectStatus): { success: boolean; error?: string } {
    return this.updateProject(id, { status });
  }

  /**
   * Получение задач проекта
   */
  getProjectTasks(projectId: string): Task[] {
    return this.taskRepo.findByProjectId(projectId);
  }

  /**
   * Расчёт прогресса проекта по задачам
   */
  calculateProjectProgress(projectId: string): number {
    const tasks = this.getProjectTasks(projectId);
    if (tasks.length === 0) return 0;

    const completed = tasks.filter(t => ['closed', 'cancelled'].includes(t.status)).length;
    return Math.round((completed / tasks.length) * 100);
  }

  /**
   * Получение проектов менеджера
   */
  getManagerProjects(managerId: string): Project[] {
    return this.projectRepo.findByManagerId(managerId);
  }

  /**
   * Получение активных проектов
   */
  getActiveProjects(): Project[] {
    return this.projectRepo.getActiveProjects();
  }

  /**
   * Проверка бюджета проекта
   */
  checkBudgetOverrun(projectId: string): { withinBudget: boolean; actualCost?: number; budget?: number } {
    const project = this.projectRepo.getById(projectId);
    if (!project || !project.budget) {
      return { withinBudget: true };
    }

    const tasks = this.getProjectTasks(projectId);
    const actualCost = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

    return {
      withinBudget: actualCost <= project.budget,
      actualCost,
      budget: project.budget
    };
  }
}
