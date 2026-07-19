/**
 * Pure Hebrew-calendar arithmetic: the classical fixed (arithmetic) calendar —
 * molad computation plus the four postponement rules (dechiyot) — with
 * conversions between Hebrew dates, Rata Die fixed day numbers, and the
 * (proleptic) Gregorian calendar.
 *
 * Written from the published algorithm (as described in Dershowitz & Reingold,
 * "Calendrical Calculations", and many other sources); contains no third-party
 * code. Exhaustively verified against ICU's hebrew calendar — see
 * `icu-oracle.spec.ts`.
 *
 * Month numbering (public API, kept compatible with the picker's documented
 * `monthChange` contract): Nisan=1 … Elul=6, Tishrei=7 … Shvat=11,
 * Adar I=12, Adar II=13. In a common (non-leap) year the single Adar is 12.
 * Note the numbering is *not* contiguous in civil order: a Hebrew year runs
 * Tishrei(7)…Adar(12/13), then Nisan(1)…Elul(6), and the year number
 * increments at 1 Tishrei.
 */

/** Hebrew month numbers (Nisan=1 … Adar II=13). */
export const months = {
  NISAN: 1,
  IYYAR: 2,
  SIVAN: 3,
  TAMUZ: 4,
  AV: 5,
  ELUL: 6,
  TISHREI: 7,
  CHESHVAN: 8,
  KISLEV: 9,
  TEVET: 10,
  SHVAT: 11,
  ADAR_I: 12,
  ADAR_II: 13,
} as const;

/** A Hebrew calendar date as a plain triple. */
export interface HebDateParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Rata Die of the day before 1 Tishrei, AM 1: `elapsedDays` counts from 1, so
 * `HEBREW_EPOCH_RD + elapsedDays(1)` lands on the epochal Rosh Hashana.
 * Calibrated empirically against ICU (uniform across 1900-2200) and enforced
 * for every single day by `icu-oracle.spec.ts`.
 */
const HEBREW_EPOCH_RD = -1373428;

/** Rata Die of the Unix epoch, 1 January 1970 (Gregorian). */
const UNIX_EPOCH_RD = 719163;

const MS_PER_DAY = 86_400_000;

/** Is the given Hebrew year a leap year (13 months) in the 19-year cycle? */
export function isHebLeapYear(year: number): boolean {
  return (7 * year + 1) % 19 < 7;
}

/** Number of months in the Hebrew year: 12, or 13 in a leap year. */
export function monthsInHebYear(year: number): number {
  return isHebLeapYear(year) ? 13 : 12;
}

const elapsedDaysCache = new Map<number, number>();

/**
 * Days from the Hebrew epoch to 1 Tishrei of `year`, applying the molad
 * arithmetic and all four dechiyot (postponement rules).
 */
function elapsedDays(year: number): number {
  const cached = elapsedDaysCache.get(year);
  if (cached !== undefined) {
    return cached;
  }

  const prev = year - 1;
  const monthsElapsed =
    235 * Math.floor(prev / 19) +
    12 * (prev % 19) +
    Math.floor((7 * (prev % 19) + 1) / 19);

  const partsElapsed = 204 + 793 * (monthsElapsed % 1080);
  const hoursElapsed =
    5 +
    12 * monthsElapsed +
    793 * Math.floor(monthsElapsed / 1080) +
    Math.floor(partsElapsed / 1080);
  const day = 1 + 29 * monthsElapsed + Math.floor(hoursElapsed / 24);
  const parts = (hoursElapsed % 24) * 1080 + (partsElapsed % 1080);

  let altDay = day;
  if (
    parts >= 19440 || // molad zaken: molad at or after noon (18h from 6pm)
    (day % 7 === 2 && parts >= 9924 && !isHebLeapYear(year)) || // GaTaRaD
    (day % 7 === 1 && parts >= 16789 && isHebLeapYear(year - 1)) // BeTUTaKPaT
  ) {
    altDay += 1;
  }
  // Lo ADU rosh: Rosh Hashana may not fall on Sunday, Wednesday or Friday.
  const result = altDay % 7 === 0 || altDay % 7 === 3 || altDay % 7 === 5 ? altDay + 1 : altDay;

  elapsedDaysCache.set(year, result);
  return result;
}

/** Rata Die of 1 Tishrei of the given Hebrew year. */
export function roshHashanaRD(year: number): number {
  return HEBREW_EPOCH_RD + elapsedDays(year);
}

