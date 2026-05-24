function aggregateAgentResults(agentResults, context, options = {}) {
  const minScore = options.minScore || 3;
  const blocking = context.config?.agents?.blocking || {};
  const normalizedResults = agentResults.map((result) => ({
    ...result,
    blocking: typeof blocking[result.agent] === 'boolean' ? blocking[result.agent] : defaultBlocking(result.agent)
  }));

  const blockingFindings = normalizedResults.flatMap((result) => {
    if (!result.blocking || result.status !== 'fail') {
      return [];
    }

    return (result.findings || []).map((finding) => ({
      ...finding,
      agent: result.agent
    }));
  });

  const score = normalizedResults.length
    ? Math.min(...normalizedResults.map((result) => result.score || 10))
    : 10;
  const hasBlockingFailure = normalizedResults.some((result) => result.blocking && result.status === 'fail');
  const hasWarning = normalizedResults.some((result) => result.status === 'warn');
  const success = !hasBlockingFailure && score >= minScore;
  const status = success ? (hasWarning ? 'warn' : 'pass') : 'fail';

  return {
    overallStatus: success ? 'PASS' : 'FAIL',
    status,
    score,
    summary: summarize(status, normalizedResults),
    files: toFiles(normalizedResults),
    agentResults: normalizedResults,
    blockingFindings
  };
}

function defaultBlocking(agent) {
  return ['security', 'quality', 'dependency'].includes(agent);
}

function summarize(status, results) {
  const failed = results.filter((result) => result.status === 'fail').length;
  const warned = results.filter((result) => result.status === 'warn').length;

  if (status === 'fail') {
    return `${failed} agent${failed === 1 ? '' : 's'} reported blocking issues.`;
  }

  if (status === 'warn') {
    return `${warned} agent${warned === 1 ? '' : 's'} reported non-blocking warnings.`;
  }

  return 'All local agents passed.';
}

function toFiles(results) {
  const byFile = new Map();

  for (const result of results) {
    for (const finding of result.findings || []) {
      const fileName = finding.fileName || 'repository';
      if (!byFile.has(fileName)) {
        byFile.set(fileName, {
          fileName,
          status: 'PASS',
          score: 10,
          issues: [],
          suggestions: []
        });
      }

      const file = byFile.get(fileName);
      file.status = result.status === 'fail' ? 'FAIL' : file.status;
      file.score = Math.min(file.score, result.score || 10);
      file.issues.push({
        line: finding.line,
        type: finding.type || result.agent,
        description: finding.description,
        severity: finding.severity
      });
    }
  }

  return Array.from(byFile.values());
}

module.exports = {
  aggregateAgentResults
};
