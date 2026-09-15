// src/components/FormField.jsx
import { useId } from 'react';
import { Select } from './Select';

export const FormField = ({
  label,
  type = 'text',
  value,
  onChange,
  disabled,
  options,
  required,
  inline = false,
  error,
  ...props
}) => {
  const id = `field-${useId()}`;

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  // Для <select multiple> e.target.value отдаёт только первую выбранную
  // опцию, а не массив - нужно явно собрать значения из selectedOptions.
  const handleMultiSelectChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
    onChange(selected);
  };

  const inputElement = (() => {
    if (type === 'select') {
      // Мультивыбор - нативный (кастомный не поддерживает multiple)
      if (props.multiple) {
        return (
          <select
            className="inp sel"
            id={id}
            value={value ?? []}
            onChange={handleMultiSelectChange}
            disabled={disabled}
            multiple
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      }
      return (
        <Select
          value={value ?? ''}
          onChange={onChange}
          options={options}
          disabled={disabled}
        />
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          className="inp"
          id={id}
          rows={props.rows || 2}
          value={value ?? ''}
          onChange={handleChange}
          disabled={disabled}
        />
      );
    }

    return (
      <input
        className="inp"
        type={type}
        id={id}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        {...props}
      />
    );
  })();

  if (inline) {
    return (
      <div className="field-row">
        <label className="field-label" htmlFor={id}>
          {label}
          {required && <span className="required-star">*</span>}
        </label>
        <div className="flex-1">
          {inputElement}
          {error && <div className="text-red text-sm mt-1">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <>
      <label className="lbl" htmlFor={id}>
        {label}
        {required && <span className="required-star">*</span>}
      </label>
      {inputElement}
      {error && <div className="text-red text-sm">{error}</div>}
    </>
  );
};