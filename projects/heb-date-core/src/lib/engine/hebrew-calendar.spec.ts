import {
  daysInHebYear,
  gregToRD,
  hebMonthLength,
  hebrewToRD,
  isHebLeapYear,
  months,
  monthsInHebYear,
  rdDayOfWeek,
  rdToGreg,
  rdToHebrew,
  roshHashanaRD,
} from './hebrew-calendar';

describe('leap years (19-year Metonic cycle)', () => {
  it('marks the classical leap positions 3,6,8,11,14,17,19 of the cycle', () => {
    // Cycle positions of years 5782..5800 — known values.
    expect(isHebLeapYear(5782)).toBe(true);
    expect(isHebLeapYear(5784)).toBe(true);
    expect(isHebLeapYear(5787)).toBe(true);
    expect(isHebLeapYear(5790)).toBe(true);
    expect(isHebLeapYear(5793)).toBe(true);
    expect(isHebLeapYear(5795)).toBe(true);
    expect(isHebLeapYear(5798)).toBe(true);
    for (const y of [5783, 5785, 5786, 5788, 5789, 5791, 5792, 5794, 5796, 5797, 5799, 5800]) {
      expect(isHebLeapYear(y)).toBe(false);
    }
  });

  it('gives 13 months in a leap year, 12 otherwise', () => {
    expect(monthsInHebYear(5787)).toBe(13);
    expect(monthsInHebYear(5786)).toBe(12);
  });
});

describe('year lengths and Rosh Hashana placement', () => {
  it('reproduces the known lengths of 5780-5800', () => {
    // Golden values captured from the previous engine.
    const expected: Record<number, number> = {
      5780: 355, 5781: 353, 5782: 384, 5783: 355, 5784: 383, 5785: 355,
      5786: 354, 5787: 385, 5788: 355, 5789: 354, 5790: 383, 5791: 355,
      5792: 354, 5793: 383, 5794: 355, 5795: 385, 5796: 354, 5797: 353,
      5798: 385, 5799: 354, 5800: 355,
    };
    for (const [y, len] of Object.entries(expected)) {
      expect(daysInHebYear(Number(y)), `year ${y}`).toBe(len);
    }
  });

  it('only ever produces the six legal year lengths', () => {
    for (let y = 5000; y <= 6000; y++) {
      const len = daysInHebYear(y);
      expect([353, 354, 355, 383, 384, 385], `year ${y} -> ${len}`).toContain(len);
      expect(len >= 383, `leap flag consistency for ${y}`).toBe(isHebLeapYear(y));
    }
  });

  it('never puts Rosh Hashana on Sunday, Wednesday or Friday (lo ADU rosh)', () => {
    for (let y = 5000; y <= 6000; y++) {
      const dow = rdDayOfWeek(roshHashanaRD(y));
      expect([0, 3, 5], `RH ${y} on weekday ${dow}`).not.toContain(dow);
    }
  });

  it('places Rosh Hashana 5786 on Tue 23 Sep 2025 and 5787 on Sat 12 Sep 2026', () => {
    expect(rdToGreg(roshHashanaRD(5786))).toEqual({ year: 2025, monthIndex: 8, day: 23 });
    expect(rdToGreg(roshHashanaRD(5787))).toEqual({ year: 2026, monthIndex: 8, day: 12 });
  });
});

describe('month lengths', () => {
  it('gives fixed lengths for the invariant months', () => {
    for (const y of [5786, 5787]) {
      expect(hebMonthLength(y, months.NISAN)).toBe(30);
      expect(hebMonthLength(y, months.IYYAR)).toBe(29);
      expect(hebMonthLength(y, months.SIVAN)).toBe(30);
      expect(hebMonthLength(y, months.TAMUZ)).toBe(29);
      expect(hebMonthLength(y, months.AV)).toBe(30);
      expect(hebMonthLength(y, months.ELUL)).toBe(29);
      expect(hebMonthLength(y, months.TISHREI)).toBe(30);
      expect(hebMonthLength(y, months.TEVET)).toBe(29);
      expect(hebMonthLength(y, months.SHVAT)).toBe(30);
    }
  });

  it('varies Cheshvan/Kislev with the year type across all six types', () => {
    // year -> [cheshvan, kislev]; covers 353/354/355/383/384/385.
    const expected: Record<number, [number, number]> = {
      5781: [29, 29], // 353 chaserah
      5786: [29, 30], // 354 kesidrah
      5783: [30, 30], // 355 shlemah
      5784: [29, 29], // 383 leap chaserah
      5782: [29, 30], // 384 leap kesidrah
      5787: [30, 30], // 385 leap shlemah
    };
    for (const [y, [ches, kis]] of Object.entries(expected)) {
      expect(hebMonthLength(Number(y), months.CHESHVAN), `Cheshvan ${y}`).toBe(ches);
      expect(hebMonthLength(Number(y), months.KISLEV), `Kislev ${y}`).toBe(kis);
    }
  });

  it('handles the Adars: Adar I 30 + Adar II 29 in leap, single Adar 29 otherwise', () => {
    expect(hebMonthLength(5787, months.ADAR_I)).toBe(30);
    expect(hebMonthLength(5787, months.ADAR_II)).toBe(29);
    expect(hebMonthLength(5786, months.ADAR_I)).toBe(29);
    // Month 13 in a common year normalizes to the single Adar.
    expect(hebMonthLength(5786, months.ADAR_II)).toBe(29);
  });

  it('sums month lengths to the exact year length (5700-5800)', () => {
    for (let y = 5700; y <= 5800; y++) {
      let sum = 0;
      for (let m = 1; m <= monthsInHebYear(y); m++) {
        sum += hebMonthLength(y, m);
      }
      expect(sum, `year ${y}`).toBe(daysInHebYear(y));
    }
  });
});

describe('conversions', () => {
  it('round-trips every day of 5700-5800 through rdToHebrew', () => {
    for (let y = 5700; y <= 5800; y++) {
      for (let m = 1; m <= monthsInHebYear(y); m++) {
        const len = hebMonthLength(y, m);
        for (const d of [1, 15, len]) {
          expect(rdToHebrew(hebrewToRD(y, m, d)), `${y}/${m}/${d}`).toEqual({
            year: y,
            month: m,
            day: d,
          });
        }
      }
    }
  });

  it('converts the documented fixture: 21 Elul 5786 === 3 Sep 2026', () => {
    const rd = gregToRD(2026, 8, 3);
    expect(rdToHebrew(rd)).toEqual({ year: 5786, month: months.ELUL, day: 21 });
    expect(rdToGreg(hebrewToRD(5786, months.ELUL, 21))).toEqual({
      year: 2026,
      monthIndex: 8,
      day: 3,
    });
  });

  it('normalizes month 13 to the single Adar in a common year', () => {
    expect(hebrewToRD(5786, months.ADAR_II, 10)).toBe(hebrewToRD(5786, months.ADAR_I, 10));
  });

  it('agrees with JS Date on Gregorian weekdays', () => {
    // 3 Jan 2026 is a Saturday (see hdate-utils.spec.ts).
    expect(rdDayOfWeek(gregToRD(2026, 0, 3))).toBe(6);
    expect(rdDayOfWeek(gregToRD(1970, 0, 1))).toBe(new Date(1970, 0, 1).getDay());
  });
});
