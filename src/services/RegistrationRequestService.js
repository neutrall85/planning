// src/services/RegistrationRequestService.js
//
// Заявки на регистрацию: решение администратора.
//
// Заявка - просьба зарегистрировать НОВОГО сотрудника. Существующий
// сотрудник подать её не может: LoginScreen проверяет уникальность
// e-mail до отправки, а сама регистрация в приложении работает не
// через очередь, а мгновенно (store.registerEmployee). Очередь заявок
// сейчас наполняется только из mockData; сценария «одобрить поверх
// существующего» не существует, и ветки `if (existing)` в decide нет.
//
// Если registerEmployee при одобрении бросит «Сотрудник с таким e-mail
// уже существует» - это нарушение инварианта: либо данные в regRequests
// повреждены, либо в employees кто-то появился в обход LoginScreen.
// Заявка остаётся pending, ошибку показывает UI, админ разбирается.
//
// Аудит: пишем сами формулировками «Одобрение регистрации» /
// «Отклонение регистрации». Создание сотрудника вызывается с
// { audit: false } - иначе в журнал попадут обе записи, а фильтр в
// Journal.jsx ожидает одну.
export class RegistrationRequestService {
  constructor({ requestRepo, employeeService, auditService, notify }) {
    this._requestRepo = requestRepo;
    this._employeeService = employeeService;
    this._audit = auditService;
    this._notify = notify;
  }

  getAll() {
    return this._requestRepo.findAll();
  }

  decide(requestId, approved, actorId) {
    const r = this._requestRepo.findById(requestId);
    if (!r) throw new Error('Заявка не найдена');
    if (r.status !== 'pending') throw new Error('Решение по этой заявке уже принято');

    const fullName = `${r.last} ${r.first}`;

    if (approved) {
      // Новый сотрудник получит ['executor'] как стартовую роль; дальше
      // сработает синхронизация (roleSync) при первой назначенной задаче.
      this._employeeService.registerEmployee(
        { first: r.first, last: r.last, email: r.email, pass: r.pass },
        actorId,
        { audit: false },
      );

      this._requestRepo.save({ ...r, status: 'approved' });
      this._audit.addAudit(
        'Одобрение регистрации',
        { email: r.email, employee: fullName, position: r.position || 'Сотрудник' },
        'registration', requestId, actorId,
      );
    } else {
      this._requestRepo.save({ ...r, status: 'rejected' });
      this._audit.addAudit(
        'Отклонение регистрации',
        { email: r.email, employee: fullName, reason: r.rejectionReason || 'Не указана' },
        'registration', requestId, actorId,
      );
    }

    this._notify();
    return r;
  }
}