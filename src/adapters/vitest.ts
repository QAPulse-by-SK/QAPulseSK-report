// Vitest adapter for QAPulseSK-report
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VitestReporter = any;

import * as path from 'path';
import { TestRun, TestSuite, TestResult, QAPulseReportConfig } from '../core/types';
import { calculateStats, generateRunId } from '../core/stats';
import { generateReport, withDefaults } from '../core/orchestrator';
import { drainScreenshots } from '../core/screenshot-registry';

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
        const fullTitle = prefix ? `${prefix} > ${task.name}` : task.name;
        tests.push({
          id: task.id, title: task.name,
          fullTitle,
          status: mapVitestStatus(task.result?.state),
          duration: task.result?.duration || 0,
          error: task.result?.error ? {
            message: (task.result.error as { message?: string }).message || String(task.result.error),
            stack: (task.result.error as { stack?: string }).stack,
          } : undefined,
          screenshots: drainScreenshots(fullTitle),
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
    this.config = withDefaults(config);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onInit(ctx: any): void { this.ctx = ctx; this.startTime = new Date(); }
  onTaskUpdate(_packs: VTaskResultPack[]): void {}

  async onFinished(files: VFile[] = []): Promise<void> {
    const suites = files.map(mapVitestFile);
    const endTime = new Date();
    const run: TestRun = {
      id: generateRunId(),
      title: this.config.reportTitle!,
      startTime: this.startTime,
      endTime,
      duration: endTime.getTime() - this.startTime.getTime(),
      suites,
      stats: calculateStats(suites),
      framework: 'vitest',
    };
    await generateReport(run, this.config);
  }
}

export default QAPulseVitestReporter;
