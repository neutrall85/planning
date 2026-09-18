// src/services/HoursRequestService.js
//
// Запросы на изменение плановых часов задачи/бюджета проекта.
//
// Сервис получил доступ к taskRepo/projectRepo: решение по запросу
// меняет целевую сущность (plannedHours задачи или budget проекта),
// и делать это из вьюхи через setDb - значит обходить общий слой и
// терять аудит правильной формулировки.
import { auditHours } from '../utils/auditHelpers';

export class HoursRequestService {
  constructor({
    requestRepo,
    taskRepo,
    projectRepo,
    notificationService,
    auditService,
    notify,
  }) {
    this._requestRepo = requestRepo;
    this._taskRepo = taskRepo;
    this._projectRepo = projectRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notify;
  }

  addRequest(req) {
    this._requestRepo.save(req);
    this._notify();
  }

  getAll() {
    return this._requestRepo.findAll();
  }

  /**
   * Решение по запросу изменения часов.
   *
   * Побочные эффекты при одобрении:
   *   - задача: plannedHours := newH, запись в task.history;
   *   - проект: budget := newH, запись в project.history.
   * При отклонении целевая сущность не меняется.
   *
   * Идемпотентность: повторное решение бросает.
   */
  decide(requestId, approved, actorId) {
    const r = this._requestRepo.findById(requestId);
    if (!r) throw new Error('Запрос не найден');
    if (r.status !== 'pending') throw new Error('Решение по этому запросу уже принято');

    const targetTitle = r.kind === 'task'
      ? this._taskRepo.findById(r.targetId)?.title
      : this._projectRepo.findById(r.targetId)?.name;

    this._requestRepo.save({ ...r, status: approved ? 'approved' : 'rejected' });

    if (approved) {
      if (r.kind === 'task') {
        const t = this._taskRepo.findById(r.targetId);
        if (t) {
          this._taskRepo.save({
            ...t,
            plannedHours: r.newH,
            history: [
              ...(t.history || []),
              {
                ts: Date.now(),
                who: actorId,
                text: `Запрос часов одобрен: ${auditHours(r.oldH)} → ${auditHours(r.newH)}`,
              },
            ],
          });
        }
      } else {
        const p = this._projectRepo.findById(r.targetId);
        if (p) {
          // Запись в историю проекта: пользователь, открыв карточку,
          // видит, что бюджет менялся через запрос (а не молчаливой
          // правкой формы). Формулировка симметрична задачной.
          // ts и who - момент решения и утвердивший, а не автор запроса:
          // для истории важно «кто и когда это санкционировал».
          this._projectRepo.save({
            ...p,
            budget: r.newH,
            history: [
              ...(p.history || []),
              {
                ts: Date.now(),
                who: actorId,
                text: `Запрос часов одобрен: ${auditHours(r.oldH)} → ${auditHours(r.newH)}`,
              },
            ],
          });
        }
      }
    }

    this._audit.addAudit(
      approved ? 'Утверждение запроса часов' : 'Отклонение запроса часов',
      approved
        ? { task: targetTitle, previousHours: r.oldH, newHours: r.newH, reason: r.reason }
        : { task: targetTitle, requestedHours: r.newH, reason: r.reason },
      'hoursRequest', requestId, actorId,
    );

    this._notifications.notifyHoursRequestDecision(r, approved, targetTitle, actorId);
    this._notify();
    return r;
  }
}