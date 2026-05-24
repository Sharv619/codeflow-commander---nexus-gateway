const { BaseAgent } = require('./base-agent.cjs');
const {
  callClaudeAPI,
  callGeminiAPI,
  callOllamaAPI,
  callOpenAIAPI,
  parseAIResponse
} = require('../ai-reviewer.cjs');

class AIReasoningAgent extends BaseAgent {
  constructor() {
    super({
      id: 'aiReasoning',
      name: 'AI Reasoning Agent',
      description: 'Runs a second-pass AI review with Ollama or the configured cloud provider.',
      blockingDefault: false
    });
  }

  async review(context) {
    const aiConfig = resolveAIConfig(context.config);
    if (!aiConfig.enabled) {
      return this.createResult({
        status: 'pass',
        score: 10,
        metadata: {
          skipped: true,
          reason: aiConfig.reason
        }
      });
    }

    try {
      const responseText = await callConfiguredProvider(context.diff, aiConfig);
      const parsed = parseAIResponse(responseText);
      const findings = flattenAIResults(parsed);

      return this.createResult({
        status: parsed.overallStatus === 'FAIL' ? 'fail' : 'pass',
        score: parsed.score,
        findings,
        suggestions: collectSuggestions(parsed),
        metadata: {
          provider: aiConfig.provider,
          model: aiConfig.model
        }
      });
    } catch (error) {
      return this.createResult({
        status: 'warn',
        score: 8,
        findings: [{
          type: 'AI Provider',
          severity: 'medium',
          description: `AI second pass unavailable: ${error.message}`
        }],
        metadata: {
          provider: aiConfig.provider,
          model: aiConfig.model,
          failedOpen: true
        }
      });
    }
  }
}

function resolveAIConfig(config = {}) {
  if (config.agents?.aiEnabled === false) {
    return { enabled: false, reason: 'disabled by agents.aiEnabled=false' };
  }

  if (config.ollama?.enabled === true) {
    return {
      enabled: true,
      provider: 'ollama',
      model: config.model || 'qwen2.5-coder',
      url: config.ollama.url || 'http://localhost:11434'
    };
  }

  if (config.apiKey) {
    return {
      enabled: true,
      provider: config.provider || 'gemini',
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      model: config.model
    };
  }

  return { enabled: false, reason: 'no Ollama or cloud provider configured' };
}

function callConfiguredProvider(diff, config) {
  if (config.provider === 'ollama') {
    return callOllamaAPI(diff, {
      model: config.model,
      url: config.url
    });
  }

  if (config.provider === 'openai') {
    return callOpenAIAPI(diff, config);
  }

  if (config.provider === 'claude') {
    return callClaudeAPI(diff, config);
  }

  return callGeminiAPI(diff, config);
}

function flattenAIResults(parsed) {
  return (parsed.files || []).flatMap((file) => (
    (file.issues || []).map((issue) => ({
      fileName: file.fileName,
      line: issue.line,
      type: issue.type || 'AI Review',
      severity: severityFor(issue.type),
      description: issue.description
    }))
  ));
}

function collectSuggestions(parsed) {
  const suggestions = [];
  for (const file of parsed.files || []) {
    for (const suggestion of file.suggestions || []) {
      suggestions.push(`${file.fileName}: ${suggestion}`);
    }
  }
  return suggestions;
}

function severityFor(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('security') || normalized.includes('bug')) {
    return 'high';
  }
  if (normalized.includes('performance')) {
    return 'medium';
  }
  return 'low';
}

module.exports = {
  AIReasoningAgent,
  resolveAIConfig
};
