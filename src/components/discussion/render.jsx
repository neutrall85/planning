/**
 * Подсвечивает вхождения query в тексте. Если activeIndex задан —
 * именно это вхождение получает дополнительный класс (активное
 * совпадение в навигации). Индексация — по порядку появления в тексте.
 */
export function highlightText(text, query, activeIndex = null) {
  if (!query || !query.trim()) return text;
  const lower = query.toLowerCase();
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

  let occurrence = 0;
  return text.split(regex).map((part, i) => {
    if (part.toLowerCase() !== lower) return part;
    const isActive = activeIndex === occurrence;
    occurrence += 1;
    return (
      <mark
        key={i}
        className={isActive ? 'search-highlight search-highlight-active' : 'search-highlight'}
      >
        {part}
      </mark>
    );
  });
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