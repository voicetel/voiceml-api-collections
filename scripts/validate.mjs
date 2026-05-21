#!/usr/bin/env node
// Validates that the Postman + Bruno collections cover every operationId
// declared in the OpenAPI spec. Exits non-zero if anything is missing.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function resolveSpec() {
  if (process.env.VOICEML_SPEC) return process.env.VOICEML_SPEC;
  const local = resolve(repoRoot, 'spec', 'callbroadcast.json');
  if (existsSync(local)) return local;
  return resolve(repoRoot, 'spec', 'callbroadcast.yml');
}

const specPath = resolveSpec();
const spec = specPath.endsWith('.json')
  ? JSON.parse(readFileSync(specPath, 'utf8'))
  : (() => {
      throw new Error('YAML spec requires spec/callbroadcast.json');
    })();

const expected = new Set();
for (const [path, item] of Object.entries(spec.paths)) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    if (item[method]?.operationId) expected.add(item[method].operationId);
  }
}

const postman = JSON.parse(
  readFileSync(resolve(repoRoot, 'voiceml-api.postman_collection.json'), 'utf8')
);

const postmanOps = new Set();
function walkPostman(items) {
  for (const it of items) {
    if (it.item) walkPostman(it.item);
    if (it.request) {
      const d = it.request.description || '';
      const m = d.match(/OperationId:\s*`([A-Za-z0-9_.]+)`/);
      if (m) postmanOps.add(m[1]);
    }
  }
}
walkPostman(postman.item || []);

const bruDir = resolve(repoRoot, 'bruno');
const brunoOps = new Set();

function walkDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      walkDir(full);
    } else if (
      full.endsWith('.bru') &&
      !full.endsWith('folder.bru') &&
      !full.endsWith('collection.bru')
    ) {
      const txt = readFileSync(full, 'utf8');
      const m = txt.match(/OperationId:\s*`([A-Za-z0-9_.]+)`/);
      if (m) brunoOps.add(m[1]);
    }
  }
}
walkDir(bruDir);

function diff(setA, setB) {
  return [...setA].filter((x) => !setB.has(x)).sort();
}

const missingFromPostman = diff(expected, postmanOps);
const extraInPostman = diff(postmanOps, expected);
const missingFromBruno = diff(expected, brunoOps);
const extraInBruno = diff(brunoOps, expected);

console.log(`Spec operationIds:    ${expected.size}`);
console.log(`Postman operationIds: ${postmanOps.size}`);
console.log(`Bruno operationIds:   ${brunoOps.size}`);

let failed = false;
if (missingFromPostman.length) {
  failed = true;
  console.error(`\nMissing from Postman (${missingFromPostman.length}):`);
  for (const op of missingFromPostman) console.error(`  - ${op}`);
}
if (extraInPostman.length) {
  failed = true;
  console.error(`\nExtra in Postman (${extraInPostman.length}):`);
  for (const op of extraInPostman) console.error(`  - ${op}`);
}
if (missingFromBruno.length) {
  failed = true;
  console.error(`\nMissing from Bruno (${missingFromBruno.length}):`);
  for (const op of missingFromBruno) console.error(`  - ${op}`);
}
if (extraInBruno.length) {
  failed = true;
  console.error(`\nExtra in Bruno (${extraInBruno.length}):`);
  for (const op of extraInBruno) console.error(`  - ${op}`);
}

if (failed) {
  console.error('\nValidation FAILED.');
  process.exit(1);
}

console.log('\nAll operations covered. Validation OK.');
