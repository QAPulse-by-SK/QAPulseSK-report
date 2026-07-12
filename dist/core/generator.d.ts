import { TestRun } from '../core/types';
import { AIAnalysis } from '../ai/analyzer';
import { TrendData, ThemeConfig } from '../core/types';
import { FailureCluster } from './clustering';
import { RunDiff, FailureState, HistoryEntry } from './diff';
export declare function generateHTML(run: TestRun, aiMap: Map<string, AIAnalysis>, history: HistoryEntry[] | TrendData[], reportTitle: string, logo?: string, theme?: ThemeConfig, clusters?: FailureCluster[], diff?: RunDiff | null, failureStates?: Map<string, {
    state: FailureState;
    consecutive: number;
}>): string;
export declare function writeReport(html: string, outputDir: string, filename?: string): string;
//# sourceMappingURL=generator.d.ts.map