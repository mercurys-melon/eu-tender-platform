#!/usr/bin/env node
// scripts/gen-types.mjs
// Regenererer src/lib/supabase/types.ts fra remote Supabase schema
// som UTF-8 uden BOM. Loeser PowerShell > redirect UTF-16-problemet.

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const PROJECT_ID = 'pupvcezanbwyhhewskcv';

const isDryRun = process.argv.includes('--dry-run');
const outputPath = isDryRun
  ? resolve(repoRoot, 'tmp/types.new.ts')
  : resolve(repoRoot, 'src/lib/supabase/types.ts');

console.log(`Genererer types fra Supabase project ${PROJECT_ID}...`);
console.log(`Output: ${outputPath}`);
if (isDryRun) console.log('Mode: DRY-RUN (skriver til tmp/, ikke src/)');

// shell: true er nødvendigt på Windows (npx er npx.cmd; spawn uden shell fejler med EINVAL).
// Kommandoen sendes som EN streng uden args-array, ellers udløser Node DEP0190
// (args konkatenes uden escaping). Alle dele er konstanter — ingen brugerinput.
// --remote=<ref> peger eksplicit på projektet (ikke på det linkede i supabase/.temp),
// så scriptet er uafhængigt af link-tilstand. Erstatter det forældede --project-id.
const command = `npx supabase gen types typescript --remote=${PROJECT_ID} --schema public`;

const result = spawnSync(command, {
  encoding: 'buffer',
  shell: true,
  stdio: ['inherit', 'pipe', 'inherit'],
});

if (result.status !== 0) {
  console.error(`\nFEJL: supabase CLI fejlede med status ${result.status}`);
  console.error('Tjek at SUPABASE_ACCESS_TOKEN er sat og at projektet ikke er paused.');
  process.exit(result.status ?? 1);
}

let content = result.stdout;
if (!content || content.length === 0) {
  console.error('FEJL: supabase CLI returnerede tom output');
  process.exit(1);
}

// Defensiv BOM-strip hvis CLI nogensinde skulle sende UTF-8 BOM
if (
  content.length >= 3 &&
  content[0] === 0xef &&
  content[1] === 0xbb &&
  content[2] === 0xbf
) {
  content = content.subarray(3);
  console.log('Note: BOM strippet fra CLI-output');
}

// Sanity check: forventet TypeScript-start
const firstChars = content.subarray(0, 30).toString('utf8');
if (!/^(export|import|\/\/|\/\*|type)/.test(firstChars)) {
  console.error(`FEJL: Uventet output-format. Foerste 30 tegn:`);
  console.error(`"${firstChars}"`);
  process.exit(1);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content);

const lines = content.toString('utf8').split('\n').length;
console.log(`\nOK: types regenereret (UTF-8 uden BOM)`);
console.log(`     ${content.length} bytes, ${lines} linjer`);
if (isDryRun) {
  console.log(`\nDiff mod nuvaerende:`);
  console.log(`     git diff --no-index src/lib/supabase/types.ts ${outputPath}`);
}
