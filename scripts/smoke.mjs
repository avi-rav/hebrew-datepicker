#!/usr/bin/env node
/**
 * Multi-version smoke test for heb-date-picker.
 *
 *   node scripts/smoke.mjs 19            # build-gate against Angular 19
 *   node scripts/smoke.mjs 22 --e2e      # + headless runtime assertions (Playwright)
 *   node scripts/smoke.mjs 21 --serve    # + ng serve for a manual eyeball
 *   node scripts/smoke.mjs 20 --keep     # keep the temp app on success
 *
 * Each stage is a separate function; the runner executes them in order and
 * reports pass/fail per stage. The temp app lives in os.tmpdir()/heb-smoke and
 * is deleted on success (kept on failure, or with --keep/--serve/--e2e).
 *
 * The pass condition is deliberately stricter than "ng build exited 0":
 * esbuild reports a missing peer export (e.g. a private ɵɵ alias that only
 * exists in newer Angular majors) as a WARNING and still exits 0 — which would
 * ship a bundle that crashes at runtime. verifyBundle/verifyBuild close that gap.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPackages } from './verify-pack.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED = ['19', '20', '21', '22'];
/** Minimum Node major per Angular CLI major (the CLI enforces the exact range itself). */
const NODE_FLOOR = { 19: 18, 20: 20, 21: 20, 22: 22 };

// ---------------------------------------------------------------------------
// CLI args + shared context
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const major = args.find((a) => /^\d+$/.test(a));
const flags = {
  e2e: args.includes('--e2e'),
  serve: args.includes('--serve'),
  keep: args.includes('--keep'),
};

if (!major || !SUPPORTED.includes(major)) {
  console.error(`usage: node scripts/smoke.mjs <${SUPPORTED.join('|')}> [--e2e] [--serve] [--keep]`);
  process.exit(2);
}

