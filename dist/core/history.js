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
exports.HistoryManager = void 0;
exports.resolveHistoryPath = resolveHistoryPath;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEFAULT_HISTORY_FILE = '.qapulse-history.json';
const DEFAULT_MAX_RUNS = 20;
class HistoryManager {
    constructor(config) {
        this.historyFile = config.historyFile || DEFAULT_HISTORY_FILE;
        this.maxRuns = config.maxRuns || DEFAULT_MAX_RUNS;
    }
    load() {
        try {
            if (fs.existsSync(this.historyFile)) {
                const raw = fs.readFileSync(this.historyFile, 'utf-8');
                return JSON.parse(raw);
            }
        }
        catch {
            // History file corrupted or missing — start fresh
        }
        return [];
    }
    save(run) {
        const history = this.load();
        const entry = {
            runId: run.id,
            date: run.startTime.toISOString(),
            passed: run.stats.passed,
            failed: run.stats.failed,
            skipped: run.stats.skipped,
            duration: run.stats.duration,
            passRate: run.stats.passRate,
        };
        history.push(entry);
        // Keep only last N runs
        const trimmed = history.slice(-this.maxRuns);
        try {
            const dir = path.dirname(this.historyFile);
            if (dir && !fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.historyFile, JSON.stringify(trimmed, null, 2), 'utf-8');
        }
        catch {
            // Non-fatal — trend data just won't persist
        }
        return trimmed;
    }
    getChartData(history) {
        return {
            labels: history.map(h => {
                const d = new Date(h.date);
                return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
            }),
            passed: history.map(h => h.passed),
            failed: history.map(h => h.failed),
            passRate: history.map(h => h.passRate),
        };
    }
}
exports.HistoryManager = HistoryManager;
function resolveHistoryPath(outputDir, historyFile) {
    return path.resolve(outputDir, historyFile || DEFAULT_HISTORY_FILE);
}
//# sourceMappingURL=history.js.map