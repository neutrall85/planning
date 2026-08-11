/**
 * BusinessLogicService - бизнес-логика (валидация, расчёт бюджетов, правила перехода статусов)
 * Не хранит данные, работает через DataService
 */

import { TASK_STATUSES, TASK_STATUS_ORDER, PROJECT_STATUSES, DEPENDENCY_TYPES } from '../utils/constants';
import { ARCHIVE_AFTER_MONTHS } from '../utils/config';
import { addMonths, iso } from '../utils/date';
import { sanitizeHtml } from '../utils/string';

export default class BusinessLogicService {
  /**
   * @param {DataService} dataService - сервис данных
   */
  constructor(dataService) {
    this._dataService = dataService;
  }

  // === ВАЛИДАЦИЯ БЮДЖЕТА ПРОЕКТА ===

  /**
   * Проверка соответствия бюджета проекта при изменении задачи
   * @param {Object} task - задача для проверки
   * @param {string|null} existingTaskId - ID существующей задачи (для обновлений)
   * @returns {Object} результат валидации { valid: boolean, error?: string }
   */
  validateTaskBudget(task, existingTaskId = null) {
    const projects = this._dataService.getProjects();
    const project = projects.find(p => p.id === task.projectId);

    if (!project || project.budget == null || project.ptype === 'admin' || project.archived) {
      return { valid: true };
    }

    const tasks = this._dataService.getTasks();
    const otherTasksSum = tasks
      .filter(t => t.projectId === task.projectId && t.id !== task.id && t.id !== existingTaskId)
      .reduce((sum, t) => sum + (t.plannedHours || 0), 0);

    const newTotal = otherTasksSum + (task.plannedHours || 0);

    if (newTotal > project.budget) {
      return {
        valid: false,
        error: `Превышение бюджета проекта! Бюджет: ${project.budget} ч, сумма остальных задач: ${otherTasksSum} ч, запрошено: ${task.plannedHours || 0} ч. Требуется увеличение бюджета проекта.`
      };
    }

    return { valid: true };
  }

  /**
   * Расчёт общего бюджета проекта по задачам
   * @param {string} projectId - ID проекта
   * @returns {number} сумма плановых часов
   */
  calculateProjectBudget(projectId) {
    const tasks = this._dataService.getTasks();
    return tasks
      .filter(t => t.projectId === projectId && !t.archived)
      .reduce((sum, t) => sum + (t.plannedHours || 0), 0);
  }

  /**
   * Проверка доступного бюджета проекта
   * @param {string} projectId - ID проекта
   * @returns {Object} информация о бюджете { budget, spent, remaining, percentUsed }
   */
  getProjectBudgetInfo(projectId) {
    const projects = this._dataService.getProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      return null;
    }

    const spent = this.calculateProjectBudget(projectId);
    const budget = project.budget || 0;
    const remaining = budget - spent;
    const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;

