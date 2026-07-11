"use strict";
// Selenium WebDriver adapter for QAPulseSK-report.
// Selenium has no test runner of its own — users drive the reporter directly.
//
// Example:
//   import { Builder, By, until } from 'selenium-webdriver';
//   import { QAPulseSeleniumReporter } from 'qapulsesk-report/selenium';
//
//   const reporter = new QAPulseSeleniumReporter({ reportTitle: 'Selenium Suite' });
//   const driver = await new Builder().forBrowser('chrome').build();
//
//   reporter.startTest('Login works', { suite: 'Auth' });
//   try {
//     await driver.get('https://example.com/login');
//     // ... assertions ...
//     reporter.endTest('passed');
//   } catch (err) {
//     const shot = await driver.takeScreenshot();          // base64 png
//     const p = `/tmp/${Date.now()}.png`;
//     require('fs').writeFileSync(p, shot, 'base64');
//     reporter.endTest('failed', { error: err, screenshotPath: p });
//   }
//   await driver.quit();
//   await reporter.finish();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QAPulseSeleniumReporter = void 0;
const stats_1 = require("../core/stats");
const orchestrator_1 = require("../core/orchestrator");
function toError(e) {
    if (!e)
        return undefined;
    if (e instanceof Error)
        return { message: e.message, stack: e.stack };
    if (typeof e === 'string')
        return { message: e };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const any = e;
    return { message: any.message || String(e), stack: any.stack };
}
class QAPulseSeleniumReporter {
    constructor(config = {}) {
        this.startTime = new Date();
        this.current = null;
        this.buckets = new Map();
        this.config = (0, orchestrator_1.withDefaults)(config);
    }
    startTest(title, opts = {}) {
        this.current = {
            id: `sel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title,
            fullTitle: opts.suite ? `${opts.suite} > ${title}` : title,
            suite: opts.suite || 'Selenium',
            startedAt: Date.now(),
            file: opts.file,
        };
    }
    endTest(status, opts = {}) {
        if (!this.current)
            return;
        const shots = [];
        const paths = [
            ...(opts.screenshotPath ? [opts.screenshotPath] : []),
            ...(opts.screenshotPaths || []),
        ];
        for (const p of paths) {
            shots.push({
                sourcePath: p,
                kind: status === 'failed' ? 'onFailure' : 'manual',
                name: status === 'failed' ? 'Failure screenshot' : 'Screenshot',
            });
        }
        const test = {
            id: this.current.id,
            title: this.current.title,
            fullTitle: this.current.fullTitle,
            status,
            duration: Date.now() - this.current.startedAt,
            error: toError(opts.error),
            screenshots: shots,
            file: opts.file || this.current.file,
        };
        const key = opts.suite || this.current.suite;
        const list = this.buckets.get(key) || [];
        list.push(test);
        this.buckets.set(key, list);
        this.current = null;
    }
    async finish() {
        const endTime = new Date();
        const suites = Array.from(this.buckets.entries()).map(([title, tests]) => ({
            id: title,
            title,
            tests,
            duration: tests.reduce((s, t) => s + t.duration, 0),
        }));
        const run = {
            id: (0, stats_1.generateRunId)(),
            title: this.config.reportTitle,
            startTime: this.startTime,
            endTime,
            duration: endTime.getTime() - this.startTime.getTime(),
            suites,
            stats: (0, stats_1.calculateStats)(suites),
            framework: 'selenium',
        };
        await (0, orchestrator_1.generateReport)(run, this.config);
    }
}
exports.QAPulseSeleniumReporter = QAPulseSeleniumReporter;
exports.default = QAPulseSeleniumReporter;
//# sourceMappingURL=selenium.js.map