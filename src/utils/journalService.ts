// src/utils/journalService.ts

import { Task, Project, Employee, Vacation, AuditLog } from '../types';

// Форматирование даты
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Форматирование списка исполнителей
const formatAssignees = (assigneeIds: string[], employees: Record<string, Employee>): string => {
  if (!assigneeIds || assigneeIds.length === 0) return 'не назначены';
  return assigneeIds
    .map(id => {
      const emp = employees[id];
      return emp ? `${emp.lastName} ${emp.firstName.charAt(0)}.` : 'Unknown';
    })
    .join(', ');
};

// Получение имени пользователя
const getUserName = (userId: string | null, employees: Record<string, Employee>, users: any[]): string => {
  if (!userId) return 'Система';
  const emp = employees[userId];
  if (emp) return `${emp.lastName} ${emp.firstName.charAt(0)}.`;
  
  // Поиск по пользователям, если не найдено в сотрудниках
  const user = users.find(u => u.id === userId);
  if (user && user.employeeId) {
    const empByUserId = employees[user.employeeId];
    if (empByUserId) return `${empByUserId.lastName} ${empByUserId.firstName.charAt(0)}.`;
  }
  return 'Пользователь';
};

// Сравнение значений для диффа
const getDiff = (oldVal: any, newVal: any, fieldName: string): string | null => {
  if (oldVal === newVal) return null;
  
  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return formatDate(val);
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  return `${fieldName}: ${formatValue(oldVal)} → ${formatValue(newVal)}`;
};

// Журналирование задач
export const formatTaskCreate = (task: Task, projects: Record<string, Project>, employees: Record<string, Employee>): string => {
  const project = projects[task.projectId];
  const projName = project ? `${project.code} (${project.name})` : task.projectId;
  const assigneesStr = formatAssignees(task.assigneeIds, employees);
  
  return `Задача "${task.title}" в проекте ${projName}, плановые часы: ${task.plannedHours}, срок: ${formatDate(task.deadline)}, исполнители: ${assigneesStr}`;
};

export const formatTaskUpdate = (
  oldTask: Task, 
  newTask: Task, 
  employees: Record<string, Employee>
): string => {
  const changes: string[] = [];
  
  const fieldsToCheck = [
    { key: 'title', label: 'Название' },
    { key: 'plannedHours', label: 'Часы' },
    { key: 'deadline', label: 'Срок' },
    { key: 'status', label: 'Статус' },
  ];

  fieldsToCheck.forEach(({ key, label }) => {
    const diff = getDiff(oldTask[key as keyof Task], newTask[key as keyof Task], label);
    if (diff) changes.push(diff);
  });

  // Проверка исполнителей
  const oldAssignees = formatAssignees(oldTask.assigneeIds, employees);
  const newAssignees = formatAssignees(newTask.assigneeIds, employees);
  if (oldAssignees !== newAssignees) {
    changes.push(`Исполнители: ${oldAssignees} → ${newAssignees}`);
  }

  if (changes.length === 0) return 'без существенных изменений';
  return changes.join(', ');
};

export const formatTaskHoursLog = (task: Task, projects: Record<string, Project>, addedHours: number, totalHours: number): string => {
  const project = projects[task.projectId];
  const projName = project ? `${project.code} (${project.name})` : task.projectId;
  return `Задача "${task.title}" в проекте ${projName}, плановые часы: ${task.plannedHours}, фактические часы: ${totalHours} (внесено ${addedHours})`;
};

// Журналирование проектов
export const formatProjectCreate = (project: Project): string => {
  return `Проект "${project.name}" (${project.code}), бюджет: ${project.budget}, срок: ${formatDate(project.deadline)}`;
};

export const formatProjectUpdate = (oldProject: Project, newProject: Project): string => {
  const changes: string[] = [];
  const fields = [
    { key: 'name', label: 'Название' },
    { key: 'code', label: 'Код' },
    { key: 'budget', label: 'Бюджет' },
    { key: 'deadline', label: 'Срок' },
    { key: 'status', label: 'Статус' }
  ];

  fields.forEach(({ key, label }) => {
    const diff = getDiff(oldProject[key as keyof Project], newProject[key as keyof Project], label);
    if (diff) changes.push(diff);
  });

  return changes.length > 0 ? changes.join(', ') : 'без изменений';
};

// Журналирование сотрудников
export const formatEmployeeCreate = (emp: Employee): string => {
  return `Сотрудник ${emp.lastName} ${emp.firstName} ${emp.middleName || ''}, должность: ${emp.position}`;
};

export const formatEmployeeUpdate = (oldEmp: Employee, newEmp: Employee): string => {
  const changes: string[] = [];
  const fields = [
    { key: 'lastName', label: 'Фамилия' },
    { key: 'firstName', label: 'Имя' },
    { key: 'middleName', label: 'Отчество' },
    { key: 'position', label: 'Должность' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Телефон' }
  ];

  fields.forEach(({ key, label }) => {
    const diff = getDiff(oldEmp[key as keyof Employee], newEmp[key as keyof Employee], label);
    if (diff) changes.push(diff);
  });

  return changes.length > 0 ? changes.join(', ') : 'без изменений';
};

// Журналирование отпусков
export const formatVacationCreate = (vac: Vacation, emp: Employee | undefined): string => {
  const empName = emp ? `${emp.lastName} ${emp.firstName.charAt(0)}.` : 'Сотрудник';
  return `${empName}, период: ${formatDate(vac.startDate)} - ${formatDate(vac.endDate)}, тип: ${vac.type}`;
};

export const formatVacationUpdate = (oldVac: Vacation, newVac: Vacation, emp: Employee | undefined): string => {
  const empName = emp ? `${emp.lastName} ${emp.firstName.charAt(0)}.` : 'Сотрудник';
  const changes: string[] = [];
  
  const startDiff = getDiff(oldVac.startDate, newVac.startDate, 'Начало');
  if (startDiff) changes.push(startDiff.replace('Начало:', ''));
  
  const endDiff = getDiff(oldVac.endDate, newVac.endDate, 'Окончание');
  if (endDiff) changes.push(endDiff.replace('Окончание:', ''));

  if (oldVac.type !== newVac.type) changes.push(`Тип: ${oldVac.type} → ${newVac.type}`);

  return `${empName}, ${changes.join(', ')}`;
};

// Журналирование ролей
export const formatRoleDelegate = (targetEmp: Employee, roleName: string, actorEmp?: Employee): string => {
  const actorName = actorEmp ? `${actorEmp.lastName} ${actorEmp.firstName.charAt(0)}.` : 'Администратор';
  return `Роль "${roleName}" передана сотруднику ${targetEmp.lastName} ${targetEmp.firstName.charAt(0)}. (инициатор: ${actorName})`;
};

export const formatRoleRevoke = (targetEmp: Employee, roleName: string, actorEmp?: Employee): string => {
  const actorName = actorEmp ? `${actorEmp.lastName} ${actorEmp.firstName.charAt(0)}.` : 'Администратор';
  return `Роль "${roleName}" отозвана у сотрудника ${targetEmp.lastName} ${targetEmp.firstName.charAt(0)}. (инициатор: ${actorName})`;
};

// Журналирование пользователей
export const formatUserRegister = (emp: Employee, roleName: string): string => {
  return `Пользователь ${emp.lastName} ${emp.firstName.charAt(0)}. зарегистрирован с ролью "${roleName}"`;
};
