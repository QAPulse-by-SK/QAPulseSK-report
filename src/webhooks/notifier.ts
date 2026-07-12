// QAPulseSK-report — enriched webhook notifications.
// Sends Slack, Teams, and Discord messages with the context users actually
// need: failed test titles, cluster summary, diff vs prior run, git/PR link,
// author @-mention on regressions, and a clickable button to the hosted report.

import { TestRun, WebhookConfig } from '../core/types';
import { formatDuration, flattenTests } from '../core/stats';
import { FailureCluster } from '../core/clustering';
import { RunDiff } from '../core/diff';

export interface WebhookContext {
  clusters?: FailureCluster[];
  diff?: RunDiff | null;
}

function statusEmoji(passRate: number, failed: number): string {
  if (failed === 0) return '✅';
  if (passRate >= 80) return '⚠️';
  return '❌';
}

function colorHex(failed: number, passRate: number): string {
  if (failed === 0) return '#22c55e';
  if (passRate >= 80) return '#f59e0b';
  return '#ef4444';
}

function shortList(titles: string[], limit: number): string[] {
  const kept = titles.slice(0, limit);
  return kept.length < titles.length ? [...kept, `…and ${titles.length - kept.length} more`] : kept;
}

function getFailedTitles(run: TestRun): string[] {
  return flattenTests(run.suites)
    .filter(t => t.status === 'failed')
    .map(t => t.fullTitle);
}

function mentionText(config: WebhookConfig, ctx?: WebhookContext): string {
  if (!config.mentionOnRegression && !config.mentionOnNewFailures) return '';
  const hasRegression = (ctx?.diff?.newFailures?.length || 0) > 0
    || (ctx?.diff?.stillFailing?.length || 0) > 0;
  const isRegression = (ctx?.diff?.newFailures?.length || 0) > 0
    && (ctx?.diff?.recovered?.length || 0) === 0
    && hasRegression;
  if (isRegression && config.mentionOnRegression) {
    // Slack user/group id — will be wrapped correctly per platform by caller
    return config.mentionOnRegression;
  }
  return '';
}

// ------------------------------ Slack ------------------------------

function buildSlackPayload(run: TestRun, config: WebhookConfig, ctx?: WebhookContext): object {
  const { stats } = run;
  const emoji = statusEmoji(stats.passRate, stats.failed);
  const color = colorHex(stats.failed, stats.passRate);
  const meta = run.metadata || {};
  const failedTitles = getFailedTitles(run);
  const shownFailed = shortList(failedTitles, config.maxFailedInCard ?? 5);
  const mention = mentionText(config, ctx);
  const mentionPrefix = mention ? `<@${mention}> ` : '';

  const fields: Array<{ type: 'mrkdwn'; text: string }> = [
    { type: 'mrkdwn', text: `*Framework:*\n${run.framework}` },
    { type: 'mrkdwn', text: `*Pass Rate:*\n${stats.passRate}%` },
    { type: 'mrkdwn', text: `*Passed:*\n${stats.passed}/${stats.total}` },
    { type: 'mrkdwn', text: `*Failed:*\n${stats.failed}` },
    { type: 'mrkdwn', text: `*Duration:*\n${formatDuration(stats.duration)}` },
  ];
  if (meta.git?.branch) fields.push({ type: 'mrkdwn', text: `*Branch:*\n\`${meta.git.branch}\`` });
  if (meta.git?.commitShort) {
    const msg = meta.git.commitMessage ? ` — ${meta.git.commitMessage.slice(0, 60)}` : '';
    fields.push({ type: 'mrkdwn', text: `*Commit:*\n\`${meta.git.commitShort}\`${msg}` });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [
    { type: 'header', text: { type: 'plain_text', text: `${emoji} ${run.title}` } },
    { type: 'section', fields },
  ];

  if (ctx?.diff && (ctx.diff.newFailures.length || ctx.diff.recovered.length)) {
    const parts: string[] = [];
    if (ctx.diff.newFailures.length) parts.push(`*+${ctx.diff.newFailures.length} new*`);
    if (ctx.diff.recovered.length) parts.push(`-${ctx.diff.recovered.length} recovered`);
    if (ctx.diff.stillFailing.length) parts.push(`${ctx.diff.stillFailing.length} still failing`);
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `${mentionPrefix}*vs previous run:* ${parts.join(' · ')}` },
    });
  } else if (mentionPrefix) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: mentionPrefix.trim() },
    });
  }

  if (ctx?.clusters && ctx.clusters.length > 0) {
    const top = ctx.clusters.slice(0, 3).map(c =>
      `• *×${c.tests.length}* \`${c.signature.slice(0, 80)}\``
    ).join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Failure clusters:*\n${top}` },
    });
  }

  if (shownFailed.length > 0) {
    const lines = shownFailed.map(t => `• ${t}`).join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Failed tests:*\n${lines}` },
    });
  }

  // Actions row — report + PR + job
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actions: any[] = [];
  if (config.reportUrl) {
    actions.push({ type: 'button', text: { type: 'plain_text', text: '📊 View report' }, url: config.reportUrl, style: 'primary' });
  }
  if (meta.ci?.prUrl) {
    actions.push({ type: 'button', text: { type: 'plain_text', text: `🔀 PR #${meta.ci.prNumber}` }, url: meta.ci.prUrl });
  }
  if (meta.ci?.jobUrl) {
    actions.push({ type: 'button', text: { type: 'plain_text', text: '⚙️ CI job' }, url: meta.ci.jobUrl });
  }
  if (actions.length) {
    blocks.push({ type: 'actions', elements: actions });
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `_Reported by <https://skakarh.com|QAPulse by SK> · ${new Date(run.startTime).toUTCString()}_` }],
  });

  return { attachments: [{ color, blocks }] };
}

