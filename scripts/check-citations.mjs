#!/usr/bin/env node
/**
 * Registry and citation integrity gate.
 *
 * DECISION_LOG 2026-07-28 made MODEL_FACTS / MODEL_SOURCES / BENCHMARK_EVIDENCE
 * the single source of truth for volatile claims. This makes a defect in that
 * registry fail the build instead of shipping:
 *
 *   1. the three registries conform to scripts/registry-schema.json
 *   2. two-way referential integrity -- every cited source key exists, and
 *      every source is cited by something (an orphan is a citation that silently
 *      stopped being shown)
 *   3. every source URL is https, credential-free, and on the primary-source
 *      allowlist from docs/CONTENT_CURRENCY_POLICY.md
 *   4. MODEL_FACTS_VERIFIED_AT is a valid ISO date that is not in the future
 *
 * ZERO NETWORK CALLS, by design. This runs inside the blocking Quality gate,
 * whose rule is no `continue-on-error` and no `|| true`; a check that makes
 * network requests would turn `main` red on a third-party outage. Link liveness
 * is deliberately out of scope -- DECISION_LOG 2026-08-08.
 *
 * Staleness is SURFACED, never failed: an old verification date is a
 * content-owner task, and failing on it would make an unrelated PR red.
 *
 * CONTRACT: the registries must stay top-level `var` declarations initialised
 * with pure literals inside an inline <script>. The acorn extraction below
 * depends on that; a computed initialiser will be reported as unreadable rather
 * than silently skipped.
 *
 * Usage: node scripts/check-citations.mjs [path/to/index.html]
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

const SCHEMA_PATH = fileURLToPath(new URL('registry-schema.json', import.meta.url));
const INDEX_PATH = process.argv[2] ?? 'index.html';

/** Hosts a primary source may live on (CONTENT_CURRENCY_POLICY.md § Primary sources). */
const HOST_ALLOWLIST = new Set([
  'www.anthropic.com',
  'platform.claude.com',
  'code.claude.com',
  'www.frontierbench.ai',
  'cursor.com',
  'arcprize.org',
  'zapier.com'
]);

/** Days after which a verification date is reported as review-due. */
const REVIEW_DUE_DAYS = 30;

const failures = [];
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => {
  console.log(`  FAIL ${m}`);
  failures.push(m);
};

// --- literal extraction ------------------------------------------------------

function literalValue(node, path) {
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'UnaryExpression':
      if (node.operator === '-') return -literalValue(node.argument, path);
      throw new Error(`${path}: unsupported unary \`${node.operator}\``);
    case 'ArrayExpression':
      return node.elements.map((el, i) => literalValue(el, `${path}[${i}]`));
    case 'ObjectExpression': {
      const out = {};
      for (const prop of node.properties) {
        if (prop.type !== 'Property') throw new Error(`${path}: spread is not a pure literal`);
        const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
        out[key] = literalValue(prop.value, `${path}.${key}`);
      }
      return out;
    }
    default:
      throw new Error(`${path}: initialiser is not a pure literal (${node.type})`);
  }
}

function extractRegistries(html) {
  const found = {};
  const wanted = new Set([
    'MODEL_FACTS_VERIFIED_AT',
    'MODEL_SOURCES',
    'MODEL_FACTS',
    'BENCHMARK_EVIDENCE'
  ]);
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
    let ast;
    try {
      ast = acorn.parse(m[1], { ecmaVersion: 'latest', sourceType: 'script' });
    } catch {
      continue;
    }
    for (const node of ast.body) {
      if (node.type !== 'VariableDeclaration') continue;
      for (const d of node.declarations) {
        if (d.id.type !== 'Identifier' || !wanted.has(d.id.name) || !d.init) continue;
        found[d.id.name] = literalValue(d.init, d.id.name);
      }
    }
  }
  return found;
}

// --- minimal draft-07 subset validator ---------------------------------------
// Deliberately hand-rolled: the gate adds no dependency, and the subset the
// schema uses is small enough to keep honest.

function validate(value, schema, path, errs) {
  if (schema.enum) {
    if (!schema.enum.includes(value)) {
      errs.push(`${path}: ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}`);
    }
    return;
  }
  const type = schema.type;
  if (type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      errs.push(`${path}: expected object`);
      return;
    }
    const keys = Object.keys(value);
    if (schema.minProperties && keys.length < schema.minProperties) {
      errs.push(`${path}: needs at least ${schema.minProperties} properties`);
    }
    for (const req of schema.required ?? []) {
      if (!(req in value)) errs.push(`${path}: missing required property \`${req}\``);
    }
    for (const [dep, needed] of Object.entries(schema.dependencies ?? {})) {
      if (dep in value) {
        for (const n of needed) {
          if (!(n in value)) errs.push(`${path}: \`${dep}\` requires \`${n}\``);
        }
      }
    }
    for (const key of keys) {
      const direct = schema.properties?.[key];
      if (direct) {
        validate(value[key], direct, `${path}.${key}`, errs);
        continue;
      }
      let matched = false;
      for (const [pattern, sub] of Object.entries(schema.patternProperties ?? {})) {
        if (new RegExp(pattern).test(key)) {
          matched = true;
          validate(value[key], sub, `${path}.${key}`, errs);
        }
      }
      if (!matched && schema.additionalProperties === false) {
        errs.push(`${path}: unexpected property \`${key}\` (the shape is closed on purpose)`);
      }
    }
    return;
  }
  if (type === 'array') {
    if (!Array.isArray(value)) {
      errs.push(`${path}: expected array`);
      return;
    }
    if (schema.minItems && value.length < schema.minItems) {
      errs.push(`${path}: needs at least ${schema.minItems} items`);
    }
    value.forEach((v, i) => schema.items && validate(v, schema.items, `${path}[${i}]`, errs));
    return;
  }
  if (type === 'string') {
    if (typeof value !== 'string') {
      errs.push(`${path}: expected string`);
      return;
    }
    if (schema.minLength && value.length < schema.minLength) errs.push(`${path}: must not be empty`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errs.push(`${path}: ${JSON.stringify(value)} does not match ${schema.pattern}`);
    }
    return;
  }
  if (type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      errs.push(`${path}: expected number`);
      return;
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      errs.push(`${path}: must be >= ${schema.minimum}`);
    }
  }
}

