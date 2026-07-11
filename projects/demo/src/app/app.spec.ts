import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the showcase heading and at least one picker', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('heb-date-picker');
    expect(compiled.querySelectorAll('heb-date-picker').length).toBeGreaterThan(0);
    // The live picker actually rendered its gematriya grid.
    expect(compiled.querySelectorAll('.hdp-cell').length).toBeGreaterThan(0);
  });
});
