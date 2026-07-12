import { TestResult, TestError } from './types';
export interface FailureCluster {
    /** Stable id derived from the signature. */
    id: string;
    /** Human-readable normalized error signature. */
    signature: string;
    /** All failing tests that map to this cluster. */
    tests: TestResult[];
    /** Optional root-cause explanation (populated by LLM pass). */
    rootCause?: string;
    /** Optional suggested fix (populated by LLM pass). */
    suggestedFix?: string;
}
export declare function signatureFor(error?: TestError): string;
/**
 * Group failed tests by normalized error signature.
 * Passing / skipped tests are ignored — they never enter a cluster.
 */
export declare function clusterFailures(tests: TestResult[]): FailureCluster[];
/** Convenience: which cluster id does a given test belong to? */
export declare function clusterIdFor(test: TestResult): string;
//# sourceMappingURL=clustering.d.ts.map