"use strict";
// WebdriverIO reporter adapter for QAPulseSK-report.
// Implements the WDIO Reporter contract without pulling @wdio/reporter as a hard dep.
//
// Usage in wdio.conf.ts:
//   import QAPulseWDIOReporter from 'qapulsesk-report/webdriverio';
//   export const config = {
//     reporters: [
//       [QAPulseWDIOReporter, { reportTitle: 'WDIO Suite', history: { enabled: true } }],
//     ],
//   };
//
// Screenshots on failure: users call `browser.takeScreenshot()` in an afterTest hook
// and pass the path via attachScreenshot(fullTitle, path).
Object.defineProperty(exports, "__esModule", { value: true });
exports.QAPulseWebdriverIOReporter = void 0;
const stats_1 = require("../core/stats");
const orchestrator_1 = require("../core/orchestrator");
const screenshot_registry_1 = require("../core/screenshot-registry");
/* eslint-enable @typescript-eslint/no-explicit-any */
function mapWDIOStatus(state) {
    const map = {
        passed: 'passed', failed: 'failed', skipped: 'skipped', pending: 'pending',
    };
    return map[state || ''] || 'failed';
}
function collectShots(t, status) {
    const shots = [...(0, screenshot_registry_1.drainScreenshots)(t.fullTitle || t.title || '')];
    // WDIO 8+ exposes any custom attachments on `t.output` — pick image-like ones
    const output = (t.output || []);
    for (const o of output) {
        if (o?.type === 'screenshot' && o.value) {
            shots.push({
                sourcePath: o.value,
                kind: status === 'failed' ? 'onFailure' : 'manual',
                name: 'Screenshot',
            });
        }
    }
    return shots;
}
class QAPulseWebdriverIOReporter {
    // WDIO Reporter contract flag — tells WDIO to wait for onRunnerEnd to resolve
    get isSynchronised() { return true; }
    constructor(options = {}) {
        this.startTime = new Date();
        // Suite UID -> { title, tests }
        this.suites = new Map();
        this.config = (0, orchestrator_1.withDefaults)(options);
    }
    onRunnerStart(_runner) {
        this.startTime = new Date();
    }
    onSuiteStart(suite) {
        const uid = suite.uid || suite.title;
        if (!this.suites.has(uid)) {
            this.suites.set(uid, { title: suite.title || 'Suite', file: suite.file, tests: [] });
        }
    }
    onTestEnd(test) {
        const status = mapWDIOStatus(test.state);
        const suiteUid = test.parent || test.parentUid || 'default';
        const bucket = this.suites.get(suiteUid) || { title: test.parent || 'Suite', tests: [] };
        bucket.tests.push({
            id: test.uid || `${suiteUid}-${bucket.tests.length}`,
            title: test.title || '',
            fullTitle: test.fullTitle || test.title || '',
            status,
            duration: test._duration || test.duration || 0,
            error: test.error ? { message: test.error.message || String(test.error), stack: test.error.stack } : undefined,
            screenshots: collectShots(test, status),
            file: test.file,
        });
        this.suites.set(suiteUid, bucket);
    }
    async onRunnerEnd(_runner) {
        const endTime = new Date();
        const suites = Array.from(this.suites.entries()).map(([uid, s]) => ({
            id: uid,
            title: s.title,
            file: s.file,
            tests: s.tests,
            duration: s.tests.reduce((sum, t) => sum + t.duration, 0),
        }));
        const run = {
            id: (0, stats_1.generateRunId)(),
            title: this.config.reportTitle,
            startTime: this.startTime,
            endTime,
            duration: endTime.getTime() - this.startTime.getTime(),
            suites,
            stats: (0, stats_1.calculateStats)(suites),
            framework: 'webdriverio',
        };
        await (0, orchestrator_1.generateReport)(run, this.config);
    }
}
exports.QAPulseWebdriverIOReporter = QAPulseWebdriverIOReporter;
exports.default = QAPulseWebdriverIOReporter;
//# sourceMappingURL=webdriverio.js.map