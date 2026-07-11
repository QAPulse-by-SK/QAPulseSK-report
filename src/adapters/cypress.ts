import * as path from 'path';
import { QAPulseReportConfig, TestRun, TestSuite, TestResult, Screenshot } from '../core/types';
import { calculateStats, generateRunId } from '../core/stats';
import { generateReport, withDefaults } from '../core/orchestrator';

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
  // Build a lookup: testId -> screenshots[] (Cypress emits screenshots at run level)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shotsByTestId = new Map<string, Screenshot[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (run.screenshots || []) as any[]) {
    if (!s?.path) continue;
    const key: string = s.testId || s.testAttemptIndex != null ? String(s.testId) : '';
    if (!key) continue;
    const list = shotsByTestId.get(key) || [];
    list.push({
      sourcePath: s.path,
      kind: 'onFailure',
      name: s.name || 'Failure screenshot',
    });
    shotsByTestId.set(key, list);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tests: TestResult[] = (run.tests || []).map((t: any, i: number) => {
    const lastAttempt = t.attempts?.[t.attempts.length - 1];
    const testKey: string = t.testId || '';
    return {
      id: `${run.spec?.relative}-${i}`,
      title: t.title?.[t.title.length - 1] || 'Test',
      fullTitle: (t.title || []).join(' > '),
      status: mapCypressState(t.state),
      duration: t.wallClockDuration || lastAttempt?.wallClockDuration || 0,
      error: lastAttempt?.error ? { message: lastAttempt.error.message, stack: lastAttempt.error.stack } : undefined,
      screenshots: shotsByTestId.get(testKey) || [],
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
  const config = withDefaults(reportConfig);

  on('after:run', async (results: CypressResults) => {
    const suites = (results.runs || []).map(mapCypressRun);
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
    await generateReport(run, config);
  });
}

export default qapulseCypressPlugin;
