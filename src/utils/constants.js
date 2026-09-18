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
  low:  { label: "Низкий", color: "#10b981" },
  mid:  { label: "Средний", color: "#f59e0b" },
  high: { label: "Высокий", color: "#f97316" },
  crit: { label: "Критический", color: "#dc2626" },
};

export const PROJECT_PRIORITIES = {
  AOG:  { label: 'AOG',  color: '#dc2626', order: 1 },
  CRIT: { label: 'CRIT', color: '#f59e0b', order: 2 },
  NORM: { label: 'NORM', color: '#10b981', order: 3 },
};

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

export const PROJECT_STATUS_CONFIG = {
  active:    { label: 'Активный', color: '#10b981' },
  inactive:  { label: 'Неактивный', color: '#94a3b8' },
  closed:    { label: 'Закрыт', color: '#3b82f6' },
  cancelled: { label: 'Отменён', color: '#ef4444' },
};

export const ADMIN_PROJECT_PRIORITIES = {
  high: { label: 'Высокий', color: '#f97316', order: 1 },
  mid:  { label: 'Средний', color: '#f59e0b', order: 2 },
  low:  { label: 'Низкий',  color: '#10b981', order: 3 },
};

export const PROJECT_STATUS_ORDER = ['inactive', 'active', 'closed', 'cancelled'];

export const PROJECT_TYPES = { prod: "Производственный", admin: "Административный" };
export const COMMENT_EDIT_WINDOW = 15 * 60000; // 15 минут

// ---------------------------------------------------------------------------
// Домены электронной почты
// ---------------------------------------------------------------------------
//
// DOMAIN - основной домен: используется в подписи поля входа («Логин -
// e-mail без домена @hor.ru») и в других местах, где нужно показать
// пользователю один пример. DOMAIN - это «домен по умолчанию» для UI,
// не источник правды для валидации: валидацию ведёт ALLOWED_DOMAINS.
//
// ALLOWED_DOMAINS - allowlist для регистрации и восстановления пароля.
// Один домен в DOMAIN и несколько в ALLOWED_DOMAINS - не противоречие:
// первый нужен для отображения, второй - для проверки. Так список
// доменов рабочего контура может расширяться без правки UI-текстов.
export const DOMAIN = 'hor.ru';
export const ALLOWED_DOMAINS = Object.freeze(['@hor.ru', '@zont.ru', '@horizont.ru']);

// ---------------------------------------------------------------------------
// Статус черновика
// ---------------------------------------------------------------------------
//
// Отдельная константа, а не ключ в TASK_STATUSES: у черновика нет ни
// переходов, ни прав, ни отображения в канбане. Это визуальный маркер
// «ещё не задача», который используется списком черновиков шаблона и
// модалкой-редактором. Единая точка правды.
export const DRAFT_STATUS = Object.freeze({
  value: 'draft',
  label: 'Черновик',
});

// ---------------------------------------------------------------------------
// Ограничения на размер загружаемых файлов
// ---------------------------------------------------------------------------
//
// Единственное место, где заданы числовые лимиты. Все компоненты и сервисы
// берут значения отсюда, чтобы лимит не расходился по файлам.
//
// attachment - вложения во вкладке «Вложения» (задачи и проекты). Лимит
// появился вместе с валидацией: раньше size не проверялся вовсе, и файл
// произвольного размера попадал в data URL (в память). 25 МБ - компромисс
// между «хватит на PDF-чертёж» и «не уронит браузер».
export const FILE_LIMITS = {
  // Изображения: комментарии, галерея проекта, фото проекта
  image: 10 * 1024 * 1024,
  // Фото профиля в личном кабинете
  profilePhoto: 5 * 1024 * 1024,
  // Вложения (задачи, проекты) - см. fileValidation.js
  attachment: 25 * 1024 * 1024,
};

// Человекочитаемое представление размера: 10485760 → "10 МБ".
// Экспортируется, потому что нужно и в messages (ниже), и в fileValidation.
export const mb = (bytes) => `${Math.round(bytes / 1024 / 1024)} МБ`;

// ---------------------------------------------------------------------------
// Тексты сообщений для файловых операций
// ---------------------------------------------------------------------------
export const FILE_MESSAGES = {
  notImage: 'Можно загружать только изображения',
  imageTooLarge: `Изображение слишком большое (максимум ${mb(FILE_LIMITS.image)})`,
  profilePhotoTooLarge: `Фото слишком большое (максимум ${mb(FILE_LIMITS.profilePhoto)})`,
  attachmentTooLarge: `Файл слишком большой (максимум ${mb(FILE_LIMITS.attachment)})`,
  someImagesSkipped: `Некоторые файлы пропущены (только изображения до ${mb(FILE_LIMITS.image)})`,
};

// ---------------------------------------------------------------------------
// Ограничения на имена папок
// ---------------------------------------------------------------------------
export const FOLDER_NAME_MAX_LENGTH = 64;
export const FILE_ROOT_LABEL = 'Корень';

