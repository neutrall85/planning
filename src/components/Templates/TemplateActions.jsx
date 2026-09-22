import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Ic, ICONS } from '../Icons';
import TemplateModal from './TemplateModal';

export function TemplateActions({
  kind,
  source,
  nested = [],
  toast,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const openModal = () => setOpen(true);

  return (
    <>
      <button
        type="button"
        className="btn ghost sm"
        onClick={openModal}
        disabled={disabled}
      >
        <Ic d={ICONS.star} size={13} /> В шаблон
      </button>
      {open && createPortal(
        <TemplateModal
          mode="create"
          kind={kind}
          source={source}
          nested={nested}
          onClose={close}
          toast={toast}
        />,
        document.body,
      )}
    </>
  );
}