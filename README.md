# QAPulseSK-report

[![npm version](https://img.shields.io/npm/v/qapulsesk-report?style=for-the-badge&color=a78bfa)](https://www.npmjs.com/package/qapulsesk-report)
[![npm downloads](https://img.shields.io/npm/dm/qapulsesk-report?style=for-the-badge&color=22c55e)](https://www.npmjs.com/package/qapulsesk-report)
[![License: MIT](https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-22c55e?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![QAPulse by SK](https://img.shields.io/badge/QAPulse%20by%20SK-Test%20Automation%20Hub-3b82f6?style=for-the-badge)](https://skakarh.com)

> **The only test reporter you'll ever need.**
> Playwright · Cypress · Jest · Vitest · Puppeteer · Selenium · WebdriverIO — one package, zero config, beautiful results.

![qapulsesk-report demo](https://raw.githubusercontent.com/QAPulse-by-SK/QAPulseSK-report/main/assets/qapulse-report-final.gif)

---

## ✨ Why QAPulseSK-report?

Most teams install 4–5 separate reporter packages — one per framework, one for Slack, one for AI, one for trends. We ship everything in one.

| Feature | QAPulseSK-report | Others |
|---|---|---|
| 7 test runners in one package | ✅ | ❌ 1 per package |
| Screenshots on failure (all runners) | ✅ | Partial |
| Failure clustering (dedup similar errors) | ✅ | ❌ |
| 7 built-in themes | ✅ | ❌ |
| Trend + sparkline + histogram + timeline | ✅ | Paid |
| Diff vs previous run + failure state badges | ✅ | ❌ |
| Auto git/CI metadata (branch, commit, PR link) | ✅ | ❌ |
| AI failure analysis | ✅ Opt-in, your key | ❌ |
| Slack + Teams + Discord webhooks | ✅ Built-in, rich | Basic |
| JSON export | ✅ | ❌ |
| Zero cost to use | ✅ Always | Often paid |

---

## 🚀 Install

```bash
npm install qapulsesk-report --save-dev
```

Node 18+ required.

---

## 📖 Quick Start — Per Runner

### Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  use: { screenshot: 'only-on-failure' },   // <- enables screenshot capture
  reporter: [
    ['list'],
    [
      path.resolve(__dirname, 'node_modules/qapulsesk-report/dist/adapters/playwright.js'),
      {
        outputDir:   'qapulse-report',
        reportTitle: 'My E2E Tests',
        history:     { enabled: true },
      }
    ],
  ],
});
```

Playwright screenshots ship natively — no extra hooks needed.

### Cypress

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  reporter: 'node_modules/qapulsesk-report/dist/adapters/cypress.js',
  reporterOptions: {
    outputDir:   'qapulse-report',
    reportTitle: 'My Cypress Tests',
    history:     { enabled: true },
  },
  e2e: {
    screenshotOnRunFailure: true,   // <- default true, keep it on
    setupNodeEvents(on, config) { return config; }
  }
});
```

### Jest

```javascript
// jest.config.js
module.exports = {
  reporters: [
    'default',
    ['qapulsesk-report/jest', {
      outputDir:   'qapulse-report',
      reportTitle: 'My Jest Tests',
      history:     { enabled: true },
    }],
  ],
};
```

For screenshots (Jest + Puppeteer):

```javascript
// jest.setup.js
const { attachScreenshot } = require('qapulsesk-report');

afterEach(async () => {
  const state = expect.getState();
  if (state.assertionCalls > 0 && state.numPassingAsserts < state.assertionCalls) {
    const p = `/tmp/${Date.now()}.png`;
    await page.screenshot({ path: p });
    attachScreenshot(state.currentTestName, p);
  }
});
```

### Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { QAPulseVitestReporter } from 'qapulsesk-report/vitest';

export default defineConfig({
  test: {
    reporters: [
      'verbose',
      new QAPulseVitestReporter({
        outputDir:   'qapulse-report',
        reportTitle: 'My Vitest Tests',
        history:     { enabled: true },
      }),
    ],
  },
});
```

Screenshots via `attachScreenshot` (same as Jest above).

### Puppeteer *(standalone, no runner)*

```typescript
import puppeteer from 'puppeteer';
import { QAPulsePuppeteerReporter } from 'qapulsesk-report/puppeteer';

const reporter = new QAPulsePuppeteerReporter({
  outputDir:   'qapulse-report',
  reportTitle: 'Smoke Suite',
  history:     { enabled: true },
});

const browser = await puppeteer.launch();
const page = await browser.newPage();

reporter.startTest('Home page loads', { suite: 'Public' });
try {
  await page.goto('https://example.com');
  await page.waitForSelector('h1');
  reporter.endTest('passed');
} catch (err) {
  const shot = `/tmp/${Date.now()}.png`;
  await page.screenshot({ path: shot });
  reporter.endTest('failed', { error: err, screenshotPath: shot });
}

await browser.close();
await reporter.finish();
```

### Selenium *(standalone)*

```typescript
import { Builder } from 'selenium-webdriver';
import { QAPulseSeleniumReporter } from 'qapulsesk-report/selenium';
import * as fs from 'fs';

const reporter = new QAPulseSeleniumReporter({ reportTitle: 'Selenium Suite' });
const driver = await new Builder().forBrowser('chrome').build();

reporter.startTest('Login works', { suite: 'Auth' });
try {
  await driver.get('https://example.com/login');
  reporter.endTest('passed');
} catch (err) {
  const shot = await driver.takeScreenshot();
  const p = `/tmp/${Date.now()}.png`;
  fs.writeFileSync(p, shot, 'base64');
  reporter.endTest('failed', { error: err, screenshotPath: p });
}

await driver.quit();
await reporter.finish();
```

### WebdriverIO

```typescript
// wdio.conf.ts
import QAPulseWDIOReporter from 'qapulsesk-report/webdriverio';

export const config = {
  reporters: [
    [QAPulseWDIOReporter, {
      outputDir:   'qapulse-report',
      reportTitle: 'WDIO Suite',
      history:     { enabled: true },
    }],
  ],
};
```

For screenshots, add an `afterTest` hook that calls `attachScreenshot(test.fullTitle, path)`.

---

## 📊 What the Report Shows

Every report is a **single portable HTML file** with:

- **Metadata bar** — auto-detected git branch, commit, author, PR link, CI job link
- **Diff banner** — `+N new · −N recovered · N still failing` vs the previous run
- **Pass rate ring + sparkline** — at-a-glance status and trajectory across runs
- **Stats cards** — passed / failed / skipped / duration / total
- **🧩 Failure clusters** — similar errors grouped by normalized signature
- **🔍 Insights**
  - Suite health matrix (heatmap of per-suite pass rate)
  - Duration distribution histogram
  - Top 10 slowest tests
  - Per-suite execution timeline (colored strip)
- **📈 Trend chart** — pass rate + passed/failed counts over your last N runs
- **❌ Failed tests** — expandable rows with error, stack, screenshots, AI analysis, and failure-state badge (🆕 new / 💥 regression / 🔁 recurring)
- **🧪 All test suites** — every test with its status

Plus a companion `qapulse-report.json` for downstream tools.

---

## 🎨 Themes

Seven built-in presets — set with a single line:

```typescript
theme: { name: 'dracula' }
```

| Name | Look |
|---|---|
| `qapulse-dark` *(default)* | Deep blue-black, blue accent |
| `qapulse-light` | Warm off-white, blue accent |
| `github-dark` | GitHub UI dark palette |
| `github-light` | GitHub UI light palette |
| `dracula` | Dracula editor theme |
| `solarized-light` | Solarized parchment |
| `minimal` | Pure monochrome |

Override any color inline:

```typescript
theme: { name: 'qapulse-dark', primaryColor: '#00ffcc' }
```

---

## 📷 Screenshots on Failure

Handled per runner:

| Runner | How screenshots arrive |
|---|---|
| Playwright | Native — reads `result.attachments[]` |
| Cypress | Native — reads `run.screenshots[]` by `testId` |
| WebdriverIO | Via `attachScreenshot()` in `afterTest` hook |
| Puppeteer | Pass `screenshotPath` to `endTest()` |
| Selenium | Same as Puppeteer |
| Jest / Vitest | Via `attachScreenshot()` in `afterEach` |

The collector inlines small images (≤200 KB by default) as base64 data URIs so the report stays a single portable file. Larger images are copied to `<outputDir>/screenshots/`. Click any thumbnail for a full-screen lightbox (ESC to close).

Config:

```typescript
screenshots: {
  enabled:            true,   // default
  onFailure:          true,   // default
  onPass:             false,  // default
  inlineThresholdKb:  200,    // default
  outputSubdir:       'screenshots',
}
```

---

## 🧩 Failure Clustering

Failures with similar normalized error signatures collapse into a single card with a `×N` badge. Under the hood:

- Timestamps, UUIDs, hex, absolute paths, and integers are normalized out of the message + top stack frame
- Failed tests are bucketed by signature
- When AI is enabled, analysis runs once per **cluster** (representative test), not once per test — massive token savings

Example: three timeout tests with different test names but the same error string produce one `×3` cluster with a single AI-generated root cause + fix.

---

## 🤖 AI Failure Analysis *(optional)*

**We never call any AI service by default.** Bring your own key.

```typescript
ai: {
  enabled: true,
  provider: 'anthropic',                        // or 'openai' | 'gemini'
  apiKey:   process.env.ANTHROPIC_API_KEY,
  model:    'claude-3-5-haiku-20241022',        // provider default used if omitted
  maxFailuresToAnalyze: 10,
}
```

Per cluster you get:
- **Summary** — plain English
- **Root cause** — what actually caused it
- **Suggestion** — concrete fix
- **Confidence** — high / medium / low

Getting a key:
- [Anthropic](https://console.anthropic.com) → API keys → Create → `ANTHROPIC_API_KEY=sk-ant-...`
- [OpenAI](https://platform.openai.com/api-keys) → `OPENAI_API_KEY=...`
- [Google Gemini](https://aistudio.google.com/apikey) → `GEMINI_API_KEY=...`

---

## 🔔 Slack / Teams / Discord Webhooks

All three platforms get **rich context**, not just pass/fail counts:

- Emoji + title with your `reportTitle`
- Framework, pass rate, passed/failed/skipped, duration
- Branch, commit hash, commit message *(auto-detected)*
- `+N new · −N recovered · N still failing` vs previous run
- Top 3 failure clusters with `×N` counts
- Top N failed test titles (configurable)
- Clickable buttons: **📊 View report**, **🔀 PR #123**, **⚙️ CI job**
- Optional `@mention` on regressions

```typescript
webhooks: {
  slack:   process.env.SLACK_WEBHOOK_URL,
  teams:   process.env.TEAMS_WEBHOOK_URL,
  discord: process.env.DISCORD_WEBHOOK_URL,

  reportUrl:          'https://reports.example.com/latest',
  notifyOnFailOnly:   true,
  maxFailedInCard:    5,
  mentionOnRegression: 'U0123ABC',   // Slack user or group id
}
```

**Setup, per platform:**

- **Slack** — App Directory → Incoming Webhooks → add to a channel → copy URL
- **Teams** — Channel → Connectors → Incoming Webhook → configure → copy URL
- **Discord** — Channel settings → Integrations → Webhooks → New → copy URL

---

## 📊 Cross-Run Insights

Enable history and the report gains a pass-rate sparkline, a trend line chart, failure-state badges (🆕 / 💥 / 🔁), and a diff banner comparing to the previous run.

```typescript
history: {
  enabled:     true,
  maxRuns:     20,                          // default
  historyFile: '.qapulse-history.json',     // auto-created inside outputDir
}
```

Each stored run includes per-test outcomes, so QAPulseSK-report can tell whether a currently-failing test is:
- **🆕 new** — never seen before
- **💥 regression** — passed last time, fails now
- **🔁 recurring (×N)** — failed for the last N runs in a row

---

## 🏷 Auto Git & CI Metadata

Every report auto-detects and displays:
- Git: branch, short commit, commit message, author, tag
- CI: provider, job URL, PR number + link

Detected providers: **GitHub Actions**, **GitLab CI**, **CircleCI**, **Jenkins**, **Bitbucket Pipelines**, and generic `CI=true` fallback.

Disable entirely with `disableAutoMetadata: true`, or override:

```typescript
// Attach freely — user metadata always wins over auto-detected
run.metadata = { git: { branch: 'my-override' }, custom: { anything: 'ok' } };
```

---

## 📦 JSON Export

Alongside `qapulse-report.html` you get `qapulse-report.json` with the full normalized `TestRun`, clusters, diff, and failure states. Great for:

- Consumption by other tools (SAT, dashboards, CI gates)
- Post-processing in Node/Python
- Long-term storage / analytics

Disable with `emitJson: false`.

---

## ⚙️ Full Config Reference

```typescript
{
  outputDir?:             string;     // default: 'qapulse-report'
  reportTitle?:           string;     // default: 'QAPulseSK Test Report'
  openAfterGeneration?:   boolean;    // default: false
  logo?:                  string;     // optional logo image path or URL

  theme?: {
    name?:               'qapulse-dark' | 'qapulse-light' | 'github-dark' |
                         'github-light' | 'dracula' | 'solarized-light' | 'minimal';
    primaryColor?:       string;
    backgroundColor?:    string;
    cardColor?:          string;
  };

  ai?: {
    enabled:               boolean;
    provider?:             'anthropic' | 'openai' | 'gemini';
    apiKey?:               string;
    model?:                string;
    maxFailuresToAnalyze?: number;  // default: 10
  };

  webhooks?: {
    slack?:                string;
    teams?:                string;
    discord?:              string;
    custom?:               Array<{ url: string; headers?: Record<string,string>; template?: (run) => object }>;
    notifyOnFailOnly?:     boolean;
    reportUrl?:            string;
    mentionOnRegression?:  string;
    mentionOnNewFailures?: boolean;
    maxFailedInCard?:      number;  // default: 5
  };

  history?: {
    enabled:      boolean;
    historyFile?: string;
    maxRuns?:     number;  // default: 20
  };

  screenshots?: {
    enabled?:            boolean;  // default: true
    onFailure?:          boolean;  // default: true
    onPass?:             boolean;  // default: false
    inlineThresholdKb?:  number;   // default: 200
    outputSubdir?:       string;   // default: 'screenshots'
  };

  emitJson?:             boolean;  // default: true
  disableAutoMetadata?:  boolean;  // default: false
}
```

---

## 🧪 See It In Action

The `with-packages` branch of the Playwright boilerplate wires `qapulsesk-report` and ships a dedicated demo spec:

```bash
git clone -b with-packages https://github.com/QAPulse-by-SK/playwright-boilerplate.git
cd playwright-boilerplate && npm install && npx playwright install

npx playwright test tests/packages/report.demo.spec.ts --project=chromium
open qapulse-report/qapulse-report.html
```

**Live demo report:** [qapulse-report-sk.surge.sh](https://qapulse-report-sk.surge.sh)

---

## 📋 Changelog

### v2.3.0
- Rich Slack / Teams / **Discord** webhooks: failed test list, cluster summary, diff vs previous run, git/PR link, "View report" button, optional @-mention on regressions
- `reportUrl` config for clickable button in cards
- Live-fire webhook smoke test (`npm run smoke:webhooks`)

### v2.2.0
- **🧩 Failure clustering** — local error-signature bucketing; AI runs once per cluster instead of per test
- **🔍 Insights section** — suite health matrix, duration histogram, top 10 slowest, per-suite execution timeline (all zero-dep SVG)
- **Diff vs previous run** — `+N new / −N recovered / N still failing` banner
- **Failure-state badges** — 🆕 new / 💥 regression / 🔁 recurring (×N) per failing test
- **Auto git/CI metadata bar** — branch, commit, author, PR + job links; supports GitHub Actions / GitLab / CircleCI / Jenkins / Bitbucket
- **JSON export** — `qapulse-report.json` alongside HTML
- **Sparkline** in pass-rate card
- Fix: history save now ensures output dir exists

### v2.1.0
- **7 built-in themes** — qapulse-dark, qapulse-light, github-dark, github-light, dracula, solarized-light, minimal
- Legacy color overrides still work

### v2.0.0
- **Screenshots on failure** across all runners (inline base64 ≤200 KB, else copied) with click-to-zoom lightbox
- **3 new runners**: Puppeteer, Selenium, WebdriverIO — 4 → 7
- New `attachScreenshot(fullTestName, path)` registry for runner-agnostic capture
- Extracted shared `orchestrator` from adapter pipelines

### v1.0.x
- Initial releases: Playwright, Cypress, Jest, Vitest adapters
- Dark-theme HTML report
- Slack / Teams webhooks
- AI failure analysis
- Trend history

---

## 🔗 Related Packages

| Package | Description |
|---------|-------------|
| [qapulsesk-assert](https://www.npmjs.com/package/qapulsesk-assert) | Fuzzy assertions, schema validation, AI-powered checks |
| [qapulsesk-gen](https://www.npmjs.com/package/qapulsesk-gen) | HAR → tests, recordings → tests, plain English → tests |
| [qapulsesk-healer](https://www.npmjs.com/package/qapulsesk-healer) | Self-healing locators for Playwright/Selenium |

---

MIT © [QA Pulse by SK](https://www.skakarh.com)

*Created by QA Pulse by SK · skakarh.com*

---

## 🌐 More from QA Pulse by SK

| | |
|---|---|
| 🌐 **Website** | [www.skakarh.com](https://www.skakarh.com) |
| 📦 **All Open Source Products** | [skakarh.com/products](https://www.skakarh.com/products/) |
| ✍️ **QA Automation Blog** | [skakarh.com/blog](https://www.skakarh.com/blog/) |
| 🛠️ **QA Consulting Services** | [skakarh.com/services](https://www.skakarh.com/services/) |
| 🏢 **GitHub Organisation** | [github.com/QAPulse-by-SK](https://github.com/QAPulse-by-SK) |
| 🎭 **Playwright Boilerplate** | [github.com/QAPulse-by-SK/playwright-boilerplate](https://github.com/QAPulse-by-SK/playwright-boilerplate) |
| 🌲 **Cypress Boilerplate** | [github.com/QAPulse-by-SK/cypress-boilerplate](https://github.com/QAPulse-by-SK/cypress-boilerplate) |
| 🐍 **Selenium Boilerplate** | [github.com/QAPulse-by-SK/selenium-boilerplate](https://github.com/QAPulse-by-SK/selenium-boilerplate) |
| 📦 **qapulsesk-assert** | [npmjs.com/package/qapulsesk-assert](https://www.npmjs.com/package/qapulsesk-assert) |
| 🤖 **qapulsesk-gen** | [npmjs.com/package/qapulsesk-gen](https://www.npmjs.com/package/qapulsesk-gen) |
