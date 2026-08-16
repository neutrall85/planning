import { } from 'react';

export const Ic = ({ d, size = 18, w = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

export const ICONS = {
  kanban: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z",
  gantt: "M3 6h8M9 12h10M5 18h7M3 4v16",
  cal: "M4 6h16v14H4zM4 10h16M8 4v4M16 4v4",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.6M17.5 14a6.5 6.5 0 0 1 4 6",
  chart: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  plus: "M12 5v14M5 12h14",
  out: "M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9",
  x: "M6 6l12 12M18 6L6 18",
  check: "M5 13l4 4L19 7",
  left: "M15 6l-6 6 6 6",
  right: "M9 6l6 6-6 6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  trash: "M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6",
  edit: "M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19zM13 6l5 5",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
  download: "M12 4v11M7 11l5 5 5-5M4 20h16",
  bell: "M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10 19a2 2 0 0 0 4 0",
  beach: "M12 3v9M12 12l7 3M12 12L5 15M4 20c2-1.5 4-1.5 6 0 2-1.5 4-1.5 6 0",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  inbox: "M3 13l3-8h12l3 8v6H3zM3 13h5l1.5 2.5h5L16 13h5",
  book: "M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2zM8 3v18",
  swap: "M7 8h13M17 5l3 3-3 3M17 16H4M7 13l-3 3 3 3",
  chat: "M21 12a8 8 0 0 1-8 8H4l2.5-2.5A8 8 0 1 1 21 12z",
  archive: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  restore: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  eye: "M1 12s3-7 11-7 11 7 11 7-3 7-11 7-11-7-11-7zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  filter: "M4 6h16M6 12h14M8 18h12",
  close: "M6 6l12 12M18 6L6 18",
  lock: "M7 11V7a5 5 0 0 1 10 0v4h1v10H6V11h1zm2 0h6V7a3 3 0 0 0-6 0v4z",
  file: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7",
};