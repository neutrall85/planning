// src/components/EmployeeFormFields.jsx
import { FormField } from './FormField';

export const EmployeeFormFields = ({
  values,
  onChange,
  errors,
  touched,
  showPassword = false,      // для Edit: поле нового пароля
  passwordRequired = false,  // для Create: поле пароля обязательно
  disabled = false,
}) => {
  return (
    <div className="project-info-fields">
      <FormField
        label="Фамилия *"
        value={values.last}
        onChange={(v) => onChange('last', v)}
        error={touched.last && errors.last}
        disabled={disabled}
      />
      <FormField
        label="Имя *"
        value={values.first}
        onChange={(v) => onChange('first', v)}
        error={touched.first && errors.first}
        disabled={disabled}
      />
      <FormField
        label="E-mail *"
        value={values.email}
        onChange={(v) => onChange('email', v)}
        error={touched.email && errors.email}
        disabled={disabled}
      />

      {passwordRequired && (
        <FormField
          label="Пароль *"
          type="password"
          value={values.pass}
          onChange={(v) => onChange('pass', v)}
          error={touched.pass && errors.pass}
          disabled={disabled}
        />
      )}

      {showPassword && (
        <FormField
          label="Новый пароль"
          type="password"
          value={values.newPass || ''}
          onChange={(v) => onChange('newPass', v)}
          error={touched.newPass && errors.newPass}
          disabled={disabled}
        />
      )}

      <FormField
        label="Должность (основная)"
        value={values.position}
        onChange={(v) => onChange('position', v)}
        disabled={disabled}
      />
      <FormField
        label="Телефон"
        value={values.phone}
        onChange={(v) => onChange('phone', v)}
        disabled={disabled}
      />
      <FormField
        label="Внутренний номер"
        value={values.extension}
        onChange={(v) => onChange('extension', v)}
        disabled={disabled}
      />
      <FormField
        label="Табельный №"
        value={values.tab}
        onChange={(v) => onChange('tab', v)}
        disabled={disabled}
      />
    </div>
  );
};