const ctx = {
  major: Number(major),
  root: join(tmpdir(), 'heb-smoke', `ng${major}`),
  app: join(tmpdir(), 'heb-smoke', `ng${major}`, 'smoke'),
  port: 4200 + Number(major),
  fesm: join(REPO, 'dist', 'heb-date-picker', 'fesm2022', 'heb-date-picker.mjs'),
  tarballs: {},
  buildLog: '',
  env: { ...process.env, CI: '1', NG_CLI_ANALYTICS: 'false', FORCE_COLOR: '0' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[90m${s}\x1b[0m`;

class StageError extends Error {}
const bail = (msg) => {
  throw new StageError(msg);
};

function run(cmd, cwd, { capture = false } = {}) {
  console.log(dim(`  $ ${cmd}`));
  const r = spawnSync(cmd, {
    cwd,
    env: ctx.env,
    shell: true,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  const out = capture ? `${r.stdout ?? ''}${r.stderr ?? ''}` : '';
  return { code: r.status ?? 1, out };
}

function must(cmd, cwd, msg, opts) {
  const r = run(cmd, cwd, opts);
  if (r.code !== 0) {
    if (opts?.capture) process.stdout.write(r.out);
    bail(msg ?? `command failed: ${cmd}`);
  }
  return r;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function killTree(child) {
  if (process.platform === 'win32') {
    spawnSync(`taskkill /pid ${child.pid} /T /F`, { shell: true, stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

function preflight() {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < NODE_FLOOR[ctx.major]) {
    bail(`Node ${process.version} is too old for the Angular ${ctx.major} CLI (needs >= v${NODE_FLOOR[ctx.major]}).`);
  }
  console.log(`  node ${process.version} ok for @angular/cli@${ctx.major}`);
}

function buildLibs() {
  must('npx ng build heb-date-core', REPO, 'heb-date-core failed to build');
  must('npx ng build heb-date-picker', REPO, 'heb-date-picker failed to build');
}

/**
 * Static invariants on the emitted fesm, checked BEFORE any consumer app:
 *  - no private (ɵ-prefixed) member access through any namespace other than
 *    @angular/core (i0.ɵɵngDeclare* is the partial-linker API itself and is
 *    always present; anything else — e.g. the CDK's ɵɵDir — is a version-
 *    specific alias that resolves to undefined on other majors)
 *  - no NgModule dependencies (the root cause of such aliases)
 *  - standalone declarations with a minVersion our floor's linker accepts
 */
function verifyBundle() {
  const src = readFileSync(ctx.fesm, 'utf8');

  const ns = {};
  for (const m of src.matchAll(/import \* as (i\d+) from '([^']+)'/g)) ns[m[1]] = m[2];
  const badRefs = [];
  for (const m of src.matchAll(/\b(i\d+)\.(ɵ{1,2}\w+)/g)) {
    if (ns[m[1]] !== '@angular/core') badRefs.push(`${m[1]}.${m[2]} (${ns[m[1]] ?? 'unknown module'})`);
  }
  if (badRefs.length) {
    bail(
      `bundle references private alias export(s): ${[...new Set(badRefs)].join(', ')}\n` +
        `  These exist only in some majors of the peer package, resolve to undefined on\n` +
        `  others, and crash at runtime while ng build still exits 0. Cause: a @Component\n` +
        `  imports an NgModule instead of the standalone directives it actually uses.`,
    );
  }

  const mods = (src.match(/kind: "ngmodule"/g) ?? []).length;
  if (mods) bail(`bundle declares ${mods} NgModule dependenc(ies) — import standalone directives instead`);

  if (!src.includes('isStandalone: true')) bail('components are not standalone in the emitted bundle');

  const minVersions = [...new Set([...src.matchAll(/minVersion: "(\d+)\.\d+\.\d+"/g)].map((m) => Number(m[1])))];
  const tooNew = minVersions.filter((v) => v > 19);
  if (tooNew.length) bail(`declaration minVersion major ${tooNew.join(', ')} exceeds our Angular 19 floor`);

  console.log(`  fesm clean: no foreign ɵ refs, no ngmodules, standalone, minVersion majors [${minVersions.join(', ')}]`);
}

function pack() {
  rmSync(ctx.root, { recursive: true, force: true });
  mkdirSync(ctx.root, { recursive: true });
  for (const pkg of ['heb-date-core', 'heb-date-picker']) {
    must(`npm pack "${join(REPO, 'dist', pkg)}" --pack-destination "${ctx.root}"`, REPO, `npm pack ${pkg} failed`);
    const { version } = JSON.parse(readFileSync(join(REPO, 'dist', pkg, 'package.json'), 'utf8'));
    ctx.tarballs[pkg] = join(ctx.root, `${pkg}-${version}.tgz`);
    if (!existsSync(ctx.tarballs[pkg])) bail(`expected tarball not found: ${ctx.tarballs[pkg]}`);
  }
}

function verifyPack() {
  const problems = verifyPackages(REPO);
  if (problems.length) bail(`tarball contents are wrong:\n  - ${problems.join('\n  - ')}`);
  console.log('  tarballs contain exactly the expected files');
}

function scaffold() {
  must(
    `npx --yes @angular/cli@${ctx.major} new smoke ` +
      `--defaults --skip-git --skip-tests --routing=false --style=css --ssr=false --package-manager=npm`,
    ctx.root,
    `ng new failed for Angular ${ctx.major}`,
  );
  if (!existsSync(join(ctx.app, 'src', 'app', 'app.config.ts'))) {
    bail('scaffold has no src/app/app.config.ts — the bootstrap strategy of this script assumes it');
  }
}

function install() {
  // Deliberately NOT --legacy-peer-deps: an ERESOLVE here means our published
  // peerDependencies ranges are wrong for this Angular major — a real failure.
  must(
    `npm install --no-audit --no-fund @angular/cdk@${ctx.major} ` +
      `"${ctx.tarballs['heb-date-core']}" "${ctx.tarballs['heb-date-picker']}"`,
    ctx.app,
    'npm install failed — peerDependencies do not resolve on this Angular major',
  );
}

function writeApp() {
  // Exercises: popup + every input (incl. BARE boolean attributes, proving the
  // booleanAttribute transform under the app's strictTemplates), (monthChange),
  // [(value)] against a WritableSignal, inline mode, range mode, reactive forms
  // (NG_VALUE_ACCESSOR + setDisabledState) and template-driven forms (ngModel).
  writeFileSync(
    join(ctx.app, 'src', 'smoke.component.html'),
    `<h1>heb-date-picker smoke — Angular ${ctx.major}</h1>

<section id="s-popup">
  <heb-date-picker
    showNikud
    [(value)]="popupValue"
    [placeholder]="'בחר תאריך'"
    [israel]="true"
    [firstDayOfWeek]="0"
    [min]="min"
    [max]="max"
    [disabledDates]="noFridays"
    (monthChange)="onMonthChange($event)"
  />
  <output id="o-popup">{{ label(popupValue) }}</output>
</section>

<section id="s-signal">
  <heb-date-picker [(value)]="signalValue" />
  <output id="o-signal">{{ label(signalValue()) }}</output>
</section>

<section id="s-inline">
  <heb-date-picker inline [(value)]="inlineValue" />
</section>

<section id="s-range">
  <heb-date-picker inline [mode]="'range'" [(value)]="rangeValue" />
  <output id="o-range">{{ label(rangeValue) }}</output>
</section>

<section id="s-reactive">
  <heb-date-picker [formControl]="ctrl" />
  <output id="o-reactive">{{ label(ctrl.value) }}</output>
  <button type="button" id="b-disable" (click)="ctrl.disable()">disable</button>
</section>

<section id="s-ngmodel">
  <heb-date-picker [(ngModel)]="ngModelValue" [ngModelOptions]="{ standalone: true }" />
  <output id="o-ngmodel">{{ label(ngModelValue) }}</output>
</section>
`,
  );

  writeFileSync(
    join(ctx.app, 'src', 'smoke.component.ts'),
    `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  HebDatePickerComponent,
  formatGematriya,
  type HebMonthRef,
  type PickerValue,
} from 'heb-date-picker';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HebDatePickerComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './smoke.component.html',
})
export class SmokeComponent {
  popupValue: PickerValue = null;
  readonly signalValue = signal<PickerValue>(null);
  inlineValue: PickerValue = null;
  rangeValue: PickerValue = { start: new Date(), end: null };
  ngModelValue: PickerValue = null;
  readonly ctrl = new FormControl<PickerValue>(null);

  readonly min = new Date(2020, 0, 1);
  readonly max = new Date(2030, 11, 31);
  readonly noFridays = (d: Date): boolean => d.getDay() === 5;

  lastMonth: HebMonthRef | null = null;
  onMonthChange(ref: HebMonthRef): void {
    this.lastMonth = ref;
  }

  label(v: PickerValue): string {
    if (v instanceof Date) return formatGematriya(v);
    if (v && v.start) return formatGematriya(v.start);
    return '\\u2014';
  }
}
`,
  );

  // Bootstrap OUR component with this Angular version's OWN scaffolded appConfig.
  // This sidesteps the app.component.ts -> app.ts rename (v20) entirely, and means
  // each major runs with its native change-detection setup (zone vs zoneless).
  writeFileSync(
    join(ctx.app, 'src', 'main.ts'),
    `import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { SmokeComponent } from './smoke.component';

bootstrapApplication(SmokeComponent, appConfig).catch((err) => console.error(err));
`,
  );

  // Strip bundle budgets: the scaffold's default budgets could fail the build
  // for a reason unrelated to version compatibility, which is all we test here.
  const p = join(ctx.app, 'angular.json');
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const targets = j.projects.smoke.architect ?? j.projects.smoke.targets;
  if (targets?.build?.configurations?.production?.budgets) {
    delete targets.build.configurations.production.budgets;
  }
  writeFileSync(p, JSON.stringify(j, null, 2));
}

function buildApp() {
  // Production build: forces THIS major's partial linker to re-link our
  // fesm2022 declarations and recompile our templates, and type-checks the
  // consumer bindings against our .d.ts under strict + strictTemplates.
  const r = must('npx ng build', ctx.app, 'ng build failed', { capture: true });
  process.stdout.write(r.out);
  ctx.buildLog = r.out;
}

function verifyBuild() {
  if (/import-is-undefined|will always be undefined/i.test(ctx.buildLog)) {
    bail(
      'build log contains "import ... will always be undefined" — we reference a symbol\n' +
        '  that does not exist in this major of a peer package. This crashes at runtime\n' +
        '  even though ng build exited 0.',
    );
  }
  if (/Unable to fully link|Unsupported partial declaration|published using Angular version/i.test(ctx.buildLog)) {
    bail("this Angular major's partial linker rejected our declarations");
  }

  const outDir = join(ctx.app, 'dist', 'smoke');
  if (!existsSync(outDir)) bail(`no build output at ${outDir}`);
  const js = walk(outDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  if (/ngDeclareComponent/.test(js)) {
    bail('output still contains ɵɵngDeclareComponent — the partial linker did not run; the app would throw "JIT compilation failed" at runtime');
  }
  if (!/hdp-panel/.test(js)) bail('our component is not in the bundle (no "hdp-panel" marker) — it was tree-shaken, the smoke app is not really using it');
  if (!/hdp-cell--range-start/.test(js)) bail('component styles are not in the bundle');
  console.log('  build log clean, linker ran, component + styles bundled');
}

async function e2e() {
  writeFileSync(
    join(ctx.app, 'e2e.mjs'),
    `import { chromium } from 'playwright';

const EMPTY = '\\u2014'; // what the smoke component renders for a null value

const url = process.argv[2];
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: 'load' });

