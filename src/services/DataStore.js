// src/services/DataStore.js
import { buildMockData } from './mockData';
import { uid } from '../utils/date';
import { withSyncedExecutorRole } from './roleSync';
import {
  canChangeTaskStatus,
  canChangeProjectStatus,
  canManageProjectAccess,
  canRestore,
  canRestoreTask,
} from '../utils/permissions';
import { isCountableTask } from '../utils/workloadFilters';
import { chatKey } from '../utils/chatKey';

// Репозитории
import { TaskRepository } from '../repositories/TaskRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { VacationRepository } from '../repositories/VacationRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { AuditRepository } from '../repositories/AuditRepository';
import { DepartmentRepository } from '../repositories/DepartmentRepository';
import { KbRepository } from '../repositories/KbRepository';
import { ChangeRequestRepository } from '../repositories/ChangeRequestRepository';
import { RoleDelegationRepository } from '../repositories/RoleDelegationRepository';
import { CommentRepository } from '../repositories/CommentRepository';
import { TemplateRepository } from '../repositories/TemplateRepository';
import { ProductionCalendarRepository } from '../repositories/ProductionCalendarRepository';
import { RegistrationRequestRepository } from '../repositories/RegistrationRequestRepository';
import { ChatReadRepository } from '../repositories/ChatReadRepository';

// Сервисы
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
import { ChangeRequestService } from './ChangeRequestService';
import { RoleDelegationService } from './RoleDelegationService';
import { CommentService } from './CommentService';
import { TemplateService } from './TemplateService';
import { WorkloadService } from './WorkloadService';
import { ProductionCalendarService } from './ProductionCalendarService';
import { RegistrationRequestService } from './RegistrationRequestService';
import { ChatReadService } from './ChatReadService';

// Утилиты
import { WorkCalendar } from '../utils/workCalendar';

class DataMigrator {
  static migrate(data) {
    const notes = new Set();

    data.tasks = data.tasks.map(t => {
      if (Array.isArray(t.assigneeIds) && !t.assigneeId) {
        notes.add('задачи приведены к формату с одним исполнителем');
        const { assigneeIds, ...rest } = t;
        return { ...rest, assigneeId: assigneeIds[0] ?? null };
      }
      return t;
    });

    data.tasks = data.tasks.map(t => {
      const updated = { ...t };
      if (updated.actualHours === undefined) {
        updated.actualHours = 0;
        notes.add('добавлены поля actualHours/budgetHours');
      }
      if (updated.isSummary && updated.budgetHours === undefined) {
        updated.budgetHours = updated.plannedHours || 0;
        notes.add('добавлены поля actualHours/budgetHours');
      }
      return updated;
    });

    data.projects = data.projects.map(p => {
      if (Array.isArray(p.unitIds)) return p;
      notes.add('подразделения проектов перенесены в unitIds');
      const { kbId, ...rest } = p;
      return { ...rest, unitIds: kbId ? [kbId] : [] };
    });

    return { data, changed: notes.size > 0, notes: [...notes] };
  }
}

class DataStore {
  _listeners = [];
  _notifyScheduled = false;

