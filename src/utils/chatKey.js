// src/utils/chatKey.js

/**
 * Ключ чата для хранения отметки «прочитано до» и подсчёта непрочитанных.
 * Принимает любую сущность с полями projectId / taskId.
 */
export const chatKey = ({ projectId, taskId }) =>
  taskId ? `task:${taskId}` : `project:${projectId}`;

/**
 * Все чаты, в которых видна сущность с полями projectId / taskId.
 *
 * Формула одна и та же для комментария и для чата:
 *   - задача N проекта P   - в «task:N» и «project:P»;
 *   - проект P             - только в «project:P».
 *
 * Применяется:
 *   - в подсчёте непрочитанных (для комментария);
 *   - в расчёте стартовой точки прочтения чата (Discussion.readCutoff).
 */
export const chatKeysFor = ({ projectId, taskId }) => {
  if (taskId) {
    return [`task:${taskId}`, `project:${projectId}`];
  }
  return [`project:${projectId}`];
};