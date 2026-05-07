import { TestRun } from '../core/types';
import { AIAnalysis } from '../ai/analyzer';
import { TrendData } from '../core/types';
export declare function generateHTML(run: TestRun, aiMap: Map<string, AIAnalysis>, history: TrendData[], reportTitle: string, logo?: string): string;
export declare function writeReport(html: string, outputDir: string, filename?: string): string;
//# sourceMappingURL=generator.d.ts.map