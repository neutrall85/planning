// src/repositories/TaskRepository.js
import { Repository } from './Repository';

export class TaskRepository extends Repository {
  constructor(tasks) {
    super(tasks);
  }

  findByProject(projectId) {
    return this.find(t => t.projectId === projectId);
  }

  findByAssignee(assigneeId) {
    return this.find(t => t.assigneeId === assigneeId);
  }

  findChildren(parentId) {
    return this.find(t => t.parentTaskId === parentId && !t.archived);
  }

  findParent(taskId) {
    const task = this.findById(taskId);
    if (!task || !task.parentTaskId) return null;
    return this.findById(task.parentTaskId);
  }

  findRootTasks(projectId) {
    return this.find(t => t.projectId === projectId && !t.parentTaskId && !t.archived);
  }
}