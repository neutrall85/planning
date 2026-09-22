// src/utils/projectUnits.js
/**
 * Правила, связанные с полем project.unitIds.
 *
 * unitIds - массив id подразделений проекта. Элемент массива - либо
 * id КБ (kb_*), либо id отдела вне КБ (d_*). Префиксы не пересекаются,
 * поэтому смешивать безопасно.
 *
 * Модуль существует ради одной цели: правило «какие подразделения
 * допустимы для какого типа проекта» должно жить в одном месте. До
 * выноса это правило было размазано по трём точкам ProjectModal
 * (unitOptions, applyPtypeChange, validate), и любое изменение набора
 * правил требовало править их согласованно.
 */

/**
 * Допустимо ли подразделение для проекта данного типа.
 *
 *   - prod: только КБ. Производственный проект привязан к КБ, от
 *     этого зависят правила видимости главного конструктора
 *     (см. permissions.projectBelongsToUserKbs).
 *
 *   - admin: КБ + отделы вне КБ (у них kbId === null в справочнике).
 *     Административный проект может относиться к любому подразделению.
 */
export const isUnitValidForPtype = (unitId, ptype, db) =>
  ptype === 'admin' || db.kbs.some(k => k.id === unitId);

/**
 * Отфильтровать unitIds до допустимых для типа проекта.
 *
 * Вызывается при смене ptype: список допустимых для prod уже, чем
 * для admin, поэтому переход admin → prod может сделать часть
 * выбранных id невалидными. Значения надо снять - иначе они останутся
 * невидимыми в селекте, но сохранятся в объекте.
 */
export const sanitizeUnitIdsForPtype = (unitIds, ptype, db) =>
  (unitIds || []).filter(id => isUnitValidForPtype(id, ptype, db));

/**
 * Опции для селекта подразделений в форме проекта.
 *
 * prod - только КБ. admin - КБ и отделы вне КБ, объединённые в один
 * список: пользователь не должен переключаться «КБ или отдел» руками.
 */
export const unitOptionsForPtype = (ptype, db) => {
  const kbs = db.kbs.map(k => ({ value: k.id, label: k.name }));
  if (ptype !== 'admin') return kbs;
  const standaloneDepts = db.departments
    .filter(d => !d.kbId)
    .map(d => ({ value: d.id, label: d.name }));
  return [...kbs, ...standaloneDepts];
};