// --- run ---------------------------------------------------------------------

const html = await readFile(INDEX_PATH, 'utf8');
const schema = JSON.parse(await readFile(SCHEMA_PATH, 'utf8'));

console.log(`registry extraction (${INDEX_PATH})`);
let reg;
try {
  reg = extractRegistries(html);
} catch (err) {
  bad(`registry is not a pure literal: ${err.message}`);
  reg = {};
}
for (const name of ['MODEL_FACTS_VERIFIED_AT', 'MODEL_SOURCES', 'MODEL_FACTS', 'BENCHMARK_EVIDENCE']) {
  if (reg[name] === undefined) bad(`\`${name}\` not found as a top-level literal declaration`);
}

if (!failures.length) {
  ok('all four registries extracted as pure literals');

  const doc = {
    verifiedAt: reg.MODEL_FACTS_VERIFIED_AT,
    sources: reg.MODEL_SOURCES,
    facts: reg.MODEL_FACTS,
    benchmarks: reg.BENCHMARK_EVIDENCE
  };

  console.log('schema conformance');
  const errs = [];
  validate(doc, schema, '$', errs);
  errs.forEach(bad);
  if (!errs.length) ok('registries conform to registry-schema.json');

  console.log('referential integrity');
  const sourceKeys = new Set(Object.keys(doc.sources ?? {}));
  const referenced = new Set();
  let dangling = 0;
  for (const [model, facts] of Object.entries(doc.facts ?? {})) {
    for (const key of facts.sources ?? []) {
      referenced.add(key);
      if (!sourceKeys.has(key)) {
        bad(`MODEL_FACTS.${model}.sources cites \`${key}\`, which is not in MODEL_SOURCES`);
        dangling += 1;
      }
    }
  }
  for (const key of Object.keys(doc.benchmarks ?? {})) {
    referenced.add(key);
    if (!sourceKeys.has(key)) {
      bad(`BENCHMARK_EVIDENCE.${key} has no matching MODEL_SOURCES entry to cite`);
      dangling += 1;
    }
  }
  let orphans = 0;
  for (const key of sourceKeys) {
    if (!referenced.has(key)) {
      bad(`MODEL_SOURCES.${key} is never cited — an uncited source is a citation that stopped being shown`);
      orphans += 1;
    }
  }
  if (!dangling && !orphans) ok(`${sourceKeys.size} sources, all cited, all resolvable`);

  console.log('source URLs');
  let urlHits = 0;
  for (const [key, src] of Object.entries(doc.sources ?? {})) {
    let url;
    try {
      url = new URL(src.url);
    } catch {
      bad(`MODEL_SOURCES.${key}: \`${src.url}\` is not a valid URL`);
      urlHits += 1;
      continue;
    }
    if (url.protocol !== 'https:') {
      bad(`MODEL_SOURCES.${key}: must be https`);
      urlHits += 1;
    }
    if (url.username || url.password) {
      bad(`MODEL_SOURCES.${key}: URL carries credentials`);
      urlHits += 1;
    }
    if (!HOST_ALLOWLIST.has(url.host)) {
      bad(`MODEL_SOURCES.${key}: host \`${url.host}\` is not an approved primary source`);
      urlHits += 1;
    }
  }
  if (!urlHits) ok('every source URL is https, credential-free, and on the allowlist');

  console.log('verification date');
  const iso = doc.verifiedAt;
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.test(String(iso)) ? new Date(`${iso}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    bad(`MODEL_FACTS_VERIFIED_AT \`${iso}\` is not a valid ISO date`);
  } else {
    const ageDays = Math.floor((Date.now() - parsed.getTime()) / 86400000);
    if (ageDays < 0) {
      bad(`MODEL_FACTS_VERIFIED_AT \`${iso}\` is in the future — a date cannot be verified before it happens`);
    } else if (ageDays > REVIEW_DUE_DAYS) {
      // Surfaced, never failed. See the header.
      ok(`verified ${iso} — stale by ${ageDays - REVIEW_DUE_DAYS} days, review due (not a build failure)`);
    } else {
      ok(`verified ${iso} — ${ageDays} days old`);
    }
  }
}

if (failures.length) {
  console.error(`\ncheck-citations: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('\nOK: registry and citation integrity check passed');
