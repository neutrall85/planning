import { Modal } from './Modal';

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
  headerBefore = null,
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

  return (
    <Modal
      title={title}
      onClose={onClose}
      width={width}
      className={className}
      headerBefore={headerBefore}
      headerAfter={headerAfter}
      footer={footerEl}
      bodyRef={bodyRef}
    >
      {children}
    </Modal>
  );
};