import { Screenshot } from './types';
export declare function attachScreenshot(testFullName: string, sourcePath: string, opts?: Partial<Omit<Screenshot, 'sourcePath'>>): void;
export declare function drainScreenshots(testFullName: string): Screenshot[];
export declare function _clearScreenshotRegistry(): void;
//# sourceMappingURL=screenshot-registry.d.ts.map