// src/components/Modals/TaskModal/TaskModalFooter.jsx
import { Ic, ICONS } from '../../Icons';
import { TemplateActions } from '../../Templates';
import { collectTaskPayloads } from '../../../utils/templateNesting';

/** Нижняя панель карточки задачи: удаление, копирование, шаблон, отмена, сохранение. */
export function TaskModalFooter({
  readOnly, existing, canEditFields, isAuthor, onDelete,
  onCopy, canCreateFromTask, values, db, toast, onClose, onSubmit, saveDisabled,
}) {
  return (
    <div className="modal-foot">
      {!readOnly && existing && (canEditFields || isAuthor) && (
        <button className="btn danger" onClick={onDelete}>
          <Ic d={ICONS.trash} size={14} /> Удалить
        </button>
      )}

      {existing && onCopy && canCreateFromTask && (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => onCopy(existing.id)}
          title="Создать новую задачу на основе этой"
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
          disabled={!values.title?.trim()}
        />
      )}

      <div className="spacer" />
      <button className="btn ghost" onClick={onClose}>Отмена</button>
      <button className="btn primary" onClick={onSubmit} disabled={saveDisabled}>
        {existing ? 'Сохранить' : 'Создать задачу'}
      </button>
    </div>
  );
}
