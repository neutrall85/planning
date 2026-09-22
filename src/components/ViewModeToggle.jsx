// src/components/ViewModeToggle.jsx
import { Ic, ICONS } from './Icons';

/**
 * Переключатель «Список / Канбан».
 *
 * Один и тот же контрол в разделах задач и проектов: те же два режима,
 * та же группа кнопок, тот же способ подсветки активного. Вынесен
 * отдельным компонентом, потому что разметка совпадает символ в
 * символ, а состояние (`viewMode`) остаётся у вьюхи - компонент
 * полностью управляемый и о режимах ничего не знает, кроме их имён.
 *
 * Имена режимов заданы здесь: вызывающий не обязан помнить точное
 * 'kanban' / 'list', он говорит `value` и получает `onChange` с тем же
 * строковым ключом. Если когда-нибудь появится третий режим, расширять
 * придётся один файл.
 */
const MODES = [
  { id: 'list', label: 'Список', icon: ICONS.list },
  { id: 'kanban', label: 'Канбан', icon: ICONS.kanban },
];

export function ViewModeToggle({ value, onChange }) {
  return (
    <div className="btn-group">
      {MODES.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className={`btn ghost sm ${value === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Ic d={icon} size={15} /> {label}
        </button>
      ))}
    </div>
  );
}