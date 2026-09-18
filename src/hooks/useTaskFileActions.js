// src/hooks/useTaskFileActions.js
import { useCallback } from 'react';
import { DIALOGS, TOASTS } from '../utils/constants';
import { prepareAttachments } from '../utils/fileUpload';
import { createFolder } from '../utils/fileTree';

/**
 * Побочные действия с файлами и папками задачи.
 *
 * Сохраняются через store.patchTask - точечно, без всей формы задачи
 * (файлы и папки не входят в FORM_FIELDS, см. useTaskFormState).
 * Локальное состояние формы обновляется через setFieldValue, чтобы UI
 * сразу увидел изменение, не дожидаясь общего Save.
 *
 * Валидация типа/размера файла и допустимых символов в имени папки -
 * не здесь: это ответственность utils/fileValidation и utils/fileTree
 * (единственная точка правды для allowlist, важной в проекте без
 * бэкенда - сервер не перепроверит то, что подсунул клиент).
 */
export function useTaskFileActions({ values, existing, store, setFieldValue, toast, confirm, ur }) {
  const handleFileUpload = useCallback(async (files, folderId = null) => {
    const result = await prepareAttachments(files, values.files, folderId, ur.id);

    if (result.accepted > 0) {
      setFieldValue('files', result.nextFiles);
      if (existing) store.patchTask(existing.id, { files: result.nextFiles });
      toast(
        result.accepted === 1 ? TOASTS.fileUploaded : TOASTS.filesUploaded(result.accepted),
        'success'
      );
    }
    if (result.rejected > 0) {
      toast(TOASTS.filesRejected(result.errors.join('; ')), 'warning');
    }
  }, [values.files, existing, store, setFieldValue, toast, ur.id]);

  const handleFileDelete = useCallback(async (fileId) => {
    const ok = await confirm(DIALOGS.deleteFile);
    if (!ok) return;
    const updatedFiles = (values.files || []).filter(f => f.id !== fileId);
    setFieldValue('files', updatedFiles);
    if (existing) store.patchTask(existing.id, { files: updatedFiles });
    toast(TOASTS.fileDeleted, 'info');
  }, [values.files, existing, store, setFieldValue, toast, confirm]);

  const handleCreateFolder = useCallback((name, parentId) => {
    const newFolder = createFolder(name, parentId, ur.id);
    const updatedFolders = [...(values.folders || []), newFolder];
    setFieldValue('folders', updatedFolders);
    if (existing) store.patchTask(existing.id, { folders: updatedFolders });
  }, [values.folders, existing, store, setFieldValue, ur.id]);

  const handleDeleteFolder = useCallback((folderId) => {
    const updatedFolders = (values.folders || []).filter(f => f.id !== folderId);
    setFieldValue('folders', updatedFolders);
    if (existing) store.patchTask(existing.id, { folders: updatedFolders });
  }, [values.folders, existing, store, setFieldValue]);

  return { handleFileUpload, handleFileDelete, handleCreateFolder, handleDeleteFolder };
}
