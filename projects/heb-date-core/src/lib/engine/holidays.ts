/**
 * Holiday/observance rules for the picker: chagim, tzomot, Tu BiShvat,
 * Lag BaOmer, and the date-anchored special Shabbatot.
 *
 * Deliberately NOT a full luach: no modern national days, no erev-chag
 * entries, and no Torah-reading-cycle events (e.g. Shabbat Shirah, which
 * follows parashat Beshalach rather than a fixed date).
 *
 * Fast days are reported on their *observed* date: a fast that falls on
 * Shabbat is deferred to Sunday (Tzom Gedaliah, 17 Tammuz, Tisha B'Av), and
 * Ta'anit Esther is advanced to the preceding Thursday. Asara B'Tevet can
 * never fall on Shabbat, so it needs no rule.
 */

import { gematriya } from './gematriya';
import { hebrewToRD, isHebLeapYear, months, rdDayOfWeek } from './hebrew-calendar';

const SUNDAY = 0;
const THURSDAY = 4;
const SATURDAY = 6;

// Built via gematriya() so the gershayim mark is the exact same codepoint
// used everywhere else (never hand-typed).
const TU_BISHVAT = `${gematriya(15)} בשבט`; // ט״ו בשבט
const LAG_BAOMER = `${gematriya(33)} בעומר`; // ל״ג בעומר

/** Rata Die of the Shabbat on or before the given Rata Die day. */
function shabbatOnOrBefore(rd: number): number {
  return rd - ((rdDayOfWeek(rd) + 1) % 7);
}

/**
 * The special-Shabbat name for a Shabbat at `rd`, or `null`. All eight are
 * anchored to fixed Hebrew dates: Shuva (before Yom Kippur), the four
 * parshiyot (Shekalim, Zachor, Parah, HaChodesh), HaGadol (before Pesach),
 * Chazon (before Tisha B'Av) and Nachamu (after it).
 */
function specialShabbat(year: number, month: number, day: number, rd: number): string | null {
  if (month === months.TISHREI) {
    // The single Shabbat between Rosh Hashana and Yom Kippur.
    return day >= 3 && day <= 9 ? 'שבת שובה' : null;
  }

  // Purim's Adar: 13 in a leap year, the single Adar (12) otherwise. Shekalim
  // may land in the preceding month (late Shvat, or Adar I in a leap year).
  const finalAdar = isHebLeapYear(year) ? months.ADAR_II : months.ADAR_I;
  if (month >= months.SHVAT || month === months.NISAN) {
    if (rd === shabbatOnOrBefore(hebrewToRD(year, finalAdar, 1))) {
      return 'שבת שקלים';
    }
    if (rd === shabbatOnOrBefore(hebrewToRD(year, finalAdar, 13))) {
      return 'שבת זכור';
    }
    const hachodesh = shabbatOnOrBefore(hebrewToRD(year, months.NISAN, 1));
    if (rd === hachodesh - 7) {
      return 'שבת פרה';
    }
    if (rd === hachodesh) {
      return 'שבת החודש';
    }
    if (rd === shabbatOnOrBefore(hebrewToRD(year, months.NISAN, 14))) {
      return 'שבת הגדול';
    }
    return null;
  }

  if (month === months.AV) {
    const chazon = shabbatOnOrBefore(hebrewToRD(year, months.AV, 9));
    if (rd === chazon) {
      return 'שבת חזון';
    }
    if (rd === chazon + 7) {
      return 'שבת נחמו';
    }
  }
  return null;
}

/**
 * Hebrew display names of the holidays/observances falling on the given
 * Hebrew date (empty array for a plain day). `israel` selects the Israel
 * schedule (no yom tov sheni) vs. the Diaspora one.
 */
export function holidaysForHebDate(
  year: number,
  month: number,
  day: number,
  israel: boolean,
): string[] {
  const found: string[] = [];
  const rd = hebrewToRD(year, month, day);
  const weekday = rdDayOfWeek(rd);

  switch (month) {
    case months.TISHREI:
      if (day === 1 || day === 2) {
        found.push('ראש השנה');
      } else if (day === 3 && weekday !== SATURDAY) {
        found.push('צום גדליה');
      } else if (day === 4 && weekday === SUNDAY) {
        // 3 Tishrei was Shabbat — the fast is deferred to Sunday.
        found.push('צום גדליה');
      } else if (day === 10) {
        found.push('יום כיפור');
      } else if (day === 15 || (day === 16 && !israel)) {
        found.push('סוכות');
      } else if (day >= (israel ? 16 : 17) && day <= 20) {
        found.push('חול המועד סוכות');
      } else if (day === 21) {
        found.push('הושענא רבה');
      } else if (day === 22) {
        found.push(israel ? 'שמיני עצרת / שמחת תורה' : 'שמיני עצרת');
      } else if (day === 23 && !israel) {
        found.push('שמחת תורה');
      }
      break;

    case months.KISLEV:
    case months.TEVET: {
      // Chanukah: 25 Kislev + 7 days, measured in fixed days so the span is
      // right whether Kislev has 29 or 30 days (ending 2 or 3 Tevet).
      const offset = rd - hebrewToRD(year, months.KISLEV, 25);
      if (offset >= 0 && offset <= 7) {
        found.push('חנוכה');
      }
      if (month === months.TEVET && day === 10) {
        found.push('עשרה בטבת');
      }
      break;
    }

    case months.SHVAT:
      if (day === 15) {
        found.push(TU_BISHVAT);
      }
      break;

    case months.IYYAR:
      if (day === 18) {
        found.push(LAG_BAOMER);
      }
      break;

    case months.NISAN:
      if (day === 15 || (day === 16 && !israel)) {
        found.push('פסח');
      } else if (day >= (israel ? 16 : 17) && day <= 20) {
        found.push('חול המועד פסח');
      } else if (day === 21) {
        found.push('שביעי של פסח');
      } else if (day === 22 && !israel) {
        found.push('אחרון של פסח');
      }
      break;

    case months.SIVAN:
      if (day === 6 || (day === 7 && !israel)) {
        found.push('שבועות');
      }
      break;

    case months.TAMUZ:
      if ((day === 17 && weekday !== SATURDAY) || (day === 18 && weekday === SUNDAY)) {
        found.push('שבעה עשר בתמוז');
      }
      break;

    case months.AV:
      if ((day === 9 && weekday !== SATURDAY) || (day === 10 && weekday === SUNDAY)) {
        found.push('תשעה באב');
      }
      break;

    default: {
      // Purim cycle lives in the year's final Adar: month 13 when leap, 12 otherwise.
      const purimMonth = isHebLeapYear(year) ? months.ADAR_II : months.ADAR_I;
      if (month === purimMonth) {
        if (day === 13 && weekday !== SATURDAY) {
          found.push('תענית אסתר');
        } else if (day === 11 && weekday === THURSDAY) {
          // 13 Adar falls on Shabbat — the fast is advanced to Thursday.
          found.push('תענית אסתר');
        } else if (day === 14) {
          found.push('פורים');
        } else if (day === 15) {
          found.push('שושן פורים');
        }
      }
      break;
    }
  }

  if (weekday === SATURDAY) {
    const special = specialShabbat(year, month, day, rd);
    if (special) {
      found.push(special);
    }
  }

  return found;
}
