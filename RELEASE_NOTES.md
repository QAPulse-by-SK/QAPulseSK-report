# Release Notes

## v2.0.0 — 2026-07-11

Biggest release since launch. Three new runners, screenshots on failure across all of them, and a full internal refactor.

### 🆕 New runners (4 → 7)

Puppeteer, Selenium, and WebdriverIO joined Playwright, Cypress, Jest, and Vitest.

- **`qapulsesk-report/puppeteer`** — `QAPulsePuppeteerReporter`. Puppeteer has no runner of its own, so the reporter exposes a small imperative API: `startTest()`, `endTest(status, { error, screenshotPath })`, `finish()`. Pass a screenshot path when a test fails and it lands in the report.
- **`qapulsesk-report/selenium`** — `QAPulseSeleniumReporter`. Same imperative API as Puppeteer. Works with `selenium-webdriver` Node bindings. `driver.takeScreenshot()` returns base64 — write it to disk and pass the path.
- **`qapulsesk-report/webdriverio`** — `QAPulseWebdriverIOReporter`. Native WDIO Reporter contract (`onSuiteStart`, `onTestEnd`, `onRunnerEnd`). Drop it into `reporters: []` in `wdio.conf.ts`.

### 📷 Screenshots on failure — all 7 runners

The single biggest DX upgrade in this release. Failed tests now show a screenshot gallery inline, with a click-to-zoom lightbox (ESC to close).

- **Playwright** — zero config. Reads `result.attachments[]` from the runner. Already produced by `use: { screenshot: 'only-on-failure' }`.
- **Cypress** — zero config. Reads `run.screenshots[]` keyed by `testId`. Already produced by Cypress on failure by default.
- **Jest / Vitest / Puppeteer / Selenium / WebdriverIO** — one-liner via the new `attachScreenshot(fullTestName, path)` helper. Puppeteer and Selenium can also pass `screenshotPath` directly into `endTest()`.

Under the hood: a zero-dep collector inlines images ≤ 200 KB as base64 data URIs (so the report stays a single portable HTML file) and copies larger ones into `<outputDir>/screenshots/` with sanitized filenames. Threshold is configurable via `screenshots.inlineThresholdKb`.

New config surface:

```ts
screenshots: {
  enabled: true,            // default
  onFailure: true,          // default
  onPass: false,            // default
  inlineThresholdKb: 200,   // default
  outputSubdir: 'screenshots', // default
}
```

### 🧱 Internal refactor — shared orchestrator

Every adapter used to carry its own duplicated `_generate()` pipeline (AI → history → HTML → webhooks → open). That's now `src/core/orchestrator.ts`. Adapters are pure runner-to-`TestRun` mappers; adding a new runner is now ~80 lines instead of ~150.

If you were importing internals directly, note the new exports: `generateReport`, `withDefaults`, `attachScreenshot`, `collectScreenshots`, `makeScreenshot`.

### 🔤 New types (public)

- `Screenshot` — sourcePath, kind (`onFailure | onEnd | manual | step`), relativePath, inlineDataUri
- `ScreenshotConfig` — as documented above
- `TestResult.screenshots?: Screenshot[]`
- `SupportedFramework` extended with `puppeteer`, `selenium`, `webdriverio`

### 💥 Breaking changes

None for existing Playwright, Cypress, Jest, or Vitest users. Config is additive, existing adapters keep the same class names and signatures. Version bumped to 2.0.0 because runner surface area changed and new subpath exports were added.

### 📦 Install / upgrade

```bash
npm i qapulsesk-report@latest --save-dev
```

Peer deps for the new runners (all optional):

```
puppeteer          >= 20.0.0
selenium-webdriver >= 4.0.0
webdriverio        >= 8.0.0
```

### 🗺️ What's next (Phase 1 remaining)

- Multiple themes (default dark, light, github, dracula, solarized, minimal)
- Pass rate sparkline in the stat card (trend chart already exists as a full section)
- AI failure clustering — group similar failures, one suggested fix per cluster

---

## v1.0.6 — previous stable

Playwright, Cypress, Jest, Vitest. Dark-theme HTML, opt-in AI failure analysis (Anthropic / OpenAI / Gemini), Slack + Teams webhooks, trend chart across the last N runs.
