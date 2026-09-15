import { useState } from 'react';
import { Modal } from './Modal';
import { useNestedModalEscape } from './Templates/useNestedModalEscape';

export const ConfirmDialog = ({ state, onCancel, onSubmit }) => {
  const [value, setValue] = useState(state.defaultValue || '');
  const isPrompt = state.mode === 'prompt';
  const canSubmit = !isPrompt || value.trim().length > 0;

  // Перехватываем Escape до модалки, лежащей под нами. Иначе нажатие
  // закрыло бы и наш диалог, и родительский (TaskModal, ProjectModal и т.п.).
  useNestedModalEscape(onCancel);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(isPrompt ? value.trim() : true);
  };

  const title = state.title || (isPrompt ? 'Введите значение' : 'Подтвердите действие');

  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={440}
      footer={
        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn ghost" onClick={onCancel}>
            {state.cancelLabel || 'Отмена'}
          </button>
          <button
            className={state.danger ? 'btn danger' : 'btn primary'}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {state.confirmLabel || (isPrompt ? 'Создать' : 'OK')}
          </button>
        </div>
      }
    >
      {state.message && (
        <p style={{ fontSize: 15, lineHeight: 1.55, marginBottom: isPrompt ? 14 : 0 }}>
          {state.message}
        </p>
      )}
      {isPrompt && (
        <input
          className="inp"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={state.placeholder || ''}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      )}
    </Modal>
  );
};