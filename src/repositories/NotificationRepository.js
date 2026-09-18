// src/repositories/NotificationRepository.js
import { Repository } from './Repository';

export class NotificationRepository extends Repository {
  findByUser(userId) {
    return this.find(n => n.userId === userId);
  }
}