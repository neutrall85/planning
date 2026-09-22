// src/utils/changeKinds.js
//
// Реестр видов изменения сущностей, доступных через «Запросы и заявки».
//
// Единственная точка правды для всего, что различается между видами
// (часы / срок / …): входное поле, валидация нового значения, применение
// к целевой сущности, текст истории и тексты уведомлений. Всё, что у
// видов общего (поток «исполнитель попросил → директор решил», аудит,
// применение значения к сущности, модалка отклонения), живёт в
// ChangeRequestService / ChangeRequestModal / Requests.jsx и
// параметризуется через этот реестр.
//
// Почему реестр в utils/, а не в сервисе. Правило «как применить
// изменение к сущности» — доменное. Сервис, модалка и вкладка Requests —
// потребители, не источники. Это позволяет добавлять новые виды
// (например, «изменение приоритета задачи») одной записью здесь, без
// правок в сервисе, модалке и секции Requests.

import { fmtDMY, TODAY } from './date';

const formatHoursValue = (v) => (v == null || v === '' ? '—' : `${v} ч`);
const formatDateValue = (v) => (v ? fmtDMY(v) : '—');

export const CHANGE_KINDS = Object.freeze({
  hours: Object.freeze({
    id: 'hours',
    label: 'Изменение часов',

    // Какие сущности можно менять этим видом изменения.
    targetTypes: Object.freeze(['task', 'project']),

    // Поле ввода и его параметры. ChangeRequestModal рендерит FormField
    // по этим значениям; новое поле — новая запись в реестре.
    inputType: 'number',
    inputProps: Object.freeze({ min: '0.5', step: '0.5' }),

    // Правило «текущее значение» для конкретной сущности.
    currentOf: (entity, targetType) => (
      targetType === 'task' ? (entity.plannedHours ?? null) : (entity.budget ?? null)
    ),

    // Валидация нового значения. Возвращает строку-ошибку или null.
    validateNew: (value, current) => {
      if (value === '' || value == null) return 'Укажите значение';
      const num = Number(value);
      if (isNaN(num) || num <= 0) return 'Укажите положительное значение';
      if (num === current) return 'Новое значение не должно совпадать с текущим';
      if (num > 9999) return 'Слишком большое значение (максимум 9999)';
      return null;
    },

    // Нормализация значения из формы в то, что пойдёт в newValue и в
    // применённую сущность.
    normalizeValue: (value) => Number(value),

    // Применить одобренное изменение к целевой сущности (иммутабельно).
    apply: (entity, value, targetType) => (
      targetType === 'task'
        ? { ...entity, plannedHours: value }
        : { ...entity, budget: value }
    ),

    // Текст в history целевой сущности.
    historyText: (oldValue, newValue) =>
      `Запрос часов одобрен: ${formatHoursValue(oldValue)} → ${formatHoursValue(newValue)}`,

    // Формат значения для UI (в таблице Requests, в аудите).
    formatValue: formatHoursValue,

    // Тексты аудита - разные id записей в журнале.
    auditApproved: 'Утверждение запроса часов',
    auditRejected: 'Отклонение запроса часов',

    // Текст уведомления. Обобщённый - используется и при создании, и при
    // решении; полная фраза собирается в NotificationService.
    notifyCreatedText: (targetType, targetTitle) =>
      `Запрос на изменение плановых часов по ${targetType === 'task' ? 'задаче' : 'проекту'} "${targetTitle}"`,
  }),

  deadline: Object.freeze({
    id: 'deadline',
    label: 'Изменение срока',

    // Срок есть только у задачи.
    targetTypes: Object.freeze(['task']),

    inputType: 'date',
    inputProps: Object.freeze({}),

    currentOf: (entity) => entity.deadline ?? null,

    validateNew: (value, current) => {
      if (!value) return 'Укажите новый срок';
      if (value === current) return 'Новый срок совпадает с текущим';
      if (value < TODAY) return 'Срок не может быть в прошлом';
      return null;
    },

    normalizeValue: (value) => String(value),

    apply: (entity, value) => ({ ...entity, deadline: value }),

    historyText: (oldValue, newValue) =>
      `Срок изменён по запросу: ${formatDateValue(oldValue)} → ${formatDateValue(newValue)}`,

    formatValue: formatDateValue,

    auditApproved: 'Утверждение запроса срока',
    auditRejected: 'Отклонение запроса срока',

    notifyCreatedText: (_targetType, targetTitle) =>
      `Запрос на изменение срока задачи "${targetTitle}"`,
  }),
});

// Список для UI (Requests.jsx, модалка).
export const CHANGE_KIND_LIST = Object.freeze(Object.values(CHANGE_KINDS));

// Список видов, применимых к конкретному типу сущности.
export const changeKindsForTargetType = (targetType) =>
  CHANGE_KIND_LIST.filter((k) => k.targetTypes.includes(targetType));

// Достать вид по id или упасть с внятным сообщением.
export function requireChangeKind(id) {
  const kind = CHANGE_KINDS[id];
  if (!kind) throw new Error(`Неизвестный вид изменения: ${id}`);
  return kind;
}