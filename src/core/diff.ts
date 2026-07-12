// QAPulseSK-report — cross-run comparison.
// Uses persisted history (TrendData[]) + per-test outcomes stored inside each
// history entry to compute per-test failure state and run-over-run diffs.

import { TestRun, TrendData } from './types';
import { flattenTests } from './stats';

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

export function buildOutcomes(run: TestRun): TestOutcomeRecord[] {
  return flattenTests(run.suites).map(t => ({
    fullTitle: t.fullTitle,
    status: t.status,
  }));
}

/**
 * For each currently-failed test, classify against the previous run:
 *   - 'regression'  : failed now, passed in the previous run
 *   - 'recurring'   : failed now AND in the previous run
 *   - 'new'         : failed now, not present in any prior history
 */
export function classifyFailures(
  run: TestRun,
  history: HistoryEntry[]
): Map<string, { state: FailureState; consecutive: number }> {
  const out = new Map<string, { state: FailureState; consecutive: number }>();
  const failed = flattenTests(run.suites).filter(t => t.status === 'failed');
  const priorRuns = history.filter(h => h.runId !== run.id);

  for (const t of failed) {
    const title = t.fullTitle;
    let seenBefore = false;
    let lastPriorStatus: string | undefined;
    let consecutive = 0;

    // Walk history newest→oldest to count consecutive failures.
    for (let i = priorRuns.length - 1; i >= 0; i--) {
      const rec = priorRuns[i].outcomes?.find(o => o.fullTitle === title);
      if (!rec) continue;
      seenBefore = true;
      if (lastPriorStatus === undefined) lastPriorStatus = rec.status;
      if (rec.status === 'failed') {
        consecutive++;
      } else {
        break;
      }
    }

    let state: FailureState;
    if (!seenBefore) state = 'new';
    else if (lastPriorStatus === 'passed') state = 'regression';
    else state = 'recurring';

    // Current run's own failure counts toward the streak.
    out.set(t.id, { state, consecutive: consecutive + 1 });
  }

  return out;
}

/** High-level: what changed compared to the most recent prior run? */
export function computeDiff(run: TestRun, history: HistoryEntry[]): RunDiff | null {
  const prior = [...history].reverse().find(h => h.runId !== run.id);
  if (!prior || !prior.outcomes) return null;

  const now = new Map(buildOutcomes(run).map(o => [o.fullTitle, o.status]));
  const then = new Map(prior.outcomes.map(o => [o.fullTitle, o.status]));

  const newFailures: string[] = [];
  const recovered: string[] = [];
  const stillFailing: string[] = [];
  let stillPassing = 0;

  for (const [title, nowStatus] of now) {
    const thenStatus = then.get(title);
    if (nowStatus === 'failed' && thenStatus !== 'failed') newFailures.push(title);
    else if (nowStatus === 'failed' && thenStatus === 'failed') stillFailing.push(title);
    else if (nowStatus === 'passed' && thenStatus === 'failed') recovered.push(title);
    else if (nowStatus === 'passed' && thenStatus === 'passed') stillPassing++;
  }

  return { newFailures, recovered, stillFailing, stillPassing };
}
