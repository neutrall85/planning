// src/hooks/useFilters.js
import { useCallback, useState } from 'react';

/**
 * Единая точка хранения и изменения критериев фильтрации.
 *
 * Все вьюхи (задачи, проекты, шаблоны, журнал, отчёты, архив) работают
 * с одним объектом filters и одним сеттером по ключу. Это устраняет
 * разнобой «семь отдельных useState vs один объект с ручным
 * handleFilterChange», который был до этого: интерфейс везде
 * одинаков, поведение и баги - тоже.
 *
 * Возвращает:
 *   filters        - текущий объект критериев;
 *   setFilter      - (key, value) => void, обновляет одно поле;
 *   resetFilters   - сброс к initial.
 *
 * Если нужен побочный эффект на изменение конкретного поля (например,
 * сбросить страницу пагинации в Journal) - вызывающий код может
 * обернуть setFilter. Никакой лишней машинерии здесь не нужно:
 * useCallback поверх setFilters честно возвращает то же самое.
 */
export function useFilters(initial) {
  const [filters, setFilters] = useState(initial);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initial);
  }, [initial]);

  return { filters, setFilter, resetFilters };
}