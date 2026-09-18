// src/services/WorkloadService.js
//
// Считает загрузку сотрудников: плановые и фактические часы за период.
//
// План: часы задачи распределяются равномерно по рабочим дням интервала
// [start, deadline]. Делитель - полное число рабочих дней задачи, не
// число дней внутри отчёта. Иначе у задачи, пересекающей границу
// периода, сумма по двум соседним периодам не совпадала бы с планом.
//
// Факт: часы берутся из task.logs по конкретным датам. Это «сырой» факт,
// без перераспределения - вносить часы можно только датой.
//
// Сервис оперирует id и числами. Он не знает ни о правах, ни о UI, ни о
// структуре сотрудника: возвращает Map<empId, { planTotal, factTotal,
// capacity }>. Объекты сотрудников (с паролями и историей паролей) через
// вычислительный сервис не проходят - их вью достаёт из db по id, когда
// это нужно для отображения.

export class WorkloadService {
  constructor(calendar) {
    this._calendar = calendar;
  }

  /**
   * Плановые часы задачи, попадающие в окно [fromIso, toIso].
   *
   * Задача → plannedHours равномерно на все рабочие дни [start, deadline].
   * В окно попадает доля, равная (рабочие дни пересечения) / (все рабочие
   * дни задачи). Сумма по двум непересекающимся окнам, покрывающим задачу,
   * равна plannedHours - за счёт того, что делитель общий.
   *
   * Возвращает число, а не массив per-day записей: наружу нужна только
   * сумма, а промежуточный массив был бы спекулятивной универсальностью.
   */
  _taskPlanHoursInWindow(task, fromIso, toIso) {
    if (!task.start || !task.deadline) return 0;

    const planned = task.plannedHours || 0;
    if (planned <= 0) return 0;

    // Задача целиком за пределами отчётного окна.
    if (task.start > toIso || task.deadline < fromIso) return 0;

    const workdays = this._calendar.getWorkdays(task.start, task.deadline);
    if (workdays.length === 0) return 0;

    const perDay = planned / workdays.length;
    let sum = 0;
    for (const day of workdays) {
      if (day >= fromIso && day <= toIso) sum += perDay;
    }
    return sum;
  }

  /**
   * Собирает загрузку сотрудников за [fromIso, toIso].
   *
   * @param {object[]} employees - сотрудники, которых показываем (берём
   *   только их id: возвращаемая Map строится по этому набору)
   * @param {object[]} tasks     - задачи, которые учитываем
   * @param {string}   fromIso
   * @param {string}   toIso
   * @returns Map<empId, { planTotal, factTotal, capacity }>
   */
  buildWorkload(employees, tasks, fromIso, toIso) {
    const capacity = this._calendar.capacityHours(fromIso, toIso);
    const result = new Map();

    for (const emp of employees) {
      result.set(emp.id, { planTotal: 0, factTotal: 0, capacity });
    }

    for (const task of tasks) {
      if (!task.assigneeId) continue;
      const entry = result.get(task.assigneeId);
      if (!entry) continue;

      entry.planTotal += this._taskPlanHoursInWindow(task, fromIso, toIso);

      for (const log of task.logs || []) {
        if (!log.date) continue;
        if (log.date < fromIso || log.date > toIso) continue;
        entry.factTotal += log.hours || 0;
      }
    }

    return result;
  }

  /**
   * Перегруз одного сотрудника за период.
   *
   * План = сумма плановых часов «уже висящих» задач (переданных в tasks)
   * плюс, если передан, вклад candidateTask. Capacity = рабочие дни окна
   * × часы в дне. Если plan ≤ capacity - перегрузки нет, возвращаем null.
   *
   * candidateTask передаётся отдельно, а не в общем массиве, потому что
   * на момент проверки он ещё не в репозитории (создание) или имеет
   * «старые» значения полей (редактирование). Смешивать «уже лежащее в
   * сторе» и «то, что сейчас будет записано» в одном массиве -
   * неявно и чревато двойным учётом.
   *
   * @param {string}   empId
   * @param {object[]} tasks         - задачи сотрудника empId
   * @param {string}   fromIso
   * @param {string}   toIso
   * @param {object}   [candidateTask]
   * @returns {{ planTotal: number, capacity: number, overload: number } | null}
   */
  findOverload(empId, tasks, fromIso, toIso, candidateTask = null) {
    if (!empId || !fromIso || !toIso) return null;

    const capacity = this._calendar.capacityHours(fromIso, toIso);
    if (capacity <= 0) return null;

    let planTotal = 0;
    for (const task of tasks) {
      if (task.assigneeId !== empId) continue;
      planTotal += this._taskPlanHoursInWindow(task, fromIso, toIso);
    }
    if (candidateTask) {
      planTotal += this._taskPlanHoursInWindow(candidateTask, fromIso, toIso);
    }

    const overload = planTotal - capacity;
    if (overload <= 0) return null;
    return { planTotal, capacity, overload };
  }
}