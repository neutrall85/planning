import React from 'react';
import { Ic, ICONS } from '../Icons';
import { useDiscussion } from './context';

export default function CommentAttachments({ attachments }) {
  const { openLightbox } = useDiscussion();
  if (!attachments?.length) return null;

  return (
    <div className="attachment-grid">
      {attachments.map((att, idx) => (
        <div
          key={att.id}
          className="attachment-item"
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(attachments, idx);
          }}
        >
          <img src={att.url} alt={att.name} className="attachment-thumb" />
          <div className="attachment-overlay">
            <a
              href={att.url}
              download={att.name}
              className="attachment-download"
              onClick={(e) => e.stopPropagation()}
            >
              <Ic d={ICONS.download} size={16} />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}