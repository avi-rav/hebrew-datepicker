/**
 * Hebrew-letter (gematriya) rendering of numbers, matching the traditional
 * conventions used for calendar dates: geresh after a single letter
 * (`3 -> ג׳`), gershayim before the last of several (`21 -> כ״א`), and the
 * ט״ו/ט״ז substitutions that avoid spelling the divine name.
 */

const GERESH = '׳'; // ׳
const GERSHAYIM = '״'; // ״

// Descending letter values. Hundreds above 400 are written as repeated ת.
// Regular (non-final) letter forms throughout, per calendar convention.
const LETTER_VALUES: ReadonlyArray<readonly [number, string]> = [
  [400, 'ת'],
  [300, 'ש'],
  [200, 'ר'],
  [100, 'ק'],
  [90, 'צ'],
  [80, 'פ'],
  [70, 'ע'],
  [60, 'ס'],
  [50, 'נ'],
  [40, 'מ'],
  [30, 'ל'],
  [20, 'כ'],
  [10, 'י'],
  [9, 'ט'],
  [8, 'ח'],
  [7, 'ז'],
  [6, 'ו'],
  [5, 'ה'],
  [4, 'ד'],
  [3, 'ג'],
  [2, 'ב'],
  [1, 'א'],
];

/**
 * Render a positive integer in gematriya.
 *
 * Years drop complete thousands (`5786 -> תשפ״ו`); a round-thousands value
 * falls back to its thousands digit (`6000 -> ו׳`). Both behaviors match what
 * the picker has always displayed.
 */
export function gematriya(num: number): string {
  if (!Number.isInteger(num) || num <= 0) {
    throw new RangeError(`gematriya: expected a positive integer, got ${num}`);
  }
  let n = num;
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    n %= 1000;
    if (n === 0) {
      n = thousands;
    }
  }

  let letters = '';
  for (const [value, letter] of LETTER_VALUES) {
    // 15 and 16 are written ט״ו / ט״ז (9+6 / 9+7), never יה / יו.
    if (n === 15 || n === 16) {
      letters += 'ט' + (n === 15 ? 'ו' : 'ז');
      n = 0;
      break;
    }
    while (n >= value) {
      letters += letter;
      n -= value;
    }
  }

  return letters.length === 1
    ? letters + GERESH
    : letters.slice(0, -1) + GERSHAYIM + letters.slice(-1);
}
