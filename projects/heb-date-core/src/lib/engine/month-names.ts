/**
 * Hebrew month display names, plain and vowelized (nikud), indexed by the
 * engine's month numbers (Nisan=1 … Adar II=13).
 *
 * Every string is written with explicit \u escapes: nikud is made of
 * invisible combining marks whose exact order matters for string equality,
 * and editors love to "fix" them. This file is generated from the picker's
 * previous rendered output so display stays byte-for-byte identical; the
 * spellings themselves are dictionary facts.
 */

import { isHebLeapYear, months } from './hebrew-calendar';

// Index 0 unused; 12 = Adar I, 13 = Adar II (leap-year names).
const PLAIN: readonly string[] = [
  '',
  '\u{5E0}\u{5D9}\u{5E1}\u{5DF}', // ניסן
  '\u{5D0}\u{5D9}\u{5D9}\u{5E8}', // אייר
  '\u{5E1}\u{5D9}\u{5D5}\u{5DF}', // סיון
  '\u{5EA}\u{5DE}\u{5D5}\u{5D6}', // תמוז
  '\u{5D0}\u{5D1}', // אב
  '\u{5D0}\u{5DC}\u{5D5}\u{5DC}', // אלול
  '\u{5EA}\u{5E9}\u{5E8}\u{5D9}', // תשרי
  '\u{5D7}\u{5E9}\u{5D5}\u{5DF}', // חשון
  '\u{5DB}\u{5E1}\u{5DC}\u{5D5}', // כסלו
  '\u{5D8}\u{5D1}\u{5EA}', // טבת
  '\u{5E9}\u{5D1}\u{5D8}', // שבט
  '\u{5D0}\u{5D3}\u{5E8} \u{5D0}\u{5F3}', // אדר א׳
  '\u{5D0}\u{5D3}\u{5E8} \u{5D1}\u{5F3}', // אדר ב׳
];

const NIKUD: readonly string[] = [
  '',
  '\u{5E0}\u{5B4}\u{5D9}\u{5E1}\u{5B8}\u{5DF}', // נִיסָן
  '\u{5D0}\u{5B4}\u{5D9}\u{5B8}\u{5BC}\u{5D9}\u{5E8}', // אִיָּיר
  '\u{5E1}\u{5B4}\u{5D9}\u{5D5}\u{5B8}\u{5DF}', // סִיוָן
  '\u{5EA}\u{5B7}\u{5BC}\u{5DE}\u{5BC}\u{5D5}\u{5BC}\u{5D6}', // תַּמּוּז
  '\u{5D0}\u{5B8}\u{5D1}', // אָב
  '\u{5D0}\u{5B1}\u{5DC}\u{5D5}\u{5BC}\u{5DC}', // אֱלוּל
  '\u{5EA}\u{5B4}\u{5BC}\u{5E9}\u{5B0}\u{5C1}\u{5E8}\u{5B5}\u{5D9}', // תִּשְׁרֵי
  '\u{5D7}\u{5B6}\u{5E9}\u{5B0}\u{5C1}\u{5D5}\u{5B8}\u{5DF}', // חֶשְׁוָן
  '\u{5DB}\u{5B4}\u{5BC}\u{5E1}\u{5B0}\u{5DC}\u{5B5}\u{5D5}', // כִּסְלֵו
  '\u{5D8}\u{5B5}\u{5D1}\u{5B5}\u{5EA}', // טֵבֵת
  '\u{5E9}\u{5B0}\u{5C1}\u{5D1}\u{5B8}\u{5D8}', // שְׁבָט
  '\u{5D0}\u{5B2}\u{5D3}\u{5B8}\u{5E8} \u{5D0}\u{5F3}', // אֲדָר א׳
  '\u{5D0}\u{5B2}\u{5D3}\u{5B8}\u{5E8} \u{5D1}\u{5F3}', // אֲדָר ב׳
];

const ADAR_PLAIN = '\u{5D0}\u{5D3}\u{5E8}'; // אדר
const ADAR_NIKUD = '\u{5D0}\u{5B2}\u{5D3}\u{5B8}\u{5E8}'; // אֲדָר

/**
 * Display name of a Hebrew month. In a common year month 12 (and a normalized
 * 13) is the single plain אדר; in a leap year 12/13 are Adar I/II.
 */
export function monthName(year: number, month: number, nikud = false): string {
  if (month < months.NISAN || month > months.ADAR_II) {
    throw new RangeError(`monthName: month out of range (1-13), got ${month}`);
  }
  if (month >= months.ADAR_I && !isHebLeapYear(year)) {
    return nikud ? ADAR_NIKUD : ADAR_PLAIN;
  }
  return nikud ? NIKUD[month] : PLAIN[month];
}
