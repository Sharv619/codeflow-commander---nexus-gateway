const { BaseAgent } = require('./base-agent.cjs');
const { getAddedLinesByFile } = require('./diff-utils.cjs');

class SecurityAgent extends BaseAgent {
  constructor() {
    super({
      id: 'security',
      name: 'Security Agent',
      description: 'Detects secrets and high-risk security patterns in changed lines.',
      blockingDefault: true
    });
  }

  async review(context) {
    const findings = [];
    const addedLinesByFile = getAddedLinesByFile(context.diff);

    for (const [fileName, lines] of addedLinesByFile.entries()) {
      for (const line of lines) {
        const checks = [
          {
            pattern: /(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*["'][^"']{8,}["']/i,
            severity: 'critical',
            message: 'Potential hardcoded secret in changed code.'
          },
          {
            pattern: /\beval\s*\(|new Function\s*\(/,
            severity: 'high',
            message: 'Dynamic code execution introduced.'
          },
          {
            pattern: /child_process\.(exec|execSync)\s*\([^)]*\$\{/,
            severity: 'high',
            message: 'Shell execution appears to include interpolated input.'
          }
        ];

        for (const check of checks) {
          if (check.pattern.test(line.text) && !isTestFixture(fileName)) {
            findings.push({
              fileName,
              line: line.line,
              type: 'Security',
              severity: check.severity,
              description: check.message
            });
          }
        }
      }
    }

    const critical = findings.some((finding) => finding.severity === 'critical');
    const high = findings.some((finding) => finding.severity === 'high');
    return this.createResult({
      status: critical || high ? 'fail' : 'pass',
      score: critical ? 1 : high ? 4 : 10,
      findings,
      suggestions: findings.length ? ['Remove secrets from source and use environment-backed configuration.'] : []
    });
  }
}

function isTestFixture(fileName) {
  return /(^|\/)(__tests__|tests?)\//.test(fileName) || /\.(test|spec)\.(js|jsx|ts|tsx|cjs|mjs)$/.test(fileName);
}

module.exports = {
  SecurityAgent
};
