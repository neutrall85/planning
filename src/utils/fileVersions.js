// src/utils/fileVersions.js

/**
 * Определяет номер следующей версии для файла с заданным именем.
 * Ключ группировки - точное совпадение name в пределах одной папки
 * (folderId). Так один и тот же файл в разных папках не становится
 * «новой версией» чужого документа.
 */
export function nextVersionFor(files, name, folderId = null) {
  const targetFolder = folderId || null;
  const sameName = files.filter(
    f => f.name === name && (f.folderId || null) === targetFolder
  );
  if (sameName.length === 0) return 1;
  return Math.max(...sameName.map(f => f.version || 1)) + 1;
}

/**
 * Добавляет файл в список как новую версию. Не мутирует входной список.
 * Имя файла используется только как метка группировки на клиенте,
 * никогда не как часть URL или пути.
 */
export function appendFileVersion(files, file) {
  return [...files, { ...file, version: nextVersionFor(files, file.name, file.folderId) }];
}

/**
 * Группирует плоский список файлов в документы с историей версий.
 * На вход ожидается список в пределах одной папки (вызывающий фильтрует).
 */
export function groupByDocument(files) {
  const groups = new Map();
  for (const f of files) {
    if (!groups.has(f.name)) groups.set(f.name, []);
    groups.get(f.name).push(f);
  }

  const docs = [];
  for (const [name, versions] of groups) {
    versions.sort((a, b) => (b.version || 1) - (a.version || 1));
    docs.push({ name, latest: versions[0], versions });
  }

  docs.sort((a, b) => {
    const ta = new Date(a.latest.uploadedAt || 0).getTime();
    const tb = new Date(b.latest.uploadedAt || 0).getTime();
    return tb - ta;
  });

  return docs;
}