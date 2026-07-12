// QAPulseSK-report — shared report generation pipeline
// Extracted from adapters to remove duplication. All adapters call generateReport().

import * as fs from 'fs';
import * as path from 'path';
import { TestRun, QAPulseReportConfig } from './types';
import { getFailedTests } from './stats';
import { generateHTML, writeReport } from './generator';
import { analyzeFailures } from '../ai/analyzer';
import { sendWebhooks } from '../webhooks/notifier';
import { HistoryManager } from './history';
import { collectScreenshots } from './screenshots';
import { clusterFailures } from './clustering';
import { detectMetadata, mergeMetadata } from './metadata';
import { classifyFailures, computeDiff, HistoryEntry, RunDiff, FailureState } from './diff';

const DEFAULTS: Required<Pick<QAPulseReportConfig, 'outputDir' | 'reportTitle' | 'openAfterGeneration'>> = {
  outputDir: 'qapulse-report',
  reportTitle: 'QAPulseSK Test Report',
  openAfterGeneration: false,
};

export function withDefaults(config: QAPulseReportConfig = {}): QAPulseReportConfig {
  return { ...DEFAULTS, ...config };
}

export async function generateReport(
  run: TestRun,
  config: QAPulseReportConfig
): Promise<string> {
  const outputDir = config.outputDir || DEFAULTS.outputDir;
  const reportTitle = config.reportTitle || DEFAULTS.reportTitle;

  // 0. Auto-detect git + CI metadata (unless disabled).
  if (!config.disableAutoMetadata) {
    run.metadata = mergeMetadata(run.metadata, detectMetadata());
  }

  // 1. Cluster failures (local, always). LLM analysis then runs once per
  //    cluster (representative test) instead of once per failed test.
  const failedTests = getFailedTests(run);
  const clusters = clusterFailures(failedTests);
  const representatives = clusters.map(c => c.tests[0]);

  const aiMap = config.ai?.enabled
    ? await analyzeFailures(representatives, config.ai)
    : new Map();

  if (aiMap.size > 0) {
    for (const cluster of clusters) {
      const rep = cluster.tests[0];
      const analysis = aiMap.get(rep.id);
      if (!analysis) continue;
      cluster.rootCause = analysis.rootCause;
      cluster.suggestedFix = analysis.suggestion;
      for (const t of cluster.tests.slice(1)) {
        aiMap.set(t.id, { ...analysis, testId: t.id });
      }
    }
  }

  // 2. History / trend + diff. We compute the diff against history BEFORE
  //    saving the current run so we compare against the previous run.
  let history: HistoryEntry[] = [];
  let diff: RunDiff | null = null;
  const failureStates = new Map<string, { state: FailureState; consecutive: number }>();

  if (config.history?.enabled) {
    const hm = new HistoryManager({
      ...config.history,
      historyFile: path.join(
        outputDir,
        config.history.historyFile || '.qapulse-history.json'
      ),
    });
    const priorHistory = hm.load();
    diff = computeDiff(run, priorHistory);
    const states = classifyFailures(run, priorHistory);
    for (const [k, v] of states) failureStates.set(k, v);
    history = hm.save(run);
  }

  // 3. Screenshots — copy / inline before HTML render
  collectScreenshots(run, outputDir, config.screenshots);

  // 4. HTML render + write
  const html = generateHTML(
    run,
    aiMap,
    history,
    reportTitle,
    config.logo,
    config.theme,
    clusters,
    diff,
    failureStates
  );
  const reportPath = writeReport(html, outputDir);

  // 5. JSON export (default on)
  if (config.emitJson !== false) {
    try {
      const jsonPath = path.join(outputDir, 'qapulse-report.json');
      fs.writeFileSync(
        jsonPath,
        JSON.stringify(
          {
            ...run,
            clusters,
            diff,
            failureStates: Array.from(failureStates.entries()).map(([testId, v]) => ({ testId, ...v })),
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch {
      // Non-fatal
    }
  }

  // 6. Webhooks (opt-in)
  if (config.webhooks) {
    await sendWebhooks(run, config.webhooks, { clusters, diff });
  }

  // 7. Console + open
  console.log(`\n✅ QAPulseSK Report generated: ${reportPath}`);
  console.log(`   Pass rate: ${run.stats.passRate}% (${run.stats.passed}/${run.stats.total})`);
  if (diff && (diff.newFailures.length || diff.recovered.length)) {
    const bits: string[] = [];
    if (diff.newFailures.length) bits.push(`+${diff.newFailures.length} new`);
    if (diff.recovered.length) bits.push(`-${diff.recovered.length} recovered`);
    console.log(`   Diff vs previous run: ${bits.join(', ')}`);
  }

  if (config.openAfterGeneration) {
    const { default: open } = await import('open');
    await open(reportPath);
  }

  return reportPath;
}
