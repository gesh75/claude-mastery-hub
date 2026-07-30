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
import { parse as parseYaml } from 'yaml';
import * as acorn from 'acorn';

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
//
// A regex over `(var|let|const)\s+top` only ever saw the first declarator, so
// `var helper, top = 1`, `const { top } = x`, and `const [top] = x` all slipped
// through. This walks the real binding patterns instead. Member expressions
// (window.top), object *literal* keys ({ top: 1 }), strings, and comments are
// not bindings and are left alone.
console.log('reserved global shadowing');

/** Collect every identifier a binding pattern introduces. */
function bindingNames(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  switch (node.type) {
    case 'Identifier':
      out.push(node);
      break;
    case 'ObjectPattern':
      for (const prop of node.properties) {
        // { x: top } binds the VALUE; { top } is shorthand for { top: top }.
        if (prop.type === 'Property') bindingNames(prop.value, out);
        else bindingNames(prop.argument, out); // RestElement
      }
      break;
    case 'ArrayPattern':
      for (const el of node.elements) if (el) bindingNames(el, out);
      break;
    case 'AssignmentPattern':
      bindingNames(node.left, out);
      break;
    case 'RestElement':
      bindingNames(node.argument, out);
      break;
    default:
      break;
  }
  return out;
}

/** Recursively visit every node, collecting variable declarations. */
function walkAst(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) walkAst(n, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
    walkAst(node[key], visit);
  }
}

let topBindings = 0;
let astFailures = 0;
scripts.forEach((m, i) => {
  let ast;
  try {
    ast = acorn.parse(m[1], { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (err) {
    bad(`inline script #${i + 1} could not be parsed for binding analysis: ${err.message}`);
    astFailures++;
    return;
  }
  walkAst(ast, (node) => {
    if (node.type !== 'VariableDeclaration') return;
    for (const decl of node.declarations) {
      for (const id of bindingNames(decl.id)) {
        if (id.name === 'top') {
          const line = id.loc?.start?.line ?? '?';
          bad(
            `inline script #${i + 1} line ${line}: \`${node.kind} … top\` binds the read-only ` +
              'window.top global — rename it (topBtn)'
          );
          topBindings++;
        }
      }
    }
  });
});
if (!topBindings && !astFailures) ok('no JS binding named `top` (checked via AST, not text match)');

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
const styleAttrValues = [];
const flagExternal = (what, url) => {
  bad(`external subresource ${what}: ${url.trim().slice(0, 80)} — the page must fetch nothing at load`);
  externalHits++;
};

for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
  const tag = m[1].toLowerCase();
  const a = attrs(m[2]);
  // Every element may carry a style attribute, including <a>.
  if (typeof a.style === 'string' && a.style.length) styleAttrValues.push(a.style);
  if (tag === 'a') continue; // documentation links are allowed

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

// CSS corpus: <style> blocks plus every style attribute collected during the
// tag walk above via attrs(), which handles double-quoted, single-quoted,
// unquoted, and uppercase STYLE uniformly.
const css = [
  ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]),
  ...styleAttrValues
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
const DIGEST = /@sha256:[0-9a-f]{64}$/i;
const UNTRUSTED = /\$\{\{\s*(github\.event\.[A-Za-z0-9_.*[\]]*|github\.head_ref)\s*\}\}/;

/**
 * Security-critical workflow semantics are read from the parsed YAML, not from
 * indentation-sensitive regexes. `uses : x`, `uses: "x"`, a job-level reusable
 * workflow, `continue-on-error : true`, and a nested `continue-on-error` are
 * all the same structure once parsed, so none of them can slip past on
 * formatting alone.
 */
function walkYaml(node, visit, path = []) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkYaml(v, visit, path.concat(`[${i}]`)));
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    visit(key, value, path.concat(key));
    walkYaml(value, visit, path.concat(key));
  }
}

for (const f of wfFiles) {
  const raw = await readFile(`${wfDir}/${f}`, 'utf8');
  const wfBad = (m) => {
    bad(`${f}: ${m}`);
    wfFailures++;
  };

  let doc;
  try {
    doc = parseYaml(raw);
  } catch (err) {
    wfBad(`is not valid YAML: ${err.message.split('\n')[0]}`);
    continue;
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    wfBad('does not parse to a YAML mapping');
    continue;
  }

  // `on:` is a YAML 1.1 boolean; the 1.2 core schema keeps it a string, so
  // accept either shape rather than assuming one.
  const triggers = doc.on ?? doc[true] ?? doc['on'];
  const triggerNames = new Set();
  if (typeof triggers === 'string') triggerNames.add(triggers);
  else if (Array.isArray(triggers)) for (const t of triggers) triggerNames.add(String(t));
  else if (triggers && typeof triggers === 'object') for (const k of Object.keys(triggers)) triggerNames.add(k);
  if (triggerNames.has('pull_request_target')) {
    wfBad('pull_request_target runs untrusted PR code with write scope');
  }

  walkYaml(doc, (key, value, path) => {
    const where = path.join('.');

    if (key === 'uses') {
      if (typeof value !== 'string' || value.trim() === '') {
        wfBad(`${where}: \`uses\` must be a non-empty string, got ${JSON.stringify(value)}`);
        return;
      }
      const ref = value.trim();
      if (ref.startsWith('./') || ref.startsWith('../')) return; // local action
      const at = ref.lastIndexOf('@');
      const rev = at === -1 ? '' : ref.slice(at + 1);
      if (!PINNED.test(rev)) {
        wfBad(`${where}: action \`${ref}\` is not pinned to an exact 40-character commit SHA`);
      }
      return;
    }

    if (key === 'continue-on-error') {
      if (value === true || String(value).toLowerCase() === 'true') {
        wfBad(`${where}: continue-on-error makes the gate advisory`);
      }
      return;
    }

    if (key === 'run') {
      if (typeof value !== 'string') {
        wfBad(`${where}: \`run\` must be a string, got ${JSON.stringify(value)}`);
        return;
      }
      if (/\|\|\s*true\b/.test(value)) wfBad(`${where}: \`|| true\` swallows a failing command`);
      if (UNTRUSTED.test(value)) {
        const hit = value.match(UNTRUSTED)[0];
        wfBad(`${where}: untrusted event data interpolated into a run block: ${hit}`);
      }
      return;
    }

    if (key === 'permissions' && String(value).trim() === 'write-all') {
      wfBad(`${where}: \`permissions: write-all\` grants every scope; declare only what the job needs`);
      return;
    }

    // Container and service images execute code like actions do, so a mutable
    // tag is the same supply-chain hole.
    if (key === 'image') {
      if (typeof value !== 'string') {
        wfBad(`${where}: \`image\` must be a string, got ${JSON.stringify(value)}`);
      } else if (!DIGEST.test(value)) {
        wfBad(`${where}: image \`${value}\` is not pinned to an @sha256: digest`);
      }
      return;
    }
    if (key === 'container' && typeof value === 'string' && !DIGEST.test(value)) {
      wfBad(`${where}: container \`${value}\` is not pinned to an @sha256: digest`);
    }
  });
}

if (!wfFailures) ok(`${wfFiles.length} workflow file(s): SHA-pinned and free of gate-weakening patterns`);

// --- result ------------------------------------------------------------------
if (failures.length) {
  console.error(`\nFAIL: ${failures.length} static check(s) failed`);
  process.exit(1);
}
console.log('\nOK: all static checks passed');
