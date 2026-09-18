// src/components/DateMaskInput.jsx
import { formatDateMask } from '../utils/dateMask';

/**
 * Текстовый ввод с маской ДД.ММ.ГГГГ. Контролируемый: значение держит
 * родитель, компонент только форматирует очередное нажатие.
 *
 * Маске передаётся текущее значение поля (`value`) как «предыдущее» -
 * по нему она отличает печать от стирания. Это нужно для корректного
 * разворота двузначного года: при стирании "01.01.2026" → "01.01.20"
 * год не должен снова превращаться в "2020".
 *
 * `inputMode` не задан: на мобильных нужна обычная клавиатура, чтобы
 * пользователь мог поставить разделитель. Маска нормализует ввод в любом
 * случае - от пользователя нужны только цифры.
 */
export default function DateMaskInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = 'inp',
}) {
  const handleChange = (e) => onChange(formatDateMask(e.target.value, value));

  return (
    <input
      type="text"
      className={className}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete="off"
      spellCheck={false}
    />
  );
}