  constructor() {
    this._data = buildMockData();
    const { data, changed, notes } = DataMigrator.migrate(this._data);
    this._data = data;
    if (changed) {
      this._data.audit.unshift({
        id: uid(),
        ts: Date.now(),
        userId: 'system',
        action: 'Миграция данных',
        details: notes.join('; '),
        targetType: null,
        targetId: null,
      });
    }

    this._data.productionCalendar = [];
    this._data.regRequests = this._data.regRequests || [];
    this._data.session = { userId: null };

    this._auditRepo = new AuditRepository(
      () => this._data.audit,
      (next) => this._setSlice('audit', next),
    );
    this._auditService = new AuditService(this._auditRepo, () => this._notify());

    this._data.comments = this._data.comments || [];
    this._data.templates = this._data.templates || [];
    this._data.chatReads = this._data.chatReads || [];
    this._migrateComments();

    this._taskRepo = new TaskRepository(...this._slicePair('tasks'));
    this._projectRepo = new ProjectRepository(...this._slicePair('projects'));
    this._employeeRepo = new EmployeeRepository(...this._slicePair('employees'));
    this._vacationRepo = new VacationRepository(...this._slicePair('vacations'));
    this._notificationRepo = new NotificationRepository(...this._slicePair('notifications'));
    this._deptRepo = new DepartmentRepository(...this._slicePair('departments'));
    this._kbRepo = new KbRepository(...this._slicePair('kbs'));
    this._changeRequestRepo = new ChangeRequestRepository(...this._slicePair('changeRequests'));
    this._roleDelegationRepo = new RoleDelegationRepository(...this._slicePair('roleDelegations'));
    this._commentRepo = new CommentRepository(...this._slicePair('comments'));
    this._templateRepo = new TemplateRepository(...this._slicePair('templates'));
    this._productionCalendarRepo = new ProductionCalendarRepository(...this._slicePair('productionCalendar'));
    this._registrationRequestRepo = new RegistrationRequestRepository(...this._slicePair('regRequests'));
    this._chatReadRepo = new ChatReadRepository(...this._slicePair('chatReads'));

    const notify = () => this._notify();

    this._productionCalendarService = new ProductionCalendarService({
      repo: this._productionCalendarRepo,
      auditService: this._auditService,
      notify,
    });

    this._notificationService = new NotificationService({
      notificationRepo: this._notificationRepo,
      notify,
      getData: () => this._data,
    });

    this._employeeService = new EmployeeService({
      employeeRepo: this._employeeRepo,
      taskRepo: this._taskRepo,
      auditService: this._auditService,
      notify,
    });

    this._budgetService = new BudgetService({
      taskRepo: this._taskRepo,
      projectRepo: this._projectRepo,
      employeeRepo: this._employeeRepo,
    });

    this._taskService = new TaskService({
      taskRepo: this._taskRepo,
      projectRepo: this._projectRepo,
      employeeRepo: this._employeeRepo,
      budgetService: this._budgetService,
      notificationService: this._notificationService,
      auditService: this._auditService,
      notify,
      canChangeStatus: canChangeTaskStatus,
      canRestore,
      canRestoreTask,
      getData: () => this._data,
    });

    this._projectService = new ProjectService({
      projectRepo: this._projectRepo,
      taskRepo: this._taskRepo,
      employeeRepo: this._employeeRepo,
      notificationService: this._notificationService,
      auditService: this._auditService,
      notify,
      canChangeStatus: canChangeProjectStatus,
      canManageAccess: canManageProjectAccess,
      canRestore,
    });

    this._vacationService = new VacationService({
      vacationRepo: this._vacationRepo,
      taskService: this._taskService,
      employeeRepo: this._employeeRepo,
      notificationService: this._notificationService,
      auditService: this._auditService,
      notify,
    });

    this._authService = new AuthService({
      employeeService: this._employeeService,
      auditService: this._auditService,
      notify,
    });

    this._departmentService = new DepartmentService({
      deptRepo: this._deptRepo,
      auditService: this._auditService,
      notify,
    });

    this._kbService = new KbService({
      kbRepo: this._kbRepo,
      auditService: this._auditService,
      notify,
    });

    this._changeRequestService = new ChangeRequestService({
      requestRepo: this._changeRequestRepo,
      taskRepo: this._taskRepo,
      projectRepo: this._projectRepo,
      notificationService: this._notificationService,
      auditService: this._auditService,
      notify,
    });

    this._roleDelegationService = new RoleDelegationService({
      roleDelegationRepo: this._roleDelegationRepo,
      employeeRepo: this._employeeRepo,
      notificationService: this._notificationService,
      auditService: this._auditService,
      notify,
    });

    this._registrationRequestService = new RegistrationRequestService({
      requestRepo: this._registrationRequestRepo,
      employeeService: this._employeeService,
      auditService: this._auditService,
      notify,
    });

    this._commentService = new CommentService({
      commentRepo: this._commentRepo,
      notificationService: this._notificationService,
      auditService: this._auditService,
      notify,
    });

    this._templateService = new TemplateService({
      templateRepo: this._templateRepo,
      auditService: this._auditService,
      notify,
      taskService: this._taskService,
    });

    this._chatReadService = new ChatReadService({
      chatReadRepo: this._chatReadRepo,
      notify,
    });

    this._workCalendar = new WorkCalendar({
      getYearData:    (year) => this._productionCalendarService.getYearData(year),
      getDataVersion: ()     => this._productionCalendarService.version,
    });
    this._workloadService = new WorkloadService(this._workCalendar);

    this._syncAllExecutorRoles();
    this._taskService.archiveOldTasks(3);
  }

