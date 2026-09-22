// src/services/BudgetService.js
//
// Правила бюджета задачи и проекта.
//
// Ключевая идея: у суммарной задачи есть собственный бюджет
// (budgetHours), а её потомки расходуют этот бюджет своими плановыми
// часами. Плюс сама задача может списывать часы через logs. Остаток
// бюджета — это «сколько ещё можно распределить по дереву».
//
// Сервис считает:
//   - фактические часы задачи (сумма logs);
//   - сумму планов листовых задач дерева (см. _sumDescendantsPlanned —
//     промежуточные узлы не считаются, их план — агрегат по потомкам,
//     а не собственная работа);
//   - остаток по этой задаче как по корню своей ветки;
//   - возможность добавить/изменить дочернюю задачу;
//   - соответствие планов подзадач плану родителя;
//   - лимит бюджета проекта.
//
// Модуль не знает про историю, аудит, уведомления. Все побочные
// эффекты (запись в history, аудит, notify) — на вызывающем сервисе.

export class BudgetService {
  constructor({ taskRepo, projectRepo, employeeRepo }) {
    this._taskRepo = taskRepo;
    this._projectRepo = projectRepo;
    this._employeeRepo = employeeRepo;
  }

  /**
   * Суммарные плановые часы листьев дерева задач.
   *
   * Используется в отчётах. Отличие от _sumDescendantsPlanned: та
   * тоже считает по листьям, но без учёта собственных logs. Здесь
   * для не-суммарной задачи возвращаются её плановые часы, для
   * суммарной — сумма по листьям.
   */
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

  /** Фактические часы: сумма всех logs задачи. */
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
   * Плоская сумма плановых часов листовых потомков задачи.
   *
   * Суммируются только планы задач БЕЗ собственных подзадач. Планы
   * промежуточных узлов не считаются: если у узла есть потомки, его
   * plannedHours — это агрегат (декомпозиция), а не собственная
   * работа. Если посчитать и узел, и его детей, дерево искусственно
   * «перегружается»: для цепочки «узел на 20 → подзадача на 20»
   * сумма окажется 40 вместо 20, и создание подзадачи будет
   * блокироваться на ровном месте.
   *
   * Определяем «лист» по наличию детей, а не по флагу isSummary:
   * в данных (в т.ч. в моке) бывает задача с подзадачами, но без
   * выставленного isSummary. Для бюджета важна фактическая структура
   * дерева, а не булев флаг.
   *
   * excludeTaskId — при обновлении существующей задачи её текущий
   * план не учитывается. Исключение работает на любом уровне
   * поддерева: узел с этим id пропускается вместе со своими потомками.
   */
  _sumDescendantsPlanned(taskId, excludeTaskId = null, visited = new Set()) {
    if (visited.has(taskId)) return 0;
    visited.add(taskId);
    let sum = 0;
    for (const child of this._taskRepo.findChildren(taskId)) {
      if (child.id === excludeTaskId) continue;
      const hasChildren = this._taskRepo.findChildren(child.id).length > 0;
      if (!hasChildren) {
        sum += parseFloat(child.plannedHours) || 0;
      } else {
        sum += this._sumDescendantsPlanned(child.id, excludeTaskId, visited);
      }
    }
    return sum;
  }

  /**
   * Остаток бюджета задачи.
   *
   * Формула: бюджет − собственные logs − плоская сумма планов
   * листовых потомков. Промежуточные узлы не вычитаются отдельно —
   * их план уже представлен планами их листьев.
   *
   * Бюджет берётся из budgetHours, а если его нет — из plannedHours.
   * budgetHours ставится автоматически при переводе задачи в суммарную
   * (см. TaskService.upsertTask) — до этого момента «бюджетом» служит
   * обычный план.
   *
   * Возвращает null, если задачи нет или бюджет не число: с null на
   * вызывающем проще, чем с NaN — вызывающий явно решает, что показать
   * («остаток неизвестен»).
   */
  getRemainingHours(taskId) {
    return this.getEffectiveRemaining(taskId, null);
  }

  /**
   * Остаток бюджета задачи с исключением конкретного узла из потомков.
   *
   * Отличие от getRemainingHours: позволяет не учитывать одну задачу
   * (вместе с её поддеревом) в сумме планов потомков. Нужно при
   * обновлении существующей подзадачи — её текущий план не должен
   * вычитаться против нового значения (иначе «планирую 5, у меня уже
   * было 5, но осталось 0»).
   *
   * Используется в TaskService.upsertTask в ветке ошибки, когда
   * canAddChildToParent вернул false: чтобы показать «доступно X ч,
   * запрошено Y ч».
   *
   * @returns {number|null} число часов или null, если задача не найдена
   *   или бюджет не число.
   */
  getEffectiveRemaining(taskId, excludeTaskId = null) {
    const task = this._taskRepo.findById(taskId);
    if (!task) return null;
    const budget = parseFloat(task.budgetHours ?? task.plannedHours ?? 0);
    if (!Number.isFinite(budget)) return null;
    const ownActual = this.getActualHours(task);
    const descendantsPlan = this._sumDescendantsPlanned(taskId, excludeTaskId);
    return budget - ownActual - descendantsPlan;
  }

