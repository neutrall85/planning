// src/utils/commentFilter.js

/**
 * Единственная точка правила «какой комментарий принадлежит этому чату».
 *
 * Логика идентична inline-фильтру в useCommentList: если бы они
 * разъехались, счётчик непрочитанных расходился бы с тем, что видно
 * в списке сообщений.
 *
 * Чат задачи  - комментарии именно этой задачи (по taskId).
 * Чат проекта - комментарии проекта, включая те, что привязаны к
 *               задачам этого проекта: они видны в чате проекта
 *               со ссылкой на задачу (см. showTaskLink в ProjectChat).
 *
 * Параметры примитивные: taskId === null означает чат проекта.
 */
export const commentInChat = (comment, projectId, taskId) => {
  if (projectId && comment.projectId !== projectId) return false;
  if (taskId && comment.taskId !== taskId) return false;
  return true;
};