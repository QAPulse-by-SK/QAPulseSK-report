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
exports.QAPulseJestReporter = void 0;
const path = __importStar(require("path"));
const stats_1 = require("../core/stats");
const orchestrator_1 = require("../core/orchestrator");
const screenshot_registry_1 = require("../core/screenshot-registry");
function mapJestStatus(status) {
    const map = {
        passed: 'passed',
        failed: 'failed',
        skipped: 'skipped',
        pending: 'pending',
        todo: 'pending',
        disabled: 'skipped',
    };
    return map[status] || 'failed';
}
function mapJestSuite(suite) {
    const tests = suite.testResults.map((t, i) => ({
        id: `${suite.testFilePath}-${i}`,
        title: t.title,
        fullTitle: t.fullName,
        status: mapJestStatus(t.status),
        duration: t.duration || 0,
        error: t.failureMessages.length > 0
            ? { message: t.failureMessages[0].split('\n')[0], stack: t.failureMessages[0] }
            : undefined,
        screenshots: (0, screenshot_registry_1.drainScreenshots)(t.fullName),
        file: suite.testFilePath,
    }));
    return {
        id: suite.testFilePath,
        title: path.basename(suite.testFilePath),
        file: suite.testFilePath,
        tests,
        duration: suite.perfStats.end - suite.perfStats.start,
    };
}
class QAPulseJestReporter {
    constructor(_globalConfig, options = {}) {
        this.config = (0, orchestrator_1.withDefaults)(options);
    }
    onRunStart() { }
    onTestStart(_test) { }
    onTestResult(_test, _testResult, _aggregatedResult) { }
    getLastError() { return undefined; }
    onTestContext(_testContext) { }
    async onRunComplete(_contexts, results) {
        const suites = results.testResults.map(mapJestSuite);
        const startTime = new Date(results.startTime);
        const endTime = new Date();
        const run = {
            id: (0, stats_1.generateRunId)(),
            title: this.config.reportTitle,
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            suites,
            stats: (0, stats_1.calculateStats)(suites),
            framework: 'jest',
        };
        await (0, orchestrator_1.generateReport)(run, this.config);
    }
}
exports.QAPulseJestReporter = QAPulseJestReporter;
exports.default = QAPulseJestReporter;
//# sourceMappingURL=jest.js.map