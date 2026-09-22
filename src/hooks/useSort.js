// src/hooks/useSort.js
import { useCallback } from 'react';

/**
 * Контроль сортировки поверх useFilters.
 *
 * Все вьюхи со списком/канбаном уже держат фильтры в useFilters. Поля
 * сортировки — такие же поля состояния фильтра, и живут там же:
 * два поля (sortField / sortDir) в INITIAL_FILTERS, обновление через
 * setFilter. Иначе сброс фильтров («resetFilters») не откатывал бы
 * сортировку к дефолту, а состояние разъехалось бы между двумя
 * независимыми useStates.
 *
 * Хук берёт на себя один рутинный кусок: смену поля с пересчётом
 * направления и переключение направления. Правило дефолта:
 *   - числовое поле → 'desc' (сначала самые большие);
 *   - строковое поле → 'asc' (А→Я).
 * Что считать числовым, задаёт вызывающий: Set из имён полей. Хук сам
 * по имени поля тип не угадывает — это делало бы его зависимым от
 * схемы данных вьюхи.
 *
 * Возвращает поле/направление (для чтения) и два колбэка (для
 * SortControl). Всё, что делает хук, — вызывает setFilter с готовыми
 * ключами; он ничего не хранит и не мемоизирует лишнего.
 */
export function useSort({ filters, setFilter, numericFields }) {
  const field = filters.sortField;
  const dir = filters.sortDir;

  const handleFieldChange = useCallback((newField) => {
    setFilter('sortField', newField);
    setFilter('sortDir', numericFields.has(newField) ? 'desc' : 'asc');
  }, [setFilter, numericFields]);

  const handleDirToggle = useCallback(() => {
    setFilter('sortDir', dir === 'asc' ? 'desc' : 'asc');
  }, [setFilter, dir]);

  return { field, dir, handleFieldChange, handleDirToggle };
}