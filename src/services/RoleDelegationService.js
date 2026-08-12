/**
 * RoleDelegationService - управление временным делегированием ролей
 * Отвечает за создание, утверждение, отзыв и вычисление эффективных ролей
 */

import { TODAY, iso } from '../utils/date';

export default class RoleDelegationService {
  /**
   * @param {DataService} dataService - сервис данных
   */
  constructor(dataService) {
    this._dataService = dataService;
  }

  /**
   * Создание запроса на делегирование ролей
   * @param {string} fromId - ID делегирующего
   * @param {string} toId - ID получателя
   * @param {Array<string>} roles - массив ролей для передачи
   * @param {string} start - дата начала
   * @param {string|null} end - дата окончания (null = до отмены)
   * @param {string} reason - обоснование
   * @returns {Object} созданное делегирование
   */
  createDelegation({ fromId, toId, roles, start, end, reason }) {
    const employees = this._dataService.getEmployees();
    const fromEmp = employees.find(e => e.id === fromId);
    const toEmp = employees.find(e => e.id === toId);

    if (!fromEmp || !toEmp) {
      throw new Error('Сотрудник не найден');
    }

    // Проверка: нельзя делегировать самому себе
    if (fromId === toId) {
      throw new Error('Нельзя делегировать роли самому себе');
    }

    // Проверка: можно делегировать только свои роли (кроме admin и director)
    const delegatableRoles = fromEmp.roles.filter(r => !['admin', 'director'].includes(r));
    const invalidRoles = roles.filter(r => !delegatableRoles.includes(r));
    if (invalidRoles.length > 0) {
      throw new Error(`Роли ${invalidRoles.join(', ')} нельзя делегировать самостоятельно`);
    }

    // Проверка дат
    const startDate = new Date(start);
    if (startDate < new Date(TODAY)) {
      throw new Error('Дата начала не может быть в прошлом');
    }

    if (end) {
      const endDate = new Date(end);
      if (endDate < startDate) {
        throw new Error('Дата окончания не может быть раньше даты начала');
      }
    }

    const delegation = {
      id: Math.random().toString(36).substr(2, 9),
      fromId,
      toId,
      roles,
      start,
      end: end || null,
      reason,
      status: 'pending', // pending, active, rejected, revoked, expired
      createdAt: TODAY,
      approvedAt: null,
      revokedAt: null,
      revokedBy: null
    };

    return delegation;
  }

  /**
   * Утверждение делегирования получателем
   * @param {string} delegationId - ID делегирования
   * @param {string} userId - ID утверждающего (получатель)
   * @returns {Object} обновлённое делегирование
   */
  approveDelegation(delegationId, userId) {
    const delegations = this._dataService.getRoleDelegations();
    const delegation = delegations.find(d => d.id === delegationId);

    if (!delegation) {
      throw new Error('Делегирование не найдено');
    }

    if (delegation.status !== 'pending') {
      throw new Error('Делегирование уже обработано');
    }

    if (delegation.toId !== userId) {
      throw new Error('Только получатель может утвердить делегирование');
    }

    // Проверка: не истёк ли срок
    if (delegation.end && new Date(delegation.end) < new Date(TODAY)) {
      throw new Error('Срок действия делегирования истёк');
    }

    return {
      ...delegation,
      status: 'active',
      approvedAt: TODAY
    };
  }

  /**
   * Отклонение делегирования получателем
   * @param {string} delegationId - ID делегирования
   * @param {string} userId - ID отклоняющего (получатель)
   * @returns {Object} обновлённое делегирование
   */
  rejectDelegation(delegationId, userId) {
    const delegations = this._dataService.getRoleDelegations();
    const delegation = delegations.find(d => d.id === delegationId);

    if (!delegation) {
      throw new Error('Делегирование не найдено');
    }

    if (delegation.status !== 'pending') {
      throw new Error('Делегирование уже обработано');
    }

    if (delegation.toId !== userId) {
      throw new Error('Только получатель может отклонить делегирование');
    }

    return {
      ...delegation,
      status: 'rejected'
    };
  }

