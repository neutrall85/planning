// src/services/EmployeeService.js
import { uid } from '../utils/date';

export class EmployeeService {
  constructor(employeeRepo, auditService, notifyCallback) {
    this._employeeRepo = employeeRepo;
    this._audit = auditService;
    this._notify = notifyCallback;
  }

  getAll() {
    return this._employeeRepo.findAll();
  }

  upsertEmployee(emp, currentUserId) {
    const existing = this._employeeRepo.findById(emp.id);
    if (existing) {
      this._audit.addAudit('Изменение сотрудника', `${emp.last} ${emp.first}`, 'employee', emp.id, currentUserId);
    } else {
      this._audit.addAudit('Создание сотрудника', `${emp.last} ${emp.first}`, 'employee', emp.id, currentUserId);
    }
    this._employeeRepo.save(emp);
    this._notify();
  }

  getEmployeeName(id) {
    const e = this._employeeRepo.findById(id);
    return e ? `${e.last} ${e.first}` : '—';
  }

  findByEmail(email) {
    return this._employeeRepo.findByEmail(email);
  }

  /**
   * Самостоятельная регистрация сотрудника (через экран LoginScreen).
   *
   * Единственный путь создания сотрудника «снаружи» — без прав admin/hr.
   * Возвращает созданного сотрудника, чтобы вызывающий код выполнил login
   * без гонок по стору: регистрация и вход идут в одном такте.
   *
   * Все гарантии (валидация уникальности email, единая точка записи в
   * EmployeeRepository, аудит) сосредоточены здесь, а не в UI.
   */
  registerEmployee({ first, last, email, pass, position = 'Сотрудник' }, actorId = 'system') {
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
    this._audit.addAudit('Регистрация сотрудника', `${emp.last} ${emp.first}`, 'employee', emp.id, actorId);
    this._notify();
    return emp;
  }
}