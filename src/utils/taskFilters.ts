/**
 * Утилиты для фильтрации задач
 * Заменяет удаленный хук useTaskFilters
 */

/**
 * Отфильтровать список задач по параметрам
 * @param {Object} data - данные хранилища
 * @param {Object} filters - параметры фильтрации
 * @returns {Array} Отфильтрованный список задач
 */
export const filterTasks = (data, filters) => {
  const { projectId, assigneeId, priority, deptId, search } = filters;
  let list = data.tasks.filter(t => !t.archived);
  
  if (projectId && projectId !== 'all') {
    list = list.filter(t => t.projectId === projectId);
  }
  
  if (assigneeId && assigneeId !== 'all') {
    list = list.filter(t => t.assigneeId === assigneeId);
  }
  
  if (priority && priority !== 'all') {
    list = list.filter(t => t.priority === priority);
  }
  
  if (deptId && deptId !== 'all') {
    list = list.filter(t => {
      const emp = data.employees.find(e => e.id === t.assigneeId);
      return emp && emp.departments.some(d => d.deptId === deptId);
    });
  }
  
  if (search?.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter(t => {
      const p = data.projects.find(x => x.id === t.projectId);
      return t.title.toLowerCase().includes(s) || 
        (p && (p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s)));
    });
  }
  
  return list;
};
