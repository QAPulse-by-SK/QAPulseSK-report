import { TestRun, WebhookConfig } from '../core/types';
import { formatDuration } from '../core/stats';

function statusEmoji(passRate: number): string {
  if (passRate === 100) return '✅';
  if (passRate >= 80) return '⚠️';
  return '❌';
}

function buildSlackPayload(run: TestRun): object {
  const { stats } = run;
  const emoji = statusEmoji(stats.passRate);
  const color = stats.passRate === 100 ? '#22c55e' : stats.failed > 0 ? '#ef4444' : '#f59e0b';

  return {
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${emoji} QAPulseSK Report — ${run.title}`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Framework:*\n${run.framework}` },
              { type: 'mrkdwn', text: `*Pass Rate:*\n${stats.passRate}%` },
              { type: 'mrkdwn', text: `*Passed:*\n${stats.passed}/${stats.total}` },
              { type: 'mrkdwn', text: `*Failed:*\n${stats.failed}` },
              { type: 'mrkdwn', text: `*Skipped:*\n${stats.skipped}` },
              { type: 'mrkdwn', text: `*Duration:*\n${formatDuration(stats.duration)}` },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `_Reported by <https://skakarh.com|QAPulse by SK> · ${new Date(run.startTime).toUTCString()}_`,
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildTeamsPayload(run: TestRun): object {
  const { stats } = run;
  const themeColor = stats.passRate === 100 ? '22c55e' : stats.failed > 0 ? 'ef4444' : 'f59e0b';

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor,
    summary: `QAPulseSK Report — ${run.title}`,
    sections: [
      {
        activityTitle: `QAPulseSK Report — ${run.title}`,
        activitySubtitle: `Framework: ${run.framework} · ${new Date(run.startTime).toUTCString()}`,
        facts: [
          { name: 'Pass Rate', value: `${stats.passRate}%` },
          { name: 'Passed', value: `${stats.passed}` },
          { name: 'Failed', value: `${stats.failed}` },
          { name: 'Skipped', value: `${stats.skipped}` },
          { name: 'Duration', value: formatDuration(stats.duration) },
        ],
        markdown: true,
      },
    ],
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'QAPulse by SK',
        targets: [{ os: 'default', uri: 'https://skakarh.com' }],
      },
    ],
  };
}

async function postWebhook(url: string, payload: object, headers?: Record<string, string>): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`QAPulseSK-report: Webhook failed (${res.status}) — ${url}`);
    }
  } catch (err) {
    console.warn(`QAPulseSK-report: Webhook error — ${err}`);
  }
}

export async function sendWebhooks(run: TestRun, config: WebhookConfig): Promise<void> {
  const shouldNotify = !config.notifyOnFailOnly || run.stats.failed > 0;
  if (!shouldNotify) return;

  const tasks: Promise<void>[] = [];

  if (config.slack) {
    tasks.push(postWebhook(config.slack, buildSlackPayload(run)));
  }

  if (config.teams) {
    tasks.push(postWebhook(config.teams, buildTeamsPayload(run)));
  }

  if (config.custom) {
    for (const hook of config.custom) {
      const payload = hook.template ? hook.template(run) : buildSlackPayload(run);
      tasks.push(postWebhook(hook.url, payload, hook.headers));
    }
  }

  await Promise.allSettled(tasks);
}
