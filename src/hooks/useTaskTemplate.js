// src/hooks/useTaskTemplate.js
import { useCallback, useState } from 'react';
import { applyTemplatePayload } from '../utils/templateSchemas';
import { collectTaskPayloads } from '../utils/templateNesting';

/**
 * Применение шаблона задачи к форме.
 *
 * Хранит имя применённого шаблона и «отложенные» подзадачи шаблона
 * (они ещё не существуют как задачи - превратятся в них только после
 * сохранения родительской задачи, см. saveHandler/onSave). Проект из
 * шаблона подставляется в форму только если он не зафиксирован извне
 * (isProjectLocked) и доступен пользователю.
 */
export function useTaskTemplate({
  isCopy, copySource, db, setFieldValue, isProjectLocked, effectiveProjectId, toast,
}) {
  const [appliedTemplateName, setAppliedTemplateName] = useState(null);

  const [pendingTemplateSubtasks, setPendingTemplateSubtasks] = useState(() =>
    isCopy ? collectTaskPayloads(db.tasks, copySource.id) : []
  );

  const applyTemplate = useCallback((template) => {
    if (!template) {
      setAppliedTemplateName(null);
      setPendingTemplateSubtasks([]);
      return;
    }

    const patch = applyTemplatePayload('task', template.payload);
    const {
      subtasks: nestedSubtasks,
      projectId: templateProjectId,
      ...taskFields
    } = patch;

    Object.keys(taskFields).forEach(field => setFieldValue(field, taskFields[field]));

    const cleanSubtasks = Array.isArray(nestedSubtasks) ? nestedSubtasks : [];
    setPendingTemplateSubtasks(cleanSubtasks);
    setAppliedTemplateName(template.name);

    if (cleanSubtasks.length > 0) {
      setFieldValue('isSummary', true);
    }

    if (!templateProjectId) return;

    if (isProjectLocked) {
      if (templateProjectId !== effectiveProjectId) {
        toast('Проект из шаблона не применён: задача создаётся в фиксированном проекте', 'info');
      }
      return;
    }

    const projectEntry = db.projects.find(p => p.id === templateProjectId);
    const accessible = projectEntry && projectEntry.status === 'active' && !projectEntry.archived;
    if (!accessible) {
      toast('Проект из шаблона недоступен - выберите проект вручную', 'warning');
      return;
    }

    setFieldValue('projectId', templateProjectId);
  }, [setFieldValue, isProjectLocked, effectiveProjectId, db.projects, toast]);

  return { appliedTemplateName, pendingTemplateSubtasks, applyTemplate };
}
