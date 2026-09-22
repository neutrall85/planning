// src/components/Modals/RejectionReasonModal.jsx
//
// Модалка «Причина отклонения».
//
// Единственное место в проекте, где собирается текст причины для
// отклонения любой сущности. Все 4 сценария (отпуск, запрос часов,
// делегирование ролей, регистрация) используют её через один и тот же
// onSubmit(reason).
//
// Контракт:
//   - onSubmit(reason) получает trimmed-строку (никогда не пустую:
//     кнопка заблокирована при пустом поле, сервисы дополнительно
//     валидируют причину);
//   - onClose - закрытие без решения.
//
// Почему не ConfirmDialog.prompt: он даёт однострочный input, а
// причина отклонения - многострочный комментарий; плюс свой заголовок
// и подпись кнопки.
import { useCallback, useState } from 'react';
import { ModalShell } from '../ModalShell';
import { FormField } from '../FormField';
import { useNestedModalEscape } from '../Templates/useNestedModalEscape';

export function RejectionReasonModal({
  title = 'Причина отклонения',
  confirmLabel = 'Отклонить',
  onSubmit,
  onClose,
}) {
  useNestedModalEscape(onClose);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0;

  const handleSubmit = useCallback(() => {
    setTouched(true);
    if (!trimmed) return;
    onSubmit(trimmed);
  }, [trimmed, onSubmit]);

  const footer = (
    <div className="modal-foot">
      <div className="spacer" />
      <button type="button" className="btn ghost" onClick={onClose}>
        Отмена
      </button>
      <button
        type="button"
        className="btn danger"
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {confirmLabel}
      </button>
    </div>
  );

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      width={480}
      footer={footer}
      showSave={false}
    >
      <FormField
        label="Причина"
        required
        type="textarea"
        rows={4}
        value={reason}
        onChange={setReason}
        error={touched && !canSubmit ? 'Укажите причину отклонения' : null}
        placeholder="Кратко опишите, почему запрос отклонён…"
      />
    </ModalShell>
  );
}