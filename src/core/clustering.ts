// QAPulseSK-report — failure clustering
//
// Local stage (always runs): normalize each error message + top stack frame
// into a stable signature, then bucket by signature. Handles most duplicates
// (same assertion or timeout across many tests) with zero API cost.
//
// LLM stage (opt-in): the existing analyzer is invoked once per cluster
// instead of once per test, which cuts token spend proportionally to the
// dedup ratio.

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

const HEX_RE = /0x[0-9a-f]+/gi;
const NUM_RE = /\b\d+\b/g;
const PATH_LINE_RE = /(:\d+)(:\d+)?/g;
const ABS_PATH_RE = /(?:file:\/\/)?\/[^\s)'"]+/g;
const WIN_PATH_RE = /[A-Z]:\\[^\s)'"]+/g;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const TIMESTAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?/g;
const WHITESPACE_RE = /\s+/g;

function normalizeMessage(msg: string): string {
  return msg
    .replace(TIMESTAMP_RE, '<ts>')
    .replace(UUID_RE, '<uuid>')
    .replace(ABS_PATH_RE, '<path>')
    .replace(WIN_PATH_RE, '<path>')
    .replace(HEX_RE, '<hex>')
    .replace(PATH_LINE_RE, '')
    .replace(NUM_RE, 'N')
    .replace(WHITESPACE_RE, ' ')
    .trim()
    .slice(0, 300);
}

function topStackFrame(stack?: string): string {
  if (!stack) return '';
  const lines = stack.split('\n').map(l => l.trim()).filter(Boolean);
  // Skip the message line if it duplicates the error message.
  const framesOnly = lines.filter(l => l.startsWith('at ') || /:\d+:\d+\)?$/.test(l));
  if (framesOnly.length === 0) return '';
  return framesOnly[0]
    .replace(ABS_PATH_RE, '<path>')
    .replace(WIN_PATH_RE, '<path>')
    .replace(PATH_LINE_RE, '')
    .slice(0, 200);
}

/** Cheap non-crypto hash — good enough for cluster ids. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function signatureFor(error?: TestError): string {
  if (!error) return '<no-error>';
  const msg = normalizeMessage(error.message || '');
  const frame = topStackFrame(error.stack);
  return frame ? `${msg} @ ${frame}` : msg;
}

/**
 * Group failed tests by normalized error signature.
 * Passing / skipped tests are ignored — they never enter a cluster.
 */
export function clusterFailures(tests: TestResult[]): FailureCluster[] {
  const buckets = new Map<string, FailureCluster>();
  for (const t of tests) {
    if (t.status !== 'failed') continue;
    const sig = signatureFor(t.error);
    const id = 'c_' + hash(sig);
    let cluster = buckets.get(sig);
    if (!cluster) {
      cluster = { id, signature: sig, tests: [] };
      buckets.set(sig, cluster);
    }
    cluster.tests.push(t);
  }
  // Largest clusters first — most impactful failures at the top.
  return Array.from(buckets.values()).sort((a, b) => b.tests.length - a.tests.length);
}

/** Convenience: which cluster id does a given test belong to? */
export function clusterIdFor(test: TestResult): string {
  return 'c_' + hash(signatureFor(test.error));
}
