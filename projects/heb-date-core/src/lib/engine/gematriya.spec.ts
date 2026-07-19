import { gematriya } from './gematriya';
import { GOLDEN_DAY_LABELS, GOLDEN_YEARS } from './golden-fixtures';

describe('gematriya', () => {
  it('matches the captured golden labels for every day of month 1..30', () => {
    for (let n = 1; n <= 30; n++) {
      expect(gematriya(n), `day ${n}`).toBe(GOLDEN_DAY_LABELS[n - 1]);
    }
  });

  it('matches the captured golden year renderings (thousands dropped)', () => {
    for (const [year, expected] of GOLDEN_YEARS) {
      expect(gematriya(year), `year ${year}`).toBe(expected);
    }
  });

  it('applies the 15/16 substitution inside larger numbers too', () => {
    expect(gematriya(5715)).toBe(GOLDEN_YEARS.find(([y]) => y === 5715)![1]); // תשט״ו
    expect(gematriya(5716)).toBe(GOLDEN_YEARS.find(([y]) => y === 5716)![1]); // תשט״ז
  });

  it('rejects non-positive and non-integer input', () => {
    expect(() => gematriya(0)).toThrow(RangeError);
    expect(() => gematriya(-3)).toThrow(RangeError);
    expect(() => gematriya(1.5)).toThrow(RangeError);
  });
});
