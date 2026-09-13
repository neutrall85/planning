// src/services/RoleDelegationService.js
export class RoleDelegationService {
  constructor(roleDelegationRepo, auditService, notifyCallback) {
    this._roleDelegationRepo = roleDelegationRepo;
    this._audit = auditService;
    this._notify = notifyCallback;
  }

  upsertRoleDelegation(rd, currentUserId) {
    const existing = this._roleDelegationRepo.findById(rd.id);
    if (!existing) {
      this._audit.addAudit('Создание делегирования ролей', `${rd.fromId} → ${rd.toId}: ${rd.roles.join(', ')}`, 'roleDelegation', rd.id, currentUserId);
    } else {
      this._audit.addAudit('Изменение делегирования ролей', `${rd.fromId} → ${rd.toId}: ${rd.roles.join(', ')}`, 'roleDelegation', rd.id, currentUserId);
    }
    this._roleDelegationRepo.save(rd);
    this._notify();
  }

  getAll() {
    return this._roleDelegationRepo.findAll();
  }
}