// ------------------------------ Teams ------------------------------

function buildTeamsPayload(run: TestRun, config: WebhookConfig, ctx?: WebhookContext): object {
  const { stats } = run;
  const themeColor = colorHex(stats.failed, stats.passRate).replace('#', '');
  const meta = run.metadata || {};
  const failedTitles = getFailedTitles(run);
  const shownFailed = shortList(failedTitles, config.maxFailedInCard ?? 5);

  const facts: Array<{ name: string; value: string }> = [
    { name: 'Framework', value: run.framework },
    { name: 'Pass rate', value: `${stats.passRate}%` },
    { name: 'Passed', value: `${stats.passed} / ${stats.total}` },
    { name: 'Failed', value: `${stats.failed}` },
    { name: 'Duration', value: formatDuration(stats.duration) },
  ];
  if (meta.git?.branch) facts.push({ name: 'Branch', value: meta.git.branch });
  if (meta.git?.commitShort) facts.push({ name: 'Commit', value: `${meta.git.commitShort}${meta.git.commitMessage ? ` — ${meta.git.commitMessage.slice(0, 60)}` : ''}` });

  const sections: object[] = [
    {
      activityTitle: `**${statusEmoji(stats.passRate, stats.failed)} ${run.title}**`,
      activitySubtitle: `${new Date(run.startTime).toUTCString()}`,
      facts,
      markdown: true,
    },
  ];

  if (ctx?.diff && (ctx.diff.newFailures.length || ctx.diff.recovered.length)) {
    const parts: string[] = [];
    if (ctx.diff.newFailures.length) parts.push(`**+${ctx.diff.newFailures.length} new**`);
    if (ctx.diff.recovered.length) parts.push(`-${ctx.diff.recovered.length} recovered`);
    if (ctx.diff.stillFailing.length) parts.push(`${ctx.diff.stillFailing.length} still failing`);
    sections.push({ text: `**vs previous run:** ${parts.join(' · ')}`, markdown: true });
  }

  if (ctx?.clusters && ctx.clusters.length > 0) {
    const top = ctx.clusters.slice(0, 3).map(c => `- **×${c.tests.length}** \`${c.signature.slice(0, 80)}\``).join('  \n');
    sections.push({ text: `**Failure clusters**  \n${top}`, markdown: true });
  }

  if (shownFailed.length > 0) {
    const lines = shownFailed.map(t => `- ${t}`).join('  \n');
    sections.push({ text: `**Failed tests**  \n${lines}`, markdown: true });
  }

  const potentialAction: object[] = [];
  if (config.reportUrl) {
    potentialAction.push({ '@type': 'OpenUri', name: 'View report', targets: [{ os: 'default', uri: config.reportUrl }] });
  }
  if (meta.ci?.prUrl) {
    potentialAction.push({ '@type': 'OpenUri', name: `PR #${meta.ci.prNumber}`, targets: [{ os: 'default', uri: meta.ci.prUrl }] });
  }
  if (meta.ci?.jobUrl) {
    potentialAction.push({ '@type': 'OpenUri', name: 'CI job', targets: [{ os: 'default', uri: meta.ci.jobUrl }] });
  }

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor,
    summary: `QAPulseSK Report — ${run.title}`,
    sections,
    potentialAction,
  };
}

// ------------------------------ Discord ------------------------------