/** Length of the Hebrew year in days: 353/354/355 (common), 383/384/385 (leap). */
export function daysInHebYear(year: number): number {
  return elapsedDays(year + 1) - elapsedDays(year);
}

/**
 * Existing months only: in a common year the single Adar is 12, so a month-13
 * input is normalized down (mirrors the facade's `clampMonth` semantics).
 */
function normalizeMonth(year: number, month: number): number {
  return month === months.ADAR_II && !isHebLeapYear(year) ? months.ADAR_I : month;
}

/** Number of days (29 or 30) in the given Hebrew month. */
export function hebMonthLength(year: number, month: number): number {
  month = normalizeMonth(year, month);
  switch (month) {
    case months.IYYAR:
    case months.TAMUZ:
    case months.ELUL:
    case months.TEVET:
    case months.ADAR_II:
      return 29;
    case months.CHESHVAN:
      // 30 only in a "complete" (shlemah) year.
      return daysInHebYear(year) % 10 === 5 ? 30 : 29;
    case months.KISLEV:
      // 29 only in a "deficient" (chaserah) year.
      return daysInHebYear(year) % 10 === 3 ? 29 : 30;
    case months.ADAR_I:
      // Adar I (leap) is 30; plain Adar in a common year is 29.
      return isHebLeapYear(year) ? 30 : 29;
    default:
      // Nisan, Sivan, Av, Tishrei, Shvat.
      return 30;
  }
}

/** Rata Die of the given Hebrew date. */
export function hebrewToRD(year: number, month: number, day: number): number {
  month = normalizeMonth(year, month);
  let rd = roshHashanaRD(year) + day - 1;
  if (month < months.TISHREI) {
    // Months after the winter: sum Tishrei..end-of-numbering, then Nisan..month-1.
    const last = monthsInHebYear(year);
    for (let m = months.TISHREI; m <= last; m++) {
      rd += hebMonthLength(year, m);
    }
    for (let m = months.NISAN; m < month; m++) {
      rd += hebMonthLength(year, m);
    }
  } else {
    for (let m = months.TISHREI; m < month; m++) {
      rd += hebMonthLength(year, m);
    }
  }
  return rd;
}

/** Hebrew date containing the given Rata Die day. */
export function rdToHebrew(rd: number): HebDateParts {
  // Mean Hebrew year length is 35975351/98496 days; land near the right year
  // and correct with the exact Rosh Hashana positions.
  let year = Math.floor(((rd - HEBREW_EPOCH_RD) * 98496) / 35975351) + 1;
  while (roshHashanaRD(year) > rd) {
    year--;
  }
  while (roshHashanaRD(year + 1) <= rd) {
    year++;
  }
  // Both numeric halves (Tishrei 7..12/13, Nisan 1..6) are chronologically
  // contiguous, so a linear scan within the right half terminates.
  let month = rd < hebrewToRD(year, months.NISAN, 1) ? months.TISHREI : months.NISAN;
  while (rd > hebrewToRD(year, month, hebMonthLength(year, month))) {
    month++;
  }
  const day = rd - hebrewToRD(year, month, 1) + 1;
  return { year, month, day };
}

/**
 * Rata Die of a (proleptic) Gregorian date. `monthIndex` is 0-based, matching
 * JS `Date` conventions. Delegates the Gregorian arithmetic to `Date.UTC`.
 */
export function gregToRD(year: number, monthIndex: number, day: number): number {
  // Date.UTC maps years 0..99 to 1900..1999; go through setUTCFullYear instead.
  if (year >= 0 && year < 100) {
    const d = new Date(0);
    d.setUTCFullYear(year, monthIndex, day);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime() / MS_PER_DAY + UNIX_EPOCH_RD;
  }
  return Date.UTC(year, monthIndex, day) / MS_PER_DAY + UNIX_EPOCH_RD;
}

/** Gregorian `{year, monthIndex (0-based), day}` of a Rata Die day. */
export function rdToGreg(rd: number): { year: number; monthIndex: number; day: number } {
  const d = new Date((rd - UNIX_EPOCH_RD) * MS_PER_DAY);
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth(), day: d.getUTCDate() };
}

/** Day of week of a Rata Die day: 0=Sunday … 6=Saturday (JS `getDay` convention). */
export function rdDayOfWeek(rd: number): number {
  return ((rd % 7) + 7) % 7;
}
