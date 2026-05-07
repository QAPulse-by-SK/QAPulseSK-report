export { QAPulsePlaywrightReporter } from './adapters/playwright';
export { QAPulseJestReporter } from './adapters/jest';
export { QAPulseVitestReporter } from './adapters/vitest';
export { qapulseCypressPlugin } from './adapters/cypress';
export { analyzeFailures } from './ai/analyzer';
export { sendWebhooks } from './webhooks/notifier';
export { generateHTML, writeReport } from './core/generator';
export { calculateStats, formatDuration, getFailedTests } from './core/stats';
export { HistoryManager } from './core/history';
export type { QAPulseReportConfig, AIConfig, WebhookConfig, TestRun, TestSuite, TestResult, TestStats, TestError, TrendData, SupportedFramework, } from './core/types';
//# sourceMappingURL=index.d.ts.map