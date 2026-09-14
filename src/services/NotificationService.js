// src/services/NotificationService.js
import { uid, fmtDMY } from '../utils/date';
import { TASK_STATUSES, PROJECT_STATUSES, ROLES } from '../utils/constants';
import { extractMentions } from '../utils/mentionParser';

export class NotificationService {
  /**
   * @param {NotificationRepository} notificationRepo
   * @param {() => void} notifyCallback - триггер подписчиков store
   * @param {() => Object} getData - доступ к текущим данным { tasks, projects, employees, comments }
   */
  constructor(notificationRepo, notifyCallback, getData) {
    this._notificationRepo = notificationRepo;
    this._notify = notifyCallback;
    this._getData = getData || (() => ({}));
  }

  // ==================== БАЗОВЫЙ УРОВЕНЬ ====================

  /** Публичное создание (триггерит рендер). */
  addNotification(userId, text, target = null) {
    const n = this._addNotification(userId, text, target);
    this._notify();
    return n;
  }

  /** Внутреннее создание (без рендера — для батчинга в семантических методах). */
  _addNotification(userId, text, target = null) {
    if (!userId) return null;
    const notif = {
      id: uid(),
      userId,
      text,
      ts: Date.now(),
      read: false,
      targetType: target?.targetType || null,
      targetId: target?.targetId || null,
    };
    this._notificationRepo.save(notif);
    return notif;
  }

  markRead(id) {
    const n = this._notificationRepo.findById(id);
    if (n) {
      n.read = true;
      this._notificationRepo.save(n);
      this._notify();
    }
  }

  markAllRead(userId) {
    const list = this._notificationRepo.findByUser(userId);
    list.forEach(n => {
      if (!n.read) {
        n.read = true;
        this._notificationRepo.save(n);
      }
    });
    this._notify();
  }

  getAll() {
    return this._notificationRepo.findAll();
  }

  // ==================== УТИЛИТЫ ====================

  _name(id) {
    const { employees = [] } = this._getData();
    const e = employees.find(x => x.id === id);
    return e ? `${e.last} ${e.first}` : 'сотрудник';
  }

  _short(text, max = 60) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  // ==================== ЗАДАЧИ ====================

  notifyTaskCreated(task, actorId) {
    if (task.assigneeId && task.assigneeId !== actorId) {
      this._addNotification(
        task.assigneeId,
        `Вам назначена задача "${task.title}"`,
        { targetType: 'task', targetId: task.id }
      );
    }
    if (task.projectId) {
      const { projects = [] } = this._getData();
      const project = projects.find(p => p.id === task.projectId);
      if (project?.managerId && project.managerId !== actorId && project.managerId !== task.assigneeId) {
        this._addNotification(
          project.managerId,
          `В проекте "${project.name}" создана задача "${task.title}"`,
          { targetType: 'task', targetId: task.id }
        );
      }
    }
    this._notify();
  }

  notifyTaskReassigned(task, oldAssigneeId, actorId) {
    if (!task.assigneeId || task.assigneeId === actorId) return;
    const oldName = oldAssigneeId ? this._name(oldAssigneeId) : 'предыдущего';
    this._addNotification(
      task.assigneeId,
      `Вам переназначена задача "${task.title}" (от ${oldName})`,
      { targetType: 'task', targetId: task.id }
    );
    this._notify();
  }

  notifyTaskStatusChanged(task, actorId) {
    const recipients = this._collectTaskStakeholders(task, actorId);
    const statusLabel = TASK_STATUSES[task.status]?.label || task.status;
    recipients.forEach(uid => {
      this._addNotification(
        uid,
        `Задача "${task.title}": статус → ${statusLabel}`,
        { targetType: 'task', targetId: task.id }
      );
    });
    if (recipients.size) this._notify();
  }

  notifyTaskDeadlineChanged(task, oldDeadline, actorId) {
    if (!task.assigneeId || task.assigneeId === actorId) return;
    const from = oldDeadline ? fmtDMY(oldDeadline) : '—';
    const to = task.deadline ? fmtDMY(task.deadline) : '—';
    this._addNotification(
      task.assigneeId,
      `Изменён срок задачи "${task.title}": ${from} → ${to}`,
      { targetType: 'task', targetId: task.id }
    );
    this._notify();
  }

