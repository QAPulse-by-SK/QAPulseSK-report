// Selenium WebDriver adapter for QAPulseSK-report.
// Selenium has no test runner of its own — users drive the reporter directly.
//
// Example:
//   import { Builder, By, until } from 'selenium-webdriver';
//   import { QAPulseSeleniumReporter } from 'qapulsesk-report/selenium';
//
//   const reporter = new QAPulseSeleniumReporter({ reportTitle: 'Selenium Suite' });
//   const driver = await new Builder().forBrowser('chrome').build();
//
//   reporter.startTest('Login works', { suite: 'Auth' });
//   try {
//     await driver.get('https://example.com/login');
//     // ... assertions ...
//     reporter.endTest('passed');
//   } catch (err) {
//     const shot = await driver.takeScreenshot();          // base64 png
//     const p = `/tmp/${Date.now()}.png`;
//     require('fs').writeFileSync(p, shot, 'base64');
//     reporter.endTest('failed', { error: err, screenshotPath: p });
//   }
//   await driver.quit();
//   await reporter.finish();

import { TestRun, TestSuite, TestResult, TestError, Screenshot, QAPulseReportConfig } from '../core/types';
import { calculateStats, generateRunId } from '../core/stats';
import { generateReport, withDefaults } from '../core/orchestrator';

interface EndTestOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: Error | any;
  screenshotPath?: string;
  screenshotPaths?: string[];
  file?: string;
  suite?: string;
}

interface PendingTest {
  id: string;
  title: string;
  fullTitle: string;
  suite: string;
  startedAt: number;
  file?: string;
}

function toError(e: unknown): TestError | undefined {
  if (!e) return undefined;
  if (e instanceof Error) return { message: e.message, stack: e.stack };
  if (typeof e === 'string') return { message: e };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = e as any;
  return { message: any.message || String(e), stack: any.stack };
}

export class QAPulseSeleniumReporter {
  private config: QAPulseReportConfig;
  private startTime: Date = new Date();
  private current: PendingTest | null = null;
  private buckets = new Map<string, TestResult[]>();

  constructor(config: QAPulseReportConfig = {}) {
    this.config = withDefaults(config);
  }

  startTest(title: string, opts: { suite?: string; file?: string } = {}): void {
    this.current = {
      id: `sel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      fullTitle: opts.suite ? `${opts.suite} > ${title}` : title,
      suite: opts.suite || 'Selenium',
      startedAt: Date.now(),
      file: opts.file,
    };
  }

  endTest(status: TestResult['status'], opts: EndTestOptions = {}): void {
    if (!this.current) return;
    const shots: Screenshot[] = [];
    const paths = [
      ...(opts.screenshotPath ? [opts.screenshotPath] : []),
      ...(opts.screenshotPaths || []),
    ];
    for (const p of paths) {
      shots.push({
        sourcePath: p,
        kind: status === 'failed' ? 'onFailure' : 'manual',
        name: status === 'failed' ? 'Failure screenshot' : 'Screenshot',
      });
    }
    const test: TestResult = {
      id: this.current.id,
      title: this.current.title,
      fullTitle: this.current.fullTitle,
      status,
      duration: Date.now() - this.current.startedAt,
      error: toError(opts.error),
      screenshots: shots,
      file: opts.file || this.current.file,
    };
    const key = opts.suite || this.current.suite;
    const list = this.buckets.get(key) || [];
    list.push(test);
    this.buckets.set(key, list);
    this.current = null;
  }

  async finish(): Promise<void> {
    const endTime = new Date();
    const suites: TestSuite[] = Array.from(this.buckets.entries()).map(([title, tests]) => ({
      id: title,
      title,
      tests,
      duration: tests.reduce((s, t) => s + t.duration, 0),
    }));
    const run: TestRun = {
      id: generateRunId(),
      title: this.config.reportTitle!,
      startTime: this.startTime,
      endTime,
      duration: endTime.getTime() - this.startTime.getTime(),
      suites,
      stats: calculateStats(suites),
      framework: 'selenium',
    };
    await generateReport(run, this.config);
  }
}

export default QAPulseSeleniumReporter;
