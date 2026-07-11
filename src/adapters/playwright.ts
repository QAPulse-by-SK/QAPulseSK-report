import * as path from 'path';
import { TestRun, TestSuite, TestResult, TestError, Screenshot, QAPulseReportConfig } from '../core/types';
import { calculateStats, generateRunId } from '../core/stats';
import { generateReport, withDefaults } from '../core/orchestrator';

// Use 'any' for Playwright types to avoid peer dep requirement during build
/* eslint-disable @typescript-eslint/no-explicit-any */
type PWReporter = any;
type PWTestCase = any;
type PWTestResult = any;
type PWSuite = any;
type PWFullConfig = any;
type PWFullResult = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

function mapStatus(status: string): TestResult['status'] {
  const map: Record<string, TestResult['status']> = {
    passed: 'passed', failed: 'failed', timedOut: 'failed', skipped: 'skipped', interrupted: 'failed',
  };
  return map[status] || 'failed';
}

function mapError(result: PWTestResult): TestError | undefined {
  const err = result.errors?.[0];
  if (!err) return undefined;
  return { message: err.message || String(err), stack: err.stack };
}

function mapScreenshots(result: PWTestResult, status: TestResult['status']): Screenshot[] {
  const atts = result?.attachments || [];
  const shots: Screenshot[] = [];
  for (const a of atts) {
    if (!a?.path) continue;
    const ct: string = a.contentType || '';
    const name: string = a.name || '';
    const isImage = ct.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.path);
    if (!isImage) continue;
    shots.push({
      sourcePath: a.path,
      contentType: ct || undefined,
      kind: status === 'failed' ? 'onFailure' : 'onEnd',
      name: name || (status === 'failed' ? 'Failure screenshot' : 'Screenshot'),
    });
  }
  return shots;
}

function mapSuite(suite: PWSuite, file?: string): TestSuite {
  const tests: TestResult[] = (suite.tests?.() || []).map((tc: PWTestCase) => {
    const result = tc.results?.[tc.results.length - 1];
    const status: TestResult['status'] = result ? mapStatus(result.status) : 'skipped';
    return {
      id: tc.id, title: tc.title,
      fullTitle: tc.titlePath?.().join(' > ') || tc.title,
      status,
      duration: result?.duration || 0,
      error: result ? mapError(result) : undefined,
      screenshots: result ? mapScreenshots(result, status) : [],
      retries: tc.retries, file: tc.location?.file, line: tc.location?.line,
    };
  });
  const suites: TestSuite[] = (suite.suites || []).map((s: PWSuite) => mapSuite(s, file));
  return {
    id: suite.title, title: suite.title || path.basename(file || 'Suite'),
    file, tests, suites, duration: tests.reduce((s: number, t: TestResult) => s + t.duration, 0),
  };
}

export class QAPulsePlaywrightReporter implements PWReporter {
  private config: QAPulseReportConfig;
  private startTime: Date = new Date();
  private suites: TestSuite[] = [];

  constructor(config: QAPulseReportConfig = {}) {
    this.config = withDefaults(config);
  }

  onBegin(_config: PWFullConfig, suite: PWSuite): void {
    this.startTime = new Date();
    this.suites = (suite.suites || []).map((s: PWSuite) => mapSuite(s, s.location?.file));
  }

  async onEnd(result: PWFullResult): Promise<void> {
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
    await generateReport(run, this.config);
  }
}

export default QAPulsePlaywrightReporter;
