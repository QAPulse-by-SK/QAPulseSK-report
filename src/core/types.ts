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
  screenshots?: Screenshot[];
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

export interface Screenshot {
  /** Absolute source path on disk where the runner wrote the file. */
  sourcePath: string;
  /** Relative path from the report dir (populated by the collector). */
  relativePath?: string;
  /** 'onFailure' | 'onEnd' | 'manual' | 'step' — provenance for UI. */
  kind: 'onFailure' | 'onEnd' | 'manual' | 'step';
  /** Human label (e.g. step title or 'Failure screenshot'). */
  name?: string;
  /** MIME type. Defaults to image/png. */
  contentType?: string;
  /** Set by collector after write; used for lightbox thumbnails. */
  thumbRelativePath?: string;
  /** Base64-inlined data URI when the file was small enough to embed. */
  inlineDataUri?: string;
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
  metadata?: RunMetadata;
}

export interface RunMetadata {
  git?: {
    branch?: string;
    commit?: string;
    commitShort?: string;
    commitMessage?: string;
    author?: string;
    tag?: string;
  };
  ci?: {
    provider?: string;
    jobUrl?: string;
    jobId?: string;
    prNumber?: string;
    prUrl?: string;
    workflow?: string;
  };
  // Free-form extras — users can attach whatever
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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

export type SupportedFramework = 'playwright' | 'cypress' | 'jest' | 'vitest' | 'puppeteer' | 'selenium' | 'webdriverio';

export interface QAPulseReportConfig {
  outputDir?: string;
  reportTitle?: string;
  openAfterGeneration?: boolean;
  ai?: AIConfig;
  webhooks?: WebhookConfig;
  theme?: ThemeConfig;
  history?: HistoryConfig;
  screenshots?: ScreenshotConfig;
  logo?: string;
  /** Emit qapulse-report.json alongside the HTML. Default: true. */
  emitJson?: boolean;
  /** Skip auto-detection of git/CI metadata from env. Default: false. */
  disableAutoMetadata?: boolean;
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
  discord?: string;
  custom?: CustomWebhook[];
  notifyOnFailOnly?: boolean;
  /** Public URL where the HTML report is hosted — turns into a button in cards. */
  reportUrl?: string;
  /** Ping this Slack user/group ID on regressions (e.g. 'U0123ABC' or 'S0123ABC'). */
  mentionOnRegression?: string;
  /** Also ping when there are new (not previously seen) failures. Default: false. */
  mentionOnNewFailures?: boolean;
  /** Max failed test titles to include in the card. Default: 5. */
  maxFailedInCard?: number;
}

export interface CustomWebhook {
  url: string;
  headers?: Record<string, string>;
  template?: (run: TestRun) => object;
}

export interface ThemeConfig {
  /** Preset name: 'qapulse-dark' (default), 'qapulse-light', 'github-dark', 'github-light', 'dracula', 'solarized-light', 'minimal'. */
  name?: string;
  primaryColor?: string;
  backgroundColor?: string;
  cardColor?: string;
}

export interface HistoryConfig {
  enabled: boolean;
  historyFile?: string;
  maxRuns?: number;
}

export interface ScreenshotConfig {
  /** Master switch. Default: true. */
  enabled?: boolean;
  /** Copy screenshots on failure into the report dir. Default: true. */
  onFailure?: boolean;
  /** Also copy screenshots on pass (rare). Default: false. */
  onPass?: boolean;
  /**
   * If a screenshot is <= this many KB, inline it as a base64 data URI
   * so the report is a single portable file. Larger images are copied
   * to `<outputDir>/screenshots/` and referenced by relative path.
   * Default: 200.
   */
  inlineThresholdKb?: number;
  /** Directory (relative to outputDir) where large files are copied. Default: 'screenshots'. */
  outputSubdir?: string;
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
