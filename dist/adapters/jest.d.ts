import type { Reporter, TestContext, Test, AggregatedResult, TestResult as JestTestResult } from '@jest/reporters';
import { QAPulseReportConfig } from '../core/types';
declare class QAPulseJestReporter implements Reporter {
    private config;
    constructor(_globalConfig: unknown, options?: QAPulseReportConfig);
    onRunStart(): void;
    onTestStart(_test: Test): void;
    onTestResult(_test: Test, _testResult: JestTestResult, _aggregatedResult: AggregatedResult): void;
    getLastError(): void | Error;
    onTestContext(_testContext: TestContext): void;
    onRunComplete(_contexts: Set<TestContext>, results: AggregatedResult): Promise<void>;
}
export { QAPulseJestReporter };
export default QAPulseJestReporter;
//# sourceMappingURL=jest.d.ts.map