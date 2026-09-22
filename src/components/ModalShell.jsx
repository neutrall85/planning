// src/components/ModalShell.jsx
import { Modal } from './Modal';
import { Ic, ICONS } from './Icons';

/**
 * Каркас модалки: шапка, тело, подвал.
 *
 * Футер собирается одним из трёх способов:
 *
 *   1. `footer` передан явно - используется как есть.
 *   2. `actions` передан - стандартный футер с массивом кнопок слева
 *      от spacer: «Отмена» и «Сохранить» на месте, слева добавляются
 *      переданные действия.
 *   3. Ни то, ни другое - стандартный футер только с «Отмена/Сохранить».
 *
 * subtitle - вторая строка под заголовком. Пробрасывается в Modal,
 * который отвечает за разметку. Подзаголовок не участвует в футере
 * или действиях, не влияет на showSave / saveDisabled - это чистая
 * метаинформация шапки.
 */
export const ModalShell = ({
  title,
  subtitle = null,
  onClose,
  children,
  onSave,
  saveLabel = 'Сохранить',
  width = 640,
  className = '',
  footer = null,
  actions = null,
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
          {actions}
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>Отмена</button>
          <button className="btn primary" onClick={onSave} disabled={saveDisabled}>
            {saveLabel}
          </button>
        </div>
      ) : null);

  const backButton = showBack ? (
    <button type="button" className="btn ghost sm" onClick={onBack || onClose}>
      <Ic d={ICONS.left} size={14} /> {backLabel}
    </button>
  ) : null;

  return (
    <Modal
      title={title}
      subtitle={subtitle}
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