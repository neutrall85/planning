import type { Notification } from '../../types';
import type DataStore from '../DataStore';

/**
 * Репозиторий для работы с уведомлениями
 */
export class NotificationRepository {
  private store: DataStore;

  constructor(store: DataStore) {
    this.store = store;
  }

  getAll(): Notification[] {
    return this.store.data.notifications;
  }

  getById(id: string): Notification | undefined {
    return this.store.data.notifications.find(n => n.id === id);
  }

  create(notification: Notification): Notification {
    this.store.data.notifications.push(notification);
    this.store._notify();
    return notification;
  }

  update(id: string, updates: Partial<Notification>): Notification | null {
    const index = this.store.data.notifications.findIndex(n => n.id === id);
    if (index === -1) return null;
    
    this.store.data.notifications[index] = { ...this.store.data.notifications[index], ...updates };
    this.store._notify();
    return this.store.data.notifications[index];
  }

  delete(id: string): boolean {
    const index = this.store.data.notifications.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    this.store.data.notifications.splice(index, 1);
    this.store._notify();
    return true;
  }

  findByUserId(userId: string): Notification[] {
    return this.store.data.notifications.filter(n => n.userId === userId);
  }

  getUnreadByUserId(userId: string): Notification[] {
    return this.store.data.notifications.filter(n => n.userId === userId && !n.read);
  }

  markAsRead(id: string): Notification | null {
    return this.update(id, { read: true });
  }

  markAllAsRead(userId: string): void {
    const unread = this.getUnreadByUserId(userId);
    unread.forEach(n => this.markAsRead(n.id));
  }

  clearOld(userId: string, daysOld: number = 30): void {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const toDelete = this.store.data.notifications.filter(
      n => n.userId === userId && n.ts < cutoff
    );
    toDelete.forEach(n => this.delete(n.id));
  }
}