  /**
   * Отзыв делегирования делегировавшим
   * @param {string} delegationId - ID делегирования
   * @param {string} userId - ID отзывающего (делегировавший)
   * @returns {Object} обновлённое делегирование
   */
  revokeDelegation(delegationId, userId) {
    const delegations = this._dataService.getRoleDelegations();
    const delegation = delegations.find(d => d.id === delegationId);

    if (!delegation) {
      throw new Error('Делегирование не найдено');
    }

    if (delegation.status !== 'active') {
      throw new Error('Можно отозвать только активное делегирование');
    }

    if (delegation.fromId !== userId) {
      throw new Error('Только делегировавший может отозвать делегирование');
    }

    return {
      ...delegation,
      status: 'revoked',
      revokedAt: TODAY,
      revokedBy: userId
    };
  }

  /**
   * Проверка и обновление статуса делегирования (истечение срока)
   * @param {Object} delegation - делегирование для проверки
   * @returns {Object} обновлённое делегирование если статус изменился
   */
  checkExpiration(delegation) {
    if (delegation.status !== 'active') {
      return delegation;
    }

    if (delegation.end && new Date(delegation.end) < new Date(TODAY)) {
      return {
        ...delegation,
        status: 'expired'
      };
    }

    return delegation;
  }

  /**
   * Получение активных делегирований для пользователя
   * @param {string} userId - ID пользователя
   * @param {boolean} asFrom - true = как делегирующий, false = как получатель
   * @returns {Array<Object>} массив активных делегирований
   */
  getActiveDelegations(userId, asFrom = true) {
    const delegations = this._dataService.getRoleDelegations();
    
    return delegations
      .filter(d => {
        if (asFrom) {
          return d.fromId === userId && d.status === 'active';
        } else {
          return d.toId === userId && d.status === 'active';
        }
      })
      .map(d => this.checkExpiration(d))
      .filter(d => d.status === 'active');
  }

  /**
   * Вычисление эффективных ролей пользователя с учётом делегирований
   * @param {string} userId - ID пользователя
   * @returns {Object} { baseRoles: Array<string>, delegatedRoles: Array<string>, allRoles: Array<string> }
   */
  getEffectiveRoles(userId) {
    const employees = this._dataService.getEmployees();
    const employee = employees.find(e => e.id === userId);
    
    if (!employee) {
      return { baseRoles: [], delegatedRoles: [], allRoles: [] };
    }

    const baseRoles = employee.roles || [];
    const delegations = this._dataService.getRoleDelegations();
    
    // Находим активные делегирования где пользователь - получатель
    const activeDelegations = delegations.filter(d => 
      d.toId === userId && 
      d.status === 'active' &&
      this.checkExpiration(d).status === 'active'
    );

    // Собираем все делегированные роли
    const delegatedRolesSet = new Set();
    activeDelegations.forEach(d => {
      d.roles.forEach(r => delegatedRolesSet.add(r));
    });

    const delegatedRoles = Array.from(delegatedRolesSet);
    
    // Объединяем базовые и делегированные роли (без дубликатов)
    const allRolesSet = new Set([...baseRoles, ...delegatedRoles]);
    const allRoles = Array.from(allRolesSet);

    return {
      baseRoles,
      delegatedRoles,
      allRoles,
      delegations: activeDelegations.map(d => ({
        fromId: d.fromId,
        roles: d.roles,
        end: d.end
      }))
    };
  }

  /**
   * Проверка наличия роли у пользователя с учётом делегирований
   * @param {string} userId - ID пользователя
   * @param {string} role - роль для проверки
   * @returns {boolean} true если роль есть
   */
  hasRole(userId, role) {
    const { allRoles } = this.getEffectiveRoles(userId);
    return allRoles.includes(role);
  }

  /**
   * Проверка наличия любой из ролей у пользователя
   * @param {string} userId - ID пользователя
   * @param {...string} roles - роли для проверки
   * @returns {boolean} true если есть хотя бы одна роль
   */
  hasAnyRole(userId, ...roles) {
    return roles.some(role => this.hasRole(userId, role));
  }
}
