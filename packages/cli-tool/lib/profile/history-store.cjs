const fs = require('fs');
const path = require('path');

const HISTORY_DIR = path.join('.codeflow', 'runs');
const LATEST_FILE = path.join('.codeflow', 'latest.json');

function saveReviewRun(repoRoot, payload) {
  const root = repoRoot || process.cwd();
  const codeflowDir = path.join(root, '.codeflow');
  const runsDir = path.join(root, HISTORY_DIR);
  fs.mkdirSync(runsDir, { recursive: true });

  const timestamp = payload.timestamp || new Date().toISOString();
  const id = `${timestamp.replace(/[:.]/g, '-')}-${shortId()}`;
  const record = {
    id,
    timestamp,
    schemaVersion: 1,
    ...payload
  };

  const filePath = path.join(runsDir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  fs.mkdirSync(codeflowDir, { recursive: true });
  fs.writeFileSync(path.join(root, LATEST_FILE), JSON.stringify(record, null, 2));
  return record;
}

function listReviewRuns(repoRoot, limit = 20) {
  const runsDir = path.join(repoRoot || process.cwd(), HISTORY_DIR);
  if (!fs.existsSync(runsDir)) {
    return [];
  }

  return fs.readdirSync(runsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => readJson(path.join(runsDir, file)))
    .filter(Boolean)
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, limit);
}

function readLatestRun(repoRoot) {
  const latestPath = path.join(repoRoot || process.cwd(), LATEST_FILE);
  return readJson(latestPath);
}

function readRun(repoRoot, idOrLatest) {
  if (!idOrLatest || idOrLatest === 'latest') {
    return readLatestRun(repoRoot);
  }

  const runsDir = path.join(repoRoot || process.cwd(), HISTORY_DIR);
  return readJson(path.join(runsDir, `${idOrLatest}.json`));
}

function clearHistory(repoRoot) {
  const root = repoRoot || process.cwd();
  const runsDir = path.join(root, HISTORY_DIR);
  const latestPath = path.join(root, LATEST_FILE);

  if (fs.existsSync(runsDir)) {
    for (const file of fs.readdirSync(runsDir)) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(runsDir, file));
      }
    }
  }

  if (fs.existsSync(latestPath)) {
    fs.unlinkSync(latestPath);
  }
}

function createReviewRecord(context, reviewResult, options = {}) {
  return {
    event: options.event || 'agent_review_completed',
    repoRoot: context.repoRoot,
    branch: context.gitBranch,
    commitRange: context.commitRange,
    changedFiles: context.changedFiles,
    packageManager: context.packageManager,
    status: reviewResult.result?.status || (reviewResult.success ? 'pass' : 'fail'),
    success: reviewResult.success,
    score: reviewResult.result?.score,
    provider: reviewResult.provider,
    message: reviewResult.message,
    summary: reviewResult.result?.summary,
    blockingFindings: reviewResult.result?.blockingFindings || [],
    agentResults: reviewResult.result?.agentResults || []
  };
}

function readJson(filePath) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null;
  } catch {
    return null;
  }
}

function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

module.exports = {
  clearHistory,
  createReviewRecord,
  listReviewRuns,
  readLatestRun,
  readRun,
  saveReviewRun
};
