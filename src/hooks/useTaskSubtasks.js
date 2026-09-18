// src/hooks/useTaskSubtasks.js
import { useMemo } from 'react';

/**
 * Подзадачи карточки: уже существующие (сохранены в db) и «черновые»
 * (пришли из применённого шаблона и появятся только после сохранения
 * родительской задачи). Оба списка нужны и вкладке «Подзадачи», и
 * saveHandler (для авто-простановки isSummary).
 */
export function useTaskSubtasks({ db, taskId, projectId, isNew, pendingTemplateSubtasks }) {
  const subtasks = useMemo(
    () => db.tasks.filter(t => t.parentTaskId === taskId),
    [db.tasks, taskId]
  );

  const draftSubtasks = useMemo(() => {
    if (!isNew || pendingTemplateSubtasks.length === 0) return [];
    return pendingTemplateSubtasks.map((node, idx) => ({
      id: `draft_${idx}`,
      _draft: true,
      title: node.title || 'Без названия',
      assigneeId: null,
      status: 'new',
      plannedHours: node.plannedHours ?? null,
      priority: node.priority || 'mid',
      deadline: null,
      logs: [],
      projectId,
    }));
  }, [isNew, pendingTemplateSubtasks, projectId]);

  const displayedSubtasks = useMemo(
    () => [...draftSubtasks, ...subtasks],
    [draftSubtasks, subtasks]
  );

  return { subtasks, draftSubtasks, displayedSubtasks };
}
