import { QAPulseReportConfig } from '../core/types';
type PWReporter = any;
type PWSuite = any;
type PWFullConfig = any;
type PWFullResult = any;
export declare class QAPulsePlaywrightReporter implements PWReporter {
    private config;
    private startTime;
    private suites;
    constructor(config?: QAPulseReportConfig);
    onBegin(_config: PWFullConfig, suite: PWSuite): void;
    onEnd(result: PWFullResult): Promise<void>;
}
export default QAPulsePlaywrightReporter;
//# sourceMappingURL=playwright.d.ts.map