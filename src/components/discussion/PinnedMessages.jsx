import React from 'react';
import Avatar from '../Avatar';
import { fmtDT } from '../../utils/date';
import { Ic, ICONS } from '../Icons';
import { useDiscussion } from './context';

export default function PinnedMessages({ pinned, onJump }) {
  const { getAuthor, policy, togglePin } = useDiscussion();
  if (!pinned.length) return null;

  return (
    <div className="pinned-messages">
      <div className="pinned-label">📌 Закреплено</div>
      {pinned.map(c => {
        const author = getAuthor(c.authorId);
        return (
          <div
            key={c.id}
            className="pinned-item"
            onClick={() => onJump(c.id)}
            title="Перейти к сообщению"
          >
            <Avatar employee={author} size="xs" />
            <span className="pinned-author">
              {author ? `${author.last} ${author.first}` : '—'}
            </span>
            <span className="mut sm">{fmtDT(c.createdAt)}</span>
            <span className="pinned-preview">
              {c.text.length > 50 ? c.text.substring(0, 50) + '...' : c.text}
            </span>
            {policy.canPin(c) && (
              <button
                className="icon-btn xs pinned-remove"
                onClick={(e) => { e.stopPropagation(); togglePin(c); }}
                title="Открепить"
              >
                <Ic d={ICONS.x} size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}