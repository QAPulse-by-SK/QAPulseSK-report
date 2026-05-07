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
exports.QAPulsePlaywrightReporter = void 0;
const path = __importStar(require("path"));
const stats_1 = require("../core/stats");
const generator_1 = require("../core/generator");
const analyzer_1 = require("../ai/analyzer");
const notifier_1 = require("../webhooks/notifier");
const history_1 = require("../core/history");
/* eslint-enable @typescript-eslint/no-explicit-any */
function mapStatus(status) {
    const map = {
        passed: 'passed', failed: 'failed', timedOut: 'failed', skipped: 'skipped', interrupted: 'failed',
    };
    return map[status] || 'failed';
}
function mapError(result) {
    const err = result.errors?.[0];
    if (!err)
        return undefined;
    return { message: err.message || String(err), stack: err.stack };
}
function mapSuite(suite, file) {
    const tests = (suite.tests?.() || []).map((tc) => {
        const result = tc.results?.[tc.results.length - 1];
        return {
            id: tc.id, title: tc.title,
            fullTitle: tc.titlePath?.().join(' > ') || tc.title,
            status: result ? mapStatus(result.status) : 'skipped',
            duration: result?.duration || 0,
            error: result ? mapError(result) : undefined,
            retries: tc.retries, file: tc.location?.file, line: tc.location?.line,
        };
    });
    const suites = (suite.suites || []).map((s) => mapSuite(s, file));
    return {
        id: suite.title, title: suite.title || path.basename(file || 'Suite'),
        file, tests, suites, duration: tests.reduce((s, t) => s + t.duration, 0),
    };
}
class QAPulsePlaywrightReporter {
    constructor(config = {}) {
        this.startTime = new Date();
        this.suites = [];
        this.config = { outputDir: 'qapulse-report', reportTitle: 'QAPulseSK Test Report', openAfterGeneration: false, ...config };
    }
    onBegin(_config, suite) {
        this.startTime = new Date();
        this.suites = (suite.suites || []).map((s) => mapSuite(s, s.location?.file));
    }
    async onEnd(result) {
        const endTime = new Date();
        const run = {
            id: (0, stats_1.generateRunId)(), title: this.config.reportTitle, startTime: this.startTime, endTime,
            duration: endTime.getTime() - this.startTime.getTime(),
            suites: this.suites, stats: (0, stats_1.calculateStats)(this.suites), framework: 'playwright',
            metadata: { status: result.status },
        };
        await this._generate(run);
    }
    async _generate(run) {
        const outputDir = this.config.outputDir;
        const aiMap = this.config.ai?.enabled ? await (0, analyzer_1.analyzeFailures)((0, stats_1.getFailedTests)(run), this.config.ai) : new Map();
        let history = [];
        if (this.config.history?.enabled) {
            const hm = new history_1.HistoryManager({ ...this.config.history, historyFile: path.join(outputDir, this.config.history.historyFile || '.qapulse-history.json') });
            history = hm.save(run);
        }
        const html = (0, generator_1.generateHTML)(run, aiMap, history, this.config.reportTitle, this.config.logo);
        const reportPath = (0, generator_1.writeReport)(html, outputDir);
        if (this.config.webhooks)
            await (0, notifier_1.sendWebhooks)(run, this.config.webhooks);
        console.log(`\n✅ QAPulseSK Report generated: ${reportPath}`);
        if (this.config.openAfterGeneration) {
            const { default: open } = await Promise.resolve().then(() => __importStar(require('open')));
            await open(reportPath);
        }
    }
}
exports.QAPulsePlaywrightReporter = QAPulsePlaywrightReporter;
exports.default = QAPulsePlaywrightReporter;
//# sourceMappingURL=playwright.js.map