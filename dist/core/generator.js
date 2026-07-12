"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHTML = generateHTML;
exports.writeReport = writeReport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const stats_1 = require("../core/stats");
const themes_1 = require("./themes");
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function statusBadge(status) {
    const map = {
        passed: '<span class="badge badge-pass">PASS</span>',
        failed: '<span class="badge badge-fail">FAIL</span>',
        skipped: '<span class="badge badge-skip">SKIP</span>',
        pending: '<span class="badge badge-skip">PEND</span>',
    };
    return map[status] || `<span class="badge">${status.toUpperCase()}</span>`;
}
function renderMetadataBar(meta) {
    if (!meta || (!meta.git && !meta.ci))
        return '';
    const g = meta.git || {};
    const c = meta.ci || {};
    const bits = [];
    if (g.branch)
        bits.push(`<span class="meta-item"><b>branch</b> ${escapeHtml(g.branch)}</span>`);
    if (g.commitShort) {
        const msg = g.commitMessage ? ` — ${escapeHtml(g.commitMessage.slice(0, 60))}` : '';
        bits.push(`<span class="meta-item"><b>commit</b> <code>${escapeHtml(g.commitShort)}</code>${msg}</span>`);
    }
    if (g.author)
        bits.push(`<span class="meta-item"><b>author</b> ${escapeHtml(g.author)}</span>`);
    if (c.prNumber) {
        const prLabel = c.prUrl ? `<a href="${escapeHtml(c.prUrl)}" target="_blank">#${escapeHtml(c.prNumber)}</a>` : `#${escapeHtml(c.prNumber)}`;
        bits.push(`<span class="meta-item"><b>PR</b> ${prLabel}</span>`);
    }
    if (c.jobUrl)
        bits.push(`<span class="meta-item"><b>${escapeHtml(c.provider || 'ci')}</b> <a href="${escapeHtml(c.jobUrl)}" target="_blank">job ↗</a></span>`);
    else if (c.provider)
        bits.push(`<span class="meta-item"><b>${escapeHtml(c.provider)}</b></span>`);
    if (bits.length === 0)
        return '';
    return `<div class="meta-bar">${bits.join('')}</div>`;
}
function renderDiffBanner(diff) {
    if (!diff)
        return '';
    if (!diff.newFailures.length && !diff.recovered.length && !diff.stillFailing.length)
        return '';
    const parts = [];
    if (diff.newFailures.length)
        parts.push(`<span class="diff-new">+${diff.newFailures.length} new</span>`);
    if (diff.recovered.length)
        parts.push(`<span class="diff-rec">−${diff.recovered.length} recovered</span>`);
    if (diff.stillFailing.length)
        parts.push(`<span class="diff-same">${diff.stillFailing.length} still failing</span>`);
    return `<div class="diff-banner">vs previous run: ${parts.join(' · ')}</div>`;
}
function renderFailureStateBadge(state) {
    if (!state)
        return '';
    const map = {
        'new': { emoji: '🆕', label: 'new', cls: 'fs-new' },
        'regression': { emoji: '💥', label: 'regression', cls: 'fs-reg' },
        'recurring': { emoji: '🔁', label: `recurring (×${state.consecutive})`, cls: 'fs-rec' },
    };
    const b = map[state.state];
    return `<span class="fs-badge ${b.cls}">${b.emoji} ${b.label}</span>`;
}
function renderScreenshots(test) {
    const shots = test.screenshots || [];
    if (shots.length === 0)
        return '';
    const items = shots.map((s, i) => {
        const src = s.inlineDataUri || s.relativePath || '';
        if (!src)
            return '';
        const label = escapeHtml(s.name || `Screenshot ${i + 1}`);
        const kindBadge = s.kind === 'onFailure'
            ? '<span class="shot-kind shot-fail">on failure</span>'
            : `<span class="shot-kind">${escapeHtml(s.kind)}</span>`;
        return `
      <figure class="shot">
        <img src="${src}" alt="${label}" loading="lazy" onclick="qpLightbox('${src}','${label}')" />
        <figcaption>${label} ${kindBadge}</figcaption>
      </figure>`;
    }).join('');
    return `<div class="shots-gallery"><div class="shots-title">📷 Screenshots (${shots.length})</div><div class="shots-grid">${items}</div></div>`;
}
function renderTestRow(test, aiMap, failureStates = new Map()) {
    const ai = aiMap.get(test.id);
    const errorBlock = test.error
        ? `<div class="error-block">
        <div class="error-message">${escapeHtml(test.error.message)}</div>
        ${test.error.stack ? `<pre class="stack-trace">${escapeHtml(test.error.stack.split('\n').slice(0, 8).join('\n'))}</pre>` : ''}
        ${test.error.expected ? `<div class="diff-row"><span class="diff-label expected">Expected</span><code>${escapeHtml(test.error.expected)}</code></div>` : ''}
        ${test.error.actual ? `<div class="diff-row"><span class="diff-label actual">Actual</span><code>${escapeHtml(test.error.actual)}</code></div>` : ''}
      </div>` : '';
    const aiBlock = ai
        ? `<div class="ai-block">
        <div class="ai-header">🤖 AI Analysis <span class="ai-confidence confidence-${ai.confidence}">${ai.confidence} confidence</span></div>
        <div class="ai-row"><strong>Summary:</strong> ${escapeHtml(ai.summary)}</div>
        <div class="ai-row"><strong>Root cause:</strong> ${escapeHtml(ai.rootCause)}</div>
        <div class="ai-row"><strong>Suggestion:</strong> ${escapeHtml(ai.suggestion)}</div>
      </div>` : '';
    const shotsBlock = renderScreenshots(test);
    const hasDetails = test.error || ai || shotsBlock;
    return `
    <tr class="test-row test-${test.status}" ${hasDetails ? `onclick="toggleDetails('${test.id}')"` : ''} ${hasDetails ? 'style="cursor:pointer"' : ''}>
      <td>${statusBadge(test.status)}</td>
      <td class="test-title">${escapeHtml(test.fullTitle)} ${renderFailureStateBadge(failureStates.get(test.id))}</td>
      <td class="test-duration">${(0, stats_1.formatDuration)(test.duration)}</td>
      <td class="test-file">${escapeHtml(test.file || '')}</td>
    </tr>
    ${hasDetails ? `<tr class="details-row" id="details-${test.id}" style="display:none">
      <td colspan="4">${errorBlock}${shotsBlock}${aiBlock}</td>
    </tr>` : ''}
  `;
}
function renderSuite(suite, aiMap, depth = 0, failureStates = new Map()) {
    const indent = depth > 0 ? `style="margin-left:${depth * 16}px"` : '';
    const rows = suite.tests.map(t => renderTestRow(t, aiMap, failureStates)).join('');
    const nested = (suite.suites || []).map(s => renderSuite(s, aiMap, depth + 1, failureStates)).join('');
    return `
    <div class="suite" ${indent}>
      <div class="suite-header">
        <span class="suite-title">${escapeHtml(suite.title)}</span>
        <span class="suite-meta">${suite.tests.length} tests · ${(0, stats_1.formatDuration)(suite.duration)}</span>
      </div>
      ${rows || nested ? `<table class="test-table"><thead><tr><th>Status</th><th>Test</th><th>Duration</th><th>File</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
      ${nested}
    </div>
  `;
}
function renderSuiteMatrix(run, themeVars) {
    const suites = (0, stats_1.flattenSuites)(run.suites).filter(s => s.tests.length > 0);
    if (suites.length < 2)
        return '';
    const cells = suites.map(s => {
        const passed = s.tests.filter(t => t.status === 'passed').length;
        const failed = s.tests.filter(t => t.status === 'failed').length;
        const total = s.tests.length;
        const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
        const color = pct === 100 ? themeVars.green : pct >= 80 ? themeVars.amber : themeVars.red;
        const label = escapeHtml(s.title);
        return `
      <div class="matrix-cell" style="background:${color};opacity:${0.35 + (pct / 100) * 0.55}" title="${label}: ${passed}/${total} passed (${failed} failed)">
        <div class="matrix-cell-label">${label}</div>
        <div class="matrix-cell-pct">${pct}%</div>
      </div>`;
    }).join('');
    return `
    <div class="insight-card">
      <div class="insight-title">Suite health (${suites.length} suites)</div>
      <div class="matrix-grid">${cells}</div>
    </div>`;
}
function renderDurationHistogram(run, themeVars) {
    const tests = (0, stats_1.flattenTests)(run.suites).filter(t => t.duration > 0);
    if (tests.length < 3)
        return '';
    const buckets = [
        { label: '<100ms', max: 100, count: 0 },
        { label: '100ms–1s', max: 1000, count: 0 },
        { label: '1–5s', max: 5000, count: 0 },
        { label: '5–15s', max: 15000, count: 0 },
        { label: '15–30s', max: 30000, count: 0 },
        { label: '>30s', max: Infinity, count: 0 },
    ];
    for (const t of tests) {
        const b = buckets.find(b => t.duration <= b.max);
        if (b)
            b.count++;
    }
    const max = Math.max(...buckets.map(b => b.count), 1);
    const bars = buckets.map(b => {
        const h = Math.round((b.count / max) * 80);
        return `
      <div class="histo-col">
        <div class="histo-count">${b.count}</div>
        <div class="histo-bar" style="height:${h}px;background:${themeVars.blue}"></div>
        <div class="histo-label">${b.label}</div>
      </div>`;
    }).join('');
    return `
    <div class="insight-card">
      <div class="insight-title">Duration distribution</div>
      <div class="histo-grid">${bars}</div>
    </div>`;
}
function renderTopSlowest(run, themeVars) {
    const tests = (0, stats_1.flattenTests)(run.suites).filter(t => t.duration > 0);
    if (tests.length < 3)
        return '';
    const top = [...tests].sort((a, b) => b.duration - a.duration).slice(0, 10);
    const max = top[0].duration || 1;
    const rows = top.map(t => {
        const w = Math.round((t.duration / max) * 100);
        const color = t.status === 'failed' ? themeVars.red : themeVars.blue;
        return `
      <div class="slow-row">
        <div class="slow-title" title="${escapeHtml(t.fullTitle)}">${escapeHtml(t.fullTitle)}</div>
        <div class="slow-bar-wrap"><div class="slow-bar" style="width:${w}%;background:${color}"></div></div>
        <div class="slow-time">${(0, stats_1.formatDuration)(t.duration)}</div>
      </div>`;
    }).join('');
    return `
    <div class="insight-card">
      <div class="insight-title">Top ${top.length} slowest tests</div>
      <div class="slow-list">${rows}</div>
    </div>`;
}
function renderFailureTimeline(run, themeVars) {
    const suites = (0, stats_1.flattenSuites)(run.suites).filter(s => s.tests.length >= 2);
    if (suites.length === 0)
        return '';
    const rows = suites.slice(0, 20).map(s => {
        const cells = s.tests.map(t => {
            const color = t.status === 'passed' ? themeVars.green :
                t.status === 'failed' ? themeVars.red :
                    t.status === 'skipped' ? themeVars.muted :
                        themeVars.amber;
            return `<span class="tl-cell" style="background:${color}" title="${escapeHtml(t.fullTitle)} — ${t.status}"></span>`;
        }).join('');
        return `
      <div class="tl-row">
        <div class="tl-label" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</div>
        <div class="tl-strip">${cells}</div>
        <div class="tl-count">${s.tests.length}</div>
      </div>`;
    }).join('');
    return `
    <div class="insight-card">
      <div class="insight-title">Execution timeline (per suite, in run order)</div>
      <div class="tl-legend">
        <span><i style="background:${themeVars.green}"></i>pass</span>
        <span><i style="background:${themeVars.red}"></i>fail</span>
        <span><i style="background:${themeVars.muted}"></i>skip</span>
      </div>
      <div class="tl-list">${rows}</div>
    </div>`;
}
function renderInsights(run, themeVars) {
    const matrix = renderSuiteMatrix(run, themeVars);
    const histo = renderDurationHistogram(run, themeVars);
    const slow = renderTopSlowest(run, themeVars);
    const timeline = renderFailureTimeline(run, themeVars);
    const any = matrix || histo || slow || timeline;
    if (!any)
        return '';
    return `
    <section class="section">
      <h2 class="section-title">🔍 Insights</h2>
      <div class="insights-grid">
        ${matrix}
        ${histo}
        ${slow}
        ${timeline}
      </div>
    </section>`;
}
function renderClusterSection(clusters) {
    const dedupable = clusters.filter(c => c.tests.length >= 2 || c.rootCause || c.suggestedFix);
    if (dedupable.length === 0)
        return '';
    const items = clusters.map(c => {
        const memberList = c.tests.map(t => `<li>${escapeHtml(t.fullTitle)}</li>`).join('');
        const fix = c.suggestedFix ? `<div class="cluster-fix"><strong>Suggested fix:</strong> ${escapeHtml(c.suggestedFix)}</div>` : '';
        const cause = c.rootCause ? `<div class="cluster-cause"><strong>Root cause:</strong> ${escapeHtml(c.rootCause)}</div>` : '';
        return `
      <div class="cluster-card">
        <div class="cluster-head">
          <span class="cluster-count">×${c.tests.length}</span>
          <code class="cluster-sig">${escapeHtml(c.signature)}</code>
        </div>
        ${cause}${fix}
        <details class="cluster-members"><summary>${c.tests.length} affected test${c.tests.length === 1 ? '' : 's'}</summary><ul>${memberList}</ul></details>
      </div>`;
    }).join('');
    return `
    <section class="section">
      <h2 class="section-title">🧩 Failure clusters (${clusters.length})</h2>
      <div class="cluster-grid">${items}</div>
    </section>`;
}
function renderSparkline(history, color) {
    if (history.length < 2)
        return '';
    const w = 120;
    const h = 28;
    const vals = history.map(h => h.passRate);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 100);
    const range = max - min || 1;
    const step = w / (vals.length - 1);
    const points = vals.map((v, i) => {
        const x = (i * step).toFixed(1);
        const y = (h - ((v - min) / range) * h).toFixed(1);
        return `${x},${y}`;
    }).join(' ');
    const lastVal = vals[vals.length - 1];
    const lastX = ((vals.length - 1) * step).toFixed(1);
    const lastY = (h - ((lastVal - min) / range) * h).toFixed(1);
    return `
    <svg class="sparkline" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none">
      <polyline fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
      <circle cx="${lastX}" cy="${lastY}" r="2" fill="${color}" />
    </svg>`;
}
function renderTrendChart(history, themeVars) {
    if (history.length < 2)
        return '';
    const chartData = JSON.stringify(history.map(h => ({
        date: new Date(h.date).toLocaleDateString(),
        passed: h.passed,
        failed: h.failed,
        passRate: h.passRate,
    })));
    return `
    <section class="section">
      <h2 class="section-title">📈 Trend (last ${history.length} runs)</h2>
      <div class="chart-wrap">
        <canvas id="trendChart" height="80"></canvas>
      </div>
    </section>
    <script>
    (function() {
      const data = ${chartData};
      const labels = data.map(d => d.date);
      const ctx = document.getElementById('trendChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Pass Rate %', data: data.map(d => d.passRate), borderColor: '${themeVars.blue}', backgroundColor: 'transparent', tension: 0.3, fill: false, yAxisID: 'y1' },
            { label: 'Passed', data: data.map(d => d.passed), borderColor: '${themeVars.green}', backgroundColor: 'transparent', tension: 0.3, borderDash: [4,2], yAxisID: 'y2' },
            { label: 'Failed', data: data.map(d => d.failed), borderColor: '${themeVars.red}', backgroundColor: 'transparent', tension: 0.3, borderDash: [4,2], yAxisID: 'y2' },
          ]
        },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '${themeVars.text}' } } },
          scales: {
            x: { ticks: { color: '${themeVars.muted}' }, grid: { color: 'rgba(128,128,128,0.1)' } },
            y1: { type: 'linear', position: 'left', min: 0, max: 100, ticks: { color: '${themeVars.muted}', callback: v => v + '%' }, grid: { color: 'rgba(128,128,128,0.1)' } },
            y2: { type: 'linear', position: 'right', min: 0, ticks: { color: '${themeVars.muted}' }, grid: { drawOnChartArea: false } },
          }
        }
      });
    })();
    </script>
  `;
}
function generateHTML(run, aiMap, history, reportTitle, logo, theme, clusters = [], diff = null, failureStates = new Map()) {
    const { stats } = run;
    const themeVars = (0, themes_1.resolveTheme)(theme);
    const themeCss = (0, themes_1.renderThemeCss)(themeVars);
    const allFailed = (0, stats_1.flattenTests)(run.suites).filter(t => t.status === 'failed');
    const suiteBlocks = run.suites.map(s => renderSuite(s, aiMap, 0, failureStates)).join('');
    const passColor = stats.passRate === 100 ? themeVars.green : stats.failed > 0 ? themeVars.red : themeVars.amber;
    const generatedAt = new Date().toUTCString();
    const logoHtml = logo
        ? `<img src="${escapeHtml(logo)}" alt="Logo" class="report-logo" />`
        : `<span class="brand-logo">QAPulse<span class="brand-by">by SK</span></span>`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(reportTitle)} — QAPulseSK Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ${themeCss}
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  body { background: var(--bg); color: var(--text); font-family: var(--font); font-size: 14px; line-height: 1.6; }
  a { color: var(--blue); text-decoration: none; }

  /* Header */
  .report-header { background: var(--card); border-bottom: 1px solid var(--border); padding: 20px 32px; display: flex; align-items: center; justify-content: space-between; }
  .brand-logo { font-size: 20px; font-weight: 600; color: var(--text); letter-spacing: -0.3px; }
  .brand-by { color: var(--blue); margin-left: 4px; }
  .report-logo { height: 36px; object-fit: contain; }
  .header-meta { text-align: right; font-size: 12px; color: var(--muted); }
  .header-title { font-size: 16px; font-weight: 500; color: var(--text); }
  .header-framework { display: inline-block; background: var(--blue-dim); color: var(--blue); font-size: 11px; font-weight: 500; padding: 2px 10px; border-radius: 20px; margin-top: 4px; }

  /* Main layout */
  .container { max-width: 1200px; margin: 0 auto; padding: 24px 32px; }

  /* Stats grid */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; }
  .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
  .stat-value { font-size: 28px; font-weight: 600; line-height: 1; }
  .stat-sub { font-size: 11px; color: var(--muted); margin-top: 4px; }

  /* Pass rate card */
  .pass-rate-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; display: flex; align-items: center; gap: 16px; }
  .pass-rate-body { flex: 1; min-width: 0; }
  .pass-ring { position: relative; width: 64px; height: 64px; flex-shrink: 0; }
  .pass-ring svg { transform: rotate(-90deg); }
  .pass-ring-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 14px; font-weight: 600; }
  .sparkline { display: block; margin-top: 6px; width: 100%; max-width: 140px; height: 24px; }

  /* Failure clusters */
  .cluster-grid { display: grid; gap: 12px; }
  .cluster-card { background: var(--card); border: 1px solid var(--border); border-left: 3px solid var(--red); border-radius: var(--radius); padding: 14px 16px; }
  .cluster-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
  .cluster-count { background: var(--red); color: #fff; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; font-family: var(--mono); }
  .cluster-sig { font-family: var(--mono); font-size: 12px; color: var(--text); background: rgba(128,128,128,0.08); padding: 2px 6px; border-radius: 3px; word-break: break-word; }
  .cluster-cause, .cluster-fix { font-size: 13px; color: var(--text); margin-top: 6px; }
  .cluster-fix { color: var(--blue); }
  .cluster-members { margin-top: 8px; font-size: 12px; color: var(--muted); }
  .cluster-members summary { cursor: pointer; user-select: none; }
  .cluster-members ul { margin: 6px 0 0 18px; padding: 0; }
  .cluster-members li { margin: 2px 0; }

  /* Insights */
  .insights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
  .insight-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
  .insight-title { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
  /* matrix */
  .matrix-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 4px; }
  .matrix-cell { padding: 8px 6px; border-radius: 4px; color: #fff; text-align: center; min-height: 44px; display: flex; flex-direction: column; justify-content: center; }
  .matrix-cell-label { font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .matrix-cell-pct { font-size: 12px; font-weight: 600; margin-top: 2px; }
  /* histogram */
  .histo-grid { display: flex; align-items: flex-end; gap: 8px; height: 120px; }
  .histo-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
  .histo-count { font-size: 11px; color: var(--muted); margin-bottom: 4px; }
  .histo-bar { width: 100%; max-width: 40px; min-height: 2px; border-radius: 3px 3px 0 0; }
  .histo-label { font-size: 10px; color: var(--muted); margin-top: 6px; text-align: center; font-family: var(--mono); }
  /* slowest */
  .slow-list { display: flex; flex-direction: column; gap: 6px; }
  .slow-row { display: grid; grid-template-columns: 1fr 80px 60px; align-items: center; gap: 8px; font-size: 12px; }
  .slow-title { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .slow-bar-wrap { background: rgba(128,128,128,0.12); border-radius: 3px; height: 8px; overflow: hidden; }
  .slow-bar { height: 100%; }
  .slow-time { color: var(--muted); font-family: var(--mono); font-size: 11px; text-align: right; }
  /* timeline */
  .tl-legend { display: flex; gap: 12px; font-size: 11px; color: var(--muted); margin-bottom: 8px; }
  .tl-legend span { display: flex; align-items: center; gap: 4px; }
  .tl-legend i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .tl-list { display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow-y: auto; }
  .tl-row { display: grid; grid-template-columns: 120px 1fr 30px; align-items: center; gap: 8px; font-size: 11px; }
  .tl-label { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tl-strip { display: flex; gap: 1px; height: 12px; }
  .tl-cell { flex: 1; min-width: 3px; border-radius: 1px; }
  .tl-count { color: var(--muted); font-family: var(--mono); font-size: 10px; text-align: right; }

  /* Meta bar */
  .meta-bar { display: flex; flex-wrap: wrap; gap: 16px; padding: 10px 14px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 12px; font-size: 12px; color: var(--muted); }
  .meta-item b { color: var(--text); font-weight: 500; margin-right: 6px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
  .meta-item code { font-family: var(--mono); color: var(--text); background: rgba(128,128,128,0.1); padding: 1px 5px; border-radius: 3px; }

  /* Diff banner */
  .diff-banner { padding: 10px 14px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 12px; font-size: 12px; color: var(--muted); }
  .diff-new { color: var(--red); font-weight: 600; margin: 0 4px; }
  .diff-rec { color: var(--green); font-weight: 600; margin: 0 4px; }
  .diff-same { color: var(--amber); font-weight: 600; margin: 0 4px; }

  /* Failure-state badges (inline in test title) */
  .fs-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 10px; margin-left: 8px; vertical-align: middle; letter-spacing: 0.02em; }
  .fs-new { background: rgba(59,130,246,0.15); color: var(--blue); }
  .fs-reg { background: rgba(239,68,68,0.15); color: var(--red); }
  .fs-rec { background: rgba(245,158,11,0.15); color: var(--amber); }

  /* Section */
  .section { margin-bottom: 28px; }
  .section-title { font-size: 15px; font-weight: 500; color: var(--text); margin-bottom: 14px; }

  /* Suite */
  .suite { margin-bottom: 16px; }
  .suite-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius) var(--radius) 0 0; }
  .suite-title { font-weight: 500; font-size: 13px; }
  .suite-meta { font-size: 11px; color: var(--muted); }

  /* Table */
  .test-table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--border); border-top: none; border-radius: 0 0 var(--radius) var(--radius); overflow: hidden; }
  .test-table th { padding: 8px 12px; font-size: 11px; color: var(--muted); text-align: left; border-bottom: 1px solid var(--border); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
  .test-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
  .test-row:last-child td { border-bottom: none; }
  .test-row:hover { background: rgba(255,255,255,0.02); }
  .test-title { font-size: 13px; }
  .test-duration { font-size: 12px; color: var(--muted); font-family: var(--mono); white-space: nowrap; }
  .test-file { font-size: 11px; color: var(--muted); font-family: var(--mono); }

  /* Badges */
  .badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.04em; font-family: var(--mono); }
  .badge-pass { background: rgba(34,197,94,0.15); color: var(--green); }
  .badge-fail { background: rgba(239,68,68,0.15); color: var(--red); }
  .badge-skip { background: rgba(139,149,163,0.15); color: var(--muted); }

  /* Error block */
  .error-block { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 14px; margin: 8px 0; }
  .error-message { color: var(--red); font-size: 13px; margin-bottom: 8px; font-weight: 500; }
  .stack-trace { font-family: var(--mono); font-size: 11px; color: var(--muted); white-space: pre-wrap; overflow-x: auto; margin-top: 8px; }
  .diff-row { display: flex; align-items: baseline; gap: 8px; margin-top: 6px; font-size: 12px; }
  .diff-label { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; font-family: var(--mono); white-space: nowrap; }
  .diff-label.expected { background: rgba(34,197,94,0.15); color: var(--green); }
  .diff-label.actual { background: rgba(239,68,68,0.15); color: var(--red); }
  .diff-row code { font-family: var(--mono); font-size: 12px; color: var(--text); }

  /* AI block */
  .ai-block { background: rgba(59,130,246,0.07); border: 1px solid rgba(59,130,246,0.25); border-radius: 8px; padding: 14px; margin: 8px 0; }
  .ai-header { font-size: 12px; font-weight: 600; color: var(--blue); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .ai-confidence { font-size: 10px; padding: 1px 8px; border-radius: 20px; font-weight: 500; }
  .confidence-high { background: rgba(34,197,94,0.15); color: var(--green); }
  .confidence-medium { background: rgba(245,158,11,0.15); color: var(--amber); }
  .confidence-low { background: rgba(239,68,68,0.15); color: var(--red); }
  .ai-row { font-size: 12px; color: var(--text); margin-bottom: 6px; }
  .ai-row strong { color: var(--muted); font-weight: 500; margin-right: 4px; }

  /* Screenshots gallery */
  .shots-gallery { margin: 10px 0 4px; padding: 12px; background: rgba(59,130,246,0.04); border: 1px solid rgba(59,130,246,0.18); border-radius: 8px; }
  .shots-title { font-size: 12px; font-weight: 600; color: var(--blue); margin-bottom: 10px; }
  .shots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .shot { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin: 0; }
  .shot img { display: block; width: 100%; height: 120px; object-fit: cover; cursor: zoom-in; transition: opacity 0.15s; }
  .shot img:hover { opacity: 0.85; }
  .shot figcaption { font-size: 10px; padding: 6px 8px; color: var(--muted); display: flex; justify-content: space-between; align-items: center; gap: 6px; }
  .shot-kind { font-size: 9px; padding: 1px 6px; border-radius: 3px; background: rgba(139,149,163,0.15); color: var(--muted); font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.04em; }
  .shot-kind.shot-fail { background: rgba(239,68,68,0.15); color: var(--red); }

  /* Lightbox */
  .qp-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 9999; display: none; align-items: center; justify-content: center; cursor: zoom-out; padding: 40px; }
  .qp-lightbox.open { display: flex; }
  .qp-lightbox img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
  .qp-lightbox-caption { position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; color: var(--muted); font-size: 12px; }
  .qp-lightbox-close { position: absolute; top: 20px; right: 24px; color: var(--text); font-size: 28px; cursor: pointer; background: none; border: none; }

  /* Chart */
  .chart-wrap { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }

  /* Details row */
  .details-row td { padding: 0 12px 12px; }

  /* Summary bar */
  .summary-bar { height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; margin-bottom: 24px; display: flex; }
  .bar-pass { background: var(--green); }
  .bar-fail { background: var(--red); }
  .bar-skip { background: var(--muted); }

  /* Footer */
  .report-footer { border-top: 1px solid var(--border); padding: 16px 32px; text-align: center; font-size: 11px; color: var(--muted); }
  .report-footer a { color: var(--blue); }
</style>
</head>
<body>

<header class="report-header">
  <div>${logoHtml}</div>
  <div class="header-meta">
    <div class="header-title">${escapeHtml(reportTitle)}</div>
    <div><span class="header-framework">${run.framework.toUpperCase()}</span></div>
    <div style="margin-top:6px">${generatedAt}</div>
  </div>
</header>

<main class="container">

  ${renderMetadataBar(run.metadata)}
  ${renderDiffBanner(diff)}

  <!-- Stats -->
  <div class="stats-grid">
    <div class="pass-rate-card">
      <div class="pass-ring">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(128,128,128,0.15)" stroke-width="6"/>
          <circle cx="32" cy="32" r="26" fill="none" stroke="${passColor}" stroke-width="6"
            stroke-dasharray="${Math.round(2 * Math.PI * 26 * stats.passRate / 100)} ${Math.round(2 * Math.PI * 26)}"
            stroke-linecap="round"/>
        </svg>
        <div class="pass-ring-text" style="color:${passColor}">${stats.passRate}%</div>
      </div>
      <div class="pass-rate-body">
        <div class="stat-label">Pass rate</div>
        <div style="font-size:13px;color:var(--muted)">${stats.passed} of ${stats.total} tests</div>
        ${renderSparkline(history, themeVars.blue)}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Passed</div>
      <div class="stat-value" style="color:var(--green)">${stats.passed}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Failed</div>
      <div class="stat-value" style="color:var(--red)">${stats.failed}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Skipped</div>
      <div class="stat-value" style="color:var(--muted)">${stats.skipped}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Duration</div>
      <div class="stat-value" style="font-size:20px">${(0, stats_1.formatDuration)(stats.duration)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total</div>
      <div class="stat-value">${stats.total}</div>
    </div>
  </div>

  <!-- Summary bar -->
  <div class="summary-bar">
    <div class="bar-pass" style="width:${stats.total > 0 ? (stats.passed / stats.total) * 100 : 0}%"></div>
    <div class="bar-fail" style="width:${stats.total > 0 ? (stats.failed / stats.total) * 100 : 0}%"></div>
    <div class="bar-skip" style="width:${stats.total > 0 ? (stats.skipped / stats.total) * 100 : 0}%"></div>
  </div>

  <!-- Trend chart -->
  ${renderClusterSection(clusters)}
  ${renderInsights(run, themeVars)}
  ${renderTrendChart(history, themeVars)}

  <!-- Failed tests summary -->
  ${allFailed.length > 0 ? `
  <section class="section">
    <h2 class="section-title">❌ Failed Tests (${allFailed.length})</h2>
    <table class="test-table">
      <thead><tr><th>Status</th><th>Test</th><th>Duration</th><th>File</th></tr></thead>
      <tbody>${allFailed.map(t => renderTestRow(t, aiMap, failureStates)).join('')}</tbody>
    </table>
  </section>` : ''}

  <!-- All suites -->
  <section class="section">
    <h2 class="section-title">🧪 All Test Suites</h2>
    ${suiteBlocks}
  </section>

</main>

<footer class="report-footer">
  Generated by <a href="https://skakarh.com" target="_blank">QAPulse by SK</a> ·
  <a href="https://github.com/QAPulse-by-SK/QAPulseSK-report" target="_blank">QAPulseSK-report</a> ·
  Created by QA Pulse by SK · skakarh.com
</footer>

<div class="qp-lightbox" id="qpLightbox" onclick="qpCloseLightbox()">
  <button class="qp-lightbox-close" onclick="qpCloseLightbox(event)">×</button>
  <img id="qpLightboxImg" src="" alt="" />
  <div class="qp-lightbox-caption" id="qpLightboxCaption"></div>
</div>

<script>
  function toggleDetails(id) {
    const row = document.getElementById('details-' + id);
    if (row) row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
  }
  function qpLightbox(src, label) {
    event && event.stopPropagation();
    const box = document.getElementById('qpLightbox');
    document.getElementById('qpLightboxImg').src = src;
    document.getElementById('qpLightboxCaption').textContent = label || '';
    box.classList.add('open');
  }
  function qpCloseLightbox(e) {
    if (e) e.stopPropagation();
    document.getElementById('qpLightbox').classList.remove('open');
    document.getElementById('qpLightboxImg').src = '';
  }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') qpCloseLightbox();
  });
</script>
</body>
</html>`;
}
function writeReport(html, outputDir, filename = 'qapulse-report.html') {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, html, 'utf-8');
    return filePath;
}
//# sourceMappingURL=generator.js.map