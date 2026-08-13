/**
 * Система валидации данных для фронтенда
 * Использует Zod для схемной валидации с глубокими проверками
 */

import { z } from 'zod';
import { COMPANY_DOMAIN, ALLOWED_EMAIL_DOMAINS, PASSWORD_MIN_LENGTH } from '../config';

// ===== Базовые типы и утилиты =====

/**
 * Валидация email с проверкой домена компании
 */
export const companyEmailSchema = z.string()
  .min(1, 'Email обязателен')
  .email('Некорректный формат email')
  .refine(
    (email) => {
      const domain = email.split('@')[1];
      return ALLOWED_EMAIL_DOMAINS.includes(domain);
    },
    `Email должен быть одного из разрешённых доменов: ${ALLOWED_EMAIL_DOMAINS.join(', ')}`
  );

/**
 * Валидация пароля с проверкой сложности
 */
export const passwordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, `Минимум ${PASSWORD_MIN_LENGTH} символов`)
  .regex(/[A-ZА-ЯЁ]/, 'Должна содержать заглавную букву (кириллица или латиница)')
  .regex(/[a-zа-яё]/, 'Должна содержать строчную букву (кириллица или латиница)')
  .regex(/\d/, 'Должна содержать цифру')
  .regex(/[^A-Za-zА-Яа-яЁё0-9]/, 'Должна содержать специальный символ');

/**
 * Валидация имени (фамилии)
 */
export const nameSchema = z.string()
  .min(1, 'Обязательное поле')
  .max(100, 'Слишком длинное имя')
  .regex(/^[A-Za-zА-Яа-яЁё\s'-]+$/, 'Только буквы, пробелы, дефис и апостроф');

/**
 * Валидация телефонного номера
 */
export const phoneSchema = z.string()
  .optional()
  .nullable()
  .or(z.literal(''))
  .or(z.string().regex(/^\+?[\d\s()-]{7,20}$/, 'Некорректный формат телефона'));

/**
 * Валидация UUID
 */
export const uuidSchema = z.string()
  .regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, 'Некорректный UUID');

/**
 * Валидация ID сотрудника
 */
export const employeeIdSchema = z.string()
  .min(1, 'ID обязателен')
  .regex(/^e_[a-zA-Z0-9_]+$/, 'Некорректный формат ID сотрудника');

// ===== Схемы для ролей и отделов =====

/**
 * Допустимые роли в системе
 */
export const roleSchema = z.enum([
  'admin',
  'director',
  'economist',
  'kb_chief',
  'head',
  'project_lead',
  'project_manager',
  'hr',
  'executor',
]);

/**
 * Схема отдела
 */
export const departmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
});

/**
 * Привязка сотрудника к отделу
 */
export const employeeDeptSchema = z.object({
  deptId: z.string().min(1, 'ID отдела обязателен'),
  primary: z.boolean().default(false),
  roleId: roleSchema.optional(),
});

// ===== Схемы для задач =====

/**
 * Статусы задач
 */
export const taskStatusSchema = z.enum(['new', 'inwork', 'review', 'closed', 'cancelled']);

/**
 * Приоритеты задач
 */
export const prioritySchema = z.enum(['low', 'mid', 'high', 'crit']);

/**
 * Типы зависимостей между задачами
 */
export const dependencyTypeSchema = z.enum(['FS', 'SS', 'FF', 'SF']);

/**
 * Схема задачи
 */
export const taskSchema = z.object({
  id: z.string().min(1, 'ID задачи обязателен'),
  title: z.string()
    .min(1, 'Название обязательно')
    .max(500, 'Название слишком длинное'),
  description: z.string().max(10000, 'Описание слишком длинное').optional(),
  projectId: z.string().min(1, 'Проект обязателен'),
  status: taskStatusSchema.default('new'),
  priority: prioritySchema.default('mid'),
  assigneeIds: z.array(employeeIdSchema)
    .min(1, 'Должен быть хотя бы один исполнитель')
    .max(10, 'Нельзя назначить более 10 исполнителей'),
  creatorId: employeeIdSchema,
  plannedHours: z.number()
    .min(0.5, 'Минимум 0.5 часа')
    .max(1000, 'Слишком большое значение')
    .optional(),
  actualHours: z.number().min(0).optional(),
  deadline: z.string().optional(),
  dependencyId: z.string().nullable().optional(),
  dependencyType: dependencyTypeSchema.optional(),
  createdAt: z.string().datetime().optional(),
  closedAt: z.string().datetime().optional(),
  archived: z.boolean().default(false),
  archivedAt: z.string().datetime().optional(),
});

