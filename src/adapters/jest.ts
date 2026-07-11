import * as path from 'path';
import type { Reporter, TestContext, Test, AggregatedResult, TestResult as JestTestResult } from '@jest/reporters';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssertionResult = any;

import { TestRun, TestSuite, TestResult, QAPulseReportConfig } from '../core/types';
import { calculateStats, generateRunId } from '../core/stats';
import { generateReport, withDefaults } from '../core/orchestrator';
import { drainScreenshots } from '../core/screenshot-registry';

function mapJestStatus(status: AssertionResult['status']): TestResult['status'] {
  const map: Record<string, TestResult['status']> = {
    passed: 'passed',
    failed: 'failed',
    skipped: 'skipped',
    pending: 'pending',
    todo: 'pending',
    disabled: 'skipped',
  };
  return map[status] || 'failed';
}

function mapJestSuite(suite: JestTestResult): TestSuite {
  const tests: TestResult[] = suite.testResults.map((t, i) => ({
    id: `${suite.testFilePath}-${i}`,
    title: t.title,
    fullTitle: t.fullName,
    status: mapJestStatus(t.status),
    duration: t.duration || 0,
    error: t.failureMessages.length > 0
      ? { message: t.failureMessages[0].split('\n')[0], stack: t.failureMessages[0] }
      : undefined,
    screenshots: drainScreenshots(t.fullName),
    file: suite.testFilePath,
  }));

  return {
    id: suite.testFilePath,
    title: path.basename(suite.testFilePath),
    file: suite.testFilePath,
    tests,
    duration: suite.perfStats.end - suite.perfStats.start,
  };
}

class QAPulseJestReporter implements Reporter {
  private config: QAPulseReportConfig;

  constructor(_globalConfig: unknown, options: QAPulseReportConfig = {}) {
    this.config = withDefaults(options);
  }

  onRunStart(): void {}
  onTestStart(_test: Test): void {}
  onTestResult(_test: Test, _testResult: JestTestResult, _aggregatedResult: AggregatedResult): void {}
  getLastError(): void | Error { return undefined; }
  onTestContext(_testContext: TestContext): void {}

  async onRunComplete(_contexts: Set<TestContext>, results: AggregatedResult): Promise<void> {
    const suites = results.testResults.map(mapJestSuite);
    const startTime = new Date(results.startTime);
    const endTime = new Date();

    const run: TestRun = {
      id: generateRunId(),
      title: this.config.reportTitle!,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      suites,
      stats: calculateStats(suites),
      framework: 'jest',
    };

    await generateReport(run, this.config);
  }
}

export { QAPulseJestReporter };
export default QAPulseJestReporter;
