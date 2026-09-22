// src/utils/fileUpload.js
import { uid } from './date';
import { validateAttachment } from './fileValidation';
import { appendFileVersion } from './fileVersions';

/**
 * Читает File в data URL. Единственная точка чтения файла - чтобы не
 * дублировать обёртку FileReader в каждом месте загрузки.
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

/**
 * Готовит пакет файлов к сохранению в task/project.
 *
 * Принимает массив File, для каждого:
 *   - валидирует тип (allowlist в fileValidation);
 *   - читает содержимое как data URL;
 *   - формирует объект с id, uploadedBy, uploadedAt, folderId;
 *   - применяет версионирование поверх уже существующего списка.
 *
 * Ошибки отдельных файлов не прерывают обработку остальных - они
 * собираются в errors, а accepted содержит только успешные. Так один
 * битый файл не блокирует загрузку всего пакета.
 *
 * Не мутирует вход: existingFiles читается, но не изменяется.
 *
 * Возвращаемый результат:
 *   nextFiles      - новый массив files для сохранения в сущность;
 *   acceptedFiles  - массив принятых файлов как объектов (id, name, ...).
 *                    Нужен вызывающему, когда хочется показать тост
 *                    с именем конкретного файла: сам nextFiles содержит
 *                    и старые файлы тоже, отличить свежие по нему нельзя;
 *   accepted       - длина acceptedFiles (для «сколько принято»);
 *   rejected       - сколько не прошло валидацию/чтение;
 *   errors         - строковые описания ошибок для показа пользователю.
 *
 * @param {File[]} files
 * @param {object[]} existingFiles - текущий список файлов задачи/проекта
 * @param {string|null} folderId - папка, в которую кладём
 * @param {string} uploaderId - id сотрудника
 * @returns {Promise<{
 *   nextFiles: object[],
 *   acceptedFiles: object[],
 *   accepted: number,
 *   rejected: number,
 *   errors: string[]
 * }>}
 */
export async function prepareAttachments(files, existingFiles, folderId, uploaderId) {
  const accepted = [];
  const errors = [];

  for (const file of files) {
    const check = validateAttachment(file);
    if (!check.ok) {
      errors.push(`${file.name}: ${check.reason}`);
      continue;
    }
    try {
      const url = await readFileAsDataURL(file);
      accepted.push({
        id: uid(),
        name: file.name,
        size: file.size,
        url,
        uploadedBy: uploaderId,
        uploadedAt: new Date().toISOString(),
        folderId: folderId || null,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  let nextFiles = existingFiles || [];
  for (const f of accepted) nextFiles = appendFileVersion(nextFiles, f);

  return {
    nextFiles,
    acceptedFiles: accepted,
    accepted: accepted.length,
    rejected: errors.length,
    errors,
  };
}