/**
 * i18n Configuration and Types
 * Internationalization support for the application
 */

export type Language = 'ru' | 'en';

export interface Translation {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    close: string;
    confirm: string;
    loading: string;
    error: string;
    success: string;
    warning: string;
    search: string;
    filter: string;
    reset: string;
    apply: string;
    yes: string;
    no: string;
    ok: string;
    back: string;
    next: string;
    previous: string;
    actions: string;
    status: string;
    date: string;
    time: string;
    author: string;
    description: string;
    comments: string;
    attachments: string;
    history: string;
    settings: string;
    profile: string;
    logout: string;
    login: string;
    email: string;
    password: string;
    required: string;
    invalidFormat: string;
    notFound: string;
    accessDenied: string;
    serverError: string;
    networkError: string;
    tryAgain: string;
    refresh: string;
    export: string;
    import: string;
    download: string;
    upload: string;
    select: string;
    all: string;
    none: string;
    more: string;
    less: string;
    showMore: string;
    showLess: string;
    expand: string;
    collapse: string;
    and: string;
    without: string;
    session: string;
  };
  
  auth: {
    loginTitle: string;
    loginButton: string;
    forgotPassword: string;
    register: string;
    logoutConfirm: string;
    sessionExpired: string;
    invalidCredentials: string;
    accountLocked: string;
    passwordChangeRequired: string;
  };
  
  tasks: {
    title: string;
    newTask: string;
    editTask: string;
    deleteTask: string;
    assignee: string;
    assignees: string;
    creator: string;
    priority: string;
    deadline: string;
    plannedHours: string;
    actualHours: string;
    status: string;
    project: string;
    dependencies: string;
    repeat: string;
    archive: string;
    unarchive: string;
    moveToArchive: string;
    restoreFromArchive: string;
    noTasks: string;
    taskCreated: string;
    taskUpdated: string;
    taskDeleted: string;
    statusChanged: string;
  };
  
  projects: {
    title: string;
    newProject: string;
    editProject: string;
    deleteProject: string;
    name: string;
    code: string;
    manager: string;
    budget: string;
    startDate: string;
    endDate: string;
    type: string;
    category: string;
    status: string;
    team: string;
    tasks: string;
    noProjects: string;
    projectCreated: string;
    projectUpdated: string;
    projectDeleted: string;
    budgetExceeded: string;
  };
  
  employees: {
    title: string;
    newEmployee: string;
    editEmployee: string;
    deleteEmployee: string;
    firstName: string;
    lastName: string;
    middleName: string;
    position: string;
    department: string;
    departments: string;
    roles: string;
    email: string;
    phone: string;
    extension: string;
    tabNumber: string;
    photo: string;
    fired: string;
    hireDate: string;
    noEmployees: string;
    employeeCreated: string;
    employeeUpdated: string;
    employeeDeleted: string;
  };
  
  vacations: {
    title: string;
    newVacation: string;
    editVacation: string;
    deleteVacation: string;
    type: string;
    startDate: string;
    endDate: string;
    duration: string;
    status: string;
    approve: string;
    reject: string;
    delegate: string;
    delegation: string;
    comment: string;
    justification: string;
    noVacations: string;
    vacationCreated: string;
    vacationApproved: string;
    vacationRejected: string;
  };
  
  notifications: {
    title: string;
    markAsRead: string;
    markAllAsRead: string;
    noNotifications: string;
    clearAll: string;
    settings: string;
    deadlineReminder: string;
    taskAssigned: string;
    taskStatusChanged: string;
    commentAdded: string;
    mention: string;
  };
  
  errors: {
    validationError: string;
    requiredField: string;
    invalidEmail: string;
    invalidPhone: string;
    passwordTooShort: string;
    passwordsMismatch: string;
    emailExists: string;
    taskNotFound: string;
    projectNotFound: string;
    employeeNotFound: string;
    vacationNotFound: string;
    permissionDenied: string;
    budgetExceeded: string;
    deadlinePassed: string;
    invalidDateRange: string;
    duplicateCode: string;
  };
  
  roles: {
    admin: string;
    director: string;
    economist: string;
    kb_chief: string;
    head: string;
    project_lead: string;
    project_manager: string;
    hr: string;
    executor: string;
  };
  
  priorities: {
    low: string;
    mid: string;
    high: string;
    crit: string;
  };
  
  taskStatuses: {
    new: string;
    inwork: string;
    review: string;
    closed: string;
    cancelled: string;
  };
  
  projectStatuses: {
    active: string;
    inactive: string;
    closed: string;
    cancelled: string;
  };
  
  vacationTypes: {
    annual: string;
    admin: string;
    sick: string;
    other: string;
  };
}

