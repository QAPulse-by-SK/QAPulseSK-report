// vitest.config.ts — QAPulseSK-report Vitest example
// https://github.com/QAPulse-by-SK/QAPulseSK-report

import { defineConfig } from 'vitest/config';
import { QAPulseVitestReporter } from 'qapulsesk-report/vitest';

export default defineConfig({
  test: {
    reporters: [
      'verbose',
      new QAPulseVitestReporter({
        outputDir: 'qapulse-report',
        reportTitle: 'My Vitest Report',
        openAfterGeneration: false,
        history: { enabled: true },
        // ai: { enabled: true, provider: 'gemini', apiKey: process.env.GEMINI_API_KEY },
      }),
    ],
  },
});
