/**
 * Преобразует плоский список задач в payload-дерево для шаблона.
 * Поля, не имеющие смысла в шаблоне (id, assigneeId, dates, logs,
 * history, archived, creatorId), намеренно отбрасываются.
 *
 * @param {object[]} allTasks - плоский список задач
 * @param {string}   [rootId] - если задан, вернёт поддерево подзадач этой
 *                              задачи; если нет - список корневых задач.
 * @returns {object[]} массив узлов payload
 */
export function collectTaskPayloads(allTasks, rootId) {
  if (!Array.isArray(allTasks)) return [];

  const byParent = new Map();
  for (const task of allTasks) {
    const key = task.parentTaskId || null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(task);
  }

  const buildNode = (task) => {
    const node = {
      title: task.title || '',
      desc: task.desc || '',
      priority: task.priority || 'mid',
      plannedHours: typeof task.plannedHours === 'number' ? task.plannedHours : undefined,
      dependencyType: task.dependencyType || undefined,
    };
    Object.keys(node).forEach(k => node[k] === undefined && delete node[k]);

    const children = byParent.get(task.id) || [];
    if (children.length) node.subtasks = children.map(buildNode);
    return node;
  };

  if (rootId) {
    return (byParent.get(rootId) || []).map(buildNode);
  }
  return (byParent.get(null) || []).map(buildNode);
}

/** Рекурсивно считает число задач в payload (учитывая subtasks). */
export function countNestedTasks(payloads) {
  if (!Array.isArray(payloads)) return 0;
  let total = 0;
  for (const node of payloads) {
    total += 1;
    if (Array.isArray(node.subtasks)) total += countNestedTasks(node.subtasks);
  }
  return total;
}