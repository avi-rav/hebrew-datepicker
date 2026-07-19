/**
 * Byte-for-byte compatibility with the picker's previous rendered output:
 * every fixture here was captured programmatically from the old engine, so a
 * pass proves users see identical strings after the engine swap.
 */

import { formatGematriya, monthTitle } from '../hdate-utils';
import { GOLDEN_DATES, GOLDEN_TITLES } from './golden-fixtures';

describe('golden display-string compatibility', () => {
  it('formatGematriya matches the previous engine for all captured dates', () => {
    for (const [iso, plain, nikud] of GOLDEN_DATES) {
      const [y, m, d] = iso.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      expect(formatGematriya(date), iso).toBe(plain);
      expect(formatGematriya(date, { nikud: true }), `${iso} nikud`).toBe(nikud);
    }
  });

  it('monthTitle matches the previous engine for a full leap + common year', () => {
    for (const [year, month, plain, nikud] of GOLDEN_TITLES) {
      expect(monthTitle(year, month), `${year}/${month}`).toBe(plain);
      expect(monthTitle(year, month, { nikud: true }), `${year}/${month} nikud`).toBe(nikud);
    }
  });
});
