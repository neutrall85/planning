// src/utils/ganttDependency.js

/**
 * Маршрутизация зависимостей на диаграмме Ганта.
 *
 * Все маршруты ортогональные: горизонталь → вертикаль → горизонталь.
 * Диагональные линии «через всё поле» при десятках задач нечитаемы;
 * ортогональные стрелки — стандарт для диаграмм Ганта.
 *
 * Точка выхода (edge) и точка входа зависят от типа:
 *
 *   FS (Finish-to-Start):  A.right → B.left
 *   SS (Start-to-Start):   A.left  → B.left
 *   FF (Finish-to-Finish): A.right → B.right
 *   SF (Start-to-Finish):  A.left  → B.right
 *
 * Направление стрелки определяется последним сегментом пути:
 * SVG marker-end с orient="auto" читает его автоматически.
 *
 * Модуль чистый — только геометрия, ни React, ни DOM.
 */

const GAP = 10; // Отступ от края полосы до вертикального сегмента.

/** Откуда выходим и в какую сторону (dir: +1 вправо, −1 влево). */
const OUT = Object.freeze({
  FS: { edge: 'right', dir:  1 },
  SS: { edge: 'left',  dir: -1 },
  FF: { edge: 'right', dir:  1 },
  SF: { edge: 'left',  dir: -1 },
});

/** Куда входим и с какой стороны заходим. */
const IN = Object.freeze({
  FS: { edge: 'left',  dir: -1 },
  SS: { edge: 'left',  dir: -1 },
  FF: { edge: 'right', dir:  1 },
  SF: { edge: 'right', dir:  1 },
});

/**
 * Строит SVG-path зависимости.
 *
 * @param {string} type - 'FS' | 'SS' | 'FF' | 'SF'
 * @param {{ left:number, right:number, centerY:number }} from
 * @param {{ left:number, right:number, centerY:number }} to
 * @returns {{ d: string } | null}
 */
export function dependencyPath(type, from, to) {
  const out = OUT[type];
  const into = IN[type];
  if (!out || !into) return null;

  const sx = from[out.edge];
  const sy = from.centerY;
  const ex = to[into.edge];
  const ey = to.centerY;

  // Плечи маршрута: отходим от A, подходим к B.
  const sxOut = sx + out.dir * GAP;
  const exIn  = ex + into.dir * GAP;
  const midY  = (sy + ey) / 2;

  // Строки совпадают — прямая без вертикали.
  if (Math.abs(sy - ey) < 1) {
    return { d: `M ${sx} ${sy} H ${ex}` };
  }

  // Простой маршрут ломается, если плечо входа оказалось с той же
  // стороны, что и полоса A: линия уйдёт внутрь полосы A. В этом
  // случае обходим через промежуточную горизонталь между строками.
  const flipped = out.dir === 1
    ? exIn < sxOut
    : exIn > sxOut;

  return flipped
    ? { d: `M ${sx} ${sy} H ${sxOut} V ${midY} H ${exIn} V ${ey} H ${ex}` }
    : { d: `M ${sx} ${sy} H ${exIn} V ${ey} H ${ex}` };
}