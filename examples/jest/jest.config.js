// jest.config.js — QAPulseSK-report Jest example
// https://github.com/QAPulse-by-SK/QAPulseSK-report

/** @type {import('jest').Config} */
module.exports = {
  reporters: [
    'default',
    [
      'qapulsesk-report/jest',
      {
        outputDir: 'qapulse-report',
        reportTitle: 'My Jest Test Report',
        openAfterGeneration: false,

        // 🤖 AI analysis (optional — your key, zero cost to us)
        // ai: {
        //   enabled: true,
        //   provider: 'openai',
        //   apiKey: process.env.OPENAI_API_KEY,
        // },

        // 📊 Trend charts
        history: {
          enabled: true,
        },
      },
    ],
  ],
};
