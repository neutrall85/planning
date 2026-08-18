// Иконки приложения - единый файл с готовыми SVG-компонентами
import type { JSX } from 'react';

type IconProps = {
  size?: number;
  w?: number;
  className?: string;
};

type IconComponent = (props: IconProps) => JSX.Element;

const createIcon = (d: string) => ({ size = 18, w = 1.8, className }: IconProps) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={w} 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d={d} />
  </svg>
);

export const IcKanban = createIcon("M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z");
export const IcGantt = createIcon("M3 6h8M9 12h10M5 18h7M3 4v16");
export const IcCal = createIcon("M4 6h16v14H4zM4 10h16M8 4v4M16 4v4");
export const IcFolder = createIcon("M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z");
export const IcUsers = createIcon("M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.6M17.5 14a6.5 6.5 0 0 1 4 6");
export const IcChart = createIcon("M4 20V10M10 20V4M16 20v-8M22 20H2");
export const IcClock = createIcon("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2");
export const IcPlus = createIcon("M12 5v14M5 12h14");
export const IcOut = createIcon("M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9");
export const IcX = createIcon("M6 6l12 12M18 6L6 18");
export const IcCheck = createIcon("M5 13l4 4L19 7");
export const IcLeft = createIcon("M15 6l-6 6 6 6");
export const IcRight = createIcon("M9 6l6 6-6 6");
export const IcSearch = createIcon("M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3");
export const IcTrash = createIcon("M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6");
export const IcEdit = createIcon("M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19zM13 6l5 5");
export const IcShield = createIcon("M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z");
export const IcDownload = createIcon("M12 4v11M7 11l5 5 5-5M4 20h16");
export const IcBell = createIcon("M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10 19a2 2 0 0 0 4 0");
export const IcBeach = createIcon("M12 3v9M12 12l7 3M12 12L5 15M4 20c2-1.5 4-1.5 6 0 2-1.5 4-1.5 6 0");
export const IcUser = createIcon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0");
export const IcInbox = createIcon("M3 13l3-8h12l3 8v6H3zM3 13h5l1.5 2.5h5L16 13h5");
export const IcBook = createIcon("M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2zM8 3v18");
export const IcSwap = createIcon("M7 8h13M17 5l3 3-3 3M17 16H4M7 13l-3 3 3 3");
export const IcChat = createIcon("M21 12a8 8 0 0 1-8 8H4l2.5-2.5A8 8 0 1 1 21 12z");
export const IcArchive = createIcon("M3 4h18v4H3zM5 8v12h14V8M10 12h4");
export const IcRestore = createIcon("M3 12a9 9 0 1 0 3-6.7M3 4v5h5");
export const IcEye = createIcon("M1 12s3-7 11-7 11 7 11 7-3 7-11 7-11-7-11-7zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z");
export const IcFilter = createIcon("M4 6h16M6 12h14M8 18h12");
export const IcClose = createIcon("M6 6l12 12M18 6L6 18");
export const IcLock = createIcon("M7 11V7a5 5 0 0 1 10 0v4h1v10H6V11h1zm2 0h6V7a3 3 0 0 0-6 0v4z");
export const IcFile = createIcon("M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7");
export const IcRefresh = createIcon("M21 12a9 9 0 1 1-9-9c2.5 0 4.8.8 6.6 2.2M21 3v6h-6M3 12a9 9 0 0 1 9-9c-2.5 0-4.8.8-6.6 2.2M3 21v-6h6");

// Для обратной совместимости - старый интерфейс через маппинг
export const ICONS = {
  kanban: IcKanban,
  gantt: IcGantt,
  cal: IcCal,
  folder: IcFolder,
  users: IcUsers,
  chart: IcChart,
  clock: IcClock,
  plus: IcPlus,
  out: IcOut,
  x: IcX,
  check: IcCheck,
  left: IcLeft,
  right: IcRight,
  search: IcSearch,
  trash: IcTrash,
  edit: IcEdit,
  shield: IcShield,
  download: IcDownload,
  bell: IcBell,
  beach: IcBeach,
  user: IcUser,
  inbox: IcInbox,
  book: IcBook,
  swap: IcSwap,
  chat: IcChat,
  archive: IcArchive,
  restore: IcRestore,
  eye: IcEye,
  filter: IcFilter,
  close: IcClose,
  lock: IcLock,
  file: IcFile,
  refresh: IcRefresh,
};

// Универсальный компонент для динамического использования по имени
export const Ic = ({ name, d, size, w, className }: { name?: keyof typeof ICONS; d?: IconComponent } & IconProps) => {
  // Поддержка старого интерфейса с prop "d"
  if (d) {
    const IconComp = d;
    return <IconComp size={size} w={w} className={className} />;
  }
  // Новый интерфейс с prop "name"
  const IconComponent = name ? ICONS[name] : null;
  return IconComponent ? <IconComponent size={size} w={w} className={className} /> : null;
};