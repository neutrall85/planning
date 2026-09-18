// src/utils/auditHelpers.js
/**
 * Хелперы для сборки подробных записей журнала аудита.
 *
 * Каждый сервис собирает свой дифф (_describeChanges) - там разные поля
 * у разных сущностей, и это правильно: правило «что отслеживаем»
 * принадлежит домену. А вот типовые операции одинаковы у всех, и здесь
 * собраны не только преобразования значений, но и повторяющиеся паттерны
 * сборки:
 *
 *   auditDelta      - 'a → b' с нормализацией пустых и опциональным форматтером;
 *   auditToggle     - флаг со словами «включена/выключена» (или своими);
 *   auditSet        - сравнение массивов как множеств;
 *   auditListDelta  - добавленные/удалённые элементы списка по имени;
 *   auditHoursDelta - внесённые/удалённые часы и остаток доступного бюджета;
 *   auditMark       - метка «изменено» без раскрытия значений.
 *
 * Благодаря этому _describeChanges каждого сервиса - декларативный
 * список полей, а не «одна ветка на поле».
 *
 * Модуль не знает ни одной конкретной сущности и ни одного конкретного
 * поля - только операции над значениями.
 */

/** Пустое значение → «-», остальное как есть. */
export const auditValue = (v) =>
  (v === null || v === undefined || v === '') ? '-' : v;

/** Код в подпись по карте вида { код: { label } | 'строка' }. */
export const auditLabel = (map, key) =>
  map?.[key]?.label || map?.[key] || key || '-';

/** id сотрудника → «Фамилия Имя». */
export const auditName = (employeeRepo, id) => {
  if (!id) return '-';
  const e = employeeRepo.findById(id);
  return e ? `${e.last} ${e.first}` : id;
};

/** Обернуть дифф в details для addAudit. */
export const auditDetails = (entityLabel, entityName, changes) =>
  Object.keys(changes).length
    ? { [entityLabel]: entityName, ...changes }
    : entityName;

/**
 * Нормализация пустого значения к null. undefined, null и '' - одно и
 * то же «пусто». 0 и false остаются значимыми: у нас есть отдельный
 * isSameFlag для флагов, а нулевые числа - реальные значения бюджета
 * и часов.
 */
const normalizeEmpty = (v) =>
  (v === null || v === undefined || v === '') ? null : v;

/** «По смыслу одинаковы»: undefined, null и '' эквивалентны. */
export const isSameValue = (a, b) =>
  normalizeEmpty(a) === normalizeEmpty(b);

/** «Флаги совпадают»: undefined, null, '' и false - все «выключено». */
export const isSameFlag = (a, b) => !!a === !!b;

/**
 * Изменение значения как 'было → стало'. Форматтер по умолчанию -
 * auditValue (пустое → «-»). Если передан свой (карта подписей статуса,
 * ФИО через репозиторий), он применяется к обоим концам.
 *
 * Если значения по смыслу равны, в changes ничего не пишется.
 */
export const auditDelta = (changes, label, prev, next, format = auditValue) => {
  if (isSameValue(prev, next)) return;
  changes[label] = `${format(prev)} → ${format(next)}`;
};

/**
 * Изменение флага. onText/offText выбираются по новому значению.
 * Сравнение через isSameFlag: undefined и false не считаются изменением.
 */
export const auditToggle = (changes, label, prev, next, onText, offText) => {
  if (isSameFlag(prev, next)) return;
  changes[label] = next ? onText : offText;
};

/**
 * Массивы как множества: важны состав и элементы, не порядок.
 * keyOf по умолчанию - тождественная функция (массивы примитивов);
 * для массивов объектов передаётся `(x) => x.id` или подобное.
 */
export const auditSet = (changes, label, prev, next, keyOf = (x) => x) => {
  const a = (prev || []).map(keyOf).sort().join(',');
  const b = (next || []).map(keyOf).sort().join(',');
  if (a !== b) changes[label] = 'изменены';
};

/**
 * Дельта списка с именами элементов: показывает, что именно добавилось
 * или удалилось.
 *
 * Формат: «добавлены: смета.pdf; удалены: старый.pdf». Если в одной
 * операции больше двух элементов - показываем первые два и счётчик:
 * «добавлены: чертёж.pdf, схема.pdf и ещё 3». Журнал не должен
 * разрастаться в многострочную простыню из имён.
 *
 * keyOf - функция, возвращающая уникальный ключ (обычно `x => x.id`).
 * nameOf - функция, возвращающая человекочитаемое имя (обычно `x => x.name`).
 */
export const auditListDelta = (changes, label, prev, next, keyOf, nameOf) => {
  const prevList = prev || [];
  const nextList = next || [];
  const prevKeys = new Set(prevList.map(keyOf));
  const nextKeys = new Set(nextList.map(keyOf));

  const added = nextList.filter(x => !prevKeys.has(keyOf(x)));
  const removed = prevList.filter(x => !nextKeys.has(keyOf(x)));

  if (added.length === 0 && removed.length === 0) return;

  const describe = (items) => {
    const names = items.map(nameOf);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} и ещё ${names.length - 2}`;
  };

  const parts = [];
  if (added.length) parts.push(`добавлены: ${describe(added)}`);
  if (removed.length) parts.push(`удалены: ${describe(removed)}`);
  changes[label] = parts.join('; ');
};

/**
 * Дельта списка записей часов: сколько часов внесено или удалено и
 * сколько осталось до плана.
 *
 * Формат: «внесено 4 ч, остаток 20 ч» или «удалено 4 ч, остаток 24 ч».
 * Если в одной операции и внесли, и удалили: «внесено 2 ч, удалено 3 ч,
 * остаток 18 ч». Остаток считается как plannedHours минус сумма всех
 * часов в итоговом списке; для задач без плана (например, в
 * административных проектах) суффикс с остатком опускается.
 *
 * Единая точка правила «что показывать про логи»: конкретные сервисы
 * не дублируют ни сумму, ни вычитание плана.
 *
 * @param {Array}  prevLogs     - список логов до изменения
 * @param {Array}  nextLogs     - список логов после изменения
 * @param {number} plannedHours - плановые часы задачи (может быть null)
 */
export const auditHoursDelta = (changes, label, prevLogs, nextLogs, plannedHours) => {
  const prev = prevLogs || [];
  const next = nextLogs || [];

  const prevIds = new Set(prev.map(l => l.id));
  const nextIds = new Set(next.map(l => l.id));

  const added = next.filter(l => !prevIds.has(l.id));
  const removed = prev.filter(l => !nextIds.has(l.id));

  if (added.length === 0 && removed.length === 0) return;

  const sum = (arr) => arr.reduce((s, l) => s + (Number(l.hours) || 0), 0);
  const addedHours = sum(added);
  const removedHours = sum(removed);
  const totalHours = sum(next);

  const parts = [];
  if (addedHours > 0) parts.push(`внесено ${addedHours} ч`);
  if (removedHours > 0) parts.push(`удалено ${removedHours} ч`);
  if (parts.length === 0) return;

  const hasPlan = plannedHours !== null && plannedHours !== undefined && plannedHours !== '';
  if (hasPlan) {
    const remaining = Number(plannedHours) - totalHours;
    parts.push(`остаток ${remaining} ч`);
  }

  changes[label] = parts.join(', ');
};

/**
 * Пометить изменение без раскрытия значений: только текст метки
 * («изменён», «изменена»). Для случаев, когда значения в журнале
 * неинформативны - id проекта, объект отдела, ссылка на задачу.
 */
export const auditMark = (changes, label, prev, next, text) => {
  if (isSameValue(prev, next)) return;
  changes[label] = text;
};