  /**
   * Проверка возможности добавления/изменения подзадачи.
   *
   * Модель бюджета: если у задачи есть собственный план
   * (plannedHours / budgetHours), то этот план — верхняя граница для
   * «своих логов + планов подзадач». Добавление подзадачи в такую
   * задачу — это декомпозиция: часы родителя перераспределяются в
   * подзадачу, а не занимают дополнительное место в бюджете корня.
   * Значит, достаточно локальной проверки, что estimate помещается
   * в свободный слот родителя. Глобальная проверка от корня тут не
   * нужна: она бы считала план родителя ещё раз, поверх его же
   * подзадач.
   *
   * Глобальная проверка от корня остаётся для случая, когда у
   * родителя нет собственного плана (plannedHours == null /
   * budgetHours == null). Такая задача — просто контейнер, и
   * единственный ограничитель для неё — бюджет корня дерева.
   *
   * Раньше глобальная проверка выполнялась всегда. Это ломало
   * декомпозицию: у задачи «11» с планом 20 при попытке добавить
   * подзадачу на 20 ч локальная проверка проходила (20 ≤ 20), но
   * глобальная падала, потому что в корне дерева план родителя уже
   * был «занят», и добавление ещё 20 давало превышение.
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

    const parentPlan = parseFloat(parent.budgetHours ?? parent.plannedHours ?? NaN);

    if (Number.isFinite(parentPlan)) {
      // Локальная проверка: подзадача должна помещаться в план
      // родителя. Если помещается — считаем, что запрос корректен,
      // дальше не спускаемся.
      const ownActual = this.getActualHours(parent);
      let childrenPlan = 0;
      for (const child of this._taskRepo.findChildren(parentId)) {
        if (child.id === excludeTaskId) continue;
        childrenPlan += parseFloat(child.plannedHours) || 0;
      }
      return ownActual + childrenPlan + estimate <= parentPlan;
    }

    // План родителя не задан — ограничиваемся бюджетом корня.
    const root = this._findRoot(parent);
    const rootBudget = parseFloat(root.budgetHours ?? root.plannedHours ?? 0);
    return (
      this.getActualHours(root) +
      this._sumDescendantsPlanned(root.id, excludeTaskId) +
      estimate <= rootBudget
    );
  }

  /**
   * Лимит плановых часов проекта.
   *
   * Сумма плановых часов всех задач проекта + запрошенное значение
   * не должна превышать бюджет проекта. Проверка не применяется к
   * административным и архивным проектам, а также если бюджет не задан.
   *
   * Бросает - потому что вызывающий (TaskService.upsertTask) уже в
   * контексте обработки ошибки и ждёт исключение, а не булев результат.
   */
  checkProjectBudget(projectId, taskId, plannedHours) {
    const project = this._projectRepo.findById(projectId);
    if (!project || project.budget == null || project.ptype === 'admin' || project.archived) {
      return true;
    }
    // Считаем только листья дерева: у summary-задачи её собственный
    // plannedHours — агрегат по потомкам, а не отдельная работа.
    // Включать и узел, и его детей — двойной счёт; учитывать только
    // узел и пропускать детей — потеря части плана, если у узла
    // осталась какая-то собственная работа. Оба варианта неверны,
    // единственный корректный — считать листья.
    const sumOther = this._taskRepo
      .findByProject(projectId)
      .filter(t => t.id !== taskId && !t.archived)
      .filter(t => this._taskRepo.findChildren(t.id).length === 0)
      .reduce((acc, t) => acc + (parseFloat(t.plannedHours) || 0), 0);

    if (sumOther + (parseFloat(plannedHours) || 0) > project.budget) {
      throw new Error(
        `Превышение плановых часов проекта! План: ${project.budget} ч, ` +
        `сумма остальных задач: ${sumOther} ч, запрошено: ${plannedHours || 0} ч.`,
      );
    }
    return true;
  }

  /**
   * Установка бюджета суммарной задачи.
   *
   * Проверяем, что новый бюджет покрывает собственные логи и плоскую
   * сумму планов листовых потомков.
   */
  setBudget(taskId, newBudget) {
    const task = this._taskRepo.findById(taskId);
    if (!task) throw new Error('Задача не найдена');
    if (!task.isSummary) throw new Error('Только для суммарных задач');
    if (typeof newBudget !== 'number' || newBudget < 0) {
      throw new Error('План должен быть неотрицательным числом');
    }
    const ownActual = this.getActualHours(task);
    const descendantsPlan = this._sumDescendantsPlanned(taskId);

    if (ownActual + descendantsPlan > newBudget) {
      throw new Error(
        `Новый план (${newBudget} ч) меньше фактических часов задачи ` +
        `(${ownActual} ч) и суммарного плана подзадач (${descendantsPlan} ч).`,
      );
    }
    task.budgetHours = newBudget;
    this._taskRepo.save(task);
    return task;
  }

  /**
   * Сумма планов подзадач не должна превышать план родителя.
   *
   * Отдельная проверка от canAddChildToParent: та считает «влезет ли
   * новая подзадача», эта — «не превышен ли план родителя сейчас».
   * Используется при обновлении родителя и при удалении подзадачи,
   * когда после изменения состава нужно перепроверить сумму.
   */
  checkSubtaskBudget(parentId, excludeTaskId = null) {
    const parent = this._taskRepo.findById(parentId);
    if (!parent) return;
    if (parent.isSummary || parent.plannedHours == null) return;

    const sumChildren = this._taskRepo
      .findChildren(parentId)
      .filter(t => t.id !== excludeTaskId)
      .reduce((acc, t) => acc + (parseFloat(t.plannedHours) || 0), 0);

    if (sumChildren > parent.plannedHours) {
      throw new Error(
        `Сумма плановых часов подзадач (${sumChildren} ч) превышает ` +
        `плановые часы родительской задачи "${parent.title}" ` +
        `(${parent.plannedHours} ч). Уменьшите часы подзадач или ` +
        `увеличьте плановые часы родителя.`,
      );
    }
  }
}