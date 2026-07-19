/**
 * Exhaustive verification of the calendar arithmetic against an independent
 * oracle: ICU's hebrew calendar via `Intl.DateTimeFormat` (full-ICU ships with
 * Node). Every single day in the range is converted by both implementations
 * and compared — a dechiya off-by-one anywhere would light up hundreds of
 * dates immediately.
 *
 * Default range 1900-2200; set ORACLE_FULL=1 for the wider 1800-2300 sweep.
 */

import { gregToRD, hebrewToRD, isHebLeapYear, monthsInHebYear, rdToHebrew } from './hebrew-calendar';

const MS_PER_DAY = 86_400_000;

// ICU month names (en locale) -> our month numbers. 'Adar' is ICU's name for
// the single Adar of a common year. Any unexpected name throws, so ICU naming
// drift across Node versions cannot silently weaken the test.
const ICU_MONTHS: Record<string, number> = {
  Tishri: 7,
  Heshvan: 8,
  Kislev: 9,
  Tevet: 10,
  Shevat: 11,
  'Adar I': 12,
  Adar: 12,
  'Adar II': 13,
  Nisan: 1,
  Iyar: 2,
  Sivan: 3,
  Tamuz: 4,
  Av: 5,
  Elul: 6,
};

const formatter = new Intl.DateTimeFormat('en-u-ca-hebrew', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

function icuHebrew(ms: number): { year: number; month: number; day: number; icuName: string } {
  let year = 0,
    day = 0,
    icuName = '';
  for (const part of formatter.formatToParts(ms)) {
    if (part.type === 'year') {
      year = Number(part.value);
    } else if (part.type === 'day') {
      day = Number(part.value);
    } else if (part.type === 'month') {
      icuName = part.value;
    }
  }
  const month = ICU_MONTHS[icuName];
  if (month === undefined) {
    throw new Error(`unmapped ICU month name: "${icuName}"`);
  }
  return { year, month, day, icuName };
}

describe('ICU oracle sweep', () => {
  // No @types/node in the lib tsconfig — reach process through globalThis.
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  const full = !!env?.['ORACLE_FULL'];
  const start = Date.UTC(full ? 1800 : 1900, 0, 1);
  const end = Date.UTC(full ? 2301 : 2201, 0, 1);

  it(`agrees with ICU on every day of ${full ? '1800-2300' : '1900-2200'}`, () => {
    let checked = 0;
    for (let ms = start; ms < end; ms += MS_PER_DAY) {
      const d = new Date(ms);
      const ours = rdToHebrew(gregToRD(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const icu = icuHebrew(ms);
      if (ours.year !== icu.year || ours.month !== icu.month || ours.day !== icu.day) {
        throw new Error(
          `mismatch on ${d.toISOString().slice(0, 10)}: ` +
            `ours ${ours.year}/${ours.month}/${ours.day} vs ` +
            `ICU ${icu.year}/${icu.icuName}(${icu.month})/${icu.day}`,
        );
      }
      // The month-name map doubles as a leap-structure assertion.
      if (icu.icuName === 'Adar' && isHebLeapYear(icu.year)) {
        throw new Error(`ICU used plain Adar in leap year ${icu.year}`);
      }
      if ((icu.icuName === 'Adar I' || icu.icuName === 'Adar II') && !isHebLeapYear(icu.year)) {
        throw new Error(`ICU used ${icu.icuName} in common year ${icu.year}`);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(100_000);
  });

  it('agrees with ICU in the reverse direction on the 1st of every Hebrew month', () => {
    const startYear = full ? 5561 : 5661; // ~1800 / ~1900 CE
    const endYear = full ? 6060 : 5960; // ~2300 / ~2200 CE
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 1; m <= monthsInHebYear(y); m++) {
        const rd = hebrewToRD(y, m, 1);
        const ms = (rd - 719163) * MS_PER_DAY; // RD of 1970-01-01
        const icu = icuHebrew(ms);
        expect(`${icu.year}/${icu.month}/${icu.day}`, `1 of ${y}/${m}`).toBe(`${y}/${m}/1`);
      }
    }
  });
});
