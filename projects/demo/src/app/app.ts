import { Component, computed, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { HebDatePickerComponent, formatGematriya, type PickerValue, type HebRange } from 'heb-date-picker';

@Component({
  selector: 'app-root',
  imports: [HebDatePickerComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // --- Live options panel (drives the first, interactive picker) ---
  readonly showNikud = signal(false);
  readonly israel = signal(true);
  readonly inline = signal(true);
  readonly firstDayOfWeek = signal(0);
  readonly dark = signal(false);

  // --- Values for the various demos ---
  readonly singleValue = signal<PickerValue>(null);
  readonly popupValue = signal<PickerValue>(null);
  readonly rangeValue = signal<PickerValue>({ start: null, end: null });
  readonly constrainedValue = signal<PickerValue>(null);
  readonly themedValue = signal<PickerValue>(null);

  // --- Reactive Forms demo ---
  readonly formControl = new FormControl<PickerValue>(null);

  // Constraints for the min/max + disabled demo.
  readonly today = new Date();
  readonly min = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  readonly max = new Date(this.today.getFullYear(), this.today.getMonth() + 2, 0);
  /** Disable Fridays and Saturdays. */
  readonly noWeekends = (d: Date): boolean => d.getDay() === 5 || d.getDay() === 6;

  readonly singleText = computed(() => this.describe(this.singleValue()));
  readonly popupText = computed(() => this.describe(this.popupValue()));
  readonly rangeText = computed(() => this.describe(this.rangeValue()));
  readonly constrainedText = computed(() => this.describe(this.constrainedValue()));
  readonly themedText = computed(() => this.describe(this.themedValue()));

  toggleDark(): void {
    this.dark.update((d) => !d);
    document.documentElement.setAttribute('data-theme', this.dark() ? 'dark' : 'light');
  }

  formText(): string {
    return this.describe(this.formControl.value ?? null);
  }

  private describe(value: PickerValue): string {
    if (!value) {
      return '—';
    }
    if (value instanceof Date) {
      return formatGematriya(value, { nikud: this.showNikud() });
    }
    const range = value as HebRange;
    if (!range.start) {
      return '—';
    }
    const start = formatGematriya(range.start, { nikud: this.showNikud() });
    const end = range.end ? formatGematriya(range.end, { nikud: this.showNikud() }) : '…';
    return `${start}  →  ${end}`;
  }
}
