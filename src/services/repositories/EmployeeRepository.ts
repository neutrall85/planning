import type { Employee, Department } from '../../types';
import type DataStore from '../DataStore';

/**
 * Репозиторий для работы с сотрудниками и отделами
 */
export class EmployeeRepository {
  private store: DataStore;

  constructor(store: DataStore) {
    this.store = store;
  }

  // Сотрудники
  getAllEmployees(): Employee[] {
    return this.store.data.employees;
  }

  getEmployeeById(id: string): Employee | undefined {
    return this.store.data.employees.find(e => e.id === id);
  }

  getEmployeeByEmail(email: string): Employee | undefined {
    return this.store.data.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  }

  createEmployee(employee: Employee): Employee {
    this.store.data.employees.push(employee);
    this.store._notify();
    return employee;
  }

  updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
    const index = this.store.data.employees.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    this.store.data.employees[index] = { ...this.store.data.employees[index], ...updates };
    this.store._notify();
    return this.store.data.employees[index];
  }

  deleteEmployee(id: string): boolean {
    const index = this.store.data.employees.findIndex(e => e.id === id);
    if (index === -1) return false;
    
    this.store.data.employees.splice(index, 1);
    this.store._notify();
    return true;
  }

  getActiveEmployees(): Employee[] {
    return this.store.data.employees.filter(e => !e.fired);
  }

  getEmployeesByDepartment(deptId: string): Employee[] {
    return this.store.data.employees.filter(e => 
      e.departments.some(d => d.deptId === deptId)
    );
  }

  getEmployeesByRole(role: string): Employee[] {
    return this.store.data.employees.filter(e => e.roles.includes(role as any));
  }

  // Отделы
  getAllDepartments(): Department[] {
    return this.store.data.departments;
  }

  getDepartmentById(id: string): Department | undefined {
    return this.store.data.departments.find(d => d.id === id);
  }

  createDepartment(department: Department): Department {
    this.store.data.departments.push(department);
    this.store._notify();
    return department;
  }

  updateDepartment(id: string, updates: Partial<Department>): Department | null {
    const index = this.store.data.departments.findIndex(d => d.id === id);
    if (index === -1) return null;
    
    this.store.data.departments[index] = { ...this.store.data.departments[index], ...updates };
    this.store._notify();
    return this.store.data.departments[index];
  }

  deleteDepartment(id: string): boolean {
    const index = this.store.data.departments.findIndex(d => d.id === id);
    if (index === -1) return false;
    
    this.store.data.departments.splice(index, 1);
    this.store._notify();
    return true;
  }

  getChildDepartments(parentId: string): Department[] {
    return this.store.data.departments.filter(d => d.parentId === parentId);
  }
}
