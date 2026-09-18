// src/utils/fileTree.js
import { uid } from './date';

const MAX_FOLDER_NAME_LENGTH = 64;
// Allowlist Unicode-букв, цифр, пробела, точки, подчёркивания, дефиса.
// Всё остальное (включая <, >, /, \, кавычки, юникод-разделители) - отклоняется.
const FOLDER_NAME_RE = /^[\p{L}\p{N}\s._-]+$/u;

/** Содержимое одной папки: подпапки и файлы внутри неё. */
export function getChildren(folders, files, parentId) {
  const normalizedParent = parentId || null;
  return {
    subfolders: folders.filter(f => (f.parentId || null) === normalizedParent),
    subfiles: files.filter(f => (f.folderId || null) === normalizedParent),
  };
}

/**
 * Путь от корня до текущей папки.
 * Защита от циклов в parentId: если данные повреждены, visited не даст
 * бесконечному while зациклиться - вернётся частичный путь.
 */
export function buildBreadcrumb(folders, folderId) {
  const path = [];
  const visited = new Set();
  let current = folderId || null;

  while (current && !visited.has(current)) {
    visited.add(current);
    const folder = folders.find(f => f.id === current);
    if (!folder) break;
    path.unshift(folder);
    current = folder.parentId || null;
  }
  return path;
}

/**
 * Строковое представление пути к папке в стиле абсолютного пути:
 * корень → "/", вложенная "Чертёж" → "/Чертёж/".
 * Используется для отображения пути к файлу в режиме «Все файлы».
 */
export function getFolderPathString(folders, folderId) {
  const path = buildBreadcrumb(folders, folderId);
  if (path.length === 0) return '/';
  return '/' + path.map(f => f.name).join('/') + '/';
}

/**
 * Проверка имени новой папки в контексте соседей.
 * Возвращает строку с ошибкой или null, если имя допустимо.
 */
export function validateFolderName(name, siblingFolders, siblingFiles) {
  const trimmed = String(name || '').trim();

  if (!trimmed) return 'Название не может быть пустым';
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    return `Не более ${MAX_FOLDER_NAME_LENGTH} символов`;
  }
  if (trimmed === '.' || trimmed === '..') return 'Недопустимое имя папки';
  if (!FOLDER_NAME_RE.test(trimmed)) {
    return 'Недопустимые символы. Разрешены буквы, цифры, пробел, . _ -';
  }

  const lower = trimmed.toLowerCase();
  const clash =
    siblingFolders.some(f => f.name.toLowerCase() === lower) ||
    siblingFiles.some(f => f.name.toLowerCase() === lower);
  if (clash) return 'В этой папке уже есть файл или папка с таким именем';

  return null;
}

/** Создаёт папку с id и метаданными - единственная точка формирования. */
export function createFolder(name, parentId, createdBy) {
  return {
    id: 'fld_' + uid(),
    name: String(name).trim(),
    parentId: parentId || null,
    createdAt: new Date().toISOString(),
    createdBy,
  };
}

/**
 * Плоский список последних версий документов по всем папкам.
 * Группировка - по паре (folderId, name): одноимённые файлы в разных
 * папках считаются разными документами, а не версиями одного.
 * Сортировка - по пути, затем по имени.
 */
export function flattenLatestDocuments(folders, files) {
  const latest = new Map();
  for (const f of files) {
    const key = `${f.folderId || ''}::${f.name}`;
    const existing = latest.get(key);
    if (!existing || (f.version || 1) > (existing.version || 1)) {
      latest.set(key, f);
    }
  }
  return [...latest.values()].sort((a, b) => {
    const pa = getFolderPathString(folders, a.folderId);
    const pb = getFolderPathString(folders, b.folderId);
    if (pa !== pb) return pa.localeCompare(pb);
    return a.name.localeCompare(b.name);
  });
}