import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { HebDay } from 'heb-date-core';

/**
 * A single day cell — purely presentational.
 *
 * Single Responsibility: it draws one day and reports clicks. It knows nothing
 * about months, selection strategies, or navigation. It receives exactly the
 * data it needs ({@link HebDay}), honouring Interface Segregation.
 */
@Component({
  selector: 'heb-day-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="hdp-cell"
      [attr.data-ts]="day().date.getTime()"
      [attr.tabindex]="focusable() ? 0 : -1"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-selected]="day().flags.isSelected"
      [attr.aria-disabled]="day().flags.isDisabled"
      [attr.aria-current]="day().flags.isToday ? 'date' : null"
      [class.hdp-cell--today]="day().flags.isToday"
      [class.hdp-cell--selected]="day().flags.isSelected"
      [class.hdp-cell--range-start]="day().flags.isRangeStart"
      [class.hdp-cell--range-end]="day().flags.isRangeEnd"
      [class.hdp-cell--in-range]="day().flags.isInRange"
      [class.hdp-cell--disabled]="day().flags.isDisabled"
      [class.hdp-cell--shabbat]="day().flags.isShabbat"
      [class.hdp-cell--rosh-chodesh]="day().flags.isRoshChodesh"
      [class.hdp-cell--holiday]="day().flags.isHoliday"
      [class.hdp-cell--other-month]="day().flags.isOtherMonth"
      [title]="day().holidays.join(' · ')"
      (click)="onClick()"
    >
      <span class="hdp-cell__label">{{ day().label }}</span>
      @if (day().flags.isHoliday) {
        <span class="hdp-cell__dot" aria-hidden="true"></span>
      }
    </button>
  `,
})
export class HebDayCellComponent {
  /** The day to render. */
  readonly day = input.required<HebDay>();
  /** Whether this cell holds the roving tabindex (only one per grid). */
  readonly focusable = input<boolean>(false);
  /** Emitted when a selectable day is clicked. */
  readonly pick = output<HebDay>();

  ariaLabel(): string {
    const d = this.day();
    const parts = [d.label];
    if (d.holidays.length) {
      parts.push(d.holidays.join(', '));
    }
    return parts.join(' — ');
  }

  onClick(): void {
    if (!this.day().flags.isDisabled) {
      this.pick.emit(this.day());
    }
  }
}
