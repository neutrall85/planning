export const ROLES = {
  admin:            { label: "Суперадминистратор", short: "СУП", color: "#ef4444" },
  director:         { label: "Генеральный директор", short: "ГД", color: "#f59e0b" },
  economist:        { label: "Главный экономист", short: "ГЭ", color: "#8b5cf6" },
  kb_chief:         { label: "Главный конструктор КБ", short: "ГК", color: "#0ea5e9" },
  head:             { label: "Руководитель отдела", short: "РО", color: "#3b82f6" },
  project_lead:     { label: "Ответственный по проекту", short: "ОП", color: "#ec4899" },
  project_manager:  { label: "Менеджер проектов", short: "МП", color: "#f97316" }, // новая роль
  hr:               { label: "HR-менеджер", short: "HR", color: "#14b8a6" },
  executor:         { label: "Исполнитель", short: "ИСП", color: "#64748b" },
};

export const TASK_STATUSES = {
  new:      { label: "Новая", color: "#94a3b8" },
  inwork:   { label: "В работе", color: "#3b82f6" },
  review:   { label: "На проверке", color: "#f59e0b" },
  closed:   { label: "Закрыта", color: "#10b981" },
  cancelled:{ label: "Отменена", color: "#64748b" },
};
export const TASK_STATUS_ORDER = ["new", "inwork", "review", "closed", "cancelled"];

export const PRIORITIES = {
  low:  { label: "Низкий", color: "#94a3b8" },
  mid:  { label: "Средний", color: "#f59e0b" },
  high: { label: "Высокий", color: "#f97316" },
  crit: { label: "Критический", color: "#dc2626" },
};

// Алиас для совместимости с кодом, использующим PRIORITIES.mid
PRIORITIES.medium = PRIORITIES.mid;

// Типы зависимостей между задачами
export const DEPENDENCY_TYPES = {
  FS: { label: "Окончание-Начало (FS)", desc: "Задача начнётся после завершения предыдущей" },
  SS: { label: "Начало-Начало (SS)", desc: "Задача начнётся одновременно с началом предыдущей" },
  FF: { label: "Окончание-Окончание (FF)", desc: "Задача завершится одновременно с завершением предыдущей" },
  SF: { label: "Начало-Окончание (SF)", desc: "Задача завершится после начала предыдущей" },
};

export const VACATION_TYPES = {
  annual: "Ежегодный",
  admin: "Административный",
  sick: "Больничный",
  other: "Другой",
};

export const PROJECT_STATUSES = {
  active:    "Активный",
  inactive:  "Неактивный",
  closed:    "Закрыт",
  cancelled: "Отменён"
};

// Категории приоритетов проектов
export const PROJECT_CATEGORIES = {
  AOG:   { label: "AOG (Aviation Grounded)", color: "#dc2626", desc: "Критическая - самолет на земле" },
  CRIT:  { label: "CRIT (Critical)", color: "#f97316", desc: "Высокий приоритет - критические задачи" },
  NORM:  { label: "NORM (Routine)", color: "#10b981", desc: "Плановые работы" },
};

export const PROJECT_TYPES = { prod: "Производственный", admin: "Административный" };
export const COMMENT_EDIT_WINDOW = 15 * 60000; // 15 минут
export const DOMAIN = "volga-dnepr.com";