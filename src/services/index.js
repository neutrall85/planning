/**
 * Индекс сервисов для удобного импорта
 */

export { default as DataService } from './DataService';
export { default as BusinessLogicService } from './BusinessLogicService';
export { default as NotificationService } from './NotificationService';
export { default as AuditService } from './AuditService';

/**
 * Фабрика для создания и настройки всех сервисов
 * @param {Object} initialData - начальные данные (опционально)
 * @returns {Object} набор сервисов { data, businessLogic, notification, audit }
 */
export async function createServices(initialData = null) {
  const [{ default: DataServiceClass }, { default: BusinessLogicServiceClass }, { default: NotificationServiceClass }, { default: AuditServiceClass }] = await Promise.all([
    import('./DataService'),
    import('./BusinessLogicService'),
    import('./NotificationService'),
    import('./AuditService')
  ]);

  const dataService = new DataServiceClass();
  
  if (initialData) {
    dataService.initialize(initialData);
  }

  return {
    data: dataService,
    businessLogic: new BusinessLogicServiceClass(dataService),
    notification: new NotificationServiceClass(dataService),
    audit: new AuditServiceClass(dataService)
  };
}
