// src/hooks/useTaskSave.js
import { useCallback } from 'react';
import { TASK_STATUSES, DIALOGS } from '../utils/constants';
import { TODAY, fmtDMY } from '../utils/date';
import { applyHourlyMode, hoursBetween } from '../utils/hourlyTask';

/**
 * Сохранение и удаление задачи.
 *
 * Обязательность полей (название, проект, исполнитель и т.д.) здесь
 * не перепроверяется: saveHandler передаётся в useForm.handleSubmit
 * (см. TaskModal/index.jsx), который вызывает callback, только когда
 * isValid === true - а isValid считается по той же validate(), что и
 * подсветка ошибок под полями (см. useTaskFormState). Проверять то же
 * самое второй раз здесь означало бы держать одно правило в двух
 * местах и рано или поздно рассинхронизировать формулировки ошибок.
 *
 * Здесь - только то, что не является валидацией формы:
 *   - Плановые часы проекта (сумма плановых часов по проекту);
 *   - пересечение с отпуском исполнителя;
 *   - перегрузка исполнителя по плану.
 * Это доменные правила, требующие асинхронного подтверждения
 * пользователя (confirm) и обращения к другим сущностям (db, store) -
 * их место не в синхронном validate(), а здесь, непосредственно перед
 * вызовом onSave.
 *
 * Важно для проекта без бэкенда: эти проверки - подсказки пользователю,
 * а не гарантия целостности данных. Здесь нет сервера, который
 * перепроверит бюджет или пересечение отпуска независимо от клиента,
 * поэтому все данные, к которым обращается saveHandler (db.tasks,
 * db.projects, db.vacations), должны приходить из доверенного стора
 * приложения, а не из значений, которые пользователь мог подставить
 * в обход формы.
 */
export function useTaskSave({
  existing, isNew, db, vacOverlap, toast, onSave, onDelete, ur,
  subtasks, draftSubtasks, pendingTemplateSubtasks, confirm, store, empName,
}) {
  const saveHandler = useCallback(async (vals) => {
    const proj = db.projects.find(p => p.id === vals.projectId);
    const isAdminProj = proj && proj.ptype === 'admin';

    if (proj && proj.budget != null && !proj.archived && !isAdminProj) {
      const currentPlanSum = db.tasks.filter(t => t.projectId === proj.id && t.id !== vals.id).reduce((s, t) => s + (t.plannedHours || 0), 0);
      if (currentPlanSum + (parseFloat(vals.plannedHours) || 0) > proj.budget) {
        toast(`Превышение планируемых часов проекта! План: ${proj.budget} ч, текущая сумма: ${currentPlanSum} ч`, 'error');
        return;
      }
    }
    const vacWarn = vals.assigneeId && vals.deadline ? vacOverlap(vals.assigneeId, vals.start || vals.deadline, vals.deadline) : null;
    if (vacWarn) {
      const ok = await confirm(DIALOGS.vacationOverlap(fmtDMY(vacWarn.start), fmtDMY(vacWarn.end)));
      if (!ok) return;
    }

    if (subtasks.length > 0 || draftSubtasks.length > 0) {
      vals.isSummary = true;
    }

    const taskToSave = applyHourlyMode({
      ...vals,
      notes: existing?.notes,
      plannedHours: vals.plannedHours === '' ? null : parseFloat(vals.plannedHours),
      closedAt: vals.status === 'closed' && (!existing || existing.status !== 'closed') ? TODAY : existing?.closedAt || null,
      history: [
        ...(vals.history || []),
        ...(existing && existing.status !== vals.status ? [{ ts: Date.now(), who: ur.id, text: `Статус: ${TASK_STATUSES[existing.status].label} → ${TASK_STATUSES[vals.status].label}` }] : [])
      ],
      creatorId: existing?.creatorId || ur.id,
    });

    if (taskToSave.assigneeId && taskToSave.deadline && taskToSave.plannedHours > 0) {
      const overload = store.checkAssigneeOverload(
        taskToSave,
        taskToSave.start,
        taskToSave.deadline,
      );
      if (overload) {
        const ok = await confirm(DIALOGS.workloadOverload(
          empName(taskToSave.assigneeId),
          overload.planTotal,
          overload.capacity,
          overload.overload,
        ));
        if (!ok) return;
      }
    }

    onSave(taskToSave, isNew, { templateSubtasks: pendingTemplateSubtasks });
  }, [existing, isNew, db, vacOverlap, toast, onSave, ur, subtasks, draftSubtasks, pendingTemplateSubtasks, confirm, store, empName]);

  const deleteHandler = useCallback(async () => {
    const ok = await confirm(DIALOGS.deleteTask(existing.title));
    if (!ok) return;
    onDelete(existing.id);
  }, [existing, onDelete, confirm]);

  return { saveHandler, deleteHandler };
}
