import { Modal } from './Modal';
import { Ic, ICONS } from './Icons';

export const ModalShell = ({
  title,
  onClose,
  children,
  onSave,
  saveLabel = 'Сохранить',
  width = 640,
  className = '',
  footer = null,
  showSave = true,
  saveDisabled = false,
  showBack = false,
  backLabel = 'Назад',
  onBack = null,
  headerAfter = null,
  bodyRef = null,
}) => {
  const footerEl = footer !== null
    ? footer
    : (showSave ? (
        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>Отмена</button>
          <button className="btn primary" onClick={onSave} disabled={saveDisabled}>
            {saveLabel}
          </button>
        </div>
      ) : null);

  /**
   * Кнопка «Назад» - единый приём для всех модалок с контекстом возврата.
   * Разметка описана здесь один раз, поэтому TaskModal, ProjectModal,
   * NoteEditorModal, HoursRequestModal и любые будущие модалки не
   * дублируют её у себя в headerBefore.
   *
   * Обработчик по умолчанию - onClose. Проп onBack пригодится, если
   * понадобится отдельное поведение (например, возврат в родительскую
   * модалку вместо полного закрытия).
   */
  const backButton = showBack ? (
    <button type="button" className="btn ghost sm" onClick={onBack || onClose}>
      <Ic d={ICONS.left} size={14} /> {backLabel}
    </button>
  ) : null;

  return (
    <Modal
      title={title}
      onClose={onClose}
      width={width}
      className={className}
      headerBefore={backButton}
      headerAfter={headerAfter}
      footer={footerEl}
      bodyRef={bodyRef}
    >
      {children}
    </Modal>
  );
};