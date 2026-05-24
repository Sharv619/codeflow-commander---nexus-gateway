const fs = require('fs');
const os = require('os');
const path = require('path');
const { runAgentReview } = require('../lib/agents/orchestrator.cjs');
const { buildCoachingTips } = require('../lib/profile/coaching-engine.cjs');
const { listReviewRuns, readLatestRun } = require('../lib/profile/history-store.cjs');
const { buildDeveloperProfile } = require('../lib/profile/profile-builder.cjs');

describe('Codeflow profile and history', () => {
  let repoRoot;

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codeflow-profile-'));
    fs.writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify({ name: 'fixture' }));
  });

  test('persists review history and latest run', async () => {
    const diff = [
      'diff --git a/src/app.ts b/src/app.ts',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1 +1 @@',
      '+console.log("debug");'
    ].join('\n');

    const result = await runAgentReview(diff, {
      repoRoot,
      minScore: 3,
      config: { agents: { enabled: true, parallel: false } }
    });

    const runs = listReviewRuns(repoRoot);
    const latest = readLatestRun(repoRoot);

    expect(result.history.id).toBeDefined();
    expect(runs).toHaveLength(1);
    expect(latest.id).toBe(result.history.id);
  });

  test('builds developer profile and coaching tips from history', async () => {
    const diff = [
      'diff --git a/src/app.ts b/src/app.ts',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1 +1 @@',
      '+console.log("debug");'
    ].join('\n');

    await runAgentReview(diff, {
      repoRoot,
      minScore: 3,
      config: { agents: { enabled: true, parallel: false } }
    });

    const profile = buildDeveloperProfile(repoRoot);
    const tips = buildCoachingTips(repoRoot, { profile });

    expect(profile.totalRuns).toBe(1);
    expect(profile.mostCommonIssues.some((issue) => issue.type === 'Quality')).toBe(true);
    expect(tips.length).toBeGreaterThan(0);
  });
});