// The smoke component is OnPush, so DOM updates land on the tick after the
// event — always poll for the expected state rather than reading immediately.
const waitFor = (fn, arg, msg) =>
  page.waitForFunction(fn, arg, { timeout: 10000 }).catch(() => { throw new Error(msg); });

// popup: open, pick a day, two-way [(value)] must reach the parent
await page.waitForSelector('#s-popup .hdp-field', { timeout: 20000 });
await page.click('#s-popup .hdp-field');
await page.waitForSelector('.cdk-overlay-container .hdp-panel', { timeout: 5000 });
await page.click('.cdk-overlay-container .hdp-cell:not(.hdp-cell--disabled):not(.hdp-cell--other-month)');
await waitFor(
  (empty) => document.querySelector('#o-popup')?.textContent?.trim() !== empty,
  EMPTY,
  'clicking a day did not update the two-way bound value',
);
const picked = (await page.textContent('#o-popup'))?.trim();

// the picked day must be marked selected
if (!(await page.locator('.hdp-cell--selected').count())) {
  throw new Error('the picked day was not marked as selected');
}

// inline: a full month grid must render
const cells = await page.locator('#s-inline .hdp-cell').count();
if (cells < 35 || cells % 7 !== 0) throw new Error('inline grid rendered ' + cells + ' cells, expected a full 7xN month grid');

