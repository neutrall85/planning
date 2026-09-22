// src/services/VacationService.js
import { fmtDMY, todayIso } from '../utils/date';
import { VACATION_TYPES } from '../utils/constants';
import { auditDetails, auditDelta, auditMark } from '../utils/auditHelpers';
import { normalizeRejectionReason } from '../utils/rejection';
import {
  canManageVacation,
  canCreateVacationFor,
  canApproveVacation,
} from '../utils/permissions';

export class VacationService {
  constructor({
    vacationRepo,
    taskService,
    employeeRepo,
    notificationService,
    auditService,
    notify,
    // Снимок данных для предикатов, которым нужен не только актор, но и
    // окружение: canApproveVacation смотрит на employees и departments
    // (primaryDeptId сотрудника). Тот же приём, что в TaskService.
    getData,
  }) {
    this._vacationRepo = vacationRepo;
    this._taskService = taskService;
    this._employeeRepo = employeeRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notify;
    this._getData = getData || (() => ({ employees: [], departments: [] }));
  }

  getAll() { return this._vacationRepo.findAll(); }

  _name(id) {
    const e = this._employeeRepo.findById(id);
    return e ? `${e.last} ${e.first}` : id;
  }

  /**
   * Создание/изменение отпуска.
   *
   * Права проверяются здесь, в сервисе: UI ограничивает показ, но не
   * операцию, а любой вызов store.upsertVacation из нового места мог бы
   * обойти форму.
   *
   * Три проверки, у каждой - своя причина:
   *
   *   1. Актор должен существовать. Если пришёл неизвестный id, это
   *      ошибка вызывающего, а не «недостаточно прав». Разные
   *      формулировки - для диагностики.
   *
   *   2. Существующий отпуск - canManageVacation. Утверждённый заморожен:
   *      HR и сам сотрудник его не правят, только admin/director.
   *      Создание нового - canCreateVacationFor: у создаваемой записи
   *      ещё нет статуса, на который опирается правило «approved
   *      заморожен», круг ролей шире.
   *
   *   3. Переход в approved через форму - тем же предикатом, что и в
   *      decide(): canApproveVacation. Тут нет «нельзя вообще» -
   *      admin/director/руководитель отдела сотрудника/главный
   *      конструктор КБ проходят и через форму, и через decide; HR на
   *      чужом отпуске не проходит ни там, ни там; сам сотрудник на
   *      своём - тоже ни там, ни там. Один и тот же предикат - одна и
   *      та же группа пользователей, независимо от интерфейса.
   *
   *      Это убирает асимметрию: admin снимает approved через форму и
   *      возвращает обратно через форму же. Раньше «утверждение через
   *      форму запрещено» означало, что и админ ходит в Requests за
   *      обратным переходом.
   *
   *      Обратный переход (approved → pending) через форму разрешён:
   *      это осознанное действие на уже существующей записи, аналога
   *      в decide у него нет.
   *
   * Побочный эффект — при создании нового отпуска с approved не
   * проверяется canApproveVacation. Это не дыра: создание approved-
   * отпуска через `openVacation(null, empId)` - кадровая операция, её
   * круг ролей = canCreateVacationFor (admin/director/hr), и она уже
   * проверена выше. Заменять это на «approve» означало бы запретить HR
   * заводить согласованные отпуска, чего в текущем поведении нет.
   */
  upsertVacation(vac, currentUserId) {
    const existing = this._vacationRepo.findById(vac.id);
    const actor = this._employeeRepo.findById(currentUserId);

    if (!actor) {
      throw new Error('Пользователь не найден');
    }

    if (existing) {
      if (!canManageVacation(actor, existing)) {
        throw new Error('Недостаточно прав для изменения этого отпуска');
      }
      if (vac.status === 'approved' && existing.status !== 'approved') {
        if (!canApproveVacation(actor, existing, this._getData())) {
          throw new Error('Подтверждение отпуска доступно руководителю отдела, главному конструктору КБ, администратору или генеральному директору');
        }
      }
    } else if (!canCreateVacationFor(actor, vac.empId)) {
      throw new Error('Недостаточно прав для создания отпуска этому сотруднику');
    }

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
        {
          Сотрудник: this._name(vac.empId),
          Период: period,
          Тип: VACATION_TYPES[vac.type] || vac.type,
        },
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

  /**
   * Решение по отпуску.
   *
   * Единственный путь проставить статус approved или rejected из
   * «Запросов и заявок». Проверяет права тем же предикатом, что и
   * upsertVacation при попытке утвердить через форму: canApproveVacation.
   * Один предикат - одна группа пользователей, независимо от интерфейса.
   *
   * reason обязателен при approved === false. Нормализация и проверка -
   * в normalizeRejectionReason (utils/rejection); это доменное правило,
   * одно на все сервисы. Пустая причина при отклонении - исключение.
   */
  decide(vacationId, approved, actorId, reason = null) {
    const v = this._vacationRepo.findById(vacationId);
    if (!v) throw new Error('Отпуск не найден');

    const actor = this._employeeRepo.findById(actorId);
    if (!actor) throw new Error('Пользователь не найден');
    if (!canApproveVacation(actor, v, this._getData())) {
      throw new Error('Недостаточно прав для решения по этому отпуску');
    }

    if (v.status === 'approved' || v.status === 'rejected') {
      throw new Error('Решение по этому отпуску уже принято');
    }

    const trimmedReason = normalizeRejectionReason(approved, reason);

    const status = approved ? 'approved' : 'rejected';
    this._vacationRepo.save({
      ...v,
      status,
      rejectionReason: trimmedReason,
    });

    const details = {
      Сотрудник: this._name(v.empId),
      Период: `${fmtDMY(v.start)}–${fmtDMY(v.end)}`,
      Тип: VACATION_TYPES[v.type] || v.type,
    };
    if (!approved) details['Причина отклонения'] = trimmedReason;

    this._audit.addAudit(
      approved ? 'Утверждение отпуска' : 'Отклонение отпуска',
      details,
      'vacation', vacationId, actorId,
    );

    if (approved && v.delegation.enabled && v.start <= todayIso()) {
      this.applyDelegation(vacationId);
    }

    this._notifications.notifyVacationDecision(v, approved, trimmedReason);
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

  /**
   * Удаление отпуска.
   *
   * Право - то же, что на изменение: canManageVacation. Утверждённый
   * отпуск удалить может только admin / director; HR на нём получит
   * «Недостаточно прав». Правило симметрично запрету на правку.
   *
   * Разделение «Пользователь не найден» / «Недостаточно прав» - то же,
   * что в upsertVacation: разные причины → разные формулировки.
   */
  deleteVacation(id, currentUserId) {
    const vac = this._vacationRepo.findById(id);
    if (!vac) return;

    const actor = this._employeeRepo.findById(currentUserId);
    if (!actor) throw new Error('Пользователь не найден');
    if (!canManageVacation(actor, vac)) {
      throw new Error('Недостаточно прав для удаления этого отпуска');
    }

    this._audit.addAudit(
      'Удаление отпуска',
      { Сотрудник: this._name(vac.empId), Период: `${fmtDMY(vac.start)}–${fmtDMY(vac.end)}` },
      'vacation',
      id,
      currentUserId,
    );
    if (vac.delegation.enabled) this.revertDelegation(id);
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