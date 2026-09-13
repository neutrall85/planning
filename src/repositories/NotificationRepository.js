// src/repositories/NotificationRepository.js
import { Repository } from './Repository';

export class NotificationRepository extends Repository {
  constructor(notifications) {
    super(notifications);
  }

  findByUser(userId) {
    return this.find(n => n.userId === userId);
  }
}