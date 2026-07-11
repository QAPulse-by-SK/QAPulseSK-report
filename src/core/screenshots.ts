// QAPulseSK-report — screenshot collector
// Zero-dep: copies runner screenshots into the report dir, or inlines
// small ones as base64 data URIs so the HTML stays a single portable file.

import * as fs from 'fs';
import * as path from 'path';
import { TestRun, TestResult, Screenshot, ScreenshotConfig, TestSuite } from './types';
import { flattenTests } from './stats';

const DEFAULTS: Required<ScreenshotConfig> = {
  enabled: true,
  onFailure: true,
  onPass: false,
  inlineThresholdKb: 200,
  outputSubdir: 'screenshots',
};

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function inferMime(sourcePath: string, existing?: string): string {
  if (existing) return existing;
  const ext = path.extname(sourcePath).toLowerCase();
  return MIME_BY_EXT[ext] || 'image/png';
}

function safeFilename(runId: string, testId: string, idx: number, sourcePath: string): string {
  const ext = path.extname(sourcePath).toLowerCase() || '.png';
  const cleanTest = testId.replace(/[^a-z0-9]+/gi, '-').slice(0, 40).replace(/^-+|-+$/g, '');
  return `${runId}__${cleanTest || 'test'}__${idx}${ext}`;
}

function shouldInclude(status: TestResult['status'], cfg: Required<ScreenshotConfig>): boolean {
  if (status === 'failed') return cfg.onFailure;
  if (status === 'passed') return cfg.onPass;
  return false;
}

function processOne(
  shot: Screenshot,
  test: TestResult,
  runId: string,
  idx: number,
  outputDir: string,
  cfg: Required<ScreenshotConfig>
): Screenshot | null {
  if (!shot.sourcePath || !fs.existsSync(shot.sourcePath)) return null;

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
    } catch {
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
  } catch {
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
export function collectScreenshots(
  run: TestRun,
  outputDir: string,
  userConfig: ScreenshotConfig = {}
): void {
  const cfg: Required<ScreenshotConfig> = { ...DEFAULTS, ...userConfig };
  if (!cfg.enabled) return;

  const tests = flattenTests(run.suites);
  for (const test of tests) {
    if (!test.screenshots || test.screenshots.length === 0) continue;
    if (!shouldInclude(test.status, cfg)) {
      test.screenshots = [];
      continue;
    }
    const processed: Screenshot[] = [];
    test.screenshots.forEach((shot, idx) => {
      const out = processOne(shot, test, run.id, idx, outputDir, cfg);
      if (out) processed.push(out);
    });
    test.screenshots = processed;
  }
}

/** Convenience for adapters: build a Screenshot from a runner path. */
export function makeScreenshot(
  sourcePath: string,
  opts: Partial<Screenshot> = {}
): Screenshot {
  return {
    sourcePath,
    kind: 'onFailure',
    name: 'Failure screenshot',
    ...opts,
  };
}

/** Used by tests / debugging. */
export function _internalDefaults(): Required<ScreenshotConfig> {
  return { ...DEFAULTS };
}

// Suppress unused warning for TestSuite import in some tsconfigs
export type _S = TestSuite;
