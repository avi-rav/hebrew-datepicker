#!/usr/bin/env node
/**
 * Verifies that the packed npm tarballs contain exactly the intended files —
 * no missing LICENSE/types, no accidentally-shipped sources or editor files.
 *
 * Standalone (run before every `npm publish`):
 *   npm run verify:pack
 *
 * Also runs as the `verifyPack` stage of scripts/smoke.mjs.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const EXPECTED = {
  'heb-date-core': [
    'LICENSE',
    'README.md',
    'fesm2022/heb-date-core.mjs',
    'fesm2022/heb-date-core.mjs.map',
    'package.json',
    'types/heb-date-core.d.ts',
  ],
  'heb-date-picker': [
    'LICENSE',
    'README.md',
    'fesm2022/heb-date-picker.mjs',
    'fesm2022/heb-date-picker.mjs.map',
    'package.json',
    'types/heb-date-picker.d.ts',
  ],
};

/** Returns a list of problem strings; empty list = both packages are clean. */
export function verifyPackages(repoRoot = REPO) {
  const problems = [];
  for (const [pkg, expected] of Object.entries(EXPECTED)) {
    const dist = join(repoRoot, 'dist', pkg);
    if (!existsSync(dist)) {
      problems.push(`${pkg}: dist/${pkg} does not exist — build it first (npm run build:libs)`);
      continue;
    }
    const r = spawnSync('npm pack --dry-run --json', {
      cwd: dist,
      shell: true,
      encoding: 'utf8',
    });
    if (r.status !== 0) {
      problems.push(`${pkg}: npm pack --dry-run failed:\n${r.stderr}`);
      continue;
    }
    let files;
    try {
      files = JSON.parse(r.stdout)[0].files.map((f) => f.path.replace(/\\/g, '/')).sort();
    } catch {
      problems.push(`${pkg}: could not parse npm pack --json output`);
      continue;
    }
    for (const f of expected.filter((f) => !files.includes(f))) {
      problems.push(`${pkg}: MISSING from tarball: ${f}`);
    }
    for (const f of files.filter((f) => !expected.includes(f))) {
      problems.push(`${pkg}: UNEXPECTED file in tarball: ${f}`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = verifyPackages();
  if (problems.length) {
    console.error('verify-pack FAILED:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log('verify-pack OK: both tarballs contain exactly the expected files.');
}
