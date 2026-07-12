import { RunMetadata } from './types';
export declare function detectMetadata(): RunMetadata;
/** Merge auto-detected metadata with any pre-existing metadata (user wins). */
export declare function mergeMetadata(existing: RunMetadata | undefined, detected: RunMetadata): RunMetadata;
//# sourceMappingURL=metadata.d.ts.map