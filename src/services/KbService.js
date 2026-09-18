// src/services/KbService.js
export class KbService {
  constructor({ kbRepo, auditService, notify }) {
    this._kbRepo = kbRepo;
    this._audit = auditService;
    this._notify = notify;
  }

  upsertKb(kb, currentUserId) {
    const existing = this._kbRepo.findById(kb.id);
    if (!existing) {
      this._audit.addAudit('Создание КБ', kb.name, 'kb', kb.id, currentUserId);
    } else {
      this._audit.addAudit('Изменение КБ', kb.name, 'kb', kb.id, currentUserId);
    }
    this._kbRepo.save(kb);
    this._notify();
  }

  getAll() {
    return this._kbRepo.findAll();
  }
}