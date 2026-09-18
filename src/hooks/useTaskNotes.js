// src/hooks/useTaskNotes.js
import { useCallback, useState } from 'react';

/**
 * Личные заметки исполнителя по задаче. Видны только автору
 * (existing.notes[ur.id]), сохраняются отдельно от формы задачи через
 * store.upsertTaskNote/deleteTaskNote - поэтому не входят в
 * initialValues (см. stripNotes в useTaskFormState).
 */
export function useTaskNotes({ existing, ur, store, toast }) {
  const rawNotes = existing?.notes?.[ur.id];
  const notesList = Array.isArray(rawNotes) ? rawNotes : [];

  const [editingNote, setEditingNote] = useState(null);

  const openNewNote = useCallback(() => setEditingNote({ title: '', text: '' }), []);
  const openExistingNote = useCallback((note) => setEditingNote({ ...note }), []);
  const closeNoteEditor = useCallback(() => setEditingNote(null), []);

  const handleSaveNote = useCallback((noteData) => {
    try {
      store.upsertTaskNote(existing.id, noteData);
      setEditingNote(null);
      toast('Заметка сохранена', 'success');
    } catch (err) {
      toast(err.message || 'Не удалось сохранить заметку', 'error');
    }
  }, [existing, store, toast]);

  const handleDeleteNote = useCallback((noteId) => {
    try {
      store.deleteTaskNote(existing.id, noteId);
      setEditingNote(null);
      toast('Заметка удалена', 'info');
    } catch (err) {
      toast(err.message || 'Не удалось удалить заметку', 'error');
    }
  }, [existing, store, toast]);

  return {
    notesList, editingNote,
    openNewNote, openExistingNote, closeNoteEditor,
    handleSaveNote, handleDeleteNote,
  };
}
