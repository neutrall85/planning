// src/hooks/useTaskFormState.js
import { useCallback, useEffect } from 'react';
import { useForm } from './useForm';
import { TODAY, iso, addDays, uid } from '../utils/date';
import { applyHourlyMode, hoursBetween } from '../utils/hourlyTask';
import { dependencyRule } from '../utils/taskDependency';

/**
 * Убирает поле notes из задачи перед подачей в useForm.
 * По образцу stripAccess в ProjectModal: поле, которое редактируется
 * отдельным путём (не через форму задачи), не должно попадать в
 * initialValues. Иначе isDirty будет срабатывать на изменения заметки,
 * а Save формы - перезатирать свежие notes старыми.
 */
const stripNotes = (task) => {
  if (!task) return task;
  const { notes, ...rest } = task;
  return rest;
};

/**
 * Список полей формы задачи, участвующих в проверке isDirty.
 * Определён на уровне модуля - стабильная ссылка, useMemo не пересоздаётся.
 *
 * Поля, сохраняемые отдельными методами (файлы, папки, логи, заметки,
 * фактическое время), в список не входят: они не открывают кнопку
 * «Сохранить» и не попадают в её isDirty-проверку. Плюс сюда не входят
 * служебные поля, которые заполняет сервис (id, createdAt, creatorId,
 * history, actualHours, parentTaskId в части случаев).
 */
const FORM_FIELDS = Object.freeze([
  'title', 'desc', 'projectId', 'assigneeId', 'priority', 'plannedHours',
  'start', 'deadline', 'status', 'isHourly', 'startTime', 'endTime',
  'isSummary', 'dependencyId', 'dependencyType',
]);

function buildInitialValues({ existing, isCopy, copySource, isNew, effectiveProjectId, parentTaskId, ur }) {
  if (existing) {
    return applyHourlyMode({
      ...stripNotes(existing),
      isHourly:  existing.isHourly  ?? false,
      startTime: existing.startTime || '09:00',
      endTime:   existing.endTime   || '18:00',
    });
  }
  if (isCopy) {
    return applyHourlyMode({
      ...stripNotes(copySource),
      id: 't_' + uid(),
      assigneeId: null,
      status: 'new',
      parentTaskId: null,
      isSummary: false,
      isHourly: copySource.isHourly ?? false,
      startTime: copySource.startTime || '09:00',
      endTime: copySource.endTime || '18:00',
      logs: [],
      history: [
        { ts: Date.now(), who: ur.id, text: `Скопирована из «${copySource.title}»` },
      ],
      delegatedFrom: null,
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: ur.id,
      // Копия не наследует зависимость: сроки копии берутся из
      // источника, а не подтягиваются к чужому предшественнику.
      dependencyId: null,
      files: [],
      folders: [],
    });
  }
  return applyHourlyMode({
    id: 't_' + uid(),
    title: '',
    desc: '',
    projectId: effectiveProjectId,
    assigneeId: null,
    priority: 'mid',
    plannedHours: 8,
    start: TODAY,
    deadline: iso(addDays(new Date(), 14)),
    status: 'new',
    isHourly:  false,
    startTime: '09:00',
    endTime:   '18:00',
    logs: [],
    history: [],
    delegatedFrom: null,
    archived: false,
    archivedAt: null,
    closedAt: null,
    creatorId: ur.id,
    dependencyId: null,
    dependencyType: 'FS',
    files: [],
    folders: [],
    isSummary: false,
    parentTaskId: parentTaskId || null,
  });
}

/**
 * Состояние формы карточки задачи: initialValues, валидация полей и
 * подключение useForm.
 *
 * Единственная точка правды для «правильных» значений формы. saveHandler
 * (см. useTaskSave) полагается на то, что useForm вызывает callback
 * сохранения только при isValid === true (см. useForm.handleSubmit) -
 * поэтому здесь, а не в saveHandler, живёт вся проверка обязательных
 * полей. Дублировать её в обработчике сохранения не нужно: это была бы
 * одна и та же проверка в двух местах, которые легко рассинхронизировать.
 *
 * Зависимость задачи: зафиксированное поле (start для FS/SS,
 * deadline для FF/SF) подставляется из предшественника и возвращается
 * наружу как lockedField - форма блокирует его для правки.
 */
