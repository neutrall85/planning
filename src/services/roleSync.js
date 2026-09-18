// src/services/roleSync.js
//
// Синхронизация производной роли executor.
//
// Роль executor не хранится как пользовательский выбор - она отражает
// факт «у сотрудника есть задачи». Меняется автоматически:
//   - при назначении задачи → появляется;
//   - когда последняя задача снята/удалена → исчезает (если есть
//     другие роли; если executor - единственная, остаётся, чтобы не
//     оставить сотрудника вообще без ролей).
//
// Единственная точка правила. Здесь живут две функции:
//   - withSyncedExecutorRole(empId, currentRoles, deps) - чистая,
//     возвращает новый список ролей. Её вызывает EmployeeService
//     при сохранении сотрудника;
//   - syncExecutorRolesFor(empIds, deps) - применяет правило к
//     набору сотрудников и сохраняет изменения. Её вызывают
//     TaskService (после операций, меняющих assigneeId) и
//     ProjectService (после архивации/удаления задач проекта).
//
// Почему отдельный модуль, а не метод сервиса: правило читает задачи
// через taskRepo, но применяется в разных местах - в TaskService, в
// ProjectService и в EmployeeService. Если бы оно жило в любом из них,
// остальные тянули бы ссылку на него ради одной чистой функции.
// Геттер taskRepo + чистый предикат развязывают зависимость.
//
// «Активная задача» для правила - isCountableTask: не в архиве и не
// отменена. Закрытая задача остаётся в счёте, пока не ушла в архив:
// сотрудник всё ещё «исполнитель», хотя работа и завершена.
import { isCountableTask } from '../utils/workloadFilters';

/**
 * Возвращает актуальный список ролей с учётом правила.
 *
 * @param {string} empId
 * @param {string[]} currentRoles - роли, которые «хочет» пользователь
 * @param {{ taskRepo: Object }} deps
 * @returns {string[]} - новый массив ролей
 */
export function withSyncedExecutorRole(empId, currentRoles, { taskRepo }) {
  const roles = Array.isArray(currentRoles) ? [...currentRoles] : [];
  const hasTasks = taskRepo.findAll().some(
    (t) => t.assigneeId === empId && isCountableTask(t)
  );

  if (hasTasks && !roles.includes('executor')) {
    roles.push('executor');
  }

  if (!hasTasks && roles.includes('executor') && roles.length > 1) {
    return roles.filter((r) => r !== 'executor');
  }

  // Не оставляем сотрудника без ролей: executor - роль по умолчанию.
  if (roles.length === 0) return ['executor'];

  return roles;
}

/**
 * Применяет правило к набору сотрудников и сохраняет изменения.
 *
 * Тихая: не пишет в аудит (это производная от задач, а не действие
 * пользователя) и не уведомляет. Каждый save() дергает _notify через
 * employeeRepo, если репозиторий создан с колбэком; в DataStore это
 * не так - notify общий, вызывается один раз тем сервисом, который
 * инициировал операцию.
 *
 * Идемпотентна: если у сотрудника роли уже соответствуют правилу,
 * save не вызывается.
 *
 * @param {Iterable<string>} empIds
 * @param {{ employeeRepo: Object, taskRepo: Object }} deps
 * @returns {number} - сколько сотрудников реально изменилось
 */
export function syncExecutorRolesFor(empIds, { employeeRepo, taskRepo }) {
  let changed = 0;
  for (const empId of empIds) {
    if (!empId) continue;
    const emp = employeeRepo.findById(empId);
    if (!emp) continue;

    const before = emp.roles || [];
    const after = withSyncedExecutorRole(empId, before, { taskRepo });

    const isDifferent =
      after.length !== before.length ||
      after.some((r, i) => r !== before[i]);

    if (isDifferent) {
      employeeRepo.save({ ...emp, roles: after });
      changed += 1;
    }
  }
  return changed;
}