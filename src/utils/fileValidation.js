// src/utils/fileValidation.js

/**
 * Валидация вложений для вкладки «Файлы» в задачах и проектах.
 *
 * Allowlist, а не denylist — безопаснее по умолчанию: новые/неизвестные типы
 * блокируются, а не пропускаются. Сознательно исключены:
 *   - image/svg+xml — SVG может содержать <script>, вектор stored XSS при открытии;
 *   - text/html, application/xhtml+xml — то же;
 *   - application/javascript, text/javascript — исполняемый код;
 *   - любые .xml с внешними сущностями (XXE на бэкенде при парсинге).
 *
 * Проверка по MIME И по расширению: MIME можно подделать, расширение — тоже,
 * но расхождение между ними — сигнал для блокировки.
 */

const ALLOWED_MIME = new Set([
  // Документы
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Архивы
  'application/zip',
  // Текст
  'text/plain',
  'text/csv',
  // Изображения (кроме SVG)
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

const ALLOWED_EXT_RE = /\.(pdf|docx?|xlsx?|pptx?|zip|txt|csv|png|jpe?g|gif|webp)$/i;

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 МБ

export const ALLOWED_TYPES_HUMAN =
  'PDF, DOC(X), XLS(X), PPT(X), ZIP, TXT, CSV, PNG, JPEG, GIF, WEBP';

/**
 * Проверяет файл на допустимость загрузки.
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateAttachment(file) {
  if (!file) {
    return { ok: false, reason: 'Файл не выбран' };
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return {
      ok: false,
      reason: `Файл слишком большой (максимум ${MAX_ATTACHMENT_SIZE / 1024 / 1024} МБ)`,
    };
  }

  const mimeOk = ALLOWED_MIME.has(file.type);
  const extOk = ALLOWED_EXT_RE.test(file.name || '');

  // Allowlist проверяет два независимых измерения. Требуем совпадения:
  // расхождение MIME и расширения — классический признак подмены типа
  // (fake-image с расширением .png и MIME text/html и наоборот). AND
  // безопаснее OR: файл должен пройти оба фильтра, а не любой из них.
  if (!mimeOk || !extOk) {
    return { ok: false, reason: `Недопустимый тип файла. Разрешены: ${ALLOWED_TYPES_HUMAN}` };
  }

  return { ok: true };
}