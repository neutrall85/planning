export const pad2 = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
export const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
export const addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };
export const parseISO = (s) => { 
  // Поддерживаем как полные ISO-строки (YYYY-MM-DDTHH:mm:ss.sssZ), так и даты (YYYY-MM-DD)
  const dateStr = String(s).split('T')[0];
  const [y,m,d] = dateStr.split("-").map(Number); 
  return new Date(y,m-1,d); 
};
export const TODAY = iso(new Date());
// Исправлено: используем Math.floor для избежания ошибок плавающей точки
// Добавлена проверка на валидность дат для предотвращения NaN
export const daysDiff = (a,b) => {
  const dateA = parseISO(a);
  const dateB = parseISO(b);
  if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
  return Math.floor((dateB - dateA) / 86400000);
};
export const MS_SHORT = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
export const MS_FULL = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
export const WD_FULL = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
export const fmtD = (s) => { 
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MS_SHORT[d.getMonth()]}`;
};
export const fmtDMY = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
};
export const fmtDT = (ts) => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return `${fmtDMY(iso(d))} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
export const fmtFullDate = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return "—";
  const dayName = WD_FULL[d.getDay()];
  const day = d.getDate();
  const month = MS_FULL[d.getMonth()].toLowerCase();
  const year = d.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
};
export const uid = () => Math.random().toString(36).slice(2,10);
export const initials = (f,l) => `${(f||"?")[0]}${(l||"?")[0]}`;

export const isTaskActive = (task) => {
  if (!task) return false;
  if (!task.archived) return true;
  if (task.closedAt) {
    const cutoff = addMonths(new Date(), -3);
    return task.closedAt >= iso(cutoff);
  }
  return false;
};

