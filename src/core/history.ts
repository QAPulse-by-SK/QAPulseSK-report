import * as fs from 'fs';
import * as path from 'path';
import { TestRun, TrendData, HistoryConfig } from './types';
import { buildOutcomes, HistoryEntry } from './diff';

const DEFAULT_HISTORY_FILE = '.qapulse-history.json';
const DEFAULT_MAX_RUNS = 20;

export class HistoryManager {
  private historyFile: string;
  private maxRuns: number;

  constructor(config: HistoryConfig) {
    this.historyFile = config.historyFile || DEFAULT_HISTORY_FILE;
    this.maxRuns = config.maxRuns || DEFAULT_MAX_RUNS;
  }

  load(): HistoryEntry[] {
    try {
      if (fs.existsSync(this.historyFile)) {
        const raw = fs.readFileSync(this.historyFile, 'utf-8');
        return JSON.parse(raw) as HistoryEntry[];
      }
    } catch {
      // History file corrupted or missing — start fresh
    }
    return [];
  }

  save(run: TestRun): HistoryEntry[] {
    const history = this.load();

    const entry: HistoryEntry = {
      runId: run.id,
      date: run.startTime.toISOString(),
      passed: run.stats.passed,
      failed: run.stats.failed,
      skipped: run.stats.skipped,
      duration: run.stats.duration,
      passRate: run.stats.passRate,
      outcomes: buildOutcomes(run),
    };

    history.push(entry);

    // Keep only last N runs
    const trimmed = history.slice(-this.maxRuns);

    try {
      const dir = path.dirname(this.historyFile);
      if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.historyFile, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch {
      // Non-fatal — trend data just won't persist
    }

    return trimmed;
  }

  getChartData(history: TrendData[]): { labels: string[]; passed: number[]; failed: number[]; passRate: number[] } {
    return {
      labels: history.map(h => {
        const d = new Date(h.date);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      }),
      passed: history.map(h => h.passed),
      failed: history.map(h => h.failed),
      passRate: history.map(h => h.passRate),
    };
  }
}

export function resolveHistoryPath(outputDir: string, historyFile?: string): string {
  return path.resolve(outputDir, historyFile || DEFAULT_HISTORY_FILE);
}
