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

  /**
   * Передача задач от отпускника к замещающему.
   *
   * Идемпотентность обязательна: upsertVacation вызывает этот метод при
   * любом сохранении «уже активного» отпуска (например, HR правит
   * комментарий), и без guard'а задачи переназначаются повторно. Тогда:
   *   - в истории задачи появляется дубликат «переназначена с …»;
   *   - revertDelegation (ищет по тексту в истории) начнёт работать
   *     непредсказуемо;
   *   - уведомление о передаче отправится повторно.
   * Поэтому пишем флаг state = 'applied' и выходим на повторном заходе.
   */
  applyDelegation(vacationId) {
    const vac = this._vacationRepo.findById(vacationId);
    if (!vac || !vac.delegation.enabled || vac.status !== 'approved') return;
    if (vac.delegation.state === 'applied') return;

    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    const statuses = vac.delegation.statuses.length ? vac.delegation.statuses : ['new', 'inwork', 'review'];
    this._taskService.applyDelegation(fromId, toId, vac.start, vac.end, statuses);
    this._notifications.notifyVacationDelegationApplied(vac, fromId, toId);

    vac.delegation.state = 'applied';
    this._vacationRepo.save(vac);
  }

  revertDelegation(vacationId) {
    const vac = this._vacationRepo.findById(vacationId);
    if (!vac || !vac.delegation.enabled) return;
    if (vac.delegation.state !== 'applied') return;

    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    this._taskService.revertDelegation(fromId, toId);

    vac.delegation.state = null;
    this._vacationRepo.save(vac);
  }
}