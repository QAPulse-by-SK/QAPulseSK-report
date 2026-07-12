// Smoke test for v2.0.0 — verifies the full pipeline end to end WITHOUT any
// real runner. Uses the Puppeteer adapter (simplest, imperative API) and
// fabricates a PNG on disk so the screenshot collector has real bytes to inline.
//
// Run: node scripts/smoke-test.js
//
// Checks:
//   1. Build output exists
//   2. Adapter -> orchestrator -> HTML file is produced
//   3. Screenshots are inlined (small PNG under 200KB threshold)
//   4. Lightbox script + gallery CSS are present in the HTML
//   5. History JSON is written and appended across runs
//   6. Second run trend chart shows 2 data points

const fs = require('fs');
const path = require('path');
const os = require('os');

const OUT = path.join(__dirname, '..', '.smoke-out');
const HISTORY_FILE = '.qapulse-history.json';

// Clean previous smoke output
fs.rmSync(OUT, { recursive: true, force: true });

// 1x1 red PNG (67 bytes). Real image so the collector actually reads bytes.
const RED_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const shotPath = path.join(os.tmpdir(), `qp-smoke-${Date.now()}.png`);
fs.writeFileSync(shotPath, Buffer.from(RED_PNG_B64, 'base64'));

const distExists = fs.existsSync(path.join(__dirname, '..', 'dist', 'index.js'));
if (!distExists) {
  console.error('❌ dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { QAPulsePuppeteerReporter } = require('..');

async function run(label) {
  const reporter = new QAPulsePuppeteerReporter({
    outputDir: OUT,
    reportTitle: `Smoke Test — ${label}`,
    history: { enabled: true, historyFile: HISTORY_FILE },
  });

  reporter.startTest('home page loads', { suite: 'Public' });
  reporter.endTest('passed');

  reporter.startTest('login fails with wrong password', { suite: 'Auth' });
  reporter.endTest('failed', {
    error: new Error('Expected redirect to /dashboard, got /login?err=1'),
    screenshotPath: shotPath,
  });

  reporter.startTest('signup form validates email', { suite: 'Auth' });
  reporter.endTest('passed');

  await reporter.finish();
}

async function runWithClusters() {
  const r = new QAPulsePuppeteerReporter({
    outputDir: path.join(OUT, 'clusters'),
    reportTitle: 'Clustering demo',
  });

  // Passing tests with fake duration (spread across buckets for histogram)
  const dur = [50, 300, 800, 2500, 8000, 12000];
  const suites = ['Auth', 'Checkout', 'Profile', 'Search'];
  let i = 0;
  for (const s of suites) {
    r.startTest(`fast smoke ${s}`, { suite: s });
    r.endTest('passed');
    const list = r.buckets.get(s);
    list[list.length - 1].duration = dur[i % dur.length];
    i++;
  }
  for (const s of suites) {
    r.startTest(`slow scenario ${s}`, { suite: s });
    r.endTest('passed');
    const list = r.buckets.get(s);
    list[list.length - 1].duration = dur[(i + 2) % dur.length] * 3;
    i++;
  }

  // 3 timeouts with IDENTICAL selectors so they collapse into ONE cluster.
  for (const _ of [0, 1, 2]) {
    r.startTest(`timeout scenario ${_}`, { suite: 'Timeouts' });
    r.endTest('failed', { error: new Error('Timeout of 30000ms exceeded waiting for selector "#login"') });
  }
  r.startTest('d', { suite: 'Assertions' });
  r.endTest('failed', { error: new Error('Expected 200 but got 500') });
  await r.finish();
}

(async () => {
  console.log('▶  Run 1…');
  await run('Run 1');
  const midHist = fs.existsSync(path.join(OUT, HISTORY_FILE))
    ? JSON.parse(fs.readFileSync(path.join(OUT, HISTORY_FILE), 'utf8'))
    : null;
  console.log('   history after run 1:', midHist ? `${midHist.length} entries` : 'FILE MISSING');
  console.log('▶  Run 2…');
  await run('Run 2');

  await runWithClusters();
  const clusterHtml = fs.readFileSync(path.join(OUT, 'clusters', 'qapulse-report.html'), 'utf8');

  // Generate one report per theme so you can eyeball all 7
  const ALL_THEMES = [
    'qapulse-dark',
    'qapulse-light',
    'github-dark',
    'github-light',
    'dracula',
    'solarized-light',
    'minimal',
  ];
  for (const t of ALL_THEMES) {
    const r = new QAPulsePuppeteerReporter({
      outputDir: path.join(OUT, 'themes', t),
      reportTitle: `Theme: ${t}`,
      theme: { name: t },
    });
    r.startTest('passing test', { suite: 'Demo' });
    r.endTest('passed');
    r.startTest('failing test', { suite: 'Demo' });
    r.endTest('failed', {
      error: new Error('demo failure'),
      screenshotPath: shotPath,
    });
    await r.finish();
  }
  console.log(`   generated ${ALL_THEMES.length} themed reports in .smoke-out/themes/`);

  const reportPath = path.join(OUT, 'qapulse-report.html');
  const historyPath = path.join(OUT, HISTORY_FILE);

  const checks = [];
  function check(name, ok, detail = '') {
    checks.push({ name, ok, detail });
  }

  check('HTML report was created', fs.existsSync(reportPath), reportPath);
  check('History JSON was created', fs.existsSync(historyPath), historyPath);

  const html = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : '';
  check('HTML contains failure screenshot (base64 inlined)', html.includes('data:image/png;base64,'));
  check('HTML contains lightbox script (qpLightbox)', html.includes('function qpLightbox'));
  check('HTML contains shots-gallery CSS class', html.includes('shots-gallery'));
  check('HTML contains failed test title', html.includes('login fails with wrong password'));
  check('HTML contains Puppeteer framework badge', html.toUpperCase().includes('PUPPETEER'));
  check('HTML contains trend chart canvas', html.includes('id="trendChart"'));
  check('HTML contains sparkline SVG (needs >=2 runs)', html.includes('class="sparkline"'));

  const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : [];
  check('History contains 2 runs after 2 executions', history.length === 2, `got ${history.length}`);
  check('Each run reports 1 failed / 2 passed', history.every(h => h.failed === 1 && h.passed === 2));

  // Report screenshot dir shouldn't exist (small PNG inlined, not copied)
  const shotsDir = path.join(OUT, 'screenshots');
  check('Small PNG was inlined (not copied to screenshots/)', !fs.existsSync(shotsDir));

  // Theme checks — verify color tokens actually landed in the HTML
  const themedHtml = fs.readFileSync(path.join(OUT, 'themes', 'dracula', 'qapulse-report.html'), 'utf8');
  const lightHtml = fs.readFileSync(path.join(OUT, 'themes', 'qapulse-light', 'qapulse-report.html'), 'utf8');
  const ghDarkHtml = fs.readFileSync(path.join(OUT, 'themes', 'github-dark', 'qapulse-report.html'), 'utf8');
  check('Dracula theme: bg #282a36', themedHtml.includes('#282a36'));
  check('Dracula theme: purple #bd93f9', themedHtml.includes('#bd93f9'));
  check('qapulse-light theme: bg #fbf9f4', lightHtml.includes('#fbf9f4'));
  check('github-dark theme: bg #0d1117', ghDarkHtml.includes('#0d1117'));
  check('Default report is qapulse-dark (#0d0f12)', html.includes('#0d0f12'));
  check('Clustering: report contains cluster section', clusterHtml.includes('Failure clusters'));
  check('Clustering: 3 timeouts collapsed to ×3 badge', clusterHtml.includes('×3'));
  check('Clustering: 2 distinct clusters (timeouts + assertion)', (clusterHtml.match(/class="cluster-card"/g) || []).length === 2);
  check('Insights: suite matrix present', clusterHtml.includes('Suite health'));
  check('Insights: duration histogram present', clusterHtml.includes('Duration distribution'));
  check('Insights: top slowest present', clusterHtml.includes('slowest tests'));
  check('Insights: timeline present', clusterHtml.includes('Execution timeline'));

  // v2.2 diff + metadata + JSON export
  const jsonPath = path.join(OUT, 'qapulse-report.json');
  check('JSON export written alongside HTML', fs.existsSync(jsonPath));
  if (fs.existsSync(jsonPath)) {
    const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    check('JSON export contains stats', typeof j.stats?.passRate === 'number');
    check('JSON export contains clusters array', Array.isArray(j.clusters));
    check('JSON export contains failureStates array', Array.isArray(j.failureStates));
  }

  check('Diff banner rendered on run 2', html.includes('vs previous run'));
  check('Failure-state badge rendered', html.includes('fs-rec') || html.includes('fs-new') || html.includes('fs-reg'));
  const hasGitMeta = html.includes('meta-bar');
  check('Metadata bar rendered (git detected)', hasGitMeta, hasGitMeta ? 'yes' : 'no env');

  console.log('');
  const pad = 55;
  let failed = 0;
  for (const c of checks) {
    const icon = c.ok ? '✅' : '❌';
    console.log(`${icon}  ${c.name.padEnd(pad)} ${c.detail}`);
    if (!c.ok) failed++;
  }
  console.log('');

  // Clean the fabricated screenshot
  try { fs.unlinkSync(shotPath); } catch { /* ignore */ }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed.`);
    console.error(`Inspect report: open ${reportPath}`);
    process.exit(1);
  }

  console.log(`✅ All ${checks.length} checks passed.`);
  console.log(`   Open the report to visually inspect: open ${reportPath}`);
})().catch(err => {
  console.error('Smoke test threw:', err);
  process.exit(1);
});
