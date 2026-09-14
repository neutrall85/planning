import React from 'react';

export function highlightText(text, query) {
  if (!query || !query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
  );
}

export function renderMentionText(text) {
  return text.split('@').map((part, i) => {
    if (i === 0) return <span key={i}>{part}</span>;
    const tokens = part.split(/(\s+)/);
    let mention = tokens[0];
    let restStart = 1;
    if (tokens.length > 2 && /^[А-ЯA-ZЁ]/.test(tokens[2])) {
      mention += ' ' + tokens[2];
      restStart = 3;
    }
    return (
      <span key={i}>
        <span className="mention">@{mention}</span>
        {tokens.slice(restStart).join('')}
      </span>
    );
  });
}