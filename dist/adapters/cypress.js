"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.qapulseCypressPlugin = qapulseCypressPlugin;
const path = __importStar(require("path"));
const stats_1 = require("../core/stats");
const orchestrator_1 = require("../core/orchestrator");
function mapCypressState(state) {
    const map = {
        passed: 'passed', failed: 'failed', pending: 'pending', skipped: 'skipped',
    };
    return map[state] || 'failed';
}
function mapCypressRun(run) {
    // Build a lookup: testId -> screenshots[] (Cypress emits screenshots at run level)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shotsByTestId = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (run.screenshots || [])) {
        if (!s?.path)
            continue;
        const key = s.testId || s.testAttemptIndex != null ? String(s.testId) : '';
        if (!key)
            continue;
        const list = shotsByTestId.get(key) || [];
        list.push({
            sourcePath: s.path,
            kind: 'onFailure',
            name: s.name || 'Failure screenshot',
        });
        shotsByTestId.set(key, list);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tests = (run.tests || []).map((t, i) => {
        const lastAttempt = t.attempts?.[t.attempts.length - 1];
        const testKey = t.testId || '';
        return {
            id: `${run.spec?.relative}-${i}`,
            title: t.title?.[t.title.length - 1] || 'Test',
            fullTitle: (t.title || []).join(' > '),
            status: mapCypressState(t.state),
            duration: t.wallClockDuration || lastAttempt?.wallClockDuration || 0,
            error: lastAttempt?.error ? { message: lastAttempt.error.message, stack: lastAttempt.error.stack } : undefined,
            screenshots: shotsByTestId.get(testKey) || [],
            retries: (t.attempts?.length || 1) - 1,
            file: run.spec?.relative,
        };
    });
    return {
        id: run.spec?.relative || 'suite',
        title: path.basename(run.spec?.relative || 'suite'),
        file: run.spec?.relative,
        tests,
        duration: run.stats?.duration || 0,
    };
}
function qapulseCypressPlugin(on, _config, reportConfig = {}) {
    const config = (0, orchestrator_1.withDefaults)(reportConfig);
    on('after:run', async (results) => {
        const suites = (results.runs || []).map(mapCypressRun);
        const startTime = new Date(results.startedTestsAt);
        const endTime = new Date(results.endedTestsAt);
        const run = {
            id: (0, stats_1.generateRunId)(),
            title: config.reportTitle,
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            suites,
            stats: (0, stats_1.calculateStats)(suites),
            framework: 'cypress',
        };
        await (0, orchestrator_1.generateReport)(run, config);
    });
}
exports.default = qapulseCypressPlugin;
//# sourceMappingURL=cypress.js.map