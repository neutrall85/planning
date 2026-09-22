// src/components/Modals/TaskModal/TaskFooterActions.jsx
import { Ic, ICONS } from '../../Icons';
import { TemplateActions } from '../../Templates/TemplateActions';
import { collectTaskPayloads } from '../../../utils/templateNesting';

/**
 * Левый блок футера карточки задачи: удаление, копирование, «В шаблон».
 *
 * Правая часть (spacer + «Отмена» + «Создать/Сохранить») живёт в
 * ModalShell - здесь её нет, чтобы не дублировать разметку, уже
 * описанную один раз.
 *
 * disabled - приходит из TaskModal и соответствует isSaving из
 * useTaskSave. Пока идёт сохранение или удаление, обе кнопки
 * (Удалить и Копировать) блокируются: пользователь не может запустить
 * вторую async-цепочку поверх первой. Раньше кнопка «Удалить» была
 * активна во время сохранения, и порядок двух операций с одной и той
 * же задачей не был определён.
 *
 * «В шаблон» через TemplateActions уже имеет собственный disabled
 * (кнопка неактивна, пока пустое название), поэтому здесь не трогаем -
 * TemplateActions модалку открывает локально и с текущим сохранением
 * не конфликтует.
 */
export function TaskFooterActions({
  readOnly,
  existing,
  canEditFields,
  isAuthor,
  canCreateFromTask,
  values,
  db,
  toast,
  onDelete,
  onCopy,
  disabled = false,
}) {
  return (
    <>
      {!readOnly && existing && (canEditFields || isAuthor) && (
        <button
          className="btn danger"
          onClick={onDelete}
          disabled={disabled}
        >
          <Ic d={ICONS.trash} size={14} /> Удалить
        </button>
      )}

      {existing && onCopy && canCreateFromTask && (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => onCopy(existing.id)}
          title="Создать новую задачу на основе этой"
          disabled={disabled}
        >
          <Ic d={ICONS.copy} size={13} /> Копировать
        </button>
      )}

      {canCreateFromTask && (
        <TemplateActions
          kind="task"
          source={values}
          nested={existing ? collectTaskPayloads(db.tasks, existing.id) : []}
          toast={toast}
          disabled={disabled || !values.title?.trim()}
        />
      )}
    </>
  );
}