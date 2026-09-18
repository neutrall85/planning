// src/components/Modals/NoteEditorModal.jsx
import { useState } from 'react';
import { ModalShell } from '../ModalShell';
import { FormField } from '../FormField';
import { Ic, ICONS } from '../Icons';
import { useConfirm } from '../../context/ConfirmContext';
import { DIALOGS } from '../../utils/constants';
import { useNestedModalEscape } from '../Templates/useNestedModalEscape';

/**
 * Модалка редактора личной заметки. Открывается поверх TaskModal при
 * клике на плитку заметки (или на кнопку «Новая заметка»). Это вложенная
 * модалка, а не сущность уровня приложения, - поэтому она не проходит
 * через useModals/ModalRenderer, а живёт локальным состоянием TaskModal.
 *
 * useNestedModalEscape гарантирует, что Escape закроет именно этот
 * редактор, а не TaskModal, лежащий под ним: обработчик ставится в
 * capture-фазе и гасит событие до того, как оно дойдёт до bubble-обработчика
 * Modal.jsx.
 *
 * Кнопка «Назад» - через showBack у ModalShell: то же поведение, что
 * у TaskModal и ProjectModal, тот же внешний вид, никакого дублирования
 * разметки.
 */
export default function NoteEditorModal({ note, onSave, onDelete, onClose }) {
  useNestedModalEscape(onClose);

  const { confirm } = useConfirm();
  const isExisting = !!note?.id;

  const [title, setTitle] = useState(note?.title || '');
  const [text, setText] = useState(note?.text || '');

  const canSave = !!(title.trim() || text.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: note?.id,
      title: title.trim(),
      text: text.trim(),
    });
  };

  const handleDelete = async () => {
    if (!isExisting) return;
    const ok = await confirm(DIALOGS.deleteNote);
    if (!ok) return;
    onDelete(note.id);
  };

  const footer = (
    <div className="modal-foot">
      {isExisting && (
        <button type="button" className="btn danger" onClick={handleDelete}>
          <Ic d={ICONS.trash} size={14} /> Удалить
        </button>
      )}
      <div className="spacer" />
      <button type="button" className="btn ghost" onClick={onClose}>Отмена</button>
      <button
        type="button"
        className="btn primary"
        onClick={handleSave}
        disabled={!canSave}
      >
        Сохранить
      </button>
    </div>
  );

  return (
    <ModalShell
      title={isExisting ? 'Заметка' : 'Новая заметка'}
      onClose={onClose}
      width={560}
      footer={footer}
      showBack
    >
      <div className="project-info-fields">
        <FormField
          label="Заголовок"
          value={title}
          onChange={setTitle}
          inline
        />
        <FormField
          label="Текст"
          type="textarea"
          rows={8}
          value={text}
          onChange={setText}
          inline
        />
      </div>
    </ModalShell>
  );
}