export function useTaskFormState({
  existing, isCopy, copySource, isNew, isProjectLocked, effectiveProjectId,
  parentTaskId, db, ur,
}) {
  const initialValues = buildInitialValues({
    existing, isCopy, copySource, isNew, effectiveProjectId, parentTaskId, ur,
  });

  const validate = useCallback((values) => {
    const errors = {};
    if (!values.title?.trim()) errors.title = 'Название обязательно';
    if (isProjectLocked) {
      if (!values.projectId) errors.projectId = 'Проект не определён';
    } else {
      if (!values.projectId || values.projectId === '') errors.projectId = 'Выберите проект';
    }
    if (!values.assigneeId || values.assigneeId === '') errors.assigneeId = 'Выберите исполнителя';
    if (!values.start) errors.start = 'Дата начала обязательна';
    const project = db.projects.find(p => p.id === values.projectId);
    const isAdminProj = project && project.ptype === 'admin';
    if (!isAdminProj) {
      const planned = parseFloat(values.plannedHours);
      if (isNaN(planned) || planned <= 0) errors.plannedHours = 'Плановые часы обязательны (число > 0)';
      if (!values.deadline) errors.deadline = 'Срок исполнения обязателен';
    }
    if (values.isHourly) {
      if (!values.startTime) errors.startTime = 'Укажите время начала';
      if (!values.endTime)   errors.endTime   = 'Укажите время окончания';
      if (values.startTime && values.endTime
          && hoursBetween(values.startTime, values.endTime) === null) {
        errors.endTime = 'Время окончания должно быть позже времени начала';
      }
    }
    if (!values.priority) errors.priority = 'Приоритет обязателен';
    if (!values.status) errors.status = 'Статус обязателен';
    return errors;
  }, [db, isProjectLocked]);

  const {
    values, handleChange, handleSubmit, errors, touched,
    setValues, setTouched, setFieldValue, isValid, isDirty,
  } = useForm(initialValues, validate, { fields: FORM_FIELDS });

  const updateValues = useCallback((patch) => {
    setValues(prev => applyHourlyMode({ ...prev, ...patch }));
    setTouched(prev => {
      const next = { ...prev };
      Object.keys(patch).forEach(key => { next[key] = true; });
      return next;
    });
  }, [setValues, setTouched]);

  // Новая задача, создаваемая из карточки родителя: как только у
  // родителя определился проект, подставляем его в форму, если поле
  // ещё не заполнено вручную.
  useEffect(() => {
    if (isNew && parentTaskId && !values.projectId) {
      const parent = db.tasks.find(t => t.id === parentTaskId);
      if (parent && parent.projectId) {
        setFieldValue('projectId', parent.projectId);
      }
    }
  }, [parentTaskId, db.tasks, isNew, values.projectId, setFieldValue]);

  /**
   * Правило зависимости для текущего выбора. lockedFieldName - какое
   * поле задачи зафиксировано (start / deadline / null);
   * lockedValue - вычисленное значение из предшественника.
   *
   * Если предшественник не найден (задача удалена, выбор сброшен) -
   * правило не применяется, поле остаётся редактируемым.
   */
  const predRule = values.dependencyId
    ? dependencyRule(values.dependencyType)
    : null;
  const predecessor = values.dependencyId
    ? db.tasks.find(t => t.id === values.dependencyId)
    : null;
  const lockedFieldName = predRule?.locked ?? null;
  const lockedValue = (predecessor && predRule)
    ? predecessor[predRule.source] ?? null
    : null;
  const currentLockedValue = lockedFieldName ? values[lockedFieldName] : null;

  /**
   * Синхронизация формы с предшественником.
   *
   * Срабатывает, когда пользователь выбрал зависимость, сменил её тип
   * или (теоретически) предшественник изменился, пока форма открыта.
   * Для часовой задачи держим инвариант start === deadline: оба поля
   * сходятся на вычисленное значение.
   */
  useEffect(() => {
    if (!lockedFieldName || lockedValue == null) return;
    if (currentLockedValue === lockedValue) return;
    setValues(prev => prev.isHourly
      ? { ...prev, start: lockedValue, deadline: lockedValue }
      : { ...prev, [lockedFieldName]: lockedValue });
  }, [lockedFieldName, lockedValue, currentLockedValue, setValues]);

  return {
    values, handleChange, updateValues, handleSubmit, errors, touched,
    setValues, setTouched, setFieldValue, isValid, isDirty,
    // Имя поля, реально заблокированного (только если есть чему его
    // научить); null - все поля дат редактируемы.
    lockedField: lockedValue != null ? lockedFieldName : null,
  };
}