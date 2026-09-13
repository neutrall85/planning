// src/services/AuthService.js
export class AuthService {
  constructor(employeeService, auditService, notifyCallback) {
    this._employeeService = employeeService;
    this._audit = auditService;
    this._notify = notifyCallback;
    this._currentUser = null;
  }

  getCurrentUser() {
    return this._currentUser;
  }

  login(email, password) {
    const found = this._employeeService.findByEmail(email);
    if (found && found.lockUntil && Date.now() < found.lockUntil) {
      const remainingMinutes = Math.ceil((found.lockUntil - Date.now()) / 60000);
      return `Учётная запись заблокирована на ${remainingMinutes} мин. после 5 неудачных попыток входа`;
    }
    if (found && found.pass === password && !found.fired) {
      if (found.failed > 0) {
        found.failed = 0;
        found.lockUntil = 0;
        this._employeeService.upsertEmployee(found, 'system');
      }
      this._currentUser = found;
      this._notify();
      return true;
    }
    if (found) {
      found.failed = (found.failed || 0) + 1;
      if (found.failed >= 5) {
        found.lockUntil = Date.now() + 15 * 60 * 1000;
        this._employeeService.upsertEmployee(found, 'system');
        return 'Учётная запись заблокирована на 15 мин. после 5 неудачных попыток входа';
      }
      this._employeeService.upsertEmployee(found, 'system');
    }
    return 'Неправильно введен логин/пароль';
  }

  logout() {
    this._currentUser = null;
    this._notify();
  }
}