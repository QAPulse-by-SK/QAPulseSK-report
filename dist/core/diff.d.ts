import { TestRun, TrendData } from './types';
/** State of a failed test in the current run, relative to prior history. */
export type FailureState = 'new' | 'recurring' | 'regression';
export interface TestOutcomeRecord {
    fullTitle: string;
    status: 'passed' | 'failed' | 'skipped' | 'pending';
}
export interface HistoryEntry extends TrendData {
    outcomes?: TestOutcomeRecord[];
}
export interface RunDiff {
    newFailures: string[];
    recovered: string[];
    stillFailing: string[];
    stillPassing: number;
}
export declare function buildOutcomes(run: TestRun): TestOutcomeRecord[];
/**
 * For each currently-failed test, classify against the previous run:
 *   - 'regression'  : failed now, passed in the previous run
 *   - 'recurring'   : failed now AND in the previous run
 *   - 'new'         : failed now, not present in any prior history
 */
export declare function classifyFailures(run: TestRun, history: HistoryEntry[]): Map<string, {
    state: FailureState;
    consecutive: number;
}>;
/** High-level: what changed compared to the most recent prior run? */
export declare function computeDiff(run: TestRun, history: HistoryEntry[]): RunDiff | null;
//# sourceMappingURL=diff.d.ts.map