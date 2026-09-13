// src/components/FormField.jsx
import { useId } from 'react';

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
  
  // Функция-обёртка для извлечения значения из события
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const inputElement = (() => {
    if (type === 'select') {
      return (
        <select 
          className="inp sel" 
          id={id} 
          value={value ?? ''}   // гарантируем строку
          onChange={handleChange} 
          disabled={disabled}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    } else if (type === 'textarea') {
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
    } else if (type === 'date' || type === 'number') {
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
    } else {
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
    }
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