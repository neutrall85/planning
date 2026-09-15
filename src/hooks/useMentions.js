import { useEffect, useMemo, useRef, useState } from 'react';
import { filterMentionCandidates, insertMention } from '../utils/mentionParser';

export function useMentions({ text, setText, candidates, textareaRef }) {
  const [mentionQ, setMentionQ] = useState(null);
  const [popup, setPopup] = useState({ visible: false, x: 0, y: 0 });
  const cursorPosRef = useRef(null);

  const filteredCandidates = useMemo(
    () => filterMentionCandidates(mentionQ || '', candidates),
    [mentionQ, candidates]
  );

  useEffect(() => {
    if (mentionQ !== null && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setPopup({ visible: true, x: rect.left, y: rect.bottom + 4 });
    } else {
      setPopup(prev => ({ ...prev, visible: false }));
    }
  }, [mentionQ, textareaRef]);

  useEffect(() => {
    if (cursorPosRef.current !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(cursorPosRef.current, cursorPosRef.current);
      cursorPosRef.current = null;
    }
  }, [text, textareaRef]);

  const onType = (val) => {
    setText(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0) {
      const suffix = val.slice(lastAt + 1);
      setMentionQ(!/\s/.test(suffix) && suffix.length <= 30 ? suffix : null);
    } else {
      setMentionQ(null);
    }
  };

  const pick = (emp) => {
    const lastAt = text.lastIndexOf('@');
    if (lastAt === -1) return;
    const { text: newText, cursor } = insertMention(text, lastAt, emp);
    cursorPosRef.current = cursor;
    setText(newText);
    setMentionQ(null);
    textareaRef.current?.focus();
  };

  return {
    mentionQ,
    popup,
    filteredCandidates,
    onType,
    pick,
    reset: () => setMentionQ(null),
  };
}