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
function renderTestRow(test, aiMap) {
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
      <td class="test-title">${escapeHtml(test.fullTitle)}</td>
      <td class="test-duration">${(0, stats_1.formatDuration)(test.duration)}</td>
      <td class="test-file">${escapeHtml(test.file || '')}</td>
    </tr>
    ${hasDetails ? `<tr class="details-row" id="details-${test.id}" style="display:none">
      <td colspan="4">${errorBlock}${shotsBlock}${aiBlock}</td>
    </tr>` : ''}
  `;
}
function renderSuite(suite, aiMap, depth = 0) {
    const indent = depth > 0 ? `style="margin-left:${depth * 16}px"` : '';
    const rows = suite.tests.map(t => renderTestRow(t, aiMap)).join('');
    const nested = (suite.suites || []).map(s => renderSuite(s, aiMap, depth + 1)).join('');
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
function generateHTML(run, aiMap, history, reportTitle, logo, theme) {
    const { stats } = run;
    const themeVars = (0, themes_1.resolveTheme)(theme);
    const themeCss = (0, themes_1.renderThemeCss)(themeVars);
    const allFailed = (0, stats_1.flattenTests)(run.suites).filter(t => t.status === 'failed');
    const suiteBlocks = run.suites.map(s => renderSuite(s, aiMap)).join('');
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

  /* Pass rate ring */
  .pass-rate-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; display: flex; align-items: center; gap: 16px; }
  .pass-ring { position: relative; width: 64px; height: 64px; flex-shrink: 0; }
  .pass-ring svg { transform: rotate(-90deg); }
  .pass-ring-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 14px; font-weight: 600; }

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

  <!-- Stats -->
  <div class="stats-grid">
    <div class="pass-rate-card">
      <div class="pass-ring">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
          <circle cx="32" cy="32" r="26" fill="none" stroke="${passColor}" stroke-width="6"
            stroke-dasharray="${Math.round(2 * Math.PI * 26 * stats.passRate / 100)} ${Math.round(2 * Math.PI * 26)}"
            stroke-linecap="round"/>
        </svg>
        <div class="pass-ring-text" style="color:${passColor}">${stats.passRate}%</div>
      </div>
      <div>
        <div class="stat-label">Pass rate</div>
        <div style="font-size:13px;color:var(--muted)">${stats.passed} of ${stats.total} tests</div>
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
  ${renderTrendChart(history, themeVars)}

  <!-- Failed tests summary -->
  ${allFailed.length > 0 ? `
  <section class="section">
    <h2 class="section-title">❌ Failed Tests (${allFailed.length})</h2>
    <table class="test-table">
      <thead><tr><th>Status</th><th>Test</th><th>Duration</th><th>File</th></tr></thead>
      <tbody>${allFailed.map(t => renderTestRow(t, aiMap)).join('')}</tbody>
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