const { buildDeveloperProfile } = require('./profile-builder.cjs');
const { readLatestRun } = require('./history-store.cjs');

function buildCoachingTips(repoRoot, options = {}) {
  const profile = options.profile || buildDeveloperProfile(repoRoot);
  const latest = options.latest || readLatestRun(repoRoot);
  const tips = [];

  for (const finding of latest?.blockingFindings || []) {
    tips.push({
      priority: 'high',
      title: `Fix ${finding.type || finding.agent} before pushing`,
      detail: finding.description
    });
  }

  for (const focusArea of profile.focusAreas || []) {
    tips.push({
      priority: 'medium',
      title: 'Practice focus',
      detail: focusArea
    });
  }

  if (profile.pushHealth >= 80) {
    tips.push({
      priority: 'low',
      title: 'Keep current review habits',
      detail: 'Your recent pushes are mostly healthy; keep pairing meaningful source changes with tests.'
    });
  }

  if (tips.length === 0) {
    tips.push({
      priority: 'low',
      title: 'Build more profile history',
      detail: 'Run a few more hook reviews so Codeflow can personalize your recommendations.'
    });
  }

  return tips.slice(0, 8);
}

module.exports = {
  buildCoachingTips
};
