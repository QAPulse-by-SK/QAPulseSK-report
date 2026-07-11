import { TestRun, QAPulseReportConfig } from './types';
export declare function withDefaults(config?: QAPulseReportConfig): QAPulseReportConfig;
export declare function generateReport(run: TestRun, config: QAPulseReportConfig): Promise<string>;
//# sourceMappingURL=orchestrator.d.ts.map