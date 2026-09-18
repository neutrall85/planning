export const pad2 = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

// addMonths с защитой от overflow месяца.
//
// Наивный `setMonth(getMonth() + n)` переполняет месяц: JS не подрезает
// число дня под длину целевого месяца, а переносит излишек вперёд.
// Пример: 31 мая − 3 месяца = 3 марта, а не 28/29 февраля. В
// isTaskActive (cutoff архивации) это сдвигало границу на несколько
// дней - в зависимости от даты запуска.
//
// Правило: сохранить исходное число дня, но не больше последнего дня
// целевого месяца. 31 марта + 1 = 30 апреля; 31 мая − 3 = 28 (или 29)
// февраля; 15 января + 1 = 15 февраля.
export const addMonths = (d, n) => {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, lastDay));
  return x;
};

export const addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };
export const parseISO = (s) => { const [y,m,d] = String(s).split("-").map(Number); return new Date(y,m-1,d); };

// ---------------------------------------------------------------------------
// Текущая дата
// ---------------------------------------------------------------------------
//
// TODAY - константа, зафиксированная на момент загрузки модуля. Она
// удобна для «сегодня» в текстовых метках, но опасна в долгоживущих
// приложениях: сессия, оставленная на ночь, продолжает считать «сегодня»
// вчерашнюю дату. Сегодня это не критично, но по мере роста числа мест,
// где TODAY участвует в логике (архивация, права, календарь), расхождение
// будет становиться заметнее.
//
// todayIso() - функция: возвращает текущую дату в ISO каждый раз при
// вызове. Новый код должен использовать её. Постепенная миграция с
// TODAY на todayIso() идёт отдельным шагом, чтобы не устраивать массовый
// рефакторинг в одном коммите.
export const TODAY = iso(new Date());
export const todayIso = () => iso(new Date());

export const daysDiff = (a,b) => Math.round((parseISO(b)-parseISO(a))/86400000);

// ---------------------------------------------------------------------------
// Месяцы и дни недели
// ---------------------------------------------------------------------------
//
// MONTH_NAMES / MONTH_NAMES_SHORT - те же данные, что MS_FULL / MS_SHORT,
// но под именами, которые встречаются в коде чаще. MS_* оставлены как
// алиасы для обратной совместимости: их используют fmtD, а через fmtD -
// десятки call-sites. Удалять их - отдельный рефакторинг.
//
// WEEKDAY_LABELS - единый список для календаря (YearCalendarModal),
// диаграммы Ганта и производственного календаря. Раньше дублировался
// в трёх файлах.
export const MS_SHORT = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
export const MS_FULL  = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

export const MONTH_NAMES = MS_FULL;
export const MONTH_NAMES_SHORT = MS_SHORT;
export const WEEKDAY_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

export const fmtD = (s) => { 
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${MS_SHORT[d.getMonth()]}`;
};
export const fmtDMY = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "-";
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
};
export const fmtDT = (ts) => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "-";
  return `${fmtDMY(iso(d))} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
export const uid = () => Math.random().toString(36).slice(2,10);
export const initials = (f,l) => `${(f||"?")[0]}${(l||"?")[0]}`;

// isTaskActive переехал в utils/entityState.js - это доменный предикат
// «показывать задачу в UI», а не утилита дат. Импорт в существующих
// местах обновлён: см. TasksView, Calendar, Cabinet.