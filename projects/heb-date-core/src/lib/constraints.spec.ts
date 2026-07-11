import { isDisabled } from './constraints';

describe('isDisabled', () => {
  const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

  it('is false with no constraints', () => {
    expect(isDisabled(day(2026, 7, 1))).toBe(false);
    expect(isDisabled(day(2026, 7, 1), {})).toBe(false);
  });

  it('blocks days before min (inclusive boundary)', () => {
    const c = { min: day(2026, 7, 10) };
    expect(isDisabled(day(2026, 7, 9), c)).toBe(true);
    expect(isDisabled(day(2026, 7, 10), c)).toBe(false); // min itself allowed
    expect(isDisabled(day(2026, 7, 11), c)).toBe(false);
  });

  it('blocks days after max (inclusive boundary)', () => {
    const c = { max: day(2026, 7, 20) };
    expect(isDisabled(day(2026, 7, 21), c)).toBe(true);
    expect(isDisabled(day(2026, 7, 20), c)).toBe(false); // max itself allowed
    expect(isDisabled(day(2026, 7, 19), c)).toBe(false);
  });

  it('ignores the time component when comparing to min/max', () => {
    const c = { min: new Date(2026, 6, 10, 23, 59), max: new Date(2026, 6, 10, 0, 1) };
    expect(isDisabled(new Date(2026, 6, 10, 12, 0), c)).toBe(false);
  });

  it('applies a custom disabledDates predicate (Open/Closed extension point)', () => {
    const noFridays = { disabledDates: (d: Date) => d.getDay() === 5 };
    expect(isDisabled(new Date(2026, 0, 2), noFridays)).toBe(true); // 2 Jan 2026 = Friday
    expect(isDisabled(new Date(2026, 0, 1), noFridays)).toBe(false);
  });
});
