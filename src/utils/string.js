/**
 * Утилиты для работы со строками и санитизации
 */

/**
 * Санитизация HTML для предотвращения XSS атак
 * Экранирует специальные символы
 */
export const sanitizeHtml = (str) => {
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
export const escapeForNotification = (text) => {
  return sanitizeHtml(text);
};

/**
 * Форматирование имени сотрудника
 * @param {Array} employees - массив сотрудников
 * @param {string} id - ID сотрудника
 * @returns {string} Форматированное имя или "—"
 */
export const empName = (employees, id) => {
  if (!id || !employees) return '—';
  const e = employees.find(x => x.id === id);
  return e ? `${e.last} ${e.first}` : '—';
};

/**
 * Получение основного отдела сотрудника
 * @param {Object} emp - сотрудник
 * @param {Array} departments - массив отделов
 * @returns {Object|null} Основной отдел или null
 */
export const primaryDept = (emp, departments) => {
  if (!emp || !departments) return null;
  const p = emp.departments?.find(x => x.primary) || emp.departments?.[0];
  return p ? departments.find(d => d.id === p.deptId) : null;
};

/**
 * Тримминг и нормализация email
 */
export const normalizeEmail = (email) => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

/**
 * Проверка на race condition при регистрации
 * Возвращает true если email уже существует
 */
export const isEmailExists = (email, employees, regRequests) => {
  const normalized = normalizeEmail(email);
  return employees.some((x) => normalizeEmail(x.email) === normalized) ||
         regRequests.some((x) => normalizeEmail(x.email) === normalized);
};

/**
 * Хелпер для безопасного получения имени сотрудника из data object
 * @param {Object} data - объект данных хранилища
 * @param {string} id - ID сотрудника
 * @returns {string} Форматированное имя или "—"
 */
export const getEmpNameFromData = (data, id) => {
  if (!data || !data.employees || !id) return '—';
  return empName(data.employees, id);
};

/**
 * Хелпер для безопасного получения основного отдела из data object
 * @param {Object} data - объект данных хранилища
 * @param {Object} emp - сотрудник
 * @returns {Object|null} Основной отдел или null
 */
export const getPrimaryDeptFromData = (data, emp) => {
  if (!data || !data.departments || !emp) return null;
  return primaryDept(emp, data.departments);
};
