/**
 * Public facade over the internal Hebrew-calendar engine (`./engine/*`) — the
 * ONLY module the rest of the codebase (and the Angular/React UI on top)
 * imports calendar logic from.
 *
 * Dependency-Inversion in action: every other file depends on the small,
 * stable functions exported here rather than on the engine's internals.
 * Swapping or upgrading the calendar engine is a change localized to this
 * directory — exactly how the previous `@hebcal/core` backend was replaced by
 * the self-contained engine without touching any consumer.
 */

import { gematriya } from './engine/gematriya';
import { HDate } from './engine/hdate';
import {
  hebMonthLength,
  hebrewToRD,
  isHebLeapYear,
  months,
  rdToHebrew,
} from './engine/hebrew-calendar';
import { holidaysForHebDate } from './engine/holidays';
import { monthName } from './engine/month-names';
import type { FormatOptions, HebMonthRef } from './types';

export { months };
export { HDate };

/** Strip the time component: return a new Date at local midnight. */
export function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Are the two dates the same calendar day (ignoring time)? */
export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) {
    return false;
  }
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Format a Gregorian `Date` as a local `YYYY-MM-DD` string — safe for sending
 * a date-only value to a server or `<input type="date">`.
 *
 * Deliberately NOT `date.toISOString()`: that method converts to UTC, and
 * every picker value here is normalized to *local* midnight. In any positive
 * UTC-offset timezone (e.g. Israel, UTC+2/+3) `toISOString()` rolls the date
 * back by one day — e.g. local midnight of 3 Sep 2026 becomes
 * `"2026-09-02T21:00:00.000Z"`. Reading just the date part of that string
 * silently returns the wrong Gregorian day.
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear().toString().padStart(4, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Convert a Gregorian `Date` to an `HDate` (by its calendar Y/M/D). */
export function toHDate(date: Date): HDate {
  return new HDate(atMidnight(date));
}

/** Convert an `HDate` to a Gregorian `Date` at local midnight. */
export function fromHDate(hd: HDate): Date {
  const g = hd.greg();
  return new Date(g.getFullYear(), g.getMonth(), g.getDate());
}

/** First day (as a `Date`) of the given Hebrew month. */
export function startOfHebMonth(year: number, month: number): Date {
  return fromHDate(new HDate(1, month, year));
}

/** Number of days in the given Hebrew month (handles Cheshvan/Kislev variance). */
export function daysInHebMonth(year: number, month: number): number {
  return hebMonthLength(year, month);
}

/**
 * Format a full Hebrew date in gematriya, e.g. `"כ״א אלול תשפ״ו"`.
 * With `{ nikud: true }` returns the vowelized form `"כ״א אֱלוּל תשפ״ו"`.
 */
export function formatGematriya(date: Date, opts: FormatOptions = {}): string {
  const hd = toHDate(date);
  const name = monthName(hd.getFullYear(), hd.getMonth(), !!opts.nikud);
  return `${gematriya(hd.getDate())} ${name} ${gematriya(hd.getFullYear())}`;
}

/** Gematriya label for a Hebrew day-of-month number, e.g. `21 -> "כ״א"`. */
export function dayLabel(hebDay: number): string {
  return gematriya(hebDay);
}

/**
 * Title for a Hebrew month: month name + year in gematriya (no day),
 * e.g. `"אלול תשפ״ו"` or, in a leap year, `"אדר א׳ תשפ״ז"`.
 */
export function monthTitle(year: number, month: number, opts: FormatOptions = {}): string {
  return `${monthName(year, month, !!opts.nikud)} ${gematriya(year)}`;
}

/** Holiday/observance descriptions (Hebrew) occurring on `date`. */
export function holidaysOn(date: Date, israel: boolean): string[] {
  const hd = toHDate(date);
  return holidaysForHebDate(hd.getFullYear(), hd.getMonth(), hd.getDate(), israel);
}

/** Is this date Shabbat (Saturday)? */
export function isShabbat(date: Date): boolean {
  return date.getDay() === 6;
}

/** Is this Hebrew day-of-month a Rosh Chodesh day (1, or 30 of a 30-day month)? */
export function isRoshChodesh(hebDay: number): boolean {
  return hebDay === 1 || hebDay === 30;
}

/**
 * The Hebrew month following `{year, month}` in calendar (civil) order.
 *
 * Uses day arithmetic (last day + 1 day) rather than month arithmetic, because
 * the month numbering is non-contiguous across leap years (Adar I/II) and the
 * year number increments at Tishrei (month 7), not at Nisan (month 1).
 */
export function nextHebMonth(year: number, month: number): HebMonthRef {
  const n = rdToHebrew(hebrewToRD(year, month, daysInHebMonth(year, month)) + 1);
  return { year: n.year, month: n.month };
}

/** The Hebrew month preceding `{year, month}` in calendar order. */
export function prevHebMonth(year: number, month: number): HebMonthRef {
  const p = rdToHebrew(hebrewToRD(year, month, 1) - 1);
  return { year: p.year, month: p.month };
}

/** The same month one Hebrew year later (clamped to a valid month). */
export function nextHebYear(year: number, month: number): HebMonthRef {
  return clampMonth(year + 1, month);
}

/** The same month one Hebrew year earlier (clamped to a valid month). */
export function prevHebYear(year: number, month: number): HebMonthRef {
  return clampMonth(year - 1, month);
}

/**
 * Ensure `month` exists in `year`: Adar II (13) only exists in leap years, so
 * when moving to a non-leap year it collapses to Adar (12).
 */
function clampMonth(year: number, month: number): HebMonthRef {
  if (month === months.ADAR_II && !isHebLeapYear(year)) {
    return { year, month: months.ADAR_I };
  }
  return { year, month };
}

/** The Hebrew `{year, month}` containing `date`. */
export function hebMonthOf(date: Date): HebMonthRef {
  const hd = toHDate(date);
  return { year: hd.getFullYear(), month: hd.getMonth() };
}

/** Today's Hebrew `{year, month}`. */
export function todayHebMonth(today: Date = new Date()): HebMonthRef {
  return hebMonthOf(today);
}
