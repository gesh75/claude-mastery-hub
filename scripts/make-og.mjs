#!/usr/bin/env node
/**
 * Regenerate og.png, the 1200x630 (@2x) social card.
 *
 * The card advertises counts. Before this script it was a hand-made binary that
 * nothing could verify, and it drifted: it claimed 39 sections against a real 43
 * for a month, which docs/audits/SOL_INDEPENDENT_REVIEW_2026-07-28.md caught by
 * eye rather than by test.
 *
 * Counts are DERIVED from index.html here, never passed in, and written to
 * og.meta.json so a test can prove the shipped image is not stale.
 *
 *   node scripts/make-og.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = new URL('../', import.meta.url);

const html = await readFile(new URL('index.html', ROOT), 'utf8');

const labArray = (() => {
  const start = html.indexOf('var LAB=[');
  let depth = 0;
  for (let i = start + 'var LAB='.length; i < html.length; i += 1) {
    if (html[i] === '[') depth += 1;
    else if (html[i] === ']') {
      depth -= 1;
      if (depth === 0) return html.slice(start, i);
    }
  }
  throw new Error('LAB array not found');
})();

const count = (re, s = html) => (s.match(re) ?? []).length;
const stats = {
  sections: count(/<input[^>]*master-cb/g),
  lab: count(/\{id:"lab-/g, labArray),
  diagrams: count(/class="diagram"/g),
  tracks: count(/class="nav-track"/g),
  generated: new Date().toISOString().slice(0, 10)
};
for (const key of ['sections', 'lab', 'diagrams', 'tracks']) {
  if (!stats[key]) throw new Error(`derived ${key} as 0 — refusing to render a false card`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto(`file://${fileURLToPath(new URL('scripts/og-card.html', ROOT))}`);
await page.evaluate((s) => {
  document.getElementById('a').textContent = s.sections;
  document.getElementById('b').textContent = s.lab;
  document.getElementById('c').textContent = s.diagrams;
  document.getElementById('d').textContent = s.tracks;
}, stats);
await page.waitForTimeout(300);
await page.screenshot({ path: fileURLToPath(new URL('og.png', ROOT)) });
await browser.close();

await writeFile(new URL('og.meta.json', ROOT), `${JSON.stringify(stats, null, 2)}\n`);
console.log('og.png regenerated:', JSON.stringify(stats));
