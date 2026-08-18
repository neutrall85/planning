import { COMPANY_DOMAIN } from './config';

export const ROLES = {
  admin:            { label: "Суперадминистратор", short: "СУП", color: "#ef4444" },
  director:         { label: "Генеральный директор", short: "ГД", color: "#f59e0b" },
  economist:        { label: "Главный экономист", short: "ГЭ", color: "#8b5cf6" },
  kb_chief:         { label: "Главный конструктор КБ", short: "ГК", color: "#0ea5e9" },
  head:             { label: "Руководитель отдела", short: "РО", color: "#3b82f6" },
  project_lead:     { label: "Ответственный по проекту", short: "ОП", color: "#ec4899" },
  project_manager:  { label: "Менеджер проектов", short: "МП", color: "#f97316" },
  hr:               { label: "HR-менеджер", short: "HR", color: "#14b8a6" },
  executor:         { label: "Исполнитель", short: "ИСП", color: "#64748b" },
} as const;

export const TASK_STATUSES = [
  { value: 'new', label: "Новая", color: "#8b5cf6" },
  { value: 'inwork', label: "В работе", color: "#0ea5e9" },
  { value: 'review', label: "На проверке", color: "#fbbf24" },
  { value: 'closed', label: "Закрыта", color: "#10b981" },
  { value: 'cancelled', label: "Отменена", color: "#64748b" },
] as const;

export const TASK_STATUS_ORDER = ["new", "inwork", "review", "closed", "cancelled"] as const;

export const PRIORITIES = [
  { value: 'low', label: "Низкий", color: "#3b82f6" },
  { value: 'mid', label: "Средний", color: "#f59e0b" },
  { value: 'high', label: "Высокий", color: "#f97316" },
  { value: 'crit', label: "Критический", color: "#dc2626" },
] as const;

// Типы зависимостей между задачами
export const DEPENDENCY_TYPES = {
  FS: { label: "Окончание-Начало (FS)", desc: "Задача начнётся после завершения предыдущей" },
  SS: { label: "Начало-Начало (SS)", desc: "Задача начнётся одновременно с началом предыдущей" },
  FF: { label: "Окончание-Окончание (FF)", desc: "Задача завершится одновременно с завершением предыдущей" },
  SF: { label: "Начало-Окончание (SF)", desc: "Задача завершится после начала предыдущей" },
} as const;

export const VACATION_TYPES = {
  annual: "Ежегодный",
  admin: "Административный",
  sick: "Больничный",
  other: "Другой",
} as const;

export const PROJECT_STATUSES = {
  active:    "Активный",
  inactive:  "Неактивный",
  closed:    "Закрыт",
  cancelled: "Отменён"
} as const;

// Категории приоритетов проектов
export const PROJECT_CATEGORIES = {
  AOG:   { label: "AOG (Aviation Grounded)", color: "#dc2626", desc: "Критическая - самолет на земле" },
  CRIT:  { label: "CRIT (Critical)", color: "#f97316", desc: "Высокий приоритет - критические задачи" },
  NORM:  { label: "NORM (Routine)", color: "#10b981", desc: "Плановые работы" },
} as const;

export const PROJECT_TYPES = { prod: "Производственный", admin: "Административный" } as const;

// DOMAIN перенесён в config.js как COMPANY_DOMAIN для централизации
