import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { atMidnight, isSameDay, type HebDay, type HebMonthView } from 'heb-date-core';
import { HebDayCellComponent } from './heb-day-cell.component';

/** A keyboard/click-driven request to move the roving focus or the month. */
export interface GridNavigation {
  /** New focus date (same or adjacent month). */
  focusDate: Date;
  /** `true` when the caller should also select the focused day. */
  select?: boolean;
}

/**
 * One month rendered as an accessible 6×7 grid (`role="grid"`).
 *
 * Owns keyboard navigation semantics (arrows / Home / End / PageUp-Down /
 * Enter-Space) but delegates the *decision* of what to do to its parent via the
 * {@link navigate} output — the parent holds the authoritative state. This keeps
 * the component focused on presentation + interaction, not on business state.
 */
@Component({
  selector: 'heb-calendar-month',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HebDayCellComponent],
  template: `
    <div class="hdp-grid" role="grid" [attr.aria-label]="view().title" (keydown)="onKeydown($event)">
      <div class="hdp-grid__weekdays" role="row">
        @for (wd of weekdays(); track $index) {
          <span class="hdp-grid__weekday" role="columnheader">{{ wd }}</span>
        }
      </div>
      @for (week of view().weeks; track $index) {
        <div class="hdp-grid__week" role="row">
          @for (day of week; track day.date.getTime()) {
            <heb-day-cell
              role="gridcell"
              [day]="day"
              [focusable]="isFocused(day)"
              (pick)="pick.emit($event)"
            />
          }
        </div>
      }
    </div>
  `,
})
export class HebCalendarMonthComponent {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** The computed month to render. */
  readonly view = input.required<HebMonthView>();
  /** Weekday header labels. */
  readonly weekdays = input.required<string[]>();
  /** The date currently holding roving focus. */
  readonly focusedDate = input.required<Date>();

  /** A selectable day was clicked. */
  readonly pick = output<HebDay>();
  /** Keyboard navigation requested a focus move (and maybe a selection). */
  readonly navigate = output<GridNavigation>();

  isFocused(day: HebDay): boolean {
    return isSameDay(day.date, this.focusedDate());
  }

  /** Move DOM focus to the cell matching `focusedDate`, if present. */
  focusActive(): void {
    const ts = atMidnight(this.focusedDate()).getTime();
    const el = this.host.nativeElement.querySelector<HTMLElement>(`[data-ts="${ts}"]`);
    el?.focus();
  }

  onKeydown(event: KeyboardEvent): void {
    const from = atMidnight(this.focusedDate());
    const shift = (days: number): Date =>
      new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);

    let target: Date | null = null;
    let select = false;

    switch (event.key) {
      case 'ArrowRight': // RTL: right = previous day
        target = shift(-1);
        break;
      case 'ArrowLeft': // RTL: left = next day
        target = shift(1);
        break;
      case 'ArrowUp':
        target = shift(-7);
        break;
      case 'ArrowDown':
        target = shift(7);
        break;
      case 'Home':
        target = shift(-from.getDay());
        break;
      case 'End':
        target = shift(6 - from.getDay());
        break;
      case 'PageUp':
        target = shift(-28);
        break;
      case 'PageDown':
        target = shift(28);
        break;
      case 'Enter':
      case ' ':
        target = from;
        select = true;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.navigate.emit({ focusDate: target, select });
  }
}
