// Vitest adapter for QAPulseSK-report
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VitestReporter = any;

import * as path from 'path';
import { TestRun, TestSuite, TestResult, QAPulseReportConfig } from '../core/types';
import { calculateStats, generateRunId, getFailedTests } from '../core/stats';
import { generateHTML, writeReport } from '../core/generator';
import { analyzeFailures } from '../ai/analyzer';
import { sendWebhooks } from '../webhooks/notifier';
import { HistoryManager } from '../core/history';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VFile = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VTaskResultPack = any;

function mapVitestStatus(state: string | undefined): TestResult['status'] {
  const map: Record<string, TestResult['status']> = {
    pass: 'passed', fail: 'failed', skip: 'skipped', todo: 'pending', run: 'pending',
  };
  return map[state || ''] || 'failed';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVitestFile(file: VFile): TestSuite {
  const tests: TestResult[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(tasks: any[], prefix = ''): void {
    for (const task of tasks) {
      if (task.type === 'test') {
        tests.push({
          id: task.id, title: task.name,
          fullTitle: prefix ? `${prefix} > ${task.name}` : task.name,
          status: mapVitestStatus(task.result?.state),
          duration: task.result?.duration || 0,
          error: task.result?.error ? {
            message: (task.result.error as { message?: string }).message || String(task.result.error),
            stack: (task.result.error as { stack?: string }).stack,
          } : undefined,
          file: file.filepath,
        });
      } else if (task.type === 'suite' && task.tasks) {
        walk(task.tasks, prefix ? `${prefix} > ${task.name}` : task.name);
      }
    }
  }
  walk(file.tasks);
  return { id: file.id, title: path.basename(file.filepath), file: file.filepath, tests, duration: file.result?.duration || 0 };
}

export class QAPulseVitestReporter implements VitestReporter {
  private config: QAPulseReportConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ctx: any;
  private startTime: Date = new Date();

  constructor(config: QAPulseReportConfig = {}) {
    this.config = { outputDir: 'qapulse-report', reportTitle: 'QAPulseSK Test Report', openAfterGeneration: false, ...config };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onInit(ctx: any): void { this.ctx = ctx; this.startTime = new Date(); }
  onTaskUpdate(_packs: VTaskResultPack[]): void {}

  async onFinished(files: VFile[] = []): Promise<void> {
    const suites = files.map(mapVitestFile);
    const endTime = new Date();
    const run: TestRun = {
      id: generateRunId(), title: this.config.reportTitle!, startTime: this.startTime, endTime,
      duration: endTime.getTime() - this.startTime.getTime(), suites, stats: calculateStats(suites), framework: 'vitest',
    };
    await this._generate(run);
  }

  private async _generate(run: TestRun): Promise<void> {
    const outputDir = this.config.outputDir!;
    const aiMap = this.config.ai?.enabled ? await analyzeFailures(getFailedTests(run), this.config.ai) : new Map();
    let history: import('../core/types').TrendData[] = [];
    if (this.config.history?.enabled) {
      const hm = new HistoryManager({ ...this.config.history, historyFile: path.join(outputDir, this.config.history.historyFile || '.qapulse-history.json') });
      history = hm.save(run);
    }
    const html = generateHTML(run, aiMap, history, this.config.reportTitle!, this.config.logo);
    const reportPath = writeReport(html, outputDir);
    if (this.config.webhooks) await sendWebhooks(run, this.config.webhooks);
    console.log(`\n✅ QAPulseSK Report generated: ${reportPath}`);
    if (this.config.openAfterGeneration) { const { default: open } = await import('open'); await open(reportPath); }
  }
}

export default QAPulseVitestReporter;
