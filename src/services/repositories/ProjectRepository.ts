import type { Project } from '../../types';
import type DataStore from '../DataStore';

/**
 * Репозиторий для работы с проектами
 */
export class ProjectRepository {
  private store: DataStore;

  constructor(store: DataStore) {
    this.store = store;
  }

  getAll(): Project[] {
    return this.store.data.projects;
  }

  getById(id: string): Project | undefined {
    return this.store.data.projects.find(p => p.id === id);
  }

  create(project: Project): Project {
    this.store.data.projects.push(project);
    this.store._notify();
    return project;
  }

  update(id: string, updates: Partial<Project>): Project | null {
    const index = this.store.data.projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.store.data.projects[index] = { ...this.store.data.projects[index], ...updates };
    this.store._notify();
    return this.store.data.projects[index];
  }

  delete(id: string): boolean {
    const index = this.store.data.projects.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.store.data.projects.splice(index, 1);
    this.store._notify();
    return true;
  }

  findByManagerId(managerId: string): Project[] {
    return this.store.data.projects.filter(p => p.managerId === managerId);
  }

  findByStatus(status: string): Project[] {
    return this.store.data.projects.filter(p => p.status === status);
  }

  getActiveProjects(): Project[] {
    return this.store.data.projects.filter(p => p.status === 'active');
  }
}
