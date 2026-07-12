// QAPulseSK-report — All-in-one test reporter by QAPulse by SK
// https://skakarh.com · https://github.com/QAPulse-by-SK

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
export { clusterFailures, signatureFor, clusterIdFor } from './core/clustering';
export type { FailureCluster } from './core/clustering';
export { detectMetadata, mergeMetadata } from './core/metadata';
export { classifyFailures, computeDiff, buildOutcomes } from './core/diff';
export type { RunDiff, FailureState, HistoryEntry } from './core/diff';

export type {
  QAPulseReportConfig,
  AIConfig,
  WebhookConfig,
  TestRun,
  TestSuite,
  TestResult,
  TestStats,
  TestError,
  TrendData,
  Screenshot,
  ScreenshotConfig,
  RunMetadata,
  SupportedFramework,
} from './core/types';
