# План миграции проекта на TypeScript

## 📋 ОБЩИЙ ПОДХОД

Миграция будет выполняться **последовательно, файл за файлом**, без деградации функционала. Каждый этап включает:
1. Переименование `.js`/`.jsx` → `.ts`/`.tsx`
2. Добавление типов для импортов/экспортов
3. Типизация пропсов компонентов, хуков, функций
4. Исправление ESLint ошибок в процессе
5. Проверка компиляции `tsc --noEmit`

---

## 🎯 ЭТАП 1: Базовая инфраструктура (Приоритет: КРИТИЧЕСКИЙ)

### 1.1. Конфигурация TypeScript
- [x] `tsconfig.json` — уже настроен
- [ ] `tsconfig.node.json` — проверить настройку
- [ ] `vite.config.js` → `vite.config.ts` — конвертация конфига сборки

### 1.2. Утилиты и константы
- [x] `src/types/index.ts` — типы уже созданы
- [x] `src/utils/config.ts` — уже TS
- [x] `src/utils/constants.ts` — уже TS
- [x] `src/utils/date.ts` — уже TS
- [x] `src/utils/string.ts` — уже TS
- [x] `src/utils/logging/logger.ts` — уже TS
- [ ] `src/utils/validation/index.js` → `.ts` (145 строк, зависит от config.ts)
- [ ] `src/utils/permissions.js` → `.ts` (большой файл с логикой прав)

### 1.3. Моки и сервисы
- [ ] `src/mocks/dataMock.js` → `.ts` (554 строки, требует типизации всех данных)
- [ ] `src/services/DataStore.js` → `.ts` (927 строк, КРИТИЧНО — ядро приложения)

---

## 🎯 ЭТАП 2: Контекст и Хуки (Приоритет: ВЫСОКИЙ)

### 2.1. Контекст
- [ ] `src/context/StoreContext.jsx` → `.tsx` ( StoreProvider, useStoreContext)

### 2.2. Хуки
- [ ] `src/hooks/index.js` → `.ts` (экспорты)
- [ ] `src/hooks/useStore.js` → `.ts` (простой хук-прокладка)
- [ ] `src/hooks/useAuth.js` → `.ts` (аутентификация)
- [ ] `src/hooks/useEmployeeName.js` → `.ts` (хелпер для имён)
- [ ] `src/hooks/useDataHelpers.js` → `.ts` (хелперы данных)
- [ ] `src/hooks/useDataScope.js` → `.ts` (права доступа)
- [ ] `src/hooks/useTaskFilters.js` → `.ts` (фильтрация задач)
- [ ] `src/hooks/useDragAndDrop.js` → `.ts` (D&D логика)

---

## 🎯 ЭТАП 3: Компоненты UI (Приоритет: СРЕДНИЙ)

### 3.1. Базовые компоненты
- [ ] `src/components/Toast.jsx` → `.tsx` (система уведомлений)
- [ ] `src/components/Modal.jsx` → `.tsx` (базовое модальное окно)
- [ ] `src/components/FormField.jsx` → `.tsx` (поля форм)
- [ ] `src/components/Table.jsx` → `.tsx` (таблица)
- [ ] `src/components/Icons.jsx` → `.tsx` (иконки)
- [ ] `src/components/ErrorBoundary.jsx` → `.tsx` (обработка ошибок)
- [ ] `src/components/NotifPanel.jsx` → `.tsx` (панель уведомлений)
- [ ] `src/components/MentionPopup.jsx` → `.tsx` (упоминания)
- [ ] `src/components/EmployeeTooltip.jsx` → `.tsx` (тултип сотрудника)

### 3.2. Компоненты представлений
- [ ] `src/components/LoginScreen.jsx` → `.tsx` (экран входа)
- [ ] `src/components/MainLayout.jsx` → `.tsx` (главный лейаут, 546 строк)
- [ ] `src/components/Archive.jsx` → `.tsx` (архив)
- [ ] `src/components/Cabinet.jsx` → `.tsx` (кабинет)
- [ ] `src/components/Calendar.jsx` → `.tsx` (календарь)
- [ ] `src/components/Journal.jsx` → `.tsx` (журнал)
- [ ] `src/components/Kanban.jsx` → `.tsx` (канбан доска)
- [ ] `src/components/Gantt.jsx` → `.tsx` (диаграмма Ганта)
- [ ] `src/components/TaskList.jsx` → `.tsx` (список задач)
- [ ] `src/components/Projects.jsx` → `.tsx` (проекты)
- [ ] `src/components/ProjectsKanban.jsx` → `.tsx` (канбан проектов)
- [ ] `src/components/Reports.jsx` → `.tsx` (отчёты)
- [ ] `src/components/Requests.jsx` → `.tsx` (заявки)
- [ ] `src/components/Staff.jsx` → `.tsx` (штат)