    return {
      budget,
      spent,
      remaining,
      percentUsed: Math.round(percentUsed * 10) / 10
    };
  }

  // === ПРАВИЛА ПЕРЕХОДА СТАТУСОВ ===

  /**
   * Проверка допустимости перехода статуса задачи
   * @param {string} fromStatus - текущий статус
   * @param {string} toStatus - целевой статус
   * @returns {Object} результат { allowed: boolean, reason?: string }
   */
  canTransitionTaskStatus(fromStatus, toStatus) {
    if (fromStatus === toStatus) {
      return { allowed: false, reason: 'Статус не изменился' };
    }

    const statusOrder = TASK_STATUS_ORDER;
    const fromIndex = statusOrder.indexOf(fromStatus);
    const toIndex = statusOrder.indexOf(toStatus);

    if (fromIndex === -1 || toIndex === -1) {
      return { allowed: false, reason: 'Неверный статус' };
    }

    // Разрешаем переход только на один шаг вперёд или назад
    if (Math.abs(toIndex - fromIndex) > 1 && toStatus !== 'cancelled') {
      return { allowed: false, reason: 'Недопустимый переход статуса' };
    }

    // Закрытые и отменённые задачи нельзя изменить
    if (['closed', 'cancelled'].includes(fromStatus)) {
      return { allowed: false, reason: 'Нельзя изменить статус закрытой или отменённой задачи' };
    }

    return { allowed: true };
  }

  /**
   * Проверка допустимости перехода статуса проекта
   * @param {string} fromStatus - текущий статус
   * @param {string} toStatus - целевой статус
   * @returns {Object} результат { allowed: boolean, reason?: string }
   */
  canTransitionProjectStatus(fromStatus, toStatus) {
    if (fromStatus === toStatus) {
      return { allowed: false, reason: 'Статус не изменился' };
    }

    const validTransitions = {
      'planning': ['active', 'cancelled'],
      'active': ['onhold', 'closed', 'cancelled'],
      'onhold': ['active', 'cancelled'],
      'closed': [],
      'cancelled': []
    };

    const transitions = validTransitions[fromStatus];
    if (!transitions || !transitions.includes(toStatus)) {
      return { allowed: false, reason: 'Недопустимый переход статуса проекта' };
    }

    return { allowed: true };
  }

  // === АРХИВАЦИЯ ===

  /**
   * Определение задач для архивации
   * @param {number} monthsAfter - количество месяцев после закрытия
   * @returns {Array<string>} IDs задач для архивации
   */
  getTasksToArchive(monthsAfter = ARCHIVE_AFTER_MONTHS) {
    const tasks = this._dataService.getTasks();
    const cutoff = addMonths(new Date(), -monthsAfter);
    const cutoffIso = iso(cutoff);

    return tasks
      .filter(t => {
        if (t.archived) return false;
        if (!['closed', 'cancelled'].includes(t.status)) return false;
        if (!t.closedAt) return false;
        return t.closedAt < cutoffIso;
      })
      .map(t => t.id);
  }

  /**
   * Проверка необходимости архивации проекта
   * @param {Object} project - проект для проверки
   * @returns {boolean} true если проект должен быть заархивирован
   */
  shouldArchiveProject(project) {
    return ['closed', 'cancelled'].includes(project.status) && !project.archived;
  }

  // === ДЕЛЕГИРОВАНИЕ ===

  /**
   * Получение списка задач для делегирования во время отпуска
   * @param {string} employeeId - ID сотрудника в отпуске
   * @param {Array<string>} statuses - статусы задач для делегирования
   * @param {string} startDate - начало отпуска
   * @param {string} endDate - конец отпуска
   * @returns {Array<Object>} задачи для делегирования
   */
  getTasksForDelegation(employeeId, statuses, startDate, endDate) {
    const tasks = this._dataService.getTasks();

    return tasks.filter(t => {
      if (t.archived) return false;
      if (!t.assigneeIds?.includes(employeeId)) return false;
      if (!statuses.includes(t.status)) return false;

      // Проверяем пересечение дат
      const taskStartDate = t.startDate ? new Date(t.startDate) : null;
      const taskDeadline = t.deadline ? new Date(t.deadline) : null;
      const vacationStart = new Date(startDate);
      const vacationEnd = new Date(endDate);

      if (taskDeadline && taskDeadline < vacationStart) return false;
      if (taskStartDate && taskStartDate > vacationEnd) return false;

      return true;
    });
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

  /**
   * Санитизация текста для предотвращения XSS
   * @param {string} text - текст для санитизации
   * @returns {string} очищенный текст
   */
  sanitizeText(text) {
    return sanitizeHtml(text || '');
  }

  /**
   * Форматирование сообщения о дедлайне
   * @param {Object} task - задача
   * @param {number} daysUntilDeadline - дней до дедлайна
   * @returns {string} текст уведомления
   */
  formatDeadlineNotification(task, daysUntilDeadline) {
    const safeTitle = this.sanitizeText(task.title);
    const daysText = daysUntilDeadline === 1 ? '1 день' : '3 дня';
    return `До дедлайна задачи "${safeTitle}" остался ${daysText}! Дедлайн: ${task.deadline}`;
  }

  /**
   * Проверка актуальности дедлайна для уведомления
   * @param {Object} task - задача
   * @returns {Object|null} { daysUntilDeadline, shouldNotify } или null
   */
  checkDeadlineForNotification(task) {
    if (!task.deadline || ['closed', 'cancelled'].includes(task.status)) {
      return null;
    }

    const now = new Date();
    const deadlineDate = new Date(task.deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDeadline === 3 || daysUntilDeadline === 1) {
      return { daysUntilDeadline, shouldNotify: true };
    }

    return { daysUntilDeadline, shouldNotify: false };
  }

  /**
   * Валидация данных сотрудника
   * @param {Object} emp - данные сотрудника
   * @returns {Object} результат валидации { valid: boolean, errors: Array }
   */
  validateEmployee(emp) {
    const errors = [];

    if (!emp.last || !emp.first) {
      errors.push('Фамилия и имя обязательны');
    }

    if (!emp.email || !emp.email.includes('@')) {
      errors.push('Некорректный email');
    }

    if (emp.departments && !Array.isArray(emp.departments)) {
      errors.push('Подразделения должны быть массивом');
    }

    if (emp.roles && !Array.isArray(emp.roles)) {
      errors.push('Роли должны быть массивом');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Валидация данных проекта
   * @param {Object} project - данные проекта
   * @returns {Object} результат валидации { valid: boolean, errors: Array }
   */
  validateProject(project) {
    const errors = [];

    if (!project.name || !project.code) {
      errors.push('Название и код проекта обязательны');
    }

    if (project.budget != null && (typeof project.budget !== 'number' || project.budget < 0)) {
      errors.push('Бюджет должен быть неотрицательным числом');
    }

    if (project.ptype && !['admin', 'commercial', 'internal'].includes(project.ptype)) {
      errors.push('Неверный тип проекта');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Валидация данных задачи
   * @param {Object} task - данные задачи
   * @returns {Object} результат валидации { valid: boolean, errors: Array }
   */
  validateTask(task) {
    const errors = [];

    if (!task.title || task.title.trim() === '') {
      errors.push('Название задачи обязательно');
    }

    if (!task.projectId) {
      errors.push('Проект обязателен');
    }

    if (task.plannedHours != null && (typeof task.plannedHours !== 'number' || task.plannedHours < 0)) {
      errors.push('Плановые часы должны быть неотрицательным числом');
    }

    if (task.deadline && isNaN(new Date(task.deadline).getTime())) {
      errors.push('Некорректная дата дедлайна');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
