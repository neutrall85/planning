// src/services/DataStore.js
import { buildMockData } from './mockData';
import { TODAY, iso, addMonths, addDays, uid, fmtDMY } from '../utils/date';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, VACATION_TYPES, PROJECT_STATUSES, PROJECT_TYPES, DEPENDENCY_TYPES } from '../utils/constants';

// Импорты репозиториев
import { TaskRepository } from '../repositories/TaskRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { VacationRepository } from '../repositories/VacationRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { AuditRepository } from '../repositories/AuditRepository';
import { DepartmentRepository } from '../repositories/DepartmentRepository';
import { KbRepository } from '../repositories/KbRepository';
import { HoursRequestRepository } from '../repositories/HoursRequestRepository';
import { RoleDelegationRepository } from '../repositories/RoleDelegationRepository';

// Импорты сервисов
import { BudgetService } from './BudgetService';
import { TaskService } from './TaskService';
import { ProjectService } from './ProjectService';
import { VacationService } from './VacationService';
import { EmployeeService } from './EmployeeService';
import { AuthService } from './AuthService';
import { NotificationService } from './NotificationService';
import { AuditService } from './AuditService';
import { DepartmentService } from './DepartmentService';
import { KbService } from './KbService';
import { HoursRequestService } from './HoursRequestService';
import { RoleDelegationService } from './RoleDelegationService';

// Миграции
class DataMigrator {
  static migrate(data) {
    let changed = false;
    data.tasks = data.tasks.map(t => {
      if (t.assigneeIds && t.assigneeIds.length > 0 && !t.assigneeId) {
        changed = true;
        const { assigneeIds, ...rest } = t;
        return { ...rest, assigneeId: assigneeIds[0] };
      }
      if (t.assigneeIds && t.assigneeIds.length === 0 && !t.assigneeId) {
        changed = true;
        const { assigneeIds, ...rest } = t;
        return { ...rest, assigneeId: null };
      }
      return t;
    });
    data.tasks = data.tasks.map(t => {
      let updated = { ...t };
      if (updated.actualHours === undefined) {
        updated.actualHours = 0;
        changed = true;
      }
      if (updated.isSummary && updated.budgetHours === undefined) {
        updated.budgetHours = updated.plannedHours || 0;
        changed = true;
      }
      return updated;
    });
    return { data, changed };
  }
}

class DataStore {
  constructor() {
    this._data = buildMockData();
    const { data, changed } = DataMigrator.migrate(this._data);
    this._data = data;
    if (changed) {
      this._data.audit.unshift({
        id: uid(),
        ts: Date.now(),
        userId: 'system',
        action: 'Миграция данных',
        details: 'Задачи приведены к формату с одним исполнителем и добавлены поля actualHours/budgetHours',
        targetType: null,
        targetId: null,
      });
    }

    this._listeners = [];

    // Репозитории
    this._taskRepo = new TaskRepository(this._data.tasks);
    this._projectRepo = new ProjectRepository(this._data.projects);
    this._employeeRepo = new EmployeeRepository(this._data.employees);
    this._vacationRepo = new VacationRepository(this._data.vacations);
    this._notificationRepo = new NotificationRepository(this._data.notifications);
    this._auditRepo = new AuditRepository(this._data.audit);
    this._deptRepo = new DepartmentRepository(this._data.departments);
    this._kbRepo = new KbRepository(this._data.kbs);
    this._hoursRequestRepo = new HoursRequestRepository(this._data.hoursRequests);
    this._roleDelegationRepo = new RoleDelegationRepository(this._data.roleDelegations);

    // Сервисы
    this._auditService = new AuditService(this._auditRepo, () => this._notify());
    this._notificationService = new NotificationService(
      this._notificationRepo,
      () => this._notify(),
      () => this._data
    );
    this._employeeService = new EmployeeService(this._employeeRepo, this._auditService, () => this._notify());
    this._budgetService = new BudgetService(this._taskRepo, this._projectRepo, this._employeeRepo);
    this._taskService = new TaskService(
      this._taskRepo,
      this._projectRepo,
      this._employeeRepo,
      this._budgetService,
      this._notificationService,
      this._auditService,
      () => this._notify()
    );
    this._projectService = new ProjectService(
      this._projectRepo,
      this._taskRepo,
      this._notificationService,
      this._auditService,
      () => this._notify()
    );
    this._vacationService = new VacationService(
      this._vacationRepo,
      this._taskService,
      this._notificationService,
      this._auditService,
      () => this._notify()
    );
    this._authService = new AuthService(this._employeeService, this._auditService, () => this._notify());
    this._departmentService = new DepartmentService(this._deptRepo, this._auditService, () => this._notify());
    this._kbService = new KbService(this._kbRepo, this._auditService, () => this._notify());
    this._hoursRequestService = new HoursRequestService(this._hoursRequestRepo, () => this._notify());
    this._roleDelegationService = new RoleDelegationService(this._roleDelegationRepo, this._auditService, () => this._notify());

    this._data.comments = this._data.comments || [];
    this._migrateComments();

    this._taskService.archiveOldTasks(3);
  }

