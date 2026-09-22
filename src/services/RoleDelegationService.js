// src/services/RoleDelegationService.js
import { fmtDMY } from '../utils/date';
import { normalizeRejectionReason } from '../utils/rejection';

export class RoleDelegationService {
  constructor({
    roleDelegationRepo,
    employeeRepo,
    notificationService,
    auditService,
    notify,
  }) {
    this._roleDelegationRepo = roleDelegationRepo;
    this._employeeRepo = employeeRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notify;
  }

  _name(id) {
    const e = this._employeeRepo.findById(id);
    return e ? `${e.last} ${e.first}` : id;
  }

  upsertRoleDelegation(rd, currentUserId) {
    const existing = this._roleDelegationRepo.findById(rd.id);
    const summary = `${this._name(rd.fromId)} → ${this._name(rd.toId)}: ${rd.roles.join(', ')}`;
    if (!existing) {
      this._audit.addAudit('Создание делегирования ролей', summary, 'roleDelegation', rd.id, currentUserId);
    } else {
      this._audit.addAudit('Изменение делегирования ролей', summary, 'roleDelegation', rd.id, currentUserId);
    }
    this._roleDelegationRepo.save(rd);
    this._notify();
  }

  /**
   * Решение по делегированию ролей.
   *
   * reason обязателен при approved === false. Нормализация и проверка -
   * в normalizeRejectionReason (utils/rejection). Уходит в аудит,
   * в уведомление инициатору и в поле rejectionReason самой записи.
   */
  decide(delegationId, approved, actorId, reason = null) {
    const rd = this._roleDelegationRepo.findById(delegationId);
    if (!rd) throw new Error('Делегирование не найдено');
    if (rd.status !== 'pending') throw new Error('Решение по этому делегированию уже принято');

    const trimmedReason = normalizeRejectionReason(approved, reason);

    const status = approved ? 'active' : 'rejected';
    this._roleDelegationRepo.save({
      ...rd,
      status,
      rejectionReason: trimmedReason,
    });

    const details = {
      from: this._name(rd.fromId),
      to: this._name(rd.toId),
      roles: rd.roles.join(', '),
    };
    if (approved) {
      details.start = fmtDMY(rd.start);
      details.end = rd.end ? fmtDMY(rd.end) : 'до отмены';
    } else {
      details['Причина отклонения'] = trimmedReason;
    }

    this._audit.addAudit(
      approved ? 'Принятие делегирования' : 'Отклонение делегирования',
      details, 'roleDelegation', delegationId, actorId,
    );

    this._notifications.notifyRoleDelegationDecision(rd, approved, actorId, trimmedReason);
    this._notify();
    return rd;
  }

  getAll() {
    return this._roleDelegationRepo.findAll();
  }
}