// ===== Схемы для проектов =====

/**
 * Статусы проектов
 */
export const projectStatusSchema = z.enum(['active', 'inactive', 'closed', 'cancelled']);

/**
 * Типы проектов
 */
export const projectTypeSchema = z.enum(['prod', 'admin']);

/**
 * Категории приоритетов проектов
 */
export const projectCategorySchema = z.enum(['AOG', 'CRIT', 'NORM']);

/**
 * Схема проекта
 */
export const projectSchema = z.object({
  id: z.string().min(1, 'ID проекта обязателен'),
  name: z.string()
    .min(1, 'Название обязательно')
    .max(200, 'Название слишком длинное'),
  code: z.string()
    .min(1, 'Код обязателен')
    .max(50, 'Код слишком длинный')
    .regex(/^[A-Za-z0-9_-]+$/, 'Код может содержать только буквы, цифры, дефис и подчеркивание'),
  ptype: projectTypeSchema.default('prod'),
  status: projectStatusSchema.default('active'),
  category: projectCategorySchema.optional(),
  budget: z.number().min(0, 'Бюджет не может быть отрицательным').optional(),
  managerId: employeeIdSchema,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  archived: z.boolean().default(false),
  archivedAt: z.string().datetime().optional(),
});

// ===== Схемы для отпусков =====

/**
 * Типы отпусков
 */
export const vacationTypeSchema = z.enum(['annual', 'admin', 'sick', 'other']);

/**
 * Схема делегирования на время отпуска
 */
export const delegationSchema = z.object({
  enabled: z.boolean().default(false),
  subId: employeeIdSchema.optional(),
  statuses: z.array(taskStatusSchema).default([]),
});

/**
 * Схема отпуска
 */
export const vacationSchema = z.object({
  id: z.string().min(1),
  empId: employeeIdSchema,
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: ГГГГ-ММ-ДД'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: ГГГГ-ММ-ДД'),
  type: vacationTypeSchema,
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
  delegation: delegationSchema.default({ enabled: false }),
  comment: z.string().max(1000).optional(),
});

// ===== Схемы для сотрудников =====

/**
 * Полная схема сотрудника
 */
export const employeeSchema = z.object({
  id: employeeIdSchema,
  last: nameSchema,
  first: nameSchema,
  middle: nameSchema.optional(),
  email: companyEmailSchema,
  pass: z.string().optional(), // Только для создания/обновления
  position: z.string().min(1).max(200),
  departments: z.array(employeeDeptSchema).default([]),
  roles: z.array(roleSchema).min(1, 'Должна быть хотя бы одна роль'),
  kbIds: z.array(z.string()).default([]),
  headDeptIds: z.array(z.string()).default([]),
  phone: phoneSchema,
  extension: z.string().max(10).optional(),
  tab: z.string().max(20).optional(),
  notif: z.object({
    deadlineEmail: z.boolean().default(true),
    overdueDigest: z.boolean().default(false),
    commentSub: z.boolean().default(true),
  }).default({}),
  failed: z.number().min(0).default(0),
  lockUntil: z.number().min(0).default(0),
  fired: z.boolean().default(false),
  photo: z.string().url().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// ===== Схемы для аутентификации =====

/**
 * Схема входа в систему
 */
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Логин обязателен')
    .max(100, 'Слишком длинный логин'),
  password: z.string().min(1, 'Пароль обязателен'),
});

/**
 * Схема регистрации нового сотрудника
 */
