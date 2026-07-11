export { QAPulsePlaywrightReporter } from './adapters/playwright';
export { QAPulseJestReporter } from './adapters/jest';
export { QAPulseVitestReporter } from './adapters/vitest';
export { qapulseCypressPlugin } from './adapters/cypress';
export { QAPulsePuppeteerReporter } from './adapters/puppeteer';
export { QAPulseSeleniumReporter } from './adapters/selenium';
export { QAPulseWebdriverIOReporter } from './adapters/webdriverio';
export { analyzeFailures } from './ai/analyzer';
export { sendWebhooks } from './webhooks/notifier';
export { generateHTML, writeReport } from './core/generator';
export { calculateStats, formatDuration, getFailedTests } from './core/stats';
export { HistoryManager } from './core/history';
export { generateReport, withDefaults } from './core/orchestrator';
export { attachScreenshot } from './core/screenshot-registry';
export { collectScreenshots, makeScreenshot } from './core/screenshots';
export { listThemes, resolveTheme, DEFAULT_THEME } from './core/themes';
export type { ThemeName, ThemeVars } from './core/themes';
export type { QAPulseReportConfig, AIConfig, WebhookConfig, TestRun, TestSuite, TestResult, TestStats, TestError, TrendData, Screenshot, ScreenshotConfig, SupportedFramework, } from './core/types';
//# sourceMappingURL=index.d.ts.map