  notifyTaskHoursChanged(task, oldHours, actorId) {
    if (!task.assigneeId || task.assigneeId === actorId) return;
    this._addNotification(
      task.assigneeId,
      `Изменены плановые часы задачи "${task.title}": ${oldHours ?? '—'} → ${task.plannedHours ?? '—'} ч`,
      { targetType: 'task', targetId: task.id }
    );
    this._notify();
  }

  notifyTaskArchived(task, project, actorId) {
    if (!task.creatorId || task.creatorId === actorId) return;
    const action = project.status === 'closed' ? 'закрыт' : 'отменён';
    this._addNotification(
      task.creatorId,
      `Задача "${task.title}" архивирована (проект ${project.code} ${action})`,
      { targetType: 'task', targetId: task.id }
    );
    this._notify();
  }

  _collectTaskStakeholders(task, actorId) {
    const ids = new Set();
    if (task.creatorId) ids.add(task.creatorId);
    if (task.assigneeId) ids.add(task.assigneeId);
    if (task.projectId) {
      const { projects = [] } = this._getData();
      const p = projects.find(x => x.id === task.projectId);
      if (p?.managerId) ids.add(p.managerId);
    }
    ids.delete(actorId);
    return ids;
  }

  // ==================== ПРОЕКТЫ ====================

  notifyProjectCreated(project, actorId) {
    if (!project.managerId || project.managerId === actorId) return;
    this._addNotification(
      project.managerId,
      `Вы назначены ответственным по проекту "${project.name}"`,
      { targetType: 'project', targetId: project.id }
    );
    this._notify();
  }

  notifyProjectManagerChanged(project, actorId) {
    if (!project.managerId || project.managerId === actorId) return;
    this._addNotification(
      project.managerId,
      `Вы назначены ответственным по проекту "${project.name}"`,
      { targetType: 'project', targetId: project.id }
    );
    this._notify();
  }

  notifyProjectStatusChanged(project, actorId) {
    if (!project.managerId || project.managerId === actorId) return;
    const statusLabel = PROJECT_STATUSES[project.status] || project.status;
    this._addNotification(
      project.managerId,
      `Проект "${project.name}": статус → ${statusLabel}`,
      { targetType: 'project', targetId: project.id }
    );
    this._notify();
  }

  notifyProjectArchived(project, taskAssigneeIds, actorId) {
    const action = project.status === 'closed' ? 'закрыт' : 'отменён';
    if (project.managerId && project.managerId !== actorId) {
      this._addNotification(
        project.managerId,
        `Проект "${project.name}" ${action}`,
        { targetType: 'project', targetId: project.id }
      );
    }
    taskAssigneeIds.forEach(uid => {
      if (uid === actorId || uid === project.managerId) return;
      this._addNotification(
        uid,
        `Проект "${project.name}" ${action}`,
        { targetType: 'project', targetId: project.id }
      );
    });
    this._notify();
  }

  // ==================== КОММЕНТАРИИ ====================

  notifyComment(comment) {
    const data = this._getData();
    const { tasks = [], projects = [], employees = [], comments = [] } = data;
    const author = employees.find(e => e.id === comment.authorId);
    if (!author) return;

    const authorName = `${author.last} ${author.first}`;

    const recipients = new Set();
    const mentionedIds = extractMentions(comment.text, employees);
    mentionedIds.forEach(id => recipients.add(id));

    if (comment.taskId) {
      const task = tasks.find(t => t.id === comment.taskId);
      if (task) {
        if (task.assigneeId) recipients.add(task.assigneeId);
        if (task.creatorId) recipients.add(task.creatorId);
        const p = projects.find(x => x.id === task.projectId);
        if (p?.managerId) recipients.add(p.managerId);
      }
    }

    if (comment.parentId) {
      const parent = comments.find(c => c.id === comment.parentId);
      if (parent?.authorId) recipients.add(parent.authorId);
    }

    recipients.delete(comment.authorId);

    const targetType = comment.taskId ? 'task' : 'project';
    const targetId = comment.taskId || comment.projectId;
    const shortText = this._short(comment.text);
    const mentionedSet = new Set(mentionedIds);

    recipients.forEach(userId => {
      const text = mentionedSet.has(userId)
        ? `${authorName} упомянул(а) вас: «${shortText}»`
        : `${authorName} оставил(а) комментарий: «${shortText}»`;
      this._addNotification(userId, text, { targetType, targetId });
    });

    if (recipients.size) this._notify();
  }

