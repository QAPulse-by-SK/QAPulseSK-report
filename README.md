# QAPulseSK-report

[![npm version](https://img.shields.io/npm/v/qapulsesk-report?style=for-the-badge&color=3b82f6)](https://www.npmjs.com/package/qapulsesk-report)
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
# or
yarn add qapulsesk-report -D
# or
pnpm add qapulsesk-report -D
```

---

## 📖 Usage

### Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['qapulsesk-report/playwright', {
      outputDir: 'qapulse-report',
      reportTitle: 'My E2E Tests',
      openAfterGeneration: true,

      // 📊 Trend charts across runs
      history: { enabled: true },

      // 🤖 AI failure analysis — optional, your key, zero cost to us
      // ai: {
      //   enabled: true,
      //   provider: 'anthropic', // 'anthropic' | 'openai' | 'gemini'
      //   apiKey: process.env.AI_API_KEY,
      // },

      // 🔔 Slack / Teams notifications — optional
      // webhooks: {
      //   slack: process.env.SLACK_WEBHOOK_URL,
      //   notifyOnFailOnly: true,
      // },
    }],
  ],
});
```

### Cypress

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';
import { qapulseCypressPlugin } from 'qapulsesk-report/cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      qapulseCypressPlugin(on, config, {
        outputDir: 'qapulse-report',
        reportTitle: 'My Cypress Tests',
        history: { enabled: true },
      });
      return config;
    },
  },
});
```

### Jest

```javascript
// jest.config.js
module.exports = {
  reporters: [
    'default',
    ['qapulsesk-report/jest', {
      outputDir: 'qapulse-report',
      reportTitle: 'My Jest Tests',
      history: { enabled: true },
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
        outputDir: 'qapulse-report',
        reportTitle: 'My Vitest Tests',
        history: { enabled: true },
      }),
    ],
  },
});
```

---

## 🤖 AI Failure Analysis (Optional)

Unlock AI-powered failure summaries by adding your own API key. **We never call any AI service by default — zero cost, zero data sent.**

```typescript
ai: {
  enabled: true,
  provider: 'anthropic',       // 'anthropic' | 'openai' | 'gemini'
  apiKey: process.env.AI_API_KEY, // your key, your cost
  maxFailuresToAnalyze: 10,    // limit API calls per run
}
```

For each failed test you get:
- **Summary** — plain English explanation
- **Root cause** — what actually went wrong
- **Suggestion** — concrete fix
- **Confidence** — high / medium / low

---

## 🔔 Webhooks

```typescript
webhooks: {
  slack: process.env.SLACK_WEBHOOK_URL,
  teams: process.env.TEAMS_WEBHOOK_URL,
  notifyOnFailOnly: true, // only ping when tests fail
}
```

---

## 📊 Trend Charts

Enable history to see pass rate, passed, and failed counts across your last N runs:

```typescript
history: {
  enabled: true,
  maxRuns: 20,                        // default: 20
  historyFile: '.qapulse-history.json' // default
}
```

---

## ⚙️ Full Config Reference

```typescript
interface QAPulseReportConfig {
  outputDir?: string;           // default: 'qapulse-report'
  reportTitle?: string;         // default: 'QAPulseSK Test Report'
  openAfterGeneration?: boolean; // default: false
  logo?: string;                // path to your logo image
  ai?: {
    enabled: boolean;
    provider?: 'anthropic' | 'openai' | 'gemini';
    apiKey?: string;
    model?: string;             // auto-selected if omitted
    maxFailuresToAnalyze?: number; // default: 10
  };
  webhooks?: {
    slack?: string;
    teams?: string;
    notifyOnFailOnly?: boolean;
    custom?: Array<{
      url: string;
      headers?: Record<string, string>;
      template?: (run: TestRun) => object;
    }>;
  };
  history?: {
    enabled: boolean;
    historyFile?: string;
    maxRuns?: number;
  };
}
```

---

## 🗂️ Project Structure

```
QAPulseSK-report/
├── src/
│   ├── adapters/
│   │   ├── playwright.ts   # Playwright reporter
│   │   ├── cypress.ts      # Cypress plugin
│   │   ├── jest.ts         # Jest reporter
│   │   └── vitest.ts       # Vitest reporter
│   ├── core/
│   │   ├── types.ts        # All TypeScript types
│   │   ├── stats.ts        # Stats calculation
│   │   ├── generator.ts    # HTML report generator
│   │   └── history.ts      # Trend data manager
│   ├── ai/
│   │   └── analyzer.ts     # AI failure analysis
│   └── webhooks/
│       └── notifier.ts     # Slack / Teams / custom
├── examples/
│   ├── playwright/
│   ├── cypress/
│   ├── jest/
│   └── vitest/
└── dist/                   # Built output
```

---

## 🤝 Contributing

PRs are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push + open a PR

---

## 📬 Links

| | |
|---|---|
| 🌐 Website | [skakarh.com](https://skakarh.com) |
| 📦 npm | [npmjs.com/package/qapulsesk-report](https://www.npmjs.com/package/qapulsesk-report) |
| 🐛 Issues | [GitHub Issues](https://github.com/QAPulse-by-SK/QAPulseSK-report/issues) |
| 💼 LinkedIn | [company/qapulsebysk](https://linkedin.com/company/qapulsebysk) |
| 🐦 Twitter/X | [@qapulsebysk](https://twitter.com/qapulsebysk) |

---

**Built with ❤️ by [QAPulse by SK](https://skakarh.com)**

*If this saved you time, please ⭐ the repo — it helps others find it!*