// range mode: the initial start date must be marked
if (!(await page.locator('#s-range .hdp-cell--range-start').count())) {
  throw new Error('range mode did not render a range-start cell');
}

// reactive forms: setDisabledState must reach the field
await page.click('#b-disable');
await waitFor(
  () => document.querySelector('#s-reactive .hdp-field')?.hasAttribute('disabled'),
  undefined,
  'ControlValueAccessor.setDisabledState did not disable the field',
);

await browser.close();
if (errors.length) throw new Error('console/page errors:\\n' + errors.join('\\n'));
console.log('e2e ok (picked: ' + picked + ')');
`,
  );

  must('npm install -D --no-audit --no-fund playwright', ctx.app, 'playwright install failed');
  const withDeps = process.platform === 'linux' ? ' --with-deps' : '';
  must(`npx playwright install${withDeps} chromium`, ctx.app, 'chromium download failed');

  // ng serve = a DEV build: ngDevMode is live, so Angular's dev-mode assertions
  // (and our debugName-carrying input() calls) actually execute on this major.
  const srv = spawn(`npx ng serve --port ${ctx.port}`, {
    cwd: ctx.app,
    env: ctx.env,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  srv.stderr.on('data', (d) => process.stderr.write(d));
  try {
    const deadline = Date.now() + 180000;
    let up = false;
    while (!up && Date.now() < deadline) {
      try {
        const res = await fetch(`http://localhost:${ctx.port}/`);
        up = res.ok;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if (!up) bail('ng serve never became reachable');

    const r = must(`node e2e.mjs http://localhost:${ctx.port}/`, ctx.app, 'runtime e2e failed', { capture: true });
    process.stdout.write(r.out);
  } finally {
    killTree(srv);
  }
}

function serve() {
  console.log(`\n${green('PASS')} — now serving for a manual eyeball.`);
  console.log('  Click the field  -> popup must open below it, RTL, gematriya labels.');
  console.log('  Click a day      -> the <output> next to it must update.');
  console.log('  Arrow keys       -> roving focus must move.');
  console.log('  Watch the browser console for ANY error. Ctrl-C when done.\n');
  spawnSync(`npx ng serve --port ${ctx.port} --open`, { cwd: ctx.app, env: ctx.env, shell: true, stdio: 'inherit' });
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
const stages = [
  ['preflight', preflight],
  ['build libraries', buildLibs],
  ['verify bundle invariants', verifyBundle],
  ['pack tarballs', pack],
  ['verify tarball contents', verifyPack],
  [`scaffold Angular ${ctx.major} app`, scaffold],
  ['install cdk + tarballs (strict peers)', install],
  ['write smoke app', writeApp],
  ['ng build (partial linker gate)', buildApp],
  ['verify build output', verifyBuild],
  ...(flags.e2e ? [['e2e (headless runtime)', e2e]] : []),
];

let failed = false;
for (const [i, [name, fn]] of stages.entries()) {
  console.log(`\n\x1b[1m[${i + 1}/${stages.length}] ${name}\x1b[0m`);
  try {
    await fn();
  } catch (err) {
    failed = true;
    console.error(`\n${red('FAIL')} at "${name}" (Angular ${ctx.major}):\n${err instanceof StageError ? err.message : err}`);
    break;
  }
}

if (failed) {
  if (existsSync(ctx.app)) console.error(`\nTemp app left for inspection: ${ctx.app}`);
  process.exit(1);
}

if (flags.serve) serve();

console.log(`\n${green('PASS')}  heb-date-picker builds, links and type-checks cleanly on Angular ${ctx.major}.`);
if (flags.keep || flags.serve || flags.e2e) {
  console.log(`Temp app: ${ctx.app}`);
} else {
  rmSync(ctx.root, { recursive: true, force: true });
}
