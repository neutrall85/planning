// src/services/ChangeRequestService.js
//
// Запросы на изменение сущностей (часов задачи/бюджета проекта, срока
// задачи) и решения по ним.
//
// Единый сервис вместо пары HoursRequestService + DeadlineRequestService:
// механика одинаковая (валидация причины отклонения, аудит, уведомление
// автора, применение одобренного значения к целевой сущности), различия —
// только в правиле «что меняем». Правило вынесено в utils/changeKinds
// и подключается по req.changeKind.
//
// Сервис знает про taskRepo и projectRepo: применение изменения касается
// целевой сущности, и это должно идти через общий слой с аудитом, а не
// из вьюхи через setDb.

import { normalizeRejectionReason } from '../utils/rejection';
import { requireChangeKind } from '../utils/changeKinds';

export class ChangeRequestService {
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

  /**
   * Создание запроса.
   *
   * Проверяем совместимость (changeKind, targetType) по реестру:
   * у каждого вида есть список допустимых целевых типов, и попытка
   * завести, например, «изменение срока» на проект — ошибка домена,
   * а не UI. Проверка здесь, а не в модалке: rule of least surprise —
   * инвариант реестра держится в сервисе, независимо от того, кто
   * создал запрос.
   *
   * Уведомление получателей (директоров/админов) и автора —
   * немедленно. Раньше уведомление о создании вычислялось, но до
   * сервиса не доходило (directorIds терялись по пути), и директор
   * узнавал о запросе, только если сам открывал раздел.
   *
   * recipientIds — кому адресован запрос (директора/админы), собирается
   * в UI. actorId — автор запроса (req.reqId), используется для фразы
   * «…от <ФИО>» и для исключения автора из списка получателей.
   */
  addRequest(req, recipientIds = []) {
    const kind = requireChangeKind(req.changeKind);
    if (!kind.targetTypes.includes(req.targetType)) {
      throw new Error(
        `Вид изменения «${kind.label}» не применим к типу «${req.targetType}»`,
      );
    }

    this._requestRepo.save(req);
    const title = this._targetTitle(req);
    this._notifications.notifyChangeRequestCreated(
      req, recipientIds, title, req.reqId,
    );
    this._notify();
  }

  getAll() {
    return this._requestRepo.findAll();
  }

  /**
   * Решение по запросу.
   *
   * При одобрении: правило req.changeKind применяется к целевой
   * сущности и в её history пишется человекочитаемая строка.
   * При отклонении: целевая сущность не меняется, но причина уходит
   * в аудит, уведомление автору и поле rejectionReason самой записи.
   *
   * reason обязателен при approved === false. Нормализация и проверка —
   * в normalizeRejectionReason (utils/rejection): это доменное правило,
   * одно на все сервисы, а не локальная валидация.
   *
   * Идемпотентность: повторное решение бросает.
   */
  decide(requestId, approved, actorId, reason = null) {
    const r = this._requestRepo.findById(requestId);
    if (!r) throw new Error('Запрос не найден');
    if (r.status !== 'pending') throw new Error('Решение по этому запросу уже принято');

    const kind = requireChangeKind(r.changeKind);
    const trimmedReason = normalizeRejectionReason(approved, reason);
    const targetTitle = this._targetTitle(r);

    this._requestRepo.save({
      ...r,
      status: approved ? 'approved' : 'rejected',
      rejectionReason: trimmedReason,
    });

    if (approved) {
      const entity = this._targetEntity(r);
      if (entity) {
        const updated = kind.apply(entity, r.newValue, r.targetType);
        updated.history = [
          ...(updated.history || []),
          {
            ts: Date.now(),
            who: actorId,
            text: kind.historyText(r.oldValue, r.newValue),
          },
        ];
        this._saveTarget(r.targetType, updated);
      }
    }

    const targetLabel = r.targetType === 'task' ? 'Задача' : 'Проект';
    const auditDetails = approved
      ? {
          [targetLabel]: targetTitle,
          'Прежнее значение': kind.formatValue(r.oldValue),
          'Новое значение': kind.formatValue(r.newValue),
          Обоснование: r.reason,
        }
      : {
          [targetLabel]: targetTitle,
          'Запрошенное значение': kind.formatValue(r.newValue),
          Обоснование: r.reason,
          'Причина отклонения': trimmedReason,
        };

    this._audit.addAudit(
      approved ? kind.auditApproved : kind.auditRejected,
      auditDetails,
      'changeRequest',
      requestId,
      actorId,
    );

    this._notifications.notifyChangeRequestDecision(
      r, approved, targetTitle, actorId, trimmedReason,
    );
    this._notify();
    return r;
  }

  _targetEntity(r) {
    if (r.targetType === 'task') return this._taskRepo.findById(r.targetId);
    if (r.targetType === 'project') return this._projectRepo.findById(r.targetId);
    return null;
  }

  _saveTarget(targetType, entity) {
    if (targetType === 'task') this._taskRepo.save(entity);
    else if (targetType === 'project') this._projectRepo.save(entity);
  }

  _targetTitle(r) {
    if (r.targetType === 'task') return this._taskRepo.findById(r.targetId)?.title || '(удалено)';
    if (r.targetType === 'project') return this._projectRepo.findById(r.targetId)?.name || '(удалено)';
    return '(удалено)';
  }
}