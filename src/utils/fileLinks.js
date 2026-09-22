// src/utils/fileLinks.js
//
// Файлы и папки не имеют собственного URL и репозитория: они живут
// как массивы files[] / folders[] внутри задачи или проекта. Этот
// модуль - единственная точка, которая знает две вещи:
//   1. как выглядит ссылка (#/file/<id>, #/folder/<id>);
//   2. где искать файл/папку по id среди задач и проектов.
//
// Разделение с routes.js: routes.js - чистый парсер строк без знания
// о структуре данных. Здесь - знание о том, что такое «файл» и
// «папка» в предметной области.
//
// Никаких проверок прав: findFileById / findFolderById отвечают на
// «где лежит», а не «можно ли открыть». Видимость определяет
// вызывающий через taskVisible/projectVisible - те же предикаты, что
// и для карточки задачи/проекта.

import { ROUTE, buildRoute } from './routes';

/** URL-фрагмент для файла: '#/file/<id>'. */
export const fileRoute = (fileId) =>
  buildRoute({ kind: ROUTE.FILE, id: fileId });

/** URL-фрагмент для папки: '#/folder/<id>'. */
export const folderRoute = (folderId) =>
  buildRoute({ kind: ROUTE.FOLDER, id: folderId });

/**
 * Абсолютный URL для копирования в буфер обмена.
 * window.location.origin + pathname - база приложения без hash,
 * fileRoute/folderRoute - сам hash. Без origin ссылка открылась бы
 * только в том же документе.
 */
export const fileShareUrl = (fileId) => {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${fileRoute(fileId)}`;
};

export const folderShareUrl = (folderId) => {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${folderRoute(folderId)}`;
};

/**
 * Где лежит файл: на задаче или на проекте.
 *
 * @returns {{ owner: 'task'|'project', entity: object, file: object } | null}
 */
export function findFileById(db, fileId) {
  if (!db || !fileId) return null;

  for (const task of db.tasks || []) {
    const file = (task.files || []).find(f => f.id === fileId);
    if (file) return { owner: 'task', entity: task, file };
  }
  for (const project of db.projects || []) {
    const file = (project.files || []).find(f => f.id === fileId);
    if (file) return { owner: 'project', entity: project, file };
  }
  return null;
}

/**
 * Где лежит папка. Устроено симметрично findFileById: обходим те же
 * два пространства (tasks / projects), те же предикаты видимости
 * применяет вызывающий.
 *
 * @returns {{ owner: 'task'|'project', entity: object, folder: object } | null}
 */
export function findFolderById(db, folderId) {
  if (!db || !folderId) return null;

  for (const task of db.tasks || []) {
    const folder = (task.folders || []).find(f => f.id === folderId);
    if (folder) return { owner: 'task', entity: task, folder };
  }
  for (const project of db.projects || []) {
    const folder = (project.folders || []).find(f => f.id === folderId);
    if (folder) return { owner: 'project', entity: project, folder };
  }
  return null;
}