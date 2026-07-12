// Live-fire webhook test for v2.3.
// Uses webhook.site to receive the actual POST and verify payload structure.
//
// Run: node scripts/smoke-webhooks.js
//
// Skips gracefully if webhook.site is unreachable (no network in CI, etc).

const https = require('https');

async function httpJson(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        timeout: 10000,
      },
      res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createInbox() {
  const { status, body } = await httpJson('POST', 'https://webhook.site/token');
  if (status !== 201 && status !== 200) throw new Error(`token creation failed: ${status}`);
  return {
    id: body.uuid,
    url: `https://webhook.site/${body.uuid}`,
    apiUrl: `https://webhook.site/token/${body.uuid}/requests?sorting=newest`,
  };
}

async function fetchRequests(apiUrl) {
  // Small delay to let the POST land
  await new Promise(r => setTimeout(r, 1500));
  const { body } = await httpJson('GET', apiUrl);
  return body?.data || [];
}

(async () => {
  const distExists = require('fs').existsSync(require('path').join(__dirname, '..', 'dist', 'index.js'));
  if (!distExists) {
    console.error('❌ dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  let inbox;
  try {
    inbox = await createInbox();
  } catch (err) {
    console.warn(`⚠️  webhook.site unreachable (${err.message}). Skipping live-fire test.`);
    process.exit(0);
  }
  console.log(`▶  webhook.site inbox: ${inbox.url}`);

  const { QAPulsePuppeteerReporter } = require('..');
  const reporter = new QAPulsePuppeteerReporter({
    outputDir: '.smoke-webhooks-out',
    reportTitle: 'Webhook live-fire',
    webhooks: {
      slack: inbox.url,
      teams: inbox.url,
      discord: inbox.url,
      reportUrl: 'https://example.com/reports/abc123',
      maxFailedInCard: 3,
    },
    disableAutoMetadata: false,
    emitJson: false,
  });

  reporter.startTest('checkout works', { suite: 'Checkout' });
  reporter.endTest('passed');
  reporter.startTest('cart totals correct', { suite: 'Checkout' });
  reporter.endTest('failed', { error: new Error('Expected total 42 got 41') });
  reporter.startTest('coupon applies', { suite: 'Checkout' });
  reporter.endTest('failed', { error: new Error('Expected total 42 got 41') });

  await reporter.finish();

  const requests = await fetchRequests(inbox.apiUrl);
  console.log(`   received ${requests.length} webhook request(s)`);

  const checks = [];
  const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

  check('At least 3 webhook requests landed (slack + teams + discord)', requests.length >= 3);

  const bodies = requests.map(r => {
    try { return JSON.parse(r.content); } catch { return null; }
  }).filter(Boolean);

  const slack = bodies.find(b => b.attachments && b.attachments[0]?.blocks);
  const teams = bodies.find(b => b['@type'] === 'MessageCard');
  const discord = bodies.find(b => b.embeds);

  check('Slack payload received with blocks[]', !!slack);
  check('Teams payload received (MessageCard)', !!teams);
  check('Discord payload received (embeds[])', !!discord);

  if (slack) {
    const flat = JSON.stringify(slack);
    check('Slack: contains cart totals failure title', flat.includes('cart totals correct'));
    check('Slack: contains failure clusters section', flat.includes('Failure clusters'));
    check('Slack: contains "View report" button URL', flat.includes('reports/abc123'));
  }
  if (teams) {
    const flat = JSON.stringify(teams);
    check('Teams: contains Failed tests section', flat.includes('Failed tests'));
    check('Teams: contains View report action', flat.includes('View report'));
  }
  if (discord) {
    const flat = JSON.stringify(discord);
    check('Discord: contains Failed tests field', flat.includes('Failed tests'));
    check('Discord: contains View report link', flat.includes('reports/abc123'));
  }

  console.log('');
  let failed = 0;
  const pad = 55;
  for (const c of checks) {
    const icon = c.ok ? '✅' : '❌';
    console.log(`${icon}  ${c.name.padEnd(pad)} ${c.detail}`);
    if (!c.ok) failed++;
  }
  console.log('');
  console.log(`   Inspect requests: ${inbox.url}`);

  if (failed) { console.error(`\n${failed} check(s) failed.`); process.exit(1); }
  console.log(`✅ All ${checks.length} live-fire checks passed.`);
})().catch(err => { console.error('Live-fire test threw:', err); process.exit(1); });
