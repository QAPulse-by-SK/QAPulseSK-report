"use strict";
// QAPulseSK-report — shared report generation pipeline
// Extracted from adapters to remove duplication. All adapters call generateReport().
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
exports.withDefaults = withDefaults;
exports.generateReport = generateReport;
const path = __importStar(require("path"));
const stats_1 = require("./stats");
const generator_1 = require("./generator");
const analyzer_1 = require("../ai/analyzer");
const notifier_1 = require("../webhooks/notifier");
const history_1 = require("./history");
const screenshots_1 = require("./screenshots");
const DEFAULTS = {
    outputDir: 'qapulse-report',
    reportTitle: 'QAPulseSK Test Report',
    openAfterGeneration: false,
};
function withDefaults(config = {}) {
    return { ...DEFAULTS, ...config };
}
async function generateReport(run, config) {
    const outputDir = config.outputDir || DEFAULTS.outputDir;
    const reportTitle = config.reportTitle || DEFAULTS.reportTitle;
    // 1. AI analysis (opt-in)
    const aiMap = config.ai?.enabled
        ? await (0, analyzer_1.analyzeFailures)((0, stats_1.getFailedTests)(run), config.ai)
        : new Map();
    // 2. History / trend
    let history = [];
    if (config.history?.enabled) {
        const hm = new history_1.HistoryManager({
            ...config.history,
            historyFile: path.join(outputDir, config.history.historyFile || '.qapulse-history.json'),
        });
        history = hm.save(run);
    }
    // 3. Screenshots — copy / inline before HTML render
    (0, screenshots_1.collectScreenshots)(run, outputDir, config.screenshots);
    // 4. HTML render + write
    const html = (0, generator_1.generateHTML)(run, aiMap, history, reportTitle, config.logo);
    const reportPath = (0, generator_1.writeReport)(html, outputDir);
    // 4. Webhooks (opt-in)
    if (config.webhooks) {
        await (0, notifier_1.sendWebhooks)(run, config.webhooks);
    }
    // 5. Console + open
    console.log(`\n✅ QAPulseSK Report generated: ${reportPath}`);
    console.log(`   Pass rate: ${run.stats.passRate}% (${run.stats.passed}/${run.stats.total})`);
    if (config.openAfterGeneration) {
        const { default: open } = await Promise.resolve().then(() => __importStar(require('open')));
        await open(reportPath);
    }
    return reportPath;
}
//# sourceMappingURL=orchestrator.js.map