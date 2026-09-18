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
  multiple = false,
  ...props
}) => {
  const id = `field-${useId()}`;

  const handleChange = (e) => onChange(e.target.value);

  const inputElement = (() => {
    if (type === 'select') {
      // Одиночный и множественный выбор идут через один компонент Select.
      // Раньше multiple был нативным <select multiple> - визуально чужой,
      // без поиска, без чипов. Теперь всё единообразно.
      return (
        <Select
          id={id}
          value={multiple ? (value ?? []) : (value ?? '')}
          onChange={onChange}
          options={options}
          disabled={disabled}
          multiple={multiple}
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