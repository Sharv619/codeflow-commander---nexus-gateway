const { listReviewRuns } = require('./history-store.cjs');

function buildDeveloperProfile(repoRoot, options = {}) {
  const runs = listReviewRuns(repoRoot, options.limit || 50);
  const totalRuns = runs.length;
  const passingRuns = runs.filter((run) => run.success).length;
  const averageScore = totalRuns
    ? Math.round(runs.reduce((sum, run) => sum + (run.score || 0), 0) / totalRuns)
    : 0;
  const issueCounts = countIssueTypes(runs);
  const agentBreakdown = countAgentStatuses(runs);
  const pushHealth = calculatePushHealth({ totalRuns, passingRuns, averageScore, issueCounts });

  return {
    totalRuns,
    passingRuns,
    failingRuns: totalRuns - passingRuns,
    passRate: totalRuns ? Math.round((passingRuns / totalRuns) * 100) : 0,
    averageScore,
    pushHealth,
    trend: calculateTrend(runs),
    mostCommonIssues: Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count })),
    agentBreakdown,
    strengths: inferStrengths(runs, issueCounts),
    focusAreas: inferFocusAreas(issueCounts, agentBreakdown)
  };
}

function countIssueTypes(runs) {
  const counts = {};
  for (const run of runs) {
    for (const result of run.agentResults || []) {
      for (const finding of result.findings || []) {
        const type = finding.type || result.agent || 'Unknown';
        counts[type] = (counts[type] || 0) + 1;
      }
    }
  }
  return counts;
}

function countAgentStatuses(runs) {
  const breakdown = {};
  for (const run of runs) {
    for (const result of run.agentResults || []) {
      if (!breakdown[result.agent]) {
        breakdown[result.agent] = { pass: 0, warn: 0, fail: 0 };
      }
      breakdown[result.agent][result.status] = (breakdown[result.agent][result.status] || 0) + 1;
    }
  }
  return breakdown;
}

function calculatePushHealth({ totalRuns, passingRuns, averageScore, issueCounts }) {
  if (totalRuns === 0) {
    return 0;
  }

  const passRateScore = (passingRuns / totalRuns) * 60;
  const qualityScore = (averageScore / 10) * 35;
  const securityPenalty = (issueCounts.Security || 0) > 0 ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(passRateScore + qualityScore - securityPenalty)));
}

function calculateTrend(runs) {
  if (runs.length < 4) {
    return 'not enough data';
  }

  const recent = average(runs.slice(0, Math.ceil(runs.length / 2)).map((run) => run.score || 0));
  const older = average(runs.slice(Math.ceil(runs.length / 2)).map((run) => run.score || 0));
  if (recent > older + 1) return 'improving';
  if (recent < older - 1) return 'declining';
  return 'stable';
}

function inferStrengths(runs, issueCounts) {
  const strengths = [];
  if ((issueCounts.Security || 0) === 0 && runs.length > 0) {
    strengths.push('No hardcoded secrets or high-risk security patterns detected recently.');
  }
  if ((issueCounts.Dependency || 0) === 0 && runs.length > 0) {
    strengths.push('Dependency manifest and lockfile changes are staying consistent.');
  }
  if ((issueCounts.Architecture || 0) === 0 && runs.length > 0) {
    strengths.push('Architecture changes are staying reasonably scoped.');
  }
  return strengths;
}

function inferFocusAreas(issueCounts, agentBreakdown) {
  const areas = [];
  if ((issueCounts['Test Coverage'] || 0) > 0 || agentBreakdown.testImpact?.warn > 0) {
    areas.push('Pair source changes with tests or document why coverage is unchanged.');
  }
  if ((issueCounts.Quality || 0) > 0) {
    areas.push('Remove debug output and unfinished markers before committing.');
  }
  if ((issueCounts.Dependency || 0) > 0) {
    areas.push('Commit package manifests and lockfiles together.');
  }
  if ((issueCounts.Security || 0) > 0) {
    areas.push('Move secrets and tokens into environment-backed configuration.');
  }
  return areas;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

module.exports = {
  buildDeveloperProfile
};
