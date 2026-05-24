class BaseAgent {
  constructor(definition) {
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description;
    this.blockingDefault = definition.blockingDefault === true;
  }

  isBlocking(config) {
    const configured = config?.agents?.blocking?.[this.id];
    return typeof configured === 'boolean' ? configured : this.blockingDefault;
  }

  createResult({ status = 'pass', score = 10, findings = [], suggestions = [], metadata = {} }) {
    return {
      agent: this.id,
      name: this.name,
      status,
      score: Math.max(1, Math.min(10, Math.round(score))),
      findings,
      suggestions,
      metadata
    };
  }
}

module.exports = {
  BaseAgent
};
