// WebdriverIO reporter adapter for QAPulseSK-report.
// Implements the WDIO Reporter contract without pulling @wdio/reporter as a hard dep.
//
// Usage in wdio.conf.ts:
//   import QAPulseWDIOReporter from 'qapulsesk-report/webdriverio';
//   export const config = {
//     reporters: [
//       [QAPulseWDIOReporter, { reportTitle: 'WDIO Suite', history: { enabled: true } }],
//     ],
//   };
//
// Screenshots on failure: users call `browser.takeScreenshot()` in an afterTest hook
// and pass the path via attachScreenshot(fullTitle, path).

import { TestRun, TestSuite, TestResult, Screenshot, QAPulseReportConfig } from '../core/types';
import { calculateStats, generateRunId } from '../core/stats';
import { generateReport, withDefaults } from '../core/orchestrator';
import { drainScreenshots } from '../core/screenshot-registry';

/* eslint-disable @typescript-eslint/no-explicit-any */
type WDIOTest = any;
type WDIOSuite = any;
type WDIORunnerStats = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

function mapWDIOStatus(state: string | undefined): TestResult['status'] {
  const map: Record<string, TestResult['status']> = {
    passed: 'passed', failed: 'failed', skipped: 'skipped', pending: 'pending',
  };
  return map[state || ''] || 'failed';
}

function collectShots(t: WDIOTest, status: TestResult['status']): Screenshot[] {
  const shots: Screenshot[] = [...drainScreenshots(t.fullTitle || t.title || '')];
  // WDIO 8+ exposes any custom attachments on `t.output` — pick image-like ones
  const output = (t.output || []) as Array<{ type?: string; value?: string }>;
  for (const o of output) {
    if (o?.type === 'screenshot' && o.value) {
      shots.push({
        sourcePath: o.value,
        kind: status === 'failed' ? 'onFailure' : 'manual',
        name: 'Screenshot',
      });
    }
  }
  return shots;
}

export class QAPulseWebdriverIOReporter {
  private config: QAPulseReportConfig;
  private startTime: Date = new Date();
  // Suite UID -> { title, tests }
  private suites = new Map<string, { title: string; file?: string; tests: TestResult[] }>();

  // WDIO Reporter contract flag — tells WDIO to wait for onRunnerEnd to resolve
  public get isSynchronised(): boolean { return true; }

  constructor(options: QAPulseReportConfig = {}) {
    this.config = withDefaults(options);
  }

  onRunnerStart(_runner: WDIORunnerStats): void {
    this.startTime = new Date();
  }

  onSuiteStart(suite: WDIOSuite): void {
    const uid = suite.uid || suite.title;
    if (!this.suites.has(uid)) {
      this.suites.set(uid, { title: suite.title || 'Suite', file: suite.file, tests: [] });
    }
  }

  onTestEnd(test: WDIOTest): void {
    const status = mapWDIOStatus(test.state);
    const suiteUid = test.parent || test.parentUid || 'default';
    const bucket = this.suites.get(suiteUid) || { title: test.parent || 'Suite', tests: [] };
    bucket.tests.push({
      id: test.uid || `${suiteUid}-${bucket.tests.length}`,
      title: test.title || '',
      fullTitle: test.fullTitle || test.title || '',
      status,
      duration: test._duration || test.duration || 0,
      error: test.error ? { message: test.error.message || String(test.error), stack: test.error.stack } : undefined,
      screenshots: collectShots(test, status),
      file: test.file,
    });
    this.suites.set(suiteUid, bucket);
  }

  async onRunnerEnd(_runner: WDIORunnerStats): Promise<void> {
    const endTime = new Date();
    const suites: TestSuite[] = Array.from(this.suites.entries()).map(([uid, s]) => ({
      id: uid,
      title: s.title,
      file: s.file,
      tests: s.tests,
      duration: s.tests.reduce((sum, t) => sum + t.duration, 0),
    }));
    const run: TestRun = {
      id: generateRunId(),
      title: this.config.reportTitle!,
      startTime: this.startTime,
      endTime,
      duration: endTime.getTime() - this.startTime.getTime(),
      suites,
      stats: calculateStats(suites),
      framework: 'webdriverio',
    };
    await generateReport(run, this.config);
  }
}

export default QAPulseWebdriverIOReporter;
