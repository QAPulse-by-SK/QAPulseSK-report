# Release Notes

## v2.3.0 — 2026-07-12

Webhooks that actually help.

- **Rich Slack / Teams / Discord payloads**: framework badge, pass rate, git branch + commit + message, `+N new / −N recovered / N still failing` vs previous run, top 3 failure clusters, top failed test titles, clickable **📊 View report** / **🔀 PR** / **⚙️ CI job** buttons.
- **Discord** support added (`config.webhooks.discord = <url>`).
- **`reportUrl`** config field turns into the primary "View report" button in every card.
- **`mentionOnRegression`** pings a Slack user or group id when there are new failures and none recovered.
- **`maxFailedInCard`** caps the failed-titles list (default 5).
- **Live-fire smoke test** — `npm run smoke:webhooks` provisions a webhook.site inbox, sends real requests to all three platforms, verifies payload structure.

Legacy `webhooks.custom` templates still work.

## v2.2.0 — 2026-07-12

Failure triage.

- **🧩 Failure clustering** — local error-signature bucketing normalizes timestamps, UUIDs, hex, paths, and integers before hashing. Similar failures collapse into a single card with a `×N` count. When AI is enabled, analysis runs once per cluster instead of once per test — token spend drops in proportion to dedup ratio.
- **🔍 Insights section** with 4 zero-dep SVG cards:
  - Suite health matrix (heatmap of per-suite pass rate)
  - Duration distribution histogram
  - Top 10 slowest tests
  - Per-suite execution timeline
- **Diff vs previous run** banner: `+N new · −N recovered · N still failing`.
- **Failure-state badges** on every failing test row: 🆕 new / 💥 regression / 🔁 recurring (×N). Computed by comparing per-test outcomes across the persisted history.
- **Auto git + CI metadata bar** at the top of the report: branch, short commit, commit message, author, PR link, CI job link. Detects **GitHub Actions**, **GitLab CI**, **CircleCI**, **Jenkins**, **Bitbucket Pipelines**, and a generic `CI=true` fallback. Disable with `disableAutoMetadata: true`.
- **JSON export** — `qapulse-report.json` alongside the HTML, containing the full normalized `TestRun`, clusters, diff, and failure states. Disable with `emitJson: false`.
- **Sparkline** in the pass-rate card (theme-colored SVG).
- Fix: `HistoryManager.save()` now creates the output directory if it doesn't exist yet — previously the first run's history was silently dropped.

Public exports: `clusterFailures`, `signatureFor`, `clusterIdFor`, `detectMetadata`, `mergeMetadata`, `classifyFailures`, `computeDiff`, `buildOutcomes`, `RunMetadata`, `FailureCluster`, `RunDiff`, `FailureState`, `HistoryEntry`.

## v2.1.0 — 2026-07-11

- **7 built-in themes** with CSS-var registry: `qapulse-dark` (default), `qapulse-light`, `github-dark`, `github-light`, `dracula`, `solarized-light`, `minimal`. Choose with `theme: { name: '...' }`. Trend chart colors follow the theme.
- Legacy overrides (`primaryColor`, `backgroundColor`, `cardColor`) still work and win over the preset.
- Public: `listThemes`, `resolveTheme`, `DEFAULT_THEME`, `ThemeName`, `ThemeVars`.

## v2.0.0 — 2026-07-11

Biggest release since launch.

- **Screenshots on failure across all 7 runners** with a click-to-zoom lightbox. Zero-dep collector inlines images ≤200 KB as base64 data URIs so the report stays a single portable file; larger images copy to `<outputDir>/screenshots/`.
  - Playwright: reads `result.attachments[]` natively.
  - Cypress: reads `run.screenshots[]` keyed by `testId` natively.
  - Jest / Vitest / Puppeteer / Selenium / WebdriverIO: one-line `attachScreenshot(fullTestName, path)` in a hook.
- **3 new runners** — Puppeteer, Selenium, WebdriverIO. Total: 4 → 7.
  - Puppeteer + Selenium: imperative `startTest / endTest / finish` API since they have no test runner of their own.
  - WebdriverIO: native `Reporter` contract, drops into `wdio.conf` `reporters: []`.
- **Shared orchestrator refactor** — extracted the duplicated AI → history → HTML → webhooks pipeline out of every adapter. Adapters are now pure runner→`TestRun` mappers.
- Public exports: `generateReport`, `withDefaults`, `attachScreenshot`, `collectScreenshots`, `makeScreenshot`, `Screenshot`, `ScreenshotConfig`.
- `SupportedFramework` now includes `puppeteer`, `selenium`, `webdriverio`.

No breaking changes for existing Playwright / Cypress / Jest / Vitest users.

Peer deps (all optional): `puppeteer >= 20.0.0`, `selenium-webdriver >= 4.0.0`, `webdriverio >= 8.0.0`.

## v1.0.6 — previous stable

Playwright, Cypress, Jest, Vitest. Dark-theme HTML, opt-in AI failure analysis (Anthropic / OpenAI / Gemini), Slack + Teams webhooks, trend chart across the last N runs.