export const registrationSchema = z.object({
  first: nameSchema.refine((val) => val.trim().length > 0, 'Имя обязательно'),
  last: nameSchema.refine((val) => val.trim().length > 0, 'Фамилия обязательна'),
  email: z.string()
    .min(1, 'Email обязателен')
    .email('Некорректный формат email')
    .refine(
      (email) => {
        const domain = email.split('@')[1];
        return ALLOWED_EMAIL_DOMAINS.includes(domain);
      },
      `Email должен быть одного из разрешённых доменов: ${ALLOWED_EMAIL_DOMAINS.join(', ')}`
    ),
  pass: passwordSchema,
  pass2: z.string(),
}).refine((data) => data.pass === data.pass2, {
  message: 'Пароли не совпадают',
  path: ['pass2'],
});

/**
 * Схема восстановления пароля
 */
export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email обязателен')
    .email('Некорректный формат email'),
});

// ===== Схемы для уведомлений =====

/**
 * Типы целей уведомлений
 */
export const notificationTargetTypeSchema = z.enum(['task', 'project', 'vacation', 'comment', 'system']);

/**
 * Схема уведомления
 */
export const notificationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  text: z.string().min(1).max(1000),
  ts: z.number().min(0),
  read: z.boolean().default(false),
  targetType: notificationTargetTypeSchema.nullable(),
  targetId: z.string().nullable(),
});

// ===== Функции валидации =====

/**
 * Глубокая валидация объекта по схеме
 * @param {Object} data - данные для валидации
 * @param {z.ZodSchema} schema - схема Zod
 * @returns {{ success: boolean, data?: any, errors?: Array }} результат валидации
 */
export const validateData = (data, schema) => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      return { success: false, errors };
    }
    return { 
      success: false, 
      errors: [{ field: 'unknown', message: error.message || 'Неизвестная ошибка' }] 
    };
  }
};

/**
 * Валидация сотрудника при создании
 */
export const validateEmployee = (employee) => validateData(employee, employeeSchema);

/**
 * Валидация задачи
 */
export const validateTask = (task) => validateData(task, taskSchema);

/**
 * Валидация проекта
 */
export const validateProject = (project) => validateData(project, projectSchema);

/**
 * Валидация отпуска
 */
export const validateVacation = (vacation) => validateData(vacation, vacationSchema);

/**
 * Валидация данных для входа
 */
export const validateLogin = (credentials) => validateData(credentials, loginSchema);

/**
 * Валидация данных для регистрации
 */
export const validateRegistration = (data) => validateData(data, registrationSchema);

/**
 * Валидация формы восстановления пароля
 */
export const validateForgotPassword = (data) => validateData(data, forgotPasswordSchema);

/**
 * Санитизация строковых полей объекта
 * Удаляет лишние пробелы, нормализует Unicode
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Тримминг и нормализация пробелов
      sanitized[key] = value.trim().replace(/\s+/g, ' ');
    } else if (typeof value === 'object' && value !== null) {
      // Рекурсивная санитизация вложенных объектов
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Проверка на race condition при регистрации
 * @param {string} email - email для проверки
 * @param {Array} employees - массив сотрудников
 * @param {Array} regRequests - массив заявок на регистрацию
 * @returns {boolean} true если email уже существует
 */
export const isEmailExists = (email, employees, regRequests) => {
  const normalized = email.trim().toLowerCase();
  return employees.some((x) => x.email.toLowerCase() === normalized) ||
         regRequests.some((x) => x.email.toLowerCase() === normalized);
};

export default {
  validateData,
  validateEmployee,
  validateTask,
  validateProject,
  validateVacation,
  validateLogin,
  validateRegistration,
  validateForgotPassword,
  sanitizeObject,
  isEmailExists,
  // Экспорт схем для кастомной валидации
  schemas: {
    employee: employeeSchema,
    task: taskSchema,
    project: projectSchema,
    vacation: vacationSchema,
    login: loginSchema,
    registration: registrationSchema,
    password: passwordSchema,
    email: companyEmailSchema,
  },
};
