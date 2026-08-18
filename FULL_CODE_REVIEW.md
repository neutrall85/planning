# 🔍 ПОЛНЫЙ КОД-РЕВЮ ПРОЕКТА СИСТЕМЫ УЧЁТА ВРЕМЕНИ И CRM

**Дата проведения:** 2026  
**Тип приложения:** React + Vite SPA (Система управления задачами и проектами)  
**Объём кода:** ~8,000+ строк в src/  
**Статус TypeScript миграции:** Частичная (~35%)  
**Статус тестирования:** 0% покрытие  

---

## 📊 СОДЕРЖАНИЕ

1. [Критические ошибки компиляции и линтинга](#1-критические-ошибки-компиляции-и-линтинга)
2. [Архитектурные проблемы](#2-архитектурные-проблемы)
3. [Проблемы типизации TypeScript](#3-проблемы-типизации-typescript)
4. [Безопасность](#4-безопасность)
5. [Производительность](#5-производительность)
6. [Валидация данных](#6-валидация-данных)
7. [Код-стиль и maintainability](#7-код-стиль-и-maintainability)
8. [Конфигурация и окружение](#8-конфигурация-и-окружение)
9. [Логирование и мониторинг](#9-логирование-и-мониторинг)
10. [UX/UI и Accessibility](#10-uxui-и-accessibility)
11. i18n (Интернационализация)](#11-i18n-интернационализация)
12. [Тестирование](#12-тестирование)
13. [Зависимости и инфраструктура](#13-зависимости-и-инфраструктура)
14. [План исправлений по приоритетам](#14-план-исправлений-по-приоритетам)

---

## 1. КРИТИЧЕСКИЕ ОШИБКИ КОМПИЛЯЦИИ И ЛИНТИНГА

### 1.1. Ошибки ESLint (29 ошибок, 3 предупреждения)

#### Файл: `src/services/DataStore.js` — 18 ошибок

**Критическая ошибка #1: Отсутствие импорта `sanitizeHtml`**
```javascript
// Строка 59
const safeTitle = sanitizeHtml(task.title); // ❌ no-undef
```
**Проблема:** Функция `sanitizeHtml` определена в `src/utils/sanitization/index.ts`, но не импортирована в DataStore.js. Это приведёт к runtime ошибке `ReferenceError: sanitizeHtml is not defined`.

**Решение:** Добавить импорт:
```javascript
import { sanitizeHtml } from '../utils/sanitization';
```

---

**Критическая ошибка #2: Отсутствие импорта `fmtDMY`**
```javascript
// Строки 312, 316, 328, 364, 609, 620
const deadlineStr = fmtDMY(task.deadline); // ❌ no-undef
```
**Проблема:** Функция `fmtDMY` используется многократно, но не импортирована из `utils/date.ts`.

**Решение:** Добавить в импорт:
```javascript
import { iso, addMonths, TODAY, uid, fmtDMY } from '../utils/date';
```

---

**Критическая ошибка #3: Отсутствие импорта `VACATION_TYPES`**
```javascript
// Строка 610
if (!Object.values(VACATION_TYPES).includes(type)) { // ❌ no-undef
```
**Проблема:** Константа `VACATION_TYPES` не определена и не импортирована.

**Решение:** Импортировать из `utils/constants.ts` или определить локально.

---

**Критическая ошибка #4: Неопределённая переменная `msg`**
```javascript
// Строка 558
this.addNotification(empId, msg, ...); // ❌ no-undef
```
**Проблема:** Переменная `msg` используется, но не была объявлена в области видимости.

**Решение:** Проверить контекст и определить переменную корректно.

---

**Предупреждение: Пустые блоки и неиспользуемые переменные**
```javascript
// Строка 233 - пустой блок catch
catch {} // ❌ no-empty

// Строка 269, 555, 557, 692, 693 - неиспользуемые переменные
const changes = [...]; // ❌ no-unused-vars
const targetTitle = ...; // ❌ no-unused-vars
```

---

#### Файл: `src/components/Gantt.jsx` — 1 ошибка React Compiler

**Проблема:** Нарушение правил мемоизации
```javascript
const ganttData = useMemo(() => {
  // ...
}, [tasks, db.projects, anchor, range, scope]);
```
**Ошибка:** React Compiler не может оптимизировать компонент из-за несоответствия зависимостей. Зависимость `db` мутирует, что нарушает правила хуков.

**Решение:** Использовать селекторы или разбить на более мелкие useMemo.

---

#### Файл: `src/components/Kanban.jsx` — 1 предупреждение

**Проблема:** Missing dependency
```javascript
const filtered = useMemo(() => {
  // использует db
}, []); // ❌ missing dependency: 'db'
```

**Решение:** Добавить `db` в зависимости или использовать useCallback для стабильности.

---

#### Файл: `src/components/Modals/TaskModal.jsx` — 2 ошибки React Compiler

**Проблема:** Нестабильные зависимости useMemo
```javascript
}, [readOnly, f.assigneeIds, f.start, f.deadline, hasDelegate, originalAssignee, db]);
//                                                                                          ^^ db мутирует
```

**Решение:** Стабилизировать `db` через useMemo в родителе или использовать селекторы.

---

#### Файл: `src/components/Reports.jsx` — 2 предупреждения

**Проблема:** Логические выражения в зависимостях useMemo
```javascript
const allProjects = data?.projects || []; // Делает зависимости нестабильными
const filtered = useMemo(() => {...}, [allProjects]); // ⚠️ exhaustive-deps
```

**Решение:** Переместить логику внутрь useMemo.

---

#### Файл: `src/context/StoreContext.jsx` — 2 ошибки

**Проблема 1:** Fast refresh нарушение
```javascript
export const useStore = () => {...}; // ❌ react-refresh/only-export-components
```

**Проблема 2:** Неиспользуемая переменная
```javascript
const selectData = (state) => state; // ❌ no-unused-vars
```

---

#### Файл: `src/components/Toast.jsx` — 1 ошибка

**Проблема:** Экспорт не-компонента из файла с компонентом
```javascript
export const TOAST_DURATION = 3000; // ❌ react-refresh/only-export-components
```

**Решение:** Переместить константы в отдельный файл.

---

### 1.2. Ошибки TypeScript (1 ошибка)

#### Файл: `src/utils/sanitization/index.ts` — Строка 56

```typescript
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (m) => map[m]); 
  //                                              ^^^^^^^^ 
  // TS2769: Type 'string | undefined' is not assignable to type 'string'
};
```

**Проблема:** `map[m]` может вернуть `undefined`, если ключ не найден (хотя регекс гарантирует匹配). TypeScript не может это доказать.

**Решение:** Добавить non-null assertion или default значение:
```typescript
return text.replace(/[&<>"']/g, (m) => map[m]!);
// или
return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
```

---

## 2. АРХИТЕКТУРНЫЕ ПРОБЛЕМЫ

### 2.1. Монолитный класс DataStore (861 строка)

**Файл:** `src/services/DataStore.js`

**Ответственность класса включает:**
- ✅ Аутентификация и авторизация (login, logout)
- ✅ Управление задачами (upsertTask, deleteTask, generateRepeatTasks)
- ✅ Управление проектами (upsertProject, deleteProject)
- ✅ Управление сотрудниками (upsertEmployee, fireEmployee)
- ✅ Управление отпусками (requestVacation, approveVacation)
- ✅ Управление запросами часов (requestHours, approveHours)
- ✅ Уведомления (addNotification, markNotificationRead)
- ✅ Аудит (addAudit)
- ✅ Архивация (_archiveOldTasks)
- ✅ Проверка дедлайнов (_checkAllDeadlines)
- ✅ Делегирование задач
- ✅ Подписка на изменения (subscribe, _notify)

**Проблемы:**
1. **Нарушение Single Responsibility Principle** — класс делает слишком много
2. **Невозможность тестирования** — нельзя протестировать одну функцию без мока всего остального
3. **Сложность поддержки** — изменение одной функции может сломать другие
4. **Отсутствие инкапсуляции** — все данные хранятся в `_data`, прямой доступ извне
5. **Нет интерфейса для API** — вся логика завязана на mock-данные

**Текущий статус исправления:**
- ✅ Создан `BaseRepository.ts` — базовый класс для CRUD
- ✅ Создан `useTaskOperations.ts` — хук для бизнес-логики задач
- ❌ DataStore всё ещё монолитный и не использует репозитории
- ❌ Нет сервисов для других сущностей (ProjectService, EmployeeService и т.д.)

**Рекомендуемая структура:**
```
src/services/
├── repositories/
│   ├── BaseRepository.ts ✅
│   ├── TaskRepository.ts (создать)
│   ├── ProjectRepository.ts (создать)
│   └── EmployeeRepository.ts (создать)
├── services/
│   ├── AuthService.ts (создать)
│   ├── TaskService.ts (создать)
│   ├── ProjectService.ts (создать)
│   ├── VacationService.ts (создать)
│   └── NotificationService.ts (создать)
└── api/
    ├── httpClient.ts (создать)
    └── endpoints.ts (создать)
```

---

### 2.2. Смешение бизнес-логики и UI

**Файл:** `src/components/Modals/TaskModal.jsx` (796 строк)

**Бизнес-логика внутри компонента:**
```javascript
// Генерация повторяющихся задач (строки 17-130+)
function generateRepeatDates(startDate, deadline, repeatConfig, endDate, maxCount = 100) {
  // 113 строк сложной логики дат
}

// Проверка бюджета проекта (внутри компонента)
const validateBudget = (task) => {
  // Логика проверки суммы часов
}

// Уведомления о смене статуса
const notifyStatusChange = (oldTask, newTask) => {
  // Логика отправки уведомлений
}
```

**Проблемы:**
1. **Невозможность переиспользования** — логика заперта в UI компоненте
2. **Сложность тестирования** — нужно рендерить компонент для теста логики
3. **Violation of Separation of Concerns** — UI должен только отображать данные
4. **Раздутый компонент** — 796 строк сложно читать и поддерживать

**Текущий статус исправления:**
- ✅ Создан `useTaskOperations.ts` с вынесенной логикой
- ❌ TaskModal.jsx НЕ использует этот хук
- ❌ generateRepeatDates всё ещё внутри компонента
- ❌ Старая логика дублируется

**Требуется:**
1. Интегрировать `useTaskOperations` в TaskModal
2. Удалить дублирующуюся логику из компонента
3. Вынести `generateRepeatDates` в отдельный utility модуль
4. Сократить компонент до <200 строк

---

### 2.3. Отсутствие backend-интеграции

**Файл:** `src/mocks/dataMock.js`, `src/services/DataStore.js`

**Проблемы:**
1. **Все данные в памяти браузера** — перезагрузка страницы = потеря данных
2. **Plaintext пароли в коде** — критическая уязвимость безопасности
3. **Нет синхронизации между пользователями** — каждый видит свои данные
4. **Папка `src/services/api/` пуста** — нет HTTP клиента, endpoints
5. **Logger отправляет на несуществующий `/api/logs`**

**Mock-данные включают чувствительную информацию:**
```javascript
{ 
  id: "sergey.adminov", 
  pass: "Admin2026!", // ❌ Пароль в открытом виде
  email: "sergey.adminov" 
}
```

**Требуется:**
1. Разработать REST API или GraphQL бэкенд
2. Заменить DataStore на сервисный слой с HTTP клиентом
3. Добавить localStorage/indexedDB как временное решение
4. Удалить пароли из mock-данных

---

### 2.4. Глобальное состояние через Context без оптимизации

**Файл:** `src/context/StoreContext.jsx`

```javascript
export const StoreProvider = ({ children }) => {
  const [store] = useState(() => new DataStore());
  const [data, setData] = useState(store.data);

  useEffect(() => {
    const unsub = store.subscribe((newData) => {
      setData(newData); // ❌ Каждый change вызывает ре-рендер ВСЕГО дерева
    });
    return unsub;
  }, [store]);

  return (
    <StoreContext.Provider value={{ store, data, login, logout }}>
      {children}
    </StoreContext.Provider>
  );
};
```

**Проблемы:**
1. **Избыточные ре-рендеры** — любое изменение данных перерисовывает все компоненты
2. **Нет селекторов** — нельзя подписаться только на tasks или projects
3. **Контекст не разделён** — auth, tasks, projects в одном месте
4. **useMemo не помогает** — data полностью заменяется при каждом изменении

**Текущий статус:**
- ✅ Добавлен useMemo для data
- ✅ Добавлен useCallback для login/logout
- ❌ Контекст всё ещё единый
- ❌ Нет селекторов
- ❌ unused variable `selectData`

**Рекомендуемое решение:**
```javascript
// Разделить на несколько контекстов
const AuthContext = createContext();
const TaskContext = createContext();
const ProjectContext = createContext();

// Или использовать Zustand/Jotai для гранулярных обновлений
import { create } from 'zustand';

const useTaskStore = create((set) => ({
  tasks: [],
  upsertTask: (task) => set((state) => ({ 
    tasks: [...state.tasks.filter(t => t.id !== task.id), task] 
  })),
}));
```

---

## 3. ПРОБЛЕМЫ ТИПИЗАЦИИ TYPESCRIPT

### 3.1. Неполная миграция на TypeScript

**Статус миграции:**

| Категория | Файлы .ts/.tsx | Файлы .js/.jsx | % TypeScript |
|-----------|----------------|----------------|--------------|
| Utils     | 5              | 6              | 45%          |
| Services  | 2              | 1              | 67%          |
| Hooks     | 1              | 4              | 20%          |
| Components| 0              | 35+            | 0%           |
| Types     | 1              | 0              | 100%         |
| **TOTAL** | **9**          | **46+**        | **~16%**     |

**Критические файлы без типов:**
1. `src/services/DataStore.js` — 861 строка, ядро приложения
2. `src/utils/permissions.js` — 401 строка, бизнес-логика прав доступа
3. `src/components/Modals/TaskModal.jsx` — 796 строк
4. `src/components/Projects.jsx`, `Kanban.jsx`, `Gantt.jsx` — по 300-500 строк
5. `src/mocks/dataMock.js` — 400+ строк данных
6. `src/config/rbacConfig.js` — конфигурация RBAC
7. `src/utils/validation/index.js` — Zod схемы (должны быть .ts!)
8. `src/context/StoreContext.jsx` — 38 строк, но критичен
9. `src/hooks/useAuth.js`, `useStore.js`, `useDragAndDrop.js`

**Проблемы смешанной типизации:**
```javascript
// DataStore.js импортирует .ts файл с явным расширением
import { iso, addMonths, TODAY, uid } from '../utils/date.ts'; // ❌
```

Это нарушает разрешение модулей Vite/TypeScript и может вызвать:
- Ошибки сборки в production
- Проблемы с tree-shaking
- Некорректную работу hot-reload

**Правильный подход:**
```javascript
import { iso, addMonths, TODAY, uid } from '../utils/date'; // ✅
```

---

### 3.2. JSDoc типизация не применяется

**Файл:** `src/types/index.ts` содержит отличные типы:
```typescript
export interface Employee {
  id: string;
  last: string;
  first: string;
  roles: Role[];
  // ...
}
```

Но в JS файлах они не используются:
```javascript
// DataStore.js - нет типизации
login(email, password) {
  const found = this._data.employees.find(e => e.email === email);
  // e имеет тип any, нет autocomplete, нет проверок
}
```

**Решение A (полная миграция):**
Конвертировать файл в `.ts` и использовать типы напрямую.

**Решение B (JSDoc):**
```javascript
/**
 * @param {string} email
 * @param {string} password
 * @returns {Employee | null}
 */
login(email, password) {
  /** @type {Employee | undefined} */
  const found = this._data.employees.find(e => e.email === email);
  return found || null;
}
```

---

### 3.3. Проблемы в существующих TS файлах

#### `src/utils/sanitization/index.ts`

**Ошибка компиляции (строка 56):**
```typescript
return text.replace(/[&<>"']/g, (m) => map[m]);
// Type 'string | undefined' is not assignable to type 'string'
```

**Причина:** TypeScript не может гарантировать, что `map[m]` всегда вернёт значение, хотя регекс гарантирует匹配 ключей.

**Решение:**
```typescript
return text.replace(/[&<>"']/g, (m) => map[m]!); // Non-null assertion
```

#### `src/i18n/translations.ts`

**Проблема:** Файл содержит только интерфейсы и структуру, но нет реализации перевода всех строк в приложении.

**Требуется:**
1. Заменить все хардкоженные строки в компонентах на `t('section.key')`
2. Добавить недостающие переводы
3. Интегрировать I18nProvider в корень приложения

#### `src/i18n/index.tsx`

**Проблема:** Хук создан, но НЕ интегрирован в приложение.

```javascript
// src/index.jsx - I18nProvider отсутствует ❌
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
```

**Требуется:**
```javascript
import { I18nProvider } from './i18n';

root.render(
  <ErrorBoundary>
    <I18nProvider>
      <App />
    </I18nProvider>
  </ErrorBoundary>
);
```

---

## 4. БЕЗОПАСНОСТЬ

### 4.1. Plaintext пароли в коде — КРИТИЧЕСКАЯ УЯЗВИМОСТЬ

**Файл:** `src/mocks/dataMock.js`

```javascript
const employees = [
  { 
    id: "sergey.adminov", 
    pass: "Admin2026!", // ❌ ПАРОЛЬ В ОТКРЫТОМ ВИДЕ
    email: "sergey.adminov",
    roles: ["admin"]
  },
  { 
    id: "aleksey.gendirov", 
    pass: "Director2026!", // ❌
    // ...
  },
  // ... ещё 25 сотрудников с паролями
];
```

**Уязвимости:**
1. **Пароли видны в исходном коде** — любой разработчик видит все пароли
2. **Пароли передаются на фронтенд** — могут быть извлечены через DevTools
3. **Сравнение паролей прямое** — `found.pass === password`
4. **Нет хеширования** — bcrypt, argon2 не используются
5. **Нет salt** — одинаковые пароли имеют одинаковый хеш (если бы был)

**Решение:**
1. Немедленно удалить пароли из репозитория
2. Для mock-режима использовать token-based аутентификацию
3. При переходе на бэкенд:
   - Хешировать пароли bcrypt/argon2
   - Использовать JWT tokens
   - Реализовать refresh token rotation

---

### 4.2. Отсутствие HTTPS и защиты токенов

**Проблемы:**
1. **Нет принудительного HTTPS** — данные передаются открыто
2. **Нет Secure/HttpOnly cookies** — токены уязвимы для XSS
3. **Нет CSRF protection** — возможна подделка запросов
4. **Нет rate limiting** — bruteforce атаки возможны
5. **MAX_LOGIN_ATTEMPTS = 5** — блокировка есть, но только в памяти

**В DataStore.js:**
```javascript
if (found && found.lockUntil && Date.now() < found.lockUntil) {
  // Блокировка работает только в памяти браузера
  // После перезагрузки счётчик сбрасывается
}
```

**Решение:**
1. Внедрить HTTPS в production
2. Использовать HttpOnly cookies для токенов
3. Добавить CSRF tokens
4. Реализовать rate limiting на бэкенде
5. Хранить счётчик попыток на сервере

---

### 4.3. XSS уязвимости — ЧАСТИЧНО ИСПРАВЛЕНО

**Текущий статус:**
- ✅ Создан `src/utils/sanitization/index.ts`
- ✅ Функции `sanitizeHtml`, `escapeHtml` реализованы
- ⚠️ `sanitizeHtml` НЕ импортирован в DataStore.js (ошибка линтинга)
- ⚠️ Компоненты не используют санитизацию

**Где требуется санитизация:**

1. **DataStore.js — уведомления:**
```javascript
const safeTitle = sanitizeHtml(task.title); // ❌ sanitizeHtml не импортирован
const notifText = `До срока выполнения задачи "${safeTitle}"...`;
```

2. **TaskModal.jsx — обсуждение:**
```javascript
// Комментарии пользователей могут содержать <script> теги
<Discussion comments={comments} /> // ❌ Нет санитизации
```

3. **MentionPopup.jsx — поиск сотрудников:**
```javascript
// Поиск по имени может вернуть вредоносный input
const filtered = employees.filter(e => e.last.includes(query));
```

**Проблема текущей реализации sanitizeHtml:**
```typescript
export const sanitizeHtml = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input; // ✅ Безопасно
  return div.innerHTML;    // ✅ Экранирует HTML
};
```

**Ограничения:**
- Не защищает от CSS-инъекций
- Не удаляет dangerous protocols в URL
- Не поддерживает whitelist тегов (если нужно разрешить `<b>`, `<i>`)

**Рекомендация:** Использовать DOMPurify для production:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';

export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};
```

---

### 4.4. Injection уязвимости

**Проблема:** Отсутствует валидация входных данных в DataStore.

```javascript
upsertTask(task) {
  // Нет валидации task перед сохранением
  // Пользователь может отправить:
  // { title: "<script>alert('XSS')</script>", plannedHours: -100 }
  this._data.tasks.push(task);
}
```

**Zod схемы существуют, но не используются:**
```javascript
// src/utils/validation/index.js
export const taskSchema = z.object({...}); // ✅ Создана
// Но в DataStore.js нет: taskSchema.parse(task) ❌
```

**Решение:**
1. Интегрировать Zod валидацию в методы DataStore
2. Валидировать все входные данные
3. Санизировать перед сохранением

---

## 5. ПРОИЗВОДИТЕЛЬНОСТЬ

### 5.1. Избыточные ре-рендеры

**Файл:** `src/context/StoreContext.jsx`

**Проблема:** Каждая мутация данных вызывает ре-рендер ВСЕГО приложения.

```javascript
const [data, setData] = useState(store.data);

useEffect(() => {
  const unsub = store.subscribe((newData) => {
    setData(newData); // ❌ Новый объект каждый раз
  });
  return unsub;
}, [store]);
```

**Сценарий:**
1. Пользователь добавляет комментарий к задаче
2. `setData()` вызывается с новым объектом `data`
3. Все компоненты, использующие `useStore().data`, ре-рендерятся
4. Даже если компонент отображает только список проектов, он перерисовывается

**Количество компонентов,受影响:**
- TaskList.jsx
- Kanban.jsx
- Gantt.jsx
- Projects.jsx
- Reports.jsx
- Cabinet.jsx
- Journal.jsx
- И ещё 20+ компонентов

**Решение 1: Разделить контекст**
```javascript
const AuthContext = createContext();
const DataContext = createContext();

// Компоненты подписываются только на нужный контекст
```

**Решение 2: Использовать селекторы**
```javascript
// Как в Redux
const tasks = useStoreSelector(state => state.tasks);
// Ре-рендер только при изменении tasks
```

**Решение 3: Использовать Zustand/Jotai**
```javascript
import { create } from 'zustand';

const useTaskStore = create((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
}));

// В компоненте:
const tasks = useTaskStore(state => state.tasks);
// Ре-рендер только при изменении tasks
```

---

### 5.2. Отсутствие мемоизации

**Файл:** `src/components/TaskList.jsx`, `Kanban.jsx`, `Gantt.jsx`

**Проблема:** Крупные списки рендерятся полностью при любом изменении.

```javascript
// TaskList.jsx
const filteredTasks = tasks.filter(t => 
  t.status === filter && 
  t.assigneeIds.includes(userId)
); // ❌ Фильтрация на каждый рендер

return filteredTasks.map(task => <TaskItem key={task.id} {...task} />);
// ❌ TaskItem не обернут в React.memo
```

**Требуется:**
1. Обернуть крупные компоненты в `React.memo`
2. Использовать `useMemo` для тяжёлых вычислений
3. Использовать `useCallback` для колбэков

**Пример правильной оптимизации:**
```javascript
const TaskItem = React.memo(({ task, onEdit }) => {
  // ...
});

const TaskList = ({ tasks, filter }) => {
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  const handleEdit = useCallback((task) => {
    // ...
  }, []);

  return filteredTasks.map(task => (
    <TaskItem key={task.id} task={task} onEdit={handleEdit} />
  ));
};
```

---

### 5.3. Неоптимальная работа с массивами

**Файл:** `src/services/DataStore.js`

**Проблема:** Линейный поиск O(n) вместо O(1).

```javascript
// Поиск сотрудника по ID
const emp = this._data.employees.find(e => e.id === id); // O(n)

// Поиск задачи
const task = this._data.tasks.find(t => t.id === taskId); // O(n)

// При 1000 сотрудниках и 5000 задачах это становится узким местом
```

**Решение:** Использовать Map для индексации.

```javascript
class DataStore {
  constructor() {
    this._data = buildMockData();
    this._employeeMap = new Map(this._data.employees.map(e => [e.id, e]));
    this._taskMap = new Map(this._data.tasks.map(t => [t.id, t]));
  }

  getEmployee(id) {
    return this._employeeMap.get(id); // O(1)
  }
}
```

**Требуется также:**
- Индексировать проекты по ID
- Индексировать задачи по projectId
- Индексировать задачи по assigneeIds
- Использовать виртуализацию для больших списков (react-window)

---

### 5.4. Тяжёлые вычисления в render

**Файл:** `src/components/Gantt.jsx` (строка 41)

```javascript
const ganttData = useMemo(() => {
  if (!tasks.length) return null;
  
  const days = [];
  const months = [];
  const groups = [];
  
  // 50+ строк сложных вычислений дат и группировок
  for (const task of tasks) {
    // Вычисления для каждой задачи
  }
  
  return { days, months, groups };
}, [tasks, db.projects, anchor, range, scope]);
```

**Проблема:** Ошибка React Compiler из-за неправильных зависимостей.

**Решение:**
1. Исправить зависимости (убрать `db`)
2. Разбить на несколько useMemo
3. Вынести в web worker если очень тяжело

---

## 6. ВАЛИДАЦИЯ ДАННЫХ

### 6.1. Zod схемы не интегрированы

**Файл:** `src/utils/validation/index.js`

**Существующие схемы:**
```javascript
export const companyEmailSchema = z.string()...;
export const passwordSchema = z.string()...;
export const taskSchema = z.object({...});
export const projectSchema = z.object({...});
export const employeeSchema = z.object({...});
export const vacationSchema = z.object({...});
```

**Проблема:** Схемы НЕ используются в DataStore или компонентах.

```javascript
// DataStore.js
upsertTask(task) {
  // ❌ Нет валидации: taskSchema.parse(task)
  const existing = this._data.tasks.find(t => t.id === task.id);
  if (existing) {
    Object.assign(existing, task);
  } else {
    this._data.tasks.push(task);
  }
}
```

**Последствия:**
- Можно сохранить задачу с отрицательными часами
- Можно сохранить проект без обязательных полей
- Можно сохранить отпуск с датами в прошлом
- Нет гарантий целостности данных

**Решение:**
```javascript
import { taskSchema } from '../utils/validation';

upsertTask(task) {
  const validated = taskSchema.parse(task); // ✅ Валидация
  const sanitized = sanitizeObject(validated); // ✅ Санитизация
  
  // Дальше сохранение
}
```

---

### 6.2. Дублирование валидации в компонентах

**Файл:** `src/components/Modals/TaskModal.jsx`

```javascript
// Валидация в компоненте
const [errors, setErrors] = useState({});

const validateForm = () => {
  const newErrors = {};
  if (!f.title?.trim()) newErrors.title = 'Название обязательно';
  if (f.plannedHours < 0) newErrors.plannedHours = 'Часы не могут быть отрицательными';
  // ...
  return newErrors;
};
```

**Проблема:** Та же логика должна быть в DataStore, но дублируется в UI.

**Решение:**
1. Удалить валидацию из компонентов
2. Использовать Zod схемы в DataStore
3. Возвращать ошибки валидации из сервиса
4. Компоненты только отображают ошибки

---

### 6.3. Отсутствие валидации на уровне БД

**Проблема:** При переходе на реальную БД потребуется:
- UNIQUE constraints на email сотрудников
- FOREIGN KEY constraints на projectId в задачах
- CHECK constraints на plannedHours >= 0
- NOT NULL constraints на обязательные поля

**Рекомендация:** Синхронизировать Zod схемы с constraints БД.

---

## 7. КОД-СТИЛЬ И MAINTAINABILITY

### 7.1. Нарушение правил хуков React

**Файл:** `src/components/Modals/TaskModal.jsx`

```javascript
function TaskModal({ taskId, onClose }) {
  const { data, store } = useStore();
  const ur = store.getCurrentUser();
  
  // Условная логика ДО хуков
  const existing = taskId ? data.tasks.find(t => t.id === taskId) : null;
  const readOnly = !!(existing && existing.archived);
  
  // Хуки после условной логики ⚠️
  const [f, setF] = useState(existing ? {...existing} : defaults);
  const [comments, setComments] = useState([]);
  
  // ...
}
```

**Проблема:** Хотя формально хуки не внутри условий, наличие логики между ними может привести к ошибкам при рефакторинге.

**Решение:** Переместить всю логику после всех хуков.

```javascript
function TaskModal({ taskId, onClose }) {
  // ВСЕ хуки сверху
  const { data, store } = useStore();
  const ur = store.getCurrentUser();
  const [f, setF] = useState(null);
  const [comments, setComments] = useState([]);
  
  // Логика после
  const existing = taskId ? data.tasks.find(t => t.id === taskId) : null;
  const readOnly = !!(existing && existing.archived);
  
  useEffect(() => {
    if (existing) setF({...existing});
  }, [existing]);
  
  // ...
}
```

---

### 7.2. Магические числа и строки

**Файл:** `src/utils/config.ts` — хорошо, но не везде используется.

**Примеры магических значений в коде:**

```javascript
// TaskModal.jsx
function generateRepeatDates(..., maxCount = 100) { // ✅ Есть MAX_REPEAT_INSTANCES = 100
  // Но используется хардкод вместо константы
}

// DataStore.js
setTimeout(() => {...}, delay); // ❌ delay не определён явно

// Reports.jsx
const PAGE_SIZE = 20; // ❌ Есть DEFAULT_PAGE_SIZE = 20 в config
```

**Решение:**
1. Заменить все магические числа на константы из config
2. Добавить комментарии с обоснованием значений
3. Настроить ESLint правило `no-magic-numbers`

---

### 7.3. Длинные функции и компоненты

**Статистика по файлам:**

| Файл | Строк | Макс. рекомендуемый размер | Статус |
|------|-------|---------------------------|--------|
| DataStore.js | 861 | 300 | ❌ Критично |
| TaskModal.jsx | 796 | 200 | ❌ Критично |
| permissions.js | 401 | 200 | ❌ Критично |
| dataMock.js | 400+ | 100 | ❌ Критично |
| Gantt.jsx | ~350 | 200 | ⚠️ Превышен |
| Kanban.jsx | ~300 | 200 | ⚠️ Превышен |
| Reports.jsx | ~250 | 200 | ⚠️ Превышен |

**Функции >50 строк:**
- `generateRepeatDates()` — 113 строк
- `upsertTask()` — ~100 строк
- `_checkAllDeadlines()` — ~30 строк
- `checkBusinessRules()` — ~80 строк

**Решение:**
1. Декомпозиция на функции ≤20-30 строк
2. Выделение подкомпонентов
3. Паттерн Compound Components

---

### 7.4. Несогласованное именование

**Проблемы:**

1. **Смесь стилей именования:**
```javascript
kbIds, headDeptIds // camelCase ✅
assignee_ids // snake_case ❌ (если есть)
```

2. **Русские комментарии:**
```javascript
// === ЗАДАЧИ ===
// Специфичные бизнес-правила
```

3. **Разные стили для похожих сущностей:**
```javascript
TASK_STATUSES // UPPER_CASE для констант
TaskStatus // PascalCase для типа TypeScript
taskStatuses // camelCase для переменной
```

**Решение:**
1. Принять единый стиль (camelCase для JS/TS переменных)
2. Комментарии на одном языке (рекомендуется английский для международного кода)
3. Настроить ESLint/Prettier

---

## 8. КОНФИГУРАЦИЯ И ОКРУЖЕНИЕ

### 8.1. Hardcoded домены компании

**Файл:** `src/utils/config.ts`

```typescript
export const ALLOWED_EMAIL_DOMAINS = [
  "volga-dnepr.com",
  "volgadnepr.com",
  "vd-aviation.com",
] as const;
```

**Проблема:** Домены захардкожены, нельзя изменить для другого клиента.

**Решение:** Вынести в `.env`:
```env
VITE_ALLOWED_EMAIL_DOMAINS=volga-dnepr.com,volgadnepr.com,vd-aviation.com
```

```typescript
export const ALLOWED_EMAIL_DOMAINS = import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS.split(',');
```

---

### 8.2. Отсутствие environment конфигурации

**Проблема:** Нет разделения на dev/staging/prod.

**Требуется:**
```
.env.development
.env.staging
.env.production
```

**Пример:**
```env
# .env.development
VITE_API_URL=http://localhost:3000/api
VITE_LOG_LEVEL=debug

# .env.production
VITE_API_URL=https://api.company.com
VITE_LOG_LEVEL=error
```

---

### 8.3. Конфигурация RBAC захардкожена

**Файл:** `src/config/rbacConfig.js`

```javascript
export const RBAC_CONFIG = {
  admin: { '*': ['*'] },
  director: { task: ['create', 'edit', 'delete'], ... },
  // ...
};
```

**Проблема:** Роли и права нельзя изменить без перекомпиляции.

**Решение:** Загружать конфиг с сервера или из `.env`.

---

## 9. ЛОГИРОВАНИЕ И МОНИТОРИНГ

### 9.1. Logger отправляет на несуществующий endpoint

**Файл:** `src/utils/logging/logger.ts`

```typescript
const sendToServer = async (logEntry: LogEntry): Promise<void> => {
  if ((import.meta as any).env?.PROD) {
    try {
      await fetch('/api/logs', { // ❌ Endpoint не существует
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      });
    } catch {
      // Silently fail
    }
  }
};
```

**Проблема:** В production логи теряются, так как endpoint не существует.

**Решение:**
1. Интегрировать Sentry/Datadog/New Relic
2. Настроить реальный endpoint для логов
3. Добавить source maps для production

---

### 9.2. Отсутствие аудита критических операций

**Файл:** `src/services/DataStore.js`

**Текущий аудит:**
```javascript
addAudit(action, details, targetType, targetId) {
  this._data.audit.push({
    timestamp: new Date().toISOString(),
    userId: this._currentUser?.id,
    action,
    details,
    targetType,
    targetId,
  });
}
```

**Проблема:** Аудит вызывается не для всех критических операций.

**Отсутствует аудит для:**
- ❌ Изменения ролей пользователя
- ❌ Изменения бюджета проекта
- ❌ Массового удаления задач
- ❌ Экспорта данных
- ❌ Изменения настроек системы

**Решение:** Добавить аудит для всех мутаций.

---

### 9.3. Глобальный перехват ошибок настроен, но не тестируется

**Файл:** `src/utils/logging/logger.ts`

```typescript
window.addEventListener('error', (event) => {
  logger.errorWithStack(event.error, '[Global Error]', {...});
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('[Unhandled Promise Rejection]', {...});
});
```

**Проблема:** Нет тестов, проверяющих работу глобальных обработчиков.

**Решение:** Добавить тесты на перехват ошибок.

---

## 10. UX/UI И ACCESSIBILITY

### 10.1. Отсутствие ARIA атрибутов — КРИТИЧНО

**Проверка компонентов:**

```bash
grep -r "aria-" /workspace/src/components
# Результат: пусто ❌
```

**Проблемы:**

1. **Модальные окна без ARIA:**
```javascript
// Modal.jsx
<div className="overlay">
  <div className="modal">
    <h3>{title}</h3>
    {/* Нет aria-modal, role="dialog" */}
  </div>
</div>
```

2. **Кнопки без aria-label:**
```javascript
<button className="icon-btn" onClick={onClose}>
  <Ic d={ICONS.x} size={16} /> {/* Нет aria-label="Закрыть" */}
</button>
```

3. **Списки без role:**
```javascript
<ul>
  {tasks.map(task => <li key={task.id}>...</li>)}
  {/* Нет role="list", aria-label="Список задач" */}
</ul>
```

**Требуется:**
1. Добавить `role="dialog"`, `aria-modal="true"` в модальные окна
2. Добавить `aria-label` к кнопкам с иконками
3. Добавить `role="navigation"`, `aria-label` к навигации
4. Добавить `aria-live` для динамических уведомлений
5. Добавить `tabIndex` для keyboard navigation
6. Добавить focus trap в модальных окнах

---

### 10.2. Keyboard navigation не реализована

**Проблемы:**

1. **Модальные окна:**
```javascript
// Modal.jsx
useEffect(() => {
  const handler = (e) => { if (e.key === 'Escape') onClose(); };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [onClose]);
```
✅ Escape работает, но:
- ❌ Нет Tab trapping (фокус уходит за пределы модалки)
- ❌ Нет автофокуса на первом элементе
- ❌ Нет возврата фокуса после закрытия

2. **Выпадающие списки:**
- ❌ Нет навигации стрелками вверх/вниз
- ❌ Нет Enter для выбора
- ❌ Нет Home/End для перехода к началу/концу

3. **Таблицы и списки:**
- ❌ Нет навигации стрелками
- ❌ Нет Space для выделения

**Решение:**
1. Реализовать focus trap в модальных окнах
2. Добавить автофокус на первый интерактивный элемент
3. Возвращать фокус на триггер после закрытия
4. Реализовать keyboard навигацию для всех интерактивных элементов

---

### 10.3. Color contrast не проверен

**Проблема:** Нет проверки контрастности цветов.

**Требуется:**
1. Проверить контрастность текста к фону (минимум 4.5:1)
2. Проверить контрастность UI элементов (минимум 3:1)
3. Использовать инструменты: axe-core, Lighthouse

---

### 10.4. Focus indicators отсутствуют

**Проблема:** В CSS стилях могут отсутствовать видимые индикаторы фокуса.

**Требуется:**
```css
:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}

:focus-visible {
  outline: 2px solid #005fcc;
}
```

---

## 11. I18N (ИНТЕРНАЦИОНАЛИЗАЦИЯ)

### 11.1. i18n система создана, но не интегрирована

**Файлы:**
- ✅ `src/i18n/translations.ts` — 200+ переводов ru/en
- ✅ `src/i18n/index.tsx` — I18nProvider и useI18n hook
- ❌ **НЕ интегрировано в приложение**

**Проблема:**
```javascript
// src/index.jsx
root.render(
  <ErrorBoundary>
    <App /> {/* ❌ Нет I18nProvider */}
  </ErrorBoundary>
);
```

**Требуется:**
```javascript
import { I18nProvider } from './i18n';

root.render(
  <ErrorBoundary>
    <I18nProvider>
      <App />
    </I18nProvider>
  </ErrorBoundary>
);
```

---

### 11.2. Компоненты не используют переводы

**Пример хардкоженных строк:**

```javascript
// TaskModal.jsx
<h3>{taskId ? 'Редактирование задачи' : 'Новая задача'}</h3>
<button>Сохранить</button>
<button>Отмена</button>

// LoginScreen.jsx
<input placeholder="Email" />
<input placeholder="Пароль" />
<button>Войти</button>
```

**Требуется заменить на:**
```javascript
const { t, tCommon } = useI18n();

<h3>{t('tasks', taskId ? 'editTask' : 'newTask')}</h3>
<button>{tCommon('save')}</button>
<button>{tCommon('cancel')}</button>

<input placeholder={tCommon('email')} />
<button>{t('auth', 'loginButton')}</button>
```

---

### 11.3. Переводы неполные

**Файл:** `src/i18n/translations.ts`

**Отсутствуют переводы для:**
- Сообщений об ошибках валидации
- Названий отделов и проектов
- Должностей сотрудников
- Текстов уведомлений
- Сообщений аудита

**Решение:**
1. Добавить все недостающие ключи
2. Использовать интерполяцию для динамических значений
3. Добавить поддержку плюральных форм (1 день, 2 дня, 5 дней)

---

## 12. ТЕСТИРОВАНИЕ

### 12.1. Полное отсутствие тестов

**Статус:**
- ❌ Unit-тесты: 0
- ❌ Integration-тесты: 0
- ❌ E2E-тесты: 0
- ❌ Coverage: 0%

**Требуется:**

1. **Unit-тесты для бизнес-логики:**
```javascript
// __tests__/useTaskOperations.test.ts
describe('useTaskOperations', () => {
  it('should validate budget correctly', () => {
    // ...
  });
  
  it('should send notifications on status change', () => {
    // ...
  });
});
```

2. **Component-тесты:**
```javascript
// __tests__/TaskModal.test.tsx
describe('TaskModal', () => {
  it('should render with correct initial values', () => {
    // ...
  });
  
  it('should validate form fields', () => {
    // ...
  });
});
```

3. **E2E-тесты:**
```javascript
// e2e/login.spec.ts
test('should login successfully with valid credentials', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="email"]', 'test@company.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page.locator('.user-menu')).toBeVisible();
});
```

**Рекомендуемый стек:**
- Vitest для unit-тестов
- React Testing Library для component-тестов
- Playwright для E2E-тестов

---

### 12.2. Отсутствие тестовой документации

**Проблема:** Нет:
- Test plan документа
- Coverage требований
- CI интеграции для тестов

**Решение:**
1. Создать `TESTING.md` с планом тестирования
2. Настроить GitHub Actions для запуска тестов
3. Добавить pre-commit hook для запуска тестов

---

## 13. ЗАВИСИМОСТИ И ИНФРАСТРУКТУРА

### 13.1. Минимальный набор зависимостей

**Файл:** `package.json`

```json
{
  "dependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^26.2.0",
    "@types/react": "^19.2.18",
    "@vitejs/plugin-react": "^6.0.4",
    "eslint": "^10.8.0",
    "typescript": "^7.0.2",
    "vite": "^8.2.0"
  }
}
```

**Отсутствуют критические зависимости:**

1. **Для работы с данными:**
```bash
npm install zod          # Валидация (уже используется, но нет в package.json!)
npm install date-fns     # Работа с датами
```

2. **Для состояния:**
```bash
npm install zustand      # Гранулярное состояние
# или
npm install jotai
```

3. **Для безопасности:**
```bash
npm install dompurify    # XSS защита
npm install @types/dompurify
```

4. **Для тестирования:**
```bash
npm install -D vitest
npm install -D @testing-library/react
npm install -D @testing-library/jest-dom
npm install -D playwright
```

5. **Для i18n:**
```bash
npm install i18next
npm install react-i18next
```

6. **Для роутинга (если понадобится):**
```bash
npm install react-router-dom
```

7. **Для мониторинга:**
```bash
npm install @sentry/react
npm install @sentry/tracing
```

---

### 13.2. ESLint конфигурация минимальна

**Проблема:** Нет расширенных правил для:
- React最佳实践
- TypeScript строгости
- Accessibility
- Security

**Решение:**
```bash
npm install -D eslint-plugin-react
npm install -D eslint-plugin-react-hooks
npm install -D eslint-plugin-import
npm install -D @typescript-eslint/parser
npm install -D @typescript-eslint/eslint-plugin
npm install -D eslint-plugin-jsx-a11y
npm install -D eslint-plugin-security
```

---

### 13.3. Отсутствует pre-commit hooks

**Проблема:** Нет автоматической проверки перед коммитом.

**Решение:**
```bash
npm install -D husky lint-staged
npx husky install
```

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.ts": ["tsc --noEmit"]
  }
}
```

---

### 13.4. Отсутствует CI/CD

**Проблема:** Нет автоматического билда и тестирования.

**Решение:** Создать `.github/workflows/ci.yml`:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build
```

---

## 14. ПЛАН ИСПРАВЛЕНИЙ ПО ПРИОРИТЕТАМ

### 🔥 PRIORITÉ 1: КРИТИЧЕСКИЙ (1-3 дня)

#### 1.1. Исправить ошибки линтинга (29 ошибок)

**Файл:** `src/services/DataStore.js`
- [ ] Добавить импорт `sanitizeHtml`
- [ ] Добавить импорт `fmtDMY`
- [ ] Добавить импорт `VACATION_TYPES`
- [ ] Исправить неопределённую переменную `msg`
- [ ] Удалить пустые блоки catch
- [ ] Удалить неиспользуемые переменные

**Файл:** `src/utils/sanitization/index.ts`
- [ ] Исправить TypeScript ошибку с `map[m]`

**Файл:** `src/context/StoreContext.jsx`
- [ ] Удалить неиспользуемую переменную `selectData`
- [ ] Переместить export useStore в отдельный файл

**Файл:** `src/components/Toast.jsx`
- [ ] Переместить константы в отдельный файл

---

#### 1.2. Удалить plaintext пароли из кода

**Файл:** `src/mocks/dataMock.js`
- [ ] Удалить поле `pass` из всех сотрудников
- [ ] Заменить на token-based аутентификацию для mock-режима
- [ ] Обновить `DataStore.login()` для работы без паролей

---

#### 1.3. Интегрировать санитизацию

**Файл:** `src/services/DataStore.js`
- [ ] Импортировать `sanitizeHtml`
- [ ] Применить ко всем пользовательским строкам

**Файл:** `src/components/Modals/Discussion.jsx`
- [ ] Санизировать комментарии перед отображением

---

### ⚡ PRIORITY 2: ВЫСОКИЙ (1-2 недели)

#### 2.1. Интегрировать Zod валидацию в DataStore

- [ ] Импортировать схемы из `utils/validation`
- [ ] Добавить валидацию в `upsertTask()`, `upsertProject()`, `upsertEmployee()`
- [ ] Удалить дублирующуюся валидацию из компонентов

---

#### 2.2. Разделить StoreContext

- [ ] Создать `AuthContext` (currentUser, login, logout)
- [ ] Создать `DataContext` (tasks, projects, employees)
- [ ] Обновить компоненты для использования новых контекстов

---

#### 2.3. Интегрировать i18n

- [ ] Добавить `I18nProvider` в `src/index.jsx`
- [ ] Заменить хардкоженные строки в `LoginScreen.jsx`
- [ ] Заменить строки в `TaskModal.jsx`
- [ ] Заменить строки в основных компонентах

---

#### 2.4. Оптимизировать производительность

- [ ] Обернуть `TaskItem`, `ProjectCard` в `React.memo`
- [ ] Добавить `useMemo` для фильтраций в `TaskList`, `Reports`
- [ ] Добавить `useCallback` для колбэков
- [ ] Исправить зависимости в `Gantt.jsx`

---

#### 2.5. Начать TypeScript миграцию

- [ ] Конвертировать `DataStore.js` → `DataStore.ts`
- [ ] Конвертировать `permissions.js` → `permissions.ts`
- [ ] Конвертировать `validation/index.js` → `validation/index.ts`
- [ ] Добавить типы к `useStore`, `useAuth` хукам

---

### 📊 PRIORITY 3: СРЕДНИЙ (2-4 недели)

#### 3.1. Декомпозиция DataStore

- [ ] Создать `TaskRepository extends BaseRepository`
- [ ] Создать `ProjectRepository extends BaseRepository`
- [ ] Создать `EmployeeRepository extends BaseRepository`
- [ ] Создать `AuthService`
- [ ] Создать `TaskService`
- [ ] Обновить DataStore для использования репозиториев

---

#### 3.2. Декомпозиция TaskModal

- [ ] Интегрировать `useTaskOperations` хук
- [ ] Вынести `generateRepeatDates` в utility
- [ ] Выделить подкомпоненты: `TaskForm`, `TaskComments`, `TaskHistory`
- [ ] Сократить компонент до <200 строк

---

#### 3.3. Добавить Accessibility

- [ ] Добавить ARIA атрибуты в модальные окна
- [ ] Добавить `aria-label` к кнопкам с иконками
- [ ] Реализовать focus trap в модалках
- [ ] Добавить keyboard навигацию
- [ ] Проверить color contrast

---

#### 3.4. Настроить тестирование

- [ ] Установить Vitest, React Testing Library
- [ ] Написать unit-тесты для `useTaskOperations`
- [ ] Написать component-тесты для `TaskModal`
- [ ] Настроить CI для запуска тестов

---

#### 3.5. Backend интеграция (начало)

- [ ] Создать `httpClient.ts` с interceptors
- [ ] Определить endpoints в `endpoints.ts`
- [ ] Создать `AuthService` с реальными API вызовами
- [ ] Добавить localStorage fallback для offline режима

---

### 🎯 PRIORITY 4: ДОЛГОСРОЧНЫЙ (1-2 месяца)

#### 4.1. Полная TypeScript миграция

- [ ] Конвертировать все компоненты в `.tsx`
- [ ] Добавить строгую типизацию
- [ ] Настроить type checking в CI

---

#### 4.2. Мониторинг и логирование

- [ ] Интегрировать Sentry
- [ ] Настроить real error tracking
- [ ] Добавить performance metrics
- [ ] Настроить alerts

---

#### 4.3. Расширенное тестирование

- [ ] Достичь 80% coverage unit-тестами
- [ ] Добавить integration тесты
- [ ] Написать E2E тесты для критических путей
- [ ] Настроить visual regression тесты

---

#### 4.4. Production готовность

- [ ] Настроить HTTPS
- [ ] Добавить CSP заголовки
- [ ] Настроить rate limiting на бэкенде
- [ ] Добавить backup стратегию
- [ ] Настроить monitoring dashboards

---

## 📈 МЕТРИКИ ДЛЯ ОТСЛЕЖИВАНИЯ ПРОГРЕССА

| Метрика | Текущее значение | Цель (1 месяц) | Цель (3 месяца) |
|---------|-----------------|----------------|-----------------|
| Ошибок ESLint | 29 | 0 | 0 |
| Ошибок TypeScript | 1 | 0 | 0 |
| Plaintext паролей | 28 | 0 | 0 |
| Файлов без типов | 46+ | 20 | 0 |
| Largest file (строк) | 861 | 400 | 200 |
| Test coverage | 0% | 30% | 80% |
| ARIA атрибутов | 0 | 50+ | 200+ |
| Переведённых строк | 200 | 400 | 1000+ |
| Время сборки | TBD | <30s | <15s |
| Bundle size (gzipped) | TBD | <500KB | <300KB |

---

## ✅ ЗАКЛЮЧЕНИЕ

Проект требует **значительной доработки** для достижения production-ready состояния. 

**Критические проблемы, требующие немедленного исправления:**
1. 29 ошибок линтинга (включая undefined переменные)
2. Plaintext пароли в коде
3. Отсутствие санитизации (XSS уязвимость)
4. Монолитный DataStore без разделения ответственности
5. Полное отсутствие тестов

**Рекомендуемый timeline:**
- **1-3 дня:** Исправить критические ошибки линтинга и безопасности
- **1-2 недели:** Интегрировать валидацию, i18n, оптимизировать производительность
- **2-4 недели:** Декомпозировать архитектуру, добавить accessibility, начать тестирование
- **1-2 месяца:** Полная TypeScript миграция, мониторинг, production готовность

**Команда:** 2-3 разработчика full-stack для достижения целей за 3 месяца.
