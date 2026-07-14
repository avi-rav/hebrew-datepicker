import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { HebDatePickerComponent, type PickerValue } from './heb-date-picker.component';
import type { HebRange } from 'heb-date-core';

describe('HebDatePickerComponent', () => {
  let fixture: ComponentFixture<HebDatePickerComponent>;
  let el: HTMLElement;

  const cells = (sel = '.hdp-cell') => Array.from(el.querySelectorAll<HTMLButtonElement>(sel));
  const selectable = () =>
    cells('.hdp-cell:not(.hdp-cell--other-month):not(.hdp-cell--disabled)');

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HebDatePickerComponent] });
    fixture = TestBed.createComponent(HebDatePickerComponent);
    fixture.componentRef.setInput('inline', true);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('renders a 6×7 grid of day cells', () => {
    expect(cells()).toHaveLength(42);
    expect(el.querySelectorAll('.hdp-grid__weekday')).toHaveLength(7);
  });

  it('renders a Hebrew month title', () => {
    const title = el.querySelector('.hdp-header__title')!.textContent!.trim();
    expect(title.length).toBeGreaterThan(0);
    // Contains a gershayim-marked Hebrew year, e.g. תשפ״ו
    expect(title).toMatch(/[א-ת]/);
  });

  it('labels days with gematriya (Hebrew letters, not digits)', () => {
    const label = selectable()[0].querySelector('.hdp-cell__label')!.textContent!.trim();
    expect(label).toMatch(/[א-ת]/);
    expect(label).not.toMatch(/[0-9]/);
  });

  it('selects a day on click and marks it selected (single mode)', () => {
    const cell = selectable()[3];
    cell.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBeInstanceOf(Date);
    expect(el.querySelectorAll('.hdp-cell--selected').length).toBe(1);
  });

  it('builds a range across two clicks (range mode)', () => {
    fixture.componentRef.setInput('mode', 'range');
    fixture.detectChanges();

    const open = selectable();
    open[2].click();
    fixture.detectChanges();
    open[6].click();
    fixture.detectChanges();

    const value = fixture.componentInstance.value() as HebRange;
    expect(value.start).toBeInstanceOf(Date);
    expect(value.end).toBeInstanceOf(Date);
    expect(el.querySelector('.hdp-cell--range-start')).toBeTruthy();
    expect(el.querySelector('.hdp-cell--range-end')).toBeTruthy();
    expect(el.querySelectorAll('.hdp-cell--in-range').length).toBeGreaterThan(0);
  });

  it('disables everything before a far-future min constraint', () => {
    const farFuture = new Date(2099, 0, 1);
    fixture.componentRef.setInput('min', farFuture);
    fixture.detectChanges();
    expect(selectable()).toHaveLength(0); // nothing selectable in the current view
    expect(el.querySelectorAll('.hdp-cell--disabled').length).toBeGreaterThan(0);
  });

  it('navigates to the next month when the nav button is clicked', () => {
    const titleBefore = el.querySelector('.hdp-header__title')!.textContent!.trim();
    const nextMonthBtn = el.querySelector<HTMLButtonElement>('[aria-label="חודש הבא"]')!;
    nextMonthBtn.click();
    fixture.detectChanges();
    const titleAfter = el.querySelector('.hdp-header__title')!.textContent!.trim();
    expect(titleAfter).not.toBe(titleBefore);
  });

  it('returns to the current month when the "today" button is clicked', () => {
    const title = () => el.querySelector('.hdp-header__title')!.textContent!.trim();
    const titleOfToday = title();

    el.querySelector<HTMLButtonElement>('[aria-label="חודש הבא"]')!.click();
    el.querySelector<HTMLButtonElement>('[aria-label="שנה הבאה"]')!.click();
    fixture.detectChanges();
    expect(title()).not.toBe(titleOfToday);
    expect(el.querySelector('.hdp-cell--today')).toBeFalsy();

    el.querySelector<HTMLButtonElement>('.hdp-today-btn')!.click();
    fixture.detectChanges();
    expect(title()).toBe(titleOfToday);
    expect(el.querySelector('.hdp-cell--today')).toBeTruthy();
  });

  it('marks Shabbat cells in the grid', () => {
    expect(el.querySelectorAll('.hdp-cell--shabbat').length).toBeGreaterThanOrEqual(4);
  });

  it('reflects a value written via the ControlValueAccessor', () => {
    const value: PickerValue = new Date(2026, 8, 3); // 21 Elul 5786
    fixture.componentInstance.writeValue(value);
    fixture.detectChanges();
    const title = el.querySelector('.hdp-header__title')!.textContent!.trim();
    expect(title).toBe('אלול תשפ״ו');
    expect(el.querySelectorAll('.hdp-cell--selected').length).toBe(1);
  });

  describe('popup field (inline=false)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('inline', false);
      fixture.detectChanges();
    });

    it('renders a calendar icon after the text (RTL: last DOM child renders on the left)', () => {
      const field = el.querySelector('.hdp-field')!;
      const children = Array.from(field.children);
      const textIdx = children.findIndex((c) => c.classList.contains('hdp-field__text'));
      const iconIdx = children.findIndex((c) => c.classList.contains('hdp-field__icon'));
      expect(textIdx).toBeGreaterThanOrEqual(0);
      expect(iconIdx).toBeGreaterThan(textIdx);
      expect(field.querySelector('.hdp-field__icon')?.tagName.toLowerCase()).toBe('svg');
    });

    it('shows the selected date, formatted in gematriya, inside the field', () => {
      fixture.componentInstance.writeValue(new Date(2026, 8, 3)); // 21 Elul 5786
      fixture.detectChanges();
      const text = el.querySelector('.hdp-field__text')!.textContent!.trim();
      expect(text).toBe('כ״א אלול תשפ״ו');
    });

    it('shows "start – end" for a selected range', () => {
      fixture.componentRef.setInput('mode', 'range');
      fixture.detectChanges();
      fixture.componentInstance.writeValue({
        start: new Date(2026, 8, 3), // 21 Elul 5786
        end: new Date(2026, 8, 7), // 25 Elul 5786
      });
      fixture.detectChanges();
      const text = el.querySelector('.hdp-field__text')!.textContent!.trim();
      expect(text).toBe('כ״א אלול תשפ״ו – כ״ה אלול תשפ״ו');
    });

    it('shows the placeholder when nothing is selected yet', () => {
      const text = el.querySelector('.hdp-field__text')!.textContent!.trim();
      expect(text).toBe('בחר תאריך');
    });

    it('opens an overlay panel and navigates months without closing', () => {
      const overlay = TestBed.inject(OverlayContainer).getContainerElement();
      fixture.componentInstance.toggleOpen();
      fixture.detectChanges();

      const panel = () => overlay.querySelector('.hdp-panel');
      expect(panel()).toBeTruthy(); // panel is portaled to the overlay container
      const titleBefore = panel()!.querySelector('.hdp-header__title')!.textContent!.trim();

      const next = overlay.querySelector<HTMLButtonElement>('[aria-label="חודש הבא"]')!;
      next.click();
      fixture.detectChanges();

      // The panel is still open (regression guard) and moved to the next month.
      expect(panel()).toBeTruthy();
      const titleAfter = panel()!.querySelector('.hdp-header__title')!.textContent!.trim();
      expect(titleAfter).not.toBe(titleBefore);

      fixture.componentInstance.open.set(false);
      fixture.detectChanges();
    });

    it('keeps the panel open when the "today" button is clicked', () => {
      const overlay = TestBed.inject(OverlayContainer).getContainerElement();
      fixture.componentInstance.toggleOpen();
      fixture.detectChanges();

      overlay.querySelector<HTMLButtonElement>('.hdp-today-btn')!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.open()).toBe(true);
      expect(overlay.querySelector('.hdp-cell--today')).toBeTruthy();
      expect(fixture.componentInstance.value()).toBeNull(); // navigation only, no selection

      fixture.componentInstance.open.set(false);
      fixture.detectChanges();
    });

    afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());
  });
});
