import {
  dayLabel,
  daysInHebMonth,
  formatGematriya,
  isRoshChodesh,
  isShabbat,
  monthTitle,
  months,
  nextHebMonth,
  prevHebMonth,
  nextHebYear,
  prevHebYear,
  startOfHebMonth,
} from './hdate-utils';

describe('gematriya formatting', () => {
  it('formats a full date without nikud (the headline use case)', () => {
    // 21 Elul 5786 === 3 Sep 2026 (verified against @hebcal/core).
    expect(formatGematriya(new Date(2026, 8, 3))).toBe('כ״א אלול תשפ״ו');
  });

  it('formats a full date with nikud when requested', () => {
    expect(formatGematriya(new Date(2026, 8, 3), { nikud: true })).toBe('כ״א אֱלוּל תשפ״ו');
  });

  it('labels day-of-month in gematriya, incl. the 15/16 special cases', () => {
    expect(dayLabel(21)).toBe('כ״א');
    expect(dayLabel(15)).toBe('ט״ו'); // not י״ה
    expect(dayLabel(16)).toBe('ט״ז'); // not י״ו
  });

  it('builds a month title (month + year, no day)', () => {
    expect(monthTitle(5786, months.ELUL)).toBe('אלול תשפ״ו');
  });

  it('distinguishes Adar I / Adar II in a leap year title', () => {
    expect(monthTitle(5787, months.ADAR_I)).toBe('אדר א׳ תשפ״ז');
    expect(monthTitle(5787, months.ADAR_II)).toBe('אדר ב׳ תשפ״ז');
  });
});

describe('month length', () => {
  it('reports the variable length of Cheshvan/Kislev', () => {
    // 5787 is a shlemah (complete) year: both are 30 days.
    expect(daysInHebMonth(5787, months.CHESHVAN)).toBe(30);
    expect(daysInHebMonth(5787, months.KISLEV)).toBe(30);
  });
});

describe('month navigation (day-based, contiguous across the year)', () => {
  it('walks forward through a leap year including Adar I -> Adar II -> Nisan', () => {
    const seq: string[] = [];
    let ref: { year: number; month: number } = { year: 5787, month: months.SHVAT };
    for (let i = 0; i < 4; i++) {
      seq.push(monthTitle(ref.year, ref.month));
      ref = nextHebMonth(ref.year, ref.month);
    }
    expect(seq).toEqual(['שבט תשפ״ז', 'אדר א׳ תשפ״ז', 'אדר ב׳ תשפ״ז', 'ניסן תשפ״ז']);
  });

  it('crosses the Tishrei/Elul year boundary correctly (regression: not Av)', () => {
    // add(-1,'month') skips Elul here; day-based prev must not.
    const prev = prevHebMonth(5787, months.TISHREI);
    expect(monthTitle(prev.year, prev.month)).toBe('אלול תשפ״ו');
  });

  it('advances Elul -> Tishrei of the next year', () => {
    const next = nextHebMonth(5786, months.ELUL);
    expect(monthTitle(next.year, next.month)).toBe('תשרי תשפ״ז');
  });

  it('collapses Adar II to Adar when jumping to a non-leap year', () => {
    // 5787 leap -> 5788 non-leap: Adar II has no counterpart.
    const ref = nextHebYear(5787, months.ADAR_II);
    expect(monthTitle(ref.year, ref.month)).toBe('אדר תשפ״ח');
    const back = prevHebYear(5787, months.ADAR_II);
    expect(monthTitle(back.year, back.month)).toBe('אדר תשפ״ו');
  });
});

describe('day classification helpers', () => {
  it('detects Shabbat (Saturday)', () => {
    // 1 Tishrei 5787 falls on a specific weekday; use a known Saturday instead.
    const saturday = new Date(2026, 0, 3); // 3 Jan 2026 is a Saturday
    expect(isShabbat(saturday)).toBe(true);
    expect(isShabbat(new Date(2026, 0, 4))).toBe(false);
  });

  it('flags Rosh Chodesh on day 1 and day 30', () => {
    expect(isRoshChodesh(1)).toBe(true);
    expect(isRoshChodesh(30)).toBe(true);
    expect(isRoshChodesh(2)).toBe(false);
    expect(isRoshChodesh(29)).toBe(false);
  });

  it('anchors the first of a month to local midnight', () => {
    const d = startOfHebMonth(5786, months.ELUL);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});
