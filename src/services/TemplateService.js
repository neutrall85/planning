import { uid, iso, addDays } from '../utils/date';
import { isValidTemplateKind, extractTemplatePayload } from '../utils/templateSchemas';

const MAX_NAME_LENGTH = 80;
const TEMPLATE_ID_PREFIX = 'tpl_';
const DEFAULT_TASK_HOURS = 8;
const DEFAULT_TASK_DEADLINE_DAYS = 14;

export class TemplateService {
  constructor(templateRepo, auditService, notifyCallback, deps = {}) {
    this._repo = templateRepo;
    this._audit = auditService;
    this._notify = notifyCallback;
    this._taskService = deps.taskService || null;
  }

  // ---------- Чтение ----------

  getVisible(kind, user) {
    if (!user || !isValidTemplateKind(kind)) return [];
    const list = this._repo
      .findByKind(kind)
      .filter(t => t.ownerId === user.id || t.isShared);
    return this._sortOwnFirst(list, user);
  }

  getAllVisible(user) {
    if (!user) return [];
    const list = this._repo
      .findAll()
      .filter(t => t.ownerId === user.id || t.isShared);
    return this._sortOwnFirst(list, user);
  }

  // ---------- Изменение ----------

  create({ kind, name, isShared = false, source }, user) {
    if (!user) throw new Error('Требуется вход в систему');
    if (!isValidTemplateKind(kind)) throw new Error('Неизвестный тип шаблона');

    const cleanName = this._cleanName(name);
    const payload = extractTemplatePayload(kind, source);
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error('Нет данных для сохранения в шаблон');
    }

    const now = Date.now();
    const template = {
      id: TEMPLATE_ID_PREFIX + uid(),
      kind,
      name: cleanName,
      isShared: !!isShared,
      ownerId: user.id,
      payload,
      createdAt: now,
      updatedAt: now,
    };

    this._repo.save(template);
    this._audit.addAudit(
      'Создание шаблона',
      { kind, name: cleanName, shared: template.isShared },
      'template',
      template.id,
      user.id,
    );
    this._notify();
    return template;
  }

  update(id, patch, user) {
    if (!user) throw new Error('Требуется вход в систему');
    const template = this._repo.findById(id);
    if (!template) throw new Error('Шаблон не найден');
    this._assertOwnership(template, user);

    const updated = { ...template };

    if (patch.name !== undefined) {
      updated.name = this._cleanName(patch.name);
    }
    if (patch.isShared !== undefined) {
      updated.isShared = !!patch.isShared;
    }
    if (patch.payload !== undefined) {
      const sanitized = extractTemplatePayload(template.kind, patch.payload);
      if (!sanitized || Object.keys(sanitized).length === 0) {
        throw new Error('Пустой шаблон недопустим');
      }
      updated.payload = sanitized;
    }

    updated.updatedAt = Date.now();
    this._repo.save(updated);
    this._audit.addAudit(
      'Изменение шаблона',
      { kind: updated.kind, name: updated.name, shared: updated.isShared },
      'template',
      id,
      user.id,
    );
    this._notify();
    return updated;
  }

  remove(id, user) {
    if (!user) throw new Error('Требуется вход в систему');
    const template = this._repo.findById(id);
    if (!template) throw new Error('Шаблон не найден');
    this._assertOwnership(template, user);

    this._repo.delete(id);
    this._audit.addAudit(
      'Удаление шаблона',
      { kind: template.kind, name: template.name },
      'template',
      id,
      user.id,
    );
    this._notify();
  }

  // ---------- Применение ----------

  /**
   * Материализует дерево задач из payload шаблона. Каждый узел
   * превращается в реальную задачу, вложенные - в подзадачи с
   * корректным parentTaskId.
   *
   * Ошибки отдельных узлов не прерывают создание остальных.
   * Возвращает сводку { created, failed, errors }.
   */
  instantiateTaskTree(payloads, { projectId, parentTaskId = null, actorId }) {
    const result = { created: 0, failed: 0, errors: [] };
    if (!this._taskService) {
      result.errors.push({ title: null, message: 'TaskService недоступен' });
      return result;
    }
    const list = Array.isArray(payloads) ? payloads : [payloads];
    for (const item of list) {
      this._createTaskFromPayload(item, { projectId, parentTaskId, actorId }, result);
    }
    return result;
  }

  // ---------- Внутренние ----------

  _sortOwnFirst(list, user) {
    return [...list].sort((a, b) => {
      const aOwn = a.ownerId === user.id ? 0 : 1;
      const bOwn = b.ownerId === user.id ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return b.updatedAt - a.updatedAt;
    });
  }

  _cleanName(raw) {
    const clean = String(raw || '').trim().slice(0, MAX_NAME_LENGTH);
    if (!clean) throw new Error('Укажите название шаблона');
    return clean;
  }

  _assertOwnership(template, user) {
    const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin');
    if (template.ownerId !== user.id && !isAdmin) {
      throw new Error('Можно изменять только свои шаблоны');
    }
  }

  _createTaskFromPayload(item, ctx, result) {
    if (!item || typeof item !== 'object') return null;

    const taskId = 't_' + uid();
    const task = {
      id: taskId,
      title: item.title || 'Без названия',
      desc: item.desc || '',
      projectId: ctx.projectId,
      assigneeId: null,
      priority: item.priority || 'mid',
      plannedHours: item.plannedHours ?? DEFAULT_TASK_HOURS,
      start: iso(new Date()),
      deadline: iso(addDays(new Date(), DEFAULT_TASK_DEADLINE_DAYS)),
      status: 'new',
      logs: [],
      history: [{ ts: Date.now(), who: ctx.actorId, text: 'Создана из шаблона' }],
      creatorId: ctx.actorId,
      createdAt: new Date().toISOString(),
      delegatedFrom: null,
      archived: false,
      archivedAt: null,
      closedAt: null,
      isSummary: false,
      parentTaskId: ctx.parentTaskId,
      files: [],
      dependencyId: null,
      dependencyType: item.dependencyType || 'FS',
    };

    try {
      this._taskService.upsertTask(task, ctx.actorId);
      result.created += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({ title: task.title, message: err.message });
      return null;
    }

    if (Array.isArray(item.subtasks)) {
      for (const sub of item.subtasks) {
        this._createTaskFromPayload(sub, { ...ctx, parentTaskId: taskId }, result);
      }
    }
    return taskId;
  }
}