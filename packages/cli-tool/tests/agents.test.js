const { runAgentReview, listAgents, doctor } = require('../lib/agents/orchestrator.cjs');

describe('Codeflow Hook Agents', () => {
  test('lists default local agents', () => {
    const agents = listAgents({ agents: { enabled: true } });
    expect(agents.map((agent) => agent.id)).toEqual([
      'security',
      'quality',
      'testImpact',
      'dependency',
      'architecture',
      'aiReasoning'
    ]);
  });

  test('blocks hardcoded secrets in changed code', async () => {
    const diff = [
      'diff --git a/src/config.ts b/src/config.ts',
      '--- a/src/config.ts',
      '+++ b/src/config.ts',
      '@@ -1 +1 @@',
      '+const apiKey = "super-secret-token";'
    ].join('\n');

    const result = await runAgentReview(diff, {
      minScore: 3,
      persist: false,
      config: { agents: { enabled: true, parallel: false } }
    });

    expect(result.success).toBe(false);
    expect(result.provider).toBe('agents');
    expect(result.result.agentResults.find((agent) => agent.agent === 'security').status).toBe('fail');
  });

  test('warns when source changes have no test changes', async () => {
    const diff = [
      'diff --git a/src/app.ts b/src/app.ts',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1 +1 @@',
      '+export const answer = 42;'
    ].join('\n');

    const result = await runAgentReview(diff, {
      minScore: 3,
      persist: false,
      config: { agents: { enabled: true, parallel: false } }
    });

    expect(result.success).toBe(true);
    expect(result.result.status).toBe('warn');
    expect(result.result.agentResults.find((agent) => agent.agent === 'testImpact').status).toBe('warn');
  });

  test('doctor reports deterministic agents are usable without AI provider', () => {
    const report = doctor({ agents: { enabled: true } }, process.cwd());
    expect(report.checks.find((check) => check.name === 'Agent orchestration').ok).toBe(true);
  });

  test('AI reasoning agent skips cleanly when no provider is configured', async () => {
    const diff = [
      'diff --git a/src/app.test.ts b/src/app.test.ts',
      '--- a/src/app.test.ts',
      '+++ b/src/app.test.ts',
      '@@ -1 +1 @@',
      '+test("works", () => expect(true).toBe(true));'
    ].join('\n');

    const result = await runAgentReview(diff, {
      minScore: 3,
      persist: false,
      config: { agents: { enabled: true, parallel: false } }
    });

    const aiResult = result.result.agentResults.find((agent) => agent.agent === 'aiReasoning');
    expect(aiResult.status).toBe('pass');
    expect(aiResult.metadata.skipped).toBe(true);
  });
});
