export const pad2 = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
export const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth()+n); return x; };
export const parseISO = (s) => { const [y,m,d] = String(s).split("-").map(Number); return new Date(y,m-1,d); };
export const TODAY = iso(new Date());
export const daysDiff = (a,b) => Math.round((parseISO(b)-parseISO(a))/86400000);
export const MS_SHORT = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
export const MS_FULL = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
export const fmtD = (s) => { const d = parseISO(s); return `${d.getDate()} ${MS_SHORT[d.getMonth()]}`; };
export const fmtDMY = (s) => { if (!s) return "—"; const d = parseISO(s); return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`; };
export const fmtDT = (ts) => { const d = new Date(ts); return `${fmtDMY(iso(d))} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export const uid = () => Math.random().toString(36).slice(2,10);
export const initials = (f,l) => `${(f||"?")[0]}${(l||"?")[0]}`;

// Новая функция: активна ли задача для отображения в рабочих интерфейсах
export const isTaskActive = (task) => {
  if (!task) return false;
  // Если задача не архивная, она всегда активна
  if (!task.archived) return true;
  // Если архивная, но имеет closedAt менее 3 месяцев назад, тоже активна
  if (task.closedAt) {
    const cutoff = addMonths(new Date(), -3);
    return task.closedAt >= iso(cutoff);
  }
  return false;
};