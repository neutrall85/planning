import type DataStore from '../DataStore';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { VacationRepository } from '../repositories/VacationRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import type { Employee, Department, Vacation, VacationStatus, VacationType } from '../../types';
import { sanitizeHtml } from '../../utils/sanitization';

/**
 * Сервис для управления сотрудниками и отпусками
 */
export class EmployeeService {
  private employeeRepo: EmployeeRepository;
  private vacationRepo: VacationRepository;
  private notificationRepo: NotificationRepository;
  private store: DataStore;

  constructor(store: DataStore) {
    this.store = store;
    this.employeeRepo = new EmployeeRepository(store);
    this.vacationRepo = new VacationRepository(store);
    this.notificationRepo = new NotificationRepository(store);
  }

  /**
   * Аутентификация сотрудника
   */
  authenticate(email: string, password: string): { success: boolean; employee?: Employee; error?: string } {
    const employee = this.employeeRepo.getEmployeeByEmail(email);
    
    if (!employee) {
      return { success: false, error: 'Сотрудник не найден' };
    }

    if (employee.fired) {
      return { success: false, error: 'Аккаунт уволенного сотрудника' };
    }

    // Проверка блокировки
    if (employee.lockUntil && Date.now() < employee.lockUntil) {
      const minutesLeft = Math.ceil((employee.lockUntil - Date.now()) / 60000);
      return { success: false, error: `Аккаунт заблокирован на ${minutesLeft} мин.` };
    }

    // Простая проверка пароля (в production использовать bcrypt)
    if (employee.pass !== password) {
      const failed = (employee.failed || 0) + 1;
      const updates: Partial<Employee> = { failed };

      if (failed >= 5) {
        updates.lockUntil = Date.now() + 15 * 60 * 1000; // 15 минут
        updates.failed = 0;
      }

      this.employeeRepo.updateEmployee(employee.id, updates);
      return { 
        success: false, 
        error: failed >= 5 ? 'Аккаунт заблокирован на 15 мин.' : 'Неверный пароль' 
      };
    }

    // Сброс счётчика неудачных попыток
    if (employee.failed || employee.lockUntil) {
      this.employeeRepo.updateEmployee(employee.id, { failed: 0, lockUntil: undefined });
    }

    return { success: true, employee };
  }

  /**
   * Создание запроса на отпуск
   */
  requestVacation(empId: string, start: string, end: string, type: VacationType, comment?: string): { success: boolean; vacation?: Vacation; error?: string } {
    const employee = this.employeeRepo.getEmployeeById(empId);
    if (!employee) {
      return { success: false, error: 'Сотрудник не найден' };
    }

    // Проверка дат
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate > endDate) {
      return { success: false, error: 'Дата начала позже даты окончания' };
    }

    const sanitizedComment = comment ? sanitizeHtml(comment) : undefined;

    const newVacation: Vacation = {
      id: `vac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      empId,
      start,
      end,
      type,
      status: 'submitted',
      comment: sanitizedComment
    };

    this.vacationRepo.create(newVacation);

    // Уведомление руководителя
    const headDeptIds = employee.headDeptIds || [];
    headDeptIds.forEach(deptId => {
      const deptEmployees = this.employeeRepo.getEmployeesByDepartment(deptId);
      const heads = deptEmployees.filter(e => e.roles.includes('head') || e.roles.includes('admin'));
      
      heads.forEach(head => {
        this.notificationRepo.create({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: head.id,
          text: `${employee.last} ${employee.first} запросил отпуск с ${start} по ${end}`,
          ts: Date.now(),
          targetType: 'vacation',
          targetId: newVacation.id
        });
      });
    });

    return { success: true, vacation: newVacation };
  }

  /**
   * Одобрение/отклонение отпуска
   */
  approveVacation(vacationId: string, approved: boolean): { success: boolean; error?: string } {
    const vacation = this.vacationRepo.getById(vacationId);
    if (!vacation) {
      return { success: false, error: 'Запрос не найден' };
    }

    const newStatus: VacationStatus = approved ? 'approved' : 'rejected';
    this.vacationRepo.update(vacationId, { status: newStatus });

    // Уведомление сотрудника
    const employee = this.employeeRepo.getEmployeeById(vacation.empId);
    if (employee) {
      this.notificationRepo.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: employee.id,
        text: `Ваш запрос на отпуск ${approved ? 'одобрен' : 'отклонён'}`,
        ts: Date.now(),
        targetType: 'vacation',
        targetId: vacationId
      });
    }

    return { success: true };
  }

  /**
   * Получение отпусков сотрудника
   */
  getEmployeeVacations(empId: string): Vacation[] {
    return this.vacationRepo.findByEmployeeId(empId);
  }

  /**
   * Получение ожидающих одобрения отпусков
   */
  getPendingVacations(): Vacation[] {
    return this.vacationRepo.getPendingRequests();
  }

  /**
   * Обновление данных сотрудника
   */
  updateEmployee(id: string, updates: Partial<Employee>): { success: boolean; employee?: Employee; error?: string } {
    // Санитизация текстовых полей
    if (updates.first) updates.first = sanitizeHtml(updates.first);
    if (updates.last) updates.last = sanitizeHtml(updates.last);
    if (updates.middle) updates.middle = sanitizeHtml(updates.middle);
    if (updates.position) updates.position = sanitizeHtml(updates.position);

    const updated = this.employeeRepo.updateEmployee(id, updates);
    if (!updated) {
      return { success: false, error: 'Сотрудник не найден' };
    }

    return { success: true, employee: updated };
  }
}
