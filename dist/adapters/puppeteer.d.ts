import * as path from 'path';
import { TestResult, QAPulseReportConfig } from '../core/types';
interface EndTestOptions {
    error?: Error | any;
    screenshotPath?: string;
    screenshotPaths?: string[];
    file?: string;
    suite?: string;
}
export declare class QAPulsePuppeteerReporter {
    private config;
    private startTime;
    private current;
    private buckets;
    constructor(config?: QAPulseReportConfig);
    startTest(title: string, opts?: {
        suite?: string;
        file?: string;
    }): void;
    endTest(status: TestResult['status'], opts?: EndTestOptions): void;
    finish(): Promise<void>;
}
export default QAPulsePuppeteerReporter;
export type _P = typeof path;
//# sourceMappingURL=puppeteer.d.ts.map