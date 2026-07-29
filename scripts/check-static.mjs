#!/usr/bin/env node
/**
 * Static integrity gate for the single-file guide.
 *
 * Codifies the checks that were previously run by hand before every ship, so
 * they cannot be forgotten:
 *
 *   1. every inline <script> parses (a syntax error ships a dead page)
 *   2. HTML tags balance and element ids are unique
 *   3. no leaked \U0001... escape artifacts (see CLAUDE.md — bit us in PR #7)
 *   4. no `top` as a JS variable name (see CLAUDE.md — bit us in PR #6)
 *   5. the page loads zero external subresources, so it stays fully offline
 *   6. the CI workflow itself cannot be neutered with continue-on-error / `|| true`
 *
 * Exit code 1 fails the job.
 */
import { readFile, readdir } from 'node:fs/promises';
import { Script } from 'node:vm';

const failures = [];
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => {
  console.log(`  FAIL ${m}`);
  failures.push(m);
};

const html = await readFile('index.html', 'utf8');

// --- 1. inline script syntax -------------------------------------------------
console.log('inline script syntax');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
if (scripts.length === 0) bad('no inline <script> found — the learning engine is missing');
scripts.forEach((m, i) => {
  try {
    new Script(m[1], { filename: `inline-${i + 1}.js` });
  } catch (err) {
    bad(`inline script #${i + 1} does not parse: ${err.message}`);
  }
});
if (!failures.length) ok(`${scripts.length} inline script block(s) parse`);

// --- 2. tag balance + unique ids --------------------------------------------
console.log('document structure');
for (const tag of ['section', 'table', 'tr', 'td', 'div', 'ol', 'ul', 'li', 'strong', 'code']) {
  const open = (html.match(new RegExp(`<${tag}\\b`, 'g')) ?? []).length;
  const close = (html.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
  if (open !== close) bad(`<${tag}> unbalanced: ${open} open vs ${close} close`);
}
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dupes = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
if (dupes.length) bad(`duplicate element id(s): ${dupes.join(', ')}`);
else ok(`${ids.length} element ids, all unique; tags balanced`);

// --- 3. escape artifacts -----------------------------------------------------
console.log('encoding artifacts');
const artifacts = html.match(/U0001[0-9a-fA-F]{3}/g) ?? [];
if (artifacts.length) bad(`leaked escape artifact(s): ${[...new Set(artifacts)].join(', ')}`);
else ok('no leaked \\U0001... escape artifacts');

// --- 4. the `top` footgun ----------------------------------------------------
// `top` is a read-only window global; assigning to it silently no-ops and any
// handler attached lands on the window instead. This caused the click-to-top
// bug fixed in PR #6.
console.log('reserved global shadowing');
const topDecl = [...html.matchAll(/\b(?:var|let|const)\s+top\b/g)];
if (topDecl.length) bad(`${topDecl.length} declaration(s) of a variable named \`top\` — use topBtn`);
else ok('no JS variable named `top`');

// --- 5. offline integrity ----------------------------------------------------
// Anchors to external docs are expected and fine: they are never fetched.
// Subresources are not — any of these would break the offline guarantee.
console.log('offline integrity');
const subresource = [
  [/<script[^>]*\bsrc\s*=\s*["']?(?!["'])/gi, '<script src=>'],
  [/<link[^>]*\brel\s*=\s*["']?stylesheet["']?[^>]*\bhref\s*=\s*["']https?:/gi, 'external stylesheet'],
  [/<img[^>]*\bsrc\s*=\s*["']https?:/gi, 'external <img>'],
  [/<iframe[^>]*\bsrc\s*=\s*["']https?:/gi, 'external <iframe>'],
  [/@import\s+(?:url\()?["']?https?:/gi, 'CSS @import'],
  [/url\(\s*["']?https?:/gi, 'CSS url() over http']
];
let external = 0;
for (const [re, label] of subresource) {
  const hits = html.match(re) ?? [];
  if (hits.length) {
    bad(`${hits.length} ${label} reference(s) — the page must fetch nothing at load`);
    external += hits.length;
  }
}
if (!external) ok('no external subresources; page stays fully offline');

// --- 6. the CI workflow cannot be silently neutered --------------------------
console.log('workflow integrity');
const wfDir = '.github/workflows';
const files = (await readdir(wfDir)).filter((f) => /\.ya?ml$/.test(f));
for (const f of files) {
  const wf = await readFile(`${wfDir}/${f}`, 'utf8');
  // Strip comments so prose about these patterns does not trip the check.
  const code = wf
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  if (/continue-on-error:\s*true/.test(code)) bad(`${f}: continue-on-error: true makes the gate advisory`);
  if (/\|\|\s*true\b/.test(code)) bad(`${f}: \`|| true\` swallows a failing command`);
  if (/\bpull_request_target\b/.test(code)) bad(`${f}: pull_request_target runs untrusted PR code with write scope`);
  if (/uses:\s*\S+@(main|master)\b/.test(code)) bad(`${f}: action pinned to a moving branch`);
}
if (!failures.some((m) => files.some((f) => m.startsWith(f)))) {
  ok(`${files.length} workflow file(s) free of gate-weakening patterns`);
}

// --- result ------------------------------------------------------------------
if (failures.length) {
  console.error(`\nFAIL: ${failures.length} static check(s) failed`);
  process.exit(1);
}
console.log('\nOK: all static checks passed');
