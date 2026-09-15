// src/components/discussion/DiscussionHeader.jsx
import React, { useState } from 'react';
import { Ic, ICONS } from '../Icons';
import { SearchBox } from '../SearchBox';
import PinnedMessages from './PinnedMessages';

export default function DiscussionHeader({
  pinned,
  onJump,
  onSearchChange,
  totalMatches = 0,
  currentMatch = 0,
  onPrevMatch,
  onNextMatch,
}) {
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
            <SearchBox
              value={query}
              onChange={update}
              placeholder="Поиск по обсуждению..."
              autoFocus
            />

            {query && (
              <div className="search-navigation">
                <span className="search-result-count">
                  {currentMatch} / {totalMatches}
                </span>
                {totalMatches > 0 && (
                  <>
                    <button
                      type="button"
                      className="icon-btn xs"
                      onClick={onPrevMatch}
                      title="Предыдущее совпадение"
                    >
                      <Ic d={ICONS.up} size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn xs"
                      onClick={onNextMatch}
                      title="Следующее совпадение"
                    >
                      <Ic d={ICONS.down} size={14} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}