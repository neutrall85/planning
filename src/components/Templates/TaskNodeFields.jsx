import { FormField } from '../FormField';
import { TEMPLATE_FIELDS_META } from '../../utils/templateSchemas';

const TASK_META = TEMPLATE_FIELDS_META.task;

/**
 * Поля одного узла дерева. Единственное место, где описаны поля задачи
 * в шаблоне: используется и TaskNodeEditor, и TaskDraftModal.
 * Никаких «+ подзадача» и «Удалить» - это ответственность контейнера.
 */
export default function TaskNodeFields({ node, readOnly = false, onChange }) {
  const updateField = (field, value) => onChange({ ...node, [field]: value });

  return (
    <>
      <FormField
        label="Название"
        required
        value={node.title ?? ''}
        onChange={(v) => updateField('title', v)}
        disabled={readOnly}
        inline
      />
      <FormField
        label="Описание"
        type="textarea"
        rows={2}
        value={node.desc ?? ''}
        onChange={(v) => updateField('desc', v)}
        disabled={readOnly}
        inline
      />
      <div className="fields-row">
        <FormField
          label="Приоритет"
          type="select"
          options={TASK_META.priority.options}
          value={node.priority ?? 'mid'}
          onChange={(v) => updateField('priority', v)}
          disabled={readOnly}
          inline
        />
        <FormField
          label="Плановые часы"
          type="number"
          min="0"
          step="0.5"
          value={node.plannedHours ?? ''}
          onChange={(v) => updateField('plannedHours', v)}
          disabled={readOnly}
          inline
        />
      </div>
    </>
  );
}