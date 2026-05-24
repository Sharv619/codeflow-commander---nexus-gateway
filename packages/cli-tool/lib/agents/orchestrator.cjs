const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadConfig, reviewDiff } = require('../ai-reviewer.cjs');
const { AIReasoningAgent } = require('./ai-reasoning-agent.cjs');
const { ArchitectureAgent } = require('./architecture-agent.cjs');
const { DependencyAgent } = require('./dependency-agent.cjs');
const { getChangedFiles } = require('./diff-utils.cjs');
const { QualityAgent } = require('./quality-agent.cjs');
const { aggregateAgentResults } = require('./report-aggregator.cjs');
const { SecurityAgent } = require('./security-agent.cjs');
const { TestImpactAgent } = require('./test-impact-agent.cjs');
const { createReviewRecord, saveReviewRun } = require('../profile/history-store.cjs');

const AGENT_FACTORIES = [
  () => new SecurityAgent(),
  () => new QualityAgent(),
  () => new TestImpactAgent(),
  () => new DependencyAgent(),
  () => new ArchitectureAgent(),
  () => new AIReasoningAgent()
];

async function runAgentReview(diff, options = {}) {
  const config = options.config || loadConfig() || {};

  if (config.agents?.enabled === false) {
    return reviewDiff(diff, options);
  }

  const context = buildReviewContext(diff, config, options);
  const agents = getEnabledAgents(config);
  const parallel = config.agents?.parallel !== false;
  const settled = parallel
    ? await Promise.allSettled(agents.map((agent) => agent.review(context)))
    : await runSequentially(agents, context);

  const agentResults = settled.map((entry, index) => {
    if (entry.status === 'fulfilled') {
      return entry.value;
    }

    const agent = agents[index];
    return agent.createResult({
      status: agent.blockingDefault ? 'fail' : 'warn',
      score: agent.blockingDefault ? 3 : 7,
      findings: [{
        type: 'Agent Runtime',
        severity: agent.blockingDefault ? 'high' : 'medium',
        description: `${agent.name} failed: ${entry.reason?.message || entry.reason}`
      }]
    });
  });

  const result = aggregateAgentResults(agentResults, context, options);
  const reviewResult = {
    success: result.overallStatus === 'PASS' && result.score >= (options.minScore || 3),
    result,
    message: result.overallStatus === 'PASS'
      ? `Agent review ${result.status === 'warn' ? 'passed with warnings' : 'passed'} - score ${result.score}/10`
      : `Agent review failed - score ${result.score}/10`,
    usedFallback: true,
    provider: 'agents'
  };

  if (options.persist !== false) {
    try {
      reviewResult.history = saveReviewRun(context.repoRoot, createReviewRecord(context, reviewResult, options));
    } catch (error) {
      reviewResult.historyError = error.message;
    }
  }

  return reviewResult;
}

function buildReviewContext(diff, config, options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  return {
    repoRoot,
    diff,
    changedFiles: getChangedFiles(diff),
    packageJson: readJsonIfExists(path.join(repoRoot, 'package.json')),
    packageManager: detectPackageManager(repoRoot),
    gitBranch: readGitValue(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot),
    commitRange: options.commitRange,
    config
  };
}

function getEnabledAgents(config) {
  const enabled = config.agents?.enabledAgents;
  return AGENT_FACTORIES
    .map((createAgent) => createAgent())
    .filter((agent) => !Array.isArray(enabled) || enabled.includes(agent.id));
}

function listAgents(config = loadConfig() || {}) {
  return getEnabledAgents(config).map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    blocking: agent.isBlocking(config)
  }));
}

function doctor(config = loadConfig() || {}, repoRoot = process.cwd()) {
  const checks = [
    { name: 'Git repository', ok: !!readGitValue(['rev-parse', '--show-toplevel'], repoRoot) },
    { name: 'Package manifest', ok: fs.existsSync(path.join(repoRoot, 'package.json')) },
    { name: 'Agent orchestration', ok: config.agents?.enabled !== false },
    { name: 'AI provider', ok: !!(config.ollama?.enabled || config.apiKey), warning: 'No AI provider configured; deterministic agents will still run.' },
    { name: 'AI reasoning layer', ok: config.agents?.aiEnabled !== false, warning: 'AI reasoning layer disabled by config.' }
  ];

  return {
    ok: checks.every((check) => check.ok || check.warning),
    checks
  };
}

async function runSequentially(agents, context) {
  const results = [];
  for (const agent of agents) {
    try {
      results.push({ status: 'fulfilled', value: await agent.review(context) });
    } catch (error) {
      results.push({ status: 'rejected', reason: error });
    }
  }
  return results;
}

function readJsonIfExists(filePath) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null;
  } catch {
    return null;
  }
}

function detectPackageManager(repoRoot) {
  if (fs.existsSync(path.join(repoRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(repoRoot, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(repoRoot, 'package-lock.json'))) return 'npm';
  return null;
}

function readGitValue(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true
    }).trim();
  } catch {
    return null;
  }
}

module.exports = {
  buildReviewContext,
  doctor,
  listAgents,
  runAgentReview
};
