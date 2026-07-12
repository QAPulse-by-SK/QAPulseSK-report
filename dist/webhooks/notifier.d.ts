import { TestRun, WebhookConfig } from '../core/types';
import { FailureCluster } from '../core/clustering';
import { RunDiff } from '../core/diff';
export interface WebhookContext {
    clusters?: FailureCluster[];
    diff?: RunDiff | null;
}
declare function buildSlackPayload(run: TestRun, config: WebhookConfig, ctx?: WebhookContext): object;
declare function buildTeamsPayload(run: TestRun, config: WebhookConfig, ctx?: WebhookContext): object;
declare function buildDiscordPayload(run: TestRun, config: WebhookConfig, ctx?: WebhookContext): object;
export declare function sendWebhooks(run: TestRun, config: WebhookConfig, ctx?: WebhookContext): Promise<void>;
export declare const _internals: {
    buildSlackPayload: typeof buildSlackPayload;
    buildTeamsPayload: typeof buildTeamsPayload;
    buildDiscordPayload: typeof buildDiscordPayload;
};
export {};
//# sourceMappingURL=notifier.d.ts.map