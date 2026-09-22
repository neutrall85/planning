// src/hooks/useForm.js
import { useState, useMemo } from 'react';

/**
 * Записать значение по точечному пути, не мутируя исходный объект.
 *
 * Ключ 'delegation.enabled' кладёт value в prev.delegation.enabled,
 * создавая промежуточные объекты там, где их нет. Ключ без точки
 * работает как раньше: setByPath({ x: 1 }, 'x', 2) → { x: 2 }.
 *
 * Нужно, чтобы handleChange поддерживал вложенные поля формы. В
 * VacationModal состояние делегирования хранится как
 * values.delegation.{enabled,subId,statuses}, а в JSX естественнее
 * писать handleChange('delegation.enabled', checked), чем собирать
 * объект delegation вручную на каждом чекбоксе и селекте.
 */
const setByPath = (prev, path, value) => {
  const keys = String(path).split('.');
  const [head, ...rest] = keys;
  if (rest.length === 0) {
    return { ...prev, [head]: value };
  }
  const nested = prev && typeof prev[head] === 'object' && prev[head] !== null
    ? prev[head]
    : {};
  return { ...prev, [head]: setByPath(nested, rest.join('.'), value) };
};

/**
 * Прочитать значение по точечному пути.
 *
 * Отсутствующие промежуточные узлы дают undefined, но не бросают.
 * Нужно для isDirty: сравнение идёт по значению по пути, а не по
 * ключу-с-точками в имени.
 */
const getByPath = (obj, path) => {
  if (!obj) return undefined;
  let cur = obj;
  for (const key of String(path).split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[key];
  }
  return cur;
};

/**
 * Форма с валидацией и отслеживанием «есть ли несохранённые изменения».
 *
 * options.fields - обязательный список полей, участвующих в проверке
 * isDirty. Имена могут быть точечными ('delegation') - сравнение идёт
 * по значению по пути. Отсутствие списка - ошибка, а не «тихий откат»
 * к сравнению всех полей: без явного перечня в проверку попадут
 * служебные и побочные поля (файлы, логи, фотографии, actualHours),
 * которые сохраняются отдельными методами и не должны открывать
 * кнопку «Сохранить». Именно из-за такого сравнения всех полей раньше
 * появлялись пустые записи «Изменение задачи - Название» после
 * загрузки файла или внесения часа.
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
 *
 * touched - плоский набор флагов по путям: ключи это имена полей
 * ('title', 'delegation.subId'). Так UI, читающий ошибку поля через
 * touched['delegation.subId'], работает без переписывания.
 */
export const useForm = (initialValues, validate, options) => {
  if (!options || !Array.isArray(options.fields)) {
    throw new Error(
      'useForm: опция fields обязательна - явный массив полей формы, ' +
      'которые участвуют в проверке isDirty. Это защищает от «тихого» ' +
      'сравнения служебных и побочных полей (файлы, логи, фотографии, ' +
      'actualHours), которые сохраняются отдельно и не должны открывать ' +
      'кнопку «Сохранить».'
    );
  }
  const { fields } = options;

  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});

  const errors = useMemo(
    () => (validate ? validate(values) : {}),
    [values, validate],
  );

  const isValid = useMemo(
    () => Object.keys(errors).length === 0,
    [errors],
  );

  const isDirty = useMemo(() => {
    for (const key of fields) {
      if (JSON.stringify(getByPath(values, key)) !== JSON.stringify(getByPath(initialValues, key))) {
        return true;
      }
    }
    return false;
  }, [values, initialValues, fields]);

  const handleChange = (field, value) => {
    setValues((prev) => setByPath(prev, field, value));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const setFieldValue = (field, value) => {
    setValues((prev) => setByPath(prev, field, value));
  };

  const handleSubmit = (callback) => (e) => {
    e?.preventDefault();
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {},
    );
    setTouched(allTouched);
    if (isValid) callback(values);
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