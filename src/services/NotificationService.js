/**
 * NotificationService - уведомления пользователей
 * Отвечает только за создание, чтение и управление уведомлениями
 */

import { uid } from '../utils/date';

export default class NotificationService {
  /**
   * @param {DataService} dataService - сервис данных
   */
  constructor(dataService) {
    this._dataService = dataService;
  }

  /**
   * Создание уведомления
   * @param {string} userId - ID пользователя
   * @param {string} text - текст уведомления
   * @param {Object|null} target - целевой объект { targetType, targetId }
   * @returns {Object} созданное уведомление
   */
  create(userId, text, target = null) {
    if (!userId || !text) {
      throw new Error('userId и text обязательны');
    }

    const notification = {
      id: uid(),
      userId,
      text,
      ts: Date.now(),
      read: false,
      targetType: target?.targetType || null,
      targetId: target?.targetId || null
    };

    const notifications = this._dataService.getNotifications();
    this._dataService.updateCollection('notifications', [notification, ...notifications]);

    return notification;
  }

  /**
   * Получение уведомлений пользователя
   * @param {string} userId - ID пользователя
   * @param {Object} options - опции { unreadOnly, limit, targetType }
   * @returns {Array<Object>} список уведомлений
   */
  getForUser(userId, options = {}) {
    const { unreadOnly = false, limit = null, targetType = null } = options;
    
    let notifications = this._dataService.getNotifications().filter(n => n.userId === userId);

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    if (targetType) {
      notifications = notifications.filter(n => n.targetType === targetType);
    }

    // Сортировка по времени (новые первыми)
    notifications.sort((a, b) => b.ts - a.ts);

    if (limit && notifications.length > limit) {
      notifications = notifications.slice(0, limit);
    }

    return notifications;
  }

  /**
   * Пометка уведомления как прочитанного
   * @param {string} notificationId - ID уведомления
   * @returns {boolean} true если успешно
   */
  markAsRead(notificationId) {
    const notifications = this._dataService.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification || notification.read) {
      return false;
    }

    const updatedNotifications = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );

    this._dataService.updateCollection('notifications', updatedNotifications);
    return true;
  }

  /**
   * Пометка всех уведомлений пользователя как прочитанных
   * @param {string} userId - ID пользователя
   * @returns {number} количество помеченных уведомлений
   */
  markAllAsRead(userId) {
    const notifications = this._dataService.getNotifications();
    const userNotifications = notifications.filter(n => n.userId === userId && !n.read);

    if (userNotifications.length === 0) {
      return 0;
    }

    const updatedNotifications = notifications.map(n =>
      n.userId === userId ? { ...n, read: true } : n
    );

    this._dataService.updateCollection('notifications', updatedNotifications);
    return userNotifications.length;
  }

  /**
   * Удаление уведомления
   * @param {string} notificationId - ID уведомления
   * @returns {boolean} true если успешно
   */
  delete(notificationId) {
    const notifications = this._dataService.getNotifications();
    const exists = notifications.some(n => n.id === notificationId);

    if (!exists) {
      return false;
    }

    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    this._dataService.updateCollection('notifications', updatedNotifications);
    return true;
  }

  /**
   * Удаление всех прочитанных уведомлений пользователя
   * @param {string} userId - ID пользователя
   * @returns {number} количество удалённых уведомлений
   */
  deleteRead(userId) {
    const notifications = this._dataService.getNotifications();
    const readNotifications = notifications.filter(n => n.userId === userId && n.read);

    if (readNotifications.length === 0) {
      return 0;
    }

    const updatedNotifications = notifications.filter(n => !(n.userId === userId && n.read));
    this._dataService.updateCollection('notifications', updatedNotifications);
    return readNotifications.length;
  }

  /**
   * Проверка существования уведомления с таким же текстом для цели
   * @param {string} userId - ID пользователя
   * @param {string} text - текст уведомления
   * @param {Object} target - целевой объект { targetType, targetId }
   * @returns {boolean} true если существует
   */
  exists(userId, text, target) {
    const notifications = this._dataService.getNotifications();
    return notifications.some(n =>
      n.userId === userId &&
      n.text === text &&
      n.targetType === target?.targetType &&
      n.targetId === target?.targetId
    );
  }

  /**
   * Создание уведомления о дедлайне задачи (с проверкой дубликатов)
   * @param {string} userId - ID пользователя
   * @param {Object} task - задача
   * @param {number} daysUntilDeadline - дней до дедлайна
   * @returns {Object|null} созданное уведомление или null если уже существует
   */
  createDeadlineNotification(userId, task, daysUntilDeadline) {
    const daysText = daysUntilDeadline === 1 ? '1 день' : '3 дня';
    const text = `До дедлайна задачи "${task.title}" остался ${daysText}! Дедлайн: ${task.deadline}`;
    const target = { targetType: 'task', targetId: task.id };

    if (this.exists(userId, text, target)) {
      return null;
    }

    return this.create(userId, text, target);
  }

  /**
   * Создание уведомления о назначении задачи
   * @param {string} userId - ID пользователя
   * @param {Object} task - задача
   * @returns {Object} уведомление
   */
  createTaskAssignmentNotification(userId, task) {
    return this.create(
      userId,
      `Вам назначена задача "${task.title}"`,
      { targetType: 'task', targetId: task.id }
    );
  }

  /**
   * Создание уведомления об изменении статуса задачи
   * @param {string} userId - ID пользователя
   * @param {Object} task - задача
   * @param {string} newStatus - новый статус
   * @returns {Object} уведомление
   */
  createTaskStatusNotification(userId, task, newStatus) {
    const statusText = newStatus === 'closed' ? 'закрыта' : 'отменена';
    return this.create(
      userId,
      `Задача "${task.title}" ${statusText}`,
      { targetType: 'task', targetId: task.id }
    );
  }

  /**
   * Создание уведомления о проекте
   * @param {string} userId - ID пользователя
   * @param {string} message - текст сообщения
   * @param {Object} project - проект
   * @returns {Object} уведомление
   */
  createProjectNotification(userId, message, project) {
    return this.create(
      userId,
      message,
      { targetType: 'project', targetId: project.id }
    );
  }

  /**
   * Создание уведомления об отпуске
   * @param {string} userId - ID пользователя
   * @param {string} message - текст сообщения
   * @param {Object} vacation - отпуск
   * @returns {Object} уведомление
   */
  createVacationNotification(userId, message, vacation) {
    return this.create(
      userId,
      message,
      { targetType: 'vacation', targetId: vacation.id }
    );
  }

  /**
   * Получение количества непрочитанных уведомлений
   * @param {string} userId - ID пользователя
   * @returns {number} количество непрочитанных
   */
  getUnreadCount(userId) {
    return this._dataService.getNotifications()
      .filter(n => n.userId === userId && !n.read)
      .length;
  }
}
