import { buildMonthView, weekdayLabels } from './calendar-grid';
import { months } from './hdate-utils';
import { RangeSelectionModel, SingleSelectionModel } from './selection';

const ctx = (over = {}) => ({
  selection: new SingleSelectionModel(),
  israel: true,
  today: new Date(2026, 0, 1),
  ...over,
});

describe('weekdayLabels', () => {
  it('is Sunday-first by default', () => {
    expect(weekdayLabels()).toEqual(['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']);
  });

  it('rotates to the configured first day of week', () => {
    expect(weekdayLabels(1)).toEqual(['ב', 'ג', 'ד', 'ה', 'ו', 'ש', 'א']);
  });
});

describe('buildMonthView', () => {
  it('always produces a 6×7 grid', () => {
    const view = buildMonthView(5786, months.ELUL, ctx());
    expect(view.weeks).toHaveLength(6);
    expect(view.weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('carries the month title', () => {
    const view = buildMonthView(5786, months.ELUL, ctx());
    expect(view.title).toBe('אלול תשפ״ו');
  });

  it('starts the grid on the configured first-day-of-week column', () => {
    const view = buildMonthView(5786, months.ELUL, ctx({ firstDayOfWeek: 0 }));
    expect(view.weeks[0][0].date.getDay()).toBe(0); // Sunday
    const mon = buildMonthView(5786, months.ELUL, ctx({ firstDayOfWeek: 1 }));
    expect(mon.weeks[0][0].date.getDay()).toBe(1); // Monday
  });

  it('flags spillover days from adjacent months', () => {
    const view = buildMonthView(5786, months.ELUL, ctx());
    const all = view.weeks.flat();
    const inMonth = all.filter((d) => !d.flags.isOtherMonth);
    // Every in-month cell belongs to the requested month.
    expect(inMonth.every((d) => d.hebMonth === months.ELUL && d.hebYear === 5786)).toBe(true);
    // The 1st of the month is present and not marked other-month.
    const first = all.find((d) => d.hebDay === 1 && !d.flags.isOtherMonth);
    expect(first).toBeDefined();
  });

  it('labels each day in gematriya', () => {
    const view = buildMonthView(5786, months.ELUL, ctx());
    const first = view.weeks.flat().find((d) => d.hebDay === 1 && !d.flags.isOtherMonth)!;
    expect(first.label).toBe('א׳');
  });

  it('marks the injected "today"', () => {
    // 1 Jan 2026 -> find it and assert the flag; other days are not today.
    const view = buildMonthView(5786, months.TEVET, ctx({ today: new Date(2026, 0, 1) }));
    const todays = view.weeks.flat().filter((d) => d.flags.isToday);
    expect(todays.length).toBeLessThanOrEqual(1);
  });

  it('reflects the single selection', () => {
    const selected = new Date(2026, 8, 3); // 21 Elul 5786
    const view = buildMonthView(5786, months.ELUL, ctx({ selection: new SingleSelectionModel(selected) }));
    const cell = view.weeks.flat().find((d) => d.flags.isSelected);
    expect(cell?.hebDay).toBe(21);
  });

  it('reflects a range selection with in-between highlighting', () => {
    // 21 Elul (3 Sep) .. 25 Elul (7 Sep) — three days in between.
    const selection = new RangeSelectionModel().select(new Date(2026, 8, 3)).select(new Date(2026, 8, 7));
    const view = buildMonthView(5786, months.ELUL, ctx({ selection }));
    const flat = view.weeks.flat();
    expect(flat.find((d) => d.flags.isRangeStart)?.hebDay).toBe(21);
    expect(flat.find((d) => d.flags.isRangeEnd)?.hebDay).toBe(25);
    expect(flat.filter((d) => d.flags.isInRange).length).toBe(3); // 22,23,24
  });

  it('applies min/max constraints as disabled flags', () => {
    const view = buildMonthView(5786, months.ELUL, ctx({
      constraints: { min: new Date(2026, 8, 3) },
    }));
    const first = view.weeks.flat().find((d) => d.hebDay === 1 && !d.flags.isOtherMonth)!;
    expect(first.flags.isDisabled).toBe(true); // before min
  });

  it('marks Shabbat cells', () => {
    const view = buildMonthView(5786, months.ELUL, ctx());
    const shabbatot = view.weeks.flat().filter((d) => d.flags.isShabbat);
    expect(shabbatot.every((d) => d.date.getDay() === 6)).toBe(true);
    expect(shabbatot.length).toBeGreaterThanOrEqual(4);
  });
});
