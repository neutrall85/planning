/**
 * Base Repository Class
 * Provides common CRUD operations and data access patterns
 */

export abstract class BaseRepository<T extends { id: string }> {
  protected data: T[];

  constructor(initialData: T[] = []) {
    this.data = initialData;
  }

  findAll(): T[] {
    return [...this.data];
  }

  findById(id: string): T | undefined {
    return this.data.find(item => item.id === id);
  }

  findByPredicate(predicate: (item: T) => boolean): T[] {
    return this.data.filter(predicate);
  }

  exists(id: string): boolean {
    return this.data.some(item => item.id === id);
  }

  count(): number {
    return this.data.length;
  }

  protected upsertInternal(item: T): void {
    const idx = this.data.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      this.data[idx] = item;
    } else {
      this.data.push(item);
    }
  }

  protected deleteInternal(id: string): boolean {
    const idx = this.data.findIndex(i => i.id === id);
    if (idx >= 0) {
      this.data.splice(idx, 1);
      return true;
    }
    return false;
  }

  protected setAll(items: T[]): void {
    this.data = items;
  }
}
