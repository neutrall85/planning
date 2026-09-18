// src/utils/dateMask.js
//
// Маска для ввода дат в формате ДД.ММ.ГГГГ.
// Разделитель между датами - пробел. Между двумя датами можно поставить
// тире `-`: это диапазон, который при разборе разворачивается в
// последовательность дат.
//
// Пример: "01.01.2027 - 09.01.2027" → 9 дат с 01.01.2027 по 09.01.2027.
// Двузначный год разворачивается в 20YY: "01.01.26" → "01.01.2026".
//
// Чистые функции: только форматирование строки и парсинг.
// Никакой привязки к React, календарю или правам.

import { pad2, iso, parseISO, addDays, daysDiff } from './date';

const BLOCK_LEN = 8;         // ДДММГГГГ
const MAX_RANGE_DAYS = 366;  // верхняя граница одного диапазона

/**
 * Оставляет в строке только символы, которые могут встретиться в поле:
 * цифры, пробелы, тире и точки. Нормализует тире (окружено одиночными
 * пробелами) и пробелы (один), снимает края.
 *
 * Точка входит в whitelist, потому что и маска, и парсер работают с уже
 * отформатированной строкой, в которой точки расставлены.
 */
function normalizeInput(str) {
  return String(str ?? '')
    .replace(/[^\d\s.-]/g, '')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Форматирует один блок в ДД.ММ.ГГГГ.
 * Если набрано ровно 6 цифр (ДДММГГ) и это не стирание, разворачивает
 * год в 20YY: "010126" → "01.01.2026".
 *
 * `shrinking` - булево «текущий ввод короче предыдущего». Без него при
 * стирании "01.01.2026" → "01.01.20" блок из 6 цифр разворачивался бы
 * обратно в "01.01.2020", что блокировало бы редактирование года.
 */
function formatBlock(digits, shrinking) {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length === 6 && !shrinking) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.20${digits.slice(4)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

/**
 * Приводит произвольную строку к маске "ДД.ММ.ГГГГ ДД.ММ.ГГГГ ...",
 * тире отделяется пробелами: "ДД.ММ.ГГГГ - ДД.ММ.ГГГГ".
 *
 * Идемпотентна. Сохраняет trailing-разделитель - без этого нельзя было
 * бы ни начать второй блок, ни открыть диапазон.
 *
 * @param {string} input
 * @param {string} [previous] - предыдущее значение поля; нужно, чтобы
 *   отличить печать от стирания.
 */
export function formatDateMask(input, previous = '') {
  const str = String(input ?? '');
  const prev = String(previous ?? '');
  const shrinking = str.length < prev.length;
  const hasTrailingSpace = /\s$/.test(str);

  const normalized = normalizeInput(str);
  const tokens = normalized.split(' ').filter(Boolean);

  const formatted = tokens.map(token => {
    if (token === '-') return '-';
    // Извлекаем цифры: точка в токене - уже поставленный разделитель,
    // повторно она не нужна, а formatBlock хочет «голые» цифры.
    const digits = token.replace(/\D/g, '').slice(0, BLOCK_LEN);
    return formatBlock(digits, shrinking);
  });

  const result = formatted.join(' ');
  return hasTrailingSpace && result ? result + ' ' : result;
}

/**
 * Разбирает строку с датами и диапазонами.
 *
 * @returns {{ valid: string[], invalid: string[] }}
 *   valid   - ISO-строки 'YYYY-MM-DD' в порядке ввода; диапазоны развёрнуты;
 *   invalid - человекочитаемые описания проблемных блоков.
 */
export function parseMaskedDates(text) {
  const normalized = normalizeInput(text);
  if (!normalized) return { valid: [], invalid: [] };

  const parts = normalized.split(' ').filter(Boolean);
  const valid = [];
  const invalid = [];

  let i = 0;
  while (i < parts.length) {
    const token = parts[i];

    if (token === '-') {
      invalid.push('пропущена дата рядом с тире');
      i += 1;
      continue;
    }

    const isoFrom = tryParseDdMmYyyy(token);
    if (!isoFrom) {
      invalid.push(`«${token}» - некорректная дата`);
      i += 1;
      continue;
    }

    // Диапазон "Дата1 - Дата2"?
    if (parts[i + 1] === '-') {
      const rightToken = parts[i + 2];

      if (!rightToken) {
        invalid.push(`«${token} -» - пропущена дата после тире`);
        i += 2;
        continue;
      }

      const isoTo = tryParseDdMmYyyy(rightToken);
      if (!isoTo) {
        invalid.push(`«${token} - ${rightToken}» - некорректный диапазон`);
        i += 3;
        continue;
      }

      if (isoFrom > isoTo) {
        invalid.push(`«${token} - ${rightToken}» - диапазон в обратном порядке`);
        i += 3;
        continue;
      }

      if (daysDiff(isoFrom, isoTo) + 1 > MAX_RANGE_DAYS) {
        invalid.push(`«${token} - ${rightToken}» - диапазон длиннее ${MAX_RANGE_DAYS} дней`);
        i += 3;
        continue;
      }

      valid.push(...expandRange(isoFrom, isoTo));
      i += 3;
      continue;
    }

    valid.push(isoFrom);
    i += 1;
  }

  return { valid, invalid };
}

function expandRange(fromIso, toIso) {
  const result = [];
  let cursor = parseISO(fromIso);
  const end = parseISO(toIso);
  while (cursor <= end) {
    result.push(iso(cursor));
    cursor = addDays(cursor, 1);
  }
  return result;
}

/**
 * Парсит дату ДД.ММ.ГГ или ДД.ММ.ГГГГ. Двузначный год разворачивается
 * в 20YY: "26" → 2026. Для 4-значного - как введено.
 */
function tryParseDdMmYyyy(block) {
  const m = /^(\d{2})\.(\d{2})\.(\d{2,4})$/.exec(block);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const yearRaw = m[3];
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Календарная валидность: 31.02 → Date нормализует в 03.03,
  // поэтому сравниваем компоненты обратно.
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}