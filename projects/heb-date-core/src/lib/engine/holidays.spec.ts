import { GOLDEN_DAY_LABELS } from './golden-fixtures';
import {
  hebMonthLength,
  hebrewToRD,
  isHebLeapYear,
  months,
  monthsInHebYear,
  rdDayOfWeek,
} from './hebrew-calendar';
import { holidaysForHebDate } from './holidays';

const on = (y: number, m: number, d: number, israel = true) =>
  holidaysForHebDate(y, m, d, israel);

/** Weekday (0=Sun..6=Sat) of a Hebrew date — for locating postponement years. */
const dow = (y: number, m: number, d: number) => rdDayOfWeek(hebrewToRD(y, m, d));

/** First year >= from where the given Hebrew date falls on `weekday`. */
function yearWhere(from: number, m: number, d: number, weekday: number): number {
  for (let y = from; y < from + 40; y++) {
    if (dow(y, m, d) === weekday) {
      return y;
    }
  }
  throw new Error('no such year in range');
}

describe('Tishrei holidays', () => {
  it('marks Rosh Hashana on 1-2 Tishrei in both schedules', () => {
    for (const israel of [true, false]) {
      expect(on(5786, months.TISHREI, 1, israel)).toEqual(['ראש השנה']);
      expect(on(5786, months.TISHREI, 2, israel)).toEqual(['ראש השנה']);
    }
  });

  it('marks Yom Kippur, Sukkot, chol hamoed, Hoshana Raba (Israel)', () => {
    expect(on(5786, months.TISHREI, 10)).toEqual(['יום כיפור']);
    expect(on(5786, months.TISHREI, 15)).toEqual(['סוכות']);
    for (let d = 16; d <= 20; d++) {
      expect(on(5786, months.TISHREI, d), `day ${d}`).toEqual(['חול המועד סוכות']);
    }
    expect(on(5786, months.TISHREI, 21)).toEqual(['הושענא רבה']);
    expect(on(5786, months.TISHREI, 22)).toEqual(['שמיני עצרת / שמחת תורה']);
    expect(on(5786, months.TISHREI, 23)).toEqual([]);
  });

  it('adds yom tov sheni in the Diaspora schedule', () => {
    expect(on(5786, months.TISHREI, 16, false)).toEqual(['סוכות']);
    expect(on(5786, months.TISHREI, 17, false)).toEqual(['חול המועד סוכות']);
    expect(on(5786, months.TISHREI, 22, false)).toEqual(['שמיני עצרת']);
    expect(on(5786, months.TISHREI, 23, false)).toEqual(['שמחת תורה']);
  });

  it('observes Tzom Gedaliah on 3 Tishrei normally', () => {
    const y = yearWhere(5780, months.TISHREI, 3, 3); // any non-Shabbat weekday
    expect(on(y, months.TISHREI, 3)).toEqual(['צום גדליה']);
    expect(on(y, months.TISHREI, 4)).toEqual([]);
  });

  it('defers Tzom Gedaliah to Sunday 4 Tishrei when 3 Tishrei is Shabbat', () => {
    const y = yearWhere(5780, months.TISHREI, 3, 6);
    // The fast vacates the Shabbat, which is Shabbat Shuva that year.
    expect(on(y, months.TISHREI, 3)).toEqual(['שבת שובה']);
    expect(on(y, months.TISHREI, 4)).toEqual(['צום גדליה']);
  });
});

describe('Chanukah', () => {
  it('spans exactly 8 days from 25 Kislev when Kislev has 30 days', () => {
    const y = 5787; // shlemah: Kislev = 30
    for (let d = 25; d <= 30; d++) {
      expect(on(y, months.KISLEV, d), `Kislev ${d}`).toEqual(['חנוכה']);
    }
    expect(on(y, months.TEVET, 1)).toEqual(['חנוכה']);
    expect(on(y, months.TEVET, 2)).toEqual(['חנוכה']);
    expect(on(y, months.TEVET, 3)).toEqual([]);
    expect(on(y, months.KISLEV, 24)).toEqual([]);
  });

  it('spans exactly 8 days ending 3 Tevet when Kislev has 29 days', () => {
    const y = 5781; // chaserah: Kislev = 29
    for (let d = 25; d <= 29; d++) {
      expect(on(y, months.KISLEV, d), `Kislev ${d}`).toEqual(['חנוכה']);
    }
    expect(on(y, months.TEVET, 1)).toEqual(['חנוכה']);
    expect(on(y, months.TEVET, 2)).toEqual(['חנוכה']);
    expect(on(y, months.TEVET, 3)).toEqual(['חנוכה']);
    expect(on(y, months.TEVET, 4)).toEqual([]);
  });

  it('marks Asara B׳Tevet on 10 Tevet', () => {
    expect(on(5786, months.TEVET, 10)).toEqual(['עשרה בטבת']);
  });
});

