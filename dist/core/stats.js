"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateStats = calculateStats;
exports.flattenTests = flattenTests;
exports.getFailedTests = getFailedTests;
exports.flattenSuites = flattenSuites;
exports.formatDuration = formatDuration;
exports.generateRunId = generateRunId;
function calculateStats(suites) {
    const allTests = flattenTests(suites);
    const total = allTests.length;
    const passed = allTests.filter(t => t.status === 'passed').length;
    const failed = allTests.filter(t => t.status === 'failed').length;
    const skipped = allTests.filter(t => t.status === 'skipped').length;
    const pending = allTests.filter(t => t.status === 'pending').length;
    const duration = allTests.reduce((sum, t) => sum + t.duration, 0);
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { total, passed, failed, skipped, pending, passRate, duration };
}
function flattenTests(suites) {
    const results = [];
    for (const suite of suites) {
        results.push(...suite.tests);
        if (suite.suites) {
            results.push(...flattenTests(suite.suites));
        }
    }
    return results;
}
function getFailedTests(run) {
    return flattenTests(run.suites).filter(t => t.status === 'failed');
}
function flattenSuites(suites) {
    const out = [];
    for (const s of suites) {
        out.push(s);
        if (s.suites)
            out.push(...flattenSuites(s.suites));
    }
    return out;
}
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}
function generateRunId() {
    return `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
//# sourceMappingURL=stats.js.map