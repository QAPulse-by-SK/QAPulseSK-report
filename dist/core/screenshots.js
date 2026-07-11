"use strict";
// QAPulseSK-report — screenshot collector
// Zero-dep: copies runner screenshots into the report dir, or inlines
// small ones as base64 data URIs so the HTML stays a single portable file.
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
exports.collectScreenshots = collectScreenshots;
exports.makeScreenshot = makeScreenshot;
exports._internalDefaults = _internalDefaults;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const stats_1 = require("./stats");
const DEFAULTS = {
    enabled: true,
    onFailure: true,
    onPass: false,
    inlineThresholdKb: 200,
    outputSubdir: 'screenshots',
};
const MIME_BY_EXT = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};
function inferMime(sourcePath, existing) {
    if (existing)
        return existing;
    const ext = path.extname(sourcePath).toLowerCase();
    return MIME_BY_EXT[ext] || 'image/png';
}
function safeFilename(runId, testId, idx, sourcePath) {
    const ext = path.extname(sourcePath).toLowerCase() || '.png';
    const cleanTest = testId.replace(/[^a-z0-9]+/gi, '-').slice(0, 40).replace(/^-+|-+$/g, '');
    return `${runId}__${cleanTest || 'test'}__${idx}${ext}`;
}
function shouldInclude(status, cfg) {
    if (status === 'failed')
        return cfg.onFailure;
    if (status === 'passed')
        return cfg.onPass;
    return false;
}
function processOne(shot, test, runId, idx, outputDir, cfg) {
    if (!shot.sourcePath || !fs.existsSync(shot.sourcePath))
        return null;
    const stat = fs.statSync(shot.sourcePath);
    const contentType = inferMime(shot.sourcePath, shot.contentType);
    const inlineThresholdBytes = cfg.inlineThresholdKb * 1024;
    // Small file → inline as data URI, no disk copy needed.
    if (stat.size <= inlineThresholdBytes) {
        try {
            const b64 = fs.readFileSync(shot.sourcePath).toString('base64');
            return {
                ...shot,
                contentType,
                inlineDataUri: `data:${contentType};base64,${b64}`,
            };
        }
        catch {
            // fall through to disk copy
        }
    }
    // Large file → copy into <outputDir>/<outputSubdir>/
    const targetDir = path.join(outputDir, cfg.outputSubdir);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    const filename = safeFilename(runId, test.id, idx, shot.sourcePath);
    const targetPath = path.join(targetDir, filename);
    try {
        fs.copyFileSync(shot.sourcePath, targetPath);
    }
    catch {
        return null;
    }
    return {
        ...shot,
        contentType,
        relativePath: path.posix.join(cfg.outputSubdir, filename),
    };
}
/**
 * Walk every test in the run, resolve each `screenshots[]` entry.
 * Small files become inline data URIs; larger ones are copied into
 * <outputDir>/<outputSubdir>/ and referenced relatively.
 * Mutates `test.screenshots` in place.
 */
function collectScreenshots(run, outputDir, userConfig = {}) {
    const cfg = { ...DEFAULTS, ...userConfig };
    if (!cfg.enabled)
        return;
    const tests = (0, stats_1.flattenTests)(run.suites);
    for (const test of tests) {
        if (!test.screenshots || test.screenshots.length === 0)
            continue;
        if (!shouldInclude(test.status, cfg)) {
            test.screenshots = [];
            continue;
        }
        const processed = [];
        test.screenshots.forEach((shot, idx) => {
            const out = processOne(shot, test, run.id, idx, outputDir, cfg);
            if (out)
                processed.push(out);
        });
        test.screenshots = processed;
    }
}
/** Convenience for adapters: build a Screenshot from a runner path. */
function makeScreenshot(sourcePath, opts = {}) {
    return {
        sourcePath,
        kind: 'onFailure',
        name: 'Failure screenshot',
        ...opts,
    };
}
/** Used by tests / debugging. */
function _internalDefaults() {
    return { ...DEFAULTS };
}
//# sourceMappingURL=screenshots.js.map