describe('Purim cycle (in the final Adar)', () => {
  it('marks Purim and Shushan Purim in Adar II of a leap year only', () => {
    expect(on(5787, months.ADAR_II, 14)).toEqual(['פורים']);
    expect(on(5787, months.ADAR_II, 15)).toEqual(['שושן פורים']);
    expect(on(5787, months.ADAR_I, 14)).toEqual([]); // Purim Katan is out of scope
    expect(on(5786, months.ADAR_I, 14)).toEqual(['פורים']); // common year: single Adar
  });

  it('observes Ta׳anit Esther on 13 Adar normally', () => {
    // A common year whose 13 Adar is a plain weekday (Thursday here).
    let y = 5780;
    while (isHebLeapYear(y) || dow(y, months.ADAR_I, 13) !== 4) {
      y++;
    }
    expect(on(y, months.ADAR_I, 13)).toEqual(['תענית אסתר']);
    expect(on(y, months.ADAR_I, 11)).toEqual([]);
  });

  it('advances Ta׳anit Esther to Thursday when 13 Adar is Shabbat', () => {
    // Find a common year whose 13 Adar falls on Shabbat.
    let y = 5780;
    for (; ; y++) {
      if (!isHebLeapYear(y) && dow(y, months.ADAR_I, 13) === 6) {
        break;
      }
    }
    // 13 Adar vacated by the advanced fast is Shabbat Zachor (Purim is Sunday).
    expect(on(y, months.ADAR_I, 13)).toEqual(['שבת זכור']);
    expect(on(y, months.ADAR_I, 11)).toEqual(['תענית אסתר']);
  });
});

describe('Nisan and Sivan', () => {
  it('marks Pesach, chol hamoed and Shvi׳i shel Pesach (Israel)', () => {
    expect(on(5786, months.NISAN, 15)).toEqual(['פסח']);
    for (let d = 16; d <= 20; d++) {
      expect(on(5786, months.NISAN, d), `day ${d}`).toEqual(['חול המועד פסח']);
    }
    expect(on(5786, months.NISAN, 21)).toEqual(['שביעי של פסח']);
    expect(on(5786, months.NISAN, 22)).toEqual([]);
  });

  it('adds the Diaspora eighth day of Pesach and second day of Shavuot', () => {
    expect(on(5786, months.NISAN, 16, false)).toEqual(['פסח']);
    expect(on(5786, months.NISAN, 22, false)).toEqual(['אחרון של פסח']);
    expect(on(5786, months.SIVAN, 6)).toEqual(['שבועות']);
    expect(on(5786, months.SIVAN, 7)).toEqual([]);
    expect(on(5786, months.SIVAN, 7, false)).toEqual(['שבועות']);
  });
});

describe('summer fasts (deferred off Shabbat)', () => {
  it('observes 17 Tammuz / 9 Av on their dates in a normal year', () => {
    const y = yearWhere(5780, months.TAMUZ, 17, 2);
    expect(on(y, months.TAMUZ, 17)).toEqual(['שבעה עשר בתמוז']);
    expect(on(y, months.TAMUZ, 18)).toEqual([]);
    expect(on(y, months.AV, 9)).toEqual(['תשעה באב']);
    expect(on(y, months.AV, 10)).toEqual([]);
  });

  it('defers both to Sunday when they fall on Shabbat', () => {
    const y = yearWhere(5780, months.TAMUZ, 17, 6);
    // 17 Tammuz and 9 Av always share a weekday.
    expect(dow(y, months.AV, 9)).toBe(6);
    expect(on(y, months.TAMUZ, 17)).toEqual([]);
    expect(on(y, months.TAMUZ, 18)).toEqual(['שבעה עשר בתמוז']);
    // 9 Av vacated by the deferred fast is Shabbat Chazon itself.
    expect(on(y, months.AV, 9)).toEqual(['שבת חזון']);
    expect(on(y, months.AV, 10)).toEqual(['תשעה באב']);
  });
});

describe('Tu BiShvat and Lag BaOmer', () => {
  it('marks 15 Shvat and 18 Iyyar with gematriya-exact labels', () => {
    // GOLDEN_DAY_LABELS carries the captured ט״ו rendering (index = day-1).
    expect(on(5786, months.SHVAT, 15)).toEqual([`${GOLDEN_DAY_LABELS[14]} בשבט`]);
    expect(on(5787, months.SHVAT, 15, false)).toEqual([`${GOLDEN_DAY_LABELS[14]} בשבט`]);
    expect(on(5786, months.IYYAR, 18)[0].endsWith(' בעומר')).toBe(true);
    expect(on(5786, months.SHVAT, 14)).toEqual([]);
    expect(on(5786, months.IYYAR, 17)).toEqual([]);
  });
});

