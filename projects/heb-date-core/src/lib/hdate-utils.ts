/**
 * Thin wrapper around `@hebcal/core` — the ONLY module in the codebase that
 * imports it directly.
 *
 * Dependency-Inversion in action: every other file (and the Angular/React UI on
 * top) depends on the small, stable functions exported here rather than on the
 * hebcal API surface. Swapping or upgrading the calendar engine is a change
 * localized to this file.
 */

import { HDate, HebrewCalendar, gematriya, months } from '@hebcal/core';
import type { FormatOptions, HebMonthRef } from './types';

export { months };

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
  return new HDate(1, month, year).daysInMonth();
}

/**
 * Format a full Hebrew date in gematriya, e.g. `"כ״א אלול תשפ״ו"`.
 * With `{ nikud: true }` returns the vowelized form `"כ״א אֱלוּל תשפ״ו"`.
 */
export function formatGematriya(date: Date, opts: FormatOptions = {}): string {
  // renderGematriya(suppressNikud): pass `true` to omit vowel points.
  return toHDate(date).renderGematriya(!opts.nikud);
}

/** Gematriya label for a Hebrew day-of-month number, e.g. `21 -> "כ״א"`. */
export function dayLabel(hebDay: number): string {
  return gematriya(hebDay);
}

/**
 * Title for a Hebrew month: month name + year in gematriya (no day),
 * e.g. `"אלול תשפ״ו"` or, in a leap year, `"אדר א׳ תשפ״ז"`.
 *
 * Derived from `renderGematriya` (dropping the leading day token) so the month
 * name — including the Adar I/II distinction — always comes from hebcal itself.
 */
export function monthTitle(year: number, month: number, opts: FormatOptions = {}): string {
  const rendered = new HDate(1, month, year).renderGematriya(!opts.nikud);
  return rendered.split(' ').slice(1).join(' ');
}

/** Holiday/observance descriptions (Hebrew) occurring on `date`. */
export function holidaysOn(date: Date, israel: boolean): string[] {
  const events = HebrewCalendar.getHolidaysOnDate(toHDate(date), israel) ?? [];
  return events.map((ev) => ev.render('he'));
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
 * hebcal's month numbering is non-contiguous across leap years (Adar I/II) and
 * `add(±1, 'month')` is unreliable across the year boundary.
 */
export function nextHebMonth(year: number, month: number): HebMonthRef {
  const last = new HDate(daysInHebMonth(year, month), month, year);
  const n = last.add(1, 'd');
  return { year: n.getFullYear(), month: n.getMonth() };
}

/** The Hebrew month preceding `{year, month}` in calendar order. */
export function prevHebMonth(year: number, month: number): HebMonthRef {
  const first = new HDate(1, month, year);
  const p = first.add(-1, 'd');
  return { year: p.getFullYear(), month: p.getMonth() };
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
  if (month === months.ADAR_II && !HDate.isLeapYear(year)) {
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
