/**
 * The heart of the core: turn a Hebrew `(year, month)` plus context into a
 * fully-flagged 6×7 grid ready for any UI to render.
 *
 * Pure function, no side effects — which is exactly what makes it trivial to
 * unit-test and reuse across Angular / React.
 */

import {
  atMidnight,
  dayLabel,
  daysInHebMonth,
  holidaysOn,
  isRoshChodesh,
  isSameDay,
  isShabbat,
  monthTitle,
  startOfHebMonth,
  toHDate,
} from './hdate-utils';
import { isDisabled, type Constraints } from './constraints';
import type { SelectionModel } from './selection';
import type { HebDay, HebMonthView } from './types';

const DAYS_PER_WEEK = 7;
const WEEKS_PER_VIEW = 6;
const CELLS = DAYS_PER_WEEK * WEEKS_PER_VIEW;

/**
 * Everything `buildMonthView` needs beyond the month coordinate.
 *
 * Interface Segregation: this is a small, focused bag of collaborators, not a
 * god-object of picker state.
 */
export interface MonthViewContext {
  /** Selection strategy (single or range). */
  selection: SelectionModel<unknown>;
  /** Selectability constraints. */
  constraints?: Constraints;
  /** Israel holiday schedule (`true`) vs. Diaspora (`false`). */
  israel?: boolean;
  /** First column's weekday, 0=Sunday (default) .. 6=Saturday. */
  firstDayOfWeek?: number;
  /** Include vowel points in the month title. */
  nikud?: boolean;
  /** Injectable "today" (defaults to now) — keeps the function deterministic. */
  today?: Date;
}

/** Hebrew weekday initials, Sunday-first. */
const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

/** Weekday header labels rotated to start at `firstDayOfWeek`. */
export function weekdayLabels(firstDayOfWeek = 0): string[] {
  return Array.from(
    { length: DAYS_PER_WEEK },
    (_, i) => WEEKDAY_LABELS[(firstDayOfWeek + i) % DAYS_PER_WEEK],
  );
}

/** Build one month's 6×7 grid with all per-day flags resolved. */
export function buildMonthView(
  year: number,
  month: number,
  ctx: MonthViewContext,
): HebMonthView {
  const {
    selection,
    constraints,
    israel = true,
    firstDayOfWeek = 0,
    nikud = false,
  } = ctx;
  const today = atMidnight(ctx.today ?? new Date());

  // Find the Gregorian date of the first grid cell: the first day of the
  // Hebrew month, walked back to the configured start-of-week column.
  const firstOfMonth = startOfHebMonth(year, month);
  const leadOffset = (firstOfMonth.getDay() - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const firstCell = new Date(
    firstOfMonth.getFullYear(),
    firstOfMonth.getMonth(),
    firstOfMonth.getDate() - leadOffset,
  );

  const weeks: HebDay[][] = [];
  for (let w = 0; w < WEEKS_PER_VIEW; w++) {
    const row: HebDay[] = [];
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const index = w * DAYS_PER_WEEK + d;
      const cellDate = new Date(
        firstCell.getFullYear(),
        firstCell.getMonth(),
        firstCell.getDate() + index,
      );
      row.push(buildDay(cellDate, year, month, today, selection, constraints, israel));
    }
    weeks.push(row);
  }

  return { hebYear: year, hebMonth: month, title: monthTitle(year, month, { nikud }), weeks };
}

function buildDay(
  cellDate: Date,
  viewYear: number,
  viewMonth: number,
  today: Date,
  selection: SelectionModel<unknown>,
  constraints: Constraints | undefined,
  israel: boolean,
): HebDay {
  const hd = toHDate(cellDate);
  const hebYear = hd.getFullYear();
  const hebMonth = hd.getMonth();
  const hebDay = hd.getDate();
  const holidays = holidaysOn(cellDate, israel);

  return {
    date: cellDate,
    hebYear,
    hebMonth,
    hebDay,
    label: dayLabel(hebDay),
    holidays,
    flags: {
      isToday: isSameDay(cellDate, today),
      isSelected: selection.isSelected(cellDate),
      isRangeStart: selection.isRangeStart(cellDate),
      isRangeEnd: selection.isRangeEnd(cellDate),
      isInRange: selection.isInRange(cellDate),
      isDisabled: isDisabled(cellDate, constraints),
      isShabbat: isShabbat(cellDate),
      isRoshChodesh: isRoshChodesh(hebDay),
      isHoliday: holidays.length > 0,
      isOtherMonth: hebYear !== viewYear || hebMonth !== viewMonth,
    },
  };
}

export { CELLS as CELLS_PER_VIEW };
