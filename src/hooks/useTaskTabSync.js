// src/hooks/useTaskTabSync.js
import { useEffect } from 'react';
import { useControlledTab } from './useControlledTab';
import { useStableModalHeight } from './useStableModalHeight';

/**
 * Активная вкладка карточки задачи + два правила автопереключения:
 *
 *   - если задача стала часовой, вкладка «Учёт времени» больше не
 *     существует (см. состав tabs в index.jsx) - уходим на «Данные»;
 *   - если текущая вкладка вообще пропала из списка (например,
 *     закрылась вкладка «Подзадачи», потому что подзадач не осталось) -
 *     переключаемся на первую доступную.
 *
 * tabIdsSignature - строка вместо массива в зависимостях эффекта:
 * массив tabs пересоздаётся на каждом рендере, эффект гонялся бы
 * без надобности при каждом ре-рендере, а не только при реальном
 * изменении состава вкладок.
 */
export function useTaskTabSync(initialTab, onTabChange, tabs, isHourly) {
  const [activeTab, handleTabChange] = useControlledTab(initialTab, onTabChange);
  const bodyRef = useStableModalHeight(activeTab);

  useEffect(() => {
    if (activeTab === 'time' && isHourly) handleTabChange('form');
  }, [activeTab, isHourly, handleTabChange]);

  const tabIdsSignature = tabs.map((t) => t.id).join(',');
  useEffect(() => {
    const ids = tabIdsSignature.split(',');
    if (!ids.includes(activeTab)) handleTabChange(ids[0] || 'form');
  }, [tabIdsSignature, activeTab, handleTabChange]);

  return { activeTab, handleTabChange, bodyRef };
}
