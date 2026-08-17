import { useId } from 'react';

export const FormField = ({ label, type = 'text', value, onChange, disabled, options, ...props }) => {
  const id = `field-${useId()}`;
  return (
    <>
      <label className="lbl" htmlFor={id}>{label}</label>
      {type === 'select' ? (
        <select className="inp sel" id={id} value={value} onChange={onChange} disabled={disabled}>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea className="inp" id={id} rows={props.rows || 2} value={value} onChange={onChange} disabled={disabled} />
      ) : type === 'date' ? (
        <input className="inp" type="date" id={id} value={value} onChange={onChange} disabled={disabled} />
      ) : (
        <input className="inp" type={type} id={id} value={value} onChange={onChange} disabled={disabled} />
      )}
    </>
  );
};