// src/services/AuditService.js
import { uid } from '../utils/date';

export class AuditService {
  constructor(auditRepo, notifyCallback) {
    this._auditRepo = auditRepo;
    this._notify = notifyCallback;
  }

  addAudit(action, details, targetType = null, targetId = null, userId = 'system') {
    let detailsStr = details;
    if (typeof details === 'object') {
      detailsStr = JSON.stringify(details);
    }
    const entry = {
      id: uid(),
      ts: Date.now(),
      userId,
      action,
      details: detailsStr,
      targetType,
      targetId,
    };
    this._auditRepo.save(entry);
    this._notify();
    return entry;
  }

  getAll() {
    return this._auditRepo.findAll();
  }
}