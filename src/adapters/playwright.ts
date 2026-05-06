import * as fs from 'fs';
import * as path from 'path';
import {
  Reporter,
  TestCase,
  TestResult as PWTestResult,
  Suite,
  FullConfig,
  FullResult,
} from '@playwright/test/reporter';

import { TestRun, TestSuite, TestResult, TestError, QAPulseReportConfig } from '../core/types';
import { calculateStats, generateRunId, getFailedTests } from '../core/stats';
import { generateHTML, writeReport } from '../core/generator';
import { analyzeFailures } from '../ai/analyzer';
import { sendWebhooks } from '../webhooks/notifier';
import { HistoryManager } from '../core/history';

function mapStatus(status: PWTestResult['status']): TestResult['status'] {
  const map: Record<string, TestResult['status']> = {
    passed: 'passed',
    failed: 'failed',
    timedOut: 'failed',
    skipped: 'skipped',
    interrupted: 'failed',
  };
  return map[status] || 'failed';
}

function mapError(result: PWTestResult): TestError | undefined {
  const err = result.errors[0];
  if (!err) return undefined;
  return {
    message: err.message || String(err),
    stack: err.stack,
  };
}

function mapSuite(suite: Suite, file?: string): TestSuite {
  const tests: TestResult[] = suite.tests().map(tc => {
    const result = tc.results[tc.results.length - 1];
    return {
      id: tc.id,
      title: tc.title,
      fullTitle: tc.titlePath().join(' > '),
      status: result ? mapStatus(result.status) : 'skipped',
      duration: result?.duration || 0,
      error: result ? mapError(result) : undefined,
      retries: tc.retries,
      file: tc.location?.file,
      line: tc.location?.line,
    };
  });

  const suites: TestSuite[] = suite.suites.map(s => mapSuite(s, file));

  return {
    id: suite.title,
    title: suite.title || path.basename(file || 'Suite'),
    file,
    tests,
    suites,
    duration: tests.reduce((s, t) => s + t.duration, 0),
  };
}

export class QAPulsePlaywrightReporter implements Reporter {
  private config: QAPulseReportConfig;
  private startTime: Date = new Date();
  private suites: TestSuite[] = [];

  constructor(config: QAPulseReportConfig = {}) {
    this.config = {
      outputDir: 'qapulse-report',
      reportTitle: 'QAPulseSK Test Report',
      openAfterGeneration: false,
      ...config,
    };
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.startTime = new Date();
    this.suites = suite.suites.map(s => mapSuite(s, s.location?.file));
  }

  async onEnd(result: FullResult): Promise<void> {
    const endTime = new Date();
    const run: TestRun = {
      id: generateRunId(),
      title: this.config.reportTitle!,
      startTime: this.startTime,
      endTime,
      duration: endTime.getTime() - this.startTime.getTime(),
      suites: this.suites,
      stats: calculateStats(this.suites),
      framework: 'playwright',
      metadata: { status: result.status },
    };

    await this._generate(run);
  }

  private async _generate(run: TestRun): Promise<void> {
    const outputDir = this.config.outputDir!;
    const aiMap = this.config.ai?.enabled
      ? await analyzeFailures(getFailedTests(run), this.config.ai)
      : new Map();

    let history: import('../core/types').TrendData[] = [];
    if (this.config.history?.enabled) {
      const hm = new HistoryManager({
        ...this.config.history,
        historyFile: path.join(outputDir, this.config.history.historyFile || '.qapulse-history.json'),
      });
      history = hm.save(run);
    }

    const html = generateHTML(run, aiMap, history, this.config.reportTitle!, this.config.logo);
    const reportPath = writeReport(html, outputDir);

    if (this.config.webhooks) {
      await sendWebhooks(run, this.config.webhooks);
    }

    console.log(`\n✅ QAPulseSK Report generated: ${reportPath}`);
    console.log(`   Pass rate: ${run.stats.passRate}% (${run.stats.passed}/${run.stats.total})`);

    if (this.config.openAfterGeneration) {
      const { default: open } = await import('open');
      await open(reportPath);
    }
  }
}

export default QAPulsePlaywrightReporter;
