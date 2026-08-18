/**
 * Утилиты для работы со строками и санитизации
 */

/**
 * Санитизация HTML для предотвращения XSS атак
 * Экранирует специальные символы
 */
export const sanitizeHtml = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Безопасная вставка текста в уведомления
 */
export const escapeForNotification = (text: string | null | undefined): string => {
  return sanitizeHtml(text);
};

import type { Employee, Department, StoreData } from '../types';

/**
 * Форматирование имени сотрудника
 */
export const empName = (employees: Employee[] | undefined, id: string | null | undefined): string => {
  if (!id || !employees) return '—';
  const e = employees.find(x => x.id === id);
  return e ? `${e.last} ${e.first}` : '—';
};

/**
 * Получение основного отдела сотрудника
 */
export const primaryDept = (emp: Employee | null | undefined, departments: Department[] | null | undefined): Department | null => {
  if (!emp || !departments) return null;
  const p = emp.departments?.find(x => x.primary) || emp.departments?.[0];
  return p ? departments.find(d => d.id === p.deptId) || null : null;
};

/**
 * Тримминг и нормализация email
 */
export const normalizeEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

/**
 * Проверка на race condition при регистрации
 * Возвращает true если email уже существует
 */
export const isEmailExists = (
  email: string,
  employees: Employee[],
  regRequests: Array<{ email: string }>
): boolean => {
  const normalized = normalizeEmail(email);
  return employees.some((x) => normalizeEmail(x.email) === normalized) ||
         regRequests.some((x) => normalizeEmail(x.email) === normalized);
};

/**
 * Хелпер для безопасного получения имени сотрудника из data object
 */
export const getEmpNameFromData = (data: StoreData | null | undefined, id: string | null | undefined): string => {
  if (!data || !data.employees || !id) return '—';
  return empName(data.employees, id);
};

/**
 * Хелпер для безопасного получения основного отдела из data object
 */
export const getPrimaryDeptFromData = (data: StoreData | null | undefined, emp: Employee | null | undefined): Department | null => {
  if (!data || !data.departments || !emp) return null;
  return primaryDept(emp, data.departments);
};