  _slicePair = (name) => [
    () => this._data[name],
    (next) => this._setSlice(name, next),
  ];

  _setSlice = (name, next) => {
    if (this._data[name] === next) return;
    this._data = { ...this._data, [name]: next };
    this._notify();
  };

  setDb = (updater) => {
    const next = updater(this._data);
    if (next === this._data) return;
    this._data = next;
    this._notify();
  };

  setArchiveMonths = (months) => {
    this._setSlice('settings', { ...this._data.settings, archiveMonths: months });
  };

  upsertTask = (task) => {
    const user = this._authService.getCurrentUser();
    this._taskService.upsertTask(task, user?.id || 'system');
  };

  patchTask = (taskId, patch) => {
    const user = this._authService.getCurrentUser();
    return this._taskService.patchTask(taskId, patch, user?.id || 'system');
  };

  upsertProject = (project) => {
    const user = this._authService.getCurrentUser();
    this._projectService.upsertProject(project, user);
  };

  patchProject = (projectId, patch) => {
    const user = this._authService.getCurrentUser();
    return this._projectService.patchProject(projectId, patch, user);
  };

  addAudit = (action, details, targetType = null, targetId = null) => {
    const user = this._authService.getCurrentUser();
    this._auditService.addAudit(action, details, targetType, targetId, user?.id || 'system');
  };

  markAllNotificationsRead = (userId) => {
    this._notificationService.markAllNotificationsRead(userId);
  };

  setEmployeeFired = (empId, fired) => {
    const user = this._authService.getCurrentUser();
    const isSelf = !!(user && empId === user.id);
    const result = this._employeeService.setFired(empId, fired, user?.id || 'system');
    if (isSelf) {
      this._authService.refreshCurrentUser();
      this._syncSession();
    }
    return result;
  };

  decideVacation = (vacationId, approved, reason = null) => {
    const user = this._authService.getCurrentUser();
    return this._vacationService.decide(vacationId, approved, user?.id || 'system', reason);
  };

  decideRoleDelegation = (delegationId, approved, reason = null) => {
    const user = this._authService.getCurrentUser();
    return this._roleDelegationService.decide(delegationId, approved, user?.id || 'system', reason);
  };

  /**
   * Решение по запросу на изменение (часов / срока / …). reason
   * обязателен при approved === false.
   */
  decideChangeRequest = (requestId, approved, reason = null) => {
    const user = this._authService.getCurrentUser();
    return this._changeRequestService.decide(
      requestId, approved, user?.id || 'system', reason,
    );
  };

  decideRegistration = (requestId, approved, reason = null) => {
    const user = this._authService.getCurrentUser();
    return this._registrationRequestService.decide(
      requestId, approved, user?.id || 'system', reason,
    );
  };

  get data() { return this._data; }

  getSnapshot = () => this._data;

  subscribe = (callback) => {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  };

  _notify() {
    if (this._notifyScheduled) return;
    this._notifyScheduled = true;
    queueMicrotask(() => {
      this._notifyScheduled = false;
      const listeners = this._listeners.slice();
      for (let i = 0; i < listeners.length; i++) {
        try {
          listeners[i]();
        } catch (err) {
          console.error('[DataStore] подписчик', i, 'упал:', err);
        }
      }
    });
  }

  getCurrentUser() { return this._authService.getCurrentUser(); }

  login = (email, password) => {
    const result = this._authService.login(email, password);
    if (result === true) {
      const user = this._authService.getCurrentUser();
      this._setSlice('session', { userId: user?.id || null });
    }
    return result;
  };

  logout = () => {
    this._authService.logout();
    this._setSlice('session', { userId: null });
  };

  // Задачи
  deleteTask(id) {
    const user = this._authService.getCurrentUser();
    this._taskService.deleteTask(id, user?.id || 'system');
  }
  getRemainingHours(taskId) { return this._taskService.getRemainingHours(taskId); }
  setBudget(taskId, newBudget) {
    const user = this._authService.getCurrentUser();
    return this._taskService.setBudget(taskId, newBudget, user?.id || 'system');
  }
  addTaskLog(taskId, message) {
    const user = this._authService.getCurrentUser();
    this._taskService.addTaskLog(taskId, message, user?.id || 'system');
  }

