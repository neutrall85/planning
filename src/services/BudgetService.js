// src/services/BudgetService.js

export class BudgetService {
  constructor({ taskRepo, projectRepo, employeeRepo }) {
    this._taskRepo = taskRepo;
    this._projectRepo = projectRepo;
    this._employeeRepo = employeeRepo;
  }

  // Рекурсивный подсчёт суммы плановых часов подзадач (без учёта фактических).
  // Публичный API для отчётов и внешних потребителей. В проверках бюджета
  // не используется - там _sumDescendantsPlanned (плоская сумма).
  calcSummaryHours(taskId, visited = new Set()) {
    if (visited.has(taskId)) return 0;
    visited.add(taskId);

    const task = this._taskRepo.findById(taskId);
    if (!task) return 0;
    if (!task.isSummary) return parseFloat(task.plannedHours) || 0;

    const children = this._taskRepo.findChildren(taskId);
    let sum = 0;
    for (const child of children) {
      sum += this.calcSummaryHours(child.id, visited);
    }
    return sum;
  }

  // Получение фактических часов задачи из её собственных логов.
  // НЕ рекурсивно: логи подзадач учитываются отдельно, через сами подзадачи.
  getActualHours(task) {
    if (!task) return 0;
    return (task.logs || []).reduce((sum, log) => sum + (log.hours || 0), 0);
  }

  /**
   * Корень дерева, к которому принадлежит задача.
   *
   * Идём вверх по parentTaskId, пока он есть. Возвращаем саму задачу,
   * если она уже корень.
   *
   * visited защищает от зацикливания на повреждённых данных: при
   * ссылке A.parentTaskId = B и B.parentTaskId = A цикл оборвётся.
   */
  _findRoot(task) {
    if (!task) return null;
    const visited = new Set();
    let current = task;
    while (current.parentTaskId && !visited.has(current.id)) {
      visited.add(current.id);
      const next = this._taskRepo.findById(current.parentTaskId);
      if (!next) break;
      current = next;
    }
    return current;
  }

  /**
   * Плоская сумма плановых часов всех потомков задачи.
   *
   * «Плоская» - ключевое. Суммируются планы всех уровней вложенности:
   * и A, и B внутри A, и C внутри B. Не схлопывается до листьев, как
   * calcSummaryHours - потому что в модели «вложенная ветка берёт часы
   * из общего бюджета корня» промежуточные узлы тоже расходуют бюджет.
   *
   * excludeTaskId - при обновлении существующей задачи её текущий план
   * не учитывается, чтобы не сравнивать новое значение с ним же.
   */
  _sumDescendantsPlanned(taskId, excludeTaskId = null, visited = new Set()) {
    if (visited.has(taskId)) return 0;
    visited.add(taskId);

    let sum = 0;
    for (const child of this._taskRepo.findChildren(taskId)) {
      if (child.id === excludeTaskId) continue;
      sum += parseFloat(child.plannedHours) || 0;
      sum += this._sumDescendantsPlanned(child.id, excludeTaskId, visited);
    }
    return sum;
  }

  /**
   * Остаток часов для задачи как «корня своей ветки».
   *
   * budget - own logs - плоская сумма планов всех потомков.
   *
   * Считается по этой задаче, а не по её родителю: UI показывает остаток
   * той задачи, которая открыта. Для корневой задачи это «сколько ещё
   * можно распределить по дереву», для промежуточной - её собственный
   * доступный запас.
   */
  getRemainingHours(taskId) {
    const task = this._taskRepo.findById(taskId);
    if (!task) return null;

    const ownActual = this.getActualHours(task);
    const descendantsPlan = this._sumDescendantsPlanned(taskId);
    const budget = parseFloat(task.budgetHours ?? task.plannedHours ?? 0);

    return budget - ownActual - descendantsPlan;
  }

  /**
   * Проверка возможности добавления/изменения подзадачи.
   *
   * Две независимые проверки:
   *
   * (1) Локальная - остаток бюджета прямого родителя:
   *       own logs parent + планы прямых детей parent (кроме exclude)
   *       + estimate ≤ plannedHours parent
   *     Ловит «подзадача больше родителя» и «у родителя не осталось
   *     свободных часов после своих логов и других подзадач».
   *
   * (2) Глобальная - от корня дерева:
   *       own logs корня + плоская сумма планов всех потомков корня
   *       (кроме exclude) + estimate ≤ budget корня
   *     Ловит «вложенная ветка съела корневой бюджет». Именно это
   *     правило останавливает создание C под B в сценарии
   *     «24 = 12 своих + 10 + 2, дальше нельзя».
   *
   * Проверки не сводятся друг к другу: (1) может пройти при (2) = false
   * (у A есть свой запас, но корень исчерпан), и наоборот (глобально
   * место есть, но конкретный родитель не может дать больше своего плана).
   *
   * @param {string} parentId
   * @param {number} childEstimate - плановые часы новой/изменяемой подзадачи
   * @param {string|null} excludeTaskId - ID задачи, исключаемой из суммы (при обновлении)
   * @returns {boolean}
   */
  canAddChildToParent(parentId, childEstimate, excludeTaskId = null) {
    const parent = this._taskRepo.findById(parentId);
    if (!parent) return true;

    const estimate = parseFloat(childEstimate) || 0;

    // (1) Локальная проверка.
    // Если у родителя нет плана (административный проект) - ограничения нет.
    if (parent.plannedHours != null) {
      const parentPlan = parseFloat(parent.plannedHours) || 0;
      const ownActual = this.getActualHours(parent);

      let childrenPlan = 0;
      for (const child of this._taskRepo.findChildren(parentId)) {
        if (child.id === excludeTaskId) continue;
        childrenPlan += parseFloat(child.plannedHours) || 0;
      }

      if (ownActual + childrenPlan + estimate > parentPlan) return false;
    }

    // (2) Глобальная проверка от корня.
    const root = this._findRoot(parent);
    const rootBudget = parseFloat(root.budgetHours ?? root.plannedHours ?? 0);
    const rootOwnActual = this.getActualHours(root);
    const descendantsPlan = this._sumDescendantsPlanned(root.id, excludeTaskId);

    return (rootOwnActual + descendantsPlan + estimate) <= rootBudget;
  }

  // Проверка бюджета проекта (для задач)
  checkProjectBudget(projectId, taskId, plannedHours) {
    const project = this._projectRepo.findById(projectId);
    if (!project || project.budget == null || project.ptype === 'admin' || project.archived) {
      return true;
    }
    const otherTasks = this._taskRepo.findByProject(projectId)
      .filter(t => t.id !== taskId && !t.archived);
    const sumOther = otherTasks.reduce((acc, t) => acc + (parseFloat(t.plannedHours) || 0), 0);
    const newTotal = sumOther + (parseFloat(plannedHours) || 0);
    if (newTotal > project.budget) {
      throw new Error(
        `Превышение бюджета проекта! Бюджет: ${project.budget} ч, сумма остальных задач: ${sumOther} ч, запрошено: ${plannedHours || 0} ч.`
      );
    }
    return true;
  }

  /**
   * Установка бюджета для суммарной задачи.
   *
   * Проверяем, что новый бюджет покрывает собственные логи и плоскую
   * сумму планов всех потомков. Раньше здесь был calcSummaryHours -
   * он схлопывал вложенность до листьев и не видел промежуточные
   * планы, из-за чего бюджет можно было урезать ниже фактически
   * занятого.
   */
  setBudget(taskId, newBudget) {
    const task = this._taskRepo.findById(taskId);
    if (!task) throw new Error('Задача не найдена');
    if (!task.isSummary) throw new Error('Только для суммарных задач');
    if (typeof newBudget !== 'number' || newBudget < 0) throw new Error('Бюджет должен быть неотрицательным числом');

    const ownActual = this.getActualHours(task);
    const descendantsPlan = this._sumDescendantsPlanned(taskId);

    if (ownActual + descendantsPlan > newBudget) {
      throw new Error(
        `Новый бюджет (${newBudget} ч) меньше фактических часов задачи (${ownActual} ч) ` +
        `и суммарного плана подзадач (${descendantsPlan} ч).`
      );
    }
    task.budgetHours = newBudget;
    this._taskRepo.save(task);
    return task;
  }

  // Проверка, что сумма подзадач не превышает бюджет не-суммарной родительской
  // задачи (для совместимости).
  checkSubtaskBudget(parentId, excludeTaskId = null) {
    const parent = this._taskRepo.findById(parentId);
    if (!parent) return;
    if (parent.isSummary || parent.plannedHours == null) return;
    const children = this._taskRepo.findChildren(parentId)
      .filter(t => t.id !== excludeTaskId);
    const sumChildren = children.reduce((acc, t) => acc + (parseFloat(t.plannedHours) || 0), 0);
    if (sumChildren > parent.plannedHours) {
      throw new Error(
        `Сумма плановых часов подзадач (${sumChildren} ч) превышает бюджет родительской задачи "${parent.title}" (${parent.plannedHours} ч). Уменьшите часы подзадач или увеличьте бюджет родителя.`
      );
    }
  }
}