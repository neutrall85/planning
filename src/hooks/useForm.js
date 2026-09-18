import { useState, useMemo } from 'react';

/**
 * Форма с валидацией и отслеживанием «есть ли несохранённые изменения».
 *
 * options.fields - обязательный список полей, участвующих в проверке
 * isDirty. Отсутствие списка - ошибка, а не «тихий откат» к сравнению
 * всех полей: без явного перечня в проверку попадут служебные и побочные
 * поля (файлы, логи, фотографии, actualHours), которые сохраняются
 * отдельными методами и не должны открывать кнопку «Сохранить».
 * Именно из-за такого сравнения всех полей раньше появлялись пустые
 * записи «Изменение задачи - Название» после загрузки файла или внесения
 * часа.
 *
 * Список, а не «excludeFromDirty»: при добавлении нового поля формы
 * безопаснее явно указать его в перечне, чем надеяться, что кто-то
 * вспомнит про исключение. Забыть добавить поле в fields - значит,
 * форма не подсветит Save после его правки (баг заметен сразу).
 * Забыть исключить служебное поле - значит, форма начнёт ложно
 * активировать Save (баг заметен не сразу). Явный список защищает от
 * второго сценария.
 *
 * Сравнение покомпонентное, а не JSON.stringify целого объекта:
 * initialValues пересобирается на каждом рендере из стора, порядок
 * ключей может отличаться.
 */
export const useForm = (initialValues, validate, options) => {
  if (!options || !Array.isArray(options.fields)) {
    throw new Error(
      'useForm: опция fields обязательна - явный массив полей формы, ' +
      'которые участвуют в проверке isDirty. ' +
      'Это защищает от «тихого» сравнения служебных и побочных полей ' +
      '(файлы, логи, фотографии, actualHours), которые сохраняются ' +
      'отдельно и не должны открывать кнопку «Сохранить».'
    );
  }

  const { fields } = options;
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});

  const errors = useMemo(() => {
    if (!validate) return {};
    return validate(values);
  }, [values, validate]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const isDirty = useMemo(() => {
    for (const key of fields) {
      if (JSON.stringify(values[key]) !== JSON.stringify(initialValues[key])) return true;
    }
    return false;
  }, [values, initialValues, fields]);

  const handleChange = (field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (callback) => (e) => {
    e?.preventDefault();
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