  upsertTaskNote(taskId, note) {
    const user = this._authService.getCurrentUser();
    if (!user) throw new Error('Требуется вход в систему');
    this._taskService.upsertTaskNote(taskId, user.id, note);
  }

  deleteTaskNote(taskId, noteId) {
    const user = this._authService.getCurrentUser();
    if (!user) throw new Error('Требуется вход в систему');
    this._taskService.deleteTaskNote(taskId, user.id, noteId);
  }

  // Проекты
  deleteProject(id) {
    const user = this._authService.getCurrentUser();
    this._projectService.deleteProject(id, user?.id || 'system');
  }
  setProjectAccess(projectId, access) {
    const user = this._authService.getCurrentUser();
    return this._projectService.setAccess(projectId, access, user);
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
    const isSelf = !!(user && emp.id === user.id);
    this._employeeService.upsertEmployee(emp, user?.id || 'system');
    if (isSelf) {
      this._authService.refreshCurrentUser();
      this._syncSession();
    }
  }

  _syncSession = () => {
    const user = this._authService.getCurrentUser();
    const nextUserId = user?.id || null;
    const current = this._data.session?.userId || null;
    if (current !== nextUserId) {
      this._setSlice('session', { userId: nextUserId });
    }
  };
  empName(id) { return this._employeeService.getEmployeeName(id); }

  registerEmployee(payload) {
    return this._employeeService.registerEmployee(payload, 'system');
  }

  // Отделы
  upsertDepartment(dept) {
    const user = this._authService.getCurrentUser();
    this._departmentService.upsertDepartment(dept, user?.id || 'system');
  }

  // КБ
  upsertKb(kb) {
    const user = this._authService.getCurrentUser();
    this._kbService.upsertKb(kb, user?.id || 'system');
  }

  // Уведомления
  addNotification(userId, text, target = null) {
    this._notificationService.addNotification(userId, text, target);
  }
  markNotificationRead(id) { this._notificationService.markRead(id); }

  notifyRoleDelegationCreated(delegation) {
    const user = this._authService.getCurrentUser();
    this._notificationService.notifyRoleDelegationCreated(delegation, user?.id || 'system');
  }

  /**
   * Создание запроса на изменение. recipientIds — кому адресован
   * запрос (директора/админы). Уведомление получателям и автору
   * отправляется внутри сервиса — вызывающему не нужно об этом помнить.
   */
  addChangeRequest = (req, recipientIds = []) => {
    this._changeRequestService.addRequest(req, recipientIds);
  };

  upsertRoleDelegation(rd) {
    const user = this._authService.getCurrentUser();
    this._roleDelegationService.upsertRoleDelegation(rd, user?.id || 'system');
  }

  // Комментарии
  getComments(filter = {}) { return this._commentService.getComments(filter); }
  getCommentMatches(filter = {}) { return this._commentService.getMatches(filter); }
  addComment(data) { return this._commentService.addComment(data); }
  updateComment(id, newText) { return this._commentService.updateComment(id, newText); }
  deleteComment(id) { this._commentService.deleteComment(id); }

  togglePinComment(commentId) {
    const user = this._authService.getCurrentUser();
    return this._commentService.togglePin(commentId, user?.id || 'system');
  }
  setReaction(commentId, emoji) {
    const user = this._authService.getCurrentUser();
    if (!user) throw new Error('Требуется вход в систему');
    return this._commentService.setReaction(commentId, user.id, emoji);
  }
  toggleReaction(commentId, emoji) { return this.setReaction(commentId, emoji); }
  addAttachment(commentId, file) { return this._commentService.addAttachment(commentId, file); }

  // Отметки прочтения чата
  markChatRead = (userId, filter) =>
    this._chatReadService.markRead(userId, chatKey(filter), Date.now());

