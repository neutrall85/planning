import React from 'react';
import { REACTION_PALETTE } from './constants';

export default function ReactionPicker({ activeEmoji, onPick }) {
  return (
    <div
      className="reaction-picker"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {REACTION_PALETTE.map(emoji => (
        <button
          key={emoji}
          type="button"
          className={`reaction-pick-btn${activeEmoji === emoji ? ' on' : ''}`}
          onClick={() => onPick(emoji)}
          title={activeEmoji === emoji ? 'Снять реакцию' : 'Поставить реакцию'}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}