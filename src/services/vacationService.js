// src/services/VacationService.js
import { fmtDMY } from '../utils/date';
import { VACATION_TYPES } from '../utils/constants';

export class VacationService {
  constructor(vacationRepo, taskService, notificationService, auditService, notifyCallback) {
    this._vacationRepo = vacationRepo;
    this._taskService = taskService;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notifyCallback;
  }

  getAll() { return this._vacationRepo.findAll(); }

  upsertVacation(vac, currentUserId) {
    const existing = this._vacationRepo.findById(vac.id);
    if (existing) {
      this._audit.addAudit('Изменение отпуска', `${vac.empId} ${fmtDMY(vac.start)}—${fmtDMY(vac.end)}`, 'vacation', vac.id, currentUserId);
    } else {
      this._audit.addAudit('Создание отпуска', `${vac.empId} ${fmtDMY(vac.start)}—${fmtDMY(vac.end)}`, 'vacation', vac.id, currentUserId);
    }
    this._vacationRepo.save(vac);

    if (vac.delegation.enabled && vac.status === 'approved' && vac.start <= new Date().toISOString().slice(0,10)) {
      this.applyDelegation(vac.id);
    }
    this._notify();
  }

  deleteVacation(id, currentUserId) {
    const vac = this._vacationRepo.findById(id);
    if (vac) {
      this._audit.addAudit('Удаление отпуска', `${vac.empId} ${fmtDMY(vac.start)}—${fmtDMY(vac.end)}`, 'vacation', id, currentUserId);
      if (vac.delegation.enabled) this.revertDelegation(id);
    }
    this._vacationRepo.delete(id);
    this._notify();
  }

  applyDelegation(vacationId) {
    const vac = this._vacationRepo.findById(vacationId);
    if (!vac || !vac.delegation.enabled || vac.status !== 'approved') return;
    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    const statuses = vac.delegation.statuses.length ? vac.delegation.statuses : ['new', 'inwork', 'review'];
    this._taskService.applyDelegation(fromId, toId, vac.start, vac.end, statuses);
    this._notifications.notifyVacationDelegationApplied(vac, fromId, toId);
  }

  revertDelegation(vacationId) {
    const vac = this._vacationRepo.findById(vacationId);
    if (!vac || !vac.delegation.enabled) return;
    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    this._taskService.revertDelegation(fromId, toId);
  }
}