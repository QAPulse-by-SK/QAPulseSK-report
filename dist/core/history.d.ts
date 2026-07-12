import { TestRun, TrendData, HistoryConfig } from './types';
import { HistoryEntry } from './diff';
export declare class HistoryManager {
    private historyFile;
    private maxRuns;
    constructor(config: HistoryConfig);
    load(): HistoryEntry[];
    save(run: TestRun): HistoryEntry[];
    getChartData(history: TrendData[]): {
        labels: string[];
        passed: number[];
        failed: number[];
        passRate: number[];
    };
}
export declare function resolveHistoryPath(outputDir: string, historyFile?: string): string;
//# sourceMappingURL=history.d.ts.map