// src/hooks/useTaskFileActions.js
import { useCallback, useEffect, useRef } from 'react';
import { prepareAttachments } from '../utils/fileUpload';
import { createFolder } from '../utils/fileTree';
import { DIALOGS, TOASTS } from '../utils/constants';

/**
 * Побочные действия с файлами и папками задачи.
 *
 * Все асинхронные операции проходят через in-flight lock (runningRef):
 * пока предыдущая не завершилась, следующая не стартует. Это закрывает
 * гонку «прочитал values.files → await → записал values.files»: между
 * чтением и записью стоит await (FileReader.readAsDataURL в
 * prepareAttachments), за который второе событие (второй drag-n-drop,
 * второй клик) успевает захватить тот же устаревший снимок и
 * перезаписать результат первого вызова — classic lost update.
 *
 * valuesRef держит актуальные values на момент старта операции.
 * Читать values.files прямо из замыкания useCallback нельзя: useCallback
 * фиксирует ссылку на момент создания, а после await она уже не
 * совпадает с текущим состоянием формы. valuesRef обновляется в
 * useEffect на каждый ре-рендер.
 *
 * Синхронные операции (создание/удаление папки) через lock не проходят:
 * они завершаются в том же тике, в котором начались, — гонки между
 * ними в одном тике нет. Но читают тоже из valuesRef, чтобы не зависеть
 * от устаревшего замыкания.
 */
export function useTaskFileActions({
  values, existing, store, setFieldValue, toast, confirm, ur,
}) {
  const runningRef = useRef(false);
  const valuesRef = useRef(values);
  useEffect(() => { valuesRef.current = values; }, [values]);

  const runExclusive = useCallback(async (fn) => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      return await fn();
    } finally {
      runningRef.current = false;
    }
  }, []);

  const handleFileUpload = useCallback((files, folderId = null) =>
    runExclusive(async () => {
      const current = valuesRef.current;
      const result = await prepareAttachments(
        files, current.files, folderId, ur.id,
      );
      if (result.accepted > 0) {
        setFieldValue('files', result.nextFiles);
        if (existing) store.patchTask(existing.id, { files: result.nextFiles });
        toast(
          result.accepted === 1
            ? TOASTS.fileUploaded(result.acceptedFiles[0].name)
            : TOASTS.filesUploaded(result.accepted),
          'success',
        );
      }
      if (result.rejected > 0) {
        toast(TOASTS.filesRejected(result.errors.join('; ')), 'warning');
      }
    }), [runExclusive, existing, store, setFieldValue, toast, ur.id]);

  const handleFileDelete = useCallback((fileId) =>
    runExclusive(async () => {
      if (!await confirm(DIALOGS.deleteFile)) return;
      const current = valuesRef.current;
      const updatedFiles = (current.files || []).filter(f => f.id !== fileId);
      setFieldValue('files', updatedFiles);
      if (existing) store.patchTask(existing.id, { files: updatedFiles });
      toast(TOASTS.fileDeleted, 'info');
    }), [runExclusive, existing, store, setFieldValue, toast, confirm]);

  const handleCreateFolder = useCallback((name, parentId) => {
    const current = valuesRef.current;
    const newFolder = createFolder(name, parentId, ur.id);
    const updatedFolders = [...(current.folders || []), newFolder];
    setFieldValue('folders', updatedFolders);
    if (existing) store.patchTask(existing.id, { folders: updatedFolders });
  }, [existing, store, setFieldValue, ur.id]);

  const handleDeleteFolder = useCallback((folderId) => {
    const current = valuesRef.current;
    const updatedFolders = (current.folders || []).filter(f => f.id !== folderId);
    setFieldValue('folders', updatedFolders);
    if (existing) store.patchTask(existing.id, { folders: updatedFolders });
  }, [existing, store, setFieldValue]);

  return {
    handleFileUpload,
    handleFileDelete,
    handleCreateFolder,
    handleDeleteFolder,
  };
}