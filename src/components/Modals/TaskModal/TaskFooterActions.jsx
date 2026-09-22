// src/components/Modals/TaskModal/TaskFooterActions.jsx
import { Ic, ICONS } from '../../Icons';
import { TemplateActions } from '../../Templates';
import { collectTaskPayloads } from '../../../utils/templateNesting';

/**
 * Левый блок футера карточки задачи: удаление, копирование, «В шаблон».
 *
 * Правая часть (spacer + «Отмена» + «Создать/Сохранить») живёт в
 * ModalShell - здесь её нет, чтобы не дублировать разметку, уже
 * описанную один раз.
 *
 * Условие внутри JSX (`cond && <button>`) даёт `false` в фрагменте -
 * React не рендерит пустые узлы, обёрток `{...} ? <></> : null`
 * не требуется.
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
}) {
  return (
    <>
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
    </>
  );
}