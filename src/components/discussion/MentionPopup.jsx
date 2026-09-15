import { createPortal } from 'react-dom';
import { initials } from '../../utils/date';

export default function MentionPopup({ popup, candidates, onPick }) {
  if (!popup.visible || candidates.length === 0) return null;

  return createPortal(
    <div className="mention-pop" style={{ left: popup.x, top: popup.y }}>
      {candidates.map(e => (
        <div key={e.id} className="mention-item" onClick={() => onPick(e)}>
          <span className="avatar xs">{initials(e.first, e.last)}</span>
          {e.last} {e.first}
        </div>
      ))}
    </div>,
    document.body
  );
}