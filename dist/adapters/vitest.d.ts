type VitestReporter = any;
import { QAPulseReportConfig } from '../core/types';
type VFile = any;
type VTaskResultPack = any;
export declare class QAPulseVitestReporter implements VitestReporter {
    private config;
    private ctx;
    private startTime;
    constructor(config?: QAPulseReportConfig);
    onInit(ctx: any): void;
    onTaskUpdate(_packs: VTaskResultPack[]): void;
    onFinished(files?: VFile[]): Promise<void>;
}
export default QAPulseVitestReporter;
//# sourceMappingURL=vitest.d.ts.map