function buildDiscordPayload(run: TestRun, config: WebhookConfig, ctx?: WebhookContext): object {
  const { stats } = run;
  const emoji = statusEmoji(stats.passRate, stats.failed);
  // Discord embeds use decimal color, not hex string
  const colorInt = parseInt(colorHex(stats.failed, stats.passRate).replace('#', ''), 16);
  const meta = run.metadata || {};
  const failedTitles = getFailedTitles(run);
  const shownFailed = shortList(failedTitles, config.maxFailedInCard ?? 5);

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Framework', value: run.framework, inline: true },
    { name: 'Pass rate', value: `${stats.passRate}%`, inline: true },
    { name: 'Duration', value: formatDuration(stats.duration), inline: true },
    { name: 'Passed', value: `${stats.passed}`, inline: true },
    { name: 'Failed', value: `${stats.failed}`, inline: true },
    { name: 'Skipped', value: `${stats.skipped}`, inline: true },
  ];
  if (meta.git?.branch) fields.push({ name: 'Branch', value: `\`${meta.git.branch}\``, inline: true });
  if (meta.git?.commitShort) {
    fields.push({ name: 'Commit', value: `\`${meta.git.commitShort}\`${meta.git.commitMessage ? ` — ${meta.git.commitMessage.slice(0, 60)}` : ''}`, inline: false });
  }

  if (ctx?.diff && (ctx.diff.newFailures.length || ctx.diff.recovered.length)) {
    const parts: string[] = [];
    if (ctx.diff.newFailures.length) parts.push(`**+${ctx.diff.newFailures.length} new**`);
    if (ctx.diff.recovered.length) parts.push(`-${ctx.diff.recovered.length} recovered`);
    if (ctx.diff.stillFailing.length) parts.push(`${ctx.diff.stillFailing.length} still failing`);
    fields.push({ name: 'vs previous run', value: parts.join(' · '), inline: false });
  }

  if (ctx?.clusters && ctx.clusters.length > 0) {
    const top = ctx.clusters.slice(0, 3).map(c => `**×${c.tests.length}** \`${c.signature.slice(0, 80)}\``).join('\n');
    fields.push({ name: 'Failure clusters', value: top, inline: false });
  }

  if (shownFailed.length > 0) {
    const lines = shownFailed.map(t => `• ${t}`).join('\n');
    fields.push({ name: 'Failed tests', value: lines.slice(0, 1024), inline: false });
  }

  // Discord doesn't support buttons in webhooks — inline URLs instead
  const links: string[] = [];
  if (config.reportUrl) links.push(`[📊 View report](${config.reportUrl})`);
  if (meta.ci?.prUrl) links.push(`[🔀 PR #${meta.ci.prNumber}](${meta.ci.prUrl})`);
  if (meta.ci?.jobUrl) links.push(`[⚙️ CI job](${meta.ci.jobUrl})`);
  if (links.length) fields.push({ name: 'Links', value: links.join(' · '), inline: false });

  return {
    embeds: [
      {
        title: `${emoji} ${run.title}`,
        color: colorInt,
        fields,
        timestamp: new Date(run.startTime).toISOString(),
        footer: { text: 'QAPulse by SK · skakarh.com' },
      },
    ],
  };
}

// ------------------------------ Transport ------------------------------

async function postWebhook(url: string, payload: object, headers?: Record<string, string>): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`QAPulseSK-report: webhook failed (${res.status}) — ${url}`);
    }
  } catch (err) {
    console.warn(`QAPulseSK-report: webhook error — ${err}`);
  }
}

export async function sendWebhooks(
  run: TestRun,
  config: WebhookConfig,
  ctx: WebhookContext = {}
): Promise<void> {
  const shouldNotify = !config.notifyOnFailOnly || run.stats.failed > 0;
  if (!shouldNotify) return;

  const tasks: Promise<void>[] = [];

  if (config.slack) {
    tasks.push(postWebhook(config.slack, buildSlackPayload(run, config, ctx)));
  }
  if (config.teams) {
    tasks.push(postWebhook(config.teams, buildTeamsPayload(run, config, ctx)));
  }
  if (config.discord) {
    tasks.push(postWebhook(config.discord, buildDiscordPayload(run, config, ctx)));
  }
  if (config.custom) {
    for (const hook of config.custom) {
      const payload = hook.template ? hook.template(run) : buildSlackPayload(run, config, ctx);
      tasks.push(postWebhook(hook.url, payload, hook.headers));
    }
  }

  await Promise.allSettled(tasks);
}

// Exposed for testing
export const _internals = {
  buildSlackPayload,
  buildTeamsPayload,
  buildDiscordPayload,
};
