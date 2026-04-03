/**
 * Deterministic code analyzer — scans git diff text for common issues.
 * Used by both the Express /analyze endpoint and the test suite.
 */

/**
 * Analyze a git diff string and return structured review results.
 * @param {string} diffText - Raw git diff content
 * @returns {{ overallStatus: string, summary: string, files: Array }}
 */
function analyzeCode(diffText) {
  const files = [];
  const lines = (diffText || '').split(/\r?\n/).slice(0, 500);

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('+++ b/')) {
      const fileName = l.replace('+++ b/', '').trim();
      const fileIssues = [];
      const suggestions = [];
      let score = 10;

      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        const ln = lines[j];
        if (/TODO|FIXME/.test(ln)) {
          fileIssues.push({ line: j + 1, type: 'Quality', description: 'Left TODO/FIXME in code', link: null });
          score -= 2;
        }
        if (/password|secret|apikey|api_key/i.test(ln)) {
          fileIssues.push({ line: j + 1, type: 'Security', description: 'Potential secret leaked in code', link: null });
          score -= 4;
        }
        if (/console\.log\(|fmt\.Println\(|print\(/.test(ln)) {
          suggestions.push('Remove debug prints from production code');
          score -= 1;
        }
        if (/==\s*null|!=\s*null/.test(ln)) {
          fileIssues.push({ line: j + 1, type: 'Best Practice', description: 'Prefer explicit null checks or optional chaining', link: null });
          score -= 1;
        }
      }

      files.push({ fileName, status: fileIssues.length === 0 ? 'PASS' : 'FAIL', score: Math.max(1, score), issues: fileIssues, suggestions });
    }
  }

  if (files.length === 0) {
    files.push({ fileName: 'unknown', status: 'PASS', score: 10, issues: [], suggestions: [] });
  }

  const overallStatus = files.every(f => f.status === 'PASS') ? 'PASS' : 'FAIL';
  const summary = overallStatus === 'PASS' ? 'No critical issues found.' : 'Issues detected — review required.';

  return { overallStatus, summary, files };
}

/**
 * Normalize ESLint JSON output into the CodeReviewResult shape.
 * @param {Array|null} eslintJson - ESLint JSON formatter output
 * @returns {{ overallStatus: string, summary: string, files: Array }}
 */
function normalizeEslintOutput(eslintJson) {
  if (!Array.isArray(eslintJson)) {
    return { overallStatus: 'PASS', summary: 'No issues found.', files: [] };
  }

  const files = [];
  let totalErrors = 0;

  for (const f of eslintJson) {
    const errorCount = typeof f.errorCount === 'number' ? f.errorCount : 0;
    totalErrors += errorCount;

    const issues = (f.messages || []).map(m => ({
      line: m.line || 0,
      type: m.ruleId || (m.severity === 2 ? 'error' : m.severity === 1 ? 'warning' : 'unknown'),
      description: m.message || ''
    }));

    files.push({
      fileName: f.filePath || f.fileName || 'unknown',
      status: errorCount > 0 ? 'FAIL' : 'PASS',
      issues
    });
  }

  const overallStatus = totalErrors > 0 ? 'FAIL' : 'PASS';
  const summary = totalErrors > 0 ? `${totalErrors} issues found.` : 'No issues found.';

  return { overallStatus, summary, files };
}

module.exports = { analyzeCode, normalizeEslintOutput };
