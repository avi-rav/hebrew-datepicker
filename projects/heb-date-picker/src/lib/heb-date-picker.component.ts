import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { OverlayModule, type ConnectedPosition } from '@angular/cdk/overlay';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  RangeSelectionModel,
  SingleSelectionModel,
  atMidnight,
  buildMonthView,
  formatGematriya,
  hebMonthOf,
  nextHebMonth,
  nextHebYear,
  prevHebMonth,
  prevHebYear,
  startOfHebMonth,
  todayHebMonth,
  weekdayLabels,
  type Constraints,
  type HebDay,
  type HebMonthRef,
  type HebRange,
  type SelectionModel,
} from 'heb-date-core';
import {
  HebCalendarMonthComponent,
  type GridNavigation,
} from './heb-calendar-month.component';

/** The value a picker holds — a single day, a range, or nothing. */
export type PickerValue = Date | HebRange | null;

/**
 * Hebrew (Jewish) calendar date picker with gematriya day/month rendering
 * (e.g. `כ״א אלול תשפ״ו`), RTL layout, holiday/Shabbat marking, single & range
 * modes, and full Angular Forms integration via {@link ControlValueAccessor}.
 *
 * All calendar math lives in the framework-agnostic `heb-date-core` package;
 * this component is the Angular presentation + interaction layer only.
 */
@Component({
  selector: 'heb-date-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [HebCalendarMonthComponent, OverlayModule, NgTemplateOutlet],
  templateUrl: './heb-date-picker.component.html',
  styleUrl: './heb-date-picker.component.scss',
  host: {
    class: 'heb-date-picker',
    dir: 'rtl',
    '(keydown.escape)': 'onEscape()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HebDatePickerComponent),
      multi: true,
    },
  ],
})
export class HebDatePickerComponent implements ControlValueAccessor {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector = inject(Injector);

  // ---- Public configuration inputs ----------------------------------------
  /** Selection mode: single day (default) or a date range. */
  readonly mode = input<'single' | 'range'>('single');
  /** Earliest selectable day (inclusive). */
  readonly min = input<Date | null>(null);
  /** Latest selectable day (inclusive). */
  readonly max = input<Date | null>(null);
  /** Predicate returning `true` to disable a given day. */
  readonly disabledDates = input<((date: Date) => boolean) | undefined>(undefined);
  /** Render gematriya with vowel points (nekudot). */
  readonly showNikud = input<boolean>(false);
  /** Use the Israel holiday schedule (`true`) or Diaspora (`false`). */
  readonly israel = input<boolean>(true);
  /** First column weekday: 0=Sunday (default) .. 6=Saturday. */
  readonly firstDayOfWeek = input<number>(0);
  /** Render the calendar inline instead of in a popup with a text field. */
  readonly inline = input<boolean>(false);
  /** Placeholder for the popup text field. */
  readonly placeholder = input<string>('בחר תאריך');

  /** Two-way bindable value (`[(value)]`), also driven by Angular Forms. */
  readonly value = model<PickerValue>(null);
  /** Emitted whenever the displayed month changes. */
  readonly monthChange = output<HebMonthRef>();

  private readonly month = viewChild(HebCalendarMonthComponent);

  // ---- Internal state ------------------------------------------------------
  private readonly today = atMidnight(new Date());
  private readonly viewYear = signal(todayHebMonth(this.today).year);
  private readonly viewMonth = signal(todayHebMonth(this.today).month);
  private readonly focusedDate = signal(this.today);
  private readonly cvaDisabled = signal(false);
  /** Popup open state (always effectively open when `inline`). */
  readonly open = signal(false);

