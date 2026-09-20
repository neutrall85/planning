// src/utils/routes.js
//
// Чистый модуль: превращает состояние навигации (view / открытая
// задача / проект + активная вкладка) в хэш-фрагмент URL и обратно.
// Единственное место, знающее форму ссылки. Ни React, ни DOM, ни
// домен задач здесь нет - только строки.
//
// Формат (hash-роутинг - не требует rewrite-правил на хостинге):
//   #/view/<viewId>
//   #/task/<taskId>/<tab>
//   #/project/<projectId>/<tab>
//
// Переход на History API затронет только этот файл.

export const ROUTE = Object.freeze({
  VIEW: 'view',
  TASK: 'task',
  PROJECT: 'project',
});

// Вкладка по умолчанию - используется, когда в фрагменте её нет,
// и когда указанная вкладка не входит в белый список.
export const DEFAULT_TAB = Object.freeze({
  [ROUTE.TASK]: 'form',
  [ROUTE.PROJECT]: 'info',
});

// Белый список вкладок. Фрагмент вроде "#/task/t1/admin" не должен
// протаскивать произвольную строку в приложение - неизвестная вкладка
// схлопывается к значению по умолчанию.
export const TABS = Object.freeze({
  [ROUTE.TASK]: Object.freeze(['form', 'time', 'subtasks', 'chat', 'files', 'hist', 'notes']),
  [ROUTE.PROJECT]: Object.freeze(['info', 'tasks', 'chat', 'files']),
});

// Белый список экранов, доступных из URL.
//
// ВАЖНО: этот список - не «пункты бокового меню» (для них есть navItems
// в MainLayout), а множество view, для которых существует case в
// MainLayout.renderView(). Оба конца роутинга - parseRoute здесь и
// route-эффект в MainLayout - обязаны опираться на этот список, а не
// на список кнопок меню. Иначе:
//   - кабинет (не в меню, но валидный экран) не открывается по URL;
//   - пункты под роли (reports, journal) отсекаются по URL даже
//     у пользователя с правами;
//   - id, оставшийся от прошлой версии приложения, приводит
//     на пустой экран (default: return null).
//
// Ранее здесь был 'workload' - рендера для него нет, workload
// отображается под-вкладкой внутри Cabinet.
export const VIEWS = Object.freeze([
  'tasks', 'gantt', 'calendar', 'projects', 'templates',
  'staff', 'reports', 'archive', 'requests',
  'journal', 'cabinet',
]);

// uid() выдаёт id из этих символов. Проверяем форму при разборе -
// правка адресной строки не должна подмешивать в дальнейшие
// потребители разделители и пробелы.
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const isKnownView = (v) => VIEWS.includes(v);
const isKnownTab = (kind, t) => (TABS[kind] || []).includes(t);

/**
 * Собрать URL-фрагмент из дескриптора. Возвращает '' для невалидного
 * ввода - вызывающий код использует это как «нечего писать»,
 * а не как «пиши мусор в адресную строку».
 */
export function buildRoute(route) {
  if (!route) return '';
  const { kind, id, tab } = route;

  if (kind === ROUTE.VIEW) {
    return isKnownView(id) ? `#/view/${id}` : '';
  }
  if (kind === ROUTE.TASK || kind === ROUTE.PROJECT) {
    if (!ID_RE.test(String(id || ''))) return '';
    const safeTab = isKnownTab(kind, tab) ? tab : DEFAULT_TAB[kind];
    return `#/${kind}/${id}/${safeTab}`;
  }
  return '';
}

/**
 * Разобрать фрагмент в дескриптор маршрута. Возвращает null, если это
 * не известный маршрут - вызывающий код трактует это как «ничего
 * не делать», а не как «неизвестный маршрут», чтобы устаревшая ссылка
 * не переносила пользователя в неожиданное место.
 */
export function parseRoute(hash) {
  const raw = String(hash || '').replace(/^#\/?/, '');
  if (!raw) return null;

  const [head, second, third] = raw.split('/');

  if (head === ROUTE.VIEW) {
    return isKnownView(second) ? { kind: ROUTE.VIEW, id: second } : null;
  }
  if (head === ROUTE.TASK || head === ROUTE.PROJECT) {
    if (!ID_RE.test(String(second || ''))) return null;
    const tab = isKnownTab(head, third) ? third : DEFAULT_TAB[head];
    return { kind: head, id: second, tab };
  }
  return null;
}

/** Один и тот же объект (view / task / project) - по виду и id. */
export function isSameEntity(a, b) {
  return !!a && !!b && a.kind === b.kind && a.id === b.id;
}