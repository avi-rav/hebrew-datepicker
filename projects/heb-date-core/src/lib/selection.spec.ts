import { RangeSelectionModel, SingleSelectionModel, normalizeRange } from './selection';

const d = (day: number) => new Date(2026, 6, day); // July 2026

describe('SingleSelectionModel', () => {
  it('starts empty', () => {
    const m = new SingleSelectionModel();
    expect(m.value).toBeNull();
    expect(m.isSelected(d(5))).toBe(false);
  });

  it('selects a day immutably (returns a new model)', () => {
    const m0 = new SingleSelectionModel();
    const m1 = m0.select(d(5));
    expect(m0.value).toBeNull(); // original untouched
    expect(m1.isSelected(d(5))).toBe(true);
    expect(m1.isSelected(d(6))).toBe(false);
  });

  it('never reports range flags (Liskov: safe substitute for range)', () => {
    const m = new SingleSelectionModel(d(5));
    expect(m.isRangeStart(d(5))).toBe(false);
    expect(m.isRangeEnd(d(5))).toBe(false);
    expect(m.isInRange(d(5))).toBe(false);
  });
});

describe('RangeSelectionModel', () => {
  it('first click sets the start and clears the end', () => {
    const m = new RangeSelectionModel().select(d(10));
    expect(m.isRangeStart(d(10))).toBe(true);
    expect(m.value.end).toBeNull();
  });

  it('second click sets the end and fills the in-between days', () => {
    const m = new RangeSelectionModel().select(d(10)).select(d(14));
    expect(m.isRangeStart(d(10))).toBe(true);
    expect(m.isRangeEnd(d(14))).toBe(true);
    expect(m.isInRange(d(12))).toBe(true);
    expect(m.isInRange(d(10))).toBe(false); // endpoints are not "in range"
    expect(m.isInRange(d(14))).toBe(false);
    expect(m.isInRange(d(15))).toBe(false);
  });

  it('orders endpoints when the second click precedes the first', () => {
    const m = new RangeSelectionModel().select(d(14)).select(d(10));
    expect(m.value.start && m.value.start.getDate()).toBe(10);
    expect(m.value.end && m.value.end.getDate()).toBe(14);
  });

  it('a third click begins a fresh range', () => {
    const m = new RangeSelectionModel().select(d(10)).select(d(14)).select(d(20));
    expect(m.isRangeStart(d(20))).toBe(true);
    expect(m.value.end).toBeNull();
  });
});

describe('normalizeRange', () => {
  it('swaps reversed endpoints', () => {
    expect(normalizeRange({ start: d(14), end: d(10) })).toEqual({ start: d(10), end: d(14) });
  });

  it('leaves partial ranges untouched', () => {
    expect(normalizeRange({ start: d(10), end: null })).toEqual({ start: d(10), end: null });
  });
});