describe('special Shabbatot', () => {
  /** All special-Shabbat labels of a year, verifying each lands on Shabbat at most once. */
  function specialShabbatotOf(year: number): Map<string, { month: number; day: number }> {
    const found = new Map<string, { month: number; day: number }>();
    for (let m = 1; m <= monthsInHebYear(year); m++) {
      for (let d = 1; d <= hebMonthLength(year, m); d++) {
        for (const name of holidaysForHebDate(year, m, d, true)) {
          if (name.startsWith('שבת ')) {
            expect(dow(year, m, d), `${name} ${year}/${m}/${d} must be Shabbat`).toBe(6);
            expect(found.has(name), `${name} twice in ${year}`).toBe(false);
            found.set(name, { month: m, day: d });
          }
        }
      }
    }
    return found;
  }

  it('finds all eight exactly once per year, in their legal windows (5780-5805)', () => {
    for (let y = 5780; y <= 5805; y++) {
      const s = specialShabbatotOf(y);
      const finalAdar = isHebLeapYear(y) ? months.ADAR_II : months.ADAR_I;
      expect(s.size, `year ${y}: ${[...s.keys()].join(',')}`).toBe(8);

      const at = (name: string) => s.get(name)!;
      const rdOf = (p: { month: number; day: number }) => hebrewToRD(y, p.month, p.day);

      const shuva = at('שבת שובה');
      expect(shuva.month).toBe(months.TISHREI);
      expect(shuva.day).toBeGreaterThanOrEqual(3);
      expect(shuva.day).toBeLessThanOrEqual(9);

      // Shekalim: on 1 (final) Adar or within the preceding week.
      const gap = hebrewToRD(y, finalAdar, 1) - rdOf(at('שבת שקלים'));
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(6);

      const zachor = at('שבת זכור');
      expect(zachor.month).toBe(finalAdar);
      expect(zachor.day).toBeGreaterThanOrEqual(7);
      expect(zachor.day).toBeLessThanOrEqual(13);

      // Parah is exactly one week before HaChodesh, which sits on/just before 1 Nisan.
      const hachodeshGap = hebrewToRD(y, months.NISAN, 1) - rdOf(at('שבת החודש'));
      expect(hachodeshGap).toBeGreaterThanOrEqual(0);
      expect(hachodeshGap).toBeLessThanOrEqual(6);
      expect(rdOf(at('שבת החודש')) - rdOf(at('שבת פרה'))).toBe(7);

      const hagadol = at('שבת הגדול');
      expect(hagadol.month).toBe(months.NISAN);
      expect(hagadol.day).toBeGreaterThanOrEqual(8);
      expect(hagadol.day).toBeLessThanOrEqual(14);

      const chazon = at('שבת חזון');
      expect(chazon.month).toBe(months.AV);
      expect(chazon.day).toBeGreaterThanOrEqual(3);
      expect(chazon.day).toBeLessThanOrEqual(9);
      expect(rdOf(at('שבת נחמו')) - rdOf(chazon)).toBe(7);
    }
  });

  it('puts Shabbat Shuva on 3 Tishrei alongside the deferred Tzom Gedaliah', () => {
    // 5785: Rosh Hashana on Thursday, so 3 Tishrei is Shabbat.
    expect(dow(5785, months.TISHREI, 3)).toBe(6);
    expect(on(5785, months.TISHREI, 3)).toEqual(['שבת שובה']);
    expect(on(5785, months.TISHREI, 4)).toEqual(['צום גדליה']);
  });

  it('puts Shabbat Chazon on 9 Av itself when the fast is deferred', () => {
    const y = yearWhere(5780, months.AV, 9, 6);
    expect(on(y, months.AV, 9)).toEqual(['שבת חזון']);
    expect(on(y, months.AV, 10)).toEqual(['תשעה באב']);
    expect(on(y, months.AV, 16)).toEqual(['שבת נחמו']);
  });

  it('puts Shabbat HaGadol on erev Pesach when 14 Nisan is Shabbat', () => {
    const y = yearWhere(5780, months.NISAN, 14, 6);
    expect(on(y, months.NISAN, 14)).toEqual(['שבת הגדול']);
  });

  it('lets Shekalim fall in Adar I of a leap year', () => {
    let y = 5780;
    for (; ; y++) {
      if (isHebLeapYear(y) && dow(y, months.ADAR_II, 1) !== 6) {
        break;
      }
    }
    const s = specialShabbatotOf(y);
    expect(s.get('שבת שקלים')!.month).toBe(months.ADAR_I);
  });
});

describe('out-of-scope days stay unmarked', () => {
  it('returns [] for excluded observances and ordinary days', () => {
    expect(on(5786, months.AV, 15)).toEqual([]); // Tu B'Av (15 Av 5786 is a Tuesday)
    expect(on(5786, months.NISAN, 14)).toEqual([]); // erev Pesach (a Tuesday in 5786)
    expect(on(5787, months.ADAR_I, 14)).toEqual([]); // Purim Katan
    expect(on(5786, months.CHESHVAN, 12)).toEqual([]);
    expect(on(5786, months.ELUL, 5)).toEqual([]);
  });
});