### 3.3. Модальные окна
- [ ] `src/components/Modals/index.jsx` → `.tsx`
- [ ] `src/components/Modals/ChangePasswordModal.jsx` → `.tsx`
- [ ] `src/components/Modals/CreateEmployeeModal.jsx` → `.tsx`
- [ ] `src/components/Modals/DelegationModal.jsx` → `.tsx`
- [ ] `src/components/Modals/DeptsModal.jsx` → `.tsx`
- [ ] `src/components/Modals/Discussion.jsx` → `.tsx` (обсуждения задач)
- [ ] `src/components/Modals/EmployeeEditModal.jsx` → `.tsx`
- [ ] `src/components/Modals/HoursRequestModal.jsx` → `.tsx`
- [ ] `src/components/Modals/ProjectModal.jsx` → `.tsx`
- [ ] `src/components/Modals/RolesModal.jsx` → `.tsx`
- [ ] `src/components/Modals/TaskModal.jsx` → `.tsx` (828 строк, КРИТИЧНО)
- [ ] `src/components/Modals/VacNowModal.jsx` → `.tsx`
- [ ] `src/components/Modals/VacationModal.jsx` → `.tsx`

---

## 🎯 ЭТАП 4: Точка входа и App (Приоритет: ЗАВЕРШАЮЩИЙ)

- [ ] `src/index.jsx` → `.tsx` (рендер приложения)
- [ ] `src/App.jsx` → `.tsx` (корневой компонент)

---

## 🔧 ТЕКУЩИЕ ESLINT ОШИБКИ (142 проблемы)

### Категории ошибок:

#### 4.1. Неиспользуемые импорты React (~25 файлов)
```
'React' is defined but never used
```
**Решение:** Удалить импорт `React` где он не используется (после перехода на JSX transform)

#### 4.2. Неиспользуемые переменные и константы (~40 случаев)
Примеры:
- `TASK_STATUS_ORDER`, `PRIORITIES`, `PROJECT_TYPES`, `DEPENDENCY_TYPES` в DataStore.js
- `process` в App.jsx (заменить на `import.meta.env`)
- `selectData` в StoreContext.jsx
- `canCreateProject`, `empName`, `primaryDept` в различных файлах

**Решение:** Удалить неиспользуемый код или начать использовать

#### 4.3. Нарушение правил React Hooks (~10 предупреждений)
- `react-hooks/exhaustive-deps` — недостающие зависимости в useMemo/useEffect
- `react-hooks/set-state-in-effect` — setState внутри useEffect

**Решение:** Исправить зависимости, вынести логику из эффектов

#### 4.4. Fast Refresh ограничения (3 файла)
- `Icons.jsx`, `Toast.jsx`, `StoreContext.jsx` экспортируют не только компоненты

**Решение:** Вынести константы/функции в отдельные файлы

#### 4.5. Impure функции в render
- `Date.now()` в Discussion.jsx (строка 216)

**Решение:** Вынести в useState/useEffect

---

## 📊 МЕТРИКИ МИГРАЦИИ

| Категория | Файлов JS/JSX | Файлов TS/TSX | Строк кода | Приоритет |
|-----------|---------------|---------------|------------|-----------|
| Утилиты | 2 | 6 | ~600 | 🔴 Критический |
| Сервисы/Моки | 2 | 0 | ~1500 | 🔴 Критический |
| Контекст/Хуки | 8 | 0 | ~800 | 🟠 Высокий |
| Компоненты UI | 15 | 0 | ~2000 | 🟡 Средний |
| Модальные окна | 13 | 0 | ~2500 | 🟡 Средний |
| Точка входа | 2 | 0 | ~100 | 🟢 Завершающий |
| **ИТОГО** | **42** | **6** | **~7500** | |

---

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ ЭТАПА

Для каждого файла:
1. [ ] Файл переименован в `.ts`/`.tsx`
2. [ ] Все импорты имеют типы
3. [ ] Все экспорты типизированы
4. [ ] Нет ESLint ошибок
5. [ ] `tsc --noEmit` проходит без ошибок
6. [ ] Приложение запускается (`npm run dev`)
7. [ ] Функционал не деградировал (визуальная проверка)

---

## 🚀 ПОСЛЕДОВАТЕЛЬНОСТЬ ВЫПОЛНЕНИЯ

```
Этап 1 (Утилиты) → Этап 2 (Хуки) → Этап 3 (Компоненты) → Этап 4 (App)
       ↓                    ↓                 ↓                ↓
   tsc check           tsc check        tsc check       tsc check
   lint fix            lint fix         lint fix        lint fix
   dev test            dev test         dev test        dev test
```

---

## ⚠️ РИСКИ И РЕШЕНИЯ

| Риск | Решение |
|------|---------|
| Циклические зависимости | Использовать forward references, рефакторинг импортов |
| Сложная типизация DataStore | Использовать интерфейсы из types/index.ts, дженерики |
| Потеря типов в моках | Создать фабрики данных с явными типами |
| Производительность TypeScript | Использовать `skipLibCheck`, настроить инкрементальную сборку |

---

*Документ обновляется по мере выполнения миграции*