  // ---------- Публичный API ----------

  get data() { return this._data; }

  subscribe(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(cb => cb !== callback); };
  }

  _notify() {
    this._listeners.forEach(cb => cb(this._data));
  }

  // Управление сессией
  getCurrentUser() { return this._authService.getCurrentUser(); }
  login(email, password) { return this._authService.login(email, password); }
  logout() { this._authService.logout(); }

  // Задачи
  upsertTask(task) {
    const user = this._authService.getCurrentUser();
    this._taskService.upsertTask(task, user?.id || 'system');
  }
  deleteTask(id) {
    const user = this._authService.getCurrentUser();
    this._taskService.deleteTask(id, user?.id || 'system');
  }
  getRemainingHours(taskId) {
    return this._taskService.getRemainingHours(taskId);
  }
  setBudget(taskId, newBudget) {
    const user = this._authService.getCurrentUser();
    return this._taskService.setBudget(taskId, newBudget, user?.id || 'system');
  }
  addTaskLog(taskId, message) {
    const user = this._authService.getCurrentUser();
    this._taskService.addTaskLog(taskId, message, user?.id || 'system');
  }

  // Проекты
  upsertProject(project) {
    const user = this._authService.getCurrentUser();
    this._projectService.upsertProject(project, user?.id || 'system');
  }
  deleteProject(id) {
    const user = this._authService.getCurrentUser();
    this._projectService.deleteProject(id, user?.id || 'system');
  }

  // Отпуска
  upsertVacation(vac) {
    const user = this._authService.getCurrentUser();
    this._vacationService.upsertVacation(vac, user?.id || 'system');
  }
  deleteVacation(id) {
    const user = this._authService.getCurrentUser();
    this._vacationService.deleteVacation(id, user?.id || 'system');
  }
  applyDelegation(vacationId) { this._vacationService.applyDelegation(vacationId); }
  revertDelegation(vacationId) { this._vacationService.revertDelegation(vacationId); }

  // Сотрудники
  upsertEmployee(emp) {
    const user = this._authService.getCurrentUser();
    this._employeeService.upsertEmployee(emp, user?.id || 'system');
  }
  empName(id) { return this._employeeService.getEmployeeName(id); }

  // Отделы
  upsertDepartment(dept) {
    const user = this._authService.getCurrentUser();
    this._departmentService.upsertDepartment(dept, user?.id || 'system');
  }

  // База знаний
  upsertKb(kb) {
    const user = this._authService.getCurrentUser();
    this._kbService.upsertKb(kb, user?.id || 'system');
  }

  // Аудит
  addAudit(action, details, targetType = null, targetId = null) {
    const user = this._authService.getCurrentUser();
    this._auditService.addAudit(action, details, targetType, targetId, user?.id || 'system');
  }

  // Уведомления
  addNotification(userId, text, target = null) {
    this._notificationService.addNotification(userId, text, target);
  }
  markNotificationRead(id) { this._notificationService.markRead(id); }
  markAllNotificationsRead(userId) { this._notificationService.markAllRead(userId); }

  // Семантические уведомления (для UI-слоя)
  notifyHoursRequestCreated(request, directorIds, targetTitle) {
    const user = this._authService.getCurrentUser();
    this._notificationService.notifyHoursRequestCreated(request, directorIds, targetTitle, user?.id || 'system');
  }
  notifyHoursRequestDecision(request, approved, targetTitle) {
    const user = this._authService.getCurrentUser();
    this._notificationService.notifyHoursRequestDecision(request, approved, targetTitle, user?.id || 'system');
  }
  notifyRoleDelegationCreated(delegation) {
    const user = this._authService.getCurrentUser();
    this._notificationService.notifyRoleDelegationCreated(delegation, user?.id || 'system');
  }
  notifyRoleDelegationDecision(delegation, approved) {
    const user = this._authService.getCurrentUser();
    this._notificationService.notifyRoleDelegationDecision(delegation, approved, user?.id || 'system');
  }
  notifyVacationDecision(vacation, approved) {
    this._notificationService.notifyVacationDecision(vacation, approved);
  }

  // Запросы часов
  addHoursRequest(req) { this._hoursRequestService.addRequest(req); }

  // Делегирование ролей
  upsertRoleDelegation(rd) {
    const user = this._authService.getCurrentUser();
    this._roleDelegationService.upsertRoleDelegation(rd, user?.id || 'system');
  }

  // ---------- КОММЕНТАРИИ ----------

  getComments(filter = {}) {
    let list = this._data.comments || [];
    if (filter.projectId) list = list.filter(c => c.projectId === filter.projectId);
    if (filter.taskId !== undefined) list = list.filter(c => c.taskId === filter.taskId);
    if (filter.parentId !== undefined) list = list.filter(c => c.parentId === filter.parentId);
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }

  addComment(data) {
    const comment = {
      id: uid(),
      projectId: data.projectId,
      taskId: data.taskId || null,
      parentId: data.parentId || null,
      authorId: data.authorId,
      text: data.text || '',
      attachments: data.attachments || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    this._data.comments.push(comment);
    this._notificationService.notifyComment(comment); // ← автоуведомления
    this._notify();
    return comment;
  }

  updateComment(id, newText) {
    const comment = this._data.comments.find(c => c.id === id);
    if (!comment) throw new Error('Комментарий не найден');
    comment.text = newText;
    comment.updatedAt = Date.now();
    this._notify();
    return comment;
  }

  deleteComment(id) {
    const toDelete = new Set();
    const collect = (parentId) => {
      this._data.comments.forEach(c => {
        if (c.parentId === parentId && !toDelete.has(c.id)) {
          toDelete.add(c.id);
          collect(c.id);
        }
      });
    };
    toDelete.add(id);
    collect(id);
    this._data.comments = this._data.comments.filter(c => !toDelete.has(c.id));
    this._notify();
  }

  togglePinComment(commentId) {
    const comment = this._data.comments.find(c => c.id === commentId);
    if (!comment) throw new Error('Комментарий не найден');
    comment.pinned = !comment.pinned;
    this._notify();
    const action = comment.pinned ? 'Закрепление комментария' : 'Открепление комментария';
    const details = {
      commentId: comment.id,
      text: comment.text.substring(0, 50) + (comment.text.length > 50 ? '...' : ''),
      projectId: comment.projectId,
      taskId: comment.taskId,
    };
    const user = this._authService.getCurrentUser();
    this._auditService.addAudit(action, details, 'comment', comment.id, user?.id || 'system');
    return comment;
  }

  addAttachment(commentId, file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Можно загружать только изображения'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('Размер не более 5 МБ'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment = {
          id: uid(),
          name: file.name,
          url: e.target.result,
          size: file.size,
          mimeType: file.type,
          uploadedAt: Date.now(),
        };
        const comment = this._data.comments.find(c => c.id === commentId);
        if (!comment) { reject(new Error('Комментарий не найден')); return; }
        comment.attachments = comment.attachments || [];
        comment.attachments.push(attachment);
        comment.updatedAt = Date.now();
        this._notify();
        resolve(attachment);
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsDataURL(file);
    });
  }

  // ---------- МИГРАЦИЯ КОММЕНТАРИЕВ ----------
  _migrateComments() {
    if (this._data.comments && this._data.comments.length > 0) return;
    const migrated = [];
    (this._data.projects || []).forEach(p => {
      (p.comments || []).forEach(c => {
        migrated.push({
          id: c.id || uid(),
          projectId: p.id,
          taskId: null,
          parentId: c.parentId || null,
          authorId: c.authorId,
          text: c.text,
          attachments: c.attachments || [],
          createdAt: c.ts || Date.now(),
          updatedAt: c.ts || Date.now(),
          pinned: c.pinned || false,
        });
      });
      delete p.comments;
    });
    (this._data.tasks || []).forEach(t => {
      (t.comments || []).forEach(c => {
        migrated.push({
          id: c.id || uid(),
          projectId: t.projectId,
          taskId: t.id,
          parentId: c.parentId || null,
          authorId: c.authorId,
          text: c.text,
          attachments: c.attachments || [],
          createdAt: c.ts || Date.now(),
          updatedAt: c.ts || Date.now(),
          pinned: c.pinned || false,
        });
      });
      delete t.comments;
    });
    this._data.comments = migrated;
    if (migrated.length) {
      this._auditService.addAudit('Миграция комментариев', `Перенесено ${migrated.length} комментариев в глобальное хранилище`, null, null, 'system');
    }
  }

  _archiveOldTasks(months) { this._taskService.archiveOldTasks(months); }
  _calcSummaryHours(taskId) { return this._budgetService.calcSummaryHours(taskId); }
  _recalcSummaryHoursChain(taskId) {
    const task = this._taskRepo.findById(taskId);
    if (task) this._taskService._recalcSummaryChain(task);
  }
  _canAddChildToParent(parentId, childEstimate, excludeTaskId) {
    return this._budgetService.canAddChildToParent(parentId, childEstimate, excludeTaskId);
  }
  _checkSubtaskBudget(parentId, excludeTaskId) {
    this._budgetService.checkSubtaskBudget(parentId, excludeTaskId);
  }
}

const dataStore = new DataStore();
export default dataStore;