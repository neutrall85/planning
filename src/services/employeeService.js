// src/services/EmployeeService.js
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
      // Логируем изменения (упрощённо)
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

  // Для авторизации
  findByEmail(email) {
    return this._employeeRepo.findByEmail(email);
  }
}