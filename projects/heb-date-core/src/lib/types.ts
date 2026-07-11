/**
 * Framework-agnostic type definitions for the Hebrew date picker core.
 *
 * These types contain zero framework (Angular/React) coupling — the whole
 * `heb-date-core` package is pure TypeScript so it can be reused by any UI layer.
 */

/** Per-day rendering flags computed by {@link buildMonthView}. */
export interface DayFlags {
  /** The day is today (in the configured "today"). */
  isToday: boolean;
  /** The day is the (single) selected value. */
  isSelected: boolean;
  /** The day is the start of a selected range. */
  isRangeStart: boolean;
  /** The day is the end of a selected range. */
  isRangeEnd: boolean;
  /** The day falls strictly inside a selected range. */
  isInRange: boolean;
  /** The day cannot be selected (min/max/disabledDates). */
  isDisabled: boolean;
  /** The day is Shabbat (Saturday). */
  isShabbat: boolean;
  /** The day is Rosh Chodesh (1st, or 30th of a 30-day month). */
  isRoshChodesh: boolean;
  /** The day has at least one holiday/observance. */
  isHoliday: boolean;
  /** The day belongs to the previous/next Hebrew month (grid spillover). */
  isOtherMonth: boolean;
}

/** A single cell in the month grid. */
export interface HebDay {
  /** Gregorian anchor for this cell, normalized to local midnight. */
  date: Date;
  /** Hebrew year (e.g. 5786). */
  hebYear: number;
  /** Hebrew month number as used by @hebcal/core (Nisan=1 … Adar II=13). */
  hebMonth: number;
  /** Hebrew day of month (1..30). */
  hebDay: number;
  /** Gematriya label for the day, e.g. `"כ״א"`. */
  label: string;
  /** Holiday/observance descriptions in Hebrew for this day (may be empty). */
  holidays: string[];
  /** Rendering flags. */
  flags: DayFlags;
}

/** A fully-computed month, ready to render as a 6×7 grid. */
export interface HebMonthView {
  hebYear: number;
  hebMonth: number;
  /** Month + year title in gematriya, e.g. `"אלול תשפ״ו"`. */
  title: string;
  /** Exactly 6 rows of 7 days each. */
  weeks: HebDay[][];
}

/** A date range value (used in `mode="range"`). */
export interface HebRange {
  start: Date | null;
  end: Date | null;
}

/** A `(year, month)` coordinate identifying a Hebrew month. */
export interface HebMonthRef {
  year: number;
  month: number;
}

/** Options controlling gematriya formatting. */
export interface FormatOptions {
  /** Include Hebrew vowel points (nekudot). Defaults to `false`. */
  nikud?: boolean;
}
