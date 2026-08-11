/**
 * AuditService - логирование действий (аудит)
 * Отвечает только за создание и чтение записей аудита
 */

import { uid } from '../utils/date';

export default class AuditService {
  /**
   * @param {DataService} dataService - сервис данных
   */
  constructor(dataService) {
    this._dataService = dataService;
  }

  /**
   * Создание записи аудита
   * @param {string} action - тип действия
   * @param {string|Object} details - детали действия
   * @param {Object} options - опции { targetType, targetId, userId }
   * @returns {Object} созданная запись аудита
   */
  log(action, details, options = {}) {
    const { targetType = null, targetId = null, userId = null } = options;

    let detailsStr = details;
    if (typeof details === 'object') {
      try {
        detailsStr = JSON.stringify(details);
      } catch (e) {
        detailsStr = String(details);
      }
    }

    const auditEntry = {
      id: uid(),
      ts: Date.now(),
      userId: userId || 'system',
      action,
      details: detailsStr,
      targetType,
      targetId
    };

    const audit = this._dataService.getAudit();
    this._dataService.updateCollection('audit', [auditEntry, ...audit]);

    return auditEntry;
  }

  /**
   * Получение записей аудита с фильтрацией
   * @param {Object} filters - фильтры { userId, targetType, targetId, action, fromDate, toDate }
   * @param {Object} options - опции { limit, offset }
   * @returns {Array<Object>} список записей аудита
   */
  get(filters = {}, options = {}) {
    const { userId, targetType, targetId, action, fromDate, toDate } = filters;
    const { limit = null, offset = 0 } = options;

    let entries = this._dataService.getAudit();

    // Фильтрация по пользователю
    if (userId) {
      entries = entries.filter(e => e.userId === userId);
    }

    // Фильтрация по типу цели
    if (targetType) {
      entries = entries.filter(e => e.targetType === targetType);
    }

    // Фильтрация по ID цели
    if (targetId !== undefined && targetId !== null) {
      entries = entries.filter(e => e.targetId === targetId);
    }

    // Фильтрация по действию
    if (action) {
      entries = entries.filter(e => e.action === action);
    }

    // Фильтрация по датам
    if (fromDate) {
      const fromDateMs = typeof fromDate === 'number' ? fromDate : new Date(fromDate).getTime();
      entries = entries.filter(e => e.ts >= fromDateMs);
    }

    if (toDate) {
      const toDateMs = typeof toDate === 'number' ? toDate : new Date(toDate).getTime();
      entries = entries.filter(e => e.ts <= toDateMs);
    }

    // Сортировка по времени (новые первыми)
    entries.sort((a, b) => b.ts - a.ts);

    // Пагинация
    if (offset > 0) {
      entries = entries.slice(offset);
    }

    if (limit && entries.length > limit) {
      entries = entries.slice(0, limit);
    }

    return entries;
  }

  /**
   * Получение записи аудита по ID
   * @param {string} entryId - ID записи
   * @returns {Object|null} запись или null
   */
  getById(entryId) {
    const entries = this._dataService.getAudit();
    return entries.find(e => e.id === entryId) || null;
  }

  /**
   * Получение истории изменений конкретного объекта
   * @param {string} targetType - тип объекта ('task', 'project', etc.)
   * @param {string} targetId - ID объекта
   * @returns {Array<Object>} история изменений
   */
  getObjectHistory(targetType, targetId) {
    return this.get({ targetType, targetId });
  }

  /**
   * Получение действий пользователя за период
   * @param {string} userId - ID пользователя
   * @param {Date|string} fromDate - начальная дата
   * @param {Date|string} toDate - конечная дата
   * @returns {Array<Object>} действия пользователя
   */
  getUserActions(userId, fromDate, toDate) {
    return this.get({ userId, fromDate, toDate });
  }

  /**
   * Логирование создания задачи
   * @param {Object} task - задача
   * @param {string|null} userId - ID пользователя (текущий пользователь если не указан)
   * @returns {Object} запись аудита
   */
  logTaskCreate(task, userId = null) {
    return this.log('Создание задачи', task.title, {
      targetType: 'task',
      targetId: task.id,
      userId
    });
  }

