// src/services/ProjectService.js
import { TODAY, iso } from '../utils/date';

export class ProjectService {
  constructor(projectRepo, taskRepo, notificationService, auditService, notifyCallback) {
    this._projectRepo = projectRepo;
    this._taskRepo = taskRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notifyCallback;
  }

  getAll() { return this._projectRepo.findAll(); }

  upsertProject(project, currentUserId) {
    const existing = this._projectRepo.findById(project.id);
    const isNew = !existing;

    if (!isNew) {
      this._audit.addAudit('Изменение проекта', `Обновлён проект "${project.name}"`, 'project', project.id, currentUserId);
    } else {
      this._audit.addAudit('Создание проекта', project.name, 'project', project.id, currentUserId);
    }

    // Архивация при закрытии/отмене
    if (!isNew && (project.status === 'closed' || project.status === 'cancelled') && existing.status !== project.status) {
      project.archived = true;
      project.archivedAt = TODAY;
      const tasks = this._taskRepo.findByProject(project.id);
      const assigneeIds = new Set();
      for (const task of tasks) {
        if (!task.archived) {
          task.archived = true;
          task.archivedAt = TODAY;
          this._taskRepo.save(task);
          if (task.assigneeId) assigneeIds.add(task.assigneeId);
          this._notifications.notifyTaskArchived(task, project, currentUserId);
        }
      }
      this._notifications.notifyProjectArchived(project, assigneeIds, currentUserId);
    }

    // Уведомления по проекту
    if (isNew) {
      this._notifications.notifyProjectCreated(project, currentUserId);
    } else if (existing) {
      if (existing.managerId !== project.managerId && project.managerId) {
        this._notifications.notifyProjectManagerChanged(project, currentUserId);
      }
      if (existing.status !== project.status && project.status !== 'closed' && project.status !== 'cancelled') {
        this._notifications.notifyProjectStatusChanged(project, currentUserId);
      }
    }

    this._projectRepo.save(project);
    this._notify();
  }

  deleteProject(id, currentUserId) {
    const project = this._projectRepo.findById(id);
    if (project) {
      this._audit.addAudit('Удаление проекта', project.name, 'project', id, currentUserId);
    }
    this._projectRepo.delete(id);
    const tasks = this._taskRepo.findByProject(id);
    for (const task of tasks) this._taskRepo.delete(task.id);
    this._notify();
  }
}