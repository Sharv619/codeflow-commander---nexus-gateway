const { BaseAgent } = require('./base-agent.cjs');

class ArchitectureAgent extends BaseAgent {
  constructor() {
    super({
      id: 'architecture',
      name: 'Architecture Agent',
      description: 'Flags broad cross-package changes that deserve architectural review.',
      blockingDefault: false
    });
  }

  async review(context) {
    const packageRoots = new Set();
    for (const file of context.changedFiles) {
      const match = file.match(/^packages\/([^/]+)\//);
      if (match) {
        packageRoots.add(match[1]);
      }
    }

    if (packageRoots.size <= 2) {
      return this.createResult({
        status: 'pass',
        score: 10,
        metadata: { packagesTouched: Array.from(packageRoots) }
      });
    }

    return this.createResult({
      status: 'warn',
      score: 7,
      findings: [{
        type: 'Architecture',
        severity: 'medium',
        description: `Changes span ${packageRoots.size} packages.`
      }],
      suggestions: ['Confirm package boundaries and integration contracts before merging.'],
      metadata: { packagesTouched: Array.from(packageRoots) }
    });
  }
}

module.exports = {
  ArchitectureAgent
};
