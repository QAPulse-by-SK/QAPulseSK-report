// playwright.config.ts — QAPulseSK-report Playwright example
// https://github.com/QAPulse-by-SK/QAPulseSK-report

import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    [
      'qapulsesk-report/playwright',
      {
        outputDir: 'qapulse-report',
        reportTitle: 'My E2E Test Report',
        openAfterGeneration: true,

        // ✅ Free by default — no AI config needed
        // 🤖 AI analysis: uncomment + add your key to unlock
        // ai: {
        //   enabled: true,
        //   provider: 'anthropic',   // 'anthropic' | 'openai' | 'gemini'
        //   apiKey: process.env.AI_API_KEY,
        // },

        // 📊 Trend charts: track pass rate across runs
        history: {
          enabled: true,
          maxRuns: 20,
        },

        // 🔔 Slack/Teams notifications (optional)
        // webhooks: {
        //   slack: process.env.SLACK_WEBHOOK_URL,
        //   teams: process.env.TEAMS_WEBHOOK_URL,
        //   notifyOnFailOnly: true,
        // },
      },
    ],
  ],
  testDir: './tests',
  use: {
    baseURL: 'https://example.com',
    screenshot: 'only-on-failure',
  },
});
