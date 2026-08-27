# Project Structure

## `src/`

### `src/App.jsx`
```javascript
import { StoreProvider } from './context/StoreContext';
import { ToastProvider } from './context/ToastContext';
import { useStore, useAuth } from './hooks';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';

function AppContent() {
  const { store, data, login, logout } = useStore();
  const { user } = useAuth();

  if (!user) {
    return <LoginScreen db={data} setDb={(fn) => { store._data = fn(store._data); store._notify(); }} onLogin={login} />;
  }
  return <MainLayout store={store} data={data} user={user} />;
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </StoreProvider>
  );
}
```
### `src/index.jsx`
```javascript
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import './css/styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
```
### `src/tree.txt`
```
������� �����
��਩�� ����� ⮬�: A208-C61C
C:.
|   App.jsx
|   index.jsx
|   tree.txt
|   
+---assets
|       hero.png
|       react.svg
|       vite.svg
|       
+---components
|   |   Archive.jsx
|   |   Avatar.jsx
|   |   Cabinet.jsx
|   |   Calendar.jsx
|   |   CreateEmployeeModal.jsx
|   |   Discussion.jsx
|   |   EditEmployeeModal.jsx
|   |   ErrorBoundary.jsx
|   |   FormField.jsx
|   |   Gantt.jsx
|   |   Icons.jsx
|   |   Journal.jsx
|   |   Kanban.jsx
|   |   LoginScreen.jsx
|   |   MainLayout.jsx
|   |   Modal.jsx
|   |   ModalRenderer.jsx
|   |   NotifPanel.jsx
|   |   ProjectProgress.jsx
|   |   Projects.jsx
|   |   Reports.jsx
|   |   Requests.jsx
|   |   Staff.jsx
|   |   Table.jsx
|   |   
|   +---Modals
|   |       DelegationModal.jsx
|   |       DeptsModal.jsx
|   |       HoursRequestModal.jsx
|   |       index.jsx
|   |       ProjectModal.jsx
|   |       RolesModal.jsx
|   |       TaskModal.jsx
|   |       VacationModal.jsx
|   |       VacNowModal.jsx
|   |       
|   \---views
|           ArchiveView.jsx
|           CabinetView.jsx
|           index.js
|           JournalView.jsx
|           ProjectsView.jsx
|           ReportsView.jsx
|           RequestsView.jsx
|           StaffView.jsx
|           TasksList.jsx
|           TasksView.jsx
|           
+---context
|       StoreContext.jsx
|       ToastContext.jsx
|       
+---css
|       styles.css
|       
+---hooks
|       index.js
|       useAuth.js
|       useDataHelpers.js
|       useModals.js
|       useStore.js
|       useTaskFilters.js
|       
+---services
|       DataStore.js
|       mockData.js
|       
\---utils
        constants.js
        date.js
        helpers.js
        permissions.js
        projectHelpers.js
        

```
## `src/utils/`
- **Folder:** `utils/`

### `src/utils/constants.js`
```javascript
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
  low:  { label: "Низкий", color: "#10b981" },   // зелёный
  mid:  { label: "Средний", color: "#f59e0b" },  // жёлтый
  high: { label: "Высокий", color: "#f97316" },  // оранжевый
  crit: { label: "Критический", color: "#dc2626" }, // красный
};

export const PROJECT_PRIORITIES = {
  AOG:  { label: 'AOG',  color: '#dc2626', order: 1 },   // красный
  CRIT: { label: 'CRIT', color: '#f59e0b', order: 2 },   // жёлтый
  NORM: { label: 'NORM', color: '#10b981', order: 3 },   // зелёный
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
export const DOMAIN = "aviahorizont.ru";
```
### `src/utils/date.js`
```javascript
export const pad2 = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
export const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
export const addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };
export const parseISO = (s) => { const [y,m,d] = String(s).split("-").map(Number); return new Date(y,m-1,d); };
export const TODAY = iso(new Date());
export const daysDiff = (a,b) => Math.round((parseISO(b)-parseISO(a))/86400000);
export const MS_SHORT = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
export const MS_FULL = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
export const fmtD = (s) => { 
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MS_SHORT[d.getMonth()]}`;
};
export const fmtDMY = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
};
export const fmtDT = (ts) => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return `${fmtDMY(iso(d))} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
export const uid = () => Math.random().toString(36).slice(2,10);
export const initials = (f,l) => `${(f||"?")[0]}${(l||"?")[0]}`;

export const isTaskActive = (task) => {
  if (!task) return false;
  if (!task.archived) return true;
  if (task.closedAt) {
    const cutoff = addMonths(new Date(), -3);
    return task.closedAt >= iso(cutoff);
  }
  return false;
};


```
### `src/utils/helpers.js`
```javascript
// utils/helpers.js
export function getEmployeePrimaryDepartment(employee, db) {
  if (!employee || !db) return null;

  // Для главного конструктора возвращаем его КБ
  if (employee.roles && employee.roles.includes('kb_chief') && employee.kbIds && employee.kbIds.length > 0) {
    const kbs = employee.kbIds
      .map(id => db.kbs?.find(k => k.id === id))
      .filter(Boolean);
    if (kbs.length > 0) {
      // Если несколько КБ – возвращаем первый или объединяем через запятую
      return kbs.length === 1 ? kbs[0] : { id: kbs.map(k => k.id).join(','), name: kbs.map(k => k.name).join(', '), type: 'kb' };
    }
  }

  // Для остальных – ищем основное подразделение (primary)
  if (employee.departments && employee.departments.length > 0) {
    const primaryDept = employee.departments.find(d => d.primary) || employee.departments[0];
    if (primaryDept) {
      const dept = db.departments?.find(d => d.id === primaryDept.deptId);
      if (dept) {
        return dept;
      }
    }
  }
  return null;
}

// Упрощённая версия, возвращающая только название
export function getPrimaryDeptName(employee, db) {
  const dept = getEmployeePrimaryDepartment(employee, db);
  return dept ? dept.name : '—';
}
```
### `src/utils/permissions.js`
```javascript
import { ROLES } from './constants';

export const hasRole = (user, ...roles) => !!user && roles.some(r => user.roles.includes(r));
export const has = hasRole;

export const canEditDepartments = (user) => hasRole(user, "admin", "director", "hr");
export const canManageAllVacations = (user) => hasRole(user, "admin", "director", "hr");
export const canRestore = (user) => hasRole(user, "admin", "director");
export const canCreateTask = (user) => hasRole(user, "admin", "director", "economist", "kb_chief", "head", "project_lead", "project_manager");
export const canCreateProject = (user) => hasRole(user, "admin", "director", "kb_chief", "project_manager");
export const canManageManager = (user) => hasRole(user, "admin", "director", "kb_chief", "project_manager");
export const canExport = (user) => hasRole(user, "admin", "director", "economist");
export const canEditRoles = (user) => hasRole(user, "admin");
export const canFireEmployee = (user) => hasRole(user, "admin", "director", "hr");

// Право на изменение полей задачи (кроме статуса) – менеджер проектов не может редактировать
export const canEditTaskFields = (user, task, data) => {
  if (!user || !task || !data) return false;
  if (task.archived) return false;
  if (hasRole(user, "admin", "economist")) return true;
  // Менеджер проектов не может редактировать поля (только создавать)
  if (hasRole(user, "project_manager")) return false;
  return false;
};

// Право на изменение статуса задачи
export const canChangeTaskStatus = (user, task, newStatus, data) => {
  if (!user || !task || !data) return false;
  if (task.archived) return false;
  if (task.status === 'closed' || task.status === 'cancelled') {
    // Только администратор может reopening закрытые/отмененные задачи
    return hasRole(user, 'admin');
  }
  
  const project = data.projects.find(p => p.id === task.projectId);
  const isProdProject = project && project.ptype !== 'admin';
  const isAdminProject = project && project.ptype === 'admin';
  
  // Администратор может всё
  if (hasRole(user, "admin")) return true;
  
  // Генеральный директор может всё
  if (hasRole(user, "director")) return true;
  
  // Для административных проектов
  if (isAdminProject) {
    if (hasRole(user, "kb_chief") && project.kbId && (user.kbIds || []).includes(project.kbId)) {
      return true;
    }
    if (hasRole(user, "head") && (task.assigneeIds || []).some(id => {
      const e = data.employees.find(x => x.id === id);
      return e && e.departments.some(d => (user.headDeptIds || []).includes(d.deptId));
    })) return true;
    if (hasRole(user, "project_lead") && project.managerId === user.id) return true;
    if (task.assigneeIds && task.assigneeIds.includes(user.id)) {
      if (newStatus === 'closed' || newStatus === 'cancelled') return false;
      return true;
    }
    return false;
  }
  
  // Для производственных проектов строгая механика
  if (isProdProject) {
    // Руководитель КБ
    if (hasRole(user, "kb_chief") && project.kbId && (user.kbIds || []).includes(project.kbId)) {
      return true;
    }
    
    // Руководитель подразделения
    if (hasRole(user, "head") && (task.assigneeIds || []).some(id => {
      const e = data.employees.find(x => x.id === id);
      return e && e.departments.some(d => (user.headDeptIds || []).includes(d.deptId));
    })) return true;
    
    // Ведущий проекта
    if (hasRole(user, "project_lead") && project.managerId === user.id) return true;
    
    // Менеджер проектов не может менять статус задач (только проектов)
    if (hasRole(user, "project_manager")) return false;
    
    // Исполнитель может переводить:
    // - из "new" в "inwork"
    // - из "inwork" в "review"
    // - из "review" в "inwork" (возврат на доработку)
    // НЕ может закрывать задачу
    if (task.assigneeIds && task.assigneeIds.includes(user.id)) {
      if (newStatus === 'closed' || newStatus === 'cancelled') return false;
      if (task.status === 'new' && newStatus === 'inwork') return true;
      if (task.status === 'inwork' && newStatus === 'review') return true;
      if (task.status === 'review' && newStatus === 'inwork') return true; // <-- ДОБАВЛЕНО
      return false;
    }
    
    return false;
  }
  
  // Fallback для остальных случаев
  if (hasRole(user, "kb_chief") && project.kbId && (user.kbIds || []).includes(project.kbId)) {
    return true;
  }
  if (hasRole(user, "head") && (task.assigneeIds || []).some(id => {
    const e = data.employees.find(x => x.id === id);
    return e && e.departments.some(d => (user.headDeptIds || []).includes(d.deptId));
  })) return true;
  if (hasRole(user, "project_lead") && project.managerId === user.id) return true;
  if (task.assigneeIds && task.assigneeIds.includes(user.id)) {
    if (newStatus === 'closed' || newStatus === 'cancelled') return false;
    return true;
  }
  return false;
};

// Право на редактирование полей проекта – менеджер проектов не может редактировать поля, только статус
export const canEditProjectFields = (user, project) => {
  if (!user || !project) return false;
  if (project.archived) return false;
  if (hasRole(user, "admin", "director")) return true;
  // Менеджер проектов не может редактировать поля проекта (только статус)
  if (hasRole(user, "project_manager")) return false;
  return false;
};

// Право на изменение статуса проекта
export const canChangeProjectStatus = (user, project, newStatus) => {
  if (!user || !project) return false;
  if (project.archived) return false;
  
  // Администратор может всё
  if (hasRole(user, 'admin')) return true;
  
  // Генеральный директор может всё
  if (hasRole(user, 'director')) return true;
  
  // Менеджер проектов может менять статус (перетаскивать по канбану)
  if (hasRole(user, 'project_manager')) return true;
  
  // Для закрытия/отмены проекта также может создатель
  if (newStatus === 'closed' || newStatus === 'cancelled') {
    const creatorId = project.creatorId || (project.history?.find(h => h.who !== 'system')?.who);
    if (creatorId && creatorId === user.id) return true;
  }
  
  // Руководитель КБ для своих проектов
  if (hasRole(user, 'kb_chief') && project.kbId && (user.kbIds || []).includes(project.kbId)) return true;
  
  return false;
};

export const projectEditable = (user, project, data) => {
  return canEditProjectFields(user, project);
};

export const assigneeOptions = (user, data) => {
  if (!user || !data) return [];
  let list = [];
  let allEmployees = data.employees.filter(e => !e.fired);

  if (hasRole(user, "admin", "director", "economist", "project_lead", "project_manager")) {
    list = allEmployees;
  } else if (hasRole(user, "kb_chief") && (user.kbIds || []).length) {
    const deptIds = data.departments.filter(d => d.kbId && user.kbIds.includes(d.kbId)).map(d => d.id);
    list = allEmployees.filter(e => e.id === user.id || e.departments.some(x => deptIds.includes(x.deptId)) || hasRole(e, "director"));
  } else if (hasRole(user, "head")) {
    list = allEmployees.filter(e => e.id === user.id || e.departments.some(x => (user.headDeptIds || []).includes(x.deptId)) || hasRole(e, "director"));
  } else {
    list = allEmployees.filter(e => e.id === user.id);
  }
  return list.sort((a, b) => {
    const cmp = a.last.localeCompare(b.last);
    return cmp !== 0 ? cmp : a.first.localeCompare(b.first);
  });
};

export const canApproveVacation = (user, vacation, data) => {
  if (hasRole(user, "admin", "director")) return true;
  const emp = data.employees.find(e => e.id === vacation.empId);
  if (!emp || emp.id === user.id) return false;
  const primaryDeptId = emp.departments.find(x => x.primary)?.deptId;
  if (hasRole(user, "head") && primaryDeptId && (user.headDeptIds || []).includes(primaryDeptId)) return true;
  if (hasRole(user, "kb_chief")) {
    const dept = data.departments.find(d => d.id === primaryDeptId);
    if (dept && dept.kbId && (user.kbIds || []).includes(dept.kbId)) return true;
  }
  return false;
};

export function computeScope(u, db) {
  if (!u || !db) return { all: false, empIds: new Set(), projIds: new Set() };
  const allE = new Set(db.employees.filter(e => !e.fired).map(e => e.id));
  const allP = new Set(db.projects.map(p => p.id));
  if (hasRole(u, "admin", "director", "economist", "project_manager")) {
    return { all: true, empIds: allE, projIds: allP };
  }
  const empIds = new Set([u.id]);
  const projIds = new Set();
  if (hasRole(u, "kb_chief") && (u.kbIds || []).length) {
    const dIds = db.departments.filter(d => d.kbId && u.kbIds.includes(d.kbId)).map(d => d.id);
    db.employees.filter(e => !e.fired).forEach(e => { if (e.departments.some(x => dIds.includes(x.deptId))) empIds.add(e.id); });
    db.projects.forEach(p => { if (p.kbId && u.kbIds.includes(p.kbId)) projIds.add(p.id); });
  }
  if (hasRole(u, "head") && (u.headDeptIds || []).length) {
    db.employees.filter(e => !e.fired).forEach(e => { if (e.departments.some(x => u.headDeptIds.includes(x.deptId))) empIds.add(e.id); });
  }
  if (hasRole(u, "project_lead")) db.projects.forEach(p => { if (p.managerId === u.id) projIds.add(p.id); });
  db.tasks.forEach(t => {
    if (t.assigneeIds && t.assigneeIds.some(id => empIds.has(id))) projIds.add(t.projectId);
  });
  return { all: false, empIds, projIds };
}

export function taskVisible(u, scope, t, db) {
  if (!scope || !t) return false;
  if (scope.all) return true;
  if (t.assigneeIds && t.assigneeIds.some(id => scope.empIds.has(id))) return true;
  if (!scope.projIds.has(t.projectId)) return false;
  const proj = db.projects.find(p => p.id === t.projectId);
  if (!proj) return false;
  if (hasRole(u, "project_lead") && proj.managerId === u.id) return true;
  if (hasRole(u, "kb_chief") && proj.kbId && (u.kbIds || []).includes(proj.kbId)) return true;
  if (hasRole(u, "head")) return true;
  return false;
}

export function empName(db, id) {
  const e = db.employees.find(x => x.id === id);
  return e ? `${e.last} ${e.first}` : "—";
}
export function primaryDept(db, e) {
  if (!e) return null;
  const p = e.departments.find(x => x.primary) || e.departments[0];
  return p ? db.departments.find(d => d.id === p.deptId) : null;
}
```
### `src/utils/projectHelpers.js`
```javascript
import { PROJECT_PRIORITIES, ADMIN_PROJECT_PRIORITIES } from './constants';

export const getProjectColor = (project) => {
  if (!project) return '#64748b';
  const priorities = project.ptype === 'admin' ? ADMIN_PROJECT_PRIORITIES : PROJECT_PRIORITIES;
  return priorities[project.priority]?.color || '#64748b';
};
```
## `src/services/`
- **Folder:** `services/`

### `src/services/DataStore.js`
```javascript
import { TODAY, iso, addDays, addMonths, uid, fmtDMY } from '../utils/date';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, VACATION_TYPES, PROJECT_STATUSES, PROJECT_TYPES, DEPENDENCY_TYPES } from '../utils/constants';
import { buildMockData } from './mockData';

export default class DataStore {
  constructor() {
    this._data = buildMockData();
    this._currentUser = null;
    this._listeners = [];
    this._archiveOldTasks(3);
    // Миграция старых задач: если есть assigneeIds, берём первого как assigneeId
    this._migrateTasks();
  }

  _migrateTasks() {
    let changed = false;
    this._data.tasks = this._data.tasks.map(t => {
      if (t.assigneeIds && t.assigneeIds.length > 0 && !t.assigneeId) {
        changed = true;
        return { ...t, assigneeId: t.assigneeIds[0], assigneeIds: undefined };
      }
      if (t.assigneeIds && t.assigneeIds.length === 0 && !t.assigneeId) {
        changed = true;
        return { ...t, assigneeId: null, assigneeIds: undefined };
      }
      return t;
    });
    if (changed) {
      this._notify();
      this.addAudit('Миграция данных', 'Задачи приведены к формату с одним исполнителем (assigneeId)');
    }
  }

  subscribe(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(cb => cb !== callback); };
  }
  _notify() {
    this._listeners.forEach(cb => cb(this._data));
  }

  get data() { return this._data; }
  getCurrentUser() { return this._currentUser; }

  login(email, password) {
    const found = this._data.employees.find(e => e.email.toLowerCase() === email.trim().toLowerCase());
    if (found && found.lockUntil && Date.now() < found.lockUntil) {
      const remainingMinutes = Math.ceil((found.lockUntil - Date.now()) / 60000);
      return `Учётная запись заблокирована на ${remainingMinutes} мин. после 5 неудачных попыток входа`;
    }
    if (found && found.pass === password && !found.fired) {
      if (found.failed > 0) {
        found.failed = 0;
        found.lockUntil = 0;
        this.upsertEmployee(found);
      }
      this._currentUser = found;
      this._notify();
      return true;
    }
    if (found) {
      found.failed = (found.failed || 0) + 1;
      if (found.failed >= 5) {
        found.lockUntil = Date.now() + 15 * 60 * 1000;
        this.upsertEmployee(found);
        return 'Учётная запись заблокирована на 15 мин. после 5 неудачных попыток входа';
      }
      this.upsertEmployee(found);
    }
    return 'Неправильно введен логин/пароль';
  }

  logout() {
    this._currentUser = null;
    this._notify();
  }

  _archiveOldTasks(months = 3) {
    const cutoff = addMonths(new Date(), -months);
    const cutoffIso = iso(cutoff);
    let changed = false;
    this._data.tasks = this._data.tasks.map(t => {
      if (t.archived) return t;
      if ((t.status === 'closed' || t.status === 'cancelled') && t.closedAt && t.closedAt < cutoffIso) {
        changed = true;
        return { ...t, archived: true, archivedAt: TODAY };
      }
      return t;
    });
    if (changed) {
      this._notify();
      this.addAudit('Автоматическая архивация задач', `Задачи, закрытые более ${months} мес., перемещены в архив`);
    }
  }

  _calcSummaryHours(taskId, visited = new Set()) {
    if (visited.has(taskId)) return 0;
    visited.add(taskId);

    const task = this._data.tasks.find(t => t.id === taskId);
    if (!task) return 0;
    if (!task.isSummary) return task.plannedHours || 0;

    const children = this._data.tasks.filter(t => t.parentTaskId === taskId && !t.archived);
    let sum = 0;
    for (const child of children) {
      sum += this._calcSummaryHours(child.id, visited);
    }
    return sum;
  }

  _recalcSummaryHoursChain(taskId) {
    let current = this._data.tasks.find(t => t.id === taskId);
    while (current) {
      if (current.isSummary) {
        const newHours = this._calcSummaryHours(current.id);
        if (current.plannedHours !== newHours) {
          current.plannedHours = newHours;
          const idx = this._data.tasks.findIndex(t => t.id === current.id);
          if (idx !== -1) {
            this._data.tasks[idx] = { ...current };
          }
        }
      }
      if (current.parentTaskId) {
        current = this._data.tasks.find(t => t.id === current.parentTaskId);
      } else {
        break;
      }
    }
  }

  /**
   * Проверяет, не превышает ли сумма плановых часов подзадач заданный бюджет родительской задачи.
   * @param {string} parentId - ID родительской задачи
   * @param {string|null} excludeTaskId - ID задачи, которую нужно исключить из суммы (при обновлении)
   * @throws {Error} если сумма подзадач превышает plannedHours родителя
   */
  _checkSubtaskBudget(parentId, excludeTaskId = null) {
    const parent = this._data.tasks.find(t => t.id === parentId);
    if (!parent) return;

    // Если родитель суммарный или у него не заданы часы – ограничение не применяем
    if (parent.isSummary || parent.plannedHours == null) return;

    // Суммируем часы всех непосредственных подзадач, исключая указанную
    const children = this._data.tasks.filter(t =>
      t.parentTaskId === parentId && t.id !== excludeTaskId && !t.archived
    );
    const sumChildren = children.reduce((acc, t) => acc + (t.plannedHours || 0), 0);

    // Если сумма подзадач превышает бюджет родителя
    if (sumChildren > parent.plannedHours) {
      throw new Error(
        `Сумма плановых часов подзадач (${sumChildren} ч) превышает бюджет родительской задачи "${parent.title}" (${parent.plannedHours} ч). Уменьшите часы подзадач или увеличьте бюджет родителя.`
      );
    }
  }

  upsertTask(task) {
    const idx = this._data.tasks.findIndex(t => t.id === task.id);
    let tasks;
    let auditMessage = '';

    // Проверка бюджета проекта
    const projectForBudget = this._data.projects.find(p => p.id === task.projectId);
    if (projectForBudget && projectForBudget.budget != null && projectForBudget.ptype !== 'admin' && !projectForBudget.archived) {
      const otherTasksSum = this._data.tasks
        .filter(t => t.projectId === task.projectId && t.id !== task.id)
        .reduce((sum, t) => sum + (t.plannedHours || 0), 0);
      const newTotal = otherTasksSum + (task.plannedHours || 0);
      if (newTotal > projectForBudget.budget) {
        throw new Error(
          `Превышение бюджета проекта! Бюджет: ${projectForBudget.budget} ч, сумма остальных задач: ${otherTasksSum} ч, запрошено: ${task.plannedHours || 0} ч.`
        );
      }
    }

    // ----- НОВАЯ ПРОВЕРКА: бюджет подзадач -----
    // 1. Если задача имеет родителя, проверяем, что сумма подзадач родителя (включая эту) не превышает его часы
    if (task.parentTaskId) {
      // При обновлении исключаем саму задачу, при создании – нет
      this._checkSubtaskBudget(task.parentTaskId, idx === -1 ? null : task.id);
    }

    // 2. Если обновляется существующая задача и она НЕ суммарная, и её plannedHours изменяется (или может быть изменён),
    //    проверяем, что сумма её существующих подзадач (если есть) не превышает новый plannedHours.
    //    Это нужно для случая, когда пользователь уменьшает часы родительской задачи, у которой уже есть подзадачи.
    if (idx !== -1) {
      const existingTask = this._data.tasks[idx];
      // Проверяем только если plannedHours задано, задача не суммарная, и plannedHours изменился (или мы просто хотим проверить)
      if (!task.isSummary && task.plannedHours != null) {
        // Суммируем часы всех подзадач этой задачи (исключая саму себя)
        const childrenSum = this._data.tasks
          .filter(t => t.parentTaskId === task.id && t.id !== task.id && !t.archived)
          .reduce((acc, t) => acc + (t.plannedHours || 0), 0);
        if (childrenSum > task.plannedHours) {
          throw new Error(
            `Сумма плановых часов подзадач (${childrenSum} ч) превышает новый бюджет задачи "${task.title}" (${task.plannedHours} ч). Уменьшите часы подзадач или увеличьте бюджет задачи.`
          );
        }
      }
    }

    // Далее идёт существующая логика
    if (idx === -1 && task.parentTaskId) {
      const parent = this._data.tasks.find(t => t.id === task.parentTaskId);
      if (parent) {
        if (!task.projectId) task.projectId = parent.projectId;
      } else {
        task.parentTaskId = null;
      }
    }

    if (idx >= 0) {
      const old = this._data.tasks[idx];
      const changes = [];
      if (old.title !== task.title) changes.push(`Название: "${old.title}" → "${task.title}"`);
      if (!task.isSummary && old.plannedHours !== task.plannedHours) {
        changes.push(`Плановые часы: ${old.plannedHours ?? '—'} → ${task.plannedHours ?? '—'}`);
      }
      // Сравниваем assigneeId
      if (old.assigneeId !== task.assigneeId) {
        const oldName = old.assigneeId ? this.empName(old.assigneeId) : '—';
        const newName = task.assigneeId ? this.empName(task.assigneeId) : '—';
        changes.push(`Исполнитель: ${oldName} → ${newName}`);
      }
      if (old.status !== task.status) {
        changes.push(`Статус: ${TASK_STATUSES[old.status].label} → ${TASK_STATUSES[task.status].label}`);
        if ((task.status === 'closed' || task.status === 'cancelled') && old.status !== task.status) {
          task.closedAt = TODAY;
          if (task.creatorId) {
            this.addNotification(task.creatorId, `Задача "${task.title}" ${task.status === 'closed' ? 'закрыта' : 'отменена'}`, { targetType: 'task', targetId: task.id });
          }
          const project = this._data.projects.find(p => p.id === task.projectId);
          if (project && project.managerId && project.managerId !== task.creatorId) {
            this.addNotification(project.managerId, `Задача "${task.title}" проекта ${project.code} ${task.status === 'closed' ? 'закрыта' : 'отменена'}`, { targetType: 'task', targetId: task.id });
          }
        }
      }
      if (old.dependencyId !== task.dependencyId || old.dependencyType !== task.dependencyType) {
        const oldDep = old.dependencyId ? this._data.tasks.find(t => t.id === old.dependencyId) : null;
        const newDep = task.dependencyId ? this._data.tasks.find(t => t.id === task.dependencyId) : null;
        const depTypeLabel = task.dependencyType ? DEPENDENCY_TYPES[task.dependencyType]?.label : '';
        const oldDepStr = oldDep ? `"${oldDep.title}" (${DEPENDENCY_TYPES[old.dependencyType]?.label || 'FS'})` : 'нет';
        const newDepStr = newDep ? `"${newDep.title}" (${depTypeLabel})` : 'нет';
        changes.push(`Зависимость: ${oldDepStr} → ${newDepStr}`);
      }
      if (changes.length > 0) {
        auditMessage = `Изменение задачи "${task.title}": ${changes.join('; ')}`;
        this.addAudit('Изменение задачи', auditMessage, 'task', task.id);
      }
      tasks = this._data.tasks.map(t => t.id === task.id ? task : t);
    } else {
      if (!task.createdAt) {
        task.createdAt = new Date().toISOString();
      }
      tasks = [...this._data.tasks, task];
      this.addAudit('Создание задачи', task.title, 'task', task.id);
      if (task.assigneeId && task.assigneeId !== this._currentUser?.id) {
        this.addNotification(task.assigneeId, `Вам назначена задача "${task.title}"`, { targetType: 'task', targetId: task.id });
      }
    }

    this._data = { ...this._data, tasks };

    if (task.parentTaskId) {
      this._recalcSummaryHoursChain(task.parentTaskId);
    }
    if (task.isSummary) {
      this._recalcSummaryHoursChain(task.id);
    }

    this._notify();
    this._archiveOldTasks(3);
  }

  deleteTask(id) {
    const task = this._data.tasks.find(t => t.id === id);
    if (task) {
      this.addAudit('Удаление задачи', task.title);
    }

    const parentId = task?.parentTaskId;

    this._data.tasks = this._data.tasks.map(t => {
      if (t.parentTaskId === id) {
        return { ...t, parentTaskId: null };
      }
      return t;
    });

    this._data = { ...this._data, tasks: this._data.tasks.filter(t => t.id !== id) };

    if (parentId) {
      this._recalcSummaryHoursChain(parentId);
    }

    this._notify();
  }

  upsertProject(project) {
    const idx = this._data.projects.findIndex(p => p.id === project.id);
    let projects;
    let auditMessage = '';
    if (idx >= 0) {
      const oldProject = this._data.projects[idx];
      const changes = [];
      if (oldProject.name !== project.name) changes.push(`Название: "${oldProject.name}" → "${project.name}"`);
      if (oldProject.code !== project.code) changes.push(`Код: "${oldProject.code}" → "${project.code}"`);
      if (oldProject.budget !== project.budget) changes.push(`Бюджет: ${oldProject.budget ?? '—'} → ${project.budget ?? '—'}`);
      if (oldProject.status !== project.status) {
        changes.push(`Статус: ${PROJECT_STATUSES[oldProject.status]} → ${PROJECT_STATUSES[project.status]}`);
        if ((project.status === 'closed' || project.status === 'cancelled') && oldProject.status !== project.status) {
          project.archived = true;
          project.archivedAt = TODAY;
          this._data.tasks = this._data.tasks.map(t => {
            if (t.projectId === project.id) {
              const updated = { ...t, archived: true, archivedAt: TODAY };
              if (t.creatorId) {
                this.addNotification(t.creatorId, `Задача "${t.title}" проекта ${project.code} архивирована (проект закрыт)`, { targetType: 'task', targetId: t.id });
              }
              return updated;
            }
            return t;
          });
          this.addNotification(project.managerId || 'system', `Проект "${project.name}" архивирован`, { targetType: 'project', targetId: project.id });
        }
      }
      if (changes.length > 0) {
        auditMessage = `Изменение проекта "${project.name}": ${changes.join('; ')}`;
        this.addAudit('Изменение проекта', auditMessage, 'project', project.id);
      }
      projects = this._data.projects.map(p => p.id === project.id ? project : p);
    } else {
      projects = [...this._data.projects, project];
      this.addAudit('Создание проекта', project.name, 'project', project.id);
    }
    this._data = { ...this._data, projects };
    this._notify();
    this._archiveOldTasks(3);
  }

  deleteProject(id) {
    const project = this._data.projects.find(p => p.id === id);
    if (project) {
      this.addAudit('Удаление проекта', project.name);
    }
    this._data = {
      ...this._data,
      projects: this._data.projects.filter(p => p.id !== id),
      tasks: this._data.tasks.filter(t => t.projectId !== id)
    };
    this._notify();
  }

  upsertVacation(vac) {
    const idx = this._data.vacations.findIndex(v => v.id === vac.id);
    let vacations;
    if (idx >= 0) {
      const old = this._data.vacations[idx];
      this.addAudit('Изменение отпуска', `${vac.empId} ${fmtDMY(vac.start)}—${fmtDMY(vac.end)}`);
      vacations = this._data.vacations.map(v => v.id === vac.id ? vac : v);
    } else {
      vacations = [...this._data.vacations, vac];
      this.addAudit('Создание отпуска', `${vac.empId} ${fmtDMY(vac.start)}—${fmtDMY(vac.end)}`);
    }
    this._data = { ...this._data, vacations };
    this._notify();
    if (vac.delegation.enabled && vac.status === 'approved' && vac.start <= TODAY) {
      this.applyDelegation(vac.id);
    }
  }

  deleteVacation(id) {
    const vac = this._data.vacations.find(v => v.id === id);
    if (vac) {
      this.addAudit('Удаление отпуска', `${vac.empId} ${fmtDMY(vac.start)}—${fmtDMY(vac.end)}`);
      if (vac.delegation.enabled) {
        this.revertDelegation(id);
      }
    }
    this._data = { ...this._data, vacations: this._data.vacations.filter(v => v.id !== id) };
    this._notify();
  }

  applyDelegation(vacationId) {
    const vac = this._data.vacations.find(v => v.id === vacationId);
    if (!vac || !vac.delegation.enabled || vac.status !== 'approved') return;
    const start = vac.start;
    const end = vac.end;
    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    const statuses = vac.delegation.statuses.length ? vac.delegation.statuses : ['new', 'inwork', 'review'];
    this._data.tasks = this._data.tasks.map(t => {
      if (t.archived) return t;
      if (t.assigneeId !== fromId) return t;
      if (!statuses.includes(t.status)) return t;
      if (t.deadline && t.deadline < start) return t;
      const updated = { ...t, assigneeId: toId };
      updated.history = [...updated.history, {
        ts: Date.now(),
        who: 'system',
        text: `Задача переназначена с ${this.empName(fromId)} на ${this.empName(toId)} на период отпуска с ${fmtDMY(start)} по ${fmtDMY(end)}`
      }];
      return updated;
    });
    this._notify();
    this.addNotification(toId, `Вам переданы задачи ${this.empName(fromId)} на время отпуска`, { targetType: 'vacation', targetId: vacationId });
    this.addNotification(fromId, `Ваши задачи переданы ${this.empName(toId)} на период отпуска`, { targetType: 'vacation', targetId: vacationId });
  }

  revertDelegation(vacationId) {
    const vac = this._data.vacations.find(v => v.id === vacationId);
    if (!vac || !vac.delegation.enabled) return;
    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    this._data.tasks = this._data.tasks.map(t => {
      if (t.archived) return t;
      if (t.assigneeId !== toId) return t;
      const hasDelegation = t.history.some(h => h.text.includes(`переназначена с ${this.empName(fromId)} на ${this.empName(toId)}`));
      if (!hasDelegation) return t;
      const updated = { ...t, assigneeId: fromId };
      updated.history = [...updated.history, {
        ts: Date.now(),
        who: 'system',
        text: `Задача возвращена ${this.empName(fromId)} по окончании отпуска`
      }];
      return updated;
    });
    this._notify();
    this.addNotification(fromId, `Задачи возвращены вам по окончании отпуска`, { targetType: 'vacation', targetId: vacationId });
  }

  upsertEmployee(emp) {
    const idx = this._data.employees.findIndex(e => e.id === emp.id);
    let employees;
    if (idx >= 0) {
      const old = this._data.employees[idx];
      if (JSON.stringify(old.departments) !== JSON.stringify(emp.departments)) {
        this.addAudit('Изменение подразделений', `${emp.last} ${emp.first}: ${old.departments.map(d => d.deptId).join(',')} → ${emp.departments.map(d => d.deptId).join(',')}`);
      }
      if (JSON.stringify(old.roles) !== JSON.stringify(emp.roles)) {
        this.addAudit('Изменение ролей', `${emp.last} ${emp.first}: ${old.roles.join(', ')} → ${emp.roles.join(', ')}`);
      }
      employees = this._data.employees.map(e => e.id === emp.id ? emp : e);
    } else {
      employees = [...this._data.employees, emp];
      this.addAudit('Создание сотрудника', `${emp.last} ${emp.first}`);
    }
    this._data = { ...this._data, employees };
    this._notify();
  }

  upsertDepartment(dept) {
    const idx = this._data.departments.findIndex(d => d.id === dept.id);
    let departments;
    if (idx >= 0) {
      departments = this._data.departments.map(d => d.id === dept.id ? dept : d);
    } else {
      departments = [...this._data.departments, dept];
      this.addAudit('Создание отдела', dept.name);
    }
    this._data = { ...this._data, departments };
    this._notify();
  }

  upsertKb(kb) {
    const idx = this._data.kbs.findIndex(k => k.id === kb.id);
    let kbs;
    if (idx >= 0) {
      kbs = this._data.kbs.map(k => k.id === kb.id ? kb : k);
    } else {
      kbs = [...this._data.kbs, kb];
      this.addAudit('Создание КБ', kb.name);
    }
    this._data = { ...this._data, kbs };
    this._notify();
  }

  addAudit(action, details, targetType = null, targetId = null) {
    let detailsStr = details;
    if (typeof details === 'object') {
      detailsStr = JSON.stringify(details);
    }
    this._data = {
      ...this._data,
      audit: [
        {
          id: uid(),
          ts: Date.now(),
          userId: this._currentUser?.id || "system",
          action,
          details: detailsStr,
          targetType,
          targetId,
        },
        ...this._data.audit
      ]
    };
    this._notify();
  }

  addNotification(userId, text, target = null) {
    this._data = {
      ...this._data,
      notifications: [
        { id: uid(), userId, text, ts: Date.now(), read: false, targetType: target?.targetType || null, targetId: target?.targetId || null },
        ...this._data.notifications
      ]
    };
    this._notify();
  }

  markNotificationRead(id) {
    this._data = {
      ...this._data,
      notifications: this._data.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    };
    this._notify();
  }

  markAllNotificationsRead(userId) {
    this._data = {
      ...this._data,
      notifications: this._data.notifications.map(n => n.userId === userId ? { ...n, read: true } : n)
    };
    this._notify();
  }

  addHoursRequest(req) {
    this._data = { ...this._data, hoursRequests: [req, ...this._data.hoursRequests] };
    this._notify();
  }

  upsertRoleDelegation(rd) {
    const idx = this._data.roleDelegations.findIndex(r => r.id === rd.id);
    let roleDelegations;
    if (idx >= 0) {
      roleDelegations = this._data.roleDelegations.map(r => r.id === rd.id ? rd : r);
    } else {
      roleDelegations = [...this._data.roleDelegations, rd];
      this.addAudit('Создание делегирования ролей', `${rd.fromId} → ${rd.toId}: ${rd.roles.join(', ')}`);
    }
    this._data = { ...this._data, roleDelegations };
    this._notify();
  }

  empName(id) {
    const e = this._data.employees.find(x => x.id === id);
    return e ? `${e.last} ${e.first}` : '—';
  }
}
```
### `src/services/mockData.js`
```javascript
import { TODAY, iso, addDays, addMonths, uid } from '../utils/date';
import { TASK_STATUSES, VACATION_TYPES, PROJECT_STATUSES } from '../utils/constants';

export function buildMockData() {
  const D = (off) => iso(addDays(new Date(), off));
  const now = Date.now();
  const makeDate = (daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return iso(d);
  };

  const settings = { archiveMonths: 6 };

  const kbs = [
    { id: "kb_la", name: "КБ «ЛА»", full: "Конструкторское бюро летательных аппаратов" },
    { id: "kb_ad", name: "КБ «АД»", full: "Конструкторское бюро авиационных двигателей" },
  ];

  const departments = [
    { id: "d_aero", name: "Отдел аэродинамики", kbId: "kb_la" },
    { id: "d_strla", name: "Отдел прочности", kbId: "kb_la" },
    { id: "d_comp", name: "Отдел компоновки и весовых балансов", kbId: "kb_la" },
    { id: "d_gas", name: "Отдел газодинамики", kbId: "kb_ad" },
    { id: "d_stren", name: "Отдел прочности двигателей", kbId: "kb_ad" },
    { id: "d_sau", name: "Отдел систем автоматического управления", kbId: "kb_ad" },
    { id: "d_av1", name: "Отдел бортового радиоэлектронного оборудования (ОБРЭО)", kbId: "kb_la" },
    { id: "d_otk", name: "Отдел контроля качества инженерного центра", kbId: null },
    { id: "d_hr", name: "Отдел управления персоналом", kbId: null },
    { id: "d_management", name: "Группа управления и развития", kbId: null },
  ];

  const employees = [
    { id: "sergey.adminov", last: "Админов", first: "Сергей", email: "sergey.adminov", pass: "Admin2026!", position: "Администратор системы", departments: [{ deptId: "d_otk", primary: true }], roles: ["admin"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "101", tab: "1001", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "aleksey.gendirov", last: "Гендиров", first: "Алексей", email: "aleksey.gendirov", pass: "Director2026!", position: "Генеральный директор", departments: [], roles: ["director"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "102", tab: "1002", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "erik.ekonomistov", last: "Экономистов", first: "Эрик", email: "erik.ekonomistov", pass: "Econ2026!", position: "Главный экономист", departments: [{ deptId: "d_management", primary: true }], roles: ["economist"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "103", tab: "1003", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "ivan.konstruktorov", last: "Конструкторов", first: "Иван", email: "ivan.konstruktorov", pass: "KbLa2026!", position: "Главный конструктор КБ «ЛА»", departments: [], roles: ["kb_chief", "executor"], kbIds: ["kb_la"], headDeptIds: [], phone: "+7 900 000-00-00", extension: "104", tab: "1004", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_belova", last: "Белова", first: "Наталья", email: "belova", pass: "KbAd2026!", position: "Главный конструктор КБ «АД»", departments: [], roles: ["kb_chief", "executor"], kbIds: ["kb_ad"], headDeptIds: [], phone: "+7 900 000-00-00", extension: "105", tab: "1005", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "olga.personalova", last: "Персоналова", first: "Ольга", email: "olga.personalova", pass: "Hr2026!", position: "Руководитель отдела управления персоналом", departments: [{ deptId: "d_hr", primary: true }], roles: ["hr", "head", "executor"], kbIds: [], headDeptIds: ["d_hr"], phone: "+7 900 000-00-00", extension: "106", tab: "1006", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "mikhail.otdelov", last: "Отделов", first: "Михаил", email: "mikhail.otdelov", pass: "Head2026!", position: "Начальник отдела аэродинамики", departments: [{ deptId: "d_aero", primary: true }, { deptId: "d_comp", primary: false }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_aero", "d_comp"], phone: "+7 900 000-00-00", extension: "107", tab: "1007", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "kirill.proektov", last: "Проектов", first: "Кирилл", email: "kirill.proektov", pass: "Pm2026!", position: "Инженер", departments: [{ deptId: "d_aero", primary: true }], roles: ["project_lead", "executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "116", tab: "1016", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "nikolay.managerov", last: "Менеджеров", first: "Николай", email: "nikolay.managerov", pass: "Pm2026!", position: "Менеджер проектов", departments: [{ deptId: "d_av1", primary: true }], roles: ["project_manager", "executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "117", tab: "1017", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_otk_head", last: "Отков", first: "Олег", email: "otk.head", pass: "Head2026!", position: "Руководитель отдела контроля качества", departments: [{ deptId: "d_otk", primary: true }], roles: ["head", "executor"], kbIds: [], headDeptIds: ["d_otk"], phone: "+7 900 000-00-00", extension: "201", tab: "2001", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_otk_spec", last: "Специалистов", first: "Сергей", email: "otk.spec", pass: "Exec2026!", position: "Специалист по контролю качества", departments: [{ deptId: "d_otk", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "202", tab: "2002", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "isaev", last: "Исаев", first: "Роман", email: "isaev", pass: "Exec2026!", position: "Инженер-аэродинамик", departments: [{ deptId: "d_aero", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "118", tab: "1018", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_fedorov", last: "Фёдоров", first: "Игорь", email: "fedorov", pass: "Head2026!", position: "Начальник отдела аэродинамики", departments: [{ deptId: "d_aero", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_aero", "d_comp"], phone: "+7 900 000-00-00", extension: "107", tab: "1007", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_gromov", last: "Громов", first: "Сергей", email: "gromov", pass: "Head2026!", position: "Начальник отдела прочности", departments: [{ deptId: "d_strla", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_strla"], phone: "+7 900 000-00-00", extension: "108", tab: "1008", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_ilina", last: "Ильина", first: "Анна", email: "ilina", pass: "Exec2026!", position: "Ведущий инженер-компоновщик", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "109", tab: "1009", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_krylov", last: "Крылов", first: "Виктор", email: "krylov", pass: "Head2026!", position: "Начальник отдела газодинамики", departments: [{ deptId: "d_gas", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_gas"], phone: "+7 900 000-00-00", extension: "110", tab: "1010", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_medvedev", last: "Медведев", first: "Павел", email: "medvedev", pass: "Head2026!", position: "Начальник отдела прочности двигателей", departments: [{ deptId: "d_stren", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_stren"], phone: "+7 900 000-00-00", extension: "111", tab: "1011", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_orlova", last: "Орлова", first: "Елена", email: "orlova", pass: "Head2026!", position: "Начальник отдела САУ", departments: [{ deptId: "d_sau", primary: true }], roles: ["head", "executor"], kbIds: [], headDeptIds: ["d_sau"], phone: "+7 900 000-00-00", extension: "112", tab: "1012", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_morozov", last: "Морозов", first: "Константин", email: "morozov", pass: "Pm2026!", position: "Ведущий инженер", departments: [{ deptId: "d_aero", primary: true }], roles: ["project_lead", "executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "116", tab: "1016", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_zaitsev", last: "Зайцев", first: "Алексей", email: "zaitsev", pass: "Exec2026!", position: "Инженер по прочности", departments: [{ deptId: "d_strla", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "119", tab: "1019", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_frolova", last: "Фролова", first: "Дарья", email: "frolova", pass: "Exec2026!", position: "Инженер-расчётчик", departments: [{ deptId: "d_strla", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "120", tab: "1020", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_tolka", last: "Толкачёва", first: "Ирина", email: "tolkacheva", pass: "Exec2026!", position: "Инженер-конструктор", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "121", tab: "1021", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_gusev", last: "Гусев", first: "Максим", email: "gusev", pass: "Exec2026!", position: "Инженер по весам", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "122", tab: "1022", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_tihonov", last: "Тихонов", first: "Егор", email: "tihonov", pass: "Exec2026!", position: "Инженер-газодинамик", departments: [{ deptId: "d_gas", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "123", tab: "1023", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_melnik", last: "Мельник", first: "Светлана", email: "melnik", pass: "Exec2026!", position: "Инженер по ресурсу", departments: [{ deptId: "d_stren", primary: true }, { deptId: "d_gas", primary: false }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "124", tab: "1024", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_koval", last: "Ковальчук", first: "Пётр", email: "kovalchuk", pass: "Exec2026!", position: "Инженер-программист САУ", departments: [{ deptId: "d_sau", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "125", tab: "1025", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_somova", last: "Сомова", first: "Екатерина", email: "somova", pass: "Exec2026!", position: "Инженер-конструктор", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "126", tab: "1026", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    { id: "e_anokhin", last: "Анохин", first: "Сергей", email: "anokhin", pass: "Exec2026!", position: "Инженер по ОБРЭО", departments: [{ deptId: "d_av1", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "127", tab: "1027", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
  ];

  const projects = [
    {
      id: "p_lm24",
      code: "ЛМ-24",
      name: "Лёгкий многоцелевой самолёт ЛМ-24",
      desc: "ОКР по созданию лёгкого многоцелевого самолёта.",
      kbId: "kb_la",
      managerId: "e_morozov",
      start: D(-25),
      end: D(50),
      status: "active",
      budget: 300,
      color: "#0ea5e9",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "Минобороны РФ",
      aircraftType: "Су-57",
      projectType: "Модификация",
      stage: "Рабочая документация",
      priority: "AOG",
      comments: [],
      history: [{ ts: Date.now() - 86400000*10, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_cert",
      code: "СЕРТ-24",
      name: "Сертификация самолёта ЛМ-24",
      desc: "Комплекс сертификационных работ.",
      kbId: "kb_la",
      managerId: "e_fedorov",
      start: D(-10),
      end: D(45),
      status: "active",
      budget: 90,
      color: "#8b5cf6",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "Росавиация",
      aircraftType: "Су-57",
      projectType: "Модификация",
      stage: "Испытания",
      priority: "CRIT",
      comments: [],
      history: [{ ts: Date.now() - 86400000*9, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_heli",
      code: "В-112",
      name: "Модернизация вертолёта В-112",
      desc: "Модернизация планера и систем.",
      kbId: "kb_la",
      managerId: "e_gromov",
      start: D(-30),
      end: D(35),
      status: "active",
      budget: 120,
      color: "#f43f5e",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "ВКС РФ",
      aircraftType: "Ка-52",
      projectType: "Ремонт",
      stage: "Изготовление",
      priority: "NORM",
      comments: [],
      history: [{ ts: Date.now() - 86400000*8, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_rd900",
      code: "РД-900",
      name: "Турбовинтовой двигатель РД-900",
      desc: "Перспективный ТВД.",
      kbId: "kb_ad",
      managerId: "e_krylov",
      start: D(-20),
      end: D(60),
      status: "active",
      budget: 200,
      color: "#f59e0b",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "ОАК",
      aircraftType: "Ил-76",
      projectType: "Модификация",
      stage: "Эскизный проект",
      priority: "CRIT",
      comments: [],
      history: [{ ts: Date.now() - 86400000*7, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_apu",
      code: "ВСУ-14",
      name: "Вспомогательная силовая установка ВСУ-14",
      desc: "ВСУ для ЛМ-24.",
      kbId: "kb_ad",
      managerId: "e_medvedev",
      start: D(-12),
      end: D(30),
      status: "active",
      budget: 70,
      color: "#10b981",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "Минобороны РФ",
      aircraftType: "Су-57",
      projectType: "Ремонт",
      stage: "Рабочая документация",
      priority: "NORM",
      comments: [],
      history: [{ ts: Date.now() - 86400000*6, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_obr",
      code: "ОБРЭО-01",
      name: "Модернизация бортового оборудования",
      desc: "Замена аналоговых систем на цифровые.",
      kbId: null,
      managerId: "nikolay.managerov",
      start: D(-5),
      end: D(20),
      status: "active",
      budget: 150,
      color: "#f97316",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "nikolay.managerov",
      customer: "Ростех",
      aircraftType: "МиГ-35",
      projectType: "Модификация",
      stage: "Эскизный проект",
      priority: "AOG",
      comments: [],
      history: [{ ts: Date.now() - 86400000*5, who: "nikolay.managerov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_event",
      code: "АДМ-1",
      name: "Внутренние мероприятия предприятия",
      desc: "Административный проект: организационные работы и мероприятия.",
      kbId: null,
      managerId: "",
      start: D(-5),
      end: null,
      status: "active",
      budget: null,
      color: "#14b8a6",
      ptype: "admin",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "ООО «ВДИ»",
      aircraftType: "Другой",
      projectType: "Модификация",
      stage: "Сдача",
      priority: "NORM",
      comments: [],
      history: [{ ts: Date.now() - 86400000*4, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_old",
      code: "ИТ-15",
      name: "Модернизация локальной сети предприятия",
      desc: "Проект завершён более полугода назад — подлежит архивации.",
      kbId: null,
      managerId: "e_morozov",
      start: D(-300),
      end: D(-230),
      status: "closed",
      budget: 120,
      color: "#94a3b8",
      ptype: "prod",
      archived: true,
      archivedAt: D(-215),
      closedAt: D(-215),
      creatorId: "aleksey.gendirov",
      customer: "ООО «ВДИ»",
      aircraftType: "Другой",
      projectType: "Ремонт",
      stage: "Сдача",
      priority: "NORM",
      comments: [],
      history: [{ ts: Date.now() - 86400000*300, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_long",
      code: "АДМ-0",
      name: "Многолетняя программа внутренних мероприятий",
      desc: "Долгосрочный административный проект — исключение из архивации.",
      kbId: null,
      managerId: "olga.personalova",
      start: D(-400),
      end: null,
      status: "closed",
      budget: null,
      color: "#f59e0b",
      ptype: "admin",
      longterm: true,
      archived: false,
      archivedAt: null,
      closedAt: D(-300),
      creatorId: "aleksey.gendirov",
      customer: "ООО «ВДИ»",
      aircraftType: "Другой",
      projectType: "Модификация",
      stage: "Сдача",
      priority: "NORM",
      comments: [],
      history: [{ ts: Date.now() - 86400000*400, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_aero",
      code: "АЭРО-24",
      name: "Аэродинамические исследования ЛМ-24",
      desc: "Исследования аэродинамических характеристик самолёта.",
      kbId: "kb_la",
      managerId: "mikhail.otdelov",
      start: D(-10),
      end: D(30),
      status: "active",
      budget: 80,
      color: "#f97316",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "Минобороны РФ",
      aircraftType: "Су-57",
      projectType: "Модификация",
      stage: "Испытания",
      priority: "CRIT",
      comments: [],
      history: [{ ts: Date.now() - 86400000*3, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_proch",
      code: "ПРОЧ-24",
      name: "Прочностные испытания планера",
      desc: "Статические и усталостные испытания.",
      kbId: "kb_la",
      managerId: "e_gromov",
      start: D(-5),
      end: D(20),
      status: "active",
      budget: 100,
      color: "#8b5cf6",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "ВКС РФ",
      aircraftType: "Су-57",
      projectType: "Модификация",
      stage: "Изготовление",
      priority: "NORM",
      comments: [],
      history: [{ ts: Date.now() - 86400000*2, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_sau",
      code: "САУ-24",
      name: "Система управления двигателем РД-900",
      desc: "Разработка цифровой системы управления.",
      kbId: "kb_ad",
      managerId: "e_orlova",
      start: D(-2),
      end: D(25),
      status: "active",
      budget: 120,
      color: "#14b8a6",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "ОАК",
      aircraftType: "Ил-76",
      projectType: "Модификация",
      stage: "Эскизный проект",
      priority: "NORM",
      comments: [],
      history: [{ ts: Date.now() - 86400000*1, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_obr_sw",
      code: "ОБРЭО-ПО",
      name: "Разработка ПО для ОБРЭО",
      desc: "Программное обеспечение для бортового оборудования.",
      kbId: "kb_la",
      managerId: "nikolay.managerov",
      start: D(0),
      end: D(30),
      status: "active",
      budget: 90,
      color: "#0ea5e9",
      ptype: "prod",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "nikolay.managerov",
      customer: "Ростех",
      aircraftType: "МиГ-35",
      projectType: "Модификация",
      stage: "Рабочая документация",
      priority: "CRIT",
      comments: [],
      history: [{ ts: Date.now(), who: "nikolay.managerov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_portal",
      code: "ПОРТ-24",
      name: "Внутренний портал сотрудника",
      desc: "Административный проект по созданию портала.",
      kbId: null,
      managerId: "olga.personalova",
      start: D(-20),
      end: D(40),
      status: "active",
      budget: null,
      color: "#f59e0b",
      ptype: "admin",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "ООО «ВДИ»",
      aircraftType: "Другой",
      projectType: "Модификация",
      stage: "Эскизный проект",
      priority: "NORM",
      comments: [],
      history: [{ ts: Date.now() - 86400000*2, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
    {
      id: "p_bp",
      code: "БП-24",
      name: "Оптимизация бизнес-процессов",
      desc: "Анализ и оптимизация процессов.",
      kbId: null,
      managerId: "erik.ekonomistov",
      start: D(-15),
      end: D(15),
      status: "active",
      budget: null,
      color: "#f43f5e",
      ptype: "admin",
      archived: false,
      archivedAt: null,
      closedAt: null,
      creatorId: "aleksey.gendirov",
      customer: "ООО «ВДИ»",
      aircraftType: "Другой",
      projectType: "Модификация",
      stage: "Рабочая документация",
      priority: "NORM",
      comments: [],
      history: [{ ts: Date.now() - 86400000*1, who: "aleksey.gendirov", text: "Проект создан" }],
      files: [],
    },
  ];

  // Вспомогательная функция для создания задач с одним исполнителем (assigneeId)
  const T = (id, title, projectId, assigneeId, planned, s, dl, status, priority, desc, extra = {}) => {
    const history = extra.history || [{ ts: now - 86400000 * 6, who: extra.creatorId || "aleksey.gendirov", text: "Задача создана" }];
    const creatorId = extra.creatorId || (history.length > 0 ? history[0].who : "aleksey.gendirov");
    const startDate = makeDate(s);
    const deadlineDate = dl !== null ? makeDate(dl) : null;
    const createdAtDate = new Date(startDate);
    createdAtDate.setDate(createdAtDate.getDate() + Math.floor(Math.random() * 11) - 5);
    const createdAtStr = createdAtDate.toISOString();
    return {
      id, title, desc: desc || "", projectId,
      assigneeId: assigneeId || null,  // один исполнитель
      plannedHours: planned,
      start: startDate,
      deadline: deadlineDate,
      status,
      priority,
      logs: extra.logs || [],
      comments: extra.comments || [],
      history,
      creatorId,
      createdAt: extra.createdAt || createdAtStr,
      delegatedFrom: extra.delegatedFrom || null,
      archived: extra.archived || false,
      archivedAt: extra.archivedAt || null,
      closedAt: extra.closedAt || null,
      isSummary: extra.isSummary || false,
      parentTaskId: extra.parentTaskId || null,
      files: extra.files || [],
      dependencyId: extra.dependencyId || null,
      dependencyType: extra.dependencyType || 'FS',
    };
  };

  const tasks = [
    T("t01", "Расчёт подъёмной силы крыла", "p_lm24", "isaev", 24, -12, 6, "inwork", "high", "Расчёт и оформление отчёта.", {
      logs: [ { id: uid(), userId: "isaev", date: makeDate(-6), hours: 6, note: "Проверка методики" }, { id: uid(), userId: "isaev", date: makeDate(-2), hours: 5, note: "Расчётная сетка" } ],
      comments: [ { id: "c1", parentId: null, authorId: "e_morozov", ts: now - 3600000 * 20, text: "@Исаев Роман — подключите, пожалуйста, отдел прочности к пятнице." }, { id: "c2", parentId: "c1", authorId: "isaev", ts: now - 3600000 * 18, text: "Принято, сегодня подготовлю исходные данные." } ],
      creatorId: "e_morozov"
    }),
    T("t02", "3D-модель фюзеляжа", "p_lm24", "e_tolka", 40, -15, 12, "inwork", "mid", "Силовой набор и обводы.", {
      logs: [ { id: uid(), userId: "e_tolka", date: makeDate(-5), hours: 8, note: "Шпангоуты" } ],
      creatorId: "e_morozov"
    }),
    T("t03", "Нагрузки на элероны", "p_lm24", "e_zaitsev", 16, -10, -2, "new", "crit", "Эпюры нагрузок для навесок.", { creatorId: "e_morozov" }),
    T("t04", "Отчёт по прочности фюзеляжа", "p_lm24", "e_frolova", 32, -8, 18, "review", "high", "Статика и усталость.", {
      logs: [ { id: uid(), userId: "e_frolova", date: makeDate(-3), hours: 12, note: "МКЭ-модель" } ],
      creatorId: "e_morozov"
    }),
    T("t05", "Весовая сводка компоновки", "p_lm24", "e_gusev", 20, -5, 9, "inwork", "mid", "", {
      logs: [ { id: uid(), userId: "e_gusev", date: makeDate(-1), hours: 4, note: "Сведение таблиц" } ],
      creatorId: "e_morozov"
    }),
    T("t06", "Программа лётных испытаний", "p_cert", "e_fedorov", 16, -2, 25, "new", "mid", "Совместно с лётной службой.", { creatorId: "e_fedorov" }),
    T("t07", "Согласование плана статиспытаний", "p_cert", "e_anokhin", 12, -4, 4, "inwork", "high", "", {
      logs: [ { id: uid(), userId: "e_anokhin", date: makeDate(-2), hours: 3, note: "Замечания" } ],
      creatorId: "e_fedorov"
    }),
    T("t08", "Чертежи лопастей несущего винта", "p_heli", "e_somova", 36, -18, 20, "inwork", "high", "Переназначено на период отпуска Сомовой.", {
      delegatedFrom: "e_somova",
      logs: [ { id: uid(), userId: "e_somova", date: makeDate(-7), hours: 10, note: "Комлевая часть" } ],
      creatorId: "e_gromov"
    }),
    T("t09", "Вибрационный расчёт главного редуктора", "p_heli", "isaev", 18, -6, 14, "new", "mid", "", { creatorId: "e_gromov" }),
    T("t10", "Термогазодинамический расчёт компрессора", "p_rd900", "e_tihonov", 48, -14, 28, "inwork", "crit", "Режимы взлёт/крейсер.", {
      logs: [ { id: uid(), userId: "e_tihonov", date: makeDate(-4), hours: 12, note: "Характеристики ступеней" } ],
      creatorId: "e_krylov"
    }),
    T("t11", "Прочность камеры сгорания", "p_rd900", "e_medvedev", 30, -9, 22, "inwork", "mid", "", {
      logs: [ { id: uid(), userId: "e_medvedev", date: makeDate(-3), hours: 6, note: "Теплонапряжённость" } ],
      creatorId: "e_krylov"
    }),
    T("t12", "ТЗ на САУ-900", "p_rd900", "e_orlova", 20, -7, 10, "review", "mid", "", {
      logs: [ { id: uid(), userId: "e_orlova", date: makeDate(-2), hours: 8, note: "Разделы 3–5" } ],
      creatorId: "e_krylov"
    }),
    T("t13", "Компрессор ВСУ-14", "p_apu", "e_tihonov", 22, -4, 16, "new", "mid", "", { creatorId: "e_medvedev" }),
    T("t14", "Испытания стартер-генератора ВСУ", "p_apu", "e_gusev", 14, -12, -4, "inwork", "high", "Стенд №3, протокол.", {
      logs: [ { id: uid(), userId: "e_gusev", date: makeDate(-6), hours: 6, note: "Прогон на стенде" } ],
      creatorId: "e_medvedev"
    }),
    T("t15", "Разработка ТЗ на новое радиооборудование", "p_obr", "e_anokhin", 30, -3, 15, "inwork", "high", "Требования к дальности и помехозащищённости.", { creatorId: "nikolay.managerov" }),
    T("t16", "Тестирование прототипа приемника", "p_obr", "e_anokhin", 20, 2, 18, "new", "mid", "", { creatorId: "nikolay.managerov" }),
    T("t17", "Интеграция с бортовой шиной", "p_obr", "e_anokhin", 24, 5, 25, "new", "mid", "", { creatorId: "nikolay.managerov" }),
    T("t18", "Подготовка зала ко Дню промышленности", "p_event", "olga.personalova", null, 0, 6, "new", "mid", "", { creatorId: "olga.personalova" }),
    T("t19", "Заказать сувенирную продукцию", "p_event", "olga.personalova", 6, 1, 10, "new", "low", "", { creatorId: "olga.personalova" }),
    T("t_a1", "Монтаж оборудования точек доступа", "p_old", "e_anokhin", 30, -290, -240, "closed", "mid", "Завершено в прошлом отчётном периоде.", {
      logs: [ { id: uid(), userId: "e_anokhin", date: makeDate(-250), hours: 28, note: "Монтаж и пусконаладка" } ],
      closedAt: D(-215),
      comments: [ { id: "ca1", parentId: null, authorId: "e_morozov", ts: now - 86400000 * 220, text: "Прошу зафиксировать итоговую схему размещения точек." }, { id: "ca2", parentId: "ca1", authorId: "e_anokhin", ts: now - 86400000 * 218, text: "Схема приложена к отчёту, всё смонтировано." } ],
      creatorId: "e_morozov"
    }),
    T("t_a2", "Аудит сетевых кабелей", "p_old", "e_morozov", 18, -280, -235, "closed", "low", "", {
      logs: [ { id: uid(), userId: "e_morozov", date: makeDate(-240), hours: 16, note: "Аудит завершён" } ],
      closedAt: D(-220),
      creatorId: "e_morozov"
    }),
    T("t_a3", "Подготовка регламента мероприятий", "p_long", "olga.personalova", 10, -320, -305, "closed", "low", "Задача долгосрочного административного проекта — не архивируется.", {
      logs: [ { id: uid(), userId: "olga.personalova", date: makeDate(-310), hours: 9, note: "Регламент готов" } ],
      closedAt: D(-300),
      creatorId: "olga.personalova"
    }),
    T("t20", "Аудит качества сборки", "p_lm24", "sergey.adminov", 12, -8, 5, "new", "high", "Проверка соответствия технологии."),
    T("t21", "Утверждение стратегии развития", "p_bp", "aleksey.gendirov", 8, -5, 10, "new", "high", "Подготовка и утверждение стратегии."),
    T("t22", "Анализ бюджетов проектов", "p_bp", "erik.ekonomistov", 16, -3, 12, "inwork", "mid", "Сравнение плановых и фактических затрат.", {
      logs: [ { id: uid(), userId: "erik.ekonomistov", date: makeDate(-2), hours: 8, note: "Сбор данных" } ]
    }),
    T("t23", "Руководство проектированием крыла", "p_lm24", "ivan.konstruktorov", 20, -10, 15, "inwork", "crit", "Общее руководство конструкторской группой."),
    T("t24", "Расчёт газодинамики двигателя", "p_rd900", "e_belova", 30, -12, 20, "new", "high", "Расчёт параметров рабочего процесса."),
    T("t25", "Координация аэродинамических расчётов", "p_aero", "mikhail.otdelov", 18, -5, 10, "inwork", "mid", "Сведение результатов.", {
      logs: [ { id: uid(), userId: "mikhail.otdelov", date: makeDate(-2), hours: 6, note: "Совещание" } ]
    }),
    T("t26", "Планирование испытаний", "p_cert", "kirill.proektov", 14, -4, 8, "new", "mid", "Разработка программы испытаний."),
    T("t27", "Управление проектом ОБРЭО", "p_obr", "nikolay.managerov", 24, -3, 15, "inwork", "high", "Координация работ по проекту.", {
      logs: [ { id: uid(), userId: "nikolay.managerov", date: makeDate(-1), hours: 6, note: "План-график" } ]
    }),
    T("t28", "Контроль качества сборки", "p_lm24", "e_otk_head", 16, -6, 4, "new", "high", "Входной контроль комплектующих."),
    T("t29", "Проверка документации", "p_lm24", "e_otk_spec", 12, -4, 2, "new", "mid", "Проверка конструкторской документации."),
    T("t31", "Термогазодинамика РД-900", "p_rd900", "e_krylov", 26, -10, 18, "inwork", "crit", "Термодинамические расчёты.", {
      logs: [ { id: uid(), userId: "e_krylov", date: makeDate(-3), hours: 12, note: "Моделирование" } ]
    }),
    T("t32", "Планирование прочностных испытаний", "p_proch", "e_gromov", 14, -2, 6, "new", "mid", "План испытаний планера."),
    T("t33", "Компоновка отсеков", "p_lm24", "e_ilina", 20, -8, 10, "inwork", "mid", "Размещение оборудования.", {
      logs: [ { id: uid(), userId: "e_ilina", date: makeDate(-1), hours: 4, note: "Эскизы" } ]
    }),
    T("t34", "Программирование САУ", "p_sau", "e_koval", 40, -6, 20, "new", "high", "Разработка ПО для управления двигателем."),
    T("t35", "Расчёт ресурса лопаток", "p_rd900", "e_melnik", 24, -9, 14, "inwork", "mid", "Усталостный расчёт.", {
      logs: [ { id: uid(), userId: "e_melnik", date: makeDate(-4), hours: 10, note: "Нагрузки" } ]
    }),
  ];

  const vacations = [
    { id: "v1", empId: "e_somova", start: D(-2), end: D(5), type: "annual", comment: "Отдых, Сочи", status: "approved", delegation: { enabled: true, subId: "e_anokhin", statuses: ["inwork", "review"], state: "applied" } },
    { id: "v2", empId: "e_tihonov", start: D(3), end: D(14), type: "annual", comment: "Плановый отпуск", status: "pending", delegation: { enabled: true, subId: "e_melnik", statuses: ["inwork"], state: null } },
    { id: "v3", empId: "e_gusev", start: D(-20), end: D(-8), type: "sick", comment: "Больничный лист", status: "approved", delegation: { enabled: false, subId: null, statuses: [], state: null } },
    { id: "v4", empId: "isaev", start: D(10), end: D(17), type: "annual", comment: "Отпуск", status: "pending", delegation: { enabled: false, subId: null, statuses: [], state: null } },
    { id: "v5", empId: "e_anokhin", start: D(-15), end: D(-3), type: "annual", comment: "Уже был", status: "approved", delegation: { enabled: false, subId: null, statuses: [], state: null } },
  ];

  const hoursRequests = [
    { id: "hr1", kind: "task", targetId: "t04", oldH: 32, newH: 48, reason: "Добавился расчёт усталостных трещин по требованию ОТК.", reqId: "e_morozov", status: "pending", ts: now - 3600000 * 5 },
    { id: "hr2", kind: "project", targetId: "p_lm24", oldH: 180, newH: 210, reason: "Расширение scope: добавлены работы по сертификации.", reqId: "e_morozov", status: "pending", ts: now - 3600000 * 20 },
  ];

  const regRequests = [
    { id: "rg1", first: "Олег", last: "Новиков", email: "novikov", pass: "Exec2026!", status: "pending", ts: now - 3600000 * 26 },
  ];

  const notifications = [
    { id: uid(), userId: "aleksey.gendirov", text: "Запрос на изменение плановых часов по задаче «Отчёт по прочности фюзеляжа» ожидает решения.", ts: now - 3600000 * 5, read: false, targetType: 'hours', targetId: 'hr1' },
    { id: uid(), userId: "e_fedorov", text: "Тихонов Е. подал заявку на отпуск с делегированием задач — требуется утверждение.", ts: now - 3600000 * 8, read: false, targetType: 'vacation', targetId: 'v2' },
    { id: uid(), userId: "e_anokhin", text: "Вам переданы задачи Сомовой Е. на период отпуска.", ts: now - 3600000 * 30, read: false, targetType: 'task', targetId: 't08' },
    { id: uid(), userId: "nikolay.managerov", text: "Новая заявка на регистрацию: Новиков Олег.", ts: now - 3600000 * 26, read: false, targetType: 'registration', targetId: 'rg1' },
  ];

  const audit = [
    { id: uid(), ts: now - 86400000 * 2, userId: "e_morozov", action: "Запрос изменения часов", details: "t04: 32 → 48 ч" },
    { id: uid(), ts: now - 86400000 * 3, userId: "e_morozov", action: "Утверждено делегирование отпуска", details: "Сомова Е. → Анохин С." },
    { id: uid(), ts: now - 86400000 * 6, userId: "nikolay.managerov", action: "Создан проект", details: "ОБРЭО-01" },
  ];

  return {
    settings,
    kbs,
    departments,
    employees,
    projects,
    tasks,
    vacations,
    hoursRequests,
    roleDelegations: [],
    regRequests,
    notifications,
    audit,
  };
}
```
## `src/hooks/`
- **Folder:** `hooks/`

### `src/hooks/index.js`
```javascript
export { useStore } from './useStore';
export { useAuth } from './useAuth';
export { useDataHelpers } from './useDataHelpers';
export { useTaskFilters } from './useTaskFilters';
```
### `src/hooks/useAuth.js`
```javascript
import { useState, useEffect } from 'react';
import { useStore } from './useStore';

export const useAuth = () => {
  const { store } = useStore();
  const [user, setUser] = useState(store.getCurrentUser() || null);

  useEffect(() => {
    const checkUser = () => {
      const currentUser = store.getCurrentUser() || null;
      if (currentUser !== user) {
        setUser(currentUser);
      }
    };
    const unsubscribe = store.subscribe(checkUser);
    return unsubscribe;
  }, [store, user]);

  const roles = user ? user.roles : [];
  const hasRole = (role) => roles.includes(role);
  const hasAnyRole = (...rs) => rs.some(r => roles.includes(r));
  return { user, roles, hasRole, hasAnyRole };
};
```
### `src/hooks/useDataHelpers.js`
```javascript
import { useMemo } from 'react';

export const useDataHelpers = (data) => {
  const empName = (id) => {
    if (!data || !data.employees) return '—';
    const e = data.employees.find(x => x.id === id);
    return e ? `${e.last} ${e.first}` : '—';
  };

  const primaryDept = (emp) => {
    if (!emp || !data || !data.departments) return null;
    const p = emp.departments?.find(x => x.primary) || emp.departments?.[0];
    return p ? data.departments.find(d => d.id === p.deptId) : null;
  };

  const getTaskSpent = (task) => {
    if (!task || !task.logs || !Array.isArray(task.logs)) return 0;
    return task.logs.reduce((s, l) => s + (l.hours || 0), 0);
  };

  const getProjectStats = (projectId) => {
    if (!data || !data.tasks) return { plan: 0, fact: 0, count: 0 };
    const tasks = data.tasks.filter(t => t.projectId === projectId && !t.archived);
    const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
    const fact = tasks.reduce((s, t) => s + getTaskSpent(t), 0);
    return { plan, fact, count: tasks.length };
  };

  const getEmployeeLoad = (empId) => {
    if (!data || !data.tasks) return { plan: 0, cnt: 0 };
    const active = data.tasks.filter(t => !t.archived && t.assigneeId === empId && !['closed','cancelled'].includes(t.status));
    return { plan: active.reduce((s, t) => s + (t.plannedHours || 0), 0), cnt: active.length };
  };

  const vacOverlap = (empId, from, to) => {
    if (!data || !data.vacations || !from || !to) return null;
    return data.vacations.find(v => v.empId === empId && v.status === 'approved' && v.start <= to && v.end >= from) || null;
  };

  return { empName, primaryDept, getTaskSpent, getProjectStats, getEmployeeLoad, vacOverlap };
};
```
### `src/hooks/useModals.js`
```javascript
import { useState } from 'react';

export function useModals({ store, data, user }) {
  const [modal, setModal] = useState(null);

  const openTask = (taskId = null, initialTab = 'form', parentTaskId = null, initialProjectId = null) =>
    setModal({ type: 'task', taskId, initialTab, parentTaskId, initialProjectId });

  const openProject = (projectId = null) =>
    setModal({ type: 'project', projectId });

  const openHoursReq = (kind, targetId) =>
    setModal({ type: 'hours', kind, targetId });

  const openRoles = (empId) =>
    setModal({ type: 'roles', empId });

  const openDepts = (empId) =>
    setModal({ type: 'depts', empId });

  const openVacation = (vacationId = null, forEmpId = null) =>
    setModal({ type: 'vacation', vacationId, forEmpId });

  const openDelegation = () =>
    setModal({ type: 'delegation' });

  const openVacNow = () =>
    setModal({ type: 'vacnow' });

  const closeModal = () => setModal(null);

  return {
    modal,
    openTask,
    openProject,
    openHoursReq,
    openRoles,
    openDepts,
    openVacation,
    openDelegation,
    openVacNow,
    closeModal,
  };
}
```
### `src/hooks/useStore.js`
```javascript
export { useStore } from '../context/StoreContext';
```
### `src/hooks/useTaskFilters.js`
```javascript
import { useMemo } from 'react';

export const useTaskFilters = (data, filters) => {
  const { projectId, assigneeId, priority, deptId, search } = filters;
  return useMemo(() => {
    let list = data.tasks.filter(t => !t.archived);
    if (projectId && projectId !== 'all') list = list.filter(t => t.projectId === projectId);
    if (assigneeId && assigneeId !== 'all') list = list.filter(t => t.assigneeId === assigneeId);
    if (priority && priority !== 'all') list = list.filter(t => t.priority === priority);
    if (deptId && deptId !== 'all') {
      list = list.filter(t => {
        const emp = t.assigneeId ? data.employees.find(e => e.id === t.assigneeId) : null;
        return emp && emp.departments.some(d => d.deptId === deptId);
      });
    }
    if (search?.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(t => {
        const p = data.projects.find(x => x.id === t.projectId);
        return t.title.toLowerCase().includes(s) || (p && (p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s)));
      });
    }
    return list;
  }, [data, projectId, assigneeId, priority, deptId, search]);
};
```
## `src/css/`
- **Folder:** `css/`

### `src/css/styles.css`
```css
@import url('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.css');
@import url('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.css');
@import url('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.css');
@import url('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-800-normal.css');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg: #eef2f7;
  --panel: #fff;
  --line: #e2e8f0;
  --txt: #0f172a;
  --mut: #64748b;
  --acc: #2563eb;
  --acc2: #0ea5e9;
  --side: #0c1526;
  --side2: #16233c;
  --sh: 0 1px 2px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.06);
}

html, body, #root {
  height: 100%;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--txt);
  font-size: 16px;
}

button {
  font-family: inherit;
  cursor: pointer;
}

input, select, textarea {
  font-family: inherit;
  font-size: 16px;
  color: var(--txt);
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 8px;
  border: 2px solid var(--bg);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
@keyframes popIn {
  from { opacity: 0; transform: scale(.97); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}

/* --- login --- */
.login-wrap {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
}
.login-hero {
  background: radial-gradient(1200px 600px at 10% -10%, #1e3a8a 0%, transparent 55%),
              radial-gradient(900px 500px at 90% 110%, #0e7490 0%, transparent 55%),
              #0c1526;
  color: #e2e8f0;
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
}
.login-hero h2 {
  font-size: 34px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -.5px;
}
.login-hero p {
  font-size: 16px;
  color: #94a3b8;
  max-width: 480px;
  line-height: 1.6;
}
.hero-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 9px;
  color: #cbd5e1;
  font-size: 15px;
}
.hero-list li {
  padding-left: 26px;
  position: relative;
}
.hero-list li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #38bdf8;
  font-weight: 700;
}
.hero-stack {
  margin-top: 12px;
  display: inline-block;
  padding: 6px 12px;
  border: 1px solid #334155;
  border-radius: 999px;
  color: #7dd3fc;
  font-size: 14px;
  letter-spacing: .4px;
}
.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--bg);
  overflow: auto;
}
.login-card {
  width: 470px;
  background: #fff;
  border-radius: 16px;
  box-shadow: var(--sh);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: popIn .25s ease;
}
.login-card.shake {
  animation: shake .45s ease;
}
.login-card h3 {
  font-size: 24px;
  font-weight: 800;
}
.login-sub {
  color: var(--mut);
  margin-bottom: 8px;
  font-size: 15px;
}
.login-err {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 15px;
}
.cookie-note {
  font-size: 13px;
  color: var(--mut);
  text-align: center;
  padding-top: 4px;
}
.demo-title {
  font-size: 13px;
  color: var(--mut);
  margin-top: 12px;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.demo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}
.demo-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  background: #f8fafc;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 7px 10px;
  transition: .15s;
}
.demo-chip:hover {
  border-color: var(--acc2);
  background: #f0f9ff;
  transform: translateY(-1px);
}
.demo-login {
  font-weight: 700;
  font-size: 15px;
}
.demo-role {
  font-size: 12px;
  color: var(--mut);
}
.email-inp {
  display: flex;
  align-items: center;
  gap: 6px;
}
.email-inp .inp {
  flex: 1;
}
.email-dom {
  color: var(--mut);
  font-size: 15px;
  white-space: nowrap;
}
.pass-toggle-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--mut);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0;
}
.pass-toggle-btn:hover {
  color: var(--txt);
}

/* --- main layout --- */
.shell {
  display: grid;
  grid-template-columns: 256px 1fr;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  background: linear-gradient(180deg, var(--side) 0%, #0e1b30 100%);
  color: #cbd5e1;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
}
.logo {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 4px 6px 14px;
  border-bottom: 1px solid #1e2c47;
  margin-bottom: 12px;
}
.logo-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(14,165,233,.35);
  flex: none;
}
.logo-name {
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #fff;
  font-size: 17px;
}
.logo-sub {
  font-size: 12px;
  color: #64748b;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 15px;
  font-weight: 600;
  transition: .15s;
  text-align: left;
  width: 100%;
}
.nav-item:hover {
  background: #16233c;
  color: #e2e8f0;
}
.nav-item.on {
  background: linear-gradient(90deg, #1d4ed8, #2563eb);
  color: #fff;
  box-shadow: 0 4px 14px rgba(37,99,235,.35);
}
.nav-lbl {
  flex: 1;
}
.side-foot {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.env-badge {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  padding: 0 6px;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--side2);
  border: 1px solid #223250;
  border-radius: 12px;
  padding: 9px;
  margin-bottom: 16px;
}
.user-card-clickable {
  cursor: pointer;
}
.user-name {
  font-size: 14px;
  font-weight: 700;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
.user-roles {
  font-size: 12px;
  color: #38bdf8;
  font-weight: 600;
}
.icon-btn.dark {
  margin-left: auto;
  color: #94a3b8;
  background: transparent;
}
.icon-btn.dark:hover {
  color: #f87171;
  background: #16233c;
}

.main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid var(--line);
}
.page-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -.3px;
}
.page-sub {
  font-size: 14px;
  color: var(--mut);
  margin-top: 2px;
}
.top-tools {
  display: flex;
  gap: 10px;
  align-items: center;
}
.bell-wrap {
  position: relative;
}
.icon-btn {
  border: none;
  background: transparent;
  color: var(--mut);
  border-radius: 8px;
  padding: 7px;
  display: inline-flex;
  align-items: center;
  transition: .15s;
  position: relative;
}
.icon-btn:hover {
  background: #f1f5f9;
  color: var(--txt);
}
.icon-btn.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}
.icon-btn.bell.has {
  color: #2563eb;
}
.bell-count {
  position: absolute;
  top: 2px;
  right: 1px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  border-radius: 99px;
  padding: 0 4px;
  min-width: 14px;
  text-align: center;
}
.notif-pop {
  position: absolute;
  right: 0;
  top: 44px;
  width: 380px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(2,8,23,.25);
  z-index: 60;
  animation: popIn .15s ease;
  overflow: hidden;
}
.notif-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  font-weight: 800;
  font-size: 16px;
}
.notif-list {
  max-height: 340px;
  overflow: auto;
}
.notif-item {
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 15px;
  cursor: pointer;
}
.notif-item.new {
  background: #eff6ff;
}
.notif-empty {
  padding: 12px;
}
.notif-note {
  padding: 8px 14px;
  border-top: 1px solid var(--line);
  font-size: 13px;
}
.content {
  flex: 1;
  overflow: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* --- common components --- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  border: 1px solid transparent;
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 700;
  transition: .15s;
  white-space: nowrap;
}
.btn.primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  box-shadow: 0 4px 12px rgba(37,99,235,.3);
}
.btn.primary:hover {
  transform: translateY(-1px);
}
.btn.primary:disabled {
  opacity: .5;
  transform: none;
}
.btn.ghost {
  background: #fff;
  border-color: var(--line);
  color: var(--txt);
}
.btn.ghost:hover {
  border-color: var(--acc2);
  color: var(--acc);
}
.btn.ghost.sm, .btn.primary.sm, .btn.danger.sm {
  padding: 7px 12px;
  font-size: 14px;
}
.btn.danger {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}
.btn.big {
  padding: 12px;
  font-size: 17px;
  justify-content: center;
  margin-top: 6px;
}
.inp {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  outline: none;
  background: #fff;
  transition: .15s;
  font-size: 16px;
}
.inp:focus {
  border-color: var(--acc2);
  box-shadow: 0 0 0 3px rgba(14,165,233,.15);
}
.inp:disabled {
  background: #f8fafc;
  color: #64748b;
}
.inp.sel {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #64748b 50%),
                    linear-gradient(135deg, #64748b 50%, transparent 50%);
  background-position: calc(100% - 16px) 15px, calc(100% - 11px) 15px;
  background-size: 5px 5px;
  background-repeat: no-repeat;
  padding-right: 30px;
}
.inp.sel.sm {
  padding: 8px 26px 8px 12px;
  font-size: 14px;
  width: auto;
}

/* --- единый тулбар (строка управления) --- */
.toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}

.toolbar .filter-search {
  width: 150px;
  flex-shrink: 0;
}

.toolbar .filter-select.filter-select-dept {
  width: 150px;
  flex-shrink: 0;
}

.toolbar .btn-group {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.toolbar .dept-pick {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: auto; /* прижимает к правому краю */
}

.toolbar .btn.primary {
  flex-shrink: 0;
}

/* --- старые стили (поисковая строка и пр.) --- */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0 10px;
  color: var(--mut);
}
.search-box input {
  border: none;
  background: transparent;
  outline: none;
  padding: 8px 0;
  width: 170px;
  font-size: 15px;
}
.link {
  border: none;
  background: none;
  color: var(--acc);
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  padding: 0;
}
.red-link {
  color: #dc2626;
}
.lbl {
  font-size: 13px;
  font-weight: 700;
  color: var(--mut);
  margin-top: 6px;
  text-transform: uppercase;
  letter-spacing: .4px;
}
.mut { color: var(--mut); }
.sm { font-size: 14px; }
.red { color: #dc2626; }

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: linear-gradient(135deg, #1e3a8a, #0ea5e9);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex: none;
}
.avatar.sm {
  width: 36px;
  height: 36px;
  font-size: 14px;
}
.avatar.xs {
  width: 20px;
  height: 20px;
  font-size: 10px;
  flex-shrink: 0;
}
.pdot {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  display: inline-block;
  flex: none;
}
.kcount {
  background: #e2e8f0;
  color: #475569;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  padding: 1px 8px;
  margin-left: auto;
}
.spacer { flex: 1; }

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.tab {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 15px;
  font-weight: 700;
  color: var(--mut);
  transition: .15s;
}
.tab.on {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
.tabs.sm .tab {
  padding: 6px 12px;
  font-size: 14px;
}
.seg {
  display: flex;
  background: #e2e8f0;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.seg-btn {
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--mut);
}
.seg-btn.on {
  background: #fff;
  color: var(--txt);
  box-shadow: 0 1px 4px rgba(15,23,42,.12);
}
.seg.sm .seg-btn {
  padding: 4px 9px;
  font-size: 13px;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}
.tbl th {
  text-align: left;
  color: var(--mut);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: .4px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
}
.tbl td {
  padding: 9px 10px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 14px;
}
.st-chip {
  font-size: 13px;
  font-weight: 800;
  border-radius: 6px;
  padding: 3px 8px;
  background: #f1f5f9;
  color: #475569;
  white-space: nowrap;
}
.st-chip.approved, .st-chip.active {
  background: #ecfdf5;
  color: #059669;
}
.st-chip.rejected, .st-chip.revoked {
  background: #fef2f2;
  color: #dc2626;
}
.st-chip.pending {
  background: #fffbeb;
  color: #b45309;
}
.warn-box {
  display: flex;
  gap: 9px;
  align-items: center;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 15px;
  margin-bottom: 10px;
}
.info-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  margin-bottom: 10px;
}
.budget-hint {
  margin-top: 12px;
  font-size: 14px;
  color: var(--mut);
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
}
.over-note {
  font-size: 13px;
  color: #dc2626;
  margin-top: 6px;
  font-weight: 600;
}
.adm-badge {
  font-size: 12px;
  font-weight: 800;
  color: #0f766e;
  background: #ccfbf1;
  border-radius: 6px;
  padding: 2.5px 7px;
  margin-left: 6px;
}
.pj-kb.adm {
  background: #ccfbf1;
  color: #0f766e;
}
.dept-chip {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  background: #f1f5f9;
  border-radius: 7px;
  padding: 4px 9px;
  margin: 0 6px 6px 0;
}
.dept-chip.prim {
  background: #dbeafe;
  color: #1d4ed8;
}
.prim-btn {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}
/* --- archive --- */
.arch-tools {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.arch-date-inp {
  width: 160px;
}
.rep-panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 14px;
}
.rep-panel-title {
  font-size: 17px;
  font-weight: 800;
  margin-bottom: 10px;
}
.pj-code {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  border-radius: 6px;
  padding: 3px 8px;
}
.modal-lg {
  max-width: 720px;
}

/* --- kanban --- */
.kanban {
  display: grid;
  grid-template-columns: repeat(var(--columns, 4), minmax(240px, 1fr));
  gap: 14px;
  min-height: 68vh;
  animation: fadeUp .3s ease;
}
.kanban.k5 {
  grid-template-columns: repeat(var(--columns, 5), minmax(215px, 1fr));
}
.kcol {
  background: #e9eef5;
  border: 1px solid var(--line);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  transition: .15s;
}
.kcol.over {
  border-color: var(--acc2);
  background: #e0f2fe;
  box-shadow: inset 0 0 0 2px rgba(14,165,233,.35);
}
.kcol-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  padding: 11px 13px;
  color: #334155;
}
.kdot {
  width: 9px;
  height: 9px;
  border-radius: 99px;
  flex: none;
}
.kcol-body {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 0 9px 11px;
  overflow: auto;
  flex: 1;
}
.kempty {
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
  border: 1.5px dashed #cbd5e1;
  border-radius: 10px;
  padding: 20px 0;
}
.kcard {
  position: relative;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 11px 11px 11px 15px;
  box-shadow: 0 1px 3px rgba(15,23,42,.05);
  cursor: pointer;
  transition: .15s;
  overflow: hidden;
}
.kcard:hover {
  transform: translateY(-2px);
  box-shadow: var(--sh);
}
.kcard.dim {
  opacity: .55;
}
.kcard-prio {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}
.kcard-title {
  font-weight: 700;
  font-size: 15px;
  line-height: 1.35;
  margin-bottom: 6px;
}
.kcard-proj {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 7px;
}
.prio-chip {
  margin-left: auto;
  font-size: 12px;
  font-weight: 800;
}
.kcard-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.kassignee {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
  font-weight: 600;
  overflow: visible;
  white-space: nowrap;
}
.kassignee .avatar.xs {
  flex-shrink: 0;
}
.khours {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 13px;
  color: var(--mut);
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.vac-note, .del-note {
  display: flex;
  gap: 5px;
  align-items: center;
  font-size: 12px;
  color: #0369a1;
  background: #e0f2fe;
  border-radius: 6px;
  padding: 3px 7px;
  margin-top: 6px;
  font-weight: 600;
}
.del-note {
  color: #7c3aed;
  background: #f5f3ff;
}
.kcard-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
}
.kdl {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 2px 7px;
  white-space: nowrap;
}
.kdl.late {
  background: #fef2f2;
  color: #dc2626;
}
.kdl.soon {
  background: #fffbeb;
  color: #b45309;
}
.mini-progress {
  flex: 1;
  height: 5px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
}
.mini-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #2563eb);
  border-radius: 99px;
}

/* --- gantt --- */
.gantt {
  min-width: 100%;
  width: var(--gantt-width, auto);
}

.gantt-track {
  position: relative;
  height: 46px;
}

.gbar {
  position: absolute;
  top: 11px;
  height: 24px;
  border-radius: 7px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bar-bg, #64748b33);
  border: 1px solid var(--bar-bg, #64748b33);
  left: var(--bar-left, 0);
  width: var(--bar-width, 0);
  opacity: var(--bar-opacity, 1);
}

.gbar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 6px;
  width: var(--fill-width, 0%);
  background: var(--fill-color, #64748b);
  opacity: 0.9;
  transition: width 0.15s;
}

.gbar-vac {
  position: relative;
  margin-left: auto;
  margin-right: 6px;
  font-size: 14px;
}
.gantt-panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--sh);
  overflow: hidden;
  animation: fadeUp .3s ease;
}
.gantt-scroll {
  overflow: auto;
  max-height: calc(100vh - 220px);
}
.gantt-top {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 5;
  background: #fff;
  border-bottom: 1px solid var(--line);
}
.gantt-corner {
  width: 240px;
  flex: none;
  padding: 14px;
  font-size: 14px;
  font-weight: 800;
  color: var(--mut);
  border-right: 1px solid var(--line);
  display: flex;
  align-items: flex-end;
}
.gantt-months {
  display: flex;
  height: 24px;
}
.gantt-month {
  font-size: 13px;
  font-weight: 800;
  color: #334155;
  padding: 4px 0 2px 8px;
  border-left: 1px solid var(--line);
  white-space: nowrap;
  overflow: hidden;
}
.gantt-days {
  display: flex;
  height: 26px;
}
.gantt-track {
  position: relative;
  height: 46px;
}
.gday {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #64748b;
  border-left: 1px solid #eef2f7;
  font-variant-numeric: tabular-nums;
}
.gday.wk {
  background: #f8fafc;
  color: #b6c2d4;
}
.gday.td {
  background: #2563eb;
  color: #fff;
  font-weight: 800;
  border-radius: 6px;
}
.gantt-body {
  position: relative;
}
.gantt-grid {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  pointer-events: none;
}
.gcell {
  border-left: 1px solid #f1f5f9;
  height: 100%;
}
.gcell.wk {
  background: #f8fafc88;
}
.gtoday {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ef4444;
  opacity: .8;
}
.gantt-group {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-top: 1px solid var(--line);
}
.gantt-group-name {
  width: 240px;
  flex: none;
  font-size: 14px;
  font-weight: 800;
  padding: 7px 14px;
  display: flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 1px solid var(--line);
}
.gantt-row {
  display: flex;
  border-top: 1px solid #f1f5f9;
}
.gantt-row:hover {
  background: #f8fafc;
}
.gantt-label {
  width: 240px;
  flex: none;
  padding: 5px 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid var(--line);
  cursor: pointer;
  min-height: 46px;
}
.gtitle {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gtitle.dim {
  text-decoration: line-through;
  opacity: .6;
}
.gsub {
  font-size: 13px;
  color: var(--mut);
}
.gantt-track {
  position: relative;
  height: 46px;
}
.gbar {
  position: absolute;
  top: 11px;
  height: 24px;
  border-radius: 7px;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.gbar:hover {
  filter: brightness(1.05);
}
.gbar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 6px;
  opacity: 0.9;
}
.gbar-vac {
  position: relative;
  margin-left: auto;
  margin-right: 6px;
  font-size: 14px;
}
.gantt-legend {
  display: flex;
  gap: 20px;
  padding: 9px 16px;
  border-top: 1px solid var(--line);
  font-size: 14px;
  color: var(--mut);
  align-items: center;
  flex-wrap: wrap;
}
.lg-dot {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  display: inline-block;
  margin-right: 5px;
}

/* --- calendar --- */
.cal-panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--sh);
  padding: 16px;
  animation: fadeUp .3s ease;
  width: 100%;
  box-sizing: border-box;
  height: auto;
}

.cal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.cal-right {
  display: flex;
  gap: 10px;
  align-items: center;
}
.cal-nav {
  display: flex;
  gap: 8px;
  align-items: center;
}
.cal-title {
  font-size: 20px;
  font-weight: 800;
  min-width: 120px;
  text-align: center;
}
.cal-note {
  font-size: 13px;
  color: var(--mut);
  margin-bottom: 10px;
}
.cal-grid-head {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 6px;
}
.cal-wd {
  font-size: 13px;
  font-weight: 800;
  color: var(--mut);
  text-transform: uppercase;
  letter-spacing: .5px;
  padding: 0 6px;
  text-align: center;
}
.cal-wd.wk {
  color: #f59e0b;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-auto-rows: auto;
  gap: 6px;
}

.outwrap {
  opacity: .4;
}

.cal-cell {
  background: #fbfcfe;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 6px;
  overflow: visible;
  transition: .15s;
  height: auto;
  display: flex;
  flex-direction: column;
  min-height: 80px;
}
.cal-cell:hover {
  border-color: #cbd5e1;
}
.cal-cell.today {
  border-color: var(--acc);
  box-shadow: inset 0 0 0 1.5px var(--acc);
}
.cal-cell.today .cal-daynum {
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  padding: 0 5px;
  width: fit-content;
}
.cal-daynum {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  display: inline-block;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.cal-chips {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: visible;
  flex: 1;
}
.cal-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 4px 6px 3px 6px;
  border: 1px solid;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  overflow: hidden;
}
.cal-chip:hover {
  background: #f0f9ff;
}
.cal-task-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
/* .cal-executor {
  font-size: 11px;
  color: var(--mut);
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
} */
.cal-executors {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.cal-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}
.cal-week .cal-cell {
  min-height: 80px;
}
.cal-week.one {
  grid-template-columns: 1fr;
}

/* --- projects --- */
.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.sec-note {
  font-size: 14px;
  color: var(--mut);
  max-width: 760px;
}
.sec-actions {
  display: flex;
  gap: 8px;
}
.pj-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 14px;
  animation: fadeUp .3s ease;
}
.pj-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--sh);
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: .15s;
}
.pj-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(15,23,42,.1);
}
.pj-top {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.pj-code {
  font-weight: 800;
  font-size: 14px;
  border-radius: 7px;
  padding: 3px 9px;
}
.pj-kb {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 3px 8px;
}
.pj-st {
  margin-left: auto;
  font-size: 13px;
  font-weight: 800;
  border-radius: 6px;
  padding: 3px 8px;
}
.pj-st.active {
  background: #ecfdf5;
  color: #059669;
}
.pj-st.closed {
  background: #f1f5f9;
  color: #64748b;
}
.pj-name {
  font-weight: 800;
  font-size: 17px;
  line-height: 1.3;
}
.pj-row {
  font-size: 14px;
}
.pj-budget {
  background: #f8fafc;
  border-radius: 10px;
  padding: 9px;
}
.pj-budget-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 7px;
}
.pj-progress {
  height: 7px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
}
.pj-progress-fill {
  height: 100%;
  border-radius: 99px;
}
.pj-progress-fill.over {
  background: #ef4444;
}
.pj-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.pj-avatars {
  display: flex;
}
.pj-avatars .avatar.xs {
  margin-right: -4px;
  border: 2px solid #fff;
}
.pj-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

/* --- staff --- */
.staff {
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: fadeUp .3s ease;
}
.st-section {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--sh);
  overflow: hidden;
}
.st-sec-head {
  padding: 13px 18px;
  background: linear-gradient(90deg, #f8fafc, #fff);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.st-sec-title {
  font-weight: 800;
  font-size: 17px;
}
.st-sec-sub {
  font-size: 14px;
  color: var(--mut);
}
.st-dept {
  border-top: 1px solid #f1f5f9;
}
.st-dept-head {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 9px 18px;
  background: #fbfcfe;
  border-bottom: 1px solid #f1f5f9;
  font-size: 15px;
}
.st-dept-name {
  font-weight: 800;
}
.st-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 9px 18px;
  border-top: 1px solid #f6f8fb;
}
.st-row:hover {
  background: #f8fafc;
}
.st-name {
  width: 260px;
  flex: none;
}
.st-fio {
  font-weight: 700;
  font-size: 15px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.vac-badge {
  font-size: 12px;
  font-weight: 800;
  color: #047857;
  background: #ecfdf5;
  border-radius: 6px;
  padding: 2px 7px;
}
.vac-badge.fired {
  background: #fef2f2;
  color: #dc2626;
}
.st-pos {
  font-size: 13px;
  color: var(--mut);
}
.st-roles {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  flex: 1;
}
.role-chip {
  font-size: 12px;
  font-weight: 800;
  border-radius: 6px;
  padding: 2.5px 7px;
  letter-spacing: .3px;
}
.role-chip.blue {
  background: #e0f2fe;
  color: #0369a1;
}
.role-chip.indigo {
  background: #eff6ff;
  color: #1d4ed8;
}
.st-load {
  width: 170px;
  flex: none;
  display: flex;
  gap: 8px;
  align-items: center;
}
.st-load-bar {
  flex: 1;
  height: 7px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
}
.st-load-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #2563eb);
  border-radius: 99px;
}
.st-load-fill.over {
  background: linear-gradient(90deg, #f59e0b, #ef4444);
}
.st-load-txt {
  font-size: 13px;
  font-weight: 700;
  color: var(--mut);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.st-load-txt.over {
  color: #dc2626;
}
.st-nums {
  width: 70px;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.st-nums b {
  font-size: 16px;
}
.st-nums span {
  font-size: 12px;
  color: var(--mut);
}

/* --- reports --- */
.rep {
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: fadeUp .3s ease;
}
.rep-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}
.rep-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--sh);
  padding: 15px;
}
.rep-num {
  font-size: 27px;
  font-weight: 800;
  letter-spacing: -.5px;
}
.rep-lbl {
  font-size: 14px;
  color: var(--mut);
  margin-top: 2px;
}
.rep-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rep-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.rep-panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--sh);
  padding: 16px;
}
.rep-panel-title {
  font-weight: 800;
  font-size: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.rep-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* --- cabinet --- */
.cab {
  animation: fadeUp .3s ease;
}
.cab-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 14px;
  align-items: start;
}
.stack-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cab-stat {
  margin-bottom: 12px;
}
.cab-stat-head {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 6px;
}
.cab-task {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 15px;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  margin-bottom: 5px;
  cursor: pointer;
}
.cab-task:hover {
  border-color: var(--acc2);
  background: #f0f9ff;
}
.cab-proj {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 15px;
  padding: 5px 0;
}
.util-bars {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 80px;
  margin: 12px 0 6px;
}
.util-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--mut);
}
.util-bar {
  width: 14px;
  background: linear-gradient(180deg, #0ea5e9, #2563eb);
  border-radius: 4px 4px 0 0;
}
.dept-picks {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow: auto;
}
.dept-pick {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
}
.dept-pick input {
  accent-color: #2563eb;
}
.depts-readonly {
  grid-column: 2;
}
.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 15px;
}
.toggle {
  width: 40px;
  height: 22px;
  background: #cbd5e1;
  border-radius: 99px;
  position: relative;
  cursor: pointer;
  transition: .2s;
  flex: none;
}
.toggle.on {
  background: #2563eb;
}
.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 99px;
  transition: .2s;
}
.toggle.on .toggle-knob {
  left: 20px;
}

/* --- modals --- */
.roles-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 10px;
}
.roles-item {
  display: flex;
  gap: 10px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 15px;
  cursor: pointer;
  transition: .15s;
}
.roles-item:hover {
  border-color: var(--acc2);
}
.roles-item input {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
}
.sub-picks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding: 8px 12px 4px 34px;
  font-size: 14px;
}

/* --- chat --- */
.chat {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.cm {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px 12px;
  background: #fff;
}
.cm.reply {
  margin-left: 26px;
  background: #fbfcfe;
}
.cm-head {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.cm-author {
  font-weight: 800;
  font-size: 14px;
}
.cm-text {
  font-size: 15px;
  line-height: 1.6;
}
.mention {
  color: #2563eb;
  font-weight: 700;
}
.cm-actions {
  display: flex;
  gap: 12px;
  margin-top: 5px;
}
.cm-actions .link {
  font-size: 14px;
}
.cm-edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cm-edit textarea {
  width: 100%;
  font-size: 15px;
}
.cm-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.cm-input-wrap {
  position: relative;
}
.mention-pop {
  background: #ffffff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 200px;
  max-width: 300px;
  max-height: 200px;
  overflow-y: auto;
}
.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}

.mention-item:hover {
  background: #f1f5f9;
}
.reply-banner {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  border-radius: 8px;
  padding: 6px 10px;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(12,21,38,.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}
.modal {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(2,8,23,.35);
  animation: popIn .2s ease;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--line);
}
.modal-head h3 {
  font-size: 19px;
  font-weight: 800;
}
.modal-body {
  padding: 16px 20px;
  overflow: auto;
}
.modal-foot {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 16px;
  padding-top: 13px;
  border-top: 1px solid var(--line);
}
.form-grid {
  display: grid;
  grid-template-columns: 190px 1fr;
  gap: 8px 14px;
  align-items: center;
}
.form-grid .lbl {
  margin-top: 0;
  text-align: right;
  font-size: 14px;
}
.form-grid .inp, .form-grid .duo, .form-grid textarea.inp {
  grid-column: 2;
  font-size: 16px;
}
.form-grid > div {
  grid-column: 2;
}
.form-grid > select {
  grid-column: 2;
  font-size: 16px;
}
.duo {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.duo-note {
  font-size: 14px;
  color: var(--mut);
}
.tm-block {
  margin-top: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 13px;
  background: #fbfcfe;
}
.tm-progress {
  height: 8px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 11px;
}
.tm-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #0ea5e9);
  border-radius: 99px;
  transition: width .3s ease;
}
.tm-logs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 11px;
  max-height: 180px;
  overflow: auto;
}
.tm-log {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 10px;
}
.tm-log-name {
  font-weight: 700;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tm-log-note {
  color: var(--mut);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tm-log-h {
  font-variant-numeric: tabular-nums;
  color: #0369a1;
}
.tm-add {
  display: flex;
  gap: 8px;
}
.tm-add .inp {
  font-size: 15px;
}
.ro-note {
  max-width: 280px;
  text-align: right;
}
.empty-note {
  text-align: center;
  color: var(--mut);
  padding: 60px 0;
  background: #fff;
  border: 1.5px dashed var(--line);
  border-radius: 14px;
  font-size: 16px;
}

/* --- профиль: аватар --- */
.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1e3a8a, #0ea5e9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.profile-avatar .avatar-placeholder {
  color: #fff;
  font-size: 44px;
  font-weight: 700;
}
.photo-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.photo-actions {
  display: flex;
  gap: 8px;
}

/* ========== ДОБАВЛЕНО: СТИЛИ ДЛЯ ГАЛОЧЕК ПАРОЛЯ ========== */
.pass-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 14px;
  color: var(--mut);
  margin-top: 4px;
  grid-column: 2;
}
.pass-checks span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.pass-checks .ok {
  color: #10b981;
  font-weight: 700;
}
/* --- Gantt: фильтры --- */
.gantt-filters {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  background: #f8fafc;
  align-items: center;
  flex-wrap: wrap;
}
.gantt-filters .inp.sm {
  min-width: 150px;
  font-size: 15px;
}

/* --- Gantt: базовый план --- */
.gbar-baseline {
  position: absolute;
  top: 11px;
  height: 24px;
  border-radius: 7px;
  z-index: 1;
}

/* --- Gantt: зависимости (SVG стрелки) --- */
.gantt-dependencies {
  overflow: visible;
}
.dependency-arrow path {
  transition: stroke 0.15s ease, fill 0.15s ease;
}
.dependency-arrow:hover path {
  stroke: #2563eb;
  fill: #2563eb;
}

/* --- Popover для редактирования задачи --- */
.task-edit-popover {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.15);
  min-width: 280px;
  max-width: 360px;
  z-index: 1001;
  animation: popIn 0.2s ease;
}
.popover-overlay {
  position: fixed;
  z-index: 1000;
}
.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  background: #f8fafc;
  border-radius: 12px 12px 0 0;
}
.popover-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--txt);
}
.popover-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--line);
  background: #f8fafc;
  border-radius: 0 0 12px 12px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--mut);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.form-static {
  font-size: 15px;
  color: var(--txt);
  padding: 6px 0;
}

/* --- Иконка замка для админа --- */
.icon-btn.xs {
  padding: 2px;
  border-radius: 4px;
}
.icon-btn.xs svg {
  width: 12px;
  height: 12px;
}
.tasks-table-wrap {
  overflow-x: auto;
}
.tasks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.tasks-table th {
  background: #f8fafc;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  color: #475569;
}
.tasks-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}
.tasks-table tbody tr:hover {
  background: #f8fafc;
}
.task-status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.task-status-badge.new { background: #e2e8f0; color: #475569; }
.task-status-badge.in_progress { background: #dbeafe; color: #2563eb; }
.task-status-badge.review { background: #fef3c7; color: #d97706; }
.task-status-badge.closed { background: #d1fae5; color: #059669; }
.task-status-badge.cancelled { background: #fee2e2; color: #dc2626; }
.task-priority-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.task-priority-badge.critical { background: #fecaca; color: #b91c1c; }
.task-priority-badge.high { background: #fca5a5; color: #b91c1c; }
.task-priority-badge.medium { background: #fde68a; color: #92400e; }
.task-priority-badge.low { background: #e5e7eb; color: #4b5563; }
.late { color: #dc2626; }
.assigned-executor {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  border-radius: 16px;
  padding: 2px 8px 2px 4px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid var(--line);
}
.assigned-executor button {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}
.assigned-executor button:hover {
  color: #dc2626;
}
.cal-chip-aog { border-color: #dc2626; }
.cal-chip-crit { border-color: #f59e0b; }
.cal-chip-norm { border-color: #10b981; }

.cal-dot-aog { background: #dc2626; }
.cal-dot-crit { background: #f59e0b; }
.cal-dot-norm { background: #10b981; }

/* Кастомный тултип для аватара — работает для всех аватаров */
.avatar-tooltip {
  position: fixed;
  background: #1e293b;
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  pointer-events: none;
  z-index: 10000;
  max-width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-family: system-ui, -apple-system, sans-serif;
  transition: opacity 0.15s;
}
.file-input-hidden {
  display: none;
}
/* ===== ProjectModal: поля без сетки, единое выравнивание ===== */
.project-info-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  width: 100%;
}

.field-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.field-label {
  min-width: 100px;
  text-align: left;
  font-weight: 700;
  color: var(--mut);
  text-transform: uppercase;
  letter-spacing: .4px;
  font-size: 13px;
  flex-shrink: 0;
}

.field-row .inp,
.field-row .inp.sel {
  flex: 1;
  min-width: 0;
}

/* Парные строки — в одну линию */
.pj-pair-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  align-items: center;
  padding: 0;
  margin: 0;
  width: 100%;
}

.pj-pair-item {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pj-pair-label {
  min-width: 100px;
  text-align: left;
  font-weight: 700;
  color: var(--mut);
  text-transform: uppercase;
  letter-spacing: .4px;
  font-size: 13px;
  flex-shrink: 0;
}

.pj-pair-input {
  flex: 1;
  min-width: 0;
}
```
## `src/context/`
- **Folder:** `context/`

### `src/context/StoreContext.jsx`
```javascript
import  { createContext, useContext, useState, useEffect } from 'react';
import DataStore from '../services/DataStore';

const StoreContext = createContext(null);
export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};

export const StoreProvider = ({ children }) => {
  const [store] = useState(() => new DataStore());
  const [data, setData] = useState(store.data);

  useEffect(() => {
    const unsub = store.subscribe(newData => setData(newData));
    return unsub;
  }, [store]);

  const login = (email, password) => store.login(email, password);
  const logout = () => store.logout();

  return (
    <StoreContext.Provider value={{ store, data, login, logout }}>
      {children}
    </StoreContext.Provider>
  );
};
```
### `src/context/ToastContext.jsx`
```javascript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts.length) return null;
  return createPortal(
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '400px',
      width: '100%',
    }}>
      {toasts.map(toast => {
        let bgColor = '#3b82f6';
        let textColor = '#ffffff';
        if (toast.type === 'success') bgColor = '#10b981';
        else if (toast.type === 'error') bgColor = '#ef4444';
        else if (toast.type === 'warning') bgColor = '#f59e0b';
        else if (toast.type === 'info') bgColor = '#3b82f6';
        return (
          <div
            key={toast.id}
            style={{
              background: bgColor,
              color: textColor,
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: 'fadeUp 0.2s ease',
            }}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: '1',
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};
```
## `src/components/`
- **Folder:** `components/`

### `src/components/Archive.jsx`
```javascript
import React, { useState } from 'react';
import { PROJECT_TYPES, TASK_STATUSES } from '../utils/constants';
import { fmtDMY, TODAY } from '../utils/date';
import { canRestore } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import { useDataHelpers } from '../hooks';

export default function Archive({ db, ur, openTask, openProject, restoreTask, restoreProject }) {
  const { getTaskSpent, empName } = useDataHelpers(db);
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fProj, setFProj] = useState('all');
  const [fExec, setFExec] = useState('all');
  const [fDept, setFDept] = useState('all');

  const archProjects = db.projects.filter(p => p.archived || p.status === 'closed' || p.status === 'cancelled');
  const archTasks = db.tasks.filter(t => t.archived || t.status === 'closed' || t.status === 'cancelled');

  const fit = (archivedAt) => (!fFrom || archivedAt >= fFrom) && (!fTo || archivedAt <= fTo);
  const projList = archProjects.filter(p => fit(p.archivedAt || TODAY));
  const taskList = archTasks.filter(t => {
    if (!fit(t.archivedAt || TODAY)) return false;
    if (fProj !== 'all' && t.projectId !== fProj) return false;
    if (fExec !== 'all' && t.assigneeId !== fExec) return false;
    if (fDept !== 'all') {
      const assignee = t.assigneeId ? db.employees.find(x => x.id === t.assigneeId) : null;
      if (!assignee || !assignee.departments.some(d => d.deptId === fDept)) return false;
    }
    return true;
  });

  const execs = [...new Set(archTasks.map(t => t.assigneeId).filter(Boolean))].map(id => db.employees.find(e => e.id === id)).filter(Boolean);
  const projOptions = [...new Set(archTasks.map(t => t.projectId))].map(id => db.projects.find(p => p.id === id)).filter(Boolean);

  return (
    <div>
      <div className="sec-head">
        <div className="sec-note">Архив закрытых задач и проектов. Только чтение.</div>
      </div>

      <div className="toolbar">
        <input className="inp arch-date-inp" type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} />
        <input className="inp arch-date-inp" type="date" value={fTo} onChange={e => setFTo(e.target.value)} />
        <select className="inp sel sm" value={fProj} onChange={e => setFProj(e.target.value)}>
          <option value="all">Все проекты</option>{projOptions.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>
        <select className="inp sel sm" value={fExec} onChange={e => setFExec(e.target.value)}>
          <option value="all">Все исполнители</option>{execs.map(e => <option key={e.id} value={e.id}>{e.last}</option>)}
        </select>
        <select className="inp sel sm" value={fDept} onChange={e => setFDept(e.target.value)}>
          <option value="all">Все подразделения</option>{db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="rep-panel">
        <div className="rep-panel-title">Архивные проекты ({projList.length})</div>
        <table className="tbl">
          <thead><tr><th>Код</th><th>Название</th><th>Тип</th><th>В архиве с</th><th></th></tr></thead>
          <tbody>
            {projList.map(p => (
              <tr key={p.id}>
                <td><span className="pj-code" style={{ background: p.color + '22', color: p.color }}>{p.code}</span></td>
                <td><b>{p.name}</b></td>
                <td>{PROJECT_TYPES[p.ptype || 'prod']}</td>
                <td>{fmtDMY(p.archivedAt)}</td>
                <td>
                  <button className="btn ghost sm" onClick={() => openProject(p.id)}>Открыть</button>
                  {canRestore(ur) && p.archived && (
                    <button className="btn ghost sm" onClick={() => restoreProject(p.id)}>
                      <Ic d={ICONS.restore} size={12} /> Восстановить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rep-panel">
        <div className="rep-panel-title">Архивные задачи ({taskList.length})</div>
        <table className="tbl">
          <thead><tr><th>Задача</th><th>Проект</th><th>Исполнитель</th><th>В архиве с</th><th></th></tr></thead>
          <tbody>
            {taskList.map(t => (
              <tr key={t.id}>
                <td><b>{t.title}</b></td>
                <td>{db.projects.find(x => x.id === t.projectId)?.code}</td>
                <td>{t.assigneeId ? empName(t.assigneeId) : '—'}</td>
                <td>{fmtDMY(t.archivedAt)}</td>
                <td>
                  <button className="btn ghost sm" onClick={() => openTask(t.id)}>Открыть</button>
                  {canRestore(ur) && t.archived && (
                    <button className="btn ghost sm" onClick={() => restoreTask(t.id)}>
                      <Ic d={ICONS.restore} size={12} /> Восстановить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```
### `src/components/Avatar.jsx`
```javascript
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { initials } from '../utils/date';

export default function Avatar({ employee, size = 'sm', className = '' }) {
  if (!employee) return null;

  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const ref = useRef(null);

  const tooltipText = `${employee.last} ${employee.first}` +
    (employee.extension ? `\nВн. телефон: ${employee.extension}` : '');

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltip({
        visible: true,
        text: tooltipText,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const baseClass = 'avatar';
  const sizeClass = size ? ` ${size}` : '';
  const classes = `${baseClass}${sizeClass}${className ? ' ' + className : ''}`;

  const avatarContent = employee.photo ? (
    <img
      src={employee.photo}
      alt={`${employee.first} ${employee.last}`}
      className={`${classes} avatar-img`}
    />
  ) : (
    <div className={`${classes} avatar-initials`}>
      {initials(employee.first, employee.last) || '?'}
    </div>
  );

  return (
    <>
      <span
        ref={ref}
        className="avatar-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'inline-block', position: 'relative' }}
      >
        {avatarContent}
      </span>

      {tooltip.visible &&
        createPortal(
          <div
            className="avatar-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translateX(-50%) translateY(-100%)',
            }}
          >
            {tooltip.text}
          </div>,
          document.body
        )
      }
    </>
  );
}
```
### `src/components/Cabinet.jsx`
```javascript
import React, { useState, useMemo, useRef } from 'react';
import { DOMAIN, TASK_STATUSES, TASK_STATUS_ORDER, VACATION_TYPES } from '../utils/constants';
import { TODAY, fmtDMY, fmtD, iso, addDays, initials, isTaskActive } from '../utils/date';
import { useDataHelpers } from '../hooks';
import { useToast } from '../context/ToastContext';
import { Ic, ICONS } from './Icons';
import { getPrimaryDeptName } from '../utils/helpers';
import { Modal } from './Modal';

function downloadCSV(name, rows) {
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.endsWith('.csv') ? name : name + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

const PasswordChangeModal = ({ user, store, onClose }) => {
  const { showToast } = useToast();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    if (user.pass !== oldPass) {
      setError('Неверный старый пароль');
      return;
    }
    if (newPass.length < 8 || !/[A-ZА-ЯЁ]/.test(newPass) || !/[a-zа-яё]/.test(newPass) || !/\d/.test(newPass) || !/[^A-Za-zА-Яа-яЁё0-9]/.test(newPass)) {
      setError('Пароль должен содержать минимум 8 символов, заглавные и строчные буквы, цифру и спецсимвол');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Пароли не совпадают');
      return;
    }
    const history = user.passwordHistory || [];
    if (history.some(p => p === newPass)) {
      setError('Этот пароль уже использовался ранее. Выберите другой.');
      return;
    }
    const updated = {
      ...user,
      pass: newPass,
      passwordHistory: [...history.slice(-4), newPass],
    };
    store.upsertEmployee(updated);
    showToast('Пароль успешно изменён', 'success');
    onClose();
  };

  return (
    <Modal title="Смена пароля" onClose={onClose} width={460}>
      <div className="form-grid">
        <label className="lbl">Старый пароль *</label>
        <input className="inp" type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} />
        <label className="lbl">Новый пароль *</label>
        <input className="inp" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
        <label className="lbl">Подтверждение *</label>
        <input className="inp" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
      </div>
      {error && <div className="login-err" style={{ marginTop: 8 }}>{error}</div>}
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={handleSubmit}>Сменить пароль</button>
      </div>
    </Modal>
  );
};

export default function Cabinet({ store, data, user, openTask, openVacation, openDelegation }) {
  const { showToast } = useToast();
  const { empName, getEmployeeLoad } = useDataHelpers(data);
  const [tab, setTab] = useState('overview');

  const [expFrom, setExpFrom] = useState('');
  const [expTo, setExpTo] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [phone, setPhone] = useState(user.phone || '');
  const [extension, setExtension] = useState(user.extension || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const myTasks = data.tasks.filter(t => isTaskActive(t) && t.assigneeId === user.id && !user.fired);
  const myProjects = [...new Set(myTasks.map(t => t.projectId))].map(id => data.projects.find(p => p.id === id)).filter(Boolean);
  const myVacs = data.vacations.filter(v => v.empId === user.id);
  const myDeleg = data.roleDelegations.filter(r => r.fromId === user.id || r.toId === user.id);

  const range = 20;
  const days = [];
  for (let i = range - 1; i >= 0; i--) days.push(iso(addDays(new Date(), -i)));

  const taskTableData = useMemo(() => {
    return myTasks.map(t => {
      const logMap = {};
      t.logs.forEach(l => {
        logMap[l.date] = (logMap[l.date] || 0) + l.hours;
      });
      return { task: t, logMap };
    });
  }, [myTasks]);

  const exportMyReport = () => {
    if (!expFrom || !expTo) {
      showToast('Выберите даты начала и окончания периода', 'warning');
      return;
    }
    if (expFrom > expTo) {
      showToast('Дата начала не может быть позже даты окончания', 'error');
      return;
    }

    const allLogs = [];
    myTasks.forEach(t => {
      const project = data.projects.find(p => p.id === t.projectId);
      t.logs.forEach(l => {
        if (l.date >= expFrom && l.date <= expTo) {
          allLogs.push({
            date: l.date,
            hours: l.hours,
            task: t.title,
            project: project?.code || '—'
          });
        }
      });
    });

    if (!allLogs.length) {
      showToast('За выбранный период нет учтенных часов', 'warning');
      return;
    }

    const rows = [['Проект', 'Задача', 'Дата', 'Часы']];
    allLogs.forEach(l => rows.push([l.project, l.task, fmtDMY(l.date), l.hours]));
    
    downloadCSV(`отчет_${user.last}_${expFrom}_${expTo}`, rows);
    showToast('Отчёт выгружен!', 'success');
  };

  const tabs = [
    ['overview', 'Сводка'],
    ['vacations', 'Мои отпуска'],
    ['delegation', 'Делегирование ролей'],
    ['profile', 'Профиль и уведомления']
  ];

  const handleSaveProfile = () => {
    if (!extension.trim()) {
      showToast('Внутренний номер телефона не может быть пустым', 'error');
      return;
    }
    const updated = {
      ...user,
      phone: phone.trim(),
      extension: extension.trim(),
    };
    store.upsertEmployee(updated);
    setEditMode(false);
    showToast('Данные обновлены', 'success');
  };

  const fileInputRef = useRef(null);
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photoData = ev.target.result;
      const updated = { ...user, photo: photoData };
      store.upsertEmployee(updated);
      showToast('Фото загружено', 'success');
    };
    reader.readAsDataURL(file);
  };
  const handlePhotoDelete = () => {
    if (user.photo && window.confirm('Удалить фото?')) {
      const updated = { ...user, photo: null };
      store.upsertEmployee(updated);
      showToast('Фото удалено', 'info');
    }
  };

  return (
    <div className="cab">
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="rep-panel">
            <div className="rep-panel-title">Затраченные часы по задачам (последние 20 дней)</div>
            <div className="toolbar" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span className="mut sm">Экспорт:</span>
              <input className="inp" type="date" style={{ width: 150 }} value={expFrom} onChange={e => setExpFrom(e.target.value)} />
              <span className="mut sm">—</span>
              <input className="inp" type="date" style={{ width: 150 }} value={expTo} onChange={e => setExpTo(e.target.value)} />
              <button className="btn primary sm" onClick={exportMyReport}>
                <Ic d={ICONS.download} size={13} /> Выгрузить в Excel (CSV)
              </button>
            </div>

            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table className="tbl" style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '200px', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>Задача</th>
                    {days.map(d => (
                      <th key={d} style={{ textAlign: 'center', minWidth: '60px', borderBottom: '1px solid var(--line)', fontSize: '11px', color: 'var(--mut)' }}>
                        {fmtD(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {taskTableData.map(({ task, logMap }) => (
                    <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => openTask(task.id)}>
                      <td style={{ textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>
                        {task.title}
                        <span className="mut sm" style={{ marginLeft: 8, fontWeight: 400 }}>
                          ({data.projects.find(p => p.id === task.projectId)?.code || '—'})
                        </span>
                      </td>
                      {days.map(d => (
                        <td key={d} style={{ textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                          {logMap[d] ? <b>{logMap[d]} ч</b> : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {taskTableData.length === 0 && (
                    <tr><td colSpan={days.length + 1} className="mut" style={{ textAlign: 'center', padding: 20 }}>Нет учтённых часов</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rep-panel">
            <div className="rep-panel-title">Мои задачи по статусам</div>
            {TASK_STATUS_ORDER.map(st => {
              const list = myTasks.filter(t => t.status === st);
              if (!list.length) return null;
              return (
                <div key={st} className="cab-stat">
                  <div className="cab-stat-head">
                    <span className="kdot" style={{ background: TASK_STATUSES[st].color }} />
                    {TASK_STATUSES[st].label}
                    <span className="kcount">{list.length}</span>
                  </div>
                  {list.map(t => (
                    <div key={t.id} className="cab-task" onClick={() => openTask(t.id)}>
                      <span className="pdot" style={{ background: data.projects.find(p => p.id === t.projectId)?.color }} />
                      {t.title}
                      <span className="mut sm"> · {t.deadline ? `до ${fmtD(t.deadline)}` : 'без срока исполнения'} · {t.plannedHours ?? '—'} ч</span>
                    </div>
                  ))}
                </div>
              );
            })}
            {myTasks.length === 0 && <div className="mut">Задач пока нет</div>}
          </div>

          <div className="rep-panel">
            <div className="rep-panel-title">Мои проекты</div>
            {myProjects.map(p => (
              <div key={p.id} className="cab-proj">
                <span className="pdot" style={{ background: p.color }} />
                {p.code} — {p.name}
                {p.ptype === 'admin' && <span className="adm-badge" style={{ marginLeft: 8 }}>адм</span>}
              </div>
            ))}
            {myProjects.length === 0 && <div className="mut">Нет участия в проектах</div>}
          </div>
        </div>
      )}

      {tab === 'vacations' && (
        <div className="rep-panel">
          <div className="rep-panel-title">
            Мои отпуска
            <button className="btn primary sm" style={{ marginLeft: 'auto' }} onClick={() => openVacation(null)}>
              <Ic d={ICONS.plus} size={13} /> Добавить отпуск
            </button>
          </div>
          <table className="tbl">
            <thead><tr><th>Начало</th><th>Окончание</th><th>Тип</th><th>Комментарий</th><th>Делегирование</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {myVacs.map(v => {
                const started = v.start <= TODAY;
                return (
                  <tr key={v.id}>
                    <td>{fmtDMY(v.start)}</td><td>{fmtDMY(v.end)}</td>
                    <td>{VACATION_TYPES[v.type]}</td>
                    <td>{v.comment || '—'}</td>
                    <td>{v.delegation.enabled ? `→ ${empName(v.delegation.subId)}` : '—'}</td>
                    <td><span className={`st-chip ${v.status}`}>
                      {{ pending: 'На утверждении', approved: 'Утверждён', rejected: 'Отклонён' }[v.status]}
                    </span></td>
                    <td>
                      {!started && v.status !== 'rejected' ? (
                        <>
                          <button className="icon-btn" onClick={() => openVacation(v.id)}><Ic d={ICONS.edit} size={14} /></button>
                          <button className="icon-btn danger" onClick={() => { store.deleteVacation(v.id); store.addAudit('Удаление отпуска', fmtDMY(v.start)); }}><Ic d={ICONS.trash} size={14} /></button>
                        </>
                      ) : <span className="mut sm">{started ? 'изменение через HR/администратора' : ''}</span>}
                    </td>
                  </tr>
                );
              })}
              {myVacs.length === 0 && <tr><td colSpan="7" className="mut">Отпусков нет</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'delegation' && (
        <div className="rep-panel">
          <div className="rep-panel-title">
            Временная передача ролей
            <button className="btn primary sm" style={{ marginLeft: 'auto' }} onClick={openDelegation}>
              <Ic d={ICONS.plus} size={13} /> Делегировать роль
            </button>
          </div>
          <p className="mut sm">Роли «Суперадминистратор» и «Генеральный директор» делегируются только через суперадминистратора. Получатель должен подтвердить принятие.</p>
          <table className="tbl">
            <thead><tr><th>От кого</th><th>Кому</th><th>Роли</th><th>Период</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {myDeleg.map(r => (
                <tr key={r.id}>
                  <td>{empName(r.fromId)}</td><td>{empName(r.toId)}</td>
                  <td>{r.roles.join(', ')}</td>
                  <td>{fmtDMY(r.start)} — {r.end ? fmtDMY(r.end) : 'до отмены'}</td>
                  <td><span className={`st-chip ${r.status}`}>
                    {{ pending: 'Ожидает принятия', active: 'Активно', rejected: 'Отклонено', revoked: 'Отозвано', expired: 'Истекло' }[r.status]}
                  </span></td>
                  <td>{r.status === 'active' && r.fromId === user.id && <button className="btn ghost sm" onClick={() => { /* revoke */ }}>Отозвать</button>}</td>
                </tr>
              ))}
              {myDeleg.length === 0 && <tr><td colSpan="6" className="mut">Делегирований нет</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'profile' && (
        <>
          <div className="cab-grid">
            <div className="rep-panel">
              <div className="rep-panel-title">Личные данные</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 140px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  {user.photo ? (
                    <img src={user.photo} alt="Аватар" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }} />
                  ) : (
                    <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>Нет фото</div>
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} />
                  <button className="btn primary sm" onClick={() => fileInputRef.current?.click()}>Загрузить фото</button>
                  {user.photo && <button className="btn ghost sm" onClick={handlePhotoDelete}>Удалить фото</button>}
                </div>

                <div style={{ flex: 1, minWidth: 300 }}>
                  <div className="form-grid">
                    <label className="lbl">Фамилия</label>
                    <input className="inp" disabled value={user.last} />

                    <label className="lbl">Имя</label>
                    <input className="inp" disabled value={user.first} />

                    <label className="lbl">Должность</label>
                    <input className="inp" disabled value={user.position || 'Сотрудник'} />

                    <label className="lbl">E-mail</label>
                    <input className="inp" disabled value={user.email + '@' + DOMAIN} />

                    <label className="lbl">Мобильный телефон</label>
                    <input
                      className="inp"
                      disabled={!editMode}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />

                    <label className="lbl">Внутренний номер телефона *</label>
                    <input
                      className="inp"
                      disabled={!editMode}
                      value={extension}
                      onChange={e => setExtension(e.target.value)}
                      onBlur={() => {
                        if (!extension.trim()) {
                          showToast('Внутренний номер телефона обязателен', 'error');
                        }
                      }}
                    />

                    <label className="lbl">Табельный №</label>
                    <input className="inp" disabled value={user.tab || ''} />

                    <label className="lbl">Подразделения</label>
                    <div className="depts-readonly">
                      {user.departments.map(d => {
                        const dd = data.departments.find(x => x.id === d.deptId);
                        if (!dd) return null;
                        const isPrimary = d.primary;
                        let positionDisplay = '';
                        if (!isPrimary && d.position) {
                          positionDisplay = ` (${d.position})`;
                        }
                        return (
                          <span key={d.deptId} className={`dept-chip${isPrimary ? ' prim' : ''}`}>
                            {dd.name}
                            {isPrimary ? ' · основное' : ' · (совм)'}
                            {positionDisplay}
                          </span>
                        );
                      })}
                      {user.departments.length === 0 && <span className="mut sm">не назначены</span>}
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button className="btn danger" onClick={() => setShowPasswordModal(true)}>Изменить пароль</button>
                    {editMode ? (
                      <>
                        <button className="btn ghost" onClick={() => {
                          setEditMode(false);
                          setPhone(user.phone || '');
                          setExtension(user.extension || '');
                        }}>Отмена</button>
                        <button className="btn primary" onClick={handleSaveProfile}>Сохранить</button>
                      </>
                    ) : (
                      <button className="btn primary" onClick={() => setEditMode(true)}>Изменить данные</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rep-panel">
              <div className="rep-panel-title">Уведомления</div>
              {[
                ['deadlineEmail', 'E-mail о сроках — за 3 дня до срока исполнения задачи'],
                ['overdueDigest', 'Контроль просрочек — ежедневная сводка'],
                ['commentSub', 'Подписка на обсуждение задач, где я исполнитель или ответственный']
              ].map(([k, label]) => (
                <label key={k} className="toggle-row">
                  <span>{label}</span>
                  <span className={`toggle${user.notif[k] ? ' on' : ''}`} onClick={() => {
                    const updated = { ...user, notif: { ...user.notif, [k]: !user.notif[k] } };
                    store.upsertEmployee(updated);
                  }}><span className="toggle-knob" /></span>
                </label>
              ))}
              <p className="mut sm">Критичные уведомления (восстановление пароля, утверждения) отключить нельзя.</p>

              <div className="rep-panel-title" style={{ marginTop: 16 }}>История делегирований</div>
              {data.roleDelegations.filter(r => r.fromId === user.id).map(r => (
                <div key={r.id} className="mut sm">→ {empName(r.toId)}: {r.roles.join(', ')} ({fmtDMY(r.start)} — {r.end ? fmtDMY(r.end) : 'до отмены'})</div>
              ))}
              {data.roleDelegations.filter(r => r.fromId === user.id).length === 0 && <div className="mut sm">Передач ролей не было</div>}
            </div>
          </div>

          {showPasswordModal && (
            <PasswordChangeModal
              user={user}
              store={store}
              onClose={() => setShowPasswordModal(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
```
### `src/components/Calendar.jsx`
```javascript
import { useState, useMemo } from 'react';
import { iso, addDays, fmtDMY, isTaskActive } from '../utils/date';
import { taskVisible, computeScope, hasRole } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import Avatar from './Avatar';

const DayCell = ({ d, big, byDay, db, openTask }) => {
  const dayIso = iso(d);
  const tasks = byDay[dayIso] || [];

  return (
    <div className={`cal-cell${dayIso === iso(new Date()) ? ' today' : ''}`}>
      <div className="cal-daynum">{d.getDate()}</div>
      <div className="cal-chips">
        {tasks.slice(0, big ? 12 : 3).map(t => {
          const p = db.projects.find(x => x.id === t.projectId);
          const assignee = t.assigneeId ? db.employees.find(e => e.id === t.assigneeId) : null;

          return (
            <div
              key={t.id}
              className="cal-chip"
              style={{ borderColor: p?.color }}
              onClick={() => openTask(t.id)}
              title={`${t.title} (${p?.code || 'без проекта'})`}
            >
              <div className="cal-task-title">
                <span className="pdot" style={{ background: p?.color }} />
                <span>{t.title}</span>
              </div>
              <div className="cal-executors">
                {assignee && <Avatar employee={assignee} size="xs" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Calendar({ db, ur, openTask }) {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(new Date());
  const [showOnlyMy, setShowOnlyMy] = useState(false);

  const canSeeAll = hasRole(ur, "admin", "director", "economist", "kb_chief", "head", "project_lead", "project_manager");

  let allTasks = db.tasks.filter(t => isTaskActive(t) && taskVisible(ur, scope, t, db) && t.deadline && !['closed','cancelled'].includes(t.status));

  if (showOnlyMy) {
    allTasks = allTasks.filter(t => t.assigneeId === ur.id);
  }

  const byDay = useMemo(() => {
    const m = {};
    allTasks.forEach(t => { (m[t.deadline] = m[t.deadline] || []).push(t); });
    return m;
  }, [allTasks]);

  const shift = (dir) => {
    if (mode === 'month') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
    else if (mode === 'week') setAnchor(addDays(anchor, dir * 7));
    else setAnchor(addDays(anchor, dir));
  };
  const title = mode === 'month' ? `${['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][anchor.getMonth()]} ${anchor.getFullYear()}` :
    mode === 'week' ? `Неделя ${fmtDMY(iso(addDays(anchor, -((anchor.getDay()+6)%7))))} — ${fmtDMY(iso(addDays(anchor, 6-((anchor.getDay()+6)%7))))}` : fmtDMY(iso(anchor));

  let body = null;
  if (mode === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const cells = []; for (let i=0; i<42; i++) cells.push(addDays(first, i-offset));
    body = (<>
      <div className="cal-grid-head">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(w => <div key={w} className="cal-wd">{w}</div>)}</div>
      <div className="cal-grid">{cells.map(d => <div key={iso(d)} className={d.getMonth()===anchor.getMonth()?'':'outwrap'}><DayCell d={d} big={false} byDay={byDay} db={db} openTask={openTask} /></div>)}</div>
    </>);
  } else if (mode === 'week') {
    const mon = addDays(anchor, -((anchor.getDay()+6)%7));
    body = <div className="cal-week">{[0,1,2,3,4,5,6].map(i => <DayCell key={i} d={addDays(mon, i)} big byDay={byDay} db={db} openTask={openTask} />)}</div>;
  } else {
    body = <div className="cal-week one"><DayCell d={anchor} big byDay={byDay} db={db} openTask={openTask} /></div>;
  }

  return (
    <div className="cal-panel">
      <div className="cal-head">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
          <div className="cal-title">{title}</div>
          <button className="icon-btn" onClick={() => shift(1)}><Ic d={ICONS.right} size={16} /></button>
        </div>
        <div className="cal-right">
          <button className="btn ghost sm" onClick={() => setAnchor(new Date())}>Сегодня</button>
          <div className="seg">{['day','week','month'].map(m => <button key={m} className={`seg-btn${mode===m?' on':''}`} onClick={() => setMode(m)}>{['День','Неделя','Месяц'][['day','week','month'].indexOf(m)]}</button>)}</div>
          {canSeeAll && (
            <label className="dept-pick" style={{ marginLeft: 8 }}>
              <input type="checkbox" checked={showOnlyMy} onChange={(e) => setShowOnlyMy(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Мои задачи</span>
            </label>
          )}
        </div>
      </div>
      <div className="cal-note">Только задачи со сроком выполнения.</div>
      {body}
    </div>
  );
}
```
### `src/components/CreateEmployeeModal.jsx`
```javascript
import React, { useState } from 'react';
import { Modal } from './Modal';
import { uid } from '../utils/date';
import { ROLES } from '../utils/constants';

export default function CreateEmployeeModal({ db, setDb, onClose, toast, audit }) {
  const [form, setForm] = useState({
    last: '',
    first: '',
    email: '',
    pass: '',
    position: 'Сотрудник',
    departments: [],
    roles: ['executor'],
    phone: '',
    extension: '',
    tab: String(1000 + Math.floor(Math.random() * 8999)),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!form.last.trim() || !form.first.trim() || !form.email.trim() || !form.pass.trim()) {
      toast('Заполните все обязательные поля', 'err');
      return;
    }
    if (db.employees.some(e => e.email === form.email)) {
      toast('Сотрудник с таким email уже существует', 'err');
      return;
    }
    // Проверка пароля
    if (form.pass.length < 8) {
      toast('Пароль должен быть не менее 8 символов', 'err');
      return;
    }
    const newEmp = {
      id: 'e_' + uid(),
      last: form.last.trim(),
      first: form.first.trim(),
      email: form.email.trim(),
      pass: form.pass,
      position: form.position || 'Сотрудник',
      departments: form.departments,
      roles: form.roles,
      kbIds: [],
      headDeptIds: [],
      phone: form.phone || '',
      extension: form.extension || '',
      tab: form.tab || String(1000 + Math.floor(Math.random() * 8999)),
      notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
      failed: 0,
      lockUntil: 0,
      fired: false,
      photo: null,
      passwordHistory: []
    };
    setDb(prev => ({
      ...prev,
      employees: [...prev.employees, newEmp]
    }));
    audit('Создание сотрудника', `${newEmp.last} ${newEmp.first}`);
    toast('Сотрудник создан');
    onClose();
  };

  return (
    <Modal title="Добавить сотрудника" onClose={onClose} width={560}>
      <div className="form-grid">
        <label className="lbl">Фамилия *</label>
        <input className="inp" name="last" value={form.last} onChange={handleChange} />
        <label className="lbl">Имя *</label>
        <input className="inp" name="first" value={form.first} onChange={handleChange} />
        <label className="lbl">E-mail *</label>
        <input className="inp" name="email" value={form.email} onChange={handleChange} />
        <label className="lbl">Пароль *</label>
        <input className="inp" type="password" name="pass" value={form.pass} onChange={handleChange} />
        <label className="lbl">Должность</label>
        <input className="inp" name="position" value={form.position} onChange={handleChange} />
        <label className="lbl">Телефон</label>
        <input className="inp" name="phone" value={form.phone} onChange={handleChange} />
        <label className="lbl">Внутренний номер</label>
        <input className="inp" name="extension" value={form.extension} onChange={handleChange} />
        <label className="lbl">Табельный №</label>
        <input className="inp" name="tab" value={form.tab} onChange={handleChange} />
        <label className="lbl">Роли (по умолчанию исполнитель)</label>
        <div className="sub-picks">
          {Object.keys(ROLES).map(r => (
            <label key={r} className="dept-pick">
              <input
                type="checkbox"
                checked={form.roles.includes(r)}
                onChange={() => {
                  setForm(prev => ({
                    ...prev,
                    roles: prev.roles.includes(r) ? prev.roles.filter(x => x !== r) : [...prev.roles, r]
                  }));
                }}
              />
              {ROLES[r].label}
            </label>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={handleSubmit}>Создать</button>
      </div>
    </Modal>
  );
}
```
### `src/components/Discussion.jsx`
```javascript
// src/components/Discussion.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { uid, fmtDT, initials } from '../utils/date';
import { has } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import { COMMENT_EDIT_WINDOW } from '../utils/constants';
import Avatar from './Avatar';

/**
 * Рендерит текст с подсветкой @упоминаний
 */
function renderMentionText(text) {
  return text.split("@").map((part, i) => {
    if (i === 0) return <span key={i}>{part}</span>;
    const tokens = part.split(/(\s+)/);
    let mention = tokens[0];
    let restStart = 1;
    if (tokens.length > 2 && /^[А-ЯA-ZЁ]/.test(tokens[2])) {
      mention += " " + tokens[2];
      restStart = 3;
    }
    return (
      <span key={i}>
        <span className="mention">@{mention}</span>
        {tokens.slice(restStart).join("")}
      </span>
    );
  });
}

/**
 * Извлекает ID сотрудников, упомянутых через @фамилия
 */
export function extractMentions(text, employees) {
  const found = [];
  text.split("@").slice(1).forEach((part) => {
    const token = part.trim().split(/[\s,.!?:;]/)[0].toLowerCase();
    if (!token) return;
    const emp = employees.find((e) => e.last.toLowerCase() === token);
    if (emp && !found.includes(emp.id)) found.push(emp.id);
  });
  return found;
}

/**
 * Универсальный компонент обсуждения (дерево комментариев с ответами, упоминаниями, редактированием)
 */
export default function Discussion({
  comments,
  currentUser,
  candidates = [],
  onUpdateComments,
  onCommentAdded,
  readOnly = false,
  canComment = true,
  toast,
  employees = [],
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [mentionQ, setMentionQ] = useState(null);
  const [mentionPopup, setMentionPopup] = useState({ visible: false, x: 0, y: 0 });
  const textareaRef = useRef(null);
  const cursorPosRef = useRef(null);

  const allEmployees = employees;

  // Фильтрация кандидатов для упоминаний
  const filteredCandidates = useMemo(() => {
    if (mentionQ === null) return [];
    return candidates.filter((e) =>
      (`${e.last} ${e.first}`).toLowerCase().includes(mentionQ.toLowerCase())
    );
  }, [candidates, mentionQ]);

  // При изменении mentionQ вычисляем позицию для портала
  useEffect(() => {
    if (mentionQ !== null && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setMentionPopup({
        visible: true,
        x: rect.left,
        y: rect.bottom + 4,
      });
    } else {
      setMentionPopup(prev => ({ ...prev, visible: false }));
    }
  }, [mentionQ]);

  // Восстановление курсора после обновления text
  useEffect(() => {
    if (cursorPosRef.current !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(cursorPosRef.current, cursorPosRef.current);
      cursorPosRef.current = null;
    }
  }, [text]);

  // Поиск автора по ID
  const getAuthor = (id) => allEmployees.find((e) => e.id === id);

  // Обработка ввода текста (включая поиск @)
  const onType = (val) => {
    setText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0) {
      const suffix = val.slice(lastAt + 1);
      if (!/\s/.test(suffix) && suffix.length <= 30) {
        setMentionQ(suffix);
      } else {
        setMentionQ(null);
      }
    } else {
      setMentionQ(null);
    }
  };

  // Выбор упоминания из всплывающего списка
  const pickMention = (emp) => {
    const lastAt = text.lastIndexOf("@");
    if (lastAt === -1) return;

    const prefix = text.slice(0, lastAt + 1);
    const suffix = text.slice(lastAt + 1);
    const insert = `${emp.last} ${emp.first}, `;
    const newText = prefix + insert + suffix;

    // Позиция курсора – сразу после вставленного имени (включая запятую и пробел)
    const cursorPos = prefix.length + insert.length;
    cursorPosRef.current = cursorPos;

    setText(newText);
    setMentionQ(null);

    // Возвращаем фокус в текстовое поле
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Отправка комментария
  const send = () => {
    if (readOnly || !canComment) return;
    if (!text.trim()) return;

    const newComment = {
      id: uid(),
      parentId: replyTo,
      authorId: currentUser.id,
      ts: Date.now(),
      text: text.trim(),
    };

    const updatedComments = [...comments, newComment];
    onUpdateComments(updatedComments);
    if (onCommentAdded) onCommentAdded(newComment);

    setText("");
    setReplyTo(null);
    setMentionQ(null);
  };

  // Проверка права на удаление
  const canDelete = (c) => {
    const hasReplies = comments.some((x) => x.parentId === c.id);
    if (has(currentUser, "admin", "director")) return true;
    return c.authorId === currentUser.id && !hasReplies;
  };

  // Проверка права на редактирование (в течение окна)
  const canEdit = (c) =>
    c.authorId === currentUser.id &&
    Date.now() - c.ts < COMMENT_EDIT_WINDOW;

  // Удаление комментария и всех ответов
  const del = (c) => {
    if (!window.confirm("Удалить комментарий и все ответы?")) return;

    const subtree = new Set([c.id]);
    let changed = true;
    while (changed) {
      changed = false;
      comments.forEach((x) => {
        if (x.parentId && subtree.has(x.parentId) && !subtree.has(x.id)) {
          subtree.add(x.id);
          changed = true;
        }
      });
    }

    const updatedComments = comments.filter((x) => !subtree.has(x.id));
    onUpdateComments(updatedComments);
    if (toast) toast("Комментарий удалён");
  };

  // Сохранение отредактированного комментария
  const saveEdit = (c) => {
    if (!editText.trim()) return;
    const updatedComments = comments.map((x) =>
      x.id === c.id ? { ...x, text: editText.trim() } : x
    );
    onUpdateComments(updatedComments);
    setEditingId(null);
    setEditText("");
  };

  // Рекурсивное построение дерева комментариев
  const renderTree = (parentId, depth) => {
    const children = comments
      .filter((c) => (c.parentId || null) === parentId)
      .sort((a, b) => a.ts - b.ts);

    return children.map((c) => {
      const author = getAuthor(c.authorId);
      return (
        <div key={c.id}>
          <div className={"cm" + (depth > 0 ? " reply" : "")}>
            <div className="cm-head">
              <Avatar employee={author} size="xs" />
              <span className="cm-author">
                {author ? `${author.last} ${author.first}` : "—"}
              </span>
              <span className="mut sm">{fmtDT(c.ts)}</span>
              {!readOnly &&
                editingId !== c.id &&
                Date.now() - c.ts < COMMENT_EDIT_WINDOW &&
                c.authorId === currentUser.id && (
                  <span className="mut sm">· можно редактировать</span>
                )}
            </div>

            {editingId === c.id ? (
              <div className="cm-edit">
                <textarea
                  className="inp"
                  rows="2"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <div className="cm-actions">
                  <button className="btn primary sm" onClick={() => saveEdit(c)}>
                    Сохранить
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => setEditingId(null)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="cm-text">{renderMentionText(c.text)}</div>
            )}

            {!readOnly && canComment && (
              <div className="cm-actions">
                <button className="link" onClick={() => setReplyTo(c.id)}>
                  Ответить
                </button>
                {canEdit(c) && editingId !== c.id && (
                  <button
                    className="link"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditText(c.text);
                    }}
                  >
                    Редактировать
                  </button>
                )}
                {canDelete(c) && (
                  <button className="link red-link" onClick={() => del(c)}>
                    Удалить
                  </button>
                )}
              </div>
            )}
          </div>
          {renderTree(c.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="chat">
      {renderTree(null, 0)}

      {comments.length === 0 && (
        <div className="mut sm">Обсуждений пока нет — начните диалог.</div>
      )}

      {!readOnly && canComment ? (
        <>
          {replyTo && (
            <div className="reply-banner">
              Ответ на комментарий{" "}
              {(() => {
                const parent = comments.find((x) => x.id === replyTo);
                const author = parent ? getAuthor(parent.authorId) : null;
                return author ? `${author.last} ${author.first}` : "";
              })()}
              <button className="link" onClick={() => setReplyTo(null)}>
                отменить
              </button>
            </div>
          )}

          <div className="cm-input-wrap">
            {/* Список упоминаний рендерится через портал с динамическим позиционированием */}
            {mentionPopup.visible && filteredCandidates.length > 0 &&
              createPortal(
                <div
                  className="mention-pop"
                  style={{
                    position: 'fixed',
                    left: mentionPopup.x,
                    top: mentionPopup.y,
                    zIndex: 10001,
                  }}
                >
                  {filteredCandidates.slice(0, 6).map((e) => (
                    <div
                      key={e.id}
                      className="mention-item"
                      onClick={() => pickMention(e)}
                    >
                      <span className="avatar xs">
                        {initials(e.first, e.last)}
                      </span>
                      {e.last} {e.first}
                    </div>
                  ))}
                </div>,
                document.body
              )
            }

            <textarea
              ref={textareaRef}
              className="inp"
              rows="2"
              placeholder="Комментарий… Введите @ для упоминания участника"
              value={text}
              onChange={(e) => onType(e.target.value)}
              disabled={readOnly || !canComment}
            />
          </div>

          <div className="cm-foot">
            <span className="mut sm">
              Участники получат уведомление; упомянутые — отдельно.
            </span>
            <button className="btn primary sm" onClick={send}>
              <Ic d={ICONS.chat} size={13} /> Отправить
            </button>
          </div>
        </>
      ) : readOnly ? (
        <div className="info-box">
          Обсуждение сохранено. Добавление комментариев к архивным объектам запрещено.
        </div>
      ) : (
        !canComment && (
          <div className="info-box">
            У вас нет прав для комментирования этого объекта.
          </div>
        )
      )}
    </div>
  );
}
```
### `src/components/EditEmployeeModal.jsx`
```javascript
import React, { useState } from 'react';
import { Modal } from './Modal';
import { hasRole } from '../utils/permissions';

export default function EditEmployeeModal({ db, setDb, employeeId, onClose, toast, audit, ur }) {
  const emp = db.employees.find(e => e.id === employeeId);
  if (!emp) return null;

  const [form, setForm] = useState({
    last: emp.last || '',
    first: emp.first || '',
    email: emp.email || '',
    position: emp.position || 'Сотрудник',   // <-- основная должность
    phone: emp.phone || '',
    extension: emp.extension || '',
    tab: emp.tab || '',
  });
  const [newPass, setNewPass] = useState('');

  const isAdmin = hasRole(ur, 'admin');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!form.last.trim() || !form.first.trim() || !form.email.trim()) {
      toast('Фамилия, имя и email обязательны', 'err');
      return;
    }
    const updatedEmp = {
      ...emp,
      last: form.last.trim(),
      first: form.first.trim(),
      email: form.email.trim(),
      position: form.position.trim() || 'Сотрудник',   // <-- сохраняем основную должность
      phone: form.phone || '',
      extension: form.extension || '',
      tab: form.tab || '',
    };
    if (isAdmin && newPass.trim()) {
      if (newPass.length < 8) {
        toast('Пароль должен быть не менее 8 символов', 'err');
        return;
      }
      updatedEmp.pass = newPass.trim();
      const history = emp.passwordHistory || [];
      if (history.some(p => p === newPass.trim())) {
        toast('Этот пароль уже использовался', 'err');
        return;
      }
      updatedEmp.passwordHistory = [...history.slice(-4), newPass.trim()];
    }
    setDb(prev => ({
      ...prev,
      employees: prev.employees.map(e => e.id === employeeId ? updatedEmp : e)
    }));
    audit('Редактирование сотрудника', `${updatedEmp.last} ${updatedEmp.first}`);
    toast('Данные сотрудника обновлены');
    onClose();
  };

  return (
    <Modal title={`Редактирование сотрудника — ${emp.last} ${emp.first}`} onClose={onClose} width={560}>
      <div className="form-grid">
        <label className="lbl">Фамилия *</label>
        <input className="inp" name="last" value={form.last} onChange={handleChange} />
        <label className="lbl">Имя *</label>
        <input className="inp" name="first" value={form.first} onChange={handleChange} />
        <label className="lbl">E-mail *</label>
        <input className="inp" name="email" value={form.email} onChange={handleChange} />
        <label className="lbl">Должность (основная)</label>   {/* <-- подпись */}
        <input className="inp" name="position" value={form.position} onChange={handleChange} />
        <label className="lbl">Телефон</label>
        <input className="inp" name="phone" value={form.phone} onChange={handleChange} />
        <label className="lbl">Внутренний номер</label>
        <input className="inp" name="extension" value={form.extension} onChange={handleChange} />
        <label className="lbl">Табельный №</label>
        <input className="inp" name="tab" value={form.tab} onChange={handleChange} />
        {isAdmin && (
          <>
            <label className="lbl">Новый пароль</label>
            <input className="inp" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </>
        )}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={handleSave}>Сохранить</button>
      </div>
    </Modal>
  );
}
```
### `src/components/ErrorBoundary.jsx`
```javascript
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2>Что-то пошло не так</h2>
          <p style={{ color: '#666' }}>Попробуйте перезагрузить страницу или сообщите разработчику.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', marginTop: '12px', cursor: 'pointer' }}>
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```
### `src/components/FormField.jsx`
```javascript
import { useId } from 'react';

export const FormField = ({ label, type = 'text', value, onChange, disabled, options, ...props }) => {
  const id = `field-${useId()}`;
  return (
    <>
      <label className="lbl" htmlFor={id}>{label}</label>
      {type === 'select' ? (
        <select className="inp sel" id={id} value={value} onChange={onChange} disabled={disabled}>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea className="inp" id={id} rows={props.rows || 2} value={value} onChange={onChange} disabled={disabled} />
      ) : type === 'date' ? (
        <input className="inp" type="date" id={id} value={value} onChange={onChange} disabled={disabled} />
      ) : (
        <input className="inp" type={type} id={id} value={value} onChange={onChange} disabled={disabled} />
      )}
    </>
  );
};
```
### `src/components/Gantt.jsx`
```javascript
import React, { useState, useMemo } from 'react';
import { TODAY, iso, addDays, parseISO, fmtD, fmtDMY, isTaskActive } from '../utils/date';
import { TASK_STATUSES, DEPENDENCY_TYPES, PRIORITIES } from '../utils/constants';
import { useDataHelpers } from '../hooks';
import { computeScope, taskVisible } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import Avatar from './Avatar';
import { getProjectColor } from '../utils/projectHelpers';

export default function Gantt({ db, ur, openTask, openProject }) {
  const { empName, getTaskSpent, vacOverlap } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const tasks = db.tasks.filter(t => isTaskActive(t) && taskVisible(ur, scope, t, db) && t.start && t.deadline);

  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return iso(new Date(d.getFullYear(), d.getMonth(), 1));
  });

  const DW = 34;

  const getDaysInRange = (anchorDate, mode) => {
    const start = parseISO(anchorDate);
    const days = [];
    if (mode === 'month') {
      const year = start.getFullYear();
      const month = start.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 0; i < daysInMonth; i++) {
        days.push(iso(new Date(year, month, i + 1)));
      }
    } else if (mode === 'quarter') {
      for (let i = 0; i < 90; i++) {
        days.push(iso(addDays(start, i)));
      }
    } else {
      for (let i = 0; i < 365; i++) {
        days.push(iso(addDays(start, i)));
      }
    }
    return days;
  };

  const shift = (dir) => {
    let newAnchor;
    if (mode === 'month') {
      const d = parseISO(anchor);
      d.setMonth(d.getMonth() + dir);
      newAnchor = iso(d);
    } else if (mode === 'quarter') {
      const d = parseISO(anchor);
      d.setMonth(d.getMonth() + dir * 3);
      newAnchor = iso(d);
    } else {
      const d = parseISO(anchor);
      d.setFullYear(d.getFullYear() + dir);
      newAnchor = iso(d);
    }
    setAnchor(newAnchor);
  };

  const ganttData = useMemo(() => {
    if (!tasks.length) return null;
    const days = getDaysInRange(anchor, mode);
    const months = [];
    days.forEach((day, i) => {
      const d = parseISO(day);
      const lbl = `${['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][d.getMonth()]} ${d.getFullYear()}`;
      if (!months.length || months[months.length-1].label !== lbl) months.push({ label: lbl, from: i, to: i });
      else months[months.length-1].to = i;
    });
    const viewStart = days[0];
    const viewEnd = days[days.length - 1];
    const groups = [];
    const seen = new Set();
    tasks.forEach(t => {
      if (!seen.has(t.projectId)) {
        seen.add(t.projectId);
        const project = db.projects.find(p => p.id === t.projectId);
        if (project && (scope.all || scope.projIds.has(project.id))) {
          groups.push({ project, items: [] });
        }
      }
    });
    groups.forEach(g => {
      const items = tasks
        .filter(t => t.projectId === g.project.id)
        .map(t => {
          let sIdx = days.indexOf(t.start);
          let eIdx = days.indexOf(t.deadline);
          if (sIdx === -1 && eIdx === -1) {
            if (t.start < viewStart && t.deadline > viewEnd) {
              sIdx = 0; eIdx = days.length - 1;
            } else {
              return null;
            }
          }
          if (sIdx === -1 && t.start < viewStart) sIdx = 0;
          if (eIdx === -1 && t.deadline > viewEnd) eIdx = days.length - 1;
          if (sIdx === -1 || eIdx === -1) return null;
          if (sIdx > eIdx) return null;
          return { ...t, sIdx, eIdx };
        })
        .filter(Boolean)
        .sort((a,b) => (a.start < b.start ? -1 : 1));
      g.items = items;
    });
    return { days, months, groups: groups.filter(g => g.items.length > 0) };
  }, [tasks, db.projects, anchor, mode, scope]);

  if (!ganttData || ganttData.groups.length === 0) {
    return (
      <div className="gantt-panel">
        <div className="cal-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
            <div className="cal-title" style={{ minWidth: '120px', fontSize: '15px', fontWeight: 700 }}>{fmtDMY(anchor)}</div>
            <button className="icon-btn" onClick={() => shift(1)}><Ic d={ICONS.right} size={16} /></button>
          </div>
          <div className="cal-right">
            <div className="seg">
              {[['month','Месяц'], ['quarter','Квартал'], ['year','Год']].map(([m,l]) => (
                <button key={m} className={`seg-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="empty-note" style={{ padding: '60px 0' }}>Нет доступных задач в выбранном периоде</div>
      </div>
    );
  }

  const { days, months, groups } = ganttData;
  const todayIdx = days.indexOf(TODAY);
  const width = days.length * DW;
  const totalWidth = width + 240;

  const getDepCoords = (t, depTask, depItem) => {
    if (!depTask || !depItem) return null;
    const tLeft = t.sIdx * DW + DW/2;
    const tRight = t.eIdx * DW + DW/2;
    const depLeft = depItem.sIdx * DW + DW/2;
    const depRight = depItem.eIdx * DW + DW/2;
    switch (t.dependencyType) {
      case 'SS': return { fromX: depLeft, toX: tLeft, fromY: -25, toY: -10 };
      case 'FF': return { fromX: depRight, toX: tRight, fromY: -25, toY: -10 };
      case 'SF': return { fromX: depLeft, toX: tRight, fromY: -25, toY: -10 };
      default: return { fromX: depRight, toX: tLeft, fromY: -25, toY: -10 };
    }
  };

  return (
    <div className="gantt-panel">
      <div className="cal-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
          <div className="cal-title" style={{ minWidth: '120px', fontSize: '15px', fontWeight: 700 }}>{fmtDMY(anchor)}</div>
          <button className="icon-btn" onClick={() => shift(1)}><Ic d={ICONS.right} size={16} /></button>
        </div>
        <div className="cal-right">
          <div className="seg">
            {[['month','Месяц'], ['quarter','Квартал'], ['year','Год']].map(([m,l]) => (
              <button key={m} className={`seg-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="gantt-scroll">
        <div className="gantt" style={{ '--gantt-width': totalWidth + 'px' }}>
          <div className="gantt-top">
            <div className="gantt-corner">Проект / задача</div>
            <div className="gantt-axis" style={{ width }}>
              <div className="gantt-months" style={{ display: 'flex', flexWrap: 'nowrap', width }}>
                {months.map((m, i) => (
                  <div key={i} className="gantt-month" style={{ width: (m.to - m.from + 1) * DW, flex: 'none' }}>
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="gantt-days" style={{ display: 'flex', flexWrap: 'nowrap', width }}>
                {days.map(d => {
                  const dt = parseISO(d);
                  const wk = dt.getDay();
                  return (
                    <div
                      key={d}
                      className={`gday${(wk === 0 || wk === 6) ? ' wk' : ''}${d === TODAY ? ' td' : ''}`}
                      style={{ width: DW, flex: 'none', whiteSpace: 'nowrap', boxSizing: 'border-box' }}
                    >
                      {dt.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="gantt-body">
            <div className="gantt-grid" style={{ width, left: 240 }}>
              {days.map(d => <div key={d} className={`gcell${([0,6].includes(parseISO(d).getDay()) ? ' wk' : '')}`} style={{ width: DW, flex: 'none' }} />)}
              {todayIdx >= 0 && <div className="gtoday" style={{ left: todayIdx * DW + DW/2 }} />}
            </div>
            {groups.map(g => {
              const taskDeps = g.items.reduce((acc, t) => {
                if (t.dependencyId) acc[t.id] = db.tasks.find(dt => dt.id === t.dependencyId);
                return acc;
              }, {});
              const projectColor = getProjectColor(g.project);

              return (
                <div key={g.project.id}>
                  <div className="gantt-group">
                    <div 
                      className="gantt-group-name" 
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => openProject && openProject(g.project.id)}
                      title="Открыть проект"
                    >
                      <span className="pdot" style={{ background: projectColor }} />{g.project.code} · {g.project.name}
                    </div>
                    <div style={{ width }} />
                  </div>
                  {g.items.map(t => {
                    const assignee = t.assigneeId ? db.employees.find(e => e.id === t.assigneeId) : null;
                    const left = t.sIdx * DW + 2;
                    const w = Math.max((t.eIdx - t.sIdx + 1) * DW - 4, DW - 8);
                    const sp = getTaskSpent(t);
                    const pct = Math.min(100, (sp / Math.max(1, t.plannedHours || 0)) * 100);
                    const fillWidth = pct > 0 ? Math.max(pct, 2) : 0;
                    const vac = assignee ? vacOverlap(assignee.id, t.start, t.deadline) : null;
                    const tip = `${t.title}: ${fmtD(t.start)} — ${fmtD(t.deadline)}, план ${t.plannedHours ?? '—'} ч${vac ? `. Исполнитель в отпуске ${fmtDMY(vac.start)}–${fmtDMY(vac.end)}` : ''}`;
                    const depTask = taskDeps[t.id];
                    let depLine = null;
                    if (depTask) {
                      const depItem = g.items.find(it => it.id === depTask.id);
                      if (depItem) {
                        const coords = getDepCoords(t, depTask, depItem);
                        if (coords) {
                          depLine = (
                            <svg
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
                            >
                              <path
                                d={`M ${coords.fromX} ${coords.fromY} L ${coords.toX} ${coords.fromY} L ${coords.toX} ${coords.toY}`}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeDasharray="4 2"
                                markerEnd="url(#arrowhead)"
                              />
                              <text
                                x={(coords.fromX + coords.toX) / 2}
                                y={coords.fromY - 5}
                                fontSize="10"
                                fill="#64748b"
                                textAnchor="middle"
                              >
                                {t.dependencyType || 'FS'}
                              </text>
                            </svg>
                          );
                        }
                      }
                    }

                    const priorityColor = PRIORITIES[t.priority]?.color || '#64748b';
                    const bgColor = priorityColor + '33';

                    return (
                      <div key={t.id} className="gantt-row" style={{ position: 'relative' }}>
                        {depLine}
                        <div className="gantt-label" onClick={() => openTask(t.id)}>
                          <span className={`gtitle${t.status === 'cancelled' ? ' dim' : ''}`}>{t.title}</span>
                          <span className="gsub">
                            {assignee && <Avatar employee={assignee} size="xs" />} · {t.plannedHours ?? '—'} ч · {TASK_STATUSES[t.status].label}
                          </span>
                        </div>
                        <div className="gantt-track">
                          <div
                            className="gbar"
                            style={{
                              '--bar-left': left + 'px',
                              '--bar-width': w + 'px',
                              '--bar-bg': bgColor,
                              '--bar-opacity': t.status === 'cancelled' ? 0.45 : 1,
                              '--fill-width': fillWidth + '%',
                              '--fill-color': t.status === 'closed' ? '#10b981' : priorityColor
                            }}
                            onClick={() => openTask(t.id)}
                            title={tip}
                          >
                            <div className="gbar-fill" />
                            {vac && <span className="gbar-vac">🏖</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="gantt-legend" style={{ padding: '8px 16px', borderTop: '1px solid var(--line)' }}>
        <span><span className="lg-dot" style={{ background: '#ef4444' }} /> сегодня</span>
        <span><span className="lg-dot" style={{ background: '#e2e8f0' }} /> выходные</span>
        <span>🏖 — исполнитель в отпуске</span>
        <span>Заполнение полосы — факт / план</span>
      </div>
    </div>
  );
}
```
### `src/components/Icons.jsx`
```javascript
import React from 'react';

export const Ic = ({ d, size = 18, w = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

export const ICONS = {
  kanban: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z",
  gantt: "M3 6h8M9 12h10M5 18h7M3 4v16",
  cal: "M4 6h16v14H4zM4 10h16M8 4v4M16 4v4",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.6M17.5 14a6.5 6.5 0 0 1 4 6",
  chart: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  plus: "M12 5v14M5 12h14",
  out: "M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9",
  x: "M6 6l12 12M18 6L6 18",
  left: "M15 6l-6 6 6 6",
  right: "M9 6l6 6-6 6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  trash: "M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6",
  edit: "M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19zM13 6l5 5",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
  download: "M12 4v11M7 11l5 5 5-5M4 20h16",
  bell: "M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10 19a2 2 0 0 0 4 0",
  beach: "M12 3v9M12 12l7 3M12 12L5 15M4 20c2-1.5 4-1.5 6 0 2-1.5 4-1.5 6 0",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  inbox: "M3 13l3-8h12l3 8v6H3zM3 13h5l1.5 2.5h5L16 13h5",
  book: "M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2zM8 3v18",
  swap: "M7 8h13M17 5l3 3-3 3M17 16H4M7 13l-3 3 3 3",
  chat: "M21 12a8 8 0 0 1-8 8H4l2.5-2.5A8 8 0 1 1 21 12z",
  archive: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  restore: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  eye: "M1 12s3-7 11-7 11 7 11 7-3 7-11 7-11-7-11-7zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  filter: "M4 6h16M6 12h14M8 18h12",
  close: "M6 6l12 12M18 6L6 18",
  lock: "M7 11V7a5 5 0 0 1 10 0v4h1v10H6V11h1zm2 0h6V7a3 3 0 0 0-6 0v4z",
  file: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7",
  list: "M3 6h18M3 12h18M3 18h18",
  tasks: "M3 6h12M3 12h16M3 18h14M7 6l2 2 4-4M7 12l2 2 4-4M7 18l2 2 4-4",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",
};
```
### `src/components/Journal.jsx`
```javascript
import React, { useState, useMemo } from 'react';
import { fmtDT, fmtDMY } from '../utils/date';
import { useDataHelpers } from '../hooks';
import { Ic, ICONS } from './Icons';

// Безопасная проверка даты
const safeDate = (ts) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

// Правильный парсинг строки "дд.мм.гггг" в объект Date
const parseDayKey = (dayKey) => {
  const parts = dayKey.split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
};

const ACTIONS = [
  { value: 'all', label: 'Все действия' },
  { value: 'Создание задачи', label: 'Создание задачи' },
  { value: 'Изменение задачи', label: 'Изменение задачи' },
  { value: 'Удаление задачи', label: 'Удаление задачи' },
  { value: 'Изменение статуса задачи', label: 'Изменение статуса' },
  { value: 'Создание проекта', label: 'Создание проекта' },
  { value: 'Изменение проекта', label: 'Изменение проекта' },
  { value: 'Удаление проекта', label: 'Удаление проекта' },
  { value: 'Архивация проекта', label: 'Архивация проекта' },
  { value: 'Создание сотрудника', label: 'Создание сотрудника' },
  { value: 'Изменение ролей', label: 'Изменение ролей' },
  { value: 'Изменение подразделений', label: 'Изменение подразделений' },
  { value: 'Увольнение сотрудника', label: 'Увольнение сотрудника' },
  { value: 'Восстановление сотрудника', label: 'Восстановление сотрудника' },
  { value: 'Создание отпуска', label: 'Создание отпуска' },
  { value: 'Изменение отпуска', label: 'Изменение отпуска' },
  { value: 'Удаление отпуска', label: 'Удаление отпуска' },
  { value: 'Запрос изменения часов', label: 'Запрос изменения часов' },
  { value: 'Утверждение запроса часов', label: 'Утверждение запроса часов' },
  { value: 'Отклонение запроса часов', label: 'Отклонение запроса часов' },
  { value: 'Создание делегирования ролей', label: 'Делегирование ролей' },
  { value: 'Принятие делегирования', label: 'Принятие делегирования' },
  { value: 'Отклонение делегирования', label: 'Отклонение делегирования' },
  { value: 'Автоматическая архивация задач', label: 'Автоматическая архивация' },
  { value: 'Утверждение отпуска', label: 'Утверждение отпуска' },
  { value: 'Отклонение отпуска', label: 'Отклонение отпуска' },
  { value: 'Одобрение регистрации', label: 'Одобрение регистрации' },
  { value: 'Отклонение регистрации', label: 'Отклонение регистрации' },
];

export default function Journal({ db }) {
  const { empName } = useDataHelpers(db);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    userId: 'all',
    action: 'all',
    search: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const allEntries = useMemo(() => {
    return [...(db.audit || [])].sort((a, b) => b.ts - a.ts);
  }, [db.audit]);

  const userOptions = useMemo(() => {
    const userIds = new Set(allEntries.map(e => e.userId).filter(id => id !== 'system'));
    return [...userIds].map(id => ({ id, name: empName(id) || id }));
  }, [allEntries, empName]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      const dateObj = safeDate(entry.ts);
      if (!dateObj) return false; // пропускаем записи с некорректной датой
      
      const entryDate = fmtDMY(entry.ts);
      if (filters.dateFrom && entryDate < filters.dateFrom) return false;
      if (filters.dateTo && entryDate > filters.dateTo) return false;
      if (filters.userId !== 'all' && entry.userId !== filters.userId) return false;
      if (filters.action !== 'all' && entry.action !== filters.action) return false;
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const match = (entry.action || '').toLowerCase().includes(q) ||
                      (entry.details || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allEntries, filters]);

  // Группировка по датам (день/месяц) - используем parseDayKey
  const groupedEntries = useMemo(() => {
    const groups = {};
    filteredEntries.forEach(entry => {
      const d = safeDate(entry.ts);
      if (!d) return; // пропускаем
      
      const dayKey = fmtDMY(entry.ts);
      const monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
      
      if (!groups[monthKey]) groups[monthKey] = {};
      if (!groups[monthKey][dayKey]) groups[monthKey][dayKey] = [];
      groups[monthKey][dayKey].push(entry);
    });
    
    // Сортировка месяцев (от новых к старым)
    const sortedMonths = Object.keys(groups).sort((a, b) => {
      const [m1, y1] = a.split('.').map(Number);
      const [m2, y2] = b.split('.').map(Number);
      return y2 - y1 || m2 - m1;
    });
    
    const result = [];
    sortedMonths.forEach(month => {
      const days = Object.keys(groups[month]).sort((a, b) => {
        const [d1, m1, y1] = a.split('.').map(Number);
        const [d2, m2, y2] = b.split('.').map(Number);
        return y2 - y1 || m2 - m1 || d2 - d1;
      });
      days.forEach(day => {
        result.push({ type: 'day', date: day, entries: groups[month][day] });
      });
    });
    return result;
  }, [filteredEntries]);

  // Плоский список для пагинации (без дубликатов)
  const flatEntries = useMemo(() => {
    const result = [];
    let lastMonth = null;
    
    groupedEntries.forEach(group => {
      const monthDate = parseDayKey(group.date);
      const monthLabel = monthDate && !isNaN(monthDate.getTime()) 
        ? monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) 
        : 'Неизвестный месяц';
      
      group.entries.forEach((entry, idx) => {
        const isFirstInDay = idx === 0;
        const dayObj = safeDate(entry.ts);
        const dayLabel = isFirstInDay && dayObj 
          ? dayObj.toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              day: 'numeric' 
            }) 
          : null;
        
        result.push({
          ...entry,
          _monthLabel: lastMonth !== monthLabel ? monthLabel : null,
          _dayLabel: dayLabel,
        });
        
        if (lastMonth !== monthLabel) {
          lastMonth = monthLabel;
        }
      });
    });
    
    return result;
  }, [groupedEntries]);

  const paginatedFlat = useMemo(() => {
    return flatEntries.slice((page - 1) * pageSize, page * pageSize);
  }, [flatEntries, page]);

  const totalEntries = filteredEntries.length;
  const totalPages = Math.ceil(totalEntries / pageSize);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const renderDetails = (entry) => {
    if (!entry.details) return null;
    try {
      const obj = typeof entry.details === 'string' ? JSON.parse(entry.details) : entry.details;
      if (typeof obj === 'object') {
        return (
          <div style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '2px' }}>
            {Object.entries(obj).map(([key, val]) => (
              <div key={key}><b>{key}:</b> {String(val)}</div>
            ))}
          </div>
        );
      }
      return <span className="mut sm">{String(entry.details)}</span>;
    } catch {
      return <span className="mut sm">{String(entry.details)}</span>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Дата', 'Время', 'Пользователь', 'Действие', 'Детали'];
    const rows = filteredEntries.map(e => {
      const d = safeDate(e.ts);
      const date = d ? fmtDMY(e.ts) : 'неизвестно';
      const time = d ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';
      const user = e.userId === 'system' ? 'Система' : empName(e.userId) || e.userId;
      const details = typeof e.details === 'string' ? e.details.replace(/"/g, '""') : '';
      return [date, time, user, e.action, `"${details}"`].join(';');
    });
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal_${filters.dateFrom || 'start'}_${filters.dateTo || 'end'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rep">
      <div className="rep-panel" style={{ padding: '16px' }}>
        <div className="rep-panel-title">Фильтры журнала</div>
        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <label className="lbl" style={{ margin: 0 }}>С даты:</label>
          <input
            className="inp"
            type="date"
            value={filters.dateFrom}
            onChange={e => handleFilterChange('dateFrom', e.target.value)}
            style={{ width: '150px' }}
          />
          <span>—</span>
          <input
            className="inp"
            type="date"
            value={filters.dateTo}
            onChange={e => handleFilterChange('dateTo', e.target.value)}
            style={{ width: '150px' }}
          />

          <label className="lbl" style={{ margin: 0 }}>Пользователь:</label>
          <select
            className="inp sel"
            value={filters.userId}
            onChange={e => handleFilterChange('userId', e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">Все</option>
            {userOptions.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <label className="lbl" style={{ margin: 0 }}>Действие:</label>
          <select
            className="inp sel"
            value={filters.action}
            onChange={e => handleFilterChange('action', e.target.value)}
            style={{ width: '200px' }}
          >
            {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>

          <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
            <Ic d={ICONS.search} size={15} />
            <input
              placeholder="Поиск по действию или деталям..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rep-panel" style={{ padding: '16px' }}>
        <div className="rep-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Всего записей: {filteredEntries.length}
            <span className="mut sm" style={{ marginLeft: '12px', fontWeight: 'normal' }}>
              (показано {paginatedFlat.length})
            </span>
          </span>
          <button className="btn primary sm" onClick={exportToCSV}>
            Выгрузить CSV
          </button>
        </div>
        
        <div style={{ marginTop: '12px' }}>
          {paginatedFlat.length === 0 ? (
            <div className="mut" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>📋</div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Записей не найдено</div>
              <div className="mut sm">Измените параметры фильтра или выберите другой период</div>
            </div>
          ) : (
            <table className="tbl" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '160px', color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Дата и время
                  </th>
                  <th style={{ width: '180px', color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Пользователь
                  </th>
                  <th style={{ color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Действие
                  </th>
                  <th style={{ color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Детали
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedFlat.map((entry, index) => {
                  const showMonth = entry._monthLabel !== null;
                  const showDay = entry._dayLabel !== null;
                  
                  return (
                    <React.Fragment key={entry.id}>
                      {showMonth && (
                        <tr>
                          <td colSpan="4" style={{ 
                            background: 'linear-gradient(90deg, #f8fafc, transparent)', 
                            padding: '12px 10px 8px',
                            borderTop: index === 0 ? 'none' : '2px solid var(--line)',
                          }}>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: 800, 
                              color: '#1e293b',
                              textTransform: 'capitalize',
                              letterSpacing: '0.3px',
                            }}>
                              {entry._monthLabel}
                            </div>
                          </td>
                        </tr>
                      )}
                      {showDay && (
                        <tr>
                          <td colSpan="4" style={{ 
                            padding: '8px 10px 6px',
                            borderTop: '1px dashed #e2e8f0',
                          }}>
                            <div style={{ 
                              fontSize: '11px', 
                              fontWeight: 700, 
                              color: 'var(--acc)',
                              textTransform: 'capitalize',
                              letterSpacing: '0.3px',
                            }}>
                              {entry._dayLabel}
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr style={{ 
                        background: showDay ? '#fafbff' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = showDay ? '#f0f7ff' : '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = showDay ? '#fafbff' : 'transparent'}
                      >
                        <td style={{ 
                          whiteSpace: 'nowrap', 
                          fontSize: '12px',
                          color: 'var(--mut)',
                          fontFamily: 'monospace',
                        }}>
                          {safeDate(entry.ts) ? fmtDT(entry.ts) : '—'}
                        </td>
                        <td>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}>
                            <div className="avatar xs" style={{ 
                              background: entry.userId === 'system' 
                                ? 'linear-gradient(135deg, #64748b, #475569)' 
                                : 'linear-gradient(135deg, #1e3a8a, #0ea5e9)',
                              width: '24px',
                              height: '24px',
                              fontSize: '9px',
                            }}>
                              {entry.userId === 'system' ? 'S' : (empName(entry.userId) || entry.userId).charAt(0).toUpperCase()}
                            </div>
                            {entry.userId === 'system' ? 'Система' : empName(entry.userId) || entry.userId}
                          </div>
                        </td>
                        <td>
                          <div style={{ 
                            fontWeight: 600, 
                            fontSize: '13px',
                            color: '#1e293b',
                          }}>
                            {entry.action}
                          </div>
                        </td>
                        <td style={{ maxWidth: '400px' }}>
                          {renderDetails(entry)}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '12px', 
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--line)',
          }}>
            <button
              className="btn ghost sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ 
                minWidth: '36px',
                height: '36px',
                padding: '0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ←
            </button>
            <span style={{ 
              fontSize: '13px', 
              color: 'var(--mut)',
              fontWeight: 500,
            }}>
              Страница <b style={{ color: 'var(--txt)' }}>{page}</b> из <b style={{ color: 'var(--txt)' }}>{totalPages}</b>
            </span>
            <button
              className="btn ghost sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ 
                minWidth: '36px',
                height: '36px',
                padding: '0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```
### `src/components/Kanban.jsx`
```javascript
import React, { useState } from 'react';
import { Ic, ICONS } from './Icons';

export default function Kanban({
  items,
  statusOrder,
  statusMap,
  renderCard,
  onDrop,
  onNew,
  searchQuery,
  onSearchChange,
  showOnlyMy,
  onToggleMy,
  extraFilters,
  emptyMessage = 'Нет элементов',
  columns, // новый пропс
}) {
  const [dragOverCol, setDragOverCol] = useState(null);

  // Определяем классы и стили
  const kanbanClasses = ['kanban'];
  const style = {};

  if (columns) {
    // Если задано явное количество колонок – устанавливаем CSS-переменную
    style['--columns'] = columns;
    // Не добавляем класс k5, так как переменная перекроет его
  } else {
    // Иначе – старое поведение: если статусов 5, добавляем класс k5
    if (statusOrder.length === 5) {
      kanbanClasses.push('k5');
    }
    // Если статусов не 5, то используем стандартный стиль (4 колонки)
    // Без переменной --columns будет использовано значение по умолчанию из CSS
  }

  return (
    <div>
      {/* Панель инструментов (без изменений) */}
      <div className="toolbar">
        {onSearchChange && (
          <div className="search-box">
            <Ic d={ICONS.search} size={15} />
            <input
              placeholder="Поиск…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {extraFilters}
        {onToggleMy && (
          <label className="dept-pick" style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={showOnlyMy}
              onChange={(e) => onToggleMy(e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>Только мои</span>
          </label>
        )}
        {onNew && (
          <button className="btn primary" onClick={onNew}>
            <Ic d={ICONS.plus} size={15} /> Создать
          </button>
        )}
      </div>

      <div className={kanbanClasses.join(' ')} style={style}>
        {statusOrder.map((st) => {
          const list = items.filter((item) => item.status === st);
          return (
            <div
              key={st}
              className={`kcol${dragOverCol === st ? ' over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(st);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                const id = e.dataTransfer.getData('text/plain');
                if (id) {
                  onDrop(id, st);
                }
              }}
            >
              <div className="kcol-head">
                <span className="kdot" style={{ background: statusMap[st].color }} />
                {statusMap[st].label}
                <span className="kcount">{list.length}</span>
              </div>
              <div className="kcol-body">
                {list.length === 0 ? (
                  <div className="kempty">{emptyMessage}</div>
                ) : (
                  list.map((item) => (
                    <div
                      key={item.id}
                      className="kcard"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                    >
                      {renderCard(item)}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```
### `src/components/LoginScreen.jsx`
```javascript
import React, { useState, useRef } from 'react';
import { DOMAIN } from '../utils/constants';
import { uid } from '../utils/date';
import { Ic, ICONS } from './Icons';

function passIssues(p) {
  return [
    { ok: p.length >= 8, t: "Минимум 8 символов" },
    { ok: /[A-ZА-ЯЁ]/.test(p), t: "Заглавная буква" },
    { ok: /[a-zа-яё]/.test(p), t: "Строчная буква" },
    { ok: /\d/.test(p), t: "Цифра" },
    { ok: /[^A-Za-zА-Яа-яЁё0-9]/.test(p), t: "Специальный символ" },
  ];
}

export default function LoginScreen({ db, setDb, onLogin, toast }) {
  const [mode, setMode] = useState("login");
  const [lg, setLg] = useState("");
  const [pw, setPw] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passTimer, setPassTimer] = useState(null);
  const passTimerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [shake, setShake] = useState(false);
  const [reg, setReg] = useState({ first: "", last: "", email: "", pass: "", pass2: "" });
  const [forgot, setForgot] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const passwordTimerRef = useRef(null);

  const [showRegPass, setShowRegPass] = useState(false);
  const regPassTimerRef = useRef(null);

  const fail = (m) => { setErr(m); setShake(true); setTimeout(() => setShake(false), 450); };
  const doLogin = (loginVal, passVal) => {
    setBusy(true);
    setErr(null);
    setTimeout(() => {
      const r = onLogin(loginVal, passVal);
      if (r) fail(r);
      setBusy(false);
    }, 30);
  };

  const togglePasswordVisibility = () => {
    if (showPassword) {
      setShowPassword(false);
      if (passwordTimerRef.current) {
        clearTimeout(passwordTimerRef.current);
        passwordTimerRef.current = null;
      }
    } else {
      setShowPassword(true);
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
      passwordTimerRef.current = setTimeout(() => {
        setShowPassword(false);
        passwordTimerRef.current = null;
      }, 10000);
    }
  };

  const toggleRegPassVisibility = () => {
    if (showRegPass) {
      setShowRegPass(false);
      if (regPassTimerRef.current) {
        clearTimeout(regPassTimerRef.current);
        regPassTimerRef.current = null;
      }
    } else {
      setShowRegPass(true);
      if (regPassTimerRef.current) clearTimeout(regPassTimerRef.current);
      regPassTimerRef.current = setTimeout(() => {
        setShowRegPass(false);
        regPassTimerRef.current = null;
      }, 10000);
    }
  };

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (mode === "login") { doLogin(lg, pw); return; }
      if (mode === "register") {
        if (!reg.first.trim() || !reg.last.trim() || !reg.email.trim()) return fail("Заполните все обязательные поля");
        if (db.employees.some((x) => x.email.toLowerCase() === reg.email.trim().toLowerCase()) || db.regRequests.some((x) => x.email.toLowerCase() === reg.email.trim().toLowerCase())) return fail("Такой e-mail уже зарегистрирован");
        if (passIssues(reg.pass).some((i) => !i.ok)) return fail("Пароль не соответствует требованиям безопасности");
        if (reg.pass !== reg.pass2) return fail("Пароли не совпадают");

        const newEmployee = {
          id: "e_" + uid(),
          last: reg.last.trim(),
          first: reg.first.trim(),
          email: reg.email.trim().toLowerCase(),
          pass: reg.pass,
          position: "Сотрудник",
          departments: [],
          roles: ["executor"],
          kbIds: [],
          headDeptIds: [],
          phone: "",
          extension: "",
          tab: String(1000 + Math.floor(Math.random() * 8999)),
          notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
          failed: 0,
          lockUntil: 0,
          fired: false,
          photo: null
        };
        setDb((s) => ({
          ...s,
          employees: [...s.employees, newEmployee],
          notifications: [
            { id: uid(), userId: "sergey.adminov", text: `Новая регистрация: ${newEmployee.last} ${newEmployee.first}`, ts: Date.now(), read: false, targetType: null, targetId: null },
            ...s.notifications
          ]
        }));
        toast("Регистрация успешна! Выполняется вход...");
        const loginOk = onLogin(reg.email.trim().toLowerCase(), reg.pass);
        if (!loginOk) {
          fail("Ошибка автоматического входа после регистрации.");
        }
        setReg({ first: "", last: "", email: "", pass: "", pass2: "" });
        setMode("login");
        return;
      }
      if (mode === "forgot") {
        if (!forgot.trim()) return fail("Укажите e-mail");
        toast("Ссылка для восстановления пароля отправлена на " + forgot.trim() + "@" + DOMAIN + " (действует 1 час). Заглушка.");
        setMode("login");
      }
    } catch (ex) {
      fail("Внутренняя ошибка: " + (ex && ex.message ? ex.message : ex));
    }
  };
  const issues = passIssues(reg.pass);

  const demos = [
    { l: "sergey.adminov", p: "Admin2026!", t: "Суперадминистратор" },
    { l: "aleksey.gendirov", p: "Director2026!", t: "Генеральный директор" },
    { l: "erik.ekonomistov", p: "Econ2026!", t: "Главный экономист" },
    { l: "ivan.konstruktorov", p: "KbLa2026!", t: "Гл. конструктор КБ «ЛА»" },
    { l: "olga.personalova", p: "Hr2026!", t: "HR-менеджер" },
    { l: "mikhail.otdelov", p: "Head2026!", t: "Руководитель отделов" },
    { l: "nikolay.managerov", p: "Pm2026!", t: "Менеджер проектов" },
    { l: "kirill.proektov", p: "Pm2026!", t: "Ответственный по проекту" },
    { l: "isaev", p: "Exec2026!", t: "Исполнитель" }
  ];

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="logo lg"><div className="logo-mark">АП</div><div><div className="logo-name">АвиаГоризонт</div><div className="logo-sub">планирование и учёт времени</div></div></div>
        <h2>Единая среда планирования КБ</h2>
        <p>Канбан, диаграмма Ганта и календарь. Производственные проекты двух типов, административные проекты, задачи с подзадачами бесконечной вложенности, отпуска с делегированием, HR-администрирование и журнал аудита.</p>
        <ul className="hero-list">
          <li>9 ролей, включая HR-менеджера; временное делегирование полномочий</li>
          <li>Архив закрытых задач и проектов при попадании в завершенные или отмененные</li>
          <li>Комментарии с ветками ответов и @упоминаниями участников в задачах и проектах</li>
        </ul>
        <div className="hero-stack">React · Vite · Node.js · PostgreSQL · Ubuntu LTS · ООП/KISS/DRY</div>
      </div>
      <div className="login-panel">
        <form className={"login-card" + (shake ? " shake" : "")} onSubmit={submit}>
          {mode !== "register" && (
            <>
              <h3>{mode === "forgot" ? "Восстановление пароля" : "Вход в систему"}</h3>
              <div className="login-sub">{mode === "forgot" ? "Ссылка будет отправлена на зарегистрированный e-mail" : "Логин — e-mail без домена " + "@" + DOMAIN}</div>
              {mode === "forgot" ? (
                <>
                  <label className="lbl">E-mail</label>
                  <div className="email-inp"><input className="inp" value={forgot} onChange={(e) => { setForgot(e.target.value); setErr(null); }} placeholder="ivanov" autoFocus /><span className="email-dom">{"@" + DOMAIN}</span></div>
                </>
              ) : (
                <>
                  <label className="lbl">Логин (e-mail)</label>
                  <div className="email-inp"><input className="inp" value={lg} onChange={(e) => { setLg(e.target.value); setErr(null); }} placeholder="ivanov" autoFocus /><span className="email-dom">{"@" + DOMAIN}</span></div>
                  <label className="lbl">Пароль</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="inp"
                      type={showPassword ? "text" : "password"}
                      value={pw}
                      onChange={(e) => { setPw(e.target.value); setErr(null); }}
                      placeholder="с учётом регистра"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="pass-toggle-btn"
                    >
                      <Ic d={ICONS.eye} size={18} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {mode === "register" && (
            <>
              <h3>Регистрация сотрудника</h3>
              <div className="login-sub">После регистрации вы автоматически войдёте с ролью «Исполнитель». Суперадминистратор получит уведомление.</div>
              <div className="reg-row">
                <div><label className="lbl">Имя *</label><input className="inp" value={reg.first} onChange={(e) => setReg({ ...reg, first: e.target.value })} /></div>
                <div><label className="lbl">Фамилия *</label><input className="inp" value={reg.last} onChange={(e) => setReg({ ...reg, last: e.target.value })} /></div>
              </div>
              <label className="lbl">E-mail *</label>
              <div className="email-inp"><input className="inp" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} placeholder="ivanov" /><span className="email-dom">{"@" + DOMAIN}</span></div>
              <label className="lbl">Пароль *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="inp"
                  type={showRegPass ? "text" : "password"}
                  value={reg.pass}
                  onChange={(e) => setReg({ ...reg, pass: e.target.value })}
                />
                <button
                  type="button"
                  onClick={toggleRegPassVisibility}
                  className="pass-toggle-btn"
                >
                  <Ic d={ICONS.eye} size={18} />
                </button>
              </div>
              <div className="pass-checks">{issues.map((i) => <span key={i.t} className={i.ok ? "ok" : ""}>✓ {i.t}</span>)}</div>
              <label className="lbl">Подтверждение пароля *</label>
              <input className="inp" type="password" value={reg.pass2} onChange={(e) => setReg({ ...reg, pass2: e.target.value })} />
            </>
          )}

          {err && <div className="login-err">{err}</div>}
          <button className="btn primary big" type="submit" disabled={busy}>{busy ? "Выполняется вход…" : mode === "login" ? "Войти" : mode === "register" ? "Зарегистрироваться" : "Отправить ссылку"}</button>

          {mode === "login" && (
            <>
              <div className="login-links">
                <button type="button" className="link" onClick={() => { setMode("forgot"); setErr(null); }}>Забыли пароль?</button>
                <button type="button" className="link" onClick={() => { setMode("register"); setErr(null); }}>Регистрация</button>
              </div>
              <div className="cookie-note">Сессия хранится в cookie 30 дней (HttpOnly, Secure, SameSite=Lax — на стороне сервера).</div>
              <div className="demo-title">Демо-доступы — клик сразу выполняет вход</div>
              <div className="demo-grid">
                {demos.map((d) => (
                  <button type="button" key={d.l} className="demo-chip" onClick={() => { setLg(d.l); setPw(d.p); setErr(null); doLogin(d.l, d.p); }}>
                    <span className="demo-login">{d.l}</span><span className="demo-role">{d.t}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode !== "login" && <div className="login-links"><button type="button" className="link" onClick={() => { setMode("login"); setErr(null); }}>← Назад ко входу</button></div>}
        </form>
      </div>
    </div>
  );
}
```
### `src/components/MainLayout.jsx`
```javascript
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth, useStore } from '../hooks';
import { hasRole, canExport, computeScope } from '../utils/permissions';
import { ICONS, Ic } from './Icons';
import { initials } from '../utils/date';
import NotifPanel from './NotifPanel';
import { useModals } from '../hooks/useModals';
import ModalRenderer from './ModalRenderer';
import * as Views from './views';
import Calendar from './Calendar';
import Gantt from './Gantt';

export default function MainLayout({ store, data, user }) {
  const { logout } = useStore();
  const [view, setView] = useState('kanban');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const {
    modal,
    openTask,
    openProject,
    openHoursReq,
    openRoles,
    openDepts,
    openVacation,
    openDelegation,
    openVacNow,
    closeModal,
  } = useModals({ store, data, user });

  const scope = useMemo(() => computeScope(user, data), [user, data]);

  const navItems = [
    { id: 'kanban', label: 'Задачи', icon: ICONS.tasks },
    { id: 'gantt', label: 'Диаграмма Ганта', icon: ICONS.gantt },
    { id: 'calendar', label: 'Календарь', icon: ICONS.cal },
    { id: 'projects', label: 'Проекты', icon: ICONS.folder },
    { id: 'staff', label: 'Персонал', icon: ICONS.users },
    ...(canExport(user) || hasRole(user, 'kb_chief', 'head', 'project_lead', 'hr')
      ? [{ id: 'reports', label: 'Отчёты', icon: ICONS.chart }]
      : []),
    { id: 'archive', label: 'Архив', icon: ICONS.archive },
    { id: 'requests', label: 'Запросы и заявки', icon: ICONS.inbox },
    ...(hasRole(user, 'admin', 'director') ? [{ id: 'journal', label: 'Журнал аудита', icon: ICONS.book }] : []),
  ];

  const myNotifs = data.notifications.filter((n) => n.userId === user.id);
  const unread = myNotifs.filter((n) => !n.read).length;

  const handleNotificationNavigate = (notification) => {
    const { targetType, targetId } = notification;
    if (!targetType || !targetId) return;
    store.markNotificationRead(notification.id);
    switch (targetType) {
      case 'task':
        openTask(targetId, 'chat');
        break;
      case 'project':
        openProject(targetId);
        break;
      case 'hours':
        setView('requests');
        break;
      case 'vacation':
        openVacation(targetId);
        break;
      case 'delegation':
        setView('requests');
        break;
      case 'registration':
        setView('requests');
        break;
      default:
        break;
    }
    setNotifOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape' && notifOpen) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [notifOpen]);

  const renderView = () => {
    const commonProps = { db: data, ur: user, openTask, openProject, store };
    switch (view) {
      case 'kanban':
        return <Views.KanbanView {...commonProps} />;
      case 'gantt':
        return <Gantt {...commonProps} />;
      case 'calendar':
        return <Calendar {...commonProps} />;
      case 'projects':
        return <Views.ProjectsView {...commonProps} openHoursReq={openHoursReq} />;
      case 'cabinet':
        return (
          <Views.CabinetView
            store={store}
            data={data}
            user={user}
            openTask={openTask}
            openVacation={openVacation}
            openDelegation={openDelegation}
          />
        );
      case 'staff':
        return (
          <Views.StaffView
            db={data}
            ur={user}
            setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
            openRoles={openRoles}
            openDepts={openDepts}
            openVacation={openVacation}
          />
        );
      case 'reports':
        return <Views.ReportsView db={data} ur={user} />;
      case 'archive':
        return (
          <Views.ArchiveView
            db={data}
            ur={user}
            openTask={openTask}
            openProject={openProject}
            setArchiveMonths={(m) => { store._data.settings.archiveMonths = m; store._notify(); }}
            store={store}
          />
        );
      case 'requests':
        return (
          <Views.RequestsView
            db={data}
            setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
            ur={user}
            addAudit={store.addAudit.bind(store)}
            notify={store.addNotification.bind(store)}
          />
        );
      case 'journal':
        return <Views.JournalView db={data} ur={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">АП</div>
          <div>
            <div className="logo-name">АвиаГоризонт</div>
            <div className="logo-sub">планирование и учёт времени</div>
          </div>
        </div>
        <div
          className="user-card"
          onClick={() => setView('cabinet')}
          style={{ cursor: 'pointer', marginBottom: '16px' }}
        >
          <div className="avatar">
            {user.photo ? (
              <img
                src={user.photo}
                alt="Аватар"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              initials(user.first, user.last)
            )}
          </div>
          <div className="user-meta">
            <div className="user-name">{user.last} {user.first}</div>
            <div className="user-roles">{user.roles.join(' · ')}</div>
          </div>
          <button
            className="icon-btn dark"
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            title="Выйти"
          >
            <Ic d={ICONS.out} size={16} />
          </button>
        </div>
        <nav className="nav">
          {navItems.map((n) => (
            <button
              key={n.id}
              className={`nav-item${view === n.id ? ' on' : ''}`}
              onClick={() => setView(n.id)}
            >
              <Ic d={n.icon} /> <span className="nav-lbl">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="env-badge">
            <Ic d={ICONS.shield} size={14} /> Демо · заглушка Java/PostgreSQL
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">
              {navItems.find((n) => n.id === view)?.label || 'Личный кабинет'}
            </h1>
            <div className="page-sub">
              Вторник, 4 августа 2026 · вы вошли как {user.last} {user.first}
            </div>
          </div>
          <div className="top-tools">
            <button className="btn ghost" onClick={openVacNow}>
              <Ic d={ICONS.beach} size={15} /> Сотрудники в отпусках
            </button>
            <div className="bell-wrap" ref={notifRef}>
              <button
                className={`icon-btn bell${unread ? ' has' : ''}`}
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Ic d={ICONS.bell} size={17} />
                {unread > 0 && <span className="bell-count">{unread}</span>}
              </button>
              {notifOpen && (
                <NotifPanel
                  list={myNotifs}
                  setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
                  onNavigate={handleNotificationNavigate}
                  onClose={() => setNotifOpen(false)}
                />
              )}
            </div>
          </div>
        </header>

        <div className="content">{renderView()}</div>
      </main>

      {modal && (
        <ModalRenderer
          modal={modal}
          onClose={closeModal}
          db={data}
          ur={user}
          store={store}
          openTask={openTask}
          openProject={openProject}
          openHoursReq={openHoursReq}
          openRoles={openRoles}
          openDepts={openDepts}
          openVacation={openVacation}
          openDelegation={openDelegation}
        />
      )}
    </div>
  );
}
```
### `src/components/Modal.jsx`
```javascript
import React, { useEffect } from 'react';
import { Ic, ICONS } from './Icons';

export const Modal = ({ title, onClose, children, width = 640 }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: width }}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}><Ic d={ICONS.x} size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};
```
### `src/components/ModalRenderer.jsx`
```javascript
// src/components/ModalRenderer.jsx
import React from 'react';
import {
  TaskModal,
  ProjectModal,
  HoursRequestModal,
  RolesModal,
  DeptsModal,
  VacationModal,
  DelegationModal,
  VacNowModal,
} from './Modals';
import { TASK_STATUSES, PROJECT_STATUSES, ROLES } from '../utils/constants';
import { fmtDMY } from '../utils/date';
import { hasRole } from '../utils/permissions';
import { useDataHelpers } from '../hooks';

export default function ModalRenderer({
  modal,
  onClose,
  db,
  ur,
  store,
  openTask,
  openProject,
  openHoursReq,
  openRoles,
  openDepts,
  openVacation,
  openDelegation,
}) {
  const { empName } = useDataHelpers(db);

  if (!modal) return null;

  switch (modal.type) {
    case 'task':
      return (
        <TaskModal
          db={db}
          ur={ur}
          taskId={modal.taskId}
          initialTab={modal.initialTab || 'form'}
          parentTaskId={modal.parentTaskId}
          initialProjectId={modal.initialProjectId} // <--- ДОБАВЛЕНО
          onClose={onClose}
          onSave={(task, isNew) => {
            const old = db.tasks.find(x => x.id === task.id);
            if (old && hasRole(ur, 'admin')) {
              const changes = {};
              if (old.plannedHours !== task.plannedHours) changes.plannedHours = `${old.plannedHours ?? '—'} → ${task.plannedHours ?? '—'}`;
              if (old.status !== task.status) changes.status = `${TASK_STATUSES[old.status].label} → ${TASK_STATUSES[task.status].label}`;
              if (JSON.stringify(old.assigneeIds || []) !== JSON.stringify(task.assigneeIds || []))
                changes.assignees = `${(old.assigneeIds || []).map(id => empName(id)).join(', ')} → ${(task.assigneeIds || []).map(id => empName(id)).join(', ')}`;
              if (old.deadline !== task.deadline) changes.deadline = `${old.deadline ? fmtDMY(old.deadline) : '—'} → ${task.deadline ? fmtDMY(task.deadline) : '—'}`;
              if (Object.keys(changes).length) {
                store.addAudit('Административное изменение задачи (прямое)', changes, 'task', task.id);
              }
            }
            store.upsertTask(task);
            if (isNew) {
              (task.assigneeIds || []).forEach(id => {
                if (id !== ur.id) {
                  store.addNotification(id, `Вам назначена задача "${task.title}" (проект ${db.projects.find(p => p.id === task.projectId)?.code || '—'}).`, { targetType: 'task', targetId: task.id });
                }
              });
            }
            onClose();
          }}
          onDelete={(id) => {
            const task = db.tasks.find(t => t.id === id);
            store.deleteTask(id);
            store.addAudit('Удаление задачи', { title: task?.title }, 'task', id);
            onClose();
          }}
          onHoursReq={openHoursReq}
          patchTask={store.upsertTask.bind(store)}
          notify={(userId, text, target) => store.addNotification(userId, text, target)}
          store={store}
          spent={(task) => task.logs.reduce((s, l) => s + l.hours, 0)}
          planSum={(projectId) => db.tasks.filter(t => t.projectId === projectId).reduce((s, t) => s + (t.plannedHours || 0), 0)}
          openTask={openTask}
        />
      );

    case 'project':
      return (
        <ProjectModal
          db={db}
          ur={ur}
          projectId={modal.projectId}
          onClose={onClose}
          onSave={(p, isNew) => {
            const old = db.projects.find(x => x.id === p.id);
            if (old && hasRole(ur, 'admin')) {
              const changes = {};
              if (old.budget !== p.budget) changes.budget = `${old.budget ?? '—'} → ${p.budget ?? '—'}`;
              if (old.name !== p.name) changes.name = `${old.name} → ${p.name}`;
              if (old.managerId !== p.managerId) changes.manager = `${empName(old.managerId)} → ${empName(p.managerId)}`;
              if (old.status !== p.status) changes.status = `${PROJECT_STATUSES[old.status]} → ${PROJECT_STATUSES[p.status]}`;
              if (Object.keys(changes).length) {
                store.addAudit('Административное изменение проекта (прямое)', changes, 'project', p.id);
              }
            }
            store.upsertProject(p);
            store.addAudit(isNew ? 'Создание проекта' : 'Изменение проекта', { name: p.name, code: p.code, budget: p.budget }, 'project', p.id);
            onClose();
          }}
          onDelete={(p) => {
            store.deleteProject(p.id);
            store.addAudit('Удаление проекта', { name: p.name }, 'project', p.id);
            onClose();
          }}
          store={store}
          openTask={openTask}
        />
      );

    case 'hours':
      return (
        <HoursRequestModal
          db={db}
          ur={ur}
          kind={modal.kind}
          targetId={modal.targetId}
          onClose={onClose}
          onSubmit={(r) => {
            store.addHoursRequest(r);
            const target = modal.kind === 'task' ? db.tasks.find(t => t.id === modal.targetId) : db.projects.find(p => p.id === modal.targetId);
            const targetTitle = target ? (modal.kind === 'task' ? target.title : target.name) : '';
            
            const directors = db.employees.filter(e => e.roles.includes('director') && !e.fired);
            directors.forEach(d => {
              store.addNotification(
                d.id,
                `Запрос на изменение часов по ${modal.kind === 'task' ? 'задаче' : 'проекту'} "${targetTitle}" от ${ur.last} ${ur.first}. Обоснование: ${r.reason}.`,
                { targetType: 'hours', targetId: r.id }
              );
            });
            
            store.addNotification(
              ur.id,
              `Ваш запрос на изменение часов по ${modal.kind === 'task' ? 'задаче' : 'проекту'} "${targetTitle}" отправлен на рассмотрение ГД.`,
              { targetType: 'hours', targetId: r.id }
            );
            
            store.addAudit('Запрос изменения часов', { target: targetTitle, oldH: r.oldH, newH: r.newH, reason: r.reason }, 'hoursRequest', r.id);
            onClose();
          }}
        />
      );

    case 'roles':
      return (
        <RolesModal
          db={db}
          setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
          empId={modal.empId}
          onClose={onClose}
          audit={store.addAudit.bind(store)}
        />
      );

    case 'depts':
      return (
        <DeptsModal
          db={db}
          setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
          empId={modal.empId}
          onClose={onClose}
          audit={store.addAudit.bind(store)}
        />
      );

    case 'vacation':
      return (
        <VacationModal
          db={db}
          ur={ur}
          vacationId={modal.vacationId}
          forEmpId={modal.forEmpId || null}
          onClose={onClose}
          onSave={(v, isNew) => {
            store.upsertVacation(v);
            store.addAudit(isNew ? 'Создание отпуска' : 'Изменение отпуска', { employee: empName(v.empId), period: `${fmtDMY(v.start)}—${fmtDMY(v.end)}` }, 'vacation', v.id);
            onClose();
          }}
        />
      );

    case 'delegation':
      return (
        <DelegationModal
          db={db}
          ur={ur}
          onClose={onClose}
          onSubmit={(rd) => {
            store.upsertRoleDelegation(rd);
            store.addNotification(rd.toId, `Вам предложено временное принятие ролей: ${rd.roles.map(r => ROLES[r].label).join(', ')}.`, { targetType: 'delegation', targetId: rd.id });
            store.addAudit('Создание делегирования ролей', { from: empName(rd.fromId), to: empName(rd.toId), roles: rd.roles.join(', ') }, 'delegation', rd.id);
            onClose();
          }}
        />
      );

    case 'vacnow':
      return (
        <VacNowModal
          db={db}
          onClose={onClose}
        />
      );

    default:
      return null;
  }
}
```
### `src/components/NotifPanel.jsx`
```javascript
import React from 'react';
import { fmtDT } from '../utils/date';
import { Ic } from './Icons';

export default function NotifPanel({ list, setDb, onNavigate, onClose }) {
  const markAllRead = () => {
    setDb((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    if (onClose) onClose();
  };

  const handleClick = (item) => {
    if (onNavigate) onNavigate(item);
    if (onClose) onClose();
  };

  return (
    <div className="notif-pop">
      <div className="notif-head">
        <span>Уведомления</span>
        <button className="link" onClick={markAllRead}>прочитать все</button>
      </div>
      <div className="notif-list">
        {list.slice(0, 12).map(n => (
          <div 
            key={n.id} 
            className={`notif-item${n.read ? '' : ' new'}`} 
            onClick={() => handleClick(n)}
          >
            <div>{n.text}</div>
            <div className="mut sm">{fmtDT(n.ts)}</div>
          </div>
        ))}
        {list.length === 0 && <div className="mut sm notif-empty">Нет уведомлений</div>}
      </div>
      <p className="mut sm notif-note">E-mail-дубли отправляются по настройкам профиля.</p>
    </div>
  );
}
```
### `src/components/ProjectProgress.jsx`
```javascript
// components/ProjectProgress.jsx
import React from 'react';
import { getProjectColor } from '../utils/projectHelpers';

export default function ProjectProgress({ project, plan, fact }) {
  const budget = project?.budget;
  if (budget == null) return null; // для админ-проектов без бюджета ничего не показываем

  const usePct = Math.round((fact / Math.max(1, budget)) * 100);
  const overPlan = plan > budget;
  const color = getProjectColor(project);

  return (
    <div className="pj-budget">
      <div className="pj-budget-row">
        <span>Бюджет: <b>{budget} ч</b></span>
        <span>План: <b className={overPlan ? 'red' : ''}>{plan} ч</b></span>
        <span>Факт: <b>{fact} ч</b></span>
        <span>Использовано: <b>{usePct}%</b></span>
      </div>
      <div className="pj-progress">
        <div
          className={`pj-progress-fill${usePct > 100 ? ' over' : ''}`}
          style={{ width: Math.min(100, usePct) + '%', background: color }}
        />
      </div>
    </div>
  );
}
```
### `src/components/Projects.jsx`
```javascript
import React from 'react';
import { PROJECT_STATUSES, PROJECT_TYPES, PROJECT_PRIORITIES } from '../utils/constants';
import { fmtDMY, initials, isTaskActive } from '../utils/date';
import { Ic, ICONS } from './Icons';
import { hasRole } from '../utils/permissions';
import { getProjectColor } from '../utils/projectHelpers';
import ProjectProgress from './ProjectProgress';

export default function Projects({ db, ur, openProject, openHoursReq, closeProject, cancelProject, projects }) {
  const canCloseProject = (project) => {
    const creatorId = project.creatorId || (project.history?.find(h => h.who !== 'system')?.who);
    return hasRole(ur, 'admin') || hasRole(ur, 'director') || (creatorId && creatorId === ur.id);
  };

  return (
    <div>
      <div className="pj-grid">
        {projects.map(p => {
          const tasks = db.tasks.filter(t => t.projectId === p.id && isTaskActive(t));
          const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
          const fact = tasks.reduce((s, t) => s + t.logs.reduce((lsum, l) => lsum + l.hours, 0), 0);
          const usePct = p.budget ? Math.round((fact / Math.max(1, p.budget)) * 100) : 0;
          const overPlan = p.budget != null && plan > p.budget;
          const projectColor = getProjectColor(p);

          return (
            <div 
              key={p.id} 
              className="pj-card" 
              onClick={() => openProject(p.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="pj-top">
                <span className="pj-code" style={{ background: projectColor + '22', color: projectColor }}>
                  {p.code}
                </span>
                <span className={`pj-st ${p.status}`}>{PROJECT_STATUSES[p.status]}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{PROJECT_TYPES[p.ptype || 'prod']}</span>
                <span className="pj-priority" style={{ color: PROJECT_PRIORITIES[p.priority]?.color || '#64748b', fontWeight: 600 }}>
                  {p.priority || 'NORM'}
                </span>
              </div>
              <div className="pj-name">{p.name}</div>
              <div className="pj-row">
                <span className="mut">Сроки:</span> {fmtDMY(p.start)} — {p.end ? fmtDMY(p.end) : 'не задан'}
              </div>
              <ProjectProgress project={p} plan={plan} fact={fact} />
              <div className="pj-foot">
                <div className="pj-avatars">
                  {tasks.slice(0, 6).map(t => {
                    const a = t.assigneeId ? db.employees.find(e => e.id === t.assigneeId) : null;
                    return a && (
                      <span
                        key={t.id}
                        className="avatar xs"
                        title={`${a.last} ${a.first}`}
                      >
                        {initials(a.first, a.last)}
                      </span>
                    );
                  })}
                </div>
                <div className="pj-actions" onClick={(e) => e.stopPropagation()}>
                  {((hasRole(ur, 'project_lead') && p.managerId === ur.id) || hasRole(ur, 'admin', 'director', 'economist', 'kb_chief')) && p.status === 'active' && p.ptype !== 'admin' && (
                    <button className="btn ghost sm" onClick={() => openHoursReq('project', p.id)}>
                      <Ic d={ICONS.clock} size={13} /> Запросить изменение часов
                    </button>
                  )}
                  {hasRole(ur, 'admin', 'director', 'economist', 'kb_chief') && (
                    <button className="icon-btn" title="Редактировать" onClick={() => openProject(p.id)}>
                      <Ic d={ICONS.edit} size={15} />
                    </button>
                  )}
                  {canCloseProject(p) && p.status !== 'closed' && p.status !== 'cancelled' && (
                    <button className="icon-btn danger" title="Закрыть/Отменить проект" onClick={() => {
                      const action = window.confirm(`Закрыть проект "${p.name}"? Все задачи проекта будут переведены в статус "Закрыта".`) 
                        ? 'close' 
                        : (window.confirm(`Отменить проект "${p.name}"? Все задачи проекта будут переведены в статус "Отменена".`) ? 'cancel' : null);
                      if (action === 'close') closeProject(p);
                      else if (action === 'cancel') cancelProject(p);
                    }}>
                      <Ic d={ICONS.x} size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```
### `src/components/Reports.jsx`
```javascript
import React, { useState, useMemo, useEffect } from 'react';
import { TASK_STATUSES, PRIORITIES, PROJECT_STATUSES } from '../utils/constants';
import { TODAY, fmtDMY, fmtDT } from '../utils/date';
import { hasRole, computeScope, taskVisible } from '../utils/permissions';
import { useToast } from '../context/ToastContext';
import { Ic, ICONS } from './Icons';
import { useDataHelpers } from '../hooks';
import { getPrimaryDeptName } from '../utils/helpers';

const REPORT_TYPES = [
  { value: 'tasks', label: 'Задачи' },
  { value: 'projects', label: 'Проекты' },
  { value: 'employees', label: 'Сотрудники' },
  { value: 'worklog', label: 'Трудозатраты' },
];

export default function Reports({ db, ur }) {
  const { showToast } = useToast();
  const { empName, getTaskSpent, getProjectStats } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  const safeDb = useMemo(() => {
    if (!db) return { projects: [], tasks: [], employees: [], departments: [], kbs: [], vacations: [] };
    return db;
  }, [db]);

  const [filters, setFilters] = useState({
    type: 'tasks',
    dateFrom: '',
    dateTo: '',
    deadlineFrom: '',
    deadlineTo: '',
    projectId: 'all',
    assigneeId: 'all',
    status: 'all',
    priority: 'all',
    customer: '',
  });

  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const data = localStorage.getItem('savedReportFilters');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [filterName, setFilterName] = useState('');
  const [results, setResults] = useState([]);

  const allProjects = (safeDb.projects || []);
  const visibleProjects = useMemo(() => {
    if (scope.all) return allProjects;
    return allProjects.filter(p => scope.projIds.has(p.id));
  }, [allProjects, scope]);

  const allEmployees = (safeDb.employees || []);
  const visibleEmployees = useMemo(() => {
    if (scope.all) return allEmployees;
    return allEmployees.filter(e => scope.empIds.has(e.id));
  }, [allEmployees, scope]);

  const applyFilters = () => {
    const type = filters.type;
    const tasksList = safeDb.tasks || [];
    const projectsList = safeDb.projects || [];
    const employeesList = safeDb.employees || [];

    if (type === 'tasks') {
      let tasks = tasksList;
      if (filters.dateFrom || filters.dateTo) {
        tasks = tasks.filter(t => {
          if (!t.createdAt) return false;
          if (filters.dateFrom && t.createdAt < filters.dateFrom) return false;
          if (filters.dateTo && t.createdAt > filters.dateTo) return false;
          return true;
        });
      }
      if (filters.deadlineFrom || filters.deadlineTo) {
        tasks = tasks.filter(t => {
          if (!t.deadline) return false;
          if (filters.deadlineFrom && t.deadline < filters.deadlineFrom) return false;
          if (filters.deadlineTo && t.deadline > filters.deadlineTo) return false;
          return true;
        });
      }
      if (filters.projectId !== 'all') tasks = tasks.filter(t => t.projectId === filters.projectId);
      if (filters.assigneeId !== 'all') tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
      if (filters.status !== 'all') tasks = tasks.filter(t => t.status === filters.status);
      if (filters.priority !== 'all') tasks = tasks.filter(t => t.priority === filters.priority);
      if (filters.customer) {
        tasks = tasks.filter(t => {
          const project = projectsList.find(p => p.id === t.projectId);
          return project && project.customer?.toLowerCase().includes(filters.customer.toLowerCase());
        });
      }
      tasks = tasks.filter(t => taskVisible(ur, scope, t, safeDb));
      setResults(tasks);
    } else if (type === 'projects') {
      let projects = projectsList;
      if (filters.dateFrom) projects = projects.filter(p => p.start >= filters.dateFrom);
      if (filters.dateTo) projects = projects.filter(p => p.start <= filters.dateTo);
      if (filters.deadlineFrom) projects = projects.filter(p => p.end && p.end >= filters.deadlineFrom);
      if (filters.deadlineTo) projects = projects.filter(p => p.end && p.end <= filters.deadlineTo);
      if (filters.projectId !== 'all') projects = projects.filter(p => p.id === filters.projectId);
      if (filters.customer) projects = projects.filter(p => p.customer?.toLowerCase().includes(filters.customer.toLowerCase()));
      if (!scope.all) projects = projects.filter(p => scope.projIds.has(p.id));
      setResults(projects);
    } else if (type === 'employees') {
      let employees = employeesList;
      if (filters.projectId !== 'all') {
        const taskIds = tasksList.filter(t => t.projectId === filters.projectId).map(t => t.id);
        employees = employees.filter(e =>
          tasksList.some(t => t.assigneeId === e.id && taskIds.includes(t.id))
        );
      }
      if (filters.assigneeId !== 'all') employees = employees.filter(e => e.id === filters.assigneeId);
      if (filters.customer) {
        employees = employees.filter(e => {
          const userTasks = tasksList.filter(t => t.assigneeId === e.id);
          if (userTasks.length === 0) return false;
          return userTasks.some(t => {
            const project = projectsList.find(p => p.id === t.projectId);
            return project && project.customer?.toLowerCase().includes(filters.customer.toLowerCase());
          });
        });
      }
      setResults(employees);
    } else if (type === 'worklog') {
      let logs = [];
      tasksList.forEach(t => {
        (t.logs || []).forEach(l => {
          logs.push({
            ...l,
            taskTitle: t.title,
            projectId: t.projectId,
            assigneeId: t.assigneeId,
          });
        });
      });
      if (filters.dateFrom) logs = logs.filter(l => l.date >= filters.dateFrom);
      if (filters.dateTo) logs = logs.filter(l => l.date <= filters.dateTo);
      if (filters.projectId !== 'all') logs = logs.filter(l => l.projectId === filters.projectId);
      if (filters.assigneeId !== 'all') logs = logs.filter(l => l.userId === filters.assigneeId);
      if (filters.customer) {
        logs = logs.filter(l => {
          const project = projectsList.find(p => p.id === l.projectId);
          return project && project.customer?.toLowerCase().includes(filters.customer.toLowerCase());
        });
      }
      if (!scope.all) {
        const visibleTaskIds = tasksList
          .filter(t => taskVisible(ur, scope, t, safeDb))
          .map(t => t.id);
        logs = logs.filter(l => {
          const task = tasksList.find(t => t.id === l.taskId);
          return task && visibleTaskIds.includes(task.id);
        });
      }
      setResults(logs);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filters, safeDb, ur, scope]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      type: filters.type,
      dateFrom: '',
      dateTo: '',
      deadlineFrom: '',
      deadlineTo: '',
      projectId: 'all',
      assigneeId: 'all',
      status: 'all',
      priority: 'all',
      customer: '',
    });
  };

  const saveFilter = () => {
    if (!filterName.trim()) {
      showToast('Введите название фильтра', 'warning');
      return;
    }
    const newFilter = {
      id: Date.now(),
      name: filterName.trim(),
      filters: { ...filters },
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('savedReportFilters', JSON.stringify(updated));
    setFilterName('');
    showToast('Фильтр сохранён', 'success');
  };

  const loadFilter = (filter) => {
    setFilters(filter.filters);
    setFilterName(filter.name);
  };

  const deleteFilter = (id) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('savedReportFilters', JSON.stringify(updated));
  };

  const downloadXLSX = () => {
    if (results.length === 0) {
      showToast('Нет данных для выгрузки', 'warning');
      return;
    }
    showToast('Выгрузка XLSX пока не реализована', 'info');
  };

  const renderResults = () => {
    const type = filters.type;
    if (results.length === 0) {
      return <div className="empty-note" style={{ padding: '20px 0' }}>Нет данных, соответствующих фильтрам</div>;
    }

    if (type === 'tasks') {
      return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: '800px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Задача</th>
                <th>Проект</th>
                <th>Исполнитель</th>
                <th>Статус</th>
                <th>Приоритет</th>
                <th>План (ч)</th>
                <th>Факт (ч)</th>
                <th>Срок исполнения</th>
              </tr>
            </thead>
            <tbody>
              {results.map((t, idx) => {
                const project = (safeDb.projects || []).find(p => p.id === t.projectId);
                const statusDef = TASK_STATUSES[t.status] || { label: t.status || 'Неизвестно', color: '#64748b' };
                const priorityDef = PRIORITIES[t.priority] || { label: t.priority || 'Неизвестно', color: '#64748b' };
                return (
                  <tr key={t.id}>
                    <td>{idx + 1}</td>
                    <td><b>{t.title}</b></td>
                    <td>{project?.code || '—'}</td>
                    <td>{t.assigneeId ? empName(t.assigneeId) : '—'}</td>
                    <td><span className="st-chip" style={{ background: statusDef.color + '22', color: statusDef.color }}>{statusDef.label}</span></td>
                    <td><span style={{ color: priorityDef.color }}>{priorityDef.label}</span></td>
                    <td>{t.plannedHours ?? '—'}</td>
                    <td>{getTaskSpent(t)}</td>
                    <td>{t.deadline ? fmtDMY(t.deadline) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } else if (type === 'projects') {
      return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: '600px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Код</th>
                <th>Проект</th>
                <th>Статус</th>
                <th>Заказчик</th>
                <th>Бюджет (ч)</th>
                <th>План (ч)</th>
                <th>Факт (ч)</th>
                <th>Ответственный</th>
              </tr>
            </thead>
            <tbody>
              {results.map((p, idx) => {
                const stats = getProjectStats(p.id);
                return (
                  <tr key={p.id}>
                    <td>{idx + 1}</td>
                    <td><b>{p.code}</b></td>
                    <td>{p.name}</td>
                    <td><span className={`st-chip ${p.status === 'active' ? 'active' : ''}`}>{PROJECT_STATUSES[p.status] || p.status}</span></td>
                    <td>{p.customer || '—'}</td>
                    <td>{p.budget ?? '—'}</td>
                    <td>{stats.plan}</td>
                    <td>{stats.fact}</td>
                    <td>{empName(p.managerId)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } else if (type === 'employees') {
      return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: '600px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Сотрудник</th>
                <th>Отдел (основной)</th>
                <th>План (ч)</th>
                <th>Факт (ч)</th>
                <th>Кол-во задач</th>
              </tr>
            </thead>
            <tbody>
              {results.map((e, idx) => {
                const deptName = getPrimaryDeptName(e, safeDb);
                const tasks = (safeDb.tasks || []).filter(t => t.assigneeId === e.id);
                const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
                const fact = tasks.reduce((s, t) => s + getTaskSpent(t), 0);
                return (
                  <tr key={e.id}>
                    <td>{idx + 1}</td>
                    <td><b>{e.last} {e.first}</b></td>
                    <td>{deptName}</td>
                    <td>{plan}</td>
                    <td>{fact}</td>
                    <td>{tasks.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } else if (type === 'worklog') {
      return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: '700px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Дата</th>
                <th>Сотрудник</th>
                <th>Задача</th>
                <th>Проект</th>
                <th>Часы</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {results.map((l, idx) => {
                const project = (safeDb.projects || []).find(p => p.id === l.projectId);
                const user = (safeDb.employees || []).find(e => e.id === l.userId);
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{fmtDMY(l.date)}</td>
                    <td>{user ? `${user.last} ${user.first}` : '—'}</td>
                    <td>{l.taskTitle}</td>
                    <td>{project?.code || '—'}</td>
                    <td><b>{l.hours}</b></td>
                    <td>{l.note || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
  };

  const type = filters.type;
  const showDateRange = type !== 'employees';
  const showDeadlineRange = type === 'tasks' || type === 'projects';
  const showStatusPriority = type === 'tasks';

  return (
    <div className="rep">
      <div className="rep-panel" style={{ padding: '16px' }}>
        <div className="rep-panel-title">Фильтры отчёта</div>

        <div className="toolbar" style={{ marginBottom: '8px' }}>
          <label className="lbl" style={{ margin: 0 }}>Тип отчёта:</label>
          <div className="seg">
            {REPORT_TYPES.map(typeOption => (
              <button
                key={typeOption.value}
                className={`seg-btn${filters.type === typeOption.value ? ' on' : ''}`}
                onClick={() => handleFilterChange('type', typeOption.value)}
              >
                {typeOption.label}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {showDateRange && (
            <>
              <label className="lbl" style={{ margin: 0 }}>
                {type === 'worklog' ? 'Дата записи:' : type === 'projects' ? 'Начало:' : 'Создан с:'}
              </label>
              <input
                className="inp"
                type="date"
                value={filters.dateFrom}
                onChange={e => handleFilterChange('dateFrom', e.target.value)}
                style={{ width: '150px' }}
              />
              <span>—</span>
              <input
                className="inp"
                type="date"
                value={filters.dateTo}
                onChange={e => handleFilterChange('dateTo', e.target.value)}
                style={{ width: '150px' }}
              />
            </>
          )}

          {showDeadlineRange && (
            <>
              <label className="lbl" style={{ margin: 0 }}>
                {type === 'projects' ? 'Окончание:' : 'Срок исполнения:'}
              </label>
              <input
                className="inp"
                type="date"
                value={filters.deadlineFrom}
                onChange={e => handleFilterChange('deadlineFrom', e.target.value)}
                style={{ width: '150px' }}
              />
              <span>—</span>
              <input
                className="inp"
                type="date"
                value={filters.deadlineTo}
                onChange={e => handleFilterChange('deadlineTo', e.target.value)}
                style={{ width: '150px' }}
              />
            </>
          )}

          <label className="lbl" style={{ margin: 0 }}>Проект:</label>
          <select
            className="inp sel"
            value={filters.projectId}
            onChange={e => handleFilterChange('projectId', e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">Все проекты</option>
            {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>

          <label className="lbl" style={{ margin: 0 }}>Исполнитель:</label>
          <select
            className="inp sel"
            value={filters.assigneeId}
            onChange={e => handleFilterChange('assigneeId', e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">Все</option>
            {visibleEmployees.map(e => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
          </select>

          <label className="lbl" style={{ margin: 0 }}>Заказчик:</label>
          <input
            className="inp"
            type="text"
            value={filters.customer}
            onChange={e => handleFilterChange('customer', e.target.value)}
            placeholder="поиск по названию"
            style={{ width: '200px' }}
          />

          {showStatusPriority && (
            <>
              <label className="lbl" style={{ margin: 0 }}>Статус задачи:</label>
              <select
                className="inp sel"
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                style={{ width: '140px' }}
              >
                <option value="all">Все</option>
                {Object.keys(TASK_STATUSES).map(st => <option key={st} value={st}>{TASK_STATUSES[st].label}</option>)}
              </select>

              <label className="lbl" style={{ margin: 0 }}>Приоритет:</label>
              <select
                className="inp sel"
                value={filters.priority}
                onChange={e => handleFilterChange('priority', e.target.value)}
                style={{ width: '140px' }}
              >
                <option value="all">Все</option>
                {Object.keys(PRIORITIES).map(pr => <option key={pr} value={pr}>{PRIORITIES[pr].label}</option>)}
              </select>
            </>
          )}
        </div>

        <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={applyFilters}>Применить</button>
          <button className="btn ghost" onClick={resetFilters}>Сбросить фильтры</button>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              className="inp"
              type="text"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Название шаблона"
              style={{ width: '180px' }}
            />
            <button className="btn ghost" onClick={saveFilter}>
              <Ic d={ICONS.plus} size={13} /> Сохранить фильтр
            </button>
          </div>
        </div>
      </div>

      {savedFilters.length > 0 && (
        <div className="rep-panel" style={{ padding: '16px' }}>
          <div className="rep-panel-title">Сохранённые шаблоны</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {savedFilters.map(f => {
              const criteria = [];
              const typeLabel = REPORT_TYPES.find(t => t.value === f.filters.type)?.label || 'Задачи';
              criteria.push(`Тип: ${typeLabel}`);
              if (f.filters.dateFrom || f.filters.dateTo) {
                const from = f.filters.dateFrom ? fmtDMY(f.filters.dateFrom) : '';
                const to = f.filters.dateTo ? fmtDMY(f.filters.dateTo) : '';
                criteria.push(`Период: ${from} — ${to}`);
              }
              if (f.filters.deadlineFrom || f.filters.deadlineTo) {
                const from = f.filters.deadlineFrom ? fmtDMY(f.filters.deadlineFrom) : '';
                const to = f.filters.deadlineTo ? fmtDMY(f.filters.deadlineTo) : '';
                criteria.push(`Срок исполнения: ${from} — ${to}`);
              }
              if (f.filters.projectId !== 'all') {
                const proj = (safeDb.projects || []).find(p => p.id === f.filters.projectId);
                criteria.push(`Проект: ${proj?.code || '—'}`);
              }
              if (f.filters.assigneeId !== 'all') {
                const emp = (safeDb.employees || []).find(e => e.id === f.filters.assigneeId);
                criteria.push(`Исполнитель: ${emp ? emp.last : '—'}`);
              }
              if (f.filters.status !== 'all') criteria.push(`Статус: ${TASK_STATUSES[f.filters.status]?.label || f.filters.status}`);
              if (f.filters.priority !== 'all') criteria.push(`Приоритет: ${PRIORITIES[f.filters.priority]?.label || f.filters.priority}`);
              if (f.filters.customer) criteria.push(`Заказчик: ${f.filters.customer}`);
              const displayText = criteria.length ? criteria.join(' · ') : 'Все';

              return (
                <div key={f.id} className="pj-card" style={{ minWidth: '200px', maxWidth: '280px', cursor: 'pointer', padding: '12px', position: 'relative' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>{f.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)', lineHeight: '1.4' }}>{displayText}</div>
                  <button
                    className="icon-btn"
                    style={{ position: 'absolute', top: '6px', right: '6px' }}
                    onClick={(e) => { e.stopPropagation(); deleteFilter(f.id); }}
                    title="Удалить шаблон"
                  >
                    <Ic d={ICONS.x} size={14} />
                  </button>
                  <div style={{ marginTop: '8px' }}>
                    <button className="btn ghost sm" onClick={() => loadFilter(f)}>Загрузить</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rep-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="rep-panel-title" style={{ marginBottom: 0 }}>Результаты ({results.length})</div>
          <button className="btn primary sm" onClick={downloadXLSX} disabled={results.length === 0}>
            <Ic d={ICONS.download} size={13} /> Выгрузить XLSX
          </button>
        </div>
        {renderResults()}
      </div>
    </div>
  );
}
```
### `src/components/Requests.jsx`
```javascript
import React, { useState } from "react";
import { TASK_STATUSES, VACATION_TYPES, ROLES } from "../utils/constants";
import { fmtDMY, fmtDT } from "../utils/date";
import { hasRole, canApproveVacation } from "../utils/permissions";
import { Ic, ICONS } from "./Icons";
import { useDataHelpers } from "../hooks";

export default function Requests({ db, setDb, ur, initialTab = 'hours', addAudit, notify }) {
  const { empName } = useDataHelpers(db);
  const [tab, setTab] = useState(initialTab);

  const tabs = [];
  if (hasRole(ur, 'director', 'admin')) tabs.push(['hours', 'Изменение часов']);
  tabs.push(['vac', 'Делегирование отпусков']);
  tabs.push(['rd', 'Передача ролей']);
  if (hasRole(ur, 'admin')) tabs.push(['reg', 'Заявки на регистрацию']);

  const decideHours = (r, ok) => {
    const targetTitle = ok 
      ? (r.kind === "task" 
          ? db.tasks.find(t => t.id === r.targetId)?.title 
          : db.projects.find(p => p.id === r.targetId)?.name)
      : (r.kind === "task" 
          ? db.tasks.find(t => t.id === r.targetId)?.title 
          : db.projects.find(p => p.id === r.targetId)?.name);
    
    setDb((s) => {
      const st = { ...s, hoursRequests: s.hoursRequests.map((x) => (x.id === r.id ? { ...x, status: ok ? "approved" : "rejected" } : x)) };
      if (ok) {
        if (r.kind === "task") st.tasks = st.tasks.map((t) => (t.id === r.targetId ? { ...t, plannedHours: r.newH } : t));
        else st.projects = st.projects.map((p) => (p.id === r.targetId ? { ...p, budget: r.newH } : p));
      }
      return st;
    });
    
    setTimeout(() => {
      if (ok) {
        addAudit('Утверждение запроса часов', { 
          task: targetTitle, 
          previousHours: r.oldH, 
          newHours: r.newH,
          reason: r.reason          // <-- добавлено поле reason
        }, 'hoursRequest', r.id);
      } else {
        addAudit('Отклонение запроса часов', { 
          task: targetTitle,
          requestedHours: r.newH,
          reason: r.reason
        }, 'hoursRequest', r.id);
      }
    }, 0);

    if (notify) {
      const statusText = ok ? 'утверждён' : 'отклонён';
      notify(
        r.reqId,
        `Ваш запрос на изменение часов по ${r.kind === 'task' ? 'задаче' : 'проекту'} "${targetTitle}" ${statusText}.`,
        { targetType: 'hours', targetId: r.id }
      );
    }
  };

  const decideVac = (v, ok) => {
    const employeeName = empName(v.empId);
    const period = `${fmtDMY(v.start)}—${fmtDMY(v.end)}`;
    
    setDb((s) => {
      const updated = { ...s, vacations: s.vacations.map((x) => (x.id === v.id ? { ...x, status: ok ? "approved" : "rejected" } : x)) };
      return updated;
    });
    
    setTimeout(() => {
      if (ok) {
        addAudit('Утверждение отпуска', { 
          employee: employeeName, 
          period,
          type: VACATION_TYPES[v.type]?.label || v.type
        }, 'vacation', v.id);
      } else {
        addAudit('Отклонение отпуска', { 
          employee: employeeName, 
          period,
          type: VACATION_TYPES[v.type]?.label || v.type
        }, 'vacation', v.id);
      }
    }, 0);
  };

  const decideRD = (r, ok) => {
    const fromName = empName(r.fromId);
    const toName = empName(r.toId);
    const rolesStr = r.roles.join(', ');
    
    setDb((s) => {
      const updated = { ...s, roleDelegations: s.roleDelegations.map((x) => (x.id === r.id ? { ...x, status: ok ? "active" : "rejected" } : x)) };
      return updated;
    });
    
    setTimeout(() => {
      if (ok) {
        addAudit('Принятие делегирования', { 
          from: fromName, 
          to: toName, 
          roles: rolesStr,
          start: fmtDMY(r.start),
          end: fmtDMY(r.end)
        }, 'delegation', r.id);
      } else {
        addAudit('Отклонение делегирования', { 
          from: fromName, 
          to: toName, 
          roles: rolesStr 
        }, 'delegation', r.id);
      }
    }, 0);
  };

  const decideReg = (r, ok) => {
    const empNameStr = `${r.last} ${r.first}`;
    
    if (ok) {
      setDb((s) => {
        const existing = s.employees.find(e => e.email === r.email);
        if (existing) {
          const updated = { ...existing, roles: ['executor'] };
          return { 
            ...s, 
            employees: s.employees.map(e => e.id === updated.id ? updated : e),
            regRequests: s.regRequests.map(x => x.id === r.id ? { ...x, status: "approved" } : x)
          };
        } else {
          const newEmp = { 
            id: "e_" + Math.random().toString(36).slice(2,6),
            last: r.last,
            first: r.first,
            email: r.email,
            pass: r.pass,
            position: "Сотрудник",
            departments: [],
            roles: ["executor"],
            kbIds: [],
            headDeptIds: [],
            phone: "",
            tab: String(1000 + Math.floor(Math.random() * 8999)),
            notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
            failed: 0,
            lockUntil: 0
          };
          return { 
            ...s, 
            employees: [...s.employees, newEmp],
            regRequests: s.regRequests.map(x => x.id === r.id ? { ...x, status: "approved" } : x)
          };
        }
      });
      
      setTimeout(() => {
        addAudit('Одобрение регистрации', { 
          email: r.email, 
          employee: empNameStr,
          position: r.position || 'Сотрудник'
        }, 'registration', r.id);
      }, 0);
    } else {
      setDb((s) => {
        return { ...s, regRequests: s.regRequests.map((x) => (x.id === r.id ? { ...x, status: "rejected" } : x)) };
      });
      
      setTimeout(() => {
        addAudit('Отклонение регистрации', { 
          email: r.email, 
          employee: empNameStr,
          reason: r.rejectionReason || 'Не указана'
        }, 'registration', r.id);
      }, 0);
    }
  };

  return (
    <div>
      <div className="tabs">{tabs.map(([id, l]) => <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>)}</div>

      {tab === "hours" && hasRole(ur, "director", "admin") && (
        <div className="rep-panel">
          <div className="rep-panel-title">Запросы на изменение плановых часов</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Объект</th>
                <th>Текущее</th>
                <th>Предлагаемое</th>
                <th>Обоснование</th>
                <th>Запросил</th>
                <th>Решение</th>
              </tr>
            </thead>
            <tbody>
              {db.hoursRequests.map(r => (
                <tr key={r.id}>
                  <td><b>{r.kind === "task" ? db.tasks.find(t => t.id === r.targetId)?.title : db.projects.find(p => p.id === r.targetId)?.name}</b></td>
                  <td>{r.oldH} ч</td>
                  <td><b>{r.newH} ч</b></td>
                  <td className="mut sm">{r.reason}</td>
                  <td>{empName(r.reqId)}</td>
                  <td>
                    {r.status === "pending" ? (
                      <>
                        <button className="btn primary sm" onClick={() => decideHours(r, true)}>Подтвердить</button>
                        <button className="btn danger sm" onClick={() => decideHours(r, false)}>Отклонить</button>
                      </>
                    ) : (
                      <span className={"st-chip " + (r.status === "approved" ? "approved" : "rejected")}>{r.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "vac" && (
        <div className="rep-panel">
          <div className="rep-panel-title">Отпуска с делегированием — на утверждение</div>
          <table className="tbl">
            <thead><tr><th>Сотрудник</th><th>Период</th><th>Замещающий</th><th>Решение</th></tr></thead>
            <tbody>
              {db.vacations.filter(v => v.status === "pending" && canApproveVacation(ur, v, db)).map(v => (
                <tr key={v.id}>
                  <td><b>{empName(v.empId)}</b></td>
                  <td>{fmtDMY(v.start)} — {fmtDMY(v.end)}</td>
                  <td>{v.delegation.enabled ? empName(v.delegation.subId) : '—'}</td>
                  <td><button className="btn primary sm" onClick={() => decideVac(v, true)}>Утвердить</button> <button className="btn danger sm" onClick={() => decideVac(v, false)}>Отклонить</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "rd" && (
        <div className="rep-panel">
          <div className="rep-panel-title">Передача ролей</div>
          <table className="tbl">
            <thead><tr><th>От</th><th>Кому</th><th>Роли</th><th>Статус / действие</th></tr></thead>
            <tbody>
              {db.roleDelegations.map(r => (
                <tr key={r.id}>
                  <td>{empName(r.fromId)}</td><td>{empName(r.toId)}</td>
                  <td>{r.roles.map(x => ROLES[x].label).join(", ")}</td>
                  <td>{r.status === "pending" && r.toId === ur.id ? (<><button className="btn primary sm" onClick={() => decideRD(r, true)}>Принять</button> <button className="btn danger sm" onClick={() => decideRD(r, false)}>Отклонить</button></>) : <span className={"st-chip " + r.status}>{r.status}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "reg" && hasRole(ur, "admin") && (
        <div className="rep-panel">
          <div className="rep-panel-title">Заявки на регистрацию</div>
          <table className="tbl">
            <thead><tr><th>ФИО</th><th>E-mail</th><th>Решение</th></tr></thead>
            <tbody>
              {db.regRequests.map(r => (
                <tr key={r.id}>
                  <td><b>{r.last} {r.first}</b></td><td>{r.email}@aviahorizont.ru</td>
                  <td>{r.status === "pending" ? (<><button className="btn primary sm" onClick={() => decideReg(r, true)}>Одобрить</button> <button className="btn danger sm" onClick={() => decideReg(r, false)}>Отклонить</button></>) : <span className={"st-chip " + (r.status === "approved" ? "approved" : "rejected")}>{r.status}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```
### `src/components/Staff.jsx`
```javascript
// Staff.jsx
import React, { useState, useMemo, useCallback } from "react";
import { ROLES, VACATION_TYPES } from "../utils/constants";
import { TODAY, fmtDMY, uid } from "../utils/date";
import {
  canEditDepartments,
  canEditRoles,
  canManageAllVacations,
  hasRole,
  canFireEmployee,
} from "../utils/permissions";
import { Ic, ICONS } from "./Icons";
import { useDataHelpers } from "../hooks";
import EditEmployeeModal from "./EditEmployeeModal";
import CreateEmployeeModal from "./CreateEmployeeModal";
import Avatar from "./Avatar";
import { getPrimaryDeptName } from "../utils/helpers";

// ---- Строка сотрудника ----
const EmployeeRow = React.memo(({
  employee,
  isFired,
  db,
  ur,
  openDepts,
  openRoles,
  setDb,
  canFire,
  getEmployeeLoad,
  openEditEmployee,
}) => {
  const l = getEmployeeLoad(employee.id);
  const norm = 160;
  const pct = Math.min(100, Math.round((l.plan / norm) * 100));
  const vacNow = db.vacations.find(v => v.empId === employee.id && v.status === 'approved' && v.start <= TODAY && TODAY <= v.end);

  const handleFireToggle = useCallback(() => {
    const updated = { ...employee, fired: !employee.fired };
    setDb((s) => ({
      ...s,
      employees: s.employees.map(emp => emp.id === employee.id ? updated : emp),
      audit: [{ id: uid(), ts: Date.now(), userId: ur.id, action: employee.fired ? 'Восстановление сотрудника' : 'Увольнение сотрудника', details: `${employee.last} ${employee.first}` }, ...s.audit]
    }));
  }, [employee, setDb, ur]);

  const mainDept = getPrimaryDeptName(employee, db);
  const displayPosition = employee.position || 'Сотрудник';

  return (
    <div className="st-row">
      <Avatar employee={employee} size="sm" />
      <div className="st-name">
        <div className="st-fio">
          {employee.last} {employee.first}
          {isFired && <span className="vac-badge fired">Уволен</span>}
          {vacNow && <span className="vac-badge">в отпуске до {fmtDMY(vacNow.end)}</span>}
        </div>
        <div className="st-pos">
          {displayPosition}
        </div>
      </div>
      <div className="st-roles">
        {employee.roles.map(r => (
          <span key={r} className="role-chip" style={{ background: ROLES[r].color + '1e', color: ROLES[r].color }}>{ROLES[r].short}</span>
        ))}
      </div>
      {!isFired && (
        <div className="st-load">
          <div className="st-load-bar"><div className={`st-load-fill${l.plan > norm ? ' over' : ''}`} style={{ width: pct + '%' }} /></div>
          <span className={`st-load-txt${l.plan > norm ? ' over' : ''}`}>{l.plan} ч · {Math.round((l.plan / norm) * 100)}%</span>
        </div>
      )}
      <div className="st-nums"><b>{isFired ? '—' : l.cnt}</b><span>{isFired ? 'задач' : 'задач'}</span></div>
      {canEditDepartments(ur) && !isFired && <button className="btn ghost sm" title="Подразделения" onClick={() => openDepts(employee.id)}><Ic d={ICONS.users} size={13} /> Отделы</button>}
      {canEditRoles(ur) && !isFired && <button className="btn ghost sm" onClick={() => openRoles(employee.id)}><Ic d={ICONS.shield} size={13} /> Роли</button>}
      {canFire && (
        <button className={`btn ghost sm${isFired ? '' : ' danger'}`} onClick={handleFireToggle}>
          <Ic d={isFired ? ICONS.restore : ICONS.x} size={13} /> {isFired ? 'Восстановить' : 'Уволить'}
        </button>
      )}
      {canEditDepartments(ur) && (
        <button className="icon-btn" title="Редактировать сотрудника" onClick={() => openEditEmployee(employee.id)}>
          <Ic d={ICONS.edit} size={15} />
        </button>
      )}
    </div>
  );
});

// ---- Основной компонент Staff ----
export default function Staff({ db, setDb, ur, openRoles, openDepts, openVacation }) {
  const { getEmployeeLoad, empName } = useDataHelpers(db);
  const [showFired, setShowFired] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeEmployees = useMemo(() => db.employees.filter(e => !e.fired), [db.employees]);
  const firedEmployees = useMemo(() => db.employees.filter(e => e.fired), [db.employees]);

  const noDeptEmployees = useMemo(() => {
    return activeEmployees
      .filter(e => e.departments.length === 0 && !e.roles.includes('kb_chief'))
      .sort((a, b) => {
        if (a.roles.includes('director') && !b.roles.includes('director')) return -1;
        if (!a.roles.includes('director') && b.roles.includes('director')) return 1;
        return a.last.localeCompare(b.last);
      });
  }, [activeEmployees]);

  const deptMap = useMemo(() => {
    const map = new Map();
    db.departments.forEach(d => {
      const members = activeEmployees.filter(e => e.departments.some(x => x.deptId === d.id));
      if (members.length) map.set(d.id, members);
    });
    return map;
  }, [db.departments, activeEmployees]);

  const kbSections = useMemo(() => {
    return db.kbs.map(k => {
      const deptsInKb = db.departments.filter(d => d.kbId === k.id);
      const members = activeEmployees.filter(e => e.departments.some(d => deptsInKb.some(x => x.id === d.deptId)));
      const chiefs = activeEmployees.filter(e => e.roles.includes('kb_chief') && (e.kbIds || []).includes(k.id));
      if (members.length === 0 && deptsInKb.length === 0 && chiefs.length === 0) return null;
      return { kb: k, deptsInKb, members, chiefs };
    }).filter(Boolean);
  }, [db.kbs, db.departments, activeEmployees]);

  const deptsWithoutKb = useMemo(() => db.departments.filter(d => d.kbId === null), [db.departments]);
  const allVacs = useMemo(() => [...db.vacations].sort((a,b) => (a.start < b.start ? 1 : -1)), [db.vacations]);
  const canFire = canFireEmployee(ur);

  const openEditEmployee = useCallback((id) => setEditEmployeeId(id), []);
  const closeEditEmployee = useCallback(() => setEditEmployeeId(null), []);

  const renderDepartment = useCallback((deptId) => {
    const members = deptMap.get(deptId) || [];
    if (!members.length) return null;
    const dept = db.departments.find(d => d.id === deptId);
    if (!dept) return null;
    const headNames = db.employees.filter(e => (e.headDeptIds || []).includes(deptId) && !e.fired).map(e => `${e.last} ${e.first[0]}.`).join(', ');
    return (
      <div className="st-dept" key={deptId}>
        <div className="st-dept-head">
          <span className="st-dept-name">{dept.name}</span>
          <span className="mut">руководитель: {headNames || '—'}</span>
          <span className="kcount">{members.length}</span>
        </div>
        {members.map(e => (
          <EmployeeRow
            key={e.id}
            employee={e}
            isFired={false}
            db={db}
            ur={ur}
            openDepts={openDepts}
            openRoles={openRoles}
            setDb={setDb}
            canFire={canFire}
            getEmployeeLoad={getEmployeeLoad}
            openEditEmployee={openEditEmployee}
          />
        ))}
      </div>
    );
  }, [deptMap, db, ur, openDepts, openRoles, setDb, canFire, getEmployeeLoad, openEditEmployee]);

  return (
    <div className="staff">
      <div className="sec-head">
        <div className="sec-note">Привязку сотрудников к отделам меняют только HR-менеджер, суперадминистратор и генеральный директор. Загрузка — по плановым часам открытых задач, норма 160 ч/мес.</div>
        {canEditRoles(ur) && (
          <div className="sec-actions">
            <button className="btn ghost sm" onClick={() => {
              const name = window.prompt('Название нового КБ:');
              if (name) setDb((s) => ({ ...s, kbs: [...s.kbs, { id: 'kb_' + Math.random().toString(36).slice(2,6), name, full: name }] }));
            }}><Ic d={ICONS.plus} size={13} /> КБ</button>
            <button className="btn ghost sm" onClick={() => {
              const name = window.prompt('Название нового отдела:');
              if (name) setDb((s) => ({ ...s, departments: [...s.departments, { id: 'd_' + Math.random().toString(36).slice(2,6), name, kbId: null }] }));
            }}><Ic d={ICONS.plus} size={13} /> Отдел</button>
            {canEditDepartments(ur) && (
              <button className="btn primary sm" onClick={() => setShowCreateModal(true)}>
                <Ic d={ICONS.plus} size={13} /> Добавить сотрудника
              </button>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateEmployeeModal
          db={db}
          setDb={setDb}
          onClose={() => setShowCreateModal(false)}
          toast={(msg, type) => alert(msg)}
          audit={(action, details) => setDb(prev => ({ ...prev, audit: [{ id: uid(), ts: Date.now(), userId: ur.id, action, details }, ...prev.audit] }))}
        />
      )}

      {editEmployeeId && (
        <EditEmployeeModal
          db={db}
          setDb={setDb}
          employeeId={editEmployeeId}
          onClose={closeEditEmployee}
          toast={(msg, type) => alert(msg)}
          audit={(action, details) => setDb(prev => ({ ...prev, audit: [{ id: uid(), ts: Date.now(), userId: ur.id, action, details }, ...prev.audit] }))}
          ur={ur}
        />
      )}

      {noDeptEmployees.length > 0 && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Руководство</div>
            <div className="st-sec-sub">{noDeptEmployees.length} чел.</div>
          </div>
          {noDeptEmployees.map(e => (
            <EmployeeRow
              key={e.id}
              employee={e}
              isFired={false}
              db={db}
              ur={ur}
              openDepts={openDepts}
              openRoles={openRoles}
              setDb={setDb}
              canFire={canFire}
              getEmployeeLoad={getEmployeeLoad}
              openEditEmployee={openEditEmployee}
            />
          ))}
        </div>
      )}

      {kbSections.map(({ kb, deptsInKb, members, chiefs }) => (
        <div className="st-section" key={kb.id}>
          <div className="st-sec-head">
            <div className="st-sec-title">{kb.name}</div>
            <div className="st-sec-sub">{kb.full} · главный конструктор: {chiefs.map(e => `${e.last} ${e.first}`).join(', ') || '—'}</div>
          </div>
          {chiefs.length > 0 && (
            <div className="st-dept" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="st-dept-head">
                <span className="st-dept-name">Главные конструкторы</span>
                <span className="kcount">{chiefs.length}</span>
              </div>
              {chiefs.map(e => (
                <EmployeeRow
                  key={e.id}
                  employee={e}
                  isFired={false}
                  db={db}
                  ur={ur}
                  openDepts={openDepts}
                  openRoles={openRoles}
                  setDb={setDb}
                  canFire={canFire}
                  getEmployeeLoad={getEmployeeLoad}
                  openEditEmployee={openEditEmployee}
                />
              ))}
            </div>
          )}
          {deptsInKb.map(d => renderDepartment(d.id))}
        </div>
      ))}

      {deptsWithoutKb.length > 0 && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Отделы и сотрудники вне КБ</div>
            <div className="st-sec-sub">Подразделения прямого подчинения</div>
          </div>
          {deptsWithoutKb.map(d => renderDepartment(d.id))}
        </div>
      )}

      {canManageAllVacations(ur) && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Все отпуска</div>
            <button className="btn primary sm" onClick={() => openVacation(null, null)}><Ic d={ICONS.plus} size={13} /> Отпуск сотруднику</button>
          </div>
          <div style={{ padding: 14 }}>
            <table className="tbl">
              <thead><tr><th>Сотрудник</th><th>Отдел</th><th>Период</th><th>Тип</th><th>Делегирование</th><th>Статус</th><th></th></tr></thead>
              <tbody>
                {allVacs.map(v => {
                  const e = db.employees.find(x => x.id === v.empId);
                  if (e && e.fired) return null;
                  return (
                    <tr key={v.id}>
                      <td><b>{empName(v.empId)}</b></td>
                      <td>{getPrimaryDeptName(e, db)}</td>
                      <td>{fmtDMY(v.start)} — {fmtDMY(v.end)}</td>
                      <td>{VACATION_TYPES[v.type]}</td>
                      <td>{v.delegation.enabled ? `→ ${empName(v.delegation.subId)}` : '—'}</td>
                      <td><span className={`st-chip ${v.status}`}>
                        {{ pending: 'На утверждении', approved: 'Утверждён', rejected: 'Отклонён' }[v.status]}
                      </span></td>
                      <td>
                        <button className="icon-btn" onClick={() => openVacation(v.id, null)}><Ic d={ICONS.edit} size={14} /></button>
                        <button className="icon-btn danger" onClick={() => { setDb((s) => ({ ...s, vacations: s.vacations.filter(x => x.id !== v.id) })); }}><Ic d={ICONS.trash} size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
                {allVacs.length === 0 && <tr><td colSpan="7" className="mut">Отпусков нет</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {firedEmployees.length > 0 && canFire && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Архив сотрудников (уволенные)</div>
            <button className="btn ghost sm" onClick={() => setShowFired(!showFired)}>
              {showFired ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          {showFired && (
            <div className="st-empty-box">
              {firedEmployees.map(e => (
                <EmployeeRow
                  key={e.id}
                  employee={e}
                  isFired={true}
                  db={db}
                  ur={ur}
                  openDepts={openDepts}
                  openRoles={openRoles}
                  setDb={setDb}
                  canFire={canFire}
                  getEmployeeLoad={getEmployeeLoad}
                  openEditEmployee={openEditEmployee}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```
### `src/components/Table.jsx`
```javascript
import React from 'react';

export const Table = ({ columns, data, renderRow, emptyMessage = 'Нет данных' }) => (
  <table className="tbl">
    <thead><tr>{columns.map((col, i) => <th key={i}>{col}</th>)}</tr></thead>
    <tbody>
      {data.length ? data.map(renderRow) : <tr><td colSpan={columns.length} className="mut">{emptyMessage}</td></tr>}
    </tbody>
  </table>
);
```
## `src/components/views/`
- **Folder:** `components/`

### `src/components/views/ArchiveView.jsx`
```javascript
import React from 'react';
import Archive from '../Archive';
import { TODAY } from '../../utils/date';

export default function ArchiveView({ db, ur, openTask, openProject, setArchiveMonths, store }) {
  const restoreTask = (id) => {
    const t = db.tasks.find(x => x.id === id);
    store.upsertTask({ ...t, archived: false, archivedAt: null, closedAt: null, status: 'new' });
  };
  const restoreProject = (id) => {
    const p = db.projects.find(x => x.id === id);
    store.upsertProject({ ...p, archived: false, archivedAt: null, closedAt: null, status: 'active' });
    db.tasks.filter(t => t.projectId === id).forEach(t => {
      store.upsertTask({ ...t, archived: false, archivedAt: null, closedAt: null, status: 'new' });
    });
  };
  return (
    <Archive
      db={db}
      ur={ur}
      openTask={openTask}
      openProject={openProject}
      setArchiveMonths={setArchiveMonths}
      restoreTask={restoreTask}
      restoreProject={restoreProject}
    />
  );
}
```
### `src/components/views/CabinetView.jsx`
```javascript
import React from 'react';
import Cabinet from '../Cabinet';

export default function CabinetView({ store, data, user, openTask, openVacation, openDelegation }) {
  return (
    <Cabinet
      store={store}
      data={data}
      user={user}
      openTask={openTask}
      openVacation={openVacation}
      openDelegation={openDelegation}
    />
  );
}
```
### `src/components/views/index.js`
```javascript
export { default as KanbanView } from './TasksView';
export { default as ProjectsView } from './ProjectsView';
export { default as CabinetView } from './CabinetView';
export { default as StaffView } from './StaffView';
export { default as ReportsView } from './ReportsView';
export { default as ArchiveView } from './ArchiveView';
export { default as RequestsView } from './RequestsView';
export { default as JournalView } from './JournalView';
```
### `src/components/views/JournalView.jsx`
```javascript
import React from 'react';
import Journal from '../Journal';

export default function JournalView({ db, ur }) {
  return <Journal db={db} />;
}
```
### `src/components/views/ProjectsView.jsx`
```javascript
// src/components/views/ProjectsView.jsx
import React, { useState, useMemo } from 'react';
import Kanban from '../Kanban';
import Projects from '../Projects';
import { PROJECT_STATUSES, PROJECT_TYPES, PROJECT_STATUS_CONFIG, PROJECT_STATUS_ORDER, PROJECT_PRIORITIES } from '../../utils/constants';
import { TODAY } from '../../utils/date';
import { computeScope, hasRole } from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import Avatar from '../Avatar';
import { getProjectColor } from '../../utils/projectHelpers';
import ProjectProgress from '../ProjectProgress';

export default function ProjectsView({ db, ur, openProject, openHoursReq, store }) {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const [viewMode, setViewMode] = useState('kanban');
  const [showOnlyMyProjects, setShowOnlyMyProjects] = useState(false);
  const canSeeAll = hasRole(ur, 'admin', 'director', 'economist', 'kb_chief', 'head', 'project_lead', 'project_manager');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterParticipant, setFilterParticipant] = useState('all');
  const [filterDept, setFilterDept] = useState('all');

  const baseProjects = useMemo(() => {
    let list = scope.all
      ? db.projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled')
      : db.projects.filter(p => (!p.archived || p.status === 'closed' || p.status === 'cancelled') && scope.projIds.has(p.id));
    if (showOnlyMyProjects) {
      const myTasks = db.tasks.filter(t => t.assigneeId === ur.id && !t.archived);
      const myProjectIds = new Set(myTasks.map(t => t.projectId));
      list = list.filter(p => myProjectIds.has(p.id));
    }
    return list;
  }, [db, scope, showOnlyMyProjects, ur.id]);

  const participantOptions = useMemo(() => {
    const activeProjectIds = new Set(db.projects.filter(p => !p.archived || p.status === 'closed' || p.status === 'cancelled').map(p => p.id));
    const involvedIds = new Set();
    db.tasks.forEach(t => {
      if (activeProjectIds.has(t.projectId) && !t.archived && t.assigneeId) {
        involvedIds.add(t.assigneeId);
      }
    });
    return db.employees.filter(e => involvedIds.has(e.id));
  }, [db]);

  const deptOptions = useMemo(() => {
    const deptIds = new Set();
    participantOptions.forEach(e => e.departments.forEach(d => deptIds.add(d.deptId)));
    return db.departments.filter(d => deptIds.has(d.id));
  }, [participantOptions, db.departments]);

  const filteredProjects = useMemo(() => {
    let list = baseProjects;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
      );
    }

    if (filterStatus !== 'all') {
      list = list.filter(p => p.status === filterStatus);
    }

    if (filterType !== 'all') {
      list = list.filter(p => (p.ptype || 'prod') === filterType);
    }

    if (filterPriority !== 'all') {
      list = list.filter(p => p.priority === filterPriority);
    }

    if (filterParticipant !== 'all') {
      const projectIdsWithParticipant = new Set();
      db.tasks.forEach(t => {
        if (!t.archived && t.assigneeId === filterParticipant) {
          projectIdsWithParticipant.add(t.projectId);
        }
      });
      list = list.filter(p => projectIdsWithParticipant.has(p.id));
    }

    if (filterDept !== 'all') {
      const projectIdsWithDept = new Set();
      db.tasks.forEach(t => {
        if (!t.archived && t.assigneeId) {
          const assignee = db.employees.find(e => e.id === t.assigneeId);
          if (assignee && assignee.departments.some(d => d.deptId === filterDept)) {
            projectIdsWithDept.add(t.projectId);
          }
        }
      });
      list = list.filter(p => projectIdsWithDept.has(p.id));
    }

    return list;
  }, [baseProjects, searchQuery, filterStatus, filterType, filterPriority, filterParticipant, filterDept, db]);

  const renderProjectCard = (project) => {
    const tasks = db.tasks.filter(t => t.projectId === project.id && !t.archived);
    const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
    const fact = tasks.reduce((s, t) => s + t.logs.reduce((lsum, l) => lsum + l.hours, 0), 0);
    const uniqueAssignees = [...new Set(tasks.map(t => t.assigneeId).filter(Boolean))];
    const canClose = () => {
      const creatorId = project.creatorId || project.history?.find(h => h.who !== 'system')?.who;
      return hasRole(ur, 'admin') || hasRole(ur, 'director') || (creatorId && creatorId === ur.id);
    };
    const projectColor = getProjectColor(project);
    return (
      <div onClick={() => openProject(project.id)}>
        <div className="kcard-title">{project.name}</div>
        <div className="kcard-proj">
          <span className="pdot" style={{ background: projectColor }} />
          {project.code}
        </div>
        <div className="kcard-meta">
          <span className="mut sm">{PROJECT_STATUSES[project.ptype || 'prod']}</span>
          <span className="mut sm" style={{ marginLeft: 8, color: PROJECT_PRIORITIES[project.priority]?.color || '#64748b' }}>
            {project.priority || 'NORM'}
          </span>
          <ProjectProgress project={project} plan={plan} fact={fact} />
        </div>
        <div className="kcard-foot">
          <div className="pj-avatars" style={{ flex: 1 }}>
            {uniqueAssignees.slice(0,4).map(id => {
              const a = db.employees.find(e => e.id === id);
              return a ? <Avatar key={id} employee={a} size="xs" /> : null;
            })}
            {uniqueAssignees.length > 4 && <span className="mut sm">+{uniqueAssignees.length-4}</span>}
          </div>
          <div className="pj-actions" onClick={(e) => e.stopPropagation()}>
            {canClose() && project.status !== 'closed' && project.status !== 'cancelled' && (
              <button className="icon-btn danger" title="Закрыть/Отменить проект" onClick={() => {
                const action = window.confirm(`Закрыть проект "${project.name}"?`) ? 'close' : window.confirm(`Отменить проект "${project.name}"?`) ? 'cancel' : null;
                if (action === 'close') store.upsertProject({ ...project, status: 'closed', closedAt: TODAY });
                else if (action === 'cancel') store.upsertProject({ ...project, status: 'cancelled' });
              }}>
                <Ic d={ICONS.x} size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleMoveProject = (id, newStatus) => {
    const project = db.projects.find(p => p.id === id);
    if (project && project.status !== newStatus) {
      store.upsertProject({ ...project, status: newStatus });
    }
  };

  const closeProject = (p) => store.upsertProject({ ...p, status: 'closed', closedAt: TODAY });
  const cancelProject = (p) => store.upsertProject({ ...p, status: 'cancelled' });

  const canCreateProject = hasRole(ur, 'admin', 'director', 'kb_chief', 'project_manager');

  return (
    <>
      <div className="toolbar">
        <div className="btn-group">
          <button className={`btn ghost sm ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            <Ic d={ICONS.list} size={15} /> Список
          </button>
          <button className={`btn ghost sm ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>
            <Ic d={ICONS.kanban} size={15} /> Канбан
          </button>
        </div>

        <input
          className="inp sm filter-search"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        <select className="inp sel sm filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Статус</option>
          {Object.entries(PROJECT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select className="inp sel sm filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Тип</option>
          {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select className="inp sel sm filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">Приоритет</option>
          {Object.entries(PROJECT_PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select className="inp sel sm filter-select" value={filterParticipant} onChange={e => setFilterParticipant(e.target.value)}>
          <option value="all">Участник</option>
          {participantOptions.map(emp => <option key={emp.id} value={emp.id}>{emp.last} {emp.first}</option>)}
        </select>

        <select className="inp sel sm filter-select filter-select-dept" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">Отдел</option>
          {deptOptions.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
        </select>

        {canSeeAll && (
          <label className="dept-pick" style={{ marginLeft: 'auto' }}>
            <input type="checkbox" checked={showOnlyMyProjects} onChange={e => setShowOnlyMyProjects(e.target.checked)} />
            <span>Проекты с моими задачами</span>
          </label>
        )}

        {canCreateProject && (
          <button className="btn primary" onClick={() => openProject(null)}>
            <Ic d={ICONS.plus} size={15} /> Проект
          </button>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <Kanban
          items={filteredProjects}
          statusOrder={PROJECT_STATUS_ORDER}
          statusMap={PROJECT_STATUS_CONFIG}
          renderCard={renderProjectCard}
          onDrop={handleMoveProject}
          columns={4}
        />
      ) : (
        <Projects
          db={db}
          ur={ur}
          openProject={openProject}
          openHoursReq={openHoursReq}
          closeProject={closeProject}
          cancelProject={cancelProject}
          projects={filteredProjects}
        />
      )}
    </>
  );
}
```
### `src/components/views/ReportsView.jsx`
```javascript
import React from 'react';
import Reports from '../Reports';

export default function ReportsView({ db, ur }) {
  return <Reports db={db} ur={ur} />;
}
```
### `src/components/views/RequestsView.jsx`
```javascript
import React from 'react';
import Requests from '../Requests';

export default function RequestsView({ db, setDb, ur, addAudit }) {
  return <Requests db={db} setDb={setDb} ur={ur} initialTab="hours" addAudit={addAudit} />;
}
```
### `src/components/views/StaffView.jsx`
```javascript
import React from 'react';
import Staff from '../Staff';

export default function StaffView({ db, ur, setDb, openRoles, openDepts, openVacation }) {
  return (
    <Staff
      db={db}
      ur={ur}
      setDb={setDb}
      openRoles={openRoles}
      openDepts={openDepts}
      openVacation={openVacation}
    />
  );
}
```
### `src/components/views/TasksList.jsx`
```javascript
// src/components/TasksList.jsx
import React from 'react';
import { TASK_STATUSES, PRIORITIES } from '../../utils/constants';
import { fmtDMY, TODAY } from '../../utils/date';
import Avatar from '../Avatar';

export default function TasksList({ tasks, db, openTask }) {
  if (!tasks.length) {
    return <div className="empty-note" style={{ padding: '40px 0' }}>Нет задач, соответствующих фильтрам</div>;
  }

  return (
    <div className="pj-grid">
      {tasks.map(task => {
        const project = db.projects.find(p => p.id === task.projectId);
        const assignee = task.assigneeId ? db.employees.find(e => e.id === task.assigneeId) : null;
        const factHours = task.logs.reduce((sum, log) => sum + log.hours, 0);
        const overdue = task.deadline && !['closed','cancelled'].includes(task.status) && task.deadline < TODAY;
        const status = TASK_STATUSES[task.status]?.label || task.status;
        const priority = PRIORITIES[task.priority]?.label || task.priority;
        const priorityColor = PRIORITIES[task.priority]?.color || '#e2e8f0';

        return (
          <div 
            key={task.id} 
            className="pj-card" 
            onClick={() => openTask(task.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="pj-top">
              <span className="pj-code" style={{ background: project?.color + '22', color: project?.color || '#64748b' }}>
                {project?.code || 'Без проекта'}
              </span>
              <span className={`pj-st ${task.status}`}>{status}</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{priority}</span>
            </div>
            <div className="pj-name">{task.title}</div>
            <div className="pj-row">
              <span className="mut">Срок исполнения: </span> 
              {task.deadline ? (
                <span className={overdue ? 'red' : ''}>{fmtDMY(task.deadline)}</span>
              ) : 'не задан'}
            </div>
            <div className="pj-row">
              <span className="mut">Ответственный: </span>
              <span>
                {assignee ? `${assignee.last} ${assignee.first}` : 'не назначен'}
              </span>
            </div>
            <div className="pj-budget" style={{ marginTop: 8 }}>
              <div className="pj-budget-row">
                <span>Часы: <b>{factHours}</b> / <b>{task.plannedHours ?? '—'}</b></span>
              </div>
              {task.plannedHours > 0 && (
                <div className="pj-progress">
                  <div 
                    className="pj-progress-fill" 
                    style={{ width: Math.min(100, (factHours / task.plannedHours) * 100) + '%', background: project?.color || '#3b82f6' }} 
                  />
                </div>
              )}
            </div>
            <div className="pj-foot">
              {overdue && <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>Просрочено</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```
### `src/components/views/TasksView.jsx`
```javascript
// src/components/views/TasksView.jsx
import React, { useState, useMemo } from 'react';
import Kanban from '../Kanban';
import TasksList from './TasksList';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES } from '../../utils/constants';
import { fmtDMY, daysDiff, TODAY, isTaskActive } from '../../utils/date';
import { taskVisible, computeScope, hasRole, canChangeTaskStatus, canCreateTask } from '../../utils/permissions';
import { useToast } from '../../context/ToastContext';
import { ICONS, Ic } from '../Icons';
import { useDataHelpers } from '../../hooks';
import Avatar from '../Avatar';
import { getProjectColor } from '../../utils/projectHelpers';

export default function TasksView({ db, ur, openTask, store }) {
  const { showToast } = useToast();
  const { getTaskSpent } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const canSeeAll = hasRole(ur, 'admin', 'director', 'economist', 'kb_chief', 'head', 'project_lead', 'project_manager');

  const [viewMode, setViewMode] = useState('kanban');
  const [fProj, setFProj] = useState('all');
  const [fExec, setFExec] = useState('all');
  const [fPrio, setFPrio] = useState('all');
  const [fDept, setFDept] = useState('all');
  const [q, setQ] = useState('');
  const [showOnlyMy, setShowOnlyMy] = useState(false);

  const filteredTasks = useMemo(() => {
    let list = db.tasks.filter(t => isTaskActive(t) && taskVisible(ur, scope, t, db));
    if (fProj !== 'all') list = list.filter(t => t.projectId === fProj);
    if (fExec !== 'all') list = list.filter(t => t.assigneeId === fExec); // <-- один исполнитель
    if (fPrio !== 'all') list = list.filter(t => t.priority === fPrio);
    if (fDept !== 'all') {
      list = list.filter(t => {
        const assignee = t.assigneeId ? db.employees.find(e => e.id === t.assigneeId) : null;
        return assignee && assignee.departments.some(d => d.deptId === fDept);
      });
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(s) ||
        (db.projects.find(p => p.id === t.projectId)?.name || '').toLowerCase().includes(s)
      );
    }
    if (showOnlyMy) list = list.filter(t => t.assigneeId === ur.id); // <-- один исполнитель
    return list;
  }, [db, ur, scope, fProj, fExec, fPrio, fDept, q, showOnlyMy]);

  const projOptions = useMemo(() => {
    const ids = new Set(filteredTasks.map(t => t.projectId).filter(Boolean));
    return db.projects.filter(p => ids.has(p.id) && !p.archived);
  }, [filteredTasks, db.projects]);

  const execOptions = useMemo(() => {
    const ids = new Set(filteredTasks.map(t => t.assigneeId).filter(Boolean));
    return db.employees.filter(e => ids.has(e.id));
  }, [filteredTasks, db.employees]);

  const isOnlyExecutor = ur.roles.length === 1 && ur.roles[0] === 'executor';

  const renderTaskCard = (task) => {
    const p = db.projects.find(x => x.id === task.projectId);
    const assignee = task.assigneeId ? db.employees.find(e => e.id === task.assigneeId) : null;
    const sp = getTaskSpent(task);
    const overdue = task.deadline && !['closed','cancelled'].includes(task.status) && task.deadline < TODAY;
    const soon = task.deadline && !overdue && !['closed','cancelled'].includes(task.status) && daysDiff(TODAY, task.deadline) <= 3;
    const priority = PRIORITIES[task.priority] || { label: task.priority || 'Нет', color: '#64748b' };
    return (
      <div onClick={() => openTask(task.id)}>
        <div className="kcard-prio" style={{ background: priority.color }} />
        <div className="kcard-title">{task.title}</div>
        <div className="kcard-proj">
          <span className="pdot" style={{ background: getProjectColor(p) }} />
          {p?.code}
        </div>
        <div className="kcard-meta">
          {assignee && (
            <span className="kassignee">
              <Avatar employee={assignee} size="xs" />
            </span>
          )}
          <span className="khours"><Ic d={ICONS.clock} size={13} /> {sp}/{task.plannedHours ?? '—'} ч</span>
          <span className="prio-chip" style={{ color: priority.color, fontWeight: 700, fontSize: '12px' }}>
            {priority.label}
          </span>
        </div>
        <div className="kcard-foot">
          <span className={'kdl' + (overdue ? ' late' : soon ? ' soon' : '')}>
            {task.deadline ? (overdue ? `просрочено ${-daysDiff(TODAY, task.deadline)} дн` : `до ${fmtDMY(task.deadline)}`) : 'без дедлайна'}
          </span>
        </div>
      </div>
    );
  };

  const handleMoveTask = (taskId, newStatus) => {
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!canChangeTaskStatus(ur, task, newStatus, db)) {
      showToast('У вас нет прав на изменение статуса этой задачи.', 'error');
      return;
    }
    const isClosing = (newStatus === 'closed' || newStatus === 'cancelled') && task.status !== newStatus;
    const updatedTask = {
      ...task,
      status: newStatus,
      closedAt: isClosing ? TODAY : task.closedAt,
      archived: isClosing ? true : task.archived,
      archivedAt: isClosing ? TODAY : task.archivedAt,
      history: [...task.history, { ts: Date.now(), who: ur.id, text: `Статус → ${TASK_STATUSES[newStatus].label}` }]
    };
    store.upsertTask(updatedTask);
  };

  const canCreate = canCreateTask(ur);

  return (
    <>
      <div className="toolbar">
        <div className="btn-group">
          <button className={`btn ghost sm ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            <Ic d={ICONS.list} size={15} /> Список
          </button>
          <button className={`btn ghost sm ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>
            <Ic d={ICONS.kanban} size={15} /> Канбан
          </button>
        </div>

        <input
          className="inp sm filter-search"
          placeholder="Поиск..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />

        <select className="inp sel sm filter-select" value={fProj} onChange={e => setFProj(e.target.value)}>
          <option value="all">Проект</option>
          {projOptions.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>

        {!isOnlyExecutor && (
          <select className="inp sel sm filter-select" value={fExec} onChange={e => setFExec(e.target.value)}>
            <option value="all">Исполнитель</option>
            {execOptions.map(e => <option key={e.id} value={e.id}>{e.last}</option>)}
          </select>
        )}

        <select className="inp sel sm filter-select" value={fPrio} onChange={e => setFPrio(e.target.value)}>
          <option value="all">Приоритет</option>
          {Object.entries(PRIORITIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {!isOnlyExecutor && (
          <select className="inp sel sm filter-select" value={fDept} onChange={e => setFDept(e.target.value)}>
            <option value="all">Отдел</option>
            {db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}

        {canSeeAll && (
          <label className="dept-pick" style={{ marginLeft: 'auto' }}>
            <input type="checkbox" checked={showOnlyMy} onChange={e => setShowOnlyMy(e.target.checked)} />
            <span>Мои задачи</span>
          </label>
        )}

        {canCreate && (
          <button className="btn primary" onClick={() => openTask(null)}>
            <Ic d={ICONS.plus} size={15} /> Создать
          </button>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <Kanban
          items={filteredTasks}
          statusOrder={TASK_STATUS_ORDER}
          statusMap={TASK_STATUSES}
          renderCard={renderTaskCard}
          onDrop={handleMoveTask}
        />
      ) : (
        <TasksList tasks={filteredTasks} db={db} openTask={openTask} />
      )}
    </>
  );
}
```
## `src/components/Modals/`
- **Folder:** `components/`

### `src/components/Modals/DelegationModal.jsx`
```javascript
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { ROLES } from '../../utils/constants';
import { TODAY, iso, addDays, uid } from '../../utils/date';

export const DelegationModal = ({ db, ur, onClose, onSubmit }) => {
  const [toId, setToId] = useState("");
  const [roles, setRoles] = useState([]);
  const [start, setStart] = useState(TODAY);
  const [end, setEnd] = useState(iso(addDays(new Date(), 14)));
  const [openEnd, setOpenEnd] = useState(false);
  const [reason, setReason] = useState("");
  const allowed = ur.roles.filter((r) => !["admin", "director", "executor"].includes(r));
  return (
    <Modal title="Временная передача ролей" onClose={onClose} width={520}>
      <div className="form-grid">
        <label className="lbl">Сотрудник-получатель *</label>
        <select className="inp sel" value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">— выберите —</option>
          {db.employees.filter((e) => e.id !== ur.id).map((e) => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
        </select>
        <label className="lbl">Передаваемые роли *</label>
        <div className="sub-picks">
          {allowed.length ? allowed.map((r) => <label key={r} className="dept-pick"><input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles((s) => s.includes(r) ? s.filter((x) => x !== r) : [...s, r])} />{ROLES[r].label}</label>) : <span className="mut sm">Нет ролей, доступных для передачи</span>}
        </div>
        <label className="lbl">Дата начала *</label><input className="inp" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <label className="lbl">Дата окончания</label>
        <div className="duo"><input className="inp" type="date" disabled={openEnd} value={end} onChange={(e) => setEnd(e.target.value)} /><label className="dept-pick"><input type="checkbox" checked={openEnd} onChange={(e) => setOpenEnd(e.target.checked)} /> до отмены</label></div>
        <label className="lbl">Обоснование *</label><textarea className="inp" rows="2" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" disabled={!toId || !roles.length || !reason.trim()} onClick={() => onSubmit({ id: uid(), fromId: ur.id, toId, roles, start, end: openEnd ? null : end, reason: reason.trim(), status: "pending" })}>Отправить запрос</button>
      </div>
    </Modal>
  );
};
```
### `src/components/Modals/DeptsModal.jsx`
```javascript
import React, { useState } from 'react';
import { Modal } from '../Modal';

export const DeptsModal = ({ db, setDb, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  const [sel, setSel] = useState(emp.departments.map(d => ({ ...d })));

  const toggle = (deptId) => {
    setSel((s) => {
      if (s.some((x) => x.deptId === deptId)) {
        const next = s.filter((x) => x.deptId !== deptId);
        // если после удаления не осталось primary, делаем первый primary
        if (next.length && !next.some((x) => x.primary)) {
          next[0].primary = true;
        }
        return next;
      }
      // добавляем новый отдел как неосновной (primary: false)
      return [...s, { deptId, primary: s.length === 0, position: '' }];
    });
  };

  const setPrimary = (deptId) => {
    setSel((s) => s.map((x) => ({ ...x, primary: x.deptId === deptId })));
  };

  const setPosition = (deptId, pos) => {
    setSel((s) => s.map((x) => (x.deptId === deptId ? { ...x, position: pos } : x)));
  };

  const save = () => {
    if (!sel.length) return toast("Выберите хотя бы одно подразделение", "err");
    if (!sel.some((x) => x.primary)) return toast("Укажите основное подразделение", "err");
    // Обновляем сотрудника
    const before = emp.departments.map((x) => `${x.deptId}:${x.position || ''}`).join(',');
    const after = sel.map((x) => `${x.deptId}:${x.position || ''}`).join(',');
    setDb((s) => ({
      ...s,
      employees: s.employees.map((e) =>
        e.id === empId
          ? { ...e, departments: sel.map(({ deptId, primary, position }) => ({ deptId, primary, position: position?.trim() || '' })) }
          : e
      ),
    }));
    audit("Изменение подразделений сотрудника", `${emp.last} ${emp.first}: [${before}] → [${after}]`);
    toast("Подразделения обновлены");
    onClose();
  };

  return (
    <Modal title={`Подразделения — ${emp.last} ${emp.first}`} onClose={onClose} width={560}>
      <p className="mut sm">
        Сотрудник может числиться в нескольких отделах. Отметьте основное подразделение. 
        <strong> Для дополнительных (совмещаемых) отделов вы можете указать отдельную должность.</strong>
      </p>
      <div className="roles-list">
        {db.departments.map((d) => {
          const cur = sel.find((x) => x.deptId === d.id);
          const kb = db.kbs.find((k) => k.id === d.kbId);
          const isPrimary = cur && cur.primary;
          const isExtra = cur && !cur.primary;
          return (
            <div key={d.id} style={{ marginBottom: 8 }}>
              <label className="roles-item" style={{ border: 'none', padding: 0 }}>
                <input type="checkbox" checked={!!cur} onChange={() => toggle(d.id)} />
                <span style={{ flex: 1 }}>
                  {d.name} <span className="mut sm">{kb ? `· ${kb.name}` : "· вне КБ"}</span>
                </span>
                {cur && (
                  <button className={"btn ghost sm" + (isPrimary ? " prim-btn" : "")} onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}>
                    {isPrimary ? "основное ✓" : "сделать основным"}
                  </button>
                )}
              </label>
              {/* Поле для дополнительной должности показываем только для НЕосновных отделов */}
              {isExtra && (
                <div style={{ marginLeft: 28, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="lbl" style={{ margin: 0, fontSize: 12 }}>Должность в этом отделе (дополнительная):</label>
                  <input
                    className="inp"
                    style={{ flex: 1, padding: '6px 10px', fontSize: 14 }}
                    value={cur.position || ''}
                    onChange={(e) => setPosition(d.id, e.target.value)}
                    placeholder="Например: Ведущий инженер (совмещение)"
                  />
                </div>
              )}
              {/* Для основного отдела не показываем поле — должность редактируется в карточке сотрудника */}
            </div>
          );
        })}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить</button>
      </div>
    </Modal>
  );
};
```
### `src/components/Modals/HoursRequestModal.jsx`
```javascript
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { uid } from '../../utils/date';

export const HoursRequestModal = ({ db, ur, kind, targetId, onClose, onSubmit }) => {
  const target = kind === "task" ? db.tasks.find((t) => t.id === targetId) : db.projects.find((p) => p.id === targetId);
  const cur = kind === "task" ? target?.plannedHours : target?.budget;
  const [newH, setNewH] = useState(cur);
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Запрос изменения часов — ${kind === "task" ? "задача" : "бюджет проекта"}`} onClose={onClose} width={480}>
      <p className="mut sm">{kind === "task" ? target?.title : target?.name}. Запрос будет направлен генеральному директору.</p>
      <div className="form-grid">
        <label className="lbl">Текущее значение</label><input className="inp" disabled value={(cur ?? "—") + " ч"} />
        <label className="lbl">Новое значение *</label><input className="inp" type="number" min="1" step="0.5" value={newH} onChange={(e) => setNewH(e.target.value)} />
        <label className="lbl">Обоснование *</label><textarea className="inp" rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Почему требуется изменение…" />
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" disabled={!reason.trim() || !newH} onClick={() => onSubmit({ id: uid(), kind, targetId, oldH: cur, newH: +newH, reason: reason.trim(), reqId: ur.id, status: "pending", ts: Date.now() })}>Отправить запрос</button>
      </div>
    </Modal>
  );
};
```
### `src/components/Modals/index.jsx`
```javascript
export { TaskModal } from './TaskModal';
export { ProjectModal } from './ProjectModal';
export { HoursRequestModal } from './HoursRequestModal';
export { RolesModal } from './RolesModal';
export { DeptsModal } from './DeptsModal';
export { VacationModal } from './VacationModal';
export { DelegationModal } from './DelegationModal';
export { VacNowModal } from './VacNowModal';
```
### `src/components/Modals/ProjectModal.jsx`
```javascript
// src/components/modals/ProjectModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import Discussion from '../Discussion';
import { useDataHelpers } from '../../hooks';
import {
  PROJECT_STATUSES, PROJECT_TYPES, TASK_STATUSES, PROJECT_PRIORITIES,
  ADMIN_PROJECT_PRIORITIES,
} from '../../utils/constants';
import {
  TODAY, iso, addDays, uid, fmtDT, fmtDMY,
} from '../../utils/date';
import {
  hasRole, computeScope, canEditProjectFields, canChangeProjectStatus, canCreateProject,
} from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import { getProjectColor } from '../../utils/projectHelpers';

const AIRCRAFT_TYPES = [
  'Су-57', 'МиГ-35', 'Ту-160', 'Ил-76', 'Ка-52', 'Другой'
];
const PROJECT_TYPE_OPTIONS = ['Ремонт', 'Модификация', 'КС', 'ИКУ'];

const ADMIN_PRIORITY_MAP = {
  AOG: 'high',
  CRIT: 'mid',
  NORM: 'low',
};

export const ProjectModal = ({ db, ur, projectId, onClose, onSave, onDelete, toast, openTask, store }) => {
  const existing = projectId ? db.projects.find((p) => p.id === projectId) : null;
  const { empName, getTaskSpent } = useDataHelpers(db);
  const scope = computeScope(ur, db);
  const isExec = !scope.all && !hasRole(ur, 'director', 'economist', 'kb_chief', 'head', 'project_lead');

  const getInitialPriority = (proj) => {
    if (!proj) return 'NORM';
    if (proj.ptype === 'admin' && ADMIN_PRIORITY_MAP[proj.priority]) {
      return ADMIN_PRIORITY_MAP[proj.priority];
    }
    return proj.priority || 'NORM';
  };

  const [f, setF] = useState(existing ? { ...existing, priority: getInitialPriority(existing) } : {
    id: "p_" + uid(),
    code: "",
    name: "",
    desc: "",
    kbId: "",
    managerId: "",
    start: TODAY,
    end: iso(addDays(new Date(), 30)),
    status: "active",
    budget: 100,
    color: PROJECT_PRIORITIES['NORM'].color,
    ptype: "prod",
    longterm: false,
    archived: false,
    archivedAt: null,
    closedAt: null,
    creatorId: ur.id,
    customer: "",
    aircraftType: "",
    projectType: "",
    priority: "NORM",
    comments: existing?.comments || [],
    history: existing?.history || [{ ts: Date.now(), who: ur.id, text: "Проект создан" }],
    files: existing?.files || [],
  });

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isAdminType = f.ptype === "admin";

  useEffect(() => {
    if (isAdminType) {
      if (!ADMIN_PRIORITY_MAP[f.priority] && !Object.keys(ADMIN_PROJECT_PRIORITIES).includes(f.priority)) {
        setF(prev => ({ ...prev, priority: 'high' }));
      }
    } else {
      if (!PROJECT_PRIORITIES[f.priority]) {
        setF(prev => ({ ...prev, priority: 'NORM' }));
      }
    }
  }, [isAdminType, f.priority]);

  const isNew = !existing;
  const canEditFields = isNew ? canCreateProject(ur) : canEditProjectFields(ur, f);
  const canChangeStatus = isNew ? canCreateProject(ur) : canChangeProjectStatus(ur, f, f.status);

  const [tab, setTab] = useState('info');
  const [taskSortField, setTaskSortField] = useState('created');
  const [taskSortDir, setTaskSortDir] = useState('desc');

  const handlePriorityChange = (val) => {
    setF(prev => ({ ...prev, priority: val, color: getProjectColor({ ...prev, priority: val }) }));
  };

  const statusOptions = [
    { value: 'active', label: 'Активный' },
    { value: 'inactive', label: 'Неактивный' },
    { value: 'closed', label: 'Закрыт' },
    { value: 'cancelled', label: 'Отменён' }
  ];
  const creationStatusOptions = [
    { value: 'active', label: 'Активный' },
    { value: 'inactive', label: 'Неактивный' }
  ];

  const save = () => {
    if (!f.name.trim()) return toast("Укажите название проекта", "err");
    if (!f.code.trim()) return toast("Укажите код проекта", "err");
    if (!f.start) return toast("Укажите дату начала", "err");
    if (!f.customer?.trim()) return toast("Укажите заказчика", "err");
    if (!isAdminType) {
      if (!f.aircraftType) return toast("Выберите тип ВС", "err");
      if (!f.projectType) return toast("Выберите категорию", "err");
      if (!f.managerId) return toast("Для производственного проекта ответственный обязателен", "err");
      if (!f.end) return toast("Для производственного проекта дата окончания обязательна", "err");
      if (!f.kbId) return toast("Для производственного проекта необходимо выбрать подразделение (КБ)", "err");
    }
    const budgetValue = f.budget !== '' && f.budget != null ? +f.budget : null;
    if (!isAdminType && (!f.budget || +f.budget <= 0)) {
      return toast("Для производственного проекта бюджет обязателен и должен быть больше 0", "err");
    }
    if (!f.priority) return toast("Выберите приоритет проекта", "err");

    const finalColor = getProjectColor(f);
    onSave({ 
      ...f, 
      color: finalColor, 
      kbId: f.kbId || null, 
      budget: budgetValue,
      managerId: isAdminType ? "" : f.managerId, 
      end: isAdminType ? null : f.end, 
      longterm: false 
    }, !existing);
  };

  const taskList = useMemo(() => {
    if (!existing) return [];
    let list = db.tasks.filter(t => t.projectId === projectId);
    if (!existing.archived) {
      list = list.filter(t => !t.archived);
    }
    if (isExec) {
      list = list.filter(t => t.assigneeId === ur.id);
    }

    const sortFn = (a, b) => {
      let valA, valB;
      switch (taskSortField) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'assignees':
          const assigneeA = a.assigneeId ? db.employees.find(e => e.id === a.assigneeId) : null;
          const assigneeB = b.assigneeId ? db.employees.find(e => e.id === b.assigneeId) : null;
          valA = assigneeA ? assigneeA.last.toLowerCase() : '';
          valB = assigneeB ? assigneeB.last.toLowerCase() : '';
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'planned':
          valA = a.plannedHours ?? -1;
          valB = b.plannedHours ?? -1;
          break;
        case 'fact':
          valA = a.logs.reduce((s, l) => s + l.hours, 0);
          valB = b.logs.reduce((s, l) => s + l.hours, 0);
          break;
        case 'remaining':
          valA = (a.plannedHours || 0) - a.logs.reduce((s, l) => s + l.hours, 0);
          valB = (b.plannedHours || 0) - b.logs.reduce((s, l) => s + l.hours, 0);
          break;
        case 'creator':
          const getCreator = (task) => {
            const id = task.history?.find(h => h.who !== 'system')?.who || task.history?.[0]?.who;
            return id ? db.employees.find(e => e.id === id)?.last || '' : '';
          };
          valA = getCreator(a).toLowerCase();
          valB = getCreator(b).toLowerCase();
          break;
        case 'deadline':
          valA = a.deadline || '';
          valB = b.deadline || '';
          break;
        case 'created':
        default:
          valA = a.history?.[0]?.ts || 0;
          valB = b.history?.[0]?.ts || 0;
          break;
      }
      if (valA < valB) return taskSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return taskSortDir === 'asc' ? 1 : -1;
      return 0;
    };
    list.sort(sortFn);
    return list;
  }, [db, projectId, ur.id, isExec, existing, taskSortField, taskSortDir]);

  const handleSort = (field) => {
    if (taskSortField === field) {
      setTaskSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTaskSortField(field);
      setTaskSortDir('asc');
    }
  };

  const canComment = hasRole(ur, 'admin', 'director', 'kb_chief', 'project_lead', 'project_manager');
  const isProjectManager = existing && existing.managerId === ur.id;
  const canCommentFinal = canComment || isProjectManager;

  const canUploadFiles = hasRole(ur, 'admin', 'director', 'project_manager') || (existing && existing.managerId === ur.id);

  const candidates = useMemo(() => {
    const ids = new Set(
      db.tasks
        .filter((t) => t.projectId === f.id)
        .map((t) => t.assigneeId)
        .filter(Boolean)
    );
    if (f.managerId) ids.add(f.managerId);
    return [...ids]
      .map((id) => db.employees.find((e) => e.id === id))
      .filter(Boolean);
  }, [db, f.id, f.managerId]);

  const handleUpdateComments = (newComments) => {
    setF(prev => ({ ...prev, comments: newComments }));
    if (existing && store) {
      const updatedProject = { ...f, comments: newComments };
      store.upsertProject(updatedProject);
    }
  };

  const handleCommentAdded = () => {};

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("Файл слишком большой (максимум 10 МБ)", "err");
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileData = ev.target.result;
      const newFile = {
        id: uid(),
        name: file.name,
        size: file.size,
        url: fileData,
        uploadedBy: ur.id,
        uploadedAt: new Date().toISOString(),
      };
      const updatedFiles = [...(f.files || []), newFile];
      setF(prev => ({ ...prev, files: updatedFiles }));
      if (existing && store) {
        const updatedProject = { ...f, files: updatedFiles };
        store.upsertProject(updatedProject);
      }
      toast("Файл загружен");
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleFileDelete = (fileId) => {
    if (!window.confirm("Удалить файл?")) return;
    const updatedFiles = (f.files || []).filter(file => file.id !== fileId);
    setF(prev => ({ ...prev, files: updatedFiles }));
    if (existing && store) {
      const updatedProject = { ...f, files: updatedFiles };
      store.upsertProject(updatedProject);
    }
    toast("Файл удалён");
  };

  const priorityOptions = isAdminType ? ADMIN_PROJECT_PRIORITIES : PROJECT_PRIORITIES;

  return (
    <Modal title={existing ? (canEditFields ? "Проект (Редактирование)" : "Проект (Просмотр)") : "Новый проект"} onClose={onClose} width={760}>
      {existing && existing.archived && <div className="info-box">Этот проект находится в архиве. Редактирование недоступно.</div>}

      <div className="tabs sm">
        <button className={`tab${tab === 'info' ? ' on' : ''}`} onClick={() => setTab('info')}>Информация</button>
        <button className={`tab${tab === 'tasks' ? ' on' : ''}`} onClick={() => setTab('tasks')}>Задачи ({taskList.length})</button>
        <button className={`tab${tab === 'discussion' ? ' on' : ''}`} onClick={() => setTab('discussion')}>Обсуждение ({f.comments?.length || 0})</button>
        <button className={`tab${tab === 'files' ? ' on' : ''}`} onClick={() => setTab('files')}>Файлы ({f.files?.length || 0})</button>
      </div>

      {tab === 'info' && (
        <div className="project-info-fields">
          <div className="field-row">
            <label className="field-label">Название *</label>
            <input className="inp" disabled={!canEditFields} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="field-row">
            <label className="field-label">Описание</label>
            <textarea className="inp" rows="2" disabled={!canEditFields} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          </div>

          <div className="field-row">
            <label className="field-label">Заказчик *</label>
            <input className="inp" disabled={!canEditFields} value={f.customer} onChange={(e) => set("customer", e.target.value)} placeholder="Наименование заказчика" />
          </div>

          <div className="pj-pair-row">
            <div className="pj-pair-item">
              <label className="pj-pair-label">Тип проекта *</label>
              <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.ptype} onChange={(e) => set("ptype", e.target.value)}>
                {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="pj-pair-item">
              <label className="pj-pair-label">Код *</label>
              <input className="inp pj-pair-input" disabled={!canEditFields} value={f.code} onChange={(e) => set("code", e.target.value)} />
            </div>
          </div>

          {!isAdminType && (
            <div className="pj-pair-row">
              <div className="pj-pair-item">
                <label className="pj-pair-label">Тип ВС *</label>
                <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.aircraftType} onChange={(e) => set("aircraftType", e.target.value)}>
                  <option value="">— выберите —</option>
                  {AIRCRAFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="pj-pair-item">
                <label className="pj-pair-label">Категория *</label>
                <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.projectType} onChange={(e) => set("projectType", e.target.value)}>
                  <option value="">— выберите —</option>
                  {PROJECT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="pj-pair-row">
            <div className="pj-pair-item">
              <label className="pj-pair-label">Приоритет</label>
              <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.priority} onChange={(e) => handlePriorityChange(e.target.value)}>
                {Object.entries(priorityOptions).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="pj-pair-item">
              <label className="pj-pair-label">Подразделение</label>
              <select className="inp sel pj-pair-input" disabled={!canEditFields} value={f.kbId || ""} onChange={(e) => set("kbId", e.target.value)}>
                {isAdminType && <option value="">Общеорганизационный</option>}
                {db.kbs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
          </div>

          <div className="pj-pair-row">
            <div className="pj-pair-item">
              <label className="pj-pair-label">Дата начала *</label>
              <input className="inp pj-pair-input" type="date" disabled={!canEditFields} value={f.start} onChange={(e) => set("start", e.target.value)} />
            </div>
            <div className="pj-pair-item">
              <label className="pj-pair-label">Дата окончания {!isAdminType && "*"}</label>
              <input className="inp pj-pair-input" type="date" disabled={!canEditFields || isAdminType} value={f.end || ""} onChange={(e) => set("end", e.target.value)} />
            </div>
          </div>

          <div className="pj-pair-row">
            <div className="pj-pair-item">
              <label className="pj-pair-label">Бюджет, ч {!isAdminType && "*"}</label>
              <input 
                className="inp pj-pair-input" 
                type="number" 
                min="0" 
                step="0.5"
                disabled={!canEditFields} 
                value={f.budget ?? ""} 
                placeholder={isAdminType ? "опционально" : ""}
                onChange={(e) => set("budget", e.target.value === "" ? null : +e.target.value)} 
              />
            </div>
            <div className="pj-pair-item">
              <label className="pj-pair-label">Статус</label>
              <select className="inp sel pj-pair-input" disabled={!canChangeStatus} value={f.status || 'active'} onChange={(e) => set("status", e.target.value)}>
                {(existing ? statusOptions : creationStatusOptions).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {!isAdminType && (
            <div className="field-row">
              <label className="field-label">Ответственный *</label>
              <select className="inp sel" disabled={!canEditFields} value={f.managerId || ""} onChange={(e) => set("managerId", e.target.value)}>
                <option value="">— выберите —</option>
                {db.employees.map((e) => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && existing && (
        <div className="tm-block">
          <div className="tm-block-header">
            <div className="rep-panel-title">Задачи проекта ({taskList.length})</div>
            <button className="btn primary sm" onClick={() => openTask(null, 'form', null, existing.id)} disabled={existing.archived}>
              <Ic d={ICONS.plus} size={14} /> Создать задачу
            </button>
          </div>
          <div className="table-wrap">
            <table className="tbl tasks-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('title')}>
                    Задача {taskSortField === 'title' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('assignees')}>
                    Исполнитель {taskSortField === 'assignees' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('status')}>
                    Статус {taskSortField === 'status' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('planned')}>
                    План (ч) {taskSortField === 'planned' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('fact')}>
                    Факт (ч) {taskSortField === 'fact' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('remaining')}>
                    Остаток {taskSortField === 'remaining' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('creator')}>
                    Создал {taskSortField === 'creator' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('deadline')}>
                    Дедлайн {taskSortField === 'deadline' && (taskSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {taskList.map(t => {
                  const assignee = t.assigneeId ? db.employees.find(e => e.id === t.assigneeId) : null;
                  const creatorId = t.history?.length > 0 ? t.history.find(h => h.who !== 'system')?.who || t.history[0]?.who : null;
                  const creator = creatorId ? db.employees.find(e => e.id === creatorId) : null;
                  const spent = getTaskSpent(t);
                  const remaining = (t.plannedHours || 0) - spent;
                  return (
                    <tr key={t.id} className="clickable-row" onClick={() => { onClose(); openTask(t.id); }}>
                      <td><b>{t.title}</b></td>
                      <td>{assignee ? `${assignee.last} ${assignee.first}` : '—'}</td>
                      <td><span className="st-chip" style={{ background: TASK_STATUSES[t.status].color + '22', color: TASK_STATUSES[t.status].color }}>{TASK_STATUSES[t.status].label}</span></td>
                      <td>{t.plannedHours ?? '—'}</td>
                      <td>{spent}</td>
                      <td className={remaining < 0 ? 'text-danger' : ''}>{t.plannedHours ? remaining : '—'}</td>
                      <td className="mut sm">{creator ? `${creator.last} ${creator.first}` : 'Система'}</td>
                      <td className="mut sm">{t.deadline ? fmtDMY(t.deadline) : '—'}</td>
                    </tr>
                  );
                })}
                {taskList.length === 0 && <tr><td colSpan="8" className="mut text-center">Нет задач</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="project-meta">
            Проект создан: {existing && existing.history?.length > 0 ? (() => {
              const creatorId = existing.history.find(h => h.who !== 'system')?.who || existing.history[0]?.who;
              const creator = creatorId ? db.employees.find(e => e.id === creatorId) : null;
              return `${creator ? creator.last + ' ' + creator.first : '—'}, ${fmtDT(existing.history[0].ts)}`;
            })() : '—'}
          </div>
        </div>
      )}

      {tab === 'discussion' && (
        <Discussion
          comments={f.comments || []}
          currentUser={ur}
          candidates={candidates}
          onUpdateComments={handleUpdateComments}
          onCommentAdded={handleCommentAdded}
          readOnly={existing?.archived}
          canComment={canCommentFinal}
          toast={toast}
          employees={db.employees}
        />
      )}

      {tab === 'files' && (
        <div className="tm-block">
          <div className="rep-panel-title">Файлы проекта</div>
          {!existing?.archived && canUploadFiles && (
            <div className="toolbar">
              <input type="file" id="file-upload-input" className="file-input-hidden" onChange={handleFileUpload} />
              <label htmlFor="file-upload-input" className="btn primary sm">
                <Ic d={ICONS.file} size={14} /> Выбрать файл
              </label>
            </div>
          )}
          {(!f.files || f.files.length === 0) && (
            <div className="mut sm">Файлы не загружены</div>
          )}
          {f.files && f.files.length > 0 && (
            <div className="files-list">
              {f.files.map(file => {
                const uploader = db.employees.find(e => e.id === file.uploadedBy);
                const fileSize = file.size < 1024 ? file.size + ' Б' : file.size < 1048576 ? (file.size / 1024).toFixed(1) + ' КБ' : (file.size / 1048576).toFixed(1) + ' МБ';
                return (
                  <div key={file.id} className="file-item">
                    <Ic d={ICONS.file} size={24} />
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-meta">{fileSize} · загрузил {uploader ? `${uploader.last} ${uploader.first}` : '—'} {file.uploadedAt ? fmtDMY(file.uploadedAt) : ''}</div>
                    </div>
                    <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer" className="btn ghost sm">Скачать</a>
                    {!existing?.archived && canUploadFiles && (
                      <button className="icon-btn danger" onClick={() => handleFileDelete(file.id)} title="Удалить файл">
                        <Ic d={ICONS.trash} size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="modal-foot">
        {existing && hasRole(ur, 'admin') && !existing.archived && (
          <button className="btn danger" onClick={() => onDelete(existing)}>
            <Ic d={ICONS.trash} size={14} /> Удалить
          </button>
        )}
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Закрыть</button>
        {(isNew || canEditFields || canChangeStatus) && !existing?.archived && (
          <button className="btn primary" onClick={save}>{isNew ? "Создать проект" : "Сохранить изменения"}</button>
        )}
        {existing && !canEditFields && !canChangeStatus && <span className="mut sm">Режим только для чтения</span>}
      </div>
    </Modal>
  );
};
```
### `src/components/Modals/RolesModal.jsx`
```javascript
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { ROLES } from '../../utils/constants';

export const RolesModal = ({ db, setDb, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  if (!emp) return null;

  const [roles, setRoles] = useState(emp.roles || []);
  const [kbIds, setKbIds] = useState(emp.kbIds || []);
  const [headDeptIds, setHeadDeptIds] = useState(emp.headDeptIds || []);

  const toggle = (r) => setRoles((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));

  const save = () => {
    // Если роль kb_chief активна, очищаем отделы (главные конструкторы не имеют отделов)
    let updatedDepartments = emp.departments;
    if (roles.includes("kb_chief")) {
      updatedDepartments = [];
    }

    setDb((s) => ({
      ...s,
      employees: s.employees.map((e) =>
        e.id === empId
          ? {
              ...e,
              roles,
              kbIds: roles.includes("kb_chief") ? kbIds : [],
              headDeptIds: roles.includes("head") ? headDeptIds : [],
              departments: updatedDepartments,
            }
          : e
      ),
    }));

    audit(
      "Назначение ролей",
      `${emp.last} ${emp.first}: ${roles.map((r) => ROLES[r]?.short || r).join(", ")}`
    );
    toast("Роли сохранены");
    onClose();
  };

  return (
    <Modal title={`Роли — ${emp.last} ${emp.first}`} onClose={onClose} width={520}>
      <p className="mut sm">
        Сотрудник может иметь несколько ролей. Для «Главного конструктора» укажите КБ, для «Руководителя отдела» — перечень отделов.
      </p>
      <div className="roles-list">
        {Object.entries(ROLES).map(([k, v]) => (
          <div key={k}>
            <label className="roles-item">
              <input type="checkbox" checked={roles.includes(k)} onChange={() => toggle(k)} />
              <span className="role-chip" style={{ background: v.color + "1e", color: v.color }}>
                {v.short}
              </span>
              {v.label}
            </label>

            {k === "kb_chief" && roles.includes("kb_chief") && (
              <div className="sub-picks">
                {db.kbs.map((kb) => (
                  <label key={kb.id} className="dept-pick">
                    <input
                      type="checkbox"
                      checked={kbIds.includes(kb.id)}
                      onChange={() =>
                        setKbIds((s) =>
                          s.includes(kb.id) ? s.filter((x) => x !== kb.id) : [...s, kb.id]
                        )
                      }
                    />
                    {kb.name}
                  </label>
                ))}
              </div>
            )}

            {k === "head" && roles.includes("head") && (
              <div className="sub-picks">
                {db.departments.map((d) => (
                  <label key={d.id} className="dept-pick">
                    <input
                      type="checkbox"
                      checked={headDeptIds.includes(d.id)}
                      onChange={() =>
                        setHeadDeptIds((s) =>
                          s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id]
                        )
                      }
                    />
                    {d.name}
                    {d.kbId ? ` (${db.kbs.find((x) => x.id === d.kbId)?.name})` : ""}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить роли</button>
      </div>
    </Modal>
  );
};
```
### `src/components/Modals/TaskModal.jsx`
```javascript
// src/components/modals/TaskModal.jsx
import React, { useState, useMemo } from 'react';
import { Modal } from '../Modal';
import Discussion, { extractMentions } from '../Discussion';
import { useDataHelpers } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import {
  TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, DEPENDENCY_TYPES,
} from '../../utils/constants';
import {
  TODAY, fmtDMY, fmtDT, iso, addDays, addMonths, addYears, uid, fmtD, parseISO,
} from '../../utils/date';
import {
  canCreateTask, canEditTaskFields, hasRole, has,
  assigneeOptions, computeScope, canChangeTaskStatus,
} from '../../utils/permissions';
import { Ic, ICONS } from '../Icons';
import Avatar from '../Avatar';

function generateRepeatDates(startDate, deadline, repeatConfig, endDate, maxCount = 100) {
  const { type, interval, days, endType, endValue } = repeatConfig;
  const result = [];
  let currentStart = new Date(startDate);
  let currentDeadline = deadline ? new Date(deadline) : null;
  let count = 0;

  if (type === 'none') {
    return [{ start: iso(currentStart), deadline: deadline ? iso(currentDeadline) : null }];
  }

  const endDateObj = endType === 'date' ? new Date(endValue) : null;
  const maxCountLimit = endType === 'count' ? parseInt(endValue, 10) : null;

  while (count < maxCount) {
    result.push({
      start: iso(currentStart),
      deadline: currentDeadline ? iso(currentDeadline) : null
    });
    count++;

    let shouldStop = false;
    if (endType === 'date' && endDateObj && currentStart >= endDateObj) {
      shouldStop = true;
    }
    if (endType === 'count' && count >= maxCountLimit) {
      shouldStop = true;
    }
    if (shouldStop) break;
    if (count >= maxCount) break;

    let nextStart = new Date(currentStart);
    let nextDeadline = currentDeadline ? new Date(currentDeadline) : null;

    switch (type) {
      case 'daily':
        nextStart = addDays(currentStart, interval || 1);
        if (nextDeadline) nextDeadline = addDays(currentDeadline, interval || 1);
        break;
      case 'weekly_days': {
        const dayNumbers = days.map(d => parseInt(d, 10));
        const currentDay = currentStart.getDay() || 7;
        let found = false;
        for (let i = 1; i <= 7; i++) {
          const nextDay = new Date(currentStart);
          nextDay.setDate(currentStart.getDate() + i);
          const dayOfWeek = nextDay.getDay() || 7;
          if (dayNumbers.includes(dayOfWeek)) {
            nextStart = nextDay;
            if (nextDeadline) {
              nextDeadline = addDays(nextDeadline, i);
            }
            found = true;
            break;
          }
        }
        if (!found) {
          const nextWeek = addDays(currentStart, 7);
          nextStart = nextWeek;
          if (nextDeadline) nextDeadline = addDays(currentDeadline, 7);
        }
        break;
      }
      case 'workdays': {
        let next = addDays(currentStart, 1);
        while (next.getDay() === 0 || next.getDay() === 6) {
          next = addDays(next, 1);
        }
        nextStart = next;
        if (nextDeadline) {
          let nd = addDays(currentDeadline, 1);
          while (nd.getDay() === 0 || nd.getDay() === 6) {
            nd = addDays(nd, 1);
          }
          nextDeadline = nd;
        }
        break;
      }
      case 'monthly':
        nextStart = addMonths(currentStart, interval || 1);
        if (nextDeadline) nextDeadline = addMonths(currentDeadline, interval || 1);
        break;
      case 'yearly':
        nextStart = addYears(currentStart, interval || 1);
        if (nextDeadline) nextDeadline = addYears(currentDeadline, interval || 1);
        break;
      case 'custom':
        nextStart = addDays(currentStart, interval || 1);
        if (nextDeadline) nextDeadline = addDays(currentDeadline, interval || 1);
        break;
      default:
        break;
    }

    if (nextStart <= currentStart) break;
    currentStart = nextStart;
    currentDeadline = nextDeadline;
  }

  return result;
}

export const TaskModal = ({ 
  db, ur, taskId, initialTab = 'form', parentTaskId, initialProjectId,
  onClose, onSave, onDelete, onHoursReq, patchTask, notify, store,
  openTask,
  spent, planSum, 
}) => {
  const { showToast } = useToast();
  const { empName, getTaskSpent, vacOverlap, primaryDept } = useDataHelpers(db);
  const existing = taskId ? db.tasks.find((t) => t.id === taskId) : null;
  const isNew = !existing;
  const isSubtask = !isNew ? !!existing.parentTaskId : !!parentTaskId;
  
  const readOnly = !!(existing && existing.archived);
  
  const canEditFields = !readOnly && (existing ? canEditTaskFields(ur, existing, db) : canCreateTask(ur));
  const canChangeStatus = !readOnly && existing && canChangeTaskStatus(ur, existing, null, db);
  const isAssignee = existing && (existing.assigneeIds || []).includes(ur.id);
  const canEditPlannedHours = hasRole(ur, 'admin') && !isAssignee;
  const isAuthor = existing && existing.creatorId === ur.id;
  const isReview = existing && existing.status === 'review';
  
  const scope = computeScope(ur, db) || { all: false, empIds: new Set(), projIds: new Set() };
  const projs = (scope.all ? db.projects : db.projects.filter((p) => scope.projIds.has(p.id))).filter((p) => p.status === "active" && !p.archived);
  const asOpts = assigneeOptions(ur, db);
  
  const initialForm = existing ? { ...existing } : {
    id: "t_" + uid(),
    title: "",
    desc: "",
    projectId: initialProjectId || "",
    assigneeId: null,                       // <-- один исполнитель
    priority: "mid",
    plannedHours: 8,
    start: TODAY,
    deadline: iso(addDays(new Date(), 14)),
    status: "new",
    logs: [],
    comments: [],
    history: [],
    delegatedFrom: null,
    archived: false,
    archivedAt: null,
    closedAt: null,
    creatorId: ur.id,
    dependencyId: null,
    dependencyType: 'FS',
    repeatType: 'none',
    repeatInterval: 1,
    repeatDays: [],
    repeatEndType: 'date',
    repeatEndValue: '',
    files: [],
    isSummary: false,
    parentTaskId: null,
  };

  if (parentTaskId && isNew) {
    const parent = db.tasks.find(t => t.id === parentTaskId);
    if (parent) {
      initialForm.parentTaskId = parentTaskId;
      initialForm.isSummary = false;
      initialForm.projectId = parent.projectId || '';
    }
  }

  const [f, setF] = useState(initialForm);
  const [logH, setLogH] = useState("");
  const [logNote, setLogNote] = useState("");
  const [logDate, setLogDate] = useState(TODAY);
  const [tab, setTab] = useState(initialTab);
  const [confirmVac, setConfirmVac] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  
  const proj = db.projects.find((p) => p.id === f.projectId);
  const isAdminProj = proj && proj.ptype === "admin";
  const sp = f.logs.reduce((s, l) => s + l.hours, 0);
  const remainProj = proj && proj.budget != null && !proj.archived ? proj.budget - (planSum(proj.id) - (existing ? (existing.plannedHours || 0) : 0)) : null;
  const vacWarn = !readOnly && f.assigneeId && f.deadline ? vacOverlap(f.assigneeId, f.start || f.deadline, f.deadline) : null;
  const isExec = existing && (existing.assigneeIds || []).includes(ur.id);
  
  const canLog = !readOnly && (existing ? isExec : f.assigneeId === ur.id);

  const statusOptions = useMemo(() => {
    if (isExec && !canChangeTaskStatus(ur, f, 'closed', db) && !canChangeTaskStatus(ur, f, 'cancelled', db)) {
      return TASK_STATUS_ORDER.filter(s => ['new', 'inwork', 'review'].includes(s));
    }
    return TASK_STATUS_ORDER;
  }, [isExec, f, ur, db]);

  const localPatchTask = (updatedTask) => {
    setF(prev => ({ ...prev, ...updatedTask }));
  };

  const ensureExecutorRole = (empId) => {
    const emp = db.employees.find(e => e.id === empId);
    if (emp && !emp.roles.includes('executor')) {
      const updated = { ...emp, roles: [...emp.roles, 'executor'] };
      store.upsertEmployee(updated);
    }
  };

  const candidates = useMemo(() => {
    const ids = new Set(
      db.tasks
        .filter((t) => t.projectId === f.projectId)
        .map((t) => t.assigneeIds || [])
        .flat()
    );
    const pj = db.projects.find((p) => p.id === f.projectId);
    if (pj && pj.managerId) ids.add(pj.managerId);
    return [...ids]
      .map((id) => db.employees.find((e) => e.id === id))
      .filter(Boolean);
  }, [db, f.projectId]);

  const handleUpdateComments = (newComments) => {
    const updatedTask = { ...f, comments: newComments };
    localPatchTask(updatedTask);
    if (existing) {
      patchTask(updatedTask);
    }
  };

  const handleCommentAdded = (comment) => {
    const mentioned = extractMentions(comment.text, db.employees);
    const pj = db.projects.find((p) => p.id === f.projectId);
    const subs = new Set(mentioned);
    if (f.assigneeId) subs.add(f.assigneeId);
    if (pj && pj.managerId) subs.add(pj.managerId);
    if (comment.parentId) {
      const parent = f.comments.find((x) => x.id === comment.parentId);
      if (parent) subs.add(parent.authorId);
    }
    subs.delete(ur.id);
    subs.forEach((uidX) =>
      notify(
        uidX,
        `${ur.last} ${ur.first}: новый комментарий к задаче «${f.title}»${
          mentioned.includes(uidX) ? " (вас упомянули)" : ""
        }.`
      )
    );
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Файл слишком большой (максимум 10 МБ)', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileData = ev.target.result;
      const newFile = {
        id: uid(),
        name: file.name,
        size: file.size,
        url: fileData,
        uploadedBy: ur.id,
        uploadedAt: new Date().toISOString(),
      };
      const updatedFiles = [...(f.files || []), newFile];
      setF(prev => ({ ...prev, files: updatedFiles }));
      if (existing && patchTask) {
        const updatedTask = { ...f, files: updatedFiles };
        patchTask(updatedTask);
      }
      showToast('Файл загружен', 'success');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleFileDelete = (fileId) => {
    if (!window.confirm('Удалить файл?')) return;
    const updatedFiles = (f.files || []).filter(file => file.id !== fileId);
    setF(prev => ({ ...prev, files: updatedFiles }));
    if (existing && patchTask) {
      const updatedTask = { ...f, files: updatedFiles };
      patchTask(updatedTask);
    }
    showToast('Файл удалён', 'info');
  };

  const hasSubtasks = useMemo(() => {
    return db.tasks.some(t => t.parentTaskId === f.id);
  }, [db.tasks, f.id]);

  const doSave = (newStatus) => {
    const history = [...(f.history || [])];
    const statusToSave = newStatus || f.status;
    if (existing && existing.status !== statusToSave) {
      history.push({ ts: Date.now(), who: ur.id, text: `Статус: ${TASK_STATUSES[existing.status].label} → ${TASK_STATUSES[statusToSave].label}` });
    }
    
    let finalStart = f.start;
    let finalDeadline = f.deadline;
    
    if (f.dependencyId && f.dependencyType) {
      const depTask = db.tasks.find(t => t.id === f.dependencyId);
      if (depTask) {
        switch (f.dependencyType) {
          case 'SS':
            finalStart = depTask.start;
            if (f.deadline && depTask.start) {
              const diffDays = Math.round((new Date(f.deadline) - new Date(f.start || TODAY)) / (1000 * 60 * 60 * 24));
              finalDeadline = iso(addDays(parseISO(depTask.start), diffDays));
            }
            break;
          case 'FF':
            if (depTask.deadline) {
              finalDeadline = depTask.deadline;
              if (f.start && f.deadline) {
                const duration = Math.round((new Date(f.deadline) - new Date(f.start)) / (1000 * 60 * 60 * 24));
                finalStart = iso(addDays(parseISO(depTask.deadline), -duration));
              }
            }
            break;
          case 'SF':
            if (depTask.start) {
              finalDeadline = depTask.start;
              if (f.start && f.deadline) {
                const duration = Math.round((new Date(f.deadline) - new Date(f.start)) / (1000 * 60 * 60 * 24));
                finalStart = iso(addDays(parseISO(depTask.start), -duration));
              }
            }
            break;
          case 'FS':
          default:
            if (depTask.deadline) {
              finalStart = depTask.deadline;
              if (f.deadline) {
                const diffDays = Math.round((new Date(f.deadline) - new Date(f.start || TODAY)) / (1000 * 60 * 60 * 24));
                finalDeadline = iso(addDays(parseISO(depTask.deadline), diffDays));
              }
            }
            break;
        }
      }
    }
    
    const newClosed = statusToSave === "closed" && (!existing || existing.status !== "closed");
    let taskToSave = {
      ...f,
      start: finalStart,
      deadline: finalDeadline,
      status: statusToSave,
      plannedHours: f.plannedHours === "" || f.plannedHours == null ? null : +f.plannedHours,
      closedAt: newClosed ? TODAY : (existing ? existing.closedAt : null),
      history,
      creatorId: existing ? existing.creatorId : ur.id,
      files: f.files || [],
    };

    if (hasSubtasks) {
      taskToSave.isSummary = true;
    }

    delete taskToSave.repeatType;
    delete taskToSave.repeatInterval;
    delete taskToSave.repeatDays;
    delete taskToSave.repeatEndType;
    delete taskToSave.repeatEndValue;

    try {
      if (!existing && f.repeatType !== 'none') {
        const repeatConfig = {
          type: f.repeatType,
          interval: parseInt(f.repeatInterval, 10) || 1,
          days: f.repeatDays.map(Number),
          endType: f.repeatEndType,
          endValue: f.repeatEndValue,
        };
        const startDate = f.start;
        const deadline = f.deadline;
        const dates = generateRepeatDates(startDate, deadline, repeatConfig, f.repeatEndValue, 50);
        dates.forEach((d, index) => {
          const taskCopy = {
            ...taskToSave,
            id: "t_" + uid(),
            start: d.start,
            deadline: d.deadline,
          };
          if (index === 0) {
            onSave({ ...taskCopy, id: taskToSave.id }, true);
          } else {
            onSave(taskCopy, true);
          }
        });
        onClose();
      } else {
        onSave(taskToSave, !existing);
      }
    } catch (error) {
      showToast(error.message || 'Ошибка сохранения задачи', 'error');
    }
  };

  const save = () => {
    if (!f.title.trim()) {
      showToast('Укажите название задачи', 'error');
      return;
    }
    if (!f.projectId) {
      showToast('Задача обязательно назначается в рамках проекта', 'error');
      return;
    }
    if (!f.assigneeId) {
      showToast('Выберите ответственного исполнителя', 'error');
      return;
    }
    if (!isAdminProj) {
      if (!f.plannedHours || +f.plannedHours <= 0) {
        showToast('Для производственного проекта плановые часы обязательны', 'error');
        return;
      }
      if (!f.deadline) {
        showToast('Для производственного проекта срок исполнения обязателен', 'error');
        return;
      }
    }

    // Проверка права на создание задачи (для новых и подзадач)
    if (!existing && !canCreateTask(ur)) {
      showToast('У вас нет прав на создание задач. Только ГК, ГД, Админ и Менеджер проектов.', 'error');
      return;
    }
    if (parentTaskId && !canCreateTask(ur)) {
      showToast('У вас нет прав на создание подзадач.', 'error');
      return;
    }

    const projForBudget = db.projects.find(p => p.id === f.projectId);
    if (projForBudget && projForBudget.budget != null && !projForBudget.archived && !isAdminProj) {
      const currentPlanSum = planSum(projForBudget.id);
      const newTotal = currentPlanSum + (+f.plannedHours || 0);
      if (newTotal > projForBudget.budget) {
        showToast(
          `Превышение бюджета проекта! Бюджет: ${projForBudget.budget} ч, текущая сумма задач: ${currentPlanSum} ч, запрошено: ${f.plannedHours || 0} ч. Уменьшите плановые часы.`,
          'error'
        );
        return;
      }
    }

    if (f.repeatType !== 'none') {
      if (f.repeatType === 'weekly_days' && (!f.repeatDays || f.repeatDays.length === 0)) {
        showToast('Выберите хотя бы один день недели', 'error');
        return;
      }
      if (f.repeatEndType === 'date' && !f.repeatEndValue) {
        showToast('Укажите дату окончания повторения', 'error');
        return;
      }
      if (f.repeatEndType === 'count' && (!f.repeatEndValue || parseInt(f.repeatEndValue, 10) <= 0)) {
        showToast('Укажите количество повторений', 'error');
        return;
      }
      if (f.repeatEndType === 'date' && f.repeatEndValue && f.repeatEndValue <= f.start) {
        showToast('Дата окончания должна быть позже даты начала', 'error');
        return;
      }
    }

    if (f.assigneeId) {
      ensureExecutorRole(f.assigneeId);
    }
    if (vacWarn) { setConfirmVac(vacWarn); return; }
    doSave(f.status);
  };

  const addLog = () => {
    const h = parseFloat(String(logH).replace(",", "."));
    if (!h || h <= 0) {
      showToast('Введите корректное количество часов', 'error');
      return;
    }
    if (f.plannedHours && sp + h > f.plannedHours) {
      showToast(`Нельзя внести больше плановых: доступно ещё ${Math.max(0, f.plannedHours - sp)} ч`, 'error');
      return;
    }
    const newLogs = [...f.logs, { id: uid(), userId: ur.id, date: logDate, hours: h, note: logNote.trim() }];
    setF((s) => ({ ...s, logs: newLogs }));
    setLogH("");
    setLogNote("");
    setLogDate(TODAY);
    showToast('Часы учтены', 'success');
  };

  const handleAccept = () => {
    if (!isAuthor || !isReview) return;
    doSave('closed');
  };
  const handleRework = () => {
    if (!isAuthor || !isReview) return;
    doSave('inwork');
  };

  const subtasks = useMemo(() => {
    return db.tasks.filter(t => t.parentTaskId === f.id);
  }, [db, f.id]);

  const parentTask = useMemo(() => {
    if (!f.parentTaskId) return null;
    return db.tasks.find(t => t.id === f.parentTaskId);
  }, [db, f.parentTaskId]);

  return (
    <Modal title={(readOnly ? "Архивная задача — только чтение" : existing ? "Карточка задачи" : "Новая задача")} onClose={onClose} width={760}>
      {readOnly && <div className="info-box">Задача в архиве с {fmtDMY(existing.archivedAt)}. Редактирование, изменение статусов и комментирование запрещены.</div>}
      <div className="tabs sm">
        {[
          ["form", "Данные"],
          ["time", `Учёт времени (${sp}/${f.plannedHours ?? "—"})`],
          ...((f.isSummary || hasSubtasks) ? [["subtasks", `Подзадачи (${subtasks.length})`]] : []),
          ...(existing ? [["chat", `Обсуждение (${f.comments.length})`], ["files", `Файлы (${f.files?.length || 0})`], ["hist", "История"]] : [])
        ].map(([id, l]) => 
          <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>
        )}
      </div>

      {tab === "form" && (
        <>
          {vacWarn && <div className="warn-box"><Ic d={ICONS.beach} size={15} /> Ответственный исполнитель находится в отпуске с {fmtDMY(vacWarn.start)} по {fmtDMY(vacWarn.end)}. Даты пересекаются с периодом задачи.</div>}
          {remainProj !== null && remainProj - (+f.plannedHours || 0) < 0 && <div className="warn-box">Внимание: задача превысит остаток бюджета проекта ({remainProj} ч). Потребуется утверждение ГД.</div>}
          {isAdminProj && !readOnly && <div className="info-box">Административный проект: срок исполнения и плановые часы задачи — по желанию.</div>}

          <div className="project-info-fields">
            {/* Название */}
            <div className="field-row">
              <label className="field-label">Название *</label>
              <input className="inp" disabled={!canEditFields} value={f.title} onChange={(e) => set("title", e.target.value)} />
            </div>

            {/* Суммарная задача */}
            <div className="field-row">
              <label className="field-label">Суммарная задача</label>
              <div className="duo" style={{ flex: 1 }}>
                <input
                  type="checkbox"
                  disabled={!canEditFields || hasSubtasks}
                  checked={hasSubtasks || f.isSummary}
                  onChange={(e) => set("isSummary", e.target.checked)}
                />
                <span className="mut sm">Отметьте, если эта задача содержит подзадачи</span>
              </div>
            </div>

            {/* Родительская задача */}
            {parentTask && (
              <div className="field-row">
                <label className="field-label">Родительская задача</label>
                <div className="duo" style={{ flex: 1 }}>
                  <input className="inp" disabled value={parentTask.title} />
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      onClose();
                      setTimeout(() => openTask(parentTask.id), 50);
                    }}
                  >
                    <Ic d={ICONS.external} size={14} /> Перейти
                  </button>
                </div>
              </div>
            )}

            {/* Описание */}
            <div className="field-row">
              <label className="field-label">Описание</label>
              <textarea className="inp" rows="2" disabled={!canEditFields} value={f.desc} onChange={(e) => set("desc", e.target.value)} />
            </div>

            {/* Проект — заблокирован, если передан initialProjectId */}
            <div className="field-row">
              <label className="field-label">Проект * <span className="mut">(активные)</span></label>
              {readOnly ? (
                <input className="inp" disabled value={proj ? `${proj.code} — ${proj.name}` : ""} />
              ) : initialProjectId ? (
                <input className="inp" disabled value={proj ? `${proj.code} — ${proj.name}` : ""} />
              ) : (
                <select className="inp sel" disabled={!canEditFields || isSubtask} value={f.projectId} onChange={(e) => set("projectId", e.target.value)} style={{ flex: 1 }}>
                  <option value="">— выберите проект —</option>
                  {projs.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}{p.ptype === "admin" ? " (административный)" : ""}</option>)}
                </select>
              )}
            </div>

            {/* Приоритет */}
            <div className="field-row">
              <label className="field-label">Приоритет *</label>
              <select className="inp sel" disabled={!canEditFields} value={f.priority} onChange={(e) => set("priority", e.target.value)} style={{ flex: 1 }}>
                {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Исполнитель (ответственный) — один select */}
            <div className="field-row">
              <label className="field-label">Ответственный *</label>
              {readOnly ? (
                <input className="inp" disabled value={empName(f.assigneeId)} />
              ) : (
                <select
                  className="inp sel"
                  disabled={!canEditFields}
                  value={f.assigneeId || ''}
                  onChange={(e) => set("assigneeId", e.target.value || null)}
                  style={{ flex: 1 }}
                >
                  <option value="">— выберите —</option>
                  {asOpts.map(e => (
                    <option key={e.id} value={e.id}>{e.last} {e.first}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Парная строка: Начало работы и Срок исполнения */}
            <div className="pj-pair-row">
              <div className="pj-pair-item">
                <label className="pj-pair-label">Начало работы</label>
                <input className="inp pj-pair-input" type="date" disabled={!canEditFields} value={f.start} onChange={(e) => set("start", e.target.value)} />
              </div>
              <div className="pj-pair-item">
                <label className="pj-pair-label">Срок исполнения {!isAdminProj && "*"}</label>
                <input className="inp pj-pair-input" type="date" disabled={!canEditFields} value={f.deadline || ""} onChange={(e) => set("deadline", e.target.value)} />
              </div>
            </div>

            {/* Парная строка: Плановые часы и Статус */}
            <div className="pj-pair-row">
              <div className="pj-pair-item">
                <label className="pj-pair-label">Плановые часы {!isAdminProj && "*"}</label>
                <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {f.isSummary ? (
                    <input className="inp" disabled value={f.plannedHours ?? 0} style={{ flex: 1, minWidth: '80px' }} />
                  ) : (
                    <input 
                      className="inp" 
                      type="number" 
                      min="0.5" 
                      step="0.5" 
                      disabled={!canEditPlannedHours} 
                      value={f.plannedHours ?? ""} 
                      onChange={(e) => set("plannedHours", e.target.value)} 
                      style={{ flex: 1, minWidth: '80px' }}
                    />
                  )}
                  {!readOnly && existing && !canEditPlannedHours && !f.isSummary && (
                    <button 
                      className="btn ghost sm" 
                      type="button" 
                      onClick={() => onHoursReq("task", existing.id)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Ic d={ICONS.clock} size={13} /> Запросить изменение
                    </button>
                  )}
                  {!existing && isAdminProj && (
                    <span className="duo-note">опционально</span>
                  )}
                  {f.isSummary && (
                    <span className="duo-note">(сумма подзадач)</span>
                  )}
                </div>
              </div>
              <div className="pj-pair-item">
                <label className="pj-pair-label">Статус *</label>
                <select className="inp sel pj-pair-input" disabled={!canChangeStatus && !isAuthor && !isExec} value={f.status} onChange={(e) => set("status", e.target.value)}>
                  {statusOptions.map((s) => <option key={s} value={s}>{TASK_STATUSES[s].label}</option>)}
                </select>
              </div>
            </div>

            {isExec && !canEditFields && !readOnly && (
              <div className="info-box">Исполнитель может переводить задачу в «В работе» и «На проверке»; закрытие и отмена — у ответственного/руководителя.</div>
            )}

            {/* Зависимости — поля одно под другим */}
            <div className="field-row">
              <label className="field-label">Зависит от задачи</label>
              <select
                className="inp sel"
                disabled={!canEditFields}
                value={f.dependencyId || ''}
                onChange={(e) => set("dependencyId", e.target.value || null)}
              >
                <option value="">— нет зависимости —</option>
                {db.tasks
                  .filter(t => t.id !== f.id && t.projectId === f.projectId && t.status !== 'closed' && t.status !== 'cancelled')
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))
                }
              </select>
            </div>

            <div className="field-row">
              <label className="field-label">Тип зависимости</label>
              <select
                className="inp sel"
                disabled={!canEditFields || !f.dependencyId}
                value={f.dependencyType || 'FS'}
                onChange={(e) => set("dependencyType", e.target.value)}
              >
                {Object.entries(DEPENDENCY_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label} — {val.desc}</option>
                ))}
              </select>
            </div>

            {remainProj !== null && <div className="budget-hint">Остаток бюджета проекта «{proj.code}»: <b>{remainProj} ч</b> из {proj.budget} ч</div>}
            
            {isAuthor && isReview && !readOnly && (
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn primary" onClick={handleAccept}><Ic d={ICONS.check} size={15} /> Принять (закрыть)</button>
                <button className="btn ghost" onClick={handleRework}><Ic d={ICONS.refresh} size={15} /> Отправить на доработку</button>
              </div>
            )}
          </div>

          {/* Блок Повторение (только для новых задач) */}
          {!existing && !readOnly && (
            <div className="tm-block" style={{ marginTop: '12px' }}>
              <div className="rep-panel-title">Повторение</div>
              <div className="project-info-fields" style={{ gap: '8px' }}>
                <div className="field-row">
                  <label className="field-label">Тип повторения</label>
                  <select className="inp sel" value={f.repeatType} onChange={(e) => set("repeatType", e.target.value)} style={{ flex: 1 }}>
                    <option value="none">Нет</option>
                    <option value="daily">Ежедневно</option>
                    <option value="weekly_days">Еженедельно по дням</option>
                    <option value="workdays">Каждый рабочий день</option>
                    <option value="monthly">Ежемесячно</option>
                    <option value="yearly">Ежегодно</option>
                    <option value="custom">Произвольно (через N дней)</option>
                  </select>
                </div>

                {f.repeatType === 'custom' && (
                  <div className="field-row">
                    <label className="field-label">Интервал (дней)</label>
                    <input className="inp" type="number" min="1" value={f.repeatInterval} onChange={(e) => set("repeatInterval", e.target.value)} style={{ flex: 1 }} />
                  </div>
                )}
                {f.repeatType === 'weekly_days' && (
                  <div className="field-row">
                    <label className="field-label">Дни недели</label>
                    <div className="duo" style={{ flex: 1, flexWrap: 'wrap', gap: '6px' }}>
                      {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((day, idx) => {
                        const dayNum = idx + 1;
                        const checked = f.repeatDays.includes(String(dayNum));
                        return (
                          <label key={dayNum} className="dept-pick" style={{ margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const newDays = checked
                                  ? f.repeatDays.filter(d => d !== String(dayNum))
                                  : [...f.repeatDays, String(dayNum)];
                                set("repeatDays", newDays);
                              }}
                            />
                            {day}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {f.repeatType !== 'none' && (
                  <div className="field-row">
                    <label className="field-label">Окончание</label>
                    <div className="duo" style={{ flex: 1, display: 'flex', gap: '8px' }}>
                      <select className="inp sel" value={f.repeatEndType} onChange={(e) => set("repeatEndType", e.target.value)} style={{ width: '120px' }}>
                        <option value="date">По дате</option>
                        <option value="count">По количеству</option>
                      </select>
                      {f.repeatEndType === 'date' ? (
                        <input className="inp" type="date" value={f.repeatEndValue} onChange={(e) => set("repeatEndValue", e.target.value)} style={{ flex: 1 }} />
                      ) : (
                        <input className="inp" type="number" min="1" value={f.repeatEndValue} onChange={(e) => set("repeatEndValue", e.target.value)} placeholder="кол-во" style={{ width: '100px' }} />
                      )}
                      <span className="mut sm" style={{ alignSelf: 'center' }}>всего {f.repeatEndType === 'count' ? 'задач' : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "time" && (
        <div className="tm-block" style={{ marginTop: 0 }}>
          <div className="tm-progress"><div className="tm-progress-fill" style={{ width: Math.min(100, (sp / Math.max(1, f.plannedHours || 0)) * 100) + "%" }} /></div>
          {f.logs.length > 0 && (
            <div className="tm-logs">
              {f.logs.map((l) => (
                <div key={l.id} className="tm-log">
                  <span className="tm-log-name">{empName(l.userId)}</span>
                  <span className="mut">{fmtD(l.date)}</span>
                  <span className="tm-log-note">{l.note}</span>
                  <b className="tm-log-h">{l.hours} ч</b>
                </div>
              ))}
            </div>
          )}
          {canLog ? (
            <>
              <div className="tm-add">
                <input
                  className="inp"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  max={TODAY}
                  style={{ width: '150px' }}
                />
                <input
                  className="inp"
                  style={{ width: 90 }}
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="часы"
                  value={logH}
                  onChange={(e) => setLogH(e.target.value)}
                />
                <input
                  className="inp"
                  placeholder="комментарий"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                />
                <button className="btn ghost" onClick={addLog}>
                  <Ic d={ICONS.clock} size={14} /> Внести часы
                </button>
              </div>
              <div className="mut sm" style={{ marginTop: 8 }}>
                {f.plannedHours ? `Часы не могут превышать плановые: доступно ещё ${Math.max(0, f.plannedHours - sp)} ч.` : "Плановые часы не заданы — ограничение не применяется."}
                <br />
                <span style={{ fontSize: '13px', color: 'var(--mut)' }}>Выберите дату за прошлые дни или сегодня (будущие даты недоступны).</span>
              </div>
            </>
          ) : <div className="mut sm">{readOnly ? "Учёт часов для архивных задач недоступен." : "Часы вносит только исполнитель задачи."}</div>}
        </div>
      )}

      {tab === "subtasks" && (f.isSummary || hasSubtasks) && (
        <div className="tm-block" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="rep-panel-title">Подзадачи</div>
            <button
              className="btn primary sm"
              onClick={() => {
                onClose();
                setTimeout(() => openTask(null, 'form', f.id), 50);
              }}
              disabled={f.archived}
            >
              <Ic d={ICONS.plus} size={14} /> Создать подзадачу
            </button>
          </div>
          {subtasks.length === 0 ? (
            <div className="mut sm">Нет подзадач</div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 500, fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Статус</th>
                    <th>Исполнители</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {subtasks.map(sub => (
                    <tr key={sub.id}>
                      <td><b>{sub.title}</b></td>
                      <td><span className="st-chip" style={{ background: TASK_STATUSES[sub.status]?.color + '22', color: TASK_STATUSES[sub.status]?.color }}>{TASK_STATUSES[sub.status]?.label}</span></td>
                      <td>{sub.assigneeId ? empName(sub.assigneeId) : '—'}</td>
                      <td>
                        <button 
                          className="btn ghost sm" 
                          onClick={() => {
                            onClose();
                            setTimeout(() => {
                              if (typeof openTask === 'function') {
                                openTask(sub.id);
                              } else {
                                console.error('openTask не функция');
                              }
                            }, 50);
                          }}
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "chat" && existing && (
        <Discussion
          comments={f.comments || []}
          currentUser={ur}
          candidates={candidates}
          onUpdateComments={handleUpdateComments}
          onCommentAdded={handleCommentAdded}
          readOnly={readOnly}
          canComment={!readOnly}
          toast={showToast}
          employees={db.employees}
        />
      )}

      {tab === "files" && (
        <div className="tm-block" style={{ marginTop: 0 }}>
          <div className="rep-panel-title">Файлы задачи</div>
          {!readOnly && (canEditFields || f.assigneeId === ur.id || f.creatorId === ur.id) && (
            <div className="toolbar">
              <input
                type="file"
                id="task-file-upload-input"
                className="file-input-hidden"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="task-file-upload-input" className="btn primary sm">
                <Ic d={ICONS.file} size={14} /> Выбрать файл
              </label>
            </div>
          )}
          {(!f.files || f.files.length === 0) && (
            <div className="mut sm">Файлы не загружены</div>
          )}
          {f.files && f.files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {f.files.map(file => {
                const uploader = db.employees.find(e => e.id === file.uploadedBy);
                const fileSize = file.size < 1024
                  ? file.size + ' Б'
                  : file.size < 1048576
                    ? (file.size / 1024).toFixed(1) + ' КБ'
                    : (file.size / 1048576).toFixed(1) + ' МБ';
                return (
                  <div
                    key={file.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)'
                    }}
                  >
                    <Ic d={ICONS.file} size={24} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{file.name}</div>
                      <div className="mut sm">
                        {fileSize} · загрузил {uploader ? `${uploader.last} ${uploader.first}` : '—'}{' '}
                        {file.uploadedAt ? fmtDMY(file.uploadedAt) : ''}
                      </div>
                    </div>
                    <a
                      href={file.url}
                      download={file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn ghost sm"
                    >
                      Скачать
                    </a>
                    {!readOnly && (canEditFields || f.assigneeId === ur.id || f.creatorId === ur.id) && (
                      <button
                        className="icon-btn danger"
                        onClick={() => handleFileDelete(file.id)}
                        title="Удалить файл"
                      >
                        <Ic d={ICONS.trash} size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "hist" && existing && (
        <div className="tm-logs" style={{ maxHeight: 260 }}>
          {[...f.history].reverse().map((h, i) => (
            <div key={i} className="tm-log"><span className="tm-log-name">{h.who === "system" ? "Система" : empName(h.who)}</span><span className="mut sm">{fmtDT(h.ts)}</span><span className="tm-log-note">{h.text}</span></div>
          ))}
        </div>
      )}

      <div className="modal-foot">
        <div className="spacer" />
        {!readOnly && (canEditFields || isExec) ? (
          <>
            <button className="btn ghost" onClick={onClose}>Отмена</button>
            <button className="btn primary" onClick={save}>{existing ? "Сохранить" : "Создать задачу"}</button>
          </>
        ) : (
          <button className="btn ghost" onClick={onClose}>Закрыть</button>
        )}
        {existing && canEditFields && !readOnly && (
          <button className="btn danger" onClick={() => onDelete(existing.id)}>
            <Ic d={ICONS.trash} size={14} /> Удалить
          </button>
        )}
      </div>

      {confirmVac && (
        <Modal title="Конфликт с отпуском исполнителя" onClose={() => setConfirmVac(null)} width={460}>
          <p>Ответственный исполнитель находится в отпуске с {fmtDMY(confirmVac.start)} по {fmtDMY(confirmVac.end)}. Вы уверены, что хотите назначить задачу?</p>
          <div className="modal-foot">
            <div className="spacer" />
            <button className="btn ghost" onClick={() => setConfirmVac(null)}>Отмена</button>
            <button className="btn primary" onClick={() => { setConfirmVac(null); doSave(f.status); }}>Назначить</button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
```
### `src/components/Modals/VacationModal.jsx`
```javascript
// VacationModal.jsx
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useDataHelpers } from '../../hooks';
import { VACATION_TYPES, TASK_STATUSES } from '../../utils/constants';
import { TODAY, iso, addDays, uid, fmtDMY } from '../../utils/date';
import { canManageAllVacations } from '../../utils/permissions';
import { getPrimaryDeptName } from '../../utils/helpers'; // <-- добавлен импорт

export const VacationModal = ({ db, ur, vacationId, forEmpId, onClose, onSave }) => {
  const existing = vacationId ? db.vacations.find((v) => v.id === vacationId) : null;
  const canPick = canManageAllVacations(ur);
  const { empName, primaryDept } = useDataHelpers(db);
  const [f, setF] = useState(existing ? { ...existing, delegation: { ...existing.delegation } } : {
    id: "v_" + uid(), empId: forEmpId || ur.id, start: TODAY, end: iso(addDays(new Date(), 7)), type: "annual", comment: "",
    status: canManageAllVacations(ur) && forEmpId ? "approved" : "pending",
    delegation: { enabled: false, subId: "", statuses: [], state: null },
  });
  const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const save = () => {
    setError('');
    if (!f.start || !f.end || f.end < f.start) {
      setError('Даты указаны некорректно');
      return;
    }
    if (f.delegation.enabled && !f.delegation.subId) {
      setError('Для делегирования необходимо выбрать замещающего сотрудника');
      return;
    }
    onSave({ ...f }, !existing);
  };

  // Для выбора сотрудника (если есть право)
  const renderEmployeeSelect = () => {
    if (!canPick) return null;
    return (
      <>
        <label className="lbl">Сотрудник *</label>
        <select className="inp sel" value={f.empId} onChange={(e) => set("empId", e.target.value)}>
          {db.employees.map((e) => (
            <option key={e.id} value={e.id}>
              {empName(e.id)} — {getPrimaryDeptName(e, db)}
            </option>
          ))}
        </select>
      </>
    );
  };

  return (
    <Modal title={existing ? "Отпуск" : "Новый отпуск"} onClose={onClose} width={560}>
      {error && <div className="login-err">{error}</div>}
      <div className="form-grid">
        {renderEmployeeSelect()}
        <label className="lbl">Дата начала *</label><input className="inp" type="date" value={f.start} onChange={(e) => set("start", e.target.value)} />
        <label className="lbl">Дата окончания *</label><input className="inp" type="date" value={f.end} onChange={(e) => set("end", e.target.value)} />
        <label className="lbl">Тип отпуска *</label>
        <select className="inp sel" value={f.type} onChange={(e) => set("type", e.target.value)}>
          {Object.entries(VACATION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="lbl">Комментарий</label><input className="inp" value={f.comment} onChange={(e) => set("comment", e.target.value)} />
        {canManageAllVacations(ur) && (
          <>
            <label className="lbl">Статус</label>
            <select className="inp sel" value={f.status} onChange={(e) => set("status", e.target.value)}>
              <option value="pending">На утверждении</option>
              <option value="approved">Утверждён</option>
              <option value="rejected">Отклонён</option>
            </select>
          </>
        )}
      </div>
      <div className="tm-block">
        <label className="roles-item" style={{ border: "none", padding: 0 }}>
          <input type="checkbox" checked={f.delegation.enabled} onChange={(e) => {
            set("delegation", { ...f.delegation, enabled: e.target.checked });
            if (!e.target.checked) set("delegation", { ...f.delegation, enabled: false, subId: "" });
          }} />
          <b>Делегировать задачи на время отпуска</b>
        </label>
        {f.delegation.enabled && (
          <>
            <label className="lbl">Замещающий сотрудник *</label>
            <select
              className="inp sel"
              value={f.delegation.subId}
              onChange={(e) => set("delegation", { ...f.delegation, subId: e.target.value })}
              style={{ borderColor: f.delegation.enabled && !f.delegation.subId ? '#dc2626' : '' }}
            >
              <option value="">— выберите —</option>
              {db.employees.filter((e) => e.id !== f.empId).map((e) => (
                <option key={e.id} value={e.id}>{empName(e.id)} — {getPrimaryDeptName(e, db)}</option>
              ))}
            </select>
            {f.delegation.enabled && !f.delegation.subId && (
              <div className="error-message show" style={{ gridColumn: '2' }}>Выберите замещающего сотрудника</div>
            )}
            <label className="lbl">Какие задачи делегировать</label>
            <div className="sub-picks">
              {["new", "inwork", "review"].map((st) => (
                <label key={st} className="dept-pick">
                  <input type="checkbox" checked={f.delegation.statuses.includes(st)} onChange={() => set("delegation", { ...f.delegation, statuses: f.delegation.statuses.includes(st) ? f.delegation.statuses.filter((x) => x !== st) : [...f.delegation.statuses, st] })} />
                  {TASK_STATUSES[st].label}
                </label>
              ))}
              <span className="mut sm">пусто = все активные задачи</span>
            </div>
            <p className="mut sm">Делегирование утверждает руководитель до начала отпуска. Задачи вернутся автоматически после окончания отпуска. Задачи, где сотрудник — ответственный по проекту, передаются только через делегирование ролей.</p>
          </>
        )}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить</button>
      </div>
    </Modal>
  );
};
```
### `src/components/Modals/VacNowModal.jsx`
```javascript
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useDataHelpers } from '../../hooks';
import { VACATION_TYPES } from '../../utils/constants';
import { TODAY, fmtDMY } from '../../utils/date';

export const VacNowModal = ({ db, onClose, toast }) => {
  const [fDept, setFDept] = useState("all");
  const [sort, setSort] = useState("start");
  const [, setTick] = useState(0);
  const { primaryDept, empName } = useDataHelpers(db);

  const rows = db.vacations
    .filter((v) => v.status === "approved" && v.start <= TODAY && TODAY <= v.end)
    .map((v) => {
      const e = db.employees.find((x) => x.id === v.empId);
      return { v, e, dept: primaryDept(e) };
    })
    .filter((r) => fDept === "all" || (r.dept && r.dept.id === fDept))
    .sort((a, b) => (sort === "start" ? (a.v.start < b.v.start ? -1 : 1) : (a.v.end < b.v.end ? -1 : 1)));

  return (
    <Modal title="Сотрудники в отпусках (сейчас)" onClose={onClose} width={880}>
      <div className="toolbar">
        <select className="inp sel sm" value={fDept} onChange={(e) => setFDept(e.target.value)}>
          <option value="all">Все подразделения</option>
          {db.departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <div className="seg sm">
          <button className={"seg-btn" + (sort === "start" ? " on" : "")} onClick={() => setSort("start")}>
            по началу
          </button>
          <button className={"seg-btn" + (sort === "end" ? " on" : "")} onClick={() => setSort("end")}>
            по окончанию
          </button>
        </div>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={() => { setTick((x) => x + 1); toast("Список обновлён"); }}>
          ⟳ Обновить
        </button>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Подразделение (основное)</th>
            <th>Начало</th>
            <th>Окончание</th>
            <th>Тип</th>
            <th>Делегирование</th>
            <th>Комментарий</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const delegationText = r.v.delegation.enabled
              ? `→ ${empName(r.v.delegation.subId)}`
              : '—';
            return (
              <tr key={r.v.id}>
                <td><b>{r.e ? `${r.e.last} ${r.e.first}` : "—"}</b></td>
                <td>{r.dept?.name || "—"}</td>
                <td>{fmtDMY(r.v.start)}</td>
                <td>{fmtDMY(r.v.end)}</td>
                <td>{VACATION_TYPES[r.v.type]}</td>
                <td>{delegationText}</td>
                <td className="mut">{r.v.comment || "—"}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan="7" className="mut">Сейчас никто не находится в отпуске</td>
            </tr>
          )}
        </tbody>
      </table>
    </Modal>
  );
};
```
## `src/assets/`
- **Folder:** `assets/`
