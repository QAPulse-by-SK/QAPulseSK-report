// QAPulseSK-report — auto-detect git + CI metadata from the environment.
// Zero deps. Runs synchronously in the orchestrator; safe to fail silently.

import { execSync } from 'child_process';
import { RunMetadata } from './types';

function envAny(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

function safeGit(cmd: string): string | undefined {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 })
      .toString().trim() || undefined;
  } catch {
    return undefined;
  }
}

function detectCi(): NonNullable<RunMetadata['ci']> {
  const ci: NonNullable<RunMetadata['ci']> = {};

  // GitHub Actions
  if (process.env.GITHUB_ACTIONS) {
    ci.provider = 'github-actions';
    ci.workflow = envAny('GITHUB_WORKFLOW');
    ci.jobId = envAny('GITHUB_RUN_ID');
    const repo = envAny('GITHUB_REPOSITORY');
    if (repo && ci.jobId) ci.jobUrl = `https://github.com/${repo}/actions/runs/${ci.jobId}`;
    const ref = envAny('GITHUB_REF') || '';
    const prMatch = ref.match(/refs\/pull\/(\d+)\//);
    if (prMatch) {
      ci.prNumber = prMatch[1];
      if (repo) ci.prUrl = `https://github.com/${repo}/pull/${prMatch[1]}`;
    }
    return ci;
  }

  // GitLab CI
  if (process.env.GITLAB_CI) {
    ci.provider = 'gitlab-ci';
    ci.jobId = envAny('CI_JOB_ID');
    ci.jobUrl = envAny('CI_JOB_URL');
    ci.workflow = envAny('CI_PIPELINE_NAME', 'CI_PROJECT_NAME');
    ci.prNumber = envAny('CI_MERGE_REQUEST_IID');
    ci.prUrl = envAny('CI_MERGE_REQUEST_PROJECT_URL')
      ? `${process.env.CI_MERGE_REQUEST_PROJECT_URL}/-/merge_requests/${ci.prNumber}`
      : undefined;
    return ci;
  }

  // CircleCI
  if (process.env.CIRCLECI) {
    ci.provider = 'circleci';
    ci.jobId = envAny('CIRCLE_BUILD_NUM');
    ci.jobUrl = envAny('CIRCLE_BUILD_URL');
    ci.workflow = envAny('CIRCLE_WORKFLOW_ID', 'CIRCLE_JOB');
    const prUrl = envAny('CIRCLE_PULL_REQUEST');
    if (prUrl) {
      ci.prUrl = prUrl;
      ci.prNumber = prUrl.split('/').pop();
    }
    return ci;
  }

  // Jenkins
  if (process.env.JENKINS_URL || process.env.BUILD_NUMBER) {
    ci.provider = 'jenkins';
    ci.jobId = envAny('BUILD_NUMBER');
    ci.jobUrl = envAny('BUILD_URL');
    ci.workflow = envAny('JOB_NAME');
    return ci;
  }

  // Bitbucket Pipelines
  if (process.env.BITBUCKET_BUILD_NUMBER) {
    ci.provider = 'bitbucket-pipelines';
    ci.jobId = envAny('BITBUCKET_BUILD_NUMBER');
    ci.workflow = envAny('BITBUCKET_PIPELINE_UUID');
    ci.prNumber = envAny('BITBUCKET_PR_ID');
    return ci;
  }

  // Generic fallback
  if (process.env.CI) {
    ci.provider = 'ci';
    return ci;
  }

  return ci;
}

function detectGit(): NonNullable<RunMetadata['git']> {
  const git: NonNullable<RunMetadata['git']> = {};

  // Prefer CI env vars (they work even in detached HEAD), then shell out.
  git.branch =
    envAny('GITHUB_HEAD_REF', 'GITHUB_REF_NAME') ||
    envAny('CI_COMMIT_REF_NAME', 'CI_COMMIT_BRANCH') ||
    envAny('CIRCLE_BRANCH') ||
    envAny('GIT_BRANCH', 'BRANCH_NAME') ||
    safeGit('rev-parse --abbrev-ref HEAD');

  git.commit =
    envAny('GITHUB_SHA') ||
    envAny('CI_COMMIT_SHA') ||
    envAny('CIRCLE_SHA1') ||
    envAny('GIT_COMMIT') ||
    safeGit('rev-parse HEAD');

  if (git.commit) git.commitShort = git.commit.slice(0, 7);

  git.commitMessage =
    envAny('CI_COMMIT_MESSAGE') ||
    safeGit('log -1 --pretty=%s');

  git.author =
    envAny('CI_COMMIT_AUTHOR', 'GITHUB_ACTOR') ||
    safeGit('log -1 --pretty=%an');

  git.tag = safeGit('describe --tags --exact-match') || envAny('CI_COMMIT_TAG');

  return git;
}

export function detectMetadata(): RunMetadata {
  const meta: RunMetadata = {};
  const git = detectGit();
  const ci = detectCi();
  if (Object.keys(git).some(k => (git as Record<string, unknown>)[k])) meta.git = git;
  if (Object.keys(ci).some(k => (ci as Record<string, unknown>)[k])) meta.ci = ci;
  return meta;
}

/** Merge auto-detected metadata with any pre-existing metadata (user wins). */
export function mergeMetadata(existing: RunMetadata | undefined, detected: RunMetadata): RunMetadata {
  return {
    ...detected,
    ...(existing || {}),
    git: { ...detected.git, ...(existing?.git || {}) },
    ci: { ...detected.ci, ...(existing?.ci || {}) },
  };
}
