// src/components/Modals/TaskModal/TaskProgress.jsx
import { useLayoutEffect, useRef } from 'react';

/**
 * Прогресс-бар учёта времени. Ширина заливки - через CSS-переменную,
 * выставленную императивно. В JSX ни одного style={{}}.
 */
export function TaskProgress({ value, max }) {
  const ref = useRef(null);
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);

  useLayoutEffect(() => {
    ref.current?.style.setProperty('--tm-progress-fill', `${pct}%`);
  }, [pct]);

  return (
    <div className="tm-progress">
      <div ref={ref} className="tm-progress-fill" />
    </div>
  );
}
