import { useCallback, useMemo, useState } from 'react';
import { ModalShell } from '../ModalShell';
import { FormField } from '../FormField';
import { DRAFT_STATUS } from '../../utils/constants';
import { countNestedTasks } from '../../utils/templateNesting';
import { useNestedModalEscape } from './useNestedModalEscape';
import TaskNodeFields from './TaskNodeFields';
import DraftListItem from './DraftListItem';

const createEmptyNode = (singular) => ({
  title: `Новая ${singular}`,
  priority: 'mid',
  plannedHours: 8,
});

/**
 * Модалка-редактор одного черновика дерева.
 *
 * Показывает только поля текущего узла и список прямых подзадач. Клик по
 * подзадаче открывает такую же модалку для неё - это устраняет визуальное
 * дублирование полей и кнопок, которое возникало при inline-рендере всего
 * поддерева. Один уровень = одна модалка.
 *
 * Всё редактирование полей живёт в TaskNodeFields. Сама модалка знает
 * только структуру node.subtasks и делегирует изменение узлов наверх через
 * onChange - как и раньше.
 */
export default function TaskDraftModal({
  node,
  readOnly = false,
  childSingular = 'подзадача',
  title,
  onChange,
  onDelete,
  onClose,
}) {
  useNestedModalEscape(onClose);
  const [editingChildIndex, setEditingChildIndex] = useState(null);

  const children = useMemo(
    () => (Array.isArray(node.subtasks) ? node.subtasks : []),
    [node.subtasks]
  );

  const setChildren = useCallback((next) => {
    const copy = { ...node };
    if (next.length) copy.subtasks = next;
    else delete copy.subtasks;
    onChange(copy);
  }, [node, onChange]);

  const updateChild = useCallback((idx, child) => {
    setChildren(children.map((c, i) => (i === idx ? child : c)));
  }, [children, setChildren]);

  const deleteChild = useCallback((idx) => {
    setChildren(children.filter((_, i) => i !== idx));
    setEditingChildIndex(null);
  }, [children, setChildren]);

  const addChild = useCallback(() => {
    setChildren([...children, createEmptyNode(childSingular)]);
  }, [children, setChildren, childSingular]);

  const childCount = countNestedTasks(children);

  const footer = (
    <div className="modal-foot">
      {!readOnly && onDelete && (
        <button type="button" className="btn danger" onClick={onDelete}>
          Удалить черновик
        </button>
      )}
      <div className="spacer" />
      <button type="button" className="btn ghost" onClick={onClose}>
        Назад
      </button>
    </div>
  );

  return (
    <>
      <ModalShell
        title={title || `Черновик: ${node?.title || '-'}`}
        onClose={onClose}
        width={620}
        showSave={false}
        footer={footer}
      >
        <div className="project-info-fields">
          <FormField
            label="Статус"
            value={DRAFT_STATUS.label}
            disabled
            inline
          />
          <TaskNodeFields node={node} readOnly={readOnly} onChange={onChange} />
        </div>

        <div className="template-tree-header mt-3">
          <div className="template-tree-title">{childSingular} ({childCount})</div>
          {!readOnly && (
            <button type="button" className="btn ghost sm" onClick={addChild}>
              + {childSingular}
            </button>
          )}
        </div>

        {children.length === 0 ? (
          <div className="mut sm">Вложенных элементов нет</div>
        ) : (
          <div className="template-draft-list">
            {children.map((child, idx) => (
              <DraftListItem
                key={idx}
                node={child}
                onClick={() => setEditingChildIndex(idx)}
              />
            ))}
          </div>
        )}
      </ModalShell>

      {editingChildIndex !== null && children[editingChildIndex] && (
        <TaskDraftModal
          node={children[editingChildIndex]}
          readOnly={readOnly}
          childSingular={childSingular}
          onChange={(next) => updateChild(editingChildIndex, next)}
          onDelete={readOnly ? null : () => deleteChild(editingChildIndex)}
          onClose={() => setEditingChildIndex(null)}
        />
      )}
    </>
  );
}