export const translations: Record<Language, Translation> = {
  ru: {
    common: {
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      create: 'Создать',
      close: 'Закрыть',
      confirm: 'Подтвердить',
      loading: 'Загрузка...',
      error: 'Ошибка',
      success: 'Успешно',
      warning: 'Предупреждение',
      search: 'Поиск',
      filter: 'Фильтр',
      reset: 'Сбросить',
      apply: 'Применить',
      yes: 'Да',
      no: 'Нет',
      ok: 'ОК',
      back: 'Назад',
      next: 'Далее',
      previous: 'Назад',
      actions: 'Действия',
      status: 'Статус',
      date: 'Дата',
      time: 'Время',
      author: 'Автор',
      description: 'Описание',
      comments: 'Комментарии',
      attachments: 'Вложения',
      history: 'История',
      settings: 'Настройки',
      profile: 'Профиль',
      logout: 'Выйти',
      login: 'Войти',
      email: 'Email',
      password: 'Пароль',
      required: 'Обязательно',
      invalidFormat: 'Неверный формат',
      notFound: 'Не найдено',
      accessDenied: 'Доступ запрещен',
      serverError: 'Ошибка сервера',
      networkError: 'Ошибка сети',
      tryAgain: 'Попробовать снова',
      refresh: 'Обновить',
      export: 'Экспорт',
      import: 'Импорт',
      download: 'Скачать',
      upload: 'Загрузить',
      select: 'Выбрать',
      all: 'Все',
      none: 'Нет',
      more: 'Еще',
      less: 'Меньше',
      showMore: 'Показать больше',
      showLess: 'Показать меньше',
      expand: 'Развернуть',
      collapse: 'Свернуть',
      and: 'и',
      without: 'без',
      session: 'Сессия хранится в cookie 30 дней (HttpOnly, Secure, SameSite=Lax — на стороне сервера).',
    },
    
    auth: {
      loginTitle: 'Вход в систему',
      loginButton: 'Войти',
      forgotPassword: 'Забыли пароль?',
      register: 'Регистрация',
      logoutConfirm: 'Вы уверены, что хотите выйти?',
      sessionExpired: 'Сессия истекла. Пожалуйста, войдите снова.',
      invalidCredentials: 'Неверный логин или пароль',
      accountLocked: 'Учетная запись заблокирована',
      passwordChangeRequired: 'Требуется смена пароля',
    },
    
    tasks: {
      title: 'Задачи',
      newTask: 'Новая задача',
      editTask: 'Редактировать задачу',
      deleteTask: 'Удалить задачу',
      assignee: 'Исполнитель',
      assignees: 'Исполнители',
      creator: 'Автор',
      priority: 'Приоритет',
      deadline: 'Дедлайн',
      plannedHours: 'Плановые часы',
      actualHours: 'Фактические часы',
      status: 'Статус',
      project: 'Проект',
      dependencies: 'Зависимости',
      repeat: 'Повторение',
      archive: 'Архив',
      unarchive: 'Восстановить',
      moveToArchive: 'Переместить в архив',
      restoreFromArchive: 'Восстановить из архива',
      noTasks: 'Нет задач',
      taskCreated: 'Задача создана',
      taskUpdated: 'Задача обновлена',
      taskDeleted: 'Задача удалена',
      statusChanged: 'Статус изменен',
    },
    
    projects: {
      title: 'Проекты',
      newProject: 'Новый проект',
      editProject: 'Редактировать проект',
      deleteProject: 'Удалить проект',
      name: 'Название',
      code: 'Код',
      manager: 'Руководитель',
      budget: 'Бюджет',
      startDate: 'Дата начала',
      endDate: 'Дата окончания',
      type: 'Тип',
      category: 'Категория',
      status: 'Статус',
      team: 'Команда',
      tasks: 'Задачи',
      noProjects: 'Нет проектов',
      projectCreated: 'Проект создан',
      projectUpdated: 'Проект обновлен',
      projectDeleted: 'Проект удален',
      budgetExceeded: 'Превышение бюджета',
    },
    
    employees: {
      title: 'Сотрудники',
      newEmployee: 'Новый сотрудник',
      editEmployee: 'Редактировать сотрудника',
      deleteEmployee: 'Удалить сотрудника',
      firstName: 'Имя',
      lastName: 'Фамилия',
      middleName: 'Отчество',
      position: 'Должность',
      department: 'Отдел',
      departments: 'Отделы',
      roles: 'Роли',
      email: 'Email',
      phone: 'Телефон',
      extension: 'Добавочный',
      tabNumber: 'Табельный номер',
      photo: 'Фото',
      fired: 'Уволен',
      hireDate: 'Дата приема',
      noEmployees: 'Нет сотрудников',
      employeeCreated: 'Сотрудник создан',
      employeeUpdated: 'Сотрудник обновлен',
      employeeDeleted: 'Сотрудник удален',
    },
    
    vacations: {
      title: 'Отпуска',
      newVacation: 'Новый отпуск',
      editVacation: 'Редактировать отпуск',
      deleteVacation: 'Удалить отпуск',
      type: 'Тип',
      startDate: 'Дата начала',
      endDate: 'Дата окончания',
      duration: 'Продолжительность',
      status: 'Статус',
      approve: 'Утвердить',
      reject: 'Отклонить',
      delegate: 'Делегировать',
      delegation: 'Делегирование',
      comment: 'Комментарий',
      justification: 'Обоснование',
      noVacations: 'Нет отпусков',
      vacationCreated: 'Отпуск создан',
      vacationApproved: 'Отпуск утвержден',
      vacationRejected: 'Отпуск отклонен',
    },
    
    notifications: {
      title: 'Уведомления',
      markAsRead: 'Отметить как прочитанное',
      markAllAsRead: 'Отметить все как прочитанные',
      noNotifications: 'Нет уведомлений',
      clearAll: 'Очистить все',
      settings: 'Настройки',
      deadlineReminder: 'Напоминание о дедлайне',
      taskAssigned: 'Задача назначена',
      taskStatusChanged: 'Статус задачи изменен',
      commentAdded: 'Добавлен комментарий',
      mention: 'Упоминание',
    },
    
    errors: {
      validationError: 'Ошибка валидации',
      requiredField: 'Обязательное поле',
      invalidEmail: 'Неверный формат email',
      invalidPhone: 'Неверный формат телефона',
      passwordTooShort: 'Пароль слишком короткий',
      passwordsMismatch: 'Пароли не совпадают',
      emailExists: 'Email уже существует',
      taskNotFound: 'Задача не найдена',
      projectNotFound: 'Проект не найден',
      employeeNotFound: 'Сотрудник не найден',
      vacationNotFound: 'Отпуск не найден',
      permissionDenied: 'Доступ запрещен',
      budgetExceeded: 'Превышение бюджета',
      deadlinePassed: 'Дедлайн прошел',
      invalidDateRange: 'Неверный диапазон дат',
      duplicateCode: 'Код уже существует',
    },
    
    roles: {
      admin: 'Администратор',
      director: 'Генеральный директор',
      economist: 'Экономист',
      kb_chief: 'Главный конструктор',
      head: 'Руководитель подразделения',
      project_lead: 'Ведущий проекта',
      project_manager: 'Менеджер проекта',
      hr: 'HR менеджер',
      executor: 'Исполнитель',
    },
    
    priorities: {
      low: 'Низкий',
      mid: 'Средний',
      high: 'Высокий',
      crit: 'Критический',
    },
    
    taskStatuses: {
      new: 'Новая',
      inwork: 'В работе',
      review: 'На проверке',
      closed: 'Закрыта',
      cancelled: 'Отменена',
    },
    
    projectStatuses: {
      active: 'Активный',
      inactive: 'Неактивный',
      closed: 'Закрыт',
      cancelled: 'Отменен',
    },
    
    vacationTypes: {
      annual: 'Ежегодный',
      admin: 'Административный',
      sick: 'Больничный',
      other: 'Другой',
    },
  },
  
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      close: 'Close',
      confirm: 'Confirm',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      search: 'Search',
      filter: 'Filter',
      reset: 'Reset',
      apply: 'Apply',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      actions: 'Actions',
      status: 'Status',
      date: 'Date',
      time: 'Time',
      author: 'Author',
      description: 'Description',
      comments: 'Comments',
      attachments: 'Attachments',
      history: 'History',
      settings: 'Settings',
      profile: 'Profile',
      logout: 'Logout',
      login: 'Login',
      email: 'Email',
      password: 'Password',
      required: 'Required',
      invalidFormat: 'Invalid format',
      notFound: 'Not found',
      accessDenied: 'Access denied',
      serverError: 'Server error',
      networkError: 'Network error',
      tryAgain: 'Try again',
      refresh: 'Refresh',
      export: 'Export',
      import: 'Import',
      download: 'Download',
      upload: 'Upload',
      select: 'Select',
      all: 'All',
      none: 'None',
      more: 'More',
      less: 'Less',
      showMore: 'Show more',
      showLess: 'Show less',
      expand: 'Expand',
      collapse: 'Collapse',
      and: 'and',
      without: 'without',
      session: 'Session is stored in cookie for 30 days (HttpOnly, Secure, SameSite=Lax — server-side).',
    },
    
    auth: {
      loginTitle: 'Login to System',
      loginButton: 'Login',
      forgotPassword: 'Forgot password?',
      register: 'Register',
      logoutConfirm: 'Are you sure you want to logout?',
      sessionExpired: 'Session expired. Please login again.',
      invalidCredentials: 'Invalid username or password',
      accountLocked: 'Account locked',
      passwordChangeRequired: 'Password change required',
    },
    
    tasks: {
      title: 'Tasks',
      newTask: 'New Task',
      editTask: 'Edit Task',
      deleteTask: 'Delete Task',
      assignee: 'Assignee',
      assignees: 'Assignees',
      creator: 'Creator',
      priority: 'Priority',
      deadline: 'Deadline',
      plannedHours: 'Planned Hours',
      actualHours: 'Actual Hours',
      status: 'Status',
      project: 'Project',
      dependencies: 'Dependencies',
      repeat: 'Repeat',
      archive: 'Archive',
      unarchive: 'Unarchive',
      moveToArchive: 'Move to Archive',
      restoreFromArchive: 'Restore from Archive',
      noTasks: 'No tasks',
      taskCreated: 'Task created',
      taskUpdated: 'Task updated',
      taskDeleted: 'Task deleted',
      statusChanged: 'Status changed',
    },
    
    projects: {
      title: 'Projects',
      newProject: 'New Project',
      editProject: 'Edit Project',
      deleteProject: 'Delete Project',
      name: 'Name',
      code: 'Code',
      manager: 'Manager',
      budget: 'Budget',
      startDate: 'Start Date',
      endDate: 'End Date',
      type: 'Type',
      category: 'Category',
      status: 'Status',
      team: 'Team',
      tasks: 'Tasks',
      noProjects: 'No projects',
      projectCreated: 'Project created',
      projectUpdated: 'Project updated',
      projectDeleted: 'Project deleted',
      budgetExceeded: 'Budget exceeded',
    },
    
    employees: {
      title: 'Employees',
      newEmployee: 'New Employee',
      editEmployee: 'Edit Employee',
      deleteEmployee: 'Delete Employee',
      firstName: 'First Name',
      lastName: 'Last Name',
      middleName: 'Middle Name',
      position: 'Position',
      department: 'Department',
      departments: 'Departments',
      roles: 'Roles',
      email: 'Email',
      phone: 'Phone',
      extension: 'Extension',
      tabNumber: 'Tab Number',
      photo: 'Photo',
      fired: 'Fired',
      hireDate: 'Hire Date',
      noEmployees: 'No employees',
      employeeCreated: 'Employee created',
      employeeUpdated: 'Employee updated',
      employeeDeleted: 'Employee deleted',
    },
    
    vacations: {
      title: 'Vacations',
      newVacation: 'New Vacation',
      editVacation: 'Edit Vacation',
      deleteVacation: 'Delete Vacation',
      type: 'Type',
      startDate: 'Start Date',
      endDate: 'End Date',
      duration: 'Duration',
      status: 'Status',
      approve: 'Approve',
      reject: 'Reject',
      delegate: 'Delegate',
      delegation: 'Delegation',
      comment: 'Comment',
      justification: 'Justification',
      noVacations: 'No vacations',
      vacationCreated: 'Vacation created',
      vacationApproved: 'Vacation approved',
      vacationRejected: 'Vacation rejected',
    },
    
    notifications: {
      title: 'Notifications',
      markAsRead: 'Mark as read',
      markAllAsRead: 'Mark all as read',
      noNotifications: 'No notifications',
      clearAll: 'Clear all',
      settings: 'Settings',
      deadlineReminder: 'Deadline reminder',
      taskAssigned: 'Task assigned',
      taskStatusChanged: 'Task status changed',
      commentAdded: 'Comment added',
      mention: 'Mention',
    },
    
    errors: {
      validationError: 'Validation error',
      requiredField: 'Required field',
      invalidEmail: 'Invalid email format',
      invalidPhone: 'Invalid phone format',
      passwordTooShort: 'Password too short',
      passwordsMismatch: 'Passwords do not match',
      emailExists: 'Email already exists',
      taskNotFound: 'Task not found',
      projectNotFound: 'Project not found',
      employeeNotFound: 'Employee not found',
      vacationNotFound: 'Vacation not found',
      permissionDenied: 'Permission denied',
      budgetExceeded: 'Budget exceeded',
      deadlinePassed: 'Deadline passed',
      invalidDateRange: 'Invalid date range',
      duplicateCode: 'Code already exists',
    },
    
    roles: {
      admin: 'Administrator',
      director: 'Director',
      economist: 'Economist',
      kb_chief: 'Chief Designer',
      head: 'Department Head',
      project_lead: 'Project Lead',
      project_manager: 'Project Manager',
      hr: 'HR Manager',
      executor: 'Executor',
    },
    
    priorities: {
      low: 'Low',
      mid: 'Medium',
      high: 'High',
      crit: 'Critical',
    },
    
    taskStatuses: {
      new: 'New',
      inwork: 'In Work',
      review: 'In Review',
      closed: 'Closed',
      cancelled: 'Cancelled',
    },
    
    projectStatuses: {
      active: 'Active',
      inactive: 'Inactive',
      closed: 'Closed',
      cancelled: 'Cancelled',
    },
    
    vacationTypes: {
      annual: 'Annual',
      admin: 'Administrative',
      sick: 'Sick Leave',
      other: 'Other',
    },
  },
};

export const defaultLanguage: Language = 'ru';
