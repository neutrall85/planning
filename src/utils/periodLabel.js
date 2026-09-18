// src/utils/periodLabel.js
//
// Человекочитаемые подписи периодов для дашбордов и отчётов.
// Держим отдельно от workCalendar: там домен (рабочие дни, ёмкость,
// resolvePeriod - «что такое месяц N»), здесь - представление.
// Так локализация не утекает в арифметику.

import { parseISO, fmtDMY } from './date';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const ROMAN_QUARTERS = ['I', 'II', 'III', 'IV'];

export function formatPeriodLabel(mode, anchorIso, from, to) {
  if (mode === 'month') {
    const d = parseISO(anchorIso);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (mode === 'quarter') {
    const d = parseISO(anchorIso);
    return `${ROMAN_QUARTERS[Math.floor(d.getMonth() / 3)]} квартал ${d.getFullYear()}`;
  }
  if (mode === 'year') {
    return String(parseISO(anchorIso).getFullYear());
  }
  return `${fmtDMY(from)} - ${fmtDMY(to)}`;
}