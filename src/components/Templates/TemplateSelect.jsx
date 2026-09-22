import { useEffect, useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { useToast } from '../../context/ToastContext';
import { Select } from '../Select';

/**
 * Контролируемый селектор шаблонов.
 * При выборе передаёт родителю объект шаблона (или null, если выбран пустой пункт).
 * Держит выбранное значение, чтобы пользователь видел, какой шаблон применён.
 */
export function TemplateSelect({ kind, onApply, disabled = false }) {
  const { store } = useStore();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState(() => store.getTemplates(kind));
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const unsubscribe = store.subscribe(() => setTemplates(store.getTemplates(kind)));
    return unsubscribe;
  }, [store, kind]);

  if (templates.length === 0) return null;

  const handleChange = (id) => {
    setSelectedId(id);
    const template = id ? templates.find(t => t.id === id) : null;

    try {
      onApply(template);
      if (template) {
        showToast(`Шаблон «${template.name}» применён`, 'success');
      }
    } catch (error) {
      showToast(error.message || 'Не удалось применить шаблон', 'error');
    }
  };

  return (
    <div className="field-row">
      <label className="field-label">Шаблон</label>
      <div className="flex-1">
        <Select
          value={selectedId}
          onChange={handleChange}
          disabled={disabled}
          options={[
            { value: '', label: '- Применить шаблон -' },
            ...templates.map(t => ({
              value: t.id,
              label: t.name + (t.isShared ? ' · общий' : ''),
            })),
          ]}
        />
      </div>
    </div>
  );
}