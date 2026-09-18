// src/services/DepartmentService.js
export class DepartmentService {
  constructor({ deptRepo, auditService, notify }) {
    this._deptRepo = deptRepo;
    this._audit = auditService;
    this._notify = notify;
  }

  upsertDepartment(dept, currentUserId) {
    const existing = this._deptRepo.findById(dept.id);
    if (!existing) {
      this._audit.addAudit('Создание отдела', dept.name, 'department', dept.id, currentUserId);
    } else {
      this._audit.addAudit('Изменение отдела', dept.name, 'department', dept.id, currentUserId);
    }
    this._deptRepo.save(dept);
    this._notify();
  }

  getAll() {
    return this._deptRepo.findAll();
  }
}