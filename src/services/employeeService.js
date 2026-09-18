// src/services/EmployeeService.js
import { uid } from '../utils/date';
import { ROLES } from '../utils/constants';
import { withSyncedExecutorRole } from './roleSync';
import {
  auditLabel,
  auditDetails,
  auditDelta,
  auditToggle,
  auditSet,
  auditMark,
} from '../utils/auditHelpers';

export class EmployeeService {
  /**
   * taskRepo нужен для синхронизации производной роли executor
   * при сохранении сотрудника. Ручная правка ролей не должна нарушать
   * инвариант «есть задачи - есть executor / нет задач - нет executor».
   */
  constructor({ employeeRepo, taskRepo, auditService, notify }) {
    this._employeeRepo = employeeRepo;
    this._taskRepo = taskRepo;
    this._audit = auditService;
    this._notify = notify;
  }

  getAll() {
    return this._employeeRepo.findAll();
  }

  /**
   * Создание/изменение сотрудника.
   *
   * options.audit === false - не писать запись в журнал. Нужно там, где
   * изменение сотрудника - побочный эффект другого действия (например,
   * одобрение регистрации в RegistrationRequestService создаёт сотрудника
   * через registerEmployee, а само пишет «Одобрение регистрации»).
   *
   * Перед сохранением прогоняем роли через withSyncedExecutorRole:
   * если у сотрудника есть задачи, executor добавится; если нет и он не
   * единственная - снимется. Аудит пишется уже по финальным ролям -
   * честно показывает, что реально сохранилось.
   */
  upsertEmployee(emp, currentUserId, options = {}) {
    const skipAudit = options.audit === false;
    const existing = this._employeeRepo.findById(emp.id);

    const finalEmp = {
      ...emp,
      roles: withSyncedExecutorRole(emp.id, emp.roles, { taskRepo: this._taskRepo }),
    };

    if (!skipAudit) {
      if (existing) {
        const changes = this._describeChanges(existing, finalEmp);
        if (Object.keys(changes).length > 0) {
          this._audit.addAudit(
            'Изменение сотрудника',
            auditDetails('Сотрудник', `${finalEmp.last} ${finalEmp.first}`, changes),
            'employee',
            finalEmp.id,
            currentUserId,
          );
        }
      } else {
        this._audit.addAudit(
          'Создание сотрудника',
          `${finalEmp.last} ${finalEmp.first}`,
          'employee', finalEmp.id, currentUserId,
        );
      }
    }

    this._employeeRepo.save(finalEmp);
    this._notify();
    return finalEmp;
  }

  /**
   * Увольнение/восстановление сотрудника.
   *
   * Отдельный метод, а не upsertEmployee({fired}): у действия другая
   * семантика в журнале. Идемпотентен.
   */
  setFired(empId, fired, actorId) {
    const emp = this._employeeRepo.findById(empId);
    if (!emp) throw new Error('Сотрудник не найден');
    if (emp.fired === fired) return emp;

    const updated = { ...emp, fired };
    this._employeeRepo.save(updated);
    this._audit.addAudit(
      fired ? 'Увольнение сотрудника' : 'Восстановление сотрудника',
      `${emp.last} ${emp.first}`,
      'employee', empId, actorId,
    );
    this._notify();
    return updated;
  }

  _describeChanges(existing, next) {
    const changes = {};

    auditToggle(changes, 'Статус', existing.fired, next.fired, 'Уволен', 'Восстановлен');

    const rolesAdded = (next.roles || []).filter(r => !(existing.roles || []).includes(r));
    const rolesRemoved = (existing.roles || []).filter(r => !(next.roles || []).includes(r));
    if (rolesAdded.length) changes['Добавлены роли'] = rolesAdded.map(r => auditLabel(ROLES, r)).join(', ');
    if (rolesRemoved.length) changes['Убраны роли'] = rolesRemoved.map(r => auditLabel(ROLES, r)).join(', ');

    auditSet(changes, 'Подразделения', existing.departments, next.departments, (d) => d.deptId);
    auditSet(changes, 'КБ', existing.kbIds, next.kbIds);
    auditSet(changes, 'Руководимые отделы', existing.headDeptIds, next.headDeptIds);

    auditDelta(changes, 'Должность', existing.position, next.position);
    auditDelta(changes, 'E-mail', existing.email, next.email);
    auditDelta(changes, 'Телефон', existing.phone, next.phone);
    auditDelta(changes, 'Внутренний номер', existing.extension, next.extension);

    auditMark(changes, 'Пароль', existing.pass, next.pass, 'изменён');

    return changes;
  }

  getEmployeeName(id) {
    const e = this._employeeRepo.findById(id);
    return e ? `${e.last} ${e.first}` : '-';
  }

  findByEmail(email) {
    return this._employeeRepo.findByEmail(email);
  }

  /**
   * Регистрация сотрудника.
   *
   * options.audit === false - см. комментарий upsertEmployee.
   *
   * Новичок получает ['executor'] - как единственная роль, это
   * соответствует правилу: нет задач, но и других ролей тоже нет,
   * поэтому executor остаётся «ролью по умолчанию». Первая назначенная
   * задача это подтвердит; если роли потом появятся, executor снимется
   * автоматически.
   */
  registerEmployee({ first, last, email, pass, position = 'Сотрудник' }, actorId = 'system', options = {}) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) throw new Error('E-mail обязателен');
    if (this._employeeRepo.findByEmail(normalizedEmail)) {
      throw new Error('Сотрудник с таким e-mail уже существует');
    }

    const emp = {
      id: 'e_' + uid(),
      last: String(last || '').trim(),
      first: String(first || '').trim(),
      email: normalizedEmail,
      pass,
      position,
      departments: [],
      roles: ['executor'],
      kbIds: [],
      headDeptIds: [],
      phone: '',
      extension: '',
      tab: String(1000 + Math.floor(Math.random() * 8999)),
      notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
      failed: 0,
      lockUntil: 0,
      fired: false,
      photo: null,
      passwordHistory: [],
    };

    this._employeeRepo.save(emp);
    if (options.audit !== false) {
      this._audit.addAudit('Регистрация сотрудника', `${emp.last} ${emp.first}`, 'employee', emp.id, actorId);
    }
    this._notify();
    return emp;
  }
}