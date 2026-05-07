import { TestRun, TestSuite, TestStats, TestResult } from './types';
export declare function calculateStats(suites: TestSuite[]): TestStats;
export declare function flattenTests(suites: TestSuite[]): TestResult[];
export declare function getFailedTests(run: TestRun): TestResult[];
export declare function formatDuration(ms: number): string;
export declare function generateRunId(): string;
//# sourceMappingURL=stats.d.ts.map