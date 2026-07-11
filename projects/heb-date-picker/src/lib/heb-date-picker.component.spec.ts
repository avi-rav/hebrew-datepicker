import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
