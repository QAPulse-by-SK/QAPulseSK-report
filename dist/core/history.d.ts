import { TestRun, TrendData, HistoryConfig } from './types';
export declare class HistoryManager {
    private historyFile;
    private maxRuns;
    constructor(config: HistoryConfig);
    load(): TrendData[];
    save(run: TestRun): TrendData[];
    getChartData(history: TrendData[]): {
        labels: string[];
        passed: number[];
        failed: number[];
        passRate: number[];
    };
}
export declare function resolveHistoryPath(outputDir: string, historyFile?: string): string;
//# sourceMappingURL=history.d.ts.map