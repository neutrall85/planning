// Компонент иконки - вынесен в отдельный файл для Fast Refresh

export const Ic = ({ d, size = 18, w = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
