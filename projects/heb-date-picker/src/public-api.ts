/*
 * Public API Surface of heb-date-picker
 */

export { HebDatePickerComponent, type PickerValue } from './lib/heb-date-picker.component';
export { HebCalendarMonthComponent, type GridNavigation } from './lib/heb-calendar-month.component';
export { HebDayCellComponent } from './lib/heb-day-cell.component';

// Re-export the framework-agnostic core types/helpers for convenience, so
// consumers can `import { HebRange, formatGematriya } from 'heb-date-picker'`.
export type {
  HebRange,
  HebDay,
  HebMonthView,
  HebMonthRef,
  DayFlags,
  FormatOptions,
  Constraints,
} from 'heb-date-core';
export { formatGematriya, months } from 'heb-date-core';
