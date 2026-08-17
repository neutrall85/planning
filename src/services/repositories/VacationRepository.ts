import type { Vacation } from '../../types';
import type DataStore from '../DataStore';

/**
 * Репозиторий для работы с отпусками
 */
export class VacationRepository {
  private store: DataStore;

  constructor(store: DataStore) {
    this.store = store;
  }

  getAll(): Vacation[] {
    return this.store.data.vacations;
  }

  getById(id: string): Vacation | undefined {
    return this.store.data.vacations.find(v => v.id === id);
  }

  create(vacation: Vacation): Vacation {
    this.store.data.vacations.push(vacation);
    this.store._notify();
    return vacation;
  }

  update(id: string, updates: Partial<Vacation>): Vacation | null {
    const index = this.store.data.vacations.findIndex(v => v.id === id);
    if (index === -1) return null;
    
    this.store.data.vacations[index] = { ...this.store.data.vacations[index], ...updates };
    this.store._notify();
    return this.store.data.vacations[index];
  }

  delete(id: string): boolean {
    const index = this.store.data.vacations.findIndex(v => v.id === id);
    if (index === -1) return false;
    
    this.store.data.vacations.splice(index, 1);
    this.store._notify();
    return true;
  }

  findByEmployeeId(empId: string): Vacation[] {
    return this.store.data.vacations.filter(v => v.empId === empId);
  }

  findByStatus(status: string): Vacation[] {
    return this.store.data.vacations.filter(v => v.status === status);
  }

  getActiveVacations(): Vacation[] {
    return this.store.data.vacations.filter(v => v.status === 'approved');
  }

  getPendingRequests(): Vacation[] {
    return this.store.data.vacations.filter(v => v.status === 'submitted');
  }
}