  // ==================== ОТПУСКА ====================

  notifyVacationDecision(vacation, approved) {
    const period = `${fmtDMY(vacation.start)}—${fmtDMY(vacation.end)}`;
    this._addNotification(
      vacation.empId,
      `Ваш отпуск ${period} ${approved ? 'утверждён' : 'отклонён'}.`,
      { targetType: 'vacation', targetId: vacation.id }
    );
    this._notify();
  }

  notifyVacationDelegationApplied(vacation, fromId, toId) {
    this._addNotification(
      toId,
      `Вам переданы задачи ${this._name(fromId)} на период отпуска`,
      { targetType: 'vacation', targetId: vacation.id }
    );
    this._addNotification(
      fromId,
      `Ваши задачи переданы ${this._name(toId)} на период отпуска`,
      { targetType: 'vacation', targetId: vacation.id }
    );
    this._notify();
  }

  // ==================== ДЕЛЕГИРОВАНИЕ РОЛЕЙ ====================

  notifyRoleDelegationCreated(delegation, actorId) {
    if (!delegation.toId || delegation.toId === actorId) return;
    const roles = delegation.roles.map(r => ROLES[r]?.label || r).join(', ');
    this._addNotification(
      delegation.toId,
      `Вам предложено временное принятие ролей: ${roles}.`,
      { targetType: 'delegation', targetId: delegation.id }
    );
    this._notify();
  }

  notifyRoleDelegationDecision(delegation, approved, actorId) {
    if (!delegation.fromId || delegation.fromId === actorId) return;
    const roles = delegation.roles.map(r => ROLES[r]?.label || r).join(', ');
    this._addNotification(
      delegation.fromId,
      `${this._name(delegation.toId)} ${approved ? 'принял(а)' : 'отклонил(а)'} делегирование ролей: ${roles}`,
      { targetType: 'delegation', targetId: delegation.id }
    );
    this._notify();
  }

  // ==================== ЗАПРОСЫ ЧАСОВ ====================

  notifyHoursRequestCreated(request, directorIds, targetTitle, actorId) {
    const targetKind = request.kind === 'task' ? 'задаче' : 'проекту';
    directorIds.forEach(id => {
      if (id === actorId) return;
      this._addNotification(
        id,
        `Запрос на изменение часов по ${targetKind} "${targetTitle}" от ${this._name(actorId)}.`,
        { targetType: 'hours', targetId: request.id }
      );
    });
    this._addNotification(
      actorId,
      `Ваш запрос на изменение часов по ${targetKind} "${targetTitle}" отправлен на рассмотрение.`,
      { targetType: 'hours', targetId: request.id }
    );
    this._notify();
  }

  notifyHoursRequestDecision(request, approved, targetTitle, actorId) {
    const targetKind = request.kind === 'task' ? 'задаче' : 'проекту';
    this._addNotification(
      request.reqId,
      `Ваш запрос на изменение часов по ${targetKind} "${targetTitle}" ${approved ? 'утверждён' : 'отклонён'}.`,
      { targetType: 'hours', targetId: request.id }
    );
    this._notify();
  }

  // ==================== РЕГИСТРАЦИЯ ====================

  notifyRegistrationRequest(request, adminIds, actorId) {
    const name = `${request.last} ${request.first}`;
    adminIds.forEach(id => {
      if (id === actorId) return;
      this._addNotification(
        id,
        `Новая заявка на регистрацию: ${name}.`,
        { targetType: 'registration', targetId: request.id }
      );
    });
    if (adminIds.length) this._notify();
  }

  // ==================== СОТРУДНИКИ ====================

  notifyEmployeeCreated(employee, actorId) {
    this._addNotification(
      actorId,
      `Создан сотрудник ${employee.last} ${employee.first}.`,
      { targetType: 'employee', targetId: employee.id }
    );
    this._notify();
  }
}