import { useState, useMemo } from 'react';

export const useForm = (initialValues, validate) => {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});

  // Ошибки вычисляются при каждом изменении значений
  const errors = useMemo(() => {
    if (!validate) return {};
    return validate(values);
  }, [values, validate]);

  // Валидность формы (нет ошибок)
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  // Были ли изменены данные (сравниваем с initialValues)
  const isDirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initialValues), [values, initialValues]);

  const handleChange = (field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (callback) => (e) => {
    e?.preventDefault();
    // Отмечаем все поля как touched для отображения ошибок
    const allTouched = Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);
    if (isValid) {
      callback(values);
    }
  };

  const setFieldValue = (field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setValues(initialValues);
    setTouched({});
  };

  return {
    values,
    setValues,
    handleChange,
    handleSubmit,
    errors,
    touched,
    setTouched,
    setFieldValue,
    resetForm,
    isValid,
    isDirty,
  };
};