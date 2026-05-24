const { BaseAgent } = require('./base-agent.cjs');
const { getAddedLinesByFile } = require('./diff-utils.cjs');

class QualityAgent extends BaseAgent {
  constructor() {
    super({
      id: 'quality',
      name: 'Quality Agent',
      description: 'Checks maintainability risks, debug output, and unfinished markers.',
      blockingDefault: true
    });
  }

  async review(context) {
    const findings = [];
    const suggestions = [];
    const addedLinesByFile = getAddedLinesByFile(context.diff);
    let score = 10;

    for (const [fileName, lines] of addedLinesByFile.entries()) {
      for (const line of lines) {
        if (isUnfinishedComment(line.text)) {
          findings.push({
            fileName,
            line: line.line,
            type: 'Quality',
            severity: 'medium',
            description: 'Unresolved TODO/FIXME/HACK marker introduced.'
          });
          score -= 2;
        }

        if (isDebugOutput(line.text) && !isCliEntryPoint(fileName)) {
          findings.push({
            fileName,
            line: line.line,
            type: 'Quality',
            severity: 'low',
            description: 'Debug output introduced in changed code.'
          });
          score -= 0.5;
        }
      }
    }

    if (findings.length > 0) {
      suggestions.push('Clean up debug output and unfinished markers before shipping.');
    }

    const boundedScore = Math.max(1, score);
    return this.createResult({
      status: boundedScore < 6 ? 'fail' : findings.length ? 'warn' : 'pass',
      score: boundedScore,
      findings,
      suggestions
    });
  }
}

function isUnfinishedComment(text) {
  return /(?:\/\/|#|\/\*|\*)\s*(TODO|FIXME|HACK)\b/.test(text);
}

function isDebugOutput(text) {
  return /\bconsole\.log\s*\(|\bdebugger\b|\bprint\s*\(/.test(text);
}

function isCliEntryPoint(fileName) {
  return /(^|\/)bin\/[^/]+\.js$/.test(fileName);
}

module.exports = {
  QualityAgent
};
