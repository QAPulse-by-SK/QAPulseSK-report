# QAPulseSK-report

[![npm version](https://img.shields.io/npm/v/qapulsesk-report?style=for-the-badge&color=a78bfa)](https://www.npmjs.com/package/qapulsesk-report)
[![npm downloads](https://img.shields.io/npm/dm/qapulsesk-report?style=for-the-badge&color=22c55e)](https://www.npmjs.com/package/qapulsesk-report)
[![License: MIT](https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-22c55e?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![QAPulse by SK](https://img.shields.io/badge/QAPulse%20by%20SK-Test%20Automation%20Hub-3b82f6?style=for-the-badge)](https://skakarh.com)

> **The only test reporter you'll ever need.**
> Playwright · Cypress · Jest · Vitest — one package, zero config, beautiful results.

![qapulsesk-report demo](https://raw.githubusercontent.com/QAPulse-by-SK/QAPulseSK-report/main/assets/qapulse-report-final.gif)

---

## ✨ Why QAPulseSK-report?

Most teams install 4–5 separate reporter packages — one per framework, one for Slack, one for AI, one for trends. We ship everything in one.

| Feature | QAPulseSK-report | Others |
|---|---|---|
| Playwright support | ✅ | ✅ |
| Cypress support | ✅ | Separate package |
| Jest support | ✅ | Separate package |
| Vitest support | ✅ | Separate package |
| Beautiful dark-theme HTML | ✅ | Basic / ugly |
| AI failure analysis | ✅ Opt-in, your key | ❌ |
| Slack + Teams webhooks | ✅ Built-in | ❌ |
| Trend charts | ✅ Built-in | Paid |
| Zero cost to use | ✅ Always | Often paid |

---

## 🚀 Install

```bash
npm install qapulsesk-report --save-dev
```

---

## 📖 Usage

### Playwright

> ⚠️ **Important:** Point directly to the Playwright adapter file, not the package root.
> This is required because Playwright expects a reporter to export a single class.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  reporter: [
    ['list'],
    [
      // Point to the adapter directly
      path.resolve(__dirname, 'node_modules/qapulsesk-report/dist/adapters/playwright.js'),
      {
        outputDir:           'qapulse-report',
        reportTitle:         'My E2E Tests',
        openAfterGeneration: false,

        // 📊 Trend charts across runs
        history: { enabled: true },

        // 🤖 AI failure analysis — optional, your key, zero cost to us
        // ai: {
        //   enabled: true,
        //   apiKey: process.env.ANTHROPIC_API_KEY,
        // },

        // 🔔 Slack / Teams notifications — optional
        // webhooks: {
        //   slack: { url: process.env.SLACK_WEBHOOK_URL },
        //   onlyOnFail: true,
        // },
      }
    ],
  ],
});
```

### Cypress

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  reporter: 'node_modules/qapulsesk-report/dist/adapters/cypress.js',
  reporterOptions: {
    outputDir:   'qapulse-report',
    reportTitle: 'My Cypress Tests',
    history: { enabled: true },
  },
  e2e: {
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

---

## 📊 What The Report Shows

After every test run `qapulse-report/qapulse-report.html` contains:

- **Pass rate ring** — visual percentage at a glance
- **Stats bar** — passed / failed / skipped / duration
- **Trend chart** — pass rate history across multiple runs
- **Failed tests section** — expandable rows with full error messages
- **All suites** — expandable list of every suite and test
- **AI failure analysis** — plain-English explanation of why tests failed *(optional)*
- **QA Pulse by SK branding** footer

---

## 🤖 AI Failure Analysis *(Optional)*

Unlock AI-powered failure summaries by adding your own API key. **We never call any AI service by default — zero cost, zero data sent.**

```typescript
[
  path.resolve(__dirname, 'node_modules/qapulsesk-report/dist/adapters/playwright.js'),
  {
    outputDir:   'qapulse-report',
    reportTitle: 'My Tests',
    ai: {
      enabled: true,
      apiKey:  process.env.ANTHROPIC_API_KEY, // your key, your cost
    }
  }
]
```

For each failed test you get:
- **Summary** — plain English explanation of what went wrong
- **Root cause** — what actually caused the failure
- **Suggestion** — concrete fix recommendation
- **Confidence** — high / medium / low

### Getting an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / log in → API Keys → Create Key
3. Add to your `.env` file: `ANTHROPIC_API_KEY=sk-ant-...`

---

## 🔔 Slack / Teams Webhooks

```typescript
webhooks: {
  slack: {
    url:        process.env.SLACK_WEBHOOK_URL,
    onlyOnFail: true,  // only notify when tests fail
  },
  teams: {
    url:        process.env.TEAMS_WEBHOOK_URL,
    onlyOnFail: false,
  }
}
```

**On pass:**
```
✅ QA Pulse — Tests Passed
101 passed · 0 failed · 2 skipped · 1m 24s
```

**On fail:**
```
❌ QA Pulse — Tests Failed
98 passed · 3 failed · 2 skipped · 1m 31s
Failed: login test, checkout flow, payment validation
```

---

## 📈 Trend Charts

Enable history to see pass rate across your last N runs:

```typescript
history: {
  enabled:     true,
  maxRuns:     20,                          // default: 20
  historyFile: '.qapulse-history.json'      // auto-created
}
```

Run your tests multiple times → the trend chart builds automatically.

---

## ⚙️ Full Config Reference

```typescript
{
  outputDir?:           string;   // default: 'qapulse-report'
  reportTitle?:         string;   // default: 'QAPulseSK Test Report'
  openAfterGeneration?: boolean;  // default: false
  logo?:                string;   // path to custom logo image

  ai?: {
    enabled:               boolean;
    apiKey?:               string;
    model?:                string;  // default: claude-3-haiku-20240307
    maxFailuresToAnalyze?: number;  // default: 10
  };

  webhooks?: {
    slack?: { url: string; onlyOnFail?: boolean };
    teams?: { url: string; onlyOnFail?: boolean };
  };

  history?: {
    enabled:      boolean;
    historyFile?: string;  // default: .qapulse-history.json
    maxRuns?:     number;  // default: 20
  };
}
```

---

## 🧪 See It In Action

The `with-packages` branch of the Playwright boilerplate has `qapulsesk-report` wired as a reporter with a dedicated demo spec:

```bash
git clone -b with-packages https://github.com/QAPulse-by-SK/playwright-boilerplate.git
cd playwright-boilerplate && npm install && npx playwright install

# Run the report demo — generates a realistic pass/fail/skip mix
npx playwright test tests/packages/report.demo.spec.ts --project=chromium

# Open the generated report
open qapulse-report/qapulse-report.html
```

**What the demo test file covers:**

| Suite | Tests | Purpose |
|---|---|---|
| E2E — the-internet | 8 (7 pass, 1 intentional fail) | Shows failed test row in report |
| API — jsonplaceholder | 5 pass | Shows API test suite |
| Performance | 3 pass | Shows timing data |
| Skipped | 2 skip | Shows skipped count in stats |

**Total: 15 passing · 1 intentional fail · 2 skipped**
The intentional failure is designed to showcase how the report displays error details — click the failed row in the report to see the full error message.

**Live demo report:** [qapulse-report-sk.surge.sh](https://qapulse-report-sk.surge.sh)

| File | Tests | What it tests |
|---|---|---|
| [report.demo.spec.ts](https://github.com/QAPulse-by-SK/playwright-boilerplate/blob/with-packages/tests/packages/report.demo.spec.ts) | 18 | Realistic mix for report showcase |
| [playwright.config.ts](https://github.com/QAPulse-by-SK/playwright-boilerplate/blob/with-packages/playwright.config.ts) | — | How reporter is wired |

---

## 📋 Changelog

### v1.0.5
- Fixed Playwright adapter — `suite.tests` and `tc.titlePath` are properties not functions
- Moved suite mapping to `onEnd()` so all test results are populated before generating report
- Report now correctly shows passed / failed / skipped counts

### v1.0.3
- Initial release with Playwright, Cypress, Jest, Vitest adapters
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

---

MIT © [QA Pulse by SK](https://www.skakarh.com)

*Created by QA Pulse by SK · skakarh.com*
