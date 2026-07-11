// QAPulseSK-report — shared report generation pipeline
// Extracted from adapters to remove duplication. All adapters call generateReport().

import * as path from 'path';
import { TestRun, QAPulseReportConfig, TrendData } from './types';
import { getFailedTests } from './stats';
import { generateHTML, writeReport } from './generator';
import { analyzeFailures } from '../ai/analyzer';
import { sendWebhooks } from '../webhooks/notifier';
import { HistoryManager } from './history';
import { collectScreenshots } from './screenshots';

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

  // 1. AI analysis (opt-in)
  const aiMap = config.ai?.enabled
    ? await analyzeFailures(getFailedTests(run), config.ai)
    : new Map();

  // 2. History / trend
  let history: TrendData[] = [];
  if (config.history?.enabled) {
    const hm = new HistoryManager({
      ...config.history,
      historyFile: path.join(
        outputDir,
        config.history.historyFile || '.qapulse-history.json'
      ),
    });
    history = hm.save(run);
  }

  // 3. Screenshots — copy / inline before HTML render
  collectScreenshots(run, outputDir, config.screenshots);

  // 4. HTML render + write
  const html = generateHTML(run, aiMap, history, reportTitle, config.logo);
  const reportPath = writeReport(html, outputDir);

  // 4. Webhooks (opt-in)
  if (config.webhooks) {
    await sendWebhooks(run, config.webhooks);
  }

  // 5. Console + open
  console.log(`\n✅ QAPulseSK Report generated: ${reportPath}`);
  console.log(`   Pass rate: ${run.stats.passRate}% (${run.stats.passed}/${run.stats.total})`);

  if (config.openAfterGeneration) {
    const { default: open } = await import('open');
    await open(reportPath);
  }

  return reportPath;
}
