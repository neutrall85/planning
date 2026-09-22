// src/hooks/useTaskSave.js
import { useCallback, useRef, useState } from 'react';
import { TASK_STATUSES, DIALOGS } from '../utils/constants';
import { TODAY, fmtDMY } from '../utils/date';
import { applyHourlyMode } from '../utils/hourlyTask';

/**
 * Сохранение и удаление задачи.
 *
 * Возвращает isSaving — флаг «идёт сохранение/удаление»: снаружи он
 * идёт в saveDisabled кнопки Save и в disabled кнопки Delete. Это
 * закрывает окно гонки, в которое saveHandler был вызван повторно.
 *
 * Зачем savingRef в дополнение к isSaving:
 *
 *   - isSaving обновляется асинхронно (после ре-рендера). Между стартом
 *     saveHandler и коммитом setSaving(true) проходит минимум один такт.
 *     Если в этот такт приходит второе нажатие Enter/клик, guard
 *     `if (savingRef.current) return` его отсекает синхронно, ещё до
 *     того, как UI отрисует disabled-кнопку.
 *
 *   - savingRef — синхронная защёлка, видна внутри замыкания saveHandler
 *     без ре-рендера.
 *
 * isSaving остаётся: он нужен для UI. Ref + state вместе дают
 * «синхронный guard + визуальный фидбэк».
 */
export function useTaskSave({
  existing, isNew, db, vacOverlap, toast, onSave, onDelete, ur,
  subtasks, draftSubtasks, pendingTemplateSubtasks, confirm, store, empName,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const saveHandler = useCallback(async (vals) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const proj = db.projects.find(p => p.id === vals.projectId);
      const isAdminProj = proj && proj.ptype === 'admin';

      if (proj && proj.budget != null && !proj.archived && !isAdminProj) {
        const currentPlanSum = db.tasks
          .filter(t => t.projectId === proj.id && t.id !== vals.id)
          .reduce((s, t) => s + (t.plannedHours || 0), 0);
        if (currentPlanSum + (parseFloat(vals.plannedHours) || 0) > proj.budget) {
          toast(
            `Превышение планируемых часов проекта! План: ${proj.budget} ч, текущая сумма: ${currentPlanSum} ч`,
            'error',
          );
          return;
        }
      }

      const vacWarn = vals.assigneeId && vals.deadline
        ? vacOverlap(vals.assigneeId, vals.start || vals.deadline, vals.deadline)
        : null;
      if (vacWarn) {
        const ok = await confirm(DIALOGS.vacationOverlap(
          fmtDMY(vacWarn.start),
          fmtDMY(vacWarn.end),
        ));
        if (!ok) return;
      }

      if (subtasks.length > 0 || draftSubtasks.length > 0) {
        vals.isSummary = true;
      }

      const taskToSave = applyHourlyMode({
        ...vals,
        notes: existing?.notes,
        plannedHours: vals.plannedHours === '' ? null : parseFloat(vals.plannedHours),
        closedAt: vals.status === 'closed' && (!existing || existing.status !== 'closed')
          ? TODAY
          : existing?.closedAt || null,
        history: [
          ...(vals.history || []),
          ...(existing && existing.status !== vals.status
            ? [{
                ts: Date.now(),
                who: ur.id,
                text: `Статус: ${TASK_STATUSES[existing.status].label} → ${TASK_STATUSES[vals.status].label}`,
              }]
            : []),
        ],
        creatorId: existing?.creatorId || ur.id,
      });

      if (taskToSave.assigneeId && taskToSave.deadline && taskToSave.plannedHours > 0) {
        const overload = store.checkAssigneeOverload(
          taskToSave, taskToSave.start, taskToSave.deadline,
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
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    existing, isNew, db, vacOverlap, toast, onSave, ur,
    subtasks, draftSubtasks, pendingTemplateSubtasks,
    confirm, store, empName,
  ]);

  const deleteHandler = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const ok = await confirm(DIALOGS.deleteTask(existing.title));
      if (!ok) return;
      onDelete(existing.id);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [existing, onDelete, confirm]);

  return { saveHandler, deleteHandler, isSaving };
}