  /**
   * Логирование изменения задачи
   * @param {string} taskTitle - название задачи
   * @param {Array<string>} changes - список изменений
   * @param {string} taskId - ID задачи
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logTaskChange(taskTitle, changes, taskId, userId = null) {
    const details = changes.length > 0 
      ? `Изменение задачи "${taskTitle}": ${changes.join('; ')}`
      : `Задача "${taskTitle}"`;
    
    return this.log('Изменение задачи', details, {
      targetType: 'task',
      targetId: taskId,
      userId
    });
  }

  /**
   * Логирование удаления задачи
   * @param {string} taskTitle - название задачи
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logTaskDelete(taskTitle, userId = null) {
    return this.log('Удаление задачи', taskTitle, {
      targetType: 'task',
      userId
    });
  }

  /**
   * Логирование создания проекта
   * @param {Object} project - проект
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logProjectCreate(project, userId = null) {
    return this.log('Создание проекта', project.name, {
      targetType: 'project',
      targetId: project.id,
      userId
    });
  }

  /**
   * Логирование изменения проекта
   * @param {string} projectName - название проекта
   * @param {Array<string>} changes - список изменений
   * @param {string} projectId - ID проекта
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logProjectChange(projectName, changes, projectId, userId = null) {
    const details = changes.length > 0
      ? `Изменение проекта "${projectName}": ${changes.join('; ')}`
      : `Проект "${projectName}"`;

    return this.log('Изменение проекта', details, {
      targetType: 'project',
      targetId: projectId,
      userId
    });
  }

  /**
   * Логирование удаления проекта
   * @param {string} projectName - название проекта
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logProjectDelete(projectName, userId = null) {
    return this.log('Удаление проекта', projectName, {
      targetType: 'project',
      userId
    });
  }

  /**
   * Логирование создания/изменения отпуска
   * @param {Object} vacation - отпуск
   * @param {string} actionType - 'Создание' или 'Изменение'
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logVacation(vacation, actionType = 'Создание', userId = null) {
    const empName = vacation.empId || vacation.employeeId;
    const details = `${empName} ${vacation.start}—${vacation.end}`;

    return this.log(`${actionType} отпуска`, details, {
      targetType: 'vacation',
      targetId: vacation.id,
      userId
    });
  }

  /**
   * Логирование удаления отпуска
   * @param {Object} vacation - отпуск
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logVacationDelete(vacation, userId = null) {
    const empName = vacation.empId || vacation.employeeId;
    const details = `${empName} ${vacation.start}—${vacation.end}`;

    return this.log('Удаление отпуска', details, {
      targetType: 'vacation',
      targetId: vacation.id,
      userId
    });
  }

  /**
   * Логирование создания сотрудника
   * @param {Object} employee - сотрудник
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logEmployeeCreate(employee, userId = null) {
    return this.log('Создание сотрудника', `${employee.last} ${employee.first}`, {
      targetType: 'employee',
      targetId: employee.id,
      userId
    });
  }

  /**
   * Логирование изменения сотрудника
   * @param {Object} employee - сотрудник
   * @param {Array<string>} changes - список изменений
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logEmployeeChange(employee, changes, userId = null) {
    const details = changes.length > 0
      ? `${employee.last} ${employee.first}: ${changes.join('; ')}`
      : `${employee.last} ${employee.first}`;

    return this.log('Изменение сотрудника', details, {
      targetType: 'employee',
      targetId: employee.id,
      userId
    });
  }

  /**
   * Логирование создания отдела
   * @param {Object} department - отдел
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logDepartmentCreate(department, userId = null) {
    return this.log('Создание отдела', department.name, {
      targetType: 'department',
      targetId: department.id,
      userId
    });
  }

  /**
   * Логирование создания КБ
   * @param {Object} kb - КБ
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logKbCreate(kb, userId = null) {
    return this.log('Создание КБ', kb.name, {
      targetType: 'kb',
      targetId: kb.id,
      userId
    });
  }

  /**
   * Логирование делегирования ролей
   * @param {Object} delegation - делегирование
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logRoleDelegationCreate(delegation, userId = null) {
    const details = `${delegation.fromId} → ${delegation.toId}: ${delegation.roles.join(', ')}`;
    return this.log('Создание делегирования ролей', details, {
      targetType: 'roleDelegation',
      targetId: delegation.id,
      userId
    });
  }

  /**
   * Логирование автоматической архивации
   * @param {number} months - количество месяцев
   * @param {string|null} userId - ID пользователя
   * @returns {Object} запись аудита
   */
  logAutoArchive(months, userId = null) {
    return this.log('Автоматическая архивация задач', 
      `Задачи, закрытые более ${months} мес., перемещены в архив`, 
      { userId }
    );
  }

  /**
   * Очистка старых записей аудита
   * @param {number} olderThanDays - удалять записи старше этого количества дней
   * @returns {number} количество удалённых записей
   */
  cleanupOldRecords(olderThanDays = 365) {
    const entries = this._dataService.getAudit();
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const oldEntries = entries.filter(e => e.ts < cutoffTime);

    if (oldEntries.length === 0) {
      return 0;
    }

    const updatedEntries = entries.filter(e => e.ts >= cutoffTime);
    this._dataService.updateCollection('audit', updatedEntries);

    return oldEntries.length;
  }
}
