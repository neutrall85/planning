// src/services/VacationService.js
import { fmtDMY, todayIso } from '../utils/date';
import { VACATION_TYPES } from '../utils/constants';
import { auditDetails, auditDelta, auditMark } from '../utils/auditHelpers';

export class VacationService {
  constructor({
    vacationRepo,
    taskService,
    employeeRepo,
    notificationService,
    auditService,
    notify,
  }) {
    this._vacationRepo = vacationRepo;
    this._taskService = taskService;
    this._employeeRepo = employeeRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notify;
  }

  getAll() { return this._vacationRepo.findAll(); }

  _name(id) {
    const e = this._employeeRepo.findById(id);
    return e ? `${e.last} ${e.first}` : id;
  }

  upsertVacation(vac, currentUserId) {
    const existing = this._vacationRepo.findById(vac.id);
    const period = `${fmtDMY(vac.start)}–${fmtDMY(vac.end)}`;

    if (existing) {
      const changes = this._describeChanges(existing, vac);
      if (Object.keys(changes).length > 0) {
        this._audit.addAudit(
          'Изменение отпуска',
          auditDetails('Сотрудник', this._name(vac.empId), changes),
          'vacation',
          vac.id,
          currentUserId,
        );
      }
    } else {
      this._audit.addAudit(
        'Создание отпуска',
        { Сотрудник: this._name(vac.empId), Период: period, Тип: vac.type },
        'vacation',
        vac.id,
        currentUserId,
      );
    }

    this._vacationRepo.save(vac);

    if (vac.delegation.enabled && vac.status === 'approved' && vac.start <= todayIso()) {
      this.applyDelegation(vac.id);
    }
    this._notify();
  }

  decide(vacationId, approved, actorId) {
    const v = this._vacationRepo.findById(vacationId);
    if (!v) throw new Error('Отпуск не найден');
    if (v.status === 'approved' || v.status === 'rejected') {
      throw new Error('Решение по этому отпуску уже принято');
    }

    const status = approved ? 'approved' : 'rejected';
    this._vacationRepo.save({ ...v, status });

    this._audit.addAudit(
      approved ? 'Утверждение отпуска' : 'Отклонение отпуска',
      {
        Сотрудник: this._name(v.empId),
        Период: `${fmtDMY(v.start)}–${fmtDMY(v.end)}`,
        Тип: VACATION_TYPES[v.type]?.label || v.type,
      },
      'vacation', vacationId, actorId,
    );

    if (approved && v.delegation.enabled && v.start <= todayIso()) {
      this.applyDelegation(vacationId);
    }

    this._notifications.notifyVacationDecision(v, approved);
    this._notify();
    return v;
  }

  _describeChanges(existing, next) {
    const changes = {};
    auditDelta(changes, 'Период', `${fmtDMY(existing.start)}–${fmtDMY(existing.end)}`, `${fmtDMY(next.start)}–${fmtDMY(next.end)}`);
    auditDelta(changes, 'Тип', existing.type, next.type);
    auditDelta(changes, 'Статус', existing.status, next.status);
    auditMark(changes, 'Комментарий', existing.comment, next.comment, 'изменён');
    return changes;
  }

  deleteVacation(id, currentUserId) {
    const vac = this._vacationRepo.findById(id);
    if (vac) {
      this._audit.addAudit(
        'Удаление отпуска',
        { Сотрудник: this._name(vac.empId), Период: `${fmtDMY(vac.start)}–${fmtDMY(vac.end)}` },
        'vacation',
        id,
        currentUserId,
      );
      if (vac.delegation.enabled) this.revertDelegation(id);
    }
    this._vacationRepo.delete(id);
    this._notify();
  }

  applyDelegation(vacationId) {
    const vac = this._vacationRepo.findById(vacationId);
    if (!vac || !vac.delegation.enabled || vac.status !== 'approved') return;
    if (vac.delegation.state === 'applied') return;

    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    const statuses = vac.delegation.statuses.length ? vac.delegation.statuses : ['new', 'inwork', 'review'];
    this._taskService.applyDelegation(fromId, toId, vac.start, vac.end, statuses);
    this._notifications.notifyVacationDelegationApplied(vac, fromId, toId);

    this._audit.addAudit(
      'Уход в отпуск',
      {
        Сотрудник: this._name(fromId),
        Период: `${fmtDMY(vac.start)}–${fmtDMY(vac.end)}`,
        Замещающий: this._name(toId),
      },
      'vacation',
      vac.id,
      'system',
    );

    this._vacationRepo.save({ ...vac, delegation: { ...vac.delegation, state: "applied" } });
  }

  revertDelegation(vacationId) {
    const vac = this._vacationRepo.findById(vacationId);
    if (!vac || !vac.delegation.enabled) return;
    if (vac.delegation.state !== 'applied') return;

    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    this._taskService.revertDelegation(fromId, toId);

    this._audit.addAudit(
      'Возврат из отпуска',
      {
        Сотрудник: this._name(fromId),
        Период: `${fmtDMY(vac.start)}–${fmtDMY(vac.end)}`,
      },
      'vacation',
      vac.id,
      'system',
    );

    vac.delegation.state = null;
    this._vacationRepo.save(vac);
  }
}