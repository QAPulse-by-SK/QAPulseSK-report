"use strict";
// QAPulseSK-report — cross-run comparison.
// Uses persisted history (TrendData[]) + per-test outcomes stored inside each
// history entry to compute per-test failure state and run-over-run diffs.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOutcomes = buildOutcomes;
exports.classifyFailures = classifyFailures;
exports.computeDiff = computeDiff;
const stats_1 = require("./stats");
function buildOutcomes(run) {
    return (0, stats_1.flattenTests)(run.suites).map(t => ({
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
function classifyFailures(run, history) {
    const out = new Map();
    const failed = (0, stats_1.flattenTests)(run.suites).filter(t => t.status === 'failed');
    const priorRuns = history.filter(h => h.runId !== run.id);
    for (const t of failed) {
        const title = t.fullTitle;
        let seenBefore = false;
        let lastPriorStatus;
        let consecutive = 0;
        // Walk history newest→oldest to count consecutive failures.
        for (let i = priorRuns.length - 1; i >= 0; i--) {
            const rec = priorRuns[i].outcomes?.find(o => o.fullTitle === title);
            if (!rec)
                continue;
            seenBefore = true;
            if (lastPriorStatus === undefined)
                lastPriorStatus = rec.status;
            if (rec.status === 'failed') {
                consecutive++;
            }
            else {
                break;
            }
        }
        let state;
        if (!seenBefore)
            state = 'new';
        else if (lastPriorStatus === 'passed')
            state = 'regression';
        else
            state = 'recurring';
        // Current run's own failure counts toward the streak.
        out.set(t.id, { state, consecutive: consecutive + 1 });
    }
    return out;
}
/** High-level: what changed compared to the most recent prior run? */
function computeDiff(run, history) {
    const prior = [...history].reverse().find(h => h.runId !== run.id);
    if (!prior || !prior.outcomes)
        return null;
    const now = new Map(buildOutcomes(run).map(o => [o.fullTitle, o.status]));
    const then = new Map(prior.outcomes.map(o => [o.fullTitle, o.status]));
    const newFailures = [];
    const recovered = [];
    const stillFailing = [];
    let stillPassing = 0;
    for (const [title, nowStatus] of now) {
        const thenStatus = then.get(title);
        if (nowStatus === 'failed' && thenStatus !== 'failed')
            newFailures.push(title);
        else if (nowStatus === 'failed' && thenStatus === 'failed')
            stillFailing.push(title);
        else if (nowStatus === 'passed' && thenStatus === 'failed')
            recovered.push(title);
        else if (nowStatus === 'passed' && thenStatus === 'passed')
            stillPassing++;
    }
    return { newFailures, recovered, stillFailing, stillPassing };
}
//# sourceMappingURL=diff.js.map