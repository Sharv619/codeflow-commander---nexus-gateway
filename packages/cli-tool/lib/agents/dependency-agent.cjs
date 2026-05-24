const { BaseAgent } = require('./base-agent.cjs');
const { hasPackageManifestChange } = require('./diff-utils.cjs');

class DependencyAgent extends BaseAgent {
  constructor() {
    super({
      id: 'dependency',
      name: 'Dependency Agent',
      description: 'Checks package manifest and lockfile consistency.',
      blockingDefault: true
    });
  }

  async review(context) {
    const changed = context.changedFiles;
    const packageJsonChanged = changed.some((file) => /(^|\/)package\.json$/.test(file));
    const lockfileChanged = changed.some((file) => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(file));
    const packageRelated = changed.some(hasPackageManifestChange);

    if (!packageRelated || packageJsonChanged === lockfileChanged) {
      return this.createResult({
        status: 'pass',
        score: 10,
        metadata: { packageJsonChanged, lockfileChanged }
      });
    }

    return this.createResult({
      status: 'fail',
      score: 5,
      findings: [{
        type: 'Dependency',
        severity: 'high',
        description: packageJsonChanged
          ? 'package.json changed without a lockfile update.'
          : 'Lockfile changed without package.json changes.'
      }],
      suggestions: ['Regenerate dependencies with the project package manager and commit manifest and lockfile together.'],
      metadata: { packageJsonChanged, lockfileChanged }
    });
  }
}

module.exports = {
  DependencyAgent
};
