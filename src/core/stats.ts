import { TestRun, TestSuite, TestStats, TestResult } from './types';

export function calculateStats(suites: TestSuite[]): TestStats {
  const allTests = flattenTests(suites);
  const total = allTests.length;
  const passed = allTests.filter(t => t.status === 'passed').length;
  const failed = allTests.filter(t => t.status === 'failed').length;
  const skipped = allTests.filter(t => t.status === 'skipped').length;
  const pending = allTests.filter(t => t.status === 'pending').length;
  const duration = allTests.reduce((sum, t) => sum + t.duration, 0);
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return { total, passed, failed, skipped, pending, passRate, duration };
}

export function flattenTests(suites: TestSuite[]): TestResult[] {
  const results: TestResult[] = [];
  for (const suite of suites) {
    results.push(...suite.tests);
    if (suite.suites) {
      results.push(...flattenTests(suite.suites));
    }
  }
  return results;
}

export function getFailedTests(run: TestRun): TestResult[] {
  return flattenTests(run.suites).filter(t => t.status === 'failed');
}

export function flattenSuites(suites: TestSuite[]): TestSuite[] {
  const out: TestSuite[] = [];
  for (const s of suites) {
    out.push(s);
    if (s.suites) out.push(...flattenSuites(s.suites));
  }
  return out;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
