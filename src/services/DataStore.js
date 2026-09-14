// src/services/DataStore.js
import { buildMockData } from './mockData';
import { TODAY, iso, addMonths, addDays, uid, fmtDMY } from '../utils/date';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, VACATION_TYPES, PROJECT_STATUSES, PROJECT_TYPES, DEPENDENCY_TYPES } from '../utils/constants';
import { canChangeTaskStatus } from '../utils/permissions';

// Репозитории
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
import { CommentRepository } from '../repositories/CommentRepository';

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
import { HoursRequestService } from './HoursRequestService';
import { RoleDelegationService } from './RoleDelegationService';
import { CommentService } from './CommentService';

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

    // === AuditService создаём ПЕРВЫМ ===
    this._auditRepo = new AuditRepository(this._data.audit);
    this._auditService = new AuditService(this._auditRepo, () => this._notify());

    // === Миграция комментариев до создания CommentRepository ===
    this._data.comments = this._data.comments || [];
    this._migrateComments();

    // Репозитории
    this._taskRepo = new TaskRepository(this._data.tasks);
    this._projectRepo = new ProjectRepository(this._data.projects);
    this._employeeRepo = new EmployeeRepository(this._data.employees);
    this._vacationRepo = new VacationRepository(this._data.vacations);
    this._notificationRepo = new NotificationRepository(this._data.notifications);
    this._deptRepo = new DepartmentRepository(this._data.departments);
    this._kbRepo = new KbRepository(this._data.kbs);
    this._hoursRequestRepo = new HoursRequestRepository(this._data.hoursRequests);
    this._roleDelegationRepo = new RoleDelegationRepository(this._data.roleDelegations);
    this._commentRepo = new CommentRepository(this._data.comments);

    // Сервисы (AuditService уже создан выше)
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
      () => this._notify(),
      canChangeTaskStatus,
      () => this._data,
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
    this._commentService = new CommentService(
      this._commentRepo,
      this._notificationService,
      this._auditService,
      () => this._notify()
    );

    this._taskService.archiveOldTasks(3);
  }

  // ---------- Публичный API ----------

  get data() { return this._data; }

  subscribe(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(cb => cb !== callback); };
  }

  /**
   * Оповещает подписчиков о новых данных.
   *
   * Repository.save() мутирует элементы массива по индексу, поэтому
   * корневой {...this._data} не меняет ссылки вложенных коллекций. Без
   * shallow-copy массивов useMemo с deps [data.employees] / [data.tasks]
   * не пересчитается. Копируем все коллекции явным перечислением: дороже
   * на 12 аллокаций, зато поведение предсказуемо и не зависит от того,
   * добавит ли кто-то новую коллекцию в _data.
   */
  _notify() {
    const d = this._data;
    const snapshot = {
      ...d,
      settings: { ...d.settings },
      employees: [...d.employees],
      projects: [...d.projects],
      tasks: [...d.tasks],
      vacations: [...d.vacations],
      notifications: [...d.notifications],
      audit: [...d.audit],
      comments: [...d.comments],
      departments: [...d.departments],
      kbs: [...d.kbs],
      hoursRequests: [...d.hoursRequests],
      roleDelegations: [...d.roleDelegations],
      regRequests: [...d.regRequests],
    };
    this._listeners.forEach(cb => cb(snapshot));
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
    const isSelf = !!(user && emp.id === user.id);
    this._employeeService.upsertEmployee(emp, user?.id || 'system');
    // EmployeeService уже дёрнул _notify с прежней ссылкой сессии.
    // Синхронизируем _currentUser: иначе правки своего профиля
    // (пароль, фото, телефон) не долетают до useAuth.
    if (isSelf) this._authService.refreshCurrentUser();
  }
  empName(id) { return this._employeeService.getEmployeeName(id); }

  /**
   * Самостоятельная регистрация сотрудника — единственная точка входа для
   * LoginScreen. Идёт через EmployeeService, а не через прямую мутацию
   * _data: Repository держит ссылку на массив employees, и подмена массива
   * «снаружи» оставила бы репозиторий смотреть в старый массив.
   */
  registerEmployee(payload) {
    return this._employeeService.registerEmployee(payload, 'system');
  }

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

  addHoursRequest(req) { this._hoursRequestService.addRequest(req); }

  upsertRoleDelegation(rd) {
    const user = this._authService.getCurrentUser();
    this._roleDelegationService.upsertRoleDelegation(rd, user?.id || 'system');
  }

  // ---------- КОММЕНТАРИИ ----------

  getComments(filter = {}) {
    return this._commentService.getComments(filter);
  }

  addComment(data) {
    return this._commentService.addComment(data);
  }

  updateComment(id, newText) {
    return this._commentService.updateComment(id, newText);
  }

  deleteComment(id) {
    this._commentService.deleteComment(id);
  }

  togglePinComment(commentId) {
    const user = this._authService.getCurrentUser();
    return this._commentService.togglePin(commentId, user?.id || 'system');
  }

  setReaction(commentId, emoji) {
    const user = this._authService.getCurrentUser();
    if (!user) throw new Error('Требуется вход в систему');
    return this._commentService.setReaction(commentId, user.id, emoji);
  }

  // обратная совместимость
  toggleReaction(commentId, emoji) {
    return this.setReaction(commentId, emoji);
  }

  addAttachment(commentId, file) {
    return this._commentService.addAttachment(commentId, file);
  }

  // ---------- МИГРАЦИЯ КОММЕНТАРИЕВ ----------

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
        null, null, 'system'
      );
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