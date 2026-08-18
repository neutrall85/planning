/**
 * JSDoc типизация для основных сущностей приложения
 * Используется для улучшения TypeScript-поддержки в JSX файлах
 */

/**
 * Роль пользователя в системе
 */
export type Role = 
  | 'admin'
  | 'director'
  | 'economist'
  | 'kb_chief'
  | 'head'
  | 'project_lead'
  | 'project_manager'
  | 'hr'
  | 'executor';

/**
 * Статус задачи
 */
export type TaskStatus = 'new' | 'inwork' | 'review' | 'closed' | 'cancelled';

/**
 * Приоритет задачи
 */
export type Priority = 'low' | 'mid' | 'high' | 'crit';

/**
 * Тип зависимости между задачами
 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/**
 * Статус проекта
 */
export type ProjectStatus = 'active' | 'inactive' | 'closed' | 'cancelled';

/**
 * Тип проекта
 */
export type ProjectType = 'prod' | 'admin';

/**
 * Категория приоритета проекта
 */
export type ProjectCategory = 'AOG' | 'CRIT' | 'NORM';

/**
 * Тип отпуска
 */
export type VacationType = 'annual' | 'admin' | 'sick' | 'other';

/**
 * Статус отпуска
 */
export type VacationStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

/**
 * Тип цели уведомления
 */
export type NotificationTargetType = 'task' | 'project' | 'vacation' | 'comment' | 'system';

/**
 * Отдел
 */
export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  kbId?: string;
}

/**
 * Привязка сотрудника к отделу
 */
export interface EmployeeDepartment {
  deptId: string;
  primary?: boolean;
  roleId?: Role;
}

/**
 * Сотрудник
 */
export interface Employee {
  id: string;
  last: string;
  first: string;
  middle?: string;
  email: string;
  pass?: string;
  position: string;
  departments: EmployeeDepartment[];
  roles: Role[];
  kbIds: string[];
  headDeptIds: string[];
  phone?: string;
  extension?: string;
  tab?: string;
  notif?: {
    deadlineEmail: boolean;
    overdueDigest: boolean;
    commentSub: boolean;
  };
  failed?: number;
  lockUntil?: number;
  fired?: boolean;
  photo?: string | null;
  createdAt?: string;
  updatedAt?: string;
  passwordHistory?: string[];
  delegatedTasksCount?: number;
}

/**
 * Задача
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  status: TaskStatus;
  priority: Priority;
  assigneeIds: string[];
  creatorId: string;
  plannedHours?: number;
  actualHours?: number;
  deadline?: string;
  dependencyId?: string | null;
  dependencyType?: DependencyType;
  createdAt?: string;
  closedAt?: string;
  archived?: boolean;
  archivedAt?: string;
}

/**
 * Проект
 */
export interface Project {
  id: string;
  name: string;
  code: string;
  ptype?: ProjectType;
  status?: ProjectStatus;
  category?: ProjectCategory;
  budget?: number;
  managerId: string;
  startDate?: string;
  endDate?: string;
  archived?: boolean;
  archivedAt?: string;
}

/**
 * Делегирование на время отпуска
 */
export interface Delegation {
  enabled?: boolean;
  subId?: string;
  statuses?: TaskStatus[];
  state?: string;
}

/**
 * Отпуск
 */
export interface Vacation {
  id: string;
  empId: string;
  start: string;
  end: string;
  type: VacationType;
  status?: VacationStatus;
  delegation?: Delegation;
  comment?: string;
}

/**
 * Уведомление
 */
export interface Notification {
  id: string;
  userId: string;
  text: string;
  ts: number;
  read?: boolean;
  targetType?: NotificationTargetType | null;
  targetId?: string | null;
}

/**
 * Комментарий
 */
export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  mentions?: string[];
}

/**
 * Запись аудита
 */
export interface AuditLog {
  id: string;
  action: string;
  details: string;
  entityType?: string;
  entityId?: string;
  userId: string;
  timestamp: string;
}

/**
 * Заявка на регистрацию
 */
export interface RegRequest {
  id: string;
  email: string;
  first: string;
  last: string;
  token: string;
  createdAt: string;
}

/**
 * Конструкторское бюро
 */
export interface KB {
  id: string;
  name: string;
  full: string;
}

/**
 * Настройки системы
 */
export interface Settings {
  archiveMonths: number;
}

/**
 * Заявка на часы
 */
export interface HoursRequest {
  id: string;
  taskId: string;
  employeeId: string;
  hours: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

/**
 * Делегирование ролей
 */
export interface RoleDelegation {
  id: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  roleId: string;
  startDate: string;
  endDate: string;
}

/**
 * Данные хранилища
 */
export interface StoreData {
  settings: Settings;
  kbs: KB[];
  employees: Employee[];
  departments: Department[];
  tasks: Task[];
  projects: Project[];
  vacations: Vacation[];
  notifications: Notification[];
  comments: Comment[];
  auditLog: AuditLog[];
  regRequests: RegRequest[];
  hoursRequests: HoursRequest[];
  roleDelegations: RoleDelegation[];
}

/**
 * Результат валидации
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

/**
 * Опции повторяющихся задач
 */
export type RepeatType = 'none' | 'daily' | 'weekly_days' | 'workdays' | 'monthly' | 'yearly' | 'custom';
export type RepeatEndType = 'date' | 'count';

/**
 * Конфигурация повторения задачи
 */
export interface RepeatConfig {
  type: RepeatType;
  interval?: number;
  workdays?: number[];
  endDate?: string;
  count?: number;
}

/**
 * Расширенная задача с конфигурацией повторения
 */
export interface TaskWithRepeat extends Task {
  repeat?: RepeatConfig;
  parentTaskId?: string;
}
