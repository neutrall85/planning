import { DRAFT_STATUS } from '../../utils/constants';
import { countNestedTasks } from '../../utils/templateNesting';

/**
 * Строка списка черновиков. Одна нода = одна кнопка — значит, доступна
 * с клавиатуры и озвучивается скринридером без дополнительных
 * обработчиков. Вся информация о ноде уже в payload, компонент её только
 * отображает.
 */
export default function DraftListItem({ node, onClick }) {
  const childCount = Array.isArray(node.subtasks)
    ? countNestedTasks(node.subtasks)
    : 0;

  return (
    <button type="button" className="template-draft-item" onClick={onClick}>
      <span className="template-draft-title">{node.title || 'Без названия'}</span>
      <span className="template-draft-meta">
        {childCount > 0 && (
          <span className="template-draft-children">+{childCount}</span>
        )}
        <span className="template-draft-status">{DRAFT_STATUS.label}</span>
      </span>
    </button>
  );
}