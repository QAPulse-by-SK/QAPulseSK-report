"use strict";
// QAPulseSK-report — All-in-one test reporter by QAPulse by SK
// https://skakarh.com · https://github.com/QAPulse-by-SK
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryManager = exports.getFailedTests = exports.formatDuration = exports.calculateStats = exports.writeReport = exports.generateHTML = exports.sendWebhooks = exports.analyzeFailures = exports.qapulseCypressPlugin = exports.QAPulseVitestReporter = exports.QAPulseJestReporter = exports.QAPulsePlaywrightReporter = void 0;
var playwright_1 = require("./adapters/playwright");
Object.defineProperty(exports, "QAPulsePlaywrightReporter", { enumerable: true, get: function () { return playwright_1.QAPulsePlaywrightReporter; } });
var jest_1 = require("./adapters/jest");
Object.defineProperty(exports, "QAPulseJestReporter", { enumerable: true, get: function () { return jest_1.QAPulseJestReporter; } });
var vitest_1 = require("./adapters/vitest");
Object.defineProperty(exports, "QAPulseVitestReporter", { enumerable: true, get: function () { return vitest_1.QAPulseVitestReporter; } });
var cypress_1 = require("./adapters/cypress");
Object.defineProperty(exports, "qapulseCypressPlugin", { enumerable: true, get: function () { return cypress_1.qapulseCypressPlugin; } });
var analyzer_1 = require("./ai/analyzer");
Object.defineProperty(exports, "analyzeFailures", { enumerable: true, get: function () { return analyzer_1.analyzeFailures; } });
var notifier_1 = require("./webhooks/notifier");
Object.defineProperty(exports, "sendWebhooks", { enumerable: true, get: function () { return notifier_1.sendWebhooks; } });
var generator_1 = require("./core/generator");
Object.defineProperty(exports, "generateHTML", { enumerable: true, get: function () { return generator_1.generateHTML; } });
Object.defineProperty(exports, "writeReport", { enumerable: true, get: function () { return generator_1.writeReport; } });
var stats_1 = require("./core/stats");
Object.defineProperty(exports, "calculateStats", { enumerable: true, get: function () { return stats_1.calculateStats; } });
Object.defineProperty(exports, "formatDuration", { enumerable: true, get: function () { return stats_1.formatDuration; } });
Object.defineProperty(exports, "getFailedTests", { enumerable: true, get: function () { return stats_1.getFailedTests; } });
var history_1 = require("./core/history");
Object.defineProperty(exports, "HistoryManager", { enumerable: true, get: function () { return history_1.HistoryManager; } });
//# sourceMappingURL=index.js.map