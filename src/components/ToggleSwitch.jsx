// src/components/ToggleSwitch.jsx
/**
 * Тумблер «вкл / выкл» с подписью.
 *
 * Рендерится как <button role="switch">, а не как <input type="checkbox">
 * внутри <label>. Причины:
 *   - семантика switch читается скринридером как «переключатель», а не
 *     как «флажок» - для булевых фильтров это точнее;
 *   - один элемент = одна цель клика (метка и тумблер не разъезжаются,
 *     нажатие на любую часть срабатывает одинаково);
 *   - не нужен ни <input>, ни отдельная связка id/for.
 *
 * Компонент fully controlled: своё состояние не хранит, значение и
 * onChange приходят из filters через useFilters. Это позволяет
 * использовать его и в тулбаре (фильтр), и в любом другом месте, не
 * плодя второй вариант с внутренним state.
 *
 * Доступность: role="switch" + aria-checked дают скринридеру корректное
 * «включено / выключено»; :focus-visible в CSS рисует фокус-кольцо для
 * клавиатуры; текстовая метка рядом с тумблером - не только цветовой
 * индикатор, состояние читается и без зрения цвета.
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  className = '',
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle-switch${checked ? ' on' : ''}${className ? ' ' + className : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-switch-track" aria-hidden="true">
        <span className="toggle-switch-knob" />
      </span>
      <span className="toggle-switch-label">{label}</span>
    </button>
  );
}