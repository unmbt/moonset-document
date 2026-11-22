import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextThemePreference,
  parseStoredTheme,
  resolveTheme,
} from './theme';
import {
  computeSectionProgress,
  computeTimelineState,
} from './scrollTimeline';
import {
  extractHeadings,
  parseChangelog,
  resolveRelativeDocSlug,
  slugifyHeading,
} from './markdown';
import {
  ALL_DOCS,
  getDocBySlug,
  getDocNeighbors,
  searchDocs,
} from './docsCatalog';
import { evaluateInteractiveCommand, getScenarioById } from './terminalScripts';

test('theme defaults to system and toggles with immediate visual change', () => {
  assert.equal(parseStoredTheme(null), 'system');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');

  // When system is dark: system -> light -> system
  const step1Dark = nextThemePreference('system', true);
  assert.equal(step1Dark, 'light');
  assert.equal(resolveTheme(step1Dark, true), 'light');
  assert.equal(nextThemePreference(step1Dark, true), 'system');

  // When system is light: system -> dark -> system
  const step1Light = nextThemePreference('system', false);
  assert.equal(step1Light, 'dark');
  assert.equal(resolveTheme(step1Light, false), 'dark');
  assert.equal(nextThemePreference(step1Light, false), 'system');
});

test('scroll timeline computes bounded progress and active chapters', () => {
  assert.equal(computeSectionProgress(200, 2000, 800), 0);
  assert.equal(computeSectionProgress(-600, 2000, 800), 0.5);
  assert.equal(computeSectionProgress(-1600, 2000, 800), 1);

  const start = computeTimelineState(0, 5);
  assert.equal(start.activeIndex, 0);
  assert.equal(start.weights[0], 1);

  const mid = computeTimelineState(0.5, 5);
  assert.equal(mid.activeIndex, 2);
  assert.equal(mid.weights[2], 1);

  const end = computeTimelineState(1, 5);
  assert.equal(end.activeIndex, 4);
  assert.equal(end.weights[4], 1);
});

test('markdown heading extraction ignores fenced code blocks and deduplicates IDs', () => {
  const md = [
    '# Title',
    '## 快速开始',
    '```bash',
    '## not a heading',
    '```',
    '### CLI `status` 命令',
    '## 快速开始',
  ].join('\n');

  const headings = extractHeadings(md);
  assert.equal(headings.length, 3);
  assert.equal(headings[0].id, slugifyHeading('快速开始'));
  assert.equal(headings[1].text, 'CLI status 命令');
  assert.equal(headings[2].id, `${slugifyHeading('快速开始')}-1`);
});

test('relative doc link resolution maps markdown paths to SPA routes', () => {
  assert.deepEqual(
    resolveRelativeDocSlug('docs/README.md', 'commands.md'),
    { route: '/docs/commands', hash: undefined },
  );
  assert.deepEqual(
    resolveRelativeDocSlug('docs/README.md', 'decisions/009-changesets-v3-pre-and-snapshot-model.md'),
    { route: '/docs/decisions/009-changesets-v3-pre-and-snapshot-model', hash: undefined },
  );
  assert.deepEqual(
    resolveRelativeDocSlug('docs/decisions/README.md', '010-inline-tui-and-terminal-color.md'),
    { route: '/docs/decisions/010-inline-tui-and-terminal-color', hash: undefined },
  );
  assert.deepEqual(
    resolveRelativeDocSlug('docs/README.md', '../CHANGELOG.md'),
    { route: '/changelog', hash: undefined },
  );
  assert.equal(
    resolveRelativeDocSlug('docs/README.md', 'https://github.com/unmbt/moonset'),
    null,
  );
});

test('changelog parser extracts versions, dates, groups, and commit links', () => {
  const sample = `# Changelog

## 0.2.0 - 2026-11-19

### Minor Changes

- [\`2095fc4\`](https://github.com/unmbt/moonset/commit/2095fc4) Thanks [@Wyatex](https://github.com/Wyatex)! - Add glob matching and formatter support.

## 0.1.0 - 2026-11-18

### Features

- Initial release. ([badcec44](https://github.com/unmbt/moonset/commit/badcec44))
`;

  const parsed = parseChangelog(sample);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].version, '0.2.0');
  assert.equal(parsed[0].date, '2026-11-19');
  assert.equal(parsed[0].groups[0].items[0].commitHash, '2095fc4');
  assert.equal(parsed[0].groups[0].items[0].author, 'Wyatex');
  assert.equal(parsed[1].groups[0].items[0].commitHash, 'badcec44');
});

test('docs catalog search and neighbor navigation work accurately', () => {
  assert.ok(ALL_DOCS.length >= 20);
  assert.equal(getDocBySlug('commands')?.repoPath, 'docs/commands.md');

  const neighbors = getDocNeighbors('commands');
  assert.ok(neighbors.prev);
  assert.ok(neighbors.next);

  const hits = searchDocs('commands', {
    'docs/commands.md': 'moonset status --verbose and publish-plan commands',
  });
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].item.slug, 'commands');
});

test('interactive terminal evaluator handles help, doctor, and scenario switching', () => {
  assert.equal(getScenarioById('add').id, 'add');
  assert.equal(evaluateInteractiveCommand('clear').clear, true);
  assert.equal(evaluateInteractiveCommand('moonset status').switchScenario, 'status');
  assert.ok(evaluateInteractiveCommand('moonset doctor').lines.length >= 4);
  assert.ok(evaluateInteractiveCommand('help').lines.some((l) => l.includes('moonset add')));
});
