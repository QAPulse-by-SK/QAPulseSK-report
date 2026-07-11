import { TestRun, Screenshot, ScreenshotConfig, TestSuite } from './types';
/**
 * Walk every test in the run, resolve each `screenshots[]` entry.
 * Small files become inline data URIs; larger ones are copied into
 * <outputDir>/<outputSubdir>/ and referenced relatively.
 * Mutates `test.screenshots` in place.
 */
export declare function collectScreenshots(run: TestRun, outputDir: string, userConfig?: ScreenshotConfig): void;
/** Convenience for adapters: build a Screenshot from a runner path. */
export declare function makeScreenshot(sourcePath: string, opts?: Partial<Screenshot>): Screenshot;
/** Used by tests / debugging. */
export declare function _internalDefaults(): Required<ScreenshotConfig>;
export type _S = TestSuite;
//# sourceMappingURL=screenshots.d.ts.map