export type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending';

export interface TestResult {
  id: string;
  title: string;
  fullTitle: string;
  status: TestStatus;
  duration: number;
  error?: TestError;
  retries?: number;
  steps?: TestStep[];
  attachments?: Attachment[];
  tags?: string[];
  file?: string;
  line?: number;
}

export interface TestError {
  message: string;
  stack?: string;
  expected?: string;
  actual?: string;
  diff?: string;
}

export interface TestStep {
  title: string;
  status: TestStatus;
  duration: number;
  error?: TestError;
}

export interface Attachment {
  name: string;
  contentType: string;
  path?: string;
  body?: Buffer;
}

export interface TestSuite {
  id: string;
  title: string;
  file?: string;
  tests: TestResult[];
  suites?: TestSuite[];
  duration: number;
}

export interface TestRun {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  suites: TestSuite[];
  stats: TestStats;
  framework: SupportedFramework;
  metadata?: Record<string, unknown>;
}

export interface TestStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  passRate: number;
  duration: number;
}

export type SupportedFramework = 'playwright' | 'cypress' | 'jest' | 'vitest';

export interface QAPulseReportConfig {
  outputDir?: string;
  reportTitle?: string;
  openAfterGeneration?: boolean;
  ai?: AIConfig;
  webhooks?: WebhookConfig;
  theme?: ThemeConfig;
  history?: HistoryConfig;
  logo?: string;
}

export interface AIConfig {
  enabled: boolean;
  provider?: 'anthropic' | 'openai' | 'gemini';
  apiKey?: string;
  model?: string;
  maxFailuresToAnalyze?: number;
}

export interface WebhookConfig {
  slack?: string;
  teams?: string;
  custom?: CustomWebhook[];
  notifyOnFailOnly?: boolean;
}

export interface CustomWebhook {
  url: string;
  headers?: Record<string, string>;
  template?: (run: TestRun) => object;
}

export interface ThemeConfig {
  primaryColor?: string;
  backgroundColor?: string;
  cardColor?: string;
}

export interface HistoryConfig {
  enabled: boolean;
  historyFile?: string;
  maxRuns?: number;
}

export interface TrendData {
  runId: string;
  date: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  passRate: number;
}
