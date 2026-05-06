// cypress.config.ts — QAPulseSK-report Cypress example
// https://github.com/QAPulse-by-SK/QAPulseSK-report

import { defineConfig } from 'cypress';
import { qapulseCypressPlugin } from 'qapulsesk-report/cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      qapulseCypressPlugin(on, config, {
        outputDir: 'qapulse-report',
        reportTitle: 'My Cypress E2E Report',
        openAfterGeneration: false,
        history: { enabled: true },
        // ai: { enabled: true, provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY },
        // webhooks: { slack: process.env.SLACK_WEBHOOK_URL, notifyOnFailOnly: true },
      });
      return config;
    },
    baseUrl: 'http://localhost:3000',
  },
});
