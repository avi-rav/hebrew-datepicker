/**
 * Selectability constraints (min / max / custom predicate).
 *
 * Single Responsibility: this module answers exactly one question — "may this
 * day be selected?" — and nothing about rendering or selection state.
 */

import { atMidnight } from './hdate-utils';

/** Restricts which days may be selected. All fields are optional. */
export interface Constraints {
  /** Earliest selectable day (inclusive). */
  min?: Date | null;
  /** Latest selectable day (inclusive). */
  max?: Date | null;
  /**
   * Custom predicate: return `true` to DISABLE the given day.
   *
   * Open/Closed: arbitrary business rules (e.g. "no Fridays", "no fast days")
   * are injected here without modifying the core.
   */
  disabledDates?: (date: Date) => boolean;
}

/** Is `date` blocked by the given constraints? */
export function isDisabled(date: Date, constraints?: Constraints): boolean {
  if (!constraints) {
    return false;
  }
  const day = atMidnight(date).getTime();
  const { min, max, disabledDates } = constraints;

  if (min && day < atMidnight(min).getTime()) {
    return true;
  }
  if (max && day > atMidnight(max).getTime()) {
    return true;
  }
  if (disabledDates && disabledDates(date)) {
    return true;
  }
  return false;
}
