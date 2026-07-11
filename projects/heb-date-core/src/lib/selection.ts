/**
 * Selection strategies (single day vs. date range).
 *
 * Liskov Substitution: `buildMonthView` and the UI depend only on the
 * {@link SelectionModel} interface. A single-day picker and a range picker are
 * fully interchangeable — swapping one for the other never breaks a consumer.
 *
 * The models are immutable: `select()` returns a NEW model, which plays nicely
 * with signal/immutable-state UIs.
 */

import { isSameDay, atMidnight } from './hdate-utils';
import type { HebRange } from './types';

/**
 * Abstraction every selection strategy implements.
 *
 * @typeParam T the shape of the underlying value (`Date | null` or `HebRange`).
 */
export interface SelectionModel<T> {
  /** The current value. */
  readonly value: T;
  /** Is `date` the (single) selected day? */
  isSelected(date: Date): boolean;
  /** Is `date` the start edge of a range? (Always `false` for single.) */
  isRangeStart(date: Date): boolean;
  /** Is `date` the end edge of a range? (Always `false` for single.) */
  isRangeEnd(date: Date): boolean;
  /** Is `date` strictly inside a range? (Always `false` for single.) */
  isInRange(date: Date): boolean;
  /** Return a NEW model reflecting a click on `date`. */
  select(date: Date): SelectionModel<T>;
}

/** Single-day selection. */
export class SingleSelectionModel implements SelectionModel<Date | null> {
  constructor(readonly value: Date | null = null) {}

  isSelected(date: Date): boolean {
    return isSameDay(this.value, date);
  }

  isRangeStart(_date: Date): boolean {
    return false;
  }

  isRangeEnd(_date: Date): boolean {
    return false;
  }

  isInRange(_date: Date): boolean {
    return false;
  }

  select(date: Date): SingleSelectionModel {
    return new SingleSelectionModel(atMidnight(date));
  }
}

/**
 * Two-endpoint range selection.
 *
 * Click behavior: the first click sets the start (and clears the end); the
 * second click sets the end. Clicking earlier than the current start (while
 * waiting for an end) restarts from the new, earlier day.
 */
export class RangeSelectionModel implements SelectionModel<HebRange> {
  readonly value: HebRange;

  constructor(value: HebRange = { start: null, end: null }) {
    this.value = normalizeRange(value);
  }

  isSelected(date: Date): boolean {
    return this.isRangeStart(date) || this.isRangeEnd(date);
  }

  isRangeStart(date: Date): boolean {
    return isSameDay(this.value.start, date);
  }

  isRangeEnd(date: Date): boolean {
    return isSameDay(this.value.end, date);
  }

  isInRange(date: Date): boolean {
    const { start, end } = this.value;
    if (!start || !end) {
      return false;
    }
    const t = atMidnight(date).getTime();
    return t > atMidnight(start).getTime() && t < atMidnight(end).getTime();
  }

  select(date: Date): RangeSelectionModel {
    const picked = atMidnight(date);
    const { start, end } = this.value;
    // No start yet, or a full range already exists → begin a new range.
    if (!start || end) {
      return new RangeSelectionModel({ start: picked, end: null });
    }
    // Have a start, waiting for an end. normalizeRange orders the endpoints.
    return new RangeSelectionModel({ start, end: picked });
  }
}

/** Order the endpoints so `start <= end` (swapping if needed). */
export function normalizeRange(range: HebRange): HebRange {
  const { start, end } = range;
  if (start && end && atMidnight(end).getTime() < atMidnight(start).getTime()) {
    return { start: end, end: start };
  }
  return { start, end };
}
