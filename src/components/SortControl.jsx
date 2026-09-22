// src/components/SortControl.jsx
import { Select } from './Select';

/**
 * Иконка направления сортировки.
 *
 * Три горизонтальные линии разной длины - «лестница». asc: короткая
 * сверху, длинная снизу. desc: длинная сверху, короткая снизу.
 * Концы линий скруглены (strokeLinecap="round"), выровнены по левому
 * краю - так и «рост», и «падение» читаются мгновенно, без подписи.
 *
 * Свой SVG прямо здесь, а не в Ic/ICONS: это узкоспециальный значок,
 * нужен ровно в одном месте, и добавление его в общий набор иконок
 * засорило бы словарь без пользы.
 */
function SortDirIcon({ kind }) {
  const widths = kind === 'asc' ? [5, 9, 13] : [13, 9, 5];
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="1" y1="3"  x2={1 + widths[0]} y2="3"  />
        <line x1="1" y1="7"  x2={1 + widths[1]} y2="7"  />
        <line x1="1" y1="11" x2={1 + widths[2]} y2="11" />
      </g>
    </svg>
  );
}

/**
 * Контрол сортировки: селект поля и одна кнопка направления.
 *
 * Кнопка одна, но не toggle-стрелка - на ней значок «лестница»,
 * который сам показывает текущее направление:
 *   - asc  - короткая полоска сверху, длинная снизу (растёт вниз);
 *   - desc - длинная сверху, короткая снизу (убывает вниз).
 *
 * Направление не «угадать по стрелке», а сразу видно по форме значка:
 * пользователь не должен вспоминать, что «сейчас было». Клик по
 * кнопке меняет направление на противоположное; отдельной иконки
 * «активная/неактивная» нет - она и есть индикатор.
 *
 * compact - тот же размер селекта, что у фильтров в этой вьюхе.
 *
 * autoSort={false} у Select: список опций уже в осмысленном порядке,
 * и пересортировка по алфавиту его бы перемешала.
 */
export function SortControl({
  options,
  field,
  dir,
  onFieldChange,
  onToggleDir,
  compact = false,
  className = '',
}) {
  return (
    <div className={`sort-control${className ? ' ' + className : ''}`}>
      <Select
        className={compact ? 'sort-select sm' : 'sort-select'}
        value={field}
        onChange={onFieldChange}
        options={options}
        autoSort={false}
      />

      <button
        type="button"
        className="sort-dir-btn"
        onClick={onToggleDir}
        title={dir === 'asc' ? 'По возрастанию' : 'По убыванию'}
        aria-label="Переключить направление сортировки"
      >
        <SortDirIcon kind={dir} />
      </button>
    </div>
  );
}