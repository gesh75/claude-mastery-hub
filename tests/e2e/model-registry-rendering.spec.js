import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);
const ROOT_DIR = fileURLToPath(ROOT);

/**
 * Closes the "model registry rendering" deferred milestone.
 *
 * DECISION_LOG 2026-07-28 created MODEL_FACTS / MODEL_SOURCES /
 * BENCHMARK_EVIDENCE as the single source of truth for volatile claims, and
 * recorded a known gap: several fields were maintained but never consumed by a
 * renderer, so the registry and the visible prose could disagree without any
 * test noticing. These assertions require each of those fields to *drive* the
 * DOM, and require a registry defect to fail the build rather than ship.
 *
 * Everything here is a pure function of the checked-out tree. Nothing fetches
 * a citation: a blocking gate that makes network requests is non-deterministic,
 * and the gate's design rule is no continue-on-error and no `|| true`.
 */

/** Hosts a primary source is allowed to live on. */
const SOURCE_ALLOWLIST = [
  'www.anthropic.com',
  'platform.claude.com',
  'code.claude.com',
  'www.frontierbench.ai',
  'cursor.com',
  'arcprize.org',
  'zapier.com'
];

const runCitations = (indexPath) =>
  execFileSync(
    process.execPath,
    [join(ROOT_DIR, 'scripts/check-citations.mjs'), ...(indexPath ? [indexPath] : [])],
    { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );

/** Minimal standalone page carrying only the three registries. */
const fixture = (facts, sources, benchmarks, verifiedAt = '2026-07-28') =>
  `<!doctype html><html><body><script>
var MODEL_FACTS_VERIFIED_AT=${JSON.stringify(verifiedAt)};
var MODEL_SOURCES=${JSON.stringify(sources)};
var MODEL_FACTS=${JSON.stringify(facts)};
var BENCHMARK_EVIDENCE=${JSON.stringify(benchmarks)};
</script></body></html>`;

const GOOD_SOURCES = {
  modelsOverview: { label: 'Models overview', url: 'https://platform.claude.com/docs/en/about-claude/models/overview' },
  arcAgi: { label: 'ARC Prize verified results', url: 'https://arcprize.org/results/anthropic-claude-opus-5' }
};
const GOOD_FACTS = {
  opus: {
    name: 'Claude Opus 5',
    shortName: 'Opus 5',
    id: 'claude-opus-5',
    sources: ['modelsOverview']
  }
};
const GOOD_BENCH = {
  arcAgi: {
    label: 'ARC-AGI-3',
    measures: 'Interactive novel-problem solving',
    provenance: 'ARC Prize-verified',
    limitation: 'Short testing window.',
    result: '30.16% at High effort.'
  }
};

test.describe('model registry rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('the glance-table availability cell is rendered from MODEL_FACTS, not hand-typed', async ({
    page
  }) => {
    const cell = page.locator('[data-model-fact="opus.availability"]');
    await expect(cell).toHaveCount(1);

    const registryValue = await page.evaluate(() => window.MODEL_FACTS.opus.availability);
    await expect(cell).toContainText(registryValue);

    // The renderer -- not the markup -- must have produced it.
    const authored = await readFile(new URL('index.html', ROOT), 'utf8');
    const cellSource = authored.match(/<td data-model-fact="opus\.availability"[^>]*>([\s\S]*?)<\/td>/);
    expect(cellSource, 'the availability cell must carry the render hook').not.toBeNull();
    expect(
      cellSource[1].trim(),
      'the availability cell must be empty in source; the renderer fills it'
    ).toBe('');

    // Fast-mode exclusions must never leak into ordinary model availability.
    await expect(cell).toContainText('Amazon Bedrock');
    await expect(cell).toContainText('Google Cloud');
    await expect(cell).toContainText('Microsoft Foundry');
  });

  test('feature exceptions render from the MODEL_FACTS.opus.featureExceptions array', async ({
    page
  }) => {
    const exceptions = await page.evaluate(() => window.MODEL_FACTS.opus.featureExceptions);
    expect(exceptions.length).toBeGreaterThan(1);

    const items = page.locator('[data-model-fact="opus.featureExceptions"] li');
    await expect(items).toHaveCount(exceptions.length);
    for (let i = 0; i < exceptions.length; i += 1) {
      await expect(items.nth(i)).toHaveText(exceptions[i]);
    }

    // The count word is derived, so adding a third exception cannot leave
    // "two exceptions" behind in the prose.
    const cell = page.locator('[data-model-fact="opus.featureExceptions"]');
    await expect(cell).toContainText('two exceptions');

    // The Web Fetch / Web Search distinction is the single most misreadable
    // fact in this section and must survive rendering.
    await expect(cell).toContainText('Web Search is a separate tool and remains available');
    await expect(cell).not.toContainText('Web Search is not available');
  });

  test('the fast-mode row renders prices and platform exclusions from MODEL_FACTS.opus.fastMode', async ({
    page
  }) => {
    const fastMode = await page.evaluate(() => window.MODEL_FACTS.opus.fastMode);
    const cell = page.locator('[data-model-fact="opus.fastMode"]');
    await expect(cell).toHaveCount(1);

    await expect(cell).toContainText(
      `$${fastMode.inputPrice} input / $${fastMode.outputPrice} output per MTok`
    );
    await expect(cell).toContainText(fastMode.availableOn);
    await expect(cell).toContainText(fastMode.speedClaim);

    // Every excluded platform is rendered -- including Claude Platform on AWS,
    // which the hand-written cell silently omitted.
    for (const platform of fastMode.unavailableOn) {
      await expect(cell).toContainText(platform);
    }
    expect(fastMode.unavailableOn).toContain('Claude Platform on AWS');
  });

  test('the verification date is rendered from MODEL_FACTS_VERIFIED_AT without locale-dependent formatting', async ({
    page
  }) => {
    const iso = await page.evaluate(() => window.MODEL_FACTS_VERIFIED_AT);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const stamp = page.locator('[data-model-fact="verifiedAt"]').first();
    await expect(stamp).toHaveCount(1);
    await expect(stamp).toHaveText('July 28, 2026');

    // A locale-dependent formatter renders differently under a different ICU
    // build or TZ, which would make this assertion machine-specific.
    const authored = await readFile(new URL('index.html', ROOT), 'utf8');
    for (const banned of ['toLocaleDateString', 'toLocaleString', 'Intl.DateTimeFormat']) {
      expect(authored, `${banned} makes the rendered date machine-specific`).not.toContain(banned);
    }
  });

  test('the benchmark table body is rendered from BENCHMARK_EVIDENCE', async ({ page }) => {
    const evidence = await page.evaluate(() => window.BENCHMARK_EVIDENCE);
    const keys = Object.keys(evidence);

    const body = page.locator('#opus-5-benchmarks [data-bench-rows]');
    await expect(body).toHaveCount(1);
    await expect(body.locator('tr')).toHaveCount(keys.length);

    for (const key of keys) {
      const entry = evidence[key];
      const row = body.locator('tr', { hasText: entry.label });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(entry.measures);
      await expect(row).toContainText(entry.provenance);
      await expect(row).toContainText(entry.limitation);
    }

    const authored = await readFile(new URL('index.html', ROOT), 'utf8');
    const bodySource = authored.match(/<tbody data-bench-rows[^>]*>([\s\S]*?)<\/tbody>/);
    expect(bodySource, 'the benchmark tbody must carry the render hook').not.toBeNull();
    expect(bodySource[1].trim(), 'the benchmark tbody must be empty in source').toBe('');
  });

  test('the ARC-AGI-3 row derives both representations from the registry numeric fields', async ({
    page
  }) => {
    const arc = await page.evaluate(() => window.BENCHMARK_EVIDENCE.arcAgi);

    // The registry keeps the exact value as the number and the rounded value
    // must genuinely be its rounding -- DECISION_LOG 2026-07-29.
    expect(Number(arc.exactScore.toFixed(1))).toBe(arc.roundedScore);

    const row = page.locator('#opus-5-benchmarks [data-bench-rows] tr', { hasText: 'ARC-AGI-3' });
    await expect(row).toContainText(`${arc.roundedScore}%`);
    await expect(row).toContainText(`${arc.exactScore}%`);
    await expect(row).toContainText(arc.effort);
    await expect(row).toContainText('rounded');
    await expect(row).toContainText('exact');
    await expect(row).toContainText('Same single result, two representations');

    // Neither number may be hand-typed into the markup: the template holds
    // placeholders, and the renderer substitutes the registry values.
    expect(arc.resultTemplate).toContain('{rounded}');
    expect(arc.resultTemplate).toContain('{exact}');
    expect(arc.resultTemplate).toContain('{effort}');
    expect(
      arc.resultTemplate,
      'the template must not hard-code a score it is meant to derive'
    ).not.toContain(String(arc.exactScore));

    // Scope the check to the authored benchmark markup. `result` legitimately
    // keeps a human-readable "30.16%" summary -- content-currency.spec.js:205
    // pins it -- so a whole-file count would fight an existing guard.
    const authored = await readFile(new URL('index.html', ROOT), 'utf8');
    const start = authored.indexOf('<div id="opus-5-benchmarks">');
    expect(start, 'the benchmark block must be findable').toBeGreaterThan(0);
    const markup = authored.slice(start, authored.indexOf('</div>', authored.indexOf('cal warn', start)));
    for (const literal of [String(arc.exactScore), String(arc.roundedScore)]) {
      expect(markup, `${literal} must come from the registry, not the template`).not.toContain(
        literal
      );
    }
  });

  test('the Primary-sources list is rendered from MODEL_SOURCES and covers every referenced key', async ({
    page
  }) => {
    const { sources, referenced, opusReferenced } = await page.evaluate(() => {
      // Match check-citations.mjs: it walks EVERY model, not just opus. Deriving
      // the set from opus alone would make the two-way assertion below disagree
      // with the gate the moment another model cites a source opus does not.
      const fromAllModels = Object.values(window.MODEL_FACTS).flatMap((m) => m.sources ?? []);
      const benchKeys = Object.keys(window.BENCHMARK_EVIDENCE);
      // WORKFLOW_FACTS cites the same source table; check-citations counts it too.
      const fromWorkflow = Object.values(window.WORKFLOW_FACTS ?? {}).map((f) => f.source);
      return {
        sources: window.MODEL_SOURCES,
        referenced: [...new Set([...fromAllModels, ...benchKeys, ...fromWorkflow])],
        opusReferenced: [...new Set([...window.MODEL_FACTS.opus.sources, ...benchKeys])]
      };
    });

    const list = page.locator('ul.cites[data-model-sources="opus"]');
    await expect(list).toHaveCount(1);
    // The list renders what OPUS cites; the registry-wide set is checked below.
    await expect(list.locator('li a')).toHaveCount(opusReferenced.length);

    for (const key of opusReferenced) {
      const anchor = list.locator(`a[href="${sources[key].url}"]`);
      await expect(anchor, `${key} must be cited`).toHaveCount(1);
      await expect(anchor).toHaveText(sources[key].label);
      await expect(anchor).toHaveAttribute('rel', 'noopener');
    }

    // Named, per-key resolution first. The set equality below already catches a
    // dangling workflow source, but it fails as a whole-array diff; this names
    // the offending key the way check-citations.mjs does.
    const workflowSources = await page.evaluate(() =>
      Object.entries(window.WORKFLOW_FACTS ?? {}).map(([name, f]) => [name, f.source])
    );
    expect(workflowSources.length, 'WORKFLOW_FACTS must cite something').toBeGreaterThan(0);
    for (const [name, key] of workflowSources) {
      expect(sources[key], `WORKFLOW_FACTS.${name} cites "${key}", absent from MODEL_SOURCES`).toBeTruthy();
    }

    // Two-way: nothing in the registry is orphaned.
    expect(referenced.sort()).toEqual(Object.keys(sources).sort());
  });

  test('check-citations.mjs enforces schema conformance and two-way referential integrity', async () => {
    // The real tree passes.
    expect(runCitations()).toContain('OK');

    const dir = await mkdtemp(join(tmpdir(), 'registry-'));
    const write = async (name, html) => {
      const p = join(dir, name);
      await writeFile(p, html, 'utf8');
      return p;
    };
    const expectFailure = (p, needle) => {
      let failed = false;
      try {
        runCitations(p);
      } catch (err) {
        failed = true;
        expect(`${err.stdout ?? ''}${err.stderr ?? ''}`).toContain(needle);
      }
      expect(failed, `check-citations must reject: ${needle}`).toBe(true);
    };

    // A fact references a source key that does not exist.
    expectFailure(
      await write(
        'dangling.html',
        fixture(
          { opus: { ...GOOD_FACTS.opus, sources: ['modelsOverview', 'ghost'] } },
          GOOD_SOURCES,
          GOOD_BENCH
        )
      ),
      'ghost'
    );

    // A source exists but nothing cites it.
    expectFailure(
      await write(
        'orphan.html',
        fixture(GOOD_FACTS, { ...GOOD_SOURCES, unused: { label: 'x', url: 'https://cursor.com/evals' } }, GOOD_BENCH)
      ),
      'unused'
    );

    // A benchmark declares a provenance outside the enum.
    expectFailure(
      await write(
        'provenance.html',
        fixture(GOOD_FACTS, GOOD_SOURCES, {
          arcAgi: { ...GOOD_BENCH.arcAgi, provenance: 'vibes' }
        })
      ),
      'provenance'
    );

    // A verification date in the future is a typo, not a fact.
    expectFailure(
      await write('future.html', fixture(GOOD_FACTS, GOOD_SOURCES, GOOD_BENCH, '2099-01-01')),
      'future'
    );

    // Staleness is surfaced, never failed: an old date still exits 0, because
    // failing on it would turn an unrelated PR red for a content-owner problem.
    const stale = await write('stale.html', fixture(GOOD_FACTS, GOOD_SOURCES, GOOD_BENCH, '2020-01-01'));
    expect(runCitations(stale)).toMatch(/stale|review/i);
  });

  test('registry-schema.json closes the object shape and the provenance enum', async () => {
    const schema = JSON.parse(await readFile(new URL('scripts/registry-schema.json', ROOT), 'utf8'));

    const closed = (node, path = '$') => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'object' && node.properties) {
        expect(
          node.additionalProperties,
          `${path} must be closed, or a typo'd field passes validation silently`
        ).toBe(false);
      }
      for (const [k, v] of Object.entries(node)) {
        if (v && typeof v === 'object') closed(v, `${path}.${k}`);
      }
    };
    closed(schema);

    const enumValues = JSON.stringify(schema).match(/"enum":\s*\[[^\]]*\]/g) ?? [];
    expect(enumValues.join(' '), 'provenance must be an enum').toContain('ARC Prize-verified');

    // The schema must actually be reachable from the checker.
    const checker = await readFile(new URL('scripts/check-citations.mjs', ROOT), 'utf8');
    expect(checker).toContain('registry-schema.json');
  });

  test('every MODEL_SOURCES url is https, credential-free, and on the primary-source allowlist', async ({
    page
  }) => {
    const sources = await page.evaluate(() => window.MODEL_SOURCES);
    const entries = Object.entries(sources);
    expect(entries.length).toBeGreaterThan(0);

    for (const [key, src] of entries) {
      const url = new URL(src.url);
      expect(url.protocol, `${key} must be https`).toBe('https:');
      expect(url.username, `${key} must carry no credentials`).toBe('');
      expect(url.password, `${key} must carry no credentials`).toBe('');
      expect(url.hash, `${key} should cite a page, not a fragment`).toBe('');
      expect(SOURCE_ALLOWLIST, `${key} host ${url.host} is not an approved primary source`).toContain(
        url.host
      );
      expect(src.label.trim().length, `${key} needs a label`).toBeGreaterThan(0);
    }

    // The allowlist is enforced by the gate too, not only by this test.
    const checker = await readFile(new URL('scripts/check-citations.mjs', ROOT), 'utf8');
    for (const host of SOURCE_ALLOWLIST) {
      expect(checker, `${host} must be in the checker allowlist`).toContain(host);
    }
  });
});