// ---------------------------------------------------------------------------
// Диалоги подтверждения и ввода (используются через useConfirm)
// ---------------------------------------------------------------------------
//
// Статические диалоги - просто объект. Диалоги с интерполяцией - функция,
// принимающая аргументы и возвращающая объект.
export const DIALOGS = {
  // --- confirm: удаления ---
  deleteProfilePhoto: {
    message: 'Удалить фото профиля?',
    confirmLabel: 'Удалить',
    danger: true,
  },
  deleteProjectPhoto: {
    message: 'Удалить фото?',
    confirmLabel: 'Удалить',
    danger: true,
  },
  deleteFile: {
    message: 'Удалить файл?',
    confirmLabel: 'Удалить',
    danger: true,
  },
  deleteNote: {
    title: 'Удалить заметку',
    message: 'Удалить заметку? Это действие необратимо.',
    confirmLabel: 'Удалить',
    danger: true,
  },
  deleteProject: (name) => ({
    title: 'Удалить проект',
    message: `Удалить проект «${name}»? Это действие необратимо.`,
    confirmLabel: 'Удалить проект',
    danger: true,
  }),
  deleteTask: (title) => ({
    title: 'Удалить задачу',
    message: `Удалить задачу «${title}»?`,
    confirmLabel: 'Удалить',
    danger: true,
  }),

  // --- confirm: предупреждения ---
  vacationOverlap: (start, end) => ({
    message: `Исполнитель в отпуске ${start}–${end}. Продолжить?`,
    confirmLabel: 'Продолжить',
  }),

  /**
   * Предупреждение о перегрузке сотрудника при назначении задачи.
   * Это не блокировка, а информационный диалог: пользователь может
   * подтвердить назначение, если переработка допустима (аврал и т.п.).
   * Числа берутся из WorkloadService.findOverload - те же, что и в
   * дашборде загрузки, поэтому расхождений между экранами нет.
   */
  workloadOverload: (name, planHours, capacityHours, overloadHours) => ({
    title: 'Превышение загрузки',
    message:
      `${name} будет загружен на ${Math.round(planHours)} ч из ${capacityHours} ч ` +
      `за период задачи. Перегрузка: ${Math.round(overloadHours)} ч. Всё равно назначить?`,
    confirmLabel: 'Назначить',
  }),

  // --- confirm: проекты ---
  closeProject: (name) => ({
    title: 'Закрыть проект',
    message: `Закрыть проект «${name}»? Все задачи будут закрыты.`,
    confirmLabel: 'Закрыть',
    danger: true,
  }),
  cancelProject: (name) => ({
    title: 'Отменить проект',
    message: `Отменить проект «${name}»?`,
    confirmLabel: 'Отменить',
    danger: true,
  }),

  // --- confirm: шаблоны ---
  deleteTemplate: (name) => ({
    title: 'Удалить шаблон',
    message: `Удалить шаблон «${name}»?`,
    confirmLabel: 'Удалить',
    danger: true,
  }),

  // --- confirm/prompt: папки ---
  createFolder: {
    title: 'Новая папка',
    message: 'Введите название папки',
    placeholder: 'Например: Чертёж',
    confirmLabel: 'Создать',
  },
  deleteFolder: (name) => ({
    title: 'Удалить папку',
    message: `Удалить папку «${name}»?`,
    confirmLabel: 'Удалить',
    danger: true,
  }),

  // --- prompt: ввод текста ---
  createKb: {
    title: 'Новое конструкторское бюро',
    message: 'Введите название КБ',
    placeholder: 'Например: КБ «ЛА»',
    confirmLabel: 'Создать',
  },
  createDept: {
    title: 'Новый отдел',
    message: 'Введите название отдела',
    placeholder: 'Например: Отдел аэродинамики',
    confirmLabel: 'Создать',
  },
};

// ---------------------------------------------------------------------------
// Тексты toast-уведомлений
// ---------------------------------------------------------------------------
export const TOASTS = {
  commentDeleted: 'Комментарий удалён',
  photoDeleted: 'Фото удалено',
  fileDeleted: 'Файл удалён',
  fileUploaded: 'Файл загружен',
  filesUploaded: (n) => `Загружено файлов: ${n}`,
  filesRejected: (list) => `Пропущено: ${list}`,
  projectClosed: 'Проект закрыт',
  projectCancelled: 'Проект отменён',
  templateDeleted: 'Шаблон удалён',
  taskRestored: (title) => `Задача «${title}» восстановлена`,
  projectRestored: (name) => `Проект «${name}» восстановлен`,
  kbCreated: (name) => `КБ «${name}» создано`,
  deptCreated: (name) => `Отдел «${name}» создан`,
  folderCreated: (name) => `Папка «${name}» создана`,
  folderDeleted: 'Папка удалена',
  folderNotEmpty: 'Нельзя удалить непустую папку',
};

// ---------------------------------------------------------------------------
// Параметры кастомного Select
// ---------------------------------------------------------------------------
// SELECT_SEARCH_THRESHOLD - порог, с которого в попапе появляется поиск.
// SELECT_POPUP_MAX_HEIGHT - максимальная высота выпадающего списка, по ней
// решается, открывать список вверх или вниз.
export const SELECT_SEARCH_THRESHOLD = 10;
export const SELECT_POPUP_MAX_HEIGHT = 300;