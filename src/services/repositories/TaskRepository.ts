import type { Task } from '../../types';
import type DataStore from '../DataStore';

/**
 * Репозиторий для работы с задачами
 */
export class TaskRepository {
  private store: DataStore;

  constructor(store: DataStore) {
    this.store = store;
  }

  getAll(): Task[] {
    return this.store.data.tasks;
  }

  getById(id: string): Task | undefined {
    return this.store.data.tasks.find(t => t.id === id);
  }

  create(task: Task): Task {
    this.store.data.tasks.push(task);
    this.store._notify();
    return task;
  }

  update(id: string, updates: Partial<Task>): Task | null {
    const index = this.store.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    this.store.data.tasks[index] = { ...this.store.data.tasks[index], ...updates };
    this.store._notify();
    return this.store.data.tasks[index];
  }

  delete(id: string): boolean {
    const index = this.store.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.store.data.tasks.splice(index, 1);
    this.store._notify();
    return true;
  }

  findByProjectId(projectId: string): Task[] {
    return this.store.data.tasks.filter(t => t.projectId === projectId);
  }

  findByAssigneeId(assigneeId: string): Task[] {
    return this.store.data.tasks.filter(t => 
      t.assigneeIds?.includes(assigneeId)
    );
  }

  findByStatus(status: string): Task[] {
    return this.store.data.tasks.filter(t => t.status === status);
  }
}
