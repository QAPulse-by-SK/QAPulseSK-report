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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const stats_1 = require("./stats");
const generator_1 = require("./generator");
const analyzer_1 = require("../ai/analyzer");
const notifier_1 = require("../webhooks/notifier");
const history_1 = require("./history");
const screenshots_1 = require("./screenshots");
const clustering_1 = require("./clustering");
const metadata_1 = require("./metadata");
const diff_1 = require("./diff");
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
    // 0. Auto-detect git + CI metadata (unless disabled).
    if (!config.disableAutoMetadata) {
        run.metadata = (0, metadata_1.mergeMetadata)(run.metadata, (0, metadata_1.detectMetadata)());
    }
    // 1. Cluster failures (local, always). LLM analysis then runs once per
    //    cluster (representative test) instead of once per failed test.
    const failedTests = (0, stats_1.getFailedTests)(run);
    const clusters = (0, clustering_1.clusterFailures)(failedTests);
    const representatives = clusters.map(c => c.tests[0]);
    const aiMap = config.ai?.enabled
        ? await (0, analyzer_1.analyzeFailures)(representatives, config.ai)
        : new Map();
    if (aiMap.size > 0) {
        for (const cluster of clusters) {
            const rep = cluster.tests[0];
            const analysis = aiMap.get(rep.id);
            if (!analysis)
                continue;
            cluster.rootCause = analysis.rootCause;
            cluster.suggestedFix = analysis.suggestion;
            for (const t of cluster.tests.slice(1)) {
                aiMap.set(t.id, { ...analysis, testId: t.id });
            }
        }
    }
    // 2. History / trend + diff. We compute the diff against history BEFORE
    //    saving the current run so we compare against the previous run.
    let history = [];
    let diff = null;
    const failureStates = new Map();
    if (config.history?.enabled) {
        const hm = new history_1.HistoryManager({
            ...config.history,
            historyFile: path.join(outputDir, config.history.historyFile || '.qapulse-history.json'),
        });
        const priorHistory = hm.load();
        diff = (0, diff_1.computeDiff)(run, priorHistory);
        const states = (0, diff_1.classifyFailures)(run, priorHistory);
        for (const [k, v] of states)
            failureStates.set(k, v);
        history = hm.save(run);
    }
    // 3. Screenshots — copy / inline before HTML render
    (0, screenshots_1.collectScreenshots)(run, outputDir, config.screenshots);
    // 4. HTML render + write
    const html = (0, generator_1.generateHTML)(run, aiMap, history, reportTitle, config.logo, config.theme, clusters, diff, failureStates);
    const reportPath = (0, generator_1.writeReport)(html, outputDir);
    // 5. JSON export (default on)
    if (config.emitJson !== false) {
        try {
            const jsonPath = path.join(outputDir, 'qapulse-report.json');
            fs.writeFileSync(jsonPath, JSON.stringify({
                ...run,
                clusters,
                diff,
                failureStates: Array.from(failureStates.entries()).map(([testId, v]) => ({ testId, ...v })),
            }, null, 2), 'utf-8');
        }
        catch {
            // Non-fatal
        }
    }
    // 6. Webhooks (opt-in)
    if (config.webhooks) {
        await (0, notifier_1.sendWebhooks)(run, config.webhooks, { clusters, diff });
    }
    // 7. Console + open
    console.log(`\n✅ QAPulseSK Report generated: ${reportPath}`);
    console.log(`   Pass rate: ${run.stats.passRate}% (${run.stats.passed}/${run.stats.total})`);
    if (diff && (diff.newFailures.length || diff.recovered.length)) {
        const bits = [];
        if (diff.newFailures.length)
            bits.push(`+${diff.newFailures.length} new`);
        if (diff.recovered.length)
            bits.push(`-${diff.recovered.length} recovered`);
        console.log(`   Diff vs previous run: ${bits.join(', ')}`);
    }
    if (config.openAfterGeneration) {
        const { default: open } = await Promise.resolve().then(() => __importStar(require('open')));
        await open(reportPath);
    }
    return reportPath;
}
//# sourceMappingURL=orchestrator.js.map