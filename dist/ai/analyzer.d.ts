import { TestResult, AIConfig } from '../core/types';
export interface AIAnalysis {
    testId: string;
    summary: string;
    rootCause: string;
    suggestion: string;
    confidence: 'high' | 'medium' | 'low';
}
export declare function analyzeFailures(failedTests: TestResult[], config: AIConfig): Promise<Map<string, AIAnalysis>>;
//# sourceMappingURL=analyzer.d.ts.map