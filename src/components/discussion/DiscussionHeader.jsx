import React, { useState } from 'react';
import { Ic, ICONS } from '../Icons';
import PinnedMessages from './PinnedMessages';

export default function DiscussionHeader({ pinned, onJump, onSearchChange, resultCount }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const toggle = () => {
    if (isSearchOpen) {
      setIsSearchOpen(false);
      setQuery('');
      onSearchChange('');
    } else {
      setIsSearchOpen(true);
    }
  };

  const update = (v) => {
    setQuery(v);
    onSearchChange(v);
  };

  return (
    <div className="discussion-header">
      <PinnedMessages pinned={pinned} onJump={onJump} />

      <div className="search-toggle-group">
        <button
          className={`icon-btn ${isSearchOpen ? 'active' : ''}`}
          onClick={toggle}
          title={isSearchOpen ? 'Закрыть поиск' : 'Поиск'}
        >
          <Ic d={ICONS.search} size={18} />
        </button>

        {isSearchOpen && (
          <div className="chat-search-inline">
            <div className="search-box">
              <Ic d={ICONS.search} size={15} />
              <input
                type="text"
                placeholder="Поиск по обсуждению..."
                value={query}
                onChange={(e) => update(e.target.value)}
                className="chat-search-input"
                autoFocus
              />
              {query && (
                <button className="icon-btn xs" onClick={() => update('')}>
                  <Ic d={ICONS.x} size={14} />
                </button>
              )}
            </div>
            {query && <span className="search-result-count">{resultCount}</span>}
          </div>
        )}
      </div>
    </div>
  );
}