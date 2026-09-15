// src/components/SearchBox.jsx
import { Ic, ICONS } from './Icons';

/**
 * Строка поиска: иконка + input + кнопка очистки.
 *
 * Единая точка правды для визуала поиска по спискам. Значение и логика
 * фильтрации живут у вызывающего компонента — SearchBox не знает ни о
 * сотрудниках, ни о проектах, ни о правах.
 *
 * Ширина и растяжение задаются контекстом через className (см. правила
 * .search-box и модификаторы в styles.css). Компонент не диктует layout.
 */
export const SearchBox = ({
  value,
  onChange,
  placeholder = 'Поиск…',
  className = '',
  autoFocus = false,
}) => {
  const classes = `search-box${className ? ' ' + className : ''}`;

  return (
    <div className={classes}>
      <Ic d={ICONS.search} size={15} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
      />
      {value && (
        <button
          type="button"
          className="icon-btn xs"
          onClick={() => onChange('')}
          title="Очистить"
        >
          <Ic d={ICONS.x} size={14} />
        </button>
      )}
    </div>
  );
};