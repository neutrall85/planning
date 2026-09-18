// src/services/BudgetService.js

export class BudgetService {
  constructor({ taskRepo, projectRepo, employeeRepo }) {
    this._taskRepo = taskRepo;
    this._projectRepo = projectRepo;
    this._employeeRepo = employeeRepo;
  }

  // Рекурсивный подсчёт суммы плановых часов подзадач (без учёта фактических)
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

  // Получение фактических часов задачи из логов
  getActualHours(task) {
    if (!task) return 0;
    return (task.logs || []).reduce((sum, log) => sum + (log.hours || 0), 0);
  }

  /**
   * Остаток часов для задачи.
   * Всегда учитывает сумму плановых часов подзадач, если они есть,
   * независимо от флага isSummary.
   *
   * Формула: budget - actualHours - sumChildren
   * где budget = budgetHours (для суммарных) или plannedHours (для обычных).
   */
  getRemainingHours(taskId) {
    const task = this._taskRepo.findById(taskId);
    if (!task) return null;

    const actual = this.getActualHours(task);
    const children = this._taskRepo.findChildren(taskId);

    let childrenSum = 0;
    for (const child of children) {
      childrenSum += parseFloat(child.plannedHours) || 0;
    }

    if (task.isSummary) {
      const budget = parseFloat(task.budgetHours ?? task.plannedHours ?? 0);
      return budget - actual - childrenSum;
    }

    // Обычная задача: если есть подзадачи - учитываем их, если нет - только план минус факт
    const planned = parseFloat(task.plannedHours) || 0;
    return planned - actual - childrenSum;
  }

  /**
   * Проверка возможности добавления/изменения подзадачи.
   * Остаток = plannedHours - actualHours - sumChildren
   * @param {string} parentId
   * @param {number} childEstimate - плановые часы новой/изменяемой подзадачи
   * @param {string|null} excludeTaskId - ID задачи, исключаемой из суммы (при обновлении)
   * @returns {boolean}
   */
  canAddChildToParent(parentId, childEstimate, excludeTaskId = null) {
    const parent = this._taskRepo.findById(parentId);
    if (!parent) return true;

    const actualHours = this.getActualHours(parent);
    const estimate = parseFloat(childEstimate) || 0;

    // Собираем сумму подзадач (исключая редактируемую)
    let childrenSum = 0;
    const children = this._taskRepo.findChildren(parentId)
      .filter(t => t.id !== excludeTaskId);
    for (const child of children) {
      childrenSum += parseFloat(child.plannedHours) || 0;
    }

    const totalWithNew = childrenSum + estimate;

    if (parent.isSummary) {
      const budget = parseFloat(parent.budgetHours ?? parent.plannedHours ?? 0);
      return (actualHours + totalWithNew) <= budget;
    }

    // Обычная задача
    if (parent.plannedHours == null) return true;
    const planned = parseFloat(parent.plannedHours) || 0;
    const available = planned - actualHours;
    return totalWithNew <= available;
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

  // Установка бюджета для суммарной задачи
  setBudget(taskId, newBudget) {
    const task = this._taskRepo.findById(taskId);
    if (!task) throw new Error('Задача не найдена');
    if (!task.isSummary) throw new Error('Только для суммарных задач');
    if (typeof newBudget !== 'number' || newBudget < 0) throw new Error('Бюджет должен быть неотрицательным числом');

    const childrenSum = this.calcSummaryHours(taskId);
    const actual = this.getActualHours(task);
    if (childrenSum + actual > newBudget) {
      throw new Error(
        `Новый бюджет (${newBudget} ч) меньше суммы подзадач (${childrenSum} ч) и фактических часов (${actual} ч).`
      );
    }
    task.budgetHours = newBudget;
    this._taskRepo.save(task);
    return task;
  }

  // Проверка, что сумма подзадач не превышает бюджет не-суммарной родительской задачи (для совместимости)
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