  // Шаблоны
  getTemplates(kind) {
    const user = this._authService.getCurrentUser();
    return this._templateService.getVisible(kind, user);
  }
  getAllTemplates() {
    const user = this._authService.getCurrentUser();
    return this._templateService.getAllVisible(user);
  }
  saveTemplate(input) {
    const user = this._authService.getCurrentUser();
    return this._templateService.create(input, user);
  }
  updateTemplate(id, patch) {
    const user = this._authService.getCurrentUser();
    return this._templateService.update(id, patch, user);
  }
  deleteTemplate(id) {
    const user = this._authService.getCurrentUser();
    this._templateService.remove(id, user);
  }
  instantiateTemplateTasks(projectId, payloads) {
    const user = this._authService.getCurrentUser();
    return this._templateService.instantiateTaskTree(payloads, {
      projectId,
      actorId: user?.id || 'system',
    });
  }
  instantiateTemplateSubtasks(parentTaskId, payloads) {
    const user = this._authService.getCurrentUser();
    const parent = this._taskRepo.findById(parentTaskId);
    if (!parent) {
      return { created: 0, failed: 0, errors: [{ title: null, message: 'Родительская задача не найдена' }] };
    }
    return this._templateService.instantiateTaskTree(payloads, {
      projectId: parent.projectId,
      parentTaskId,
      actorId: user?.id || 'system',
    });
  }

  // Производственный календарь
  getProductionCalendarYears() { return this._productionCalendarService.getAll(); }
  getYearCalendar(year) { return this._workCalendar.describeYear(year); }

  addProductionCalendarYear(year) {
    const user = this._authService.getCurrentUser();
    this._productionCalendarService.addYear(year, user?.id || 'system');
  }
  removeProductionCalendarYear(year) {
    const user = this._authService.getCurrentUser();
    this._productionCalendarService.removeYear(year, user?.id || 'system');
  }
  addProductionCalendarDays(year, kind, dates) {
    const user = this._authService.getCurrentUser();
    this._productionCalendarService.addDays(year, kind, dates, user?.id || 'system');
  }
  removeProductionCalendarDay(year, kind, date) {
    const user = this._authService.getCurrentUser();
    this._productionCalendarService.removeDay(year, kind, date, user?.id || 'system');
  }

  // Загрузка
  getWorkload(fromIso, toIso) {
    const employees = this._employeeRepo.findAll().filter(e => !e.fired);
    const tasks = this._taskRepo.findAll().filter(
      t => t.assigneeId && isCountableTask(t),
    );
    return this._workloadService.buildWorkload(employees, tasks, fromIso, toIso);
  }
  getPeriodCapacity(fromIso, toIso) {
    return {
      workdays:    this._workCalendar.countWorkdays(fromIso, toIso),
      hoursPerDay: this._workCalendar.hoursPerDay,
      hours:       this._workCalendar.capacityHours(fromIso, toIso),
    };
  }
  checkAssigneeOverload(candidateTask, fromIso, toIso) {
    if (!candidateTask?.assigneeId) return null;
    if (!fromIso || !toIso) return null;
    const existing = this._taskRepo.findAll().filter(
      t => isCountableTask(t) && t.id !== candidateTask.id,
    );
    return this._workloadService.findOverload(
      candidateTask.assigneeId, existing, fromIso, toIso, candidateTask,
    );
  }

  // Миграция комментариев (до subscribe, мутация безопасна)
  _migrateComments() {
    if (this._data.comments?.length) return;

    const pull = (entities, projectIdOf, taskIdOf) => {
      const out = [];
      for (const entity of entities) {
        for (const c of entity.comments || []) {
          out.push({
            id: c.id || uid(),
            projectId: projectIdOf(entity),
            taskId: taskIdOf(entity),
            parentId: c.parentId || null,
            authorId: c.authorId,
            text: c.text,
            attachments: c.attachments || [],
            reactions: {},
            createdAt: c.ts || Date.now(),
            updatedAt: c.ts || Date.now(),
            pinned: c.pinned || false,
          });
        }
        delete entity.comments;
      }
      return out;
    };

    const migrated = [
      ...pull(this._data.projects || [], p => p.id, () => null),
      ...pull(this._data.tasks || [], t => t.projectId, t => t.id),
    ];

    this._data.comments = migrated;

    if (migrated.length) {
      this._auditService.addAudit(
        'Миграция комментариев',
        `Перенесено ${migrated.length} комментариев в глобальное хранилище`,
        null, null, 'system',
      );
    }
  }

  _syncAllExecutorRoles() {
    for (const emp of this._data.employees) {
      const before = emp.roles || [];
      const after = withSyncedExecutorRole(emp.id, before, { taskRepo: this._taskRepo });
      const changed =
        after.length !== before.length ||
        after.some((r, i) => r !== before[i]);
      if (changed) emp.roles = after;
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