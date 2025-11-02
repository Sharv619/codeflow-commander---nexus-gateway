/**
 * Codeflow Intelligence Dashboard - Frontend Network Smoke Test
 *
 * Instructions:
 * 1. Open the dashboard in your browser.
 * 2. Open the Developer Tools (F12).
 * 3. Copy and paste this entire script into the Console tab and press Enter.
 * 4. Switch to the Network tab to watch the GraphQL requests.
 *
 * This script will simulate user actions for each persona and log what it's doing.
 */
(async function runSmokeTests() {

  const GQL_ENDPOINT = 'http://localhost:4000/graphql';
  const a = "%c";
  const b = "font-weight: bold; font-size: 14px; color: cyan;";
  const headerStyle = "font-weight: bold; font-size: 16px; color: #00bcd4; border-bottom: 2px solid #00bcd4; padding-bottom: 5px;";
  const subHeaderStyle = "font-weight: bold; font-size: 12px; color: #cfd8dc; margin-top: 10px;";
  const successStyle = "color: #4caf50;";
  const errorStyle = "color: #f44336;";
  const infoStyle = "color: #90a4ae;";
  const actionStyle = "font-style: italic; color: #ffeb3b;";

  // --- Helper Functions ---
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  async function postGraphQL(operationName, query, variables = {}) {
    console.log(`${a}[ACTION] ${a}Triggering GraphQL operation: ${a}${operationName}`, actionStyle, infoStyle, b);
    try {
      const response = await fetch(GQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationName,
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const jsonResponse = await response.json();
      if (jsonResponse.errors) {
        console.error(`${a}[ERROR] ${a}GraphQL operation '${operationName}' failed:`, errorStyle, infoStyle, jsonResponse.errors);
        return false;
      }

      console.log(`${a}[SUCCESS] ${a}GraphQL operation '${operationName}' succeeded.`, successStyle, infoStyle);
      return true;

    } catch (error) {
      console.error(`${a}[ERROR] ${a}Network request for '${operationName}' failed:`, errorStyle, infoStyle, error);
      return false;
    }
  }

  console.clear();
  console.log(`${a}🚀 Starting Codeflow Intelligence Dashboard Network Smoke Test...`, headerStyle);
  console.log(`${a}Watch the 'Network' tab to see the GraphQL requests.`, infoStyle);
  await sleep(1000);

  // ---  Persona: DEVA (Developer) ---
  console.log(`\n${a}👩‍💻 Testing Persona: DEVA (Developer Experience)`, subHeaderStyle);
  await sleep(500);

  // Test Case DEV-04: My Codeflow Dashboard (Implicitly tested by other views)
  console.log(`${a}[TEST] ${a}Simulating Developer dashboard load... (Data is shared, no unique query)`, infoStyle, successStyle);

  await sleep(1000);

  // --- Persona: LEO (Team Lead) ---
  console.log(`\n${a}👨‍💼 Testing Persona: LEO (Team Lead Experience)`, subHeaderStyle);
  await sleep(500);

  // Test Case LEO-01: Repository Health Dashboard
  await postGraphQL(
    'GetRepositoryIntelligence',
    `query GetRepositoryIntelligence($repositoryId: ID!) {
      repositoryIntelligence(repositoryId: $repositoryId) {
        repository { name language }
        healthMetrics { techDebt testCoverage securityScore }
      }
    }`, {
      repositoryId: "test-repo-123"
    }
  );
  await sleep(1000);

  // Test Case LEO-02: Accept an Agent Suggestion
  await postGraphQL(
    'SubmitAgentFeedback_Accept',
    `mutation SubmitAgentFeedback($recommendationId: ID!, $action: FeedbackAction!) {
      submitAgentFeedback(recommendationId: $recommendationId, action: $action) {
        success
      }
    }`, {
      recommendationId: "suggestion-abc-789",
      action: "ACCEPTED"
    }
  );
  await sleep(1000);

  // Test Case LEO-03: Reject an Agent Suggestion
  await postGraphQL(
    'SubmitAgentFeedback_Reject',
    `mutation SubmitAgentFeedback($recommendationId: ID!, $action: FeedbackAction!, $reason: String) {
      submitAgentFeedback(recommendationId: $recommendationId, action: $action, reason: $reason) {
        success
      }
    }`, {
      recommendationId: "suggestion-def-456",
      action: "REJECTED",
      reason: "This is not applicable to our current architecture."
    }
  );
  await sleep(1000);

  // Test Case LEO-04: Agent Configuration
  await postGraphQL(
    'UpdateAgentConfiguration',
    `mutation UpdateAgentConfiguration($agentId: ID!, $config: AgentConfigurationInput!) {
      updateAgentConfiguration(agentId: $agentId, config: $config) {
        success
      }
    }`, {
      agentId: "security-agent-001",
      config: {
        enabled: true,
        confidenceThreshold: 0.85,
        autoApply: false
      }
    }
  );
  await sleep(1000);

  // --- Persona: ARIA (Architect) ---
  console.log(`\n${a}👩‍🏗️ Testing Persona: ARIA (Architect Experience)`, subHeaderStyle);
  await sleep(500);

  // Test Case ARIA-01: Global EKG Explorer
  await postGraphQL(
    'GetGraphStatistics',
    `query GetGraphStatistics {
      graphStatistics {
        repositoryCount
        teamCount
        patternCount
      }
    }`
  );
  await sleep(1000);

  // --- Shared Components ---
  console.log(`\n${a}🤖 Testing Shared Components`, subHeaderStyle);
  await sleep(500);

  // Agent Review Center (Fetching analyses)
  await postGraphQL(
    'GetAgentAnalyses',
    `query GetAgentAnalyses($repositoryId: ID, $status: AgentStatus) {
      agentAnalyses(repositoryId: $repositoryId, status: $status) {
        id
        agentId
        status
        findings { message }
      }
    }`, {
      repositoryId: "test-repo-123",
      status: "PENDING"
    }
  );
  await sleep(1000);

  // --- Final Summary ---
  console.log(`\n${a}✅ Smoke Test Complete!`, headerStyle);
  console.log(`${a}Please review the logs above and check the Network tab for any failed requests (marked in red).`, infoStyle);
  console.log(`${a}If all requests are green (status 200) and there are no GraphQL errors, all core components are communicating correctly.`, infoStyle);

})();
