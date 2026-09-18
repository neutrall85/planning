// src/components/WorkloadBar.jsx
import { memo, useLayoutEffect, useRef } from 'react';

/**
 * Полоса загрузки. Ширина заполнения задаётся CSS-переменной
 * --workload-fill, которую выставляем императивно через style.setProperty.
 * В JSX никаких inline-стилей - разметка чистая, а размерность живёт в CSS.
 *
 * memo-компонент: рендерится по одной на строку в дашборде загрузки,
 * на порядок десятков строк. Все пропсы - примитивы (числа + строка
 * варианта), поэтому memo сравнивает их по значению, и строки с
 * неизменившейся загрузкой не перерисовываются при изменении соседних.
 */
const WorkloadBar = memo(function WorkloadBar({ value, max, variant = 'plan' }) {
  const ref = useRef(null);
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  useLayoutEffect(() => {
    ref.current?.style.setProperty('--workload-fill', `${pct}%`);
  }, [pct]);

  return (
    <div className="workload-bar">
      <div
        ref={ref}
        className={`workload-bar-fill workload-bar-fill--${variant}`}
      />
    </div>
  );
});

export default WorkloadBar;