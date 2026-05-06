import * as path from 'path';
import * as fs from 'fs';
import { TestRun, TestSuite, TestResult, QAPulseReportConfig } from '../core/types';
import { calculateStats, generateRunId, getFailedTests } from '../core/stats';
import { generateHTML, writeReport } from '../core/generator';
import { analyzeFailures } from '../ai/analyzer';
import { sendWebhooks } from '../webhooks/notifier';
import { HistoryManager } from '../core/history';

// Cypress result shapes (subset we need)
interface CypressSpec {
  relative: string;
  absolute: string;
}

interface CypressTestAttempt {
  state: string;
  error?: { message: string; stack?: string };
  wallClockDuration?: number;
}

interface CypressTest {
  title: string[];
  state: string;
  attempts: CypressTestAttempt[];
  wallClockDuration?: number;
}

interface CypressRunResult {
  spec: CypressSpec;
  tests: CypressTest[];
  stats: {
    startedAt: string;
    endedAt: string;
    duration: number;
    tests: number;
    passes: number;
    failures: number;
    pending: number;
    skipped: number;
  };
}

interface CypressResults {
  runs: CypressRunResult[];
  startedTestsAt: string;
  endedTestsAt: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalPending: number;
  totalSkipped: number;
}

function mapCypressState(state: string): TestResult['status'] {
  const map: Record<string, TestResult['status']> = {
    passed: 'passed',
    failed: 'failed',
    pending: 'pending',
    skipped: 'skipped',
  };
  return map[state] || 'failed';
}

function mapCypressRun(run: CypressRunResult): TestSuite {
  const tests: TestResult[] = run.tests.map((t, i) => {
    const lastAttempt = t.attempts[t.attempts.length - 1];
    return {
      id: `${run.spec.relative}-${i}`,
      title: t.title[t.title.length - 1] || t.title.join(' > '),
      fullTitle: t.title.join(' > '),
      status: mapCypressState(t.state),
      duration: t.wallClockDuration || lastAttempt?.wallClockDuration || 0,
      error: lastAttempt?.error
        ? { message: lastAttempt.error.message, stack: lastAttempt.error.stack }
        : undefined,
      retries: t.attempts.length - 1,
      file: run.spec.relative,
    };
  });

  return {
    id: run.spec.relative,
    title: path.basename(run.spec.relative),
    file: run.spec.relative,
    tests,
    duration: run.stats.duration,
  };
}

/**
 * Use in cypress.config.ts:
 *
 * import { qapulseCypressPlugin } from 'qapulsesk-report/cypress';
 *
 * export default defineConfig({
 *   e2e: {
 *     setupNodeEvents(on, config) {
 *       qapulseCypressPlugin(on, config, { outputDir: 'qapulse-report' });
 *       return config;
 *     }
 *   }
 * });
 */
export function qapulseCypressPlugin(
  on: Cypress.PluginEvents,
  _config: Cypress.PluginConfigOptions,
  reportConfig: QAPulseReportConfig = {}
): void {
  const config: QAPulseReportConfig = {
    outputDir: 'qapulse-report',
    reportTitle: 'QAPulseSK Test Report',
    openAfterGeneration: false,
    ...reportConfig,
  };

  on('after:run', async (results: CypressResults) => {
    const suites = results.runs.map(mapCypressRun);
    const startTime = new Date(results.startedTestsAt);
    const endTime = new Date(results.endedTestsAt);

    const run: TestRun = {
      id: generateRunId(),
      title: config.reportTitle!,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      suites,
      stats: calculateStats(suites),
      framework: 'cypress',
    };

    const outputDir = config.outputDir!;
    const aiMap = config.ai?.enabled
      ? await analyzeFailures(getFailedTests(run), config.ai)
      : new Map();

    let history: import('../core/types').TrendData[] = [];
    if (config.history?.enabled) {
      const hm = new HistoryManager({
        ...config.history,
        historyFile: path.join(outputDir, config.history.historyFile || '.qapulse-history.json'),
      });
      history = hm.save(run);
    }

    const html = generateHTML(run, aiMap, history, config.reportTitle!, config.logo);
    const reportPath = writeReport(html, outputDir);

    if (config.webhooks) {
      await sendWebhooks(run, config.webhooks);
    }

    console.log(`\n✅ QAPulseSK Report generated: ${reportPath}`);
    console.log(`   Pass rate: ${run.stats.passRate}% (${run.stats.passed}/${run.stats.total})`);

    if (config.openAfterGeneration) {
      const { default: open } = await import('open');
      await open(reportPath);
    }
  });
}

export default qapulseCypressPlugin;