  /** CDK overlay positions: below the field, flipping above if there's no room. */
  readonly overlayPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  ];

  private onChange: (value: PickerValue) => void = () => {};
  private onTouched: () => void = () => {};

  // ---- Derived (pure) view state ------------------------------------------
  readonly weekdays = computed(() => weekdayLabels(this.firstDayOfWeek()));

  /** Selection strategy derived from the current value + mode (Liskov). */
  readonly selection = computed<SelectionModel<unknown>>(() => {
    if (this.mode() === 'range') {
      return new RangeSelectionModel(this.asRange(this.value()));
    }
    return new SingleSelectionModel(this.asDate(this.value()));
  });

  private readonly constraints = computed<Constraints>(() => ({
    min: this.min(),
    max: this.max(),
    disabledDates: this.disabledDates(),
  }));

  /** The fully-flagged month grid for the current view. */
  readonly monthView = computed(() =>
    buildMonthView(this.viewYear(), this.viewMonth(), {
      selection: this.selection(),
      constraints: this.constraints(),
      israel: this.israel(),
      firstDayOfWeek: this.firstDayOfWeek(),
      nikud: this.showNikud(),
      today: this.today,
    }),
  );

  readonly focused = computed(() => this.focusedDate());
  readonly disabled = computed(() => this.cvaDisabled());

  /** Human-readable value for the popup field (gematriya). */
  readonly displayValue = computed(() => {
    const nikud = this.showNikud();
    if (this.mode() === 'range') {
      const range = this.asRange(this.value());
      if (!range.start) {
        return '';
      }
      const start = formatGematriya(range.start, { nikud });
      const end = range.end ? formatGematriya(range.end, { nikud }) : '…';
      return `${start} – ${end}`;
    }
    const date = this.asDate(this.value());
    return date ? formatGematriya(date, { nikud }) : '';
  });

  // ---- Interaction ---------------------------------------------------------
  onPick(day: HebDay): void {
    if (this.disabled() || day.flags.isDisabled) {
      return;
    }
    const next = this.selection().select(day.date);
    this.commit(next.value as PickerValue);
    this.focusedDate.set(atMidnight(day.date));
    // Single-day selection closes the popup; range stays open for the 2nd click.
    if (this.mode() === 'single' && !this.inline()) {
      this.open.set(false);
    }
  }

  onNavigate(nav: GridNavigation): void {
    const target = atMidnight(nav.focusDate);
    this.focusedDate.set(target);
    this.syncViewTo(target);
    if (nav.select) {
      const day = this.findDay(target);
      if (day) {
        this.onPick(day);
      }
    }
    this.requestGridFocus();
  }

  prevMonth(): void {
    this.setView(prevHebMonth(this.viewYear(), this.viewMonth()));
  }
  nextMonth(): void {
    this.setView(nextHebMonth(this.viewYear(), this.viewMonth()));
  }
  prevYear(): void {
    this.setView(prevHebYear(this.viewYear(), this.viewMonth()));
  }
  nextYear(): void {
    this.setView(nextHebYear(this.viewYear(), this.viewMonth()));
  }

  goToday(): void {
    const ref = todayHebMonth(this.today);
    this.setView(ref);
    this.focusedDate.set(this.today);
  }

  toggleOpen(): void {
    if (this.inline() || this.disabled()) {
      return;
    }
    this.open.update((o) => !o);
    if (this.open()) {
      this.syncViewTo(this.anchorDate());
      this.focusedDate.set(this.anchorDate());
      this.requestGridFocus();
    }
  }

  onEscape(): void {
    if (!this.inline() && this.open()) {
      this.open.set(false);
      this.onTouched();
    }
  }

  /**
   * The CDK overlay reports clicks outside the panel. The trigger button
   * toggles itself, so ignore clicks on it to avoid an immediate re-open/close.
   */
  onOverlayOutsideClick(event: MouseEvent): void {
    if (this.host.nativeElement.contains(event.target as Node)) {
      return;
    }
    this.open.set(false);
    this.onTouched();
  }

  // ---- ControlValueAccessor -----------------------------------------------
  writeValue(value: PickerValue): void {
    this.value.set(value ?? this.emptyValue());
    const anchor = this.anchorDate();
    const ref = hebMonthOf(anchor);
    this.viewYear.set(ref.year);
    this.viewMonth.set(ref.month);
    this.focusedDate.set(anchor);
  }
  registerOnChange(fn: (value: PickerValue) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  // ---- Helpers -------------------------------------------------------------
  private commit(value: PickerValue): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  private setView(ref: HebMonthRef): void {
    this.viewYear.set(ref.year);
    this.viewMonth.set(ref.month);
    this.focusedDate.set(startOfHebMonth(ref.year, ref.month));
    this.monthChange.emit(ref);
  }

  private syncViewTo(date: Date): void {
    const ref = hebMonthOf(date);
    if (ref.year !== this.viewYear() || ref.month !== this.viewMonth()) {
      this.viewYear.set(ref.year);
      this.viewMonth.set(ref.month);
      this.monthChange.emit(ref);
    }
  }

  private findDay(date: Date): HebDay | undefined {
    const ts = atMidnight(date).getTime();
    return this.monthView()
      .weeks.flat()
      .find((d) => d.date.getTime() === ts);
  }

  private requestGridFocus(): void {
    afterNextRender(() => this.month()?.focusActive(), { injector: this.injector });
  }

  private anchorDate(): Date {
    if (this.mode() === 'range') {
      return this.asRange(this.value()).start ?? this.today;
    }
    return this.asDate(this.value()) ?? this.today;
  }

  private emptyValue(): PickerValue {
    return this.mode() === 'range' ? { start: null, end: null } : null;
  }

  private asDate(value: PickerValue): Date | null {
    return value instanceof Date ? atMidnight(value) : null;
  }

  private asRange(value: PickerValue): HebRange {
    if (value instanceof Date) {
      return { start: atMidnight(value), end: null };
    }
    if (value && ('start' in value || 'end' in value)) {
      const range = value as HebRange;
      return {
        start: range.start ? atMidnight(range.start) : null,
        end: range.end ? atMidnight(range.end) : null,
      };
    }
    return { start: null, end: null };
  }
}
