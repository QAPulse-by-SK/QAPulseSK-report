// Shared registry for adapters that don't get screenshots from their runner's API
// (Jest, Vitest, Puppeteer, Selenium, WebdriverIO can push into this from user hooks).
//
// Usage in a Jest globalSetup / afterEach:
//   const { attachScreenshot } = require('qapulsesk-report');
//   afterEach(async () => {
//     if (this.currentTest?.state === 'failed') {
//       const p = await page.screenshot({ path: `/tmp/${Date.now()}.png` });
//       attachScreenshot(expect.getState().currentTestName, p, { kind: 'onFailure' });
//     }
//   });

import { Screenshot } from './types';

const registry = new Map<string, Screenshot[]>();

function normalize(testName: string): string {
  return testName.trim().replace(/\s+/g, ' ');
}

export function attachScreenshot(
  testFullName: string,
  sourcePath: string,
  opts: Partial<Omit<Screenshot, 'sourcePath'>> = {}
): void {
  if (!testFullName || !sourcePath) return;
  const key = normalize(testFullName);
  const list = registry.get(key) || [];
  list.push({
    sourcePath,
    kind: opts.kind || 'onFailure',
    name: opts.name || 'Screenshot',
    contentType: opts.contentType,
  });
  registry.set(key, list);
}

export function drainScreenshots(testFullName: string): Screenshot[] {
  const key = normalize(testFullName);
  const list = registry.get(key) || [];
  registry.delete(key);
  return list;
}

export function _clearScreenshotRegistry(): void {
  registry.clear();
}
