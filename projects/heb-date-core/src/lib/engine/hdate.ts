/**
 * A minimal Hebrew-date value object — the engine's replacement for the class
 * of the same name that previously leaked from `@hebcal/core` through the
 * facade's `toHDate`/`fromHDate`. Only the surface the picker actually uses is
 * provided.
 */

import {
  gregToRD,
  hebMonthLength,
  hebrewToRD,
  isHebLeapYear,
  rdToGreg,
  rdToHebrew,
  type HebDateParts,
} from './hebrew-calendar';

// Local alias keeping hebcal's (day, month, year) argument order readable.
function hebrewToRDParts(day: number, month: number, year: number): number {
  return hebrewToRD(year, month, day);
}

export class HDate {
  private readonly parts: HebDateParts;

  /** From a Gregorian `Date` (by its local calendar fields). */
  constructor(date: Date);
  /** From a Hebrew day / month / year triple (hebcal argument order). */
  constructor(day: number, month: number, year: number);
  constructor(dateOrDay: Date | number, month?: number, year?: number) {
    if (dateOrDay instanceof Date) {
      const d = dateOrDay;
      this.parts = rdToHebrew(gregToRD(d.getFullYear(), d.getMonth(), d.getDate()));
    } else {
      // Normalize non-existent month 13 in a common year via a round-trip.
      this.parts = rdToHebrew(hebrewToRDParts(dateOrDay, month!, year!));
    }
  }

  /** Hebrew year, e.g. 5786. */
  getFullYear(): number {
    return this.parts.year;
  }

  /** Hebrew month number (Nisan=1 … Adar II=13). */
  getMonth(): number {
    return this.parts.month;
  }

  /** Hebrew day of month (1..30). */
  getDate(): number {
    return this.parts.day;
  }

  /** Number of days (29 or 30) in this date's month. */
  daysInMonth(): number {
    return hebMonthLength(this.parts.year, this.parts.month);
  }

  /** The equivalent Gregorian `Date` at local midnight. */
  greg(): Date {
    const rd = hebrewToRDParts(this.parts.day, this.parts.month, this.parts.year);
    const g = rdToGreg(rd);
    return new Date(g.year, g.monthIndex, g.day);
  }

  /** Is the given Hebrew year a leap year? */
  static isLeapYear(year: number): boolean {
    return isHebLeapYear(year);
  }
}
