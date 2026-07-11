import { QAPulseReportConfig } from '../core/types';
type WDIOTest = any;
type WDIOSuite = any;
type WDIORunnerStats = any;
export declare class QAPulseWebdriverIOReporter {
    private config;
    private startTime;
    private suites;
    get isSynchronised(): boolean;
    constructor(options?: QAPulseReportConfig);
    onRunnerStart(_runner: WDIORunnerStats): void;
    onSuiteStart(suite: WDIOSuite): void;
    onTestEnd(test: WDIOTest): void;
    onRunnerEnd(_runner: WDIORunnerStats): Promise<void>;
}
export default QAPulseWebdriverIOReporter;
//# sourceMappingURL=webdriverio.d.ts.map