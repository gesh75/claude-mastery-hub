#!/usr/bin/env node
/**
 * Static integrity gate for the single-file guide.
 *
 * Codifies the checks that were previously run by hand before every ship:
 *
 *   1. every inline <script> parses (a syntax error ships a dead page)
 *   2. HTML tags balance and element ids are unique
 *   3. no leaked \U0001... escape artifacts (see CLAUDE.md — bit us in PR #7)
 *   4. no `top` as a JS variable name (see CLAUDE.md — bit us in PR #6)
 *   5. the page loads zero external subresources, so it stays fully offline
 *   6. every workflow action is pinned to an immutable 40-hex commit SHA, and
 *      no workflow has been made advisory with continue-on-error / `|| true`
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
let scriptFailures = 0;
scripts.forEach((m, i) => {
  try {
    new Script(m[1], { filename: `inline-${i + 1}.js` });
  } catch (err) {
    bad(`inline script #${i + 1} does not parse: ${err.message}`);
    scriptFailures++;
  }
});
if (scripts.length && !scriptFailures) ok(`${scripts.length} inline script block(s) parse`);

// --- 2. tag balance + unique ids --------------------------------------------
// Tag balance and id uniqueness are tracked separately: a tag-balance failure
// must never be followed by an "ok tags balanced" line.
console.log('document structure');
let tagFailures = 0;
for (const tag of ['section', 'table', 'tr', 'td', 'div', 'ol', 'ul', 'li', 'strong', 'code']) {
  const open = (html.match(new RegExp(`<${tag}\\b`, 'g')) ?? []).length;
  const close = (html.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
  if (open !== close) {
    bad(`<${tag}> unbalanced: ${open} open vs ${close} close`);
    tagFailures++;
  }
}
if (!tagFailures) ok('all checked tags balanced');

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dupes = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
if (dupes.length) bad(`duplicate element id(s): ${dupes.join(', ')}`);
else ok(`${ids.length} element ids, all unique`);

// --- 3. escape artifacts -----------------------------------------------------
console.log('encoding artifacts');
const artifacts = html.match(/U0001[0-9a-fA-F]{3}/g) ?? [];
if (artifacts.length) bad(`leaked escape artifact(s): ${[...new Set(artifacts)].join(', ')}`);
else ok('no leaked \\U0001... escape artifacts');

// --- 4. the `top` footgun ----------------------------------------------------
// `top` is a read-only window global; assigning to it silently no-ops and any
// handler attached lands on the window instead (the PR #6 click-to-top bug).
console.log('reserved global shadowing');
const topDecl = [...html.matchAll(/\b(?:var|let|const)\s+top\b/g)];
if (topDecl.length) bad(`${topDecl.length} declaration(s) of a variable named \`top\` — use topBtn`);
else ok('no JS variable named `top`');

// --- 5. offline integrity ----------------------------------------------------
// Anchors to external documentation are expected and allowed: they are never
// fetched. Subresources are not — any of these breaks the offline guarantee.
// Protocol-relative `//host/...` counts as external, because the browser
// resolves it against the page scheme and fetches it over the network.
console.log('offline integrity');

const EXTERNAL = /^\s*(?:https?:)?\/\//i;
// rel values that cause the browser to fetch the href.
const FETCHING_REL = new Set([
  'stylesheet',
  'preload',
  'modulepreload',
  'prefetch',
  'preconnect',
  'dns-prefetch',
  'icon',
  'shortcut icon',
  'apple-touch-icon',
  'apple-touch-icon-precomposed',
  'manifest',
  'prerender'
]);
// element -> attributes that trigger a network fetch
const FETCHING_ELEMENTS = {
  script: ['src'],
  img: ['src', 'srcset'],
  iframe: ['src'],
  source: ['src', 'srcset'],
  audio: ['src'],
  video: ['src', 'poster'],
  object: ['data'],
  embed: ['src'],
  track: ['src'],
  input: ['src']
};

function attrs(raw) {
  const out = {};
  for (const m of raw.matchAll(/([a-zA-Z0-9:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

let externalHits = 0;
const flagExternal = (what, url) => {
  bad(`external subresource ${what}: ${url.trim().slice(0, 80)} — the page must fetch nothing at load`);
  externalHits++;
};

for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
  const tag = m[1].toLowerCase();
  if (tag === 'a') continue; // documentation links are allowed
  const a = attrs(m[2]);

  if (tag === 'link') {
    const rels = (a.rel ?? '').toLowerCase().trim();
    const fetches = rels && (FETCHING_REL.has(rels) || rels.split(/\s+/).some((r) => FETCHING_REL.has(r)));
    if (fetches && a.href && EXTERNAL.test(a.href)) flagExternal(`<link rel="${rels}">`, a.href);
    continue;
  }

  for (const attr of FETCHING_ELEMENTS[tag] ?? []) {
    const v = a[attr];
    if (!v) continue;
    // srcset holds a comma-separated candidate list
    const candidates = attr === 'srcset' ? v.split(',').map((s) => s.trim().split(/\s+/)[0]) : [v];
    for (const c of candidates) if (c && EXTERNAL.test(c)) flagExternal(`<${tag} ${attr}>`, c);
  }
}

// CSS, in <style> blocks and style="" attributes
const css = [
  ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]),
  ...[...html.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)].map((m) => m[1])
].join('\n');
for (const m of css.matchAll(/@import\s+(?:url\(\s*)?["']?((?:https?:)?\/\/[^"')\s]+)/gi)) {
  flagExternal('CSS @import', m[1]);
}
for (const m of css.matchAll(/url\(\s*["']?((?:https?:)?\/\/[^"')\s]+)/gi)) {
  flagExternal('CSS url()', m[1]);
}
// image-set()/-webkit-image-set() take bare URL strings that url() matching misses.
for (const m of css.matchAll(/(?:-webkit-)?image-set\(([^)]*)\)/gi)) {
  for (const u of m[1].matchAll(/["']((?:https?:)?\/\/[^"']+)["']/g)) {
    flagExternal('CSS image-set()', u[1]);
  }
}

// --- 5b. runtime network calls in inline JS ---------------------------------
// The attribute and CSS scans above only cover markup. Inline JS can still
// reach the network at load time, which would break the same offline
// guarantee. Only URL literals passed to a network *sink* are flagged, so the
// MODEL_SOURCES documentation URLs (plain data) stay legal.
const jsSinks = [
  [/\bfetch\s*\(\s*["'`]((?:https?:)?\/\/[^"'`]+)/gi, 'fetch()'],
  [/\bimport\s*\(\s*["'`]((?:https?:)?\/\/[^"'`]+)/gi, 'dynamic import()'],
  [/\bimportScripts\s*\(\s*["'`]((?:https?:)?\/\/[^"'`]+)/gi, 'importScripts()'],
  [/\bnavigator\s*\.\s*sendBeacon\s*\(\s*["'`]((?:https?:)?\/\/[^"'`]+)/gi, 'sendBeacon()'],
  [/\bnew\s+(?:Shared)?Worker\s*\(\s*["'`]((?:https?:)?\/\/[^"'`]+)/gi, 'new Worker()'],
  [/\bnew\s+EventSource\s*\(\s*["'`]((?:https?:)?\/\/[^"'`]+)/gi, 'new EventSource()'],
  [/\bnew\s+WebSocket\s*\(\s*["'`]((?:wss?:)?\/\/[^"'`]+)/gi, 'new WebSocket()'],
  [/\.\s*open\s*\(\s*["'][A-Za-z]+["']\s*,\s*["'`]((?:https?:)?\/\/[^"'`]+)/gi, 'XMLHttpRequest.open()'],
  [/\.\s*(?:src|href)\s*=\s*["'`]((?:https?:)?\/\/[^"'`]+)/gi, 'element.src/href assignment'],
  [/\bimport\s+[^;'"]*from\s*["']((?:https?:)?\/\/[^"']+)/gi, 'static import from URL']
];
const inlineJs = scripts.map((m) => m[1]).join('\n');
let jsHits = 0;
for (const [re, label] of jsSinks) {
  for (const m of inlineJs.matchAll(re)) {
    bad(`inline JS reaches the network via ${label}: ${m[1].slice(0, 70)} — the page must fetch nothing at load`);
    jsHits++;
  }
}
if (!jsHits) ok('inline JS makes no external network calls');

if (!externalHits) ok('no external subresources; page stays fully offline');

// --- 6. workflow integrity ---------------------------------------------------
console.log('workflow integrity');
const wfDir = '.github/workflows';
let wfFiles = [];
let wfFailures = 0;
try {
  wfFiles = (await readdir(wfDir)).filter((f) => /\.ya?ml$/.test(f));
} catch (err) {
  bad(`workflows directory ${wfDir} is missing or unreadable (${err.code ?? err.message}) — the gate cannot verify itself`);
  wfFailures++;
}
if (!wfFailures && wfFiles.length === 0) {
  bad(`workflows directory ${wfDir} contains no .yml/.yaml files — the gate cannot verify itself`);
  wfFailures++;
}

const PINNED = /^[0-9a-fA-F]{40}$/;
for (const f of wfFiles) {
  const wf = await readFile(`${wfDir}/${f}`, 'utf8');
  // Strip comments so prose about these patterns does not trip the check.
  const code = wf
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');

  const wfBad = (m) => {
    bad(`${f}: ${m}`);
    wfFailures++;
  };

  if (/continue-on-error:\s*true/.test(code)) wfBad('continue-on-error: true makes the gate advisory');
  if (/\|\|\s*true\b/.test(code)) wfBad('`|| true` swallows a failing command');
  if (/\bpull_request_target\b/.test(code)) wfBad('pull_request_target runs untrusted PR code with write scope');

  // Every non-local action must be pinned to an exact 40-hex commit SHA.
  // Tags (@v4, @v4.2.2), branches (@main), and shortened SHAs are all mutable
  // or ambiguous, so a retag can silently change what executes here.
  for (const m of code.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)) {
    const ref = m[1].replace(/^["']|["']$/g, '');
    if (ref.startsWith('./') || ref.startsWith('../')) continue; // local action
    const at = ref.lastIndexOf('@');
    const rev = at === -1 ? '' : ref.slice(at + 1);
    if (!PINNED.test(rev)) {
      wfBad(`action \`${ref}\` is not pinned to an exact 40-character commit SHA`);
    }
  }

  // Container and service images execute code just like actions do, so a
  // mutable tag is the same supply-chain hole. Require a digest.
  for (const m of code.matchAll(/^\s*image:\s*["']?([^"'\s]+)/gm)) {
    const image = m[1];
    if (!/@sha256:[0-9a-f]{64}$/i.test(image)) {
      wfBad(`container/service image \`${image}\` is not pinned to an @sha256: digest`);
    }
  }

  // A blanket write token defeats least privilege.
  if (/permissions:\s*write-all/.test(code)) {
    wfBad('`permissions: write-all` grants every scope; declare only what the job needs');
  }

  // Script injection: attacker-controlled event data interpolated straight into
  // a shell. These strings are author-supplied and can contain shell syntax.
  const UNTRUSTED = /\$\{\{\s*(github\.event\.[A-Za-z0-9_.*\[\]]*|github\.head_ref)\s*\}\}/;
  const lines = code.split('\n');
  let inRun = false;
  let runIndent = 0;
  for (const line of lines) {
    const runStart = line.match(/^(\s*)-?\s*run:\s*(.*)$/);
    if (runStart) {
      inRun = true;
      runIndent = runStart[1].length;
      if (UNTRUSTED.test(runStart[2])) {
        wfBad(`untrusted event data interpolated into a \`run:\` command: ${runStart[2].trim().slice(0, 60)}`);
      }
      continue;
    }
    if (inRun) {
      const indent = line.search(/\S/);
      if (indent !== -1 && indent <= runIndent) {
        inRun = false;
      } else if (UNTRUSTED.test(line)) {
        wfBad(`untrusted event data interpolated into a \`run:\` block: ${line.trim().slice(0, 60)}`);
      }
    }
  }
}
if (!wfFailures) ok(`${wfFiles.length} workflow file(s): SHA-pinned and free of gate-weakening patterns`);

// --- result ------------------------------------------------------------------
if (failures.length) {
  console.error(`\nFAIL: ${failures.length} static check(s) failed`);
  process.exit(1);
}
console.log('\nOK: all static checks passed');
