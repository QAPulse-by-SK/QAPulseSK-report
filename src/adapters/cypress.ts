import { QAPulseReportConfig } from '../core/types';
import { TestRun, TestSuite, TestResult } from '../core/types';
import { calculateStats, generateRunId, getFailedTests } from '../core/stats';
import { generateHTML, writeReport } from '../core/generator';
import { analyzeFailures } from '../ai/analyzer';
import { sendWebhooks } from '../webhooks/notifier';
import { HistoryManager } from '../core/history';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CypressSpec = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CypressResults = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CypressPluginEvents = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CypressPluginConfig = any;

function mapCypressState(state: string): TestResult['status'] {
  const map: Record<string, TestResult['status']> = {
    passed: 'passed', failed: 'failed', pending: 'pending', skipped: 'skipped',
  };
  return map[state] || 'failed';
}

function mapCypressRun(run: CypressResults): TestSuite {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tests: TestResult[] = (run.tests || []).map((t: any, i: number) => {
    const lastAttempt = t.attempts?.[t.attempts.length - 1];
    return {
      id: `${run.spec?.relative}-${i}`,
      title: t.title?.[t.title.length - 1] || 'Test',
      fullTitle: (t.title || []).join(' > '),
      status: mapCypressState(t.state),
      duration: t.wallClockDuration || lastAttempt?.wallClockDuration || 0,
      error: lastAttempt?.error ? { message: lastAttempt.error.message, stack: lastAttempt.error.stack } : undefined,
      retries: (t.attempts?.length || 1) - 1,
      file: run.spec?.relative,
    };
  });
  return {
    id: run.spec?.relative || 'suite',
    title: path.basename(run.spec?.relative || 'suite'),
    file: run.spec?.relative,
    tests,
    duration: run.stats?.duration || 0,
  };
}

export function qapulseCypressPlugin(
  on: CypressPluginEvents,
  _config: CypressPluginConfig,
  reportConfig: QAPulseReportConfig = {}
): void {
  const config: QAPulseReportConfig = {
    outputDir: 'qapulse-report', reportTitle: 'QAPulseSK Test Report',
    openAfterGeneration: false, ...reportConfig,
  };

  on('after:run', async (results: CypressResults) => {
    const suites = (results.runs || []).map(mapCypressRun);
    const startTime = new Date(results.startedTestsAt);
    const endTime = new Date(results.endedTestsAt);
    const run: TestRun = {
      id: generateRunId(), title: config.reportTitle!, startTime, endTime,
      duration: endTime.getTime() - startTime.getTime(),
      suites, stats: calculateStats(suites), framework: 'cypress',
    };
    const outputDir = config.outputDir!;
    const aiMap = config.ai?.enabled ? await analyzeFailures(getFailedTests(run), config.ai) : new Map();
    let history: import('../core/types').TrendData[] = [];
    if (config.history?.enabled) {
      const hm = new HistoryManager({ ...config.history, historyFile: path.join(outputDir, config.history.historyFile || '.qapulse-history.json') });
      history = hm.save(run);
    }
    const html = generateHTML(run, aiMap, history, config.reportTitle!, config.logo);
    const reportPath = writeReport(html, outputDir);
    if (config.webhooks) await sendWebhooks(run, config.webhooks);
    console.log(`\n✅ QAPulseSK Report generated: ${reportPath}`);
    if (config.openAfterGeneration) { const { default: open } = await import('open'); await open(reportPath); }
  });
}

export default qapulseCypressPlugin;
