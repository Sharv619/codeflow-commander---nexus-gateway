const { BaseAgent } = require('./base-agent.cjs');

class TestImpactAgent extends BaseAgent {
  constructor() {
    super({
      id: 'testImpact',
      name: 'Test Impact Agent',
      description: 'Warns when source changes are not accompanied by likely test changes.',
      blockingDefault: false
    });
  }

  async review(context) {
    const sourceChanges = context.changedFiles.filter((file) => /\.(js|jsx|ts|tsx|cjs|mjs)$/.test(file) && !isTestFile(file));
    const testChanges = context.changedFiles.filter(isTestFile);

    if (sourceChanges.length === 0 || testChanges.length > 0) {
      return this.createResult({
        status: 'pass',
        score: 10,
        metadata: { sourceChanges: sourceChanges.length, testChanges: testChanges.length }
      });
    }

    return this.createResult({
      status: 'warn',
      score: 7,
      findings: [{
        type: 'Test Coverage',
        severity: 'medium',
        description: 'Source files changed without nearby test changes.'
      }],
      suggestions: ['Run impacted tests or add coverage for the changed behavior.'],
      metadata: { sourceChanges: sourceChanges.length, testChanges: testChanges.length }
    });
  }
}

function isTestFile(file) {
  return /(^|\/)(__tests__|tests?)\//.test(file) || /\.(test|spec)\.(js|jsx|ts|tsx|cjs|mjs)$/.test(file);
}

module.exports = {
  TestImpactAgent
};
