# Phase 5: Integration & CLI Commands - User Interaction Design

## Executive Summary

This document defines the **complete integration framework** for the Autonomous Agent Network (AAN) with the existing Codeflow Commander platform, providing seamless user interaction through enhanced CLI commands and real-time visibility into autonomous agent activities.

### **Key Deliverables:**
- **New CLI agent management commands** - Complete specification and user experience
- **Phase 4 service integration points** - Query Service enhancements and GraphQL extensions
- **Real-time status visibility** - WebSocket subscriptions and streaming updates
- **Agent lifecycle management** - Control, monitoring, and feedback mechanisms

---

## 1. CLI Command Architecture

### 1.1 Command Hierarchy & Structure

The autonomous agent commands follow a hierarchical structure integrated into the existing `codeflow` CLI:

```bash
codeflow agents <subcommand> [options]
codeflow status agents           # Quick status overview
codeflow analyze --proactive     # Trigger proactive analysis
```

#### 1.1.1 Primary Command Groups

```typescript
// Agent Management Commands
codeflow agents list                     // List all active agents
codeflow agents status <agent-id>        // Detailed agent status
codeflow agents pause <agent-id>         // Temporarily suspend agent
codeflow agents resume <agent-id>        // Reactivate agent
codeflow agents stop <agent-id>         // Permanently stop agent
codeflow agents config <agent-id>       // View/modify agent configuration

// Repository Agent Management
codeflow agents enable --repository <repo> --type <type>  // Enable agent for repo
codeflow agents disable --repository <repo> --type <type> // Disable agent for repo

// Monitoring & Diagnostics
codeflow agents logs <agent-id> [--tail] [--since <time>]  // Agent activity logs
codeflow agents performance [--period <days>]            // Performance analytics
codeflow agents health                                       // Overall system health

// Learning & Feedback
codeflow agents feedback <recommendation-id> <accepted|rejected> --reason <text>
codeflow agents learn <agent-id> --from <other-agent-id>   // Transfer learning
```

### 1.2 Command Implementation Architecture

```typescript
class AgentsCommandRouter {
  private agentNetwork: AutonomousAgentNetwork;

  constructor() {
    this.agentNetwork = new AutonomousAgentNetwork();
  }

  async routeCommand(
    subcommand: string,
    args: string[],
    options: AgentCommandOptions
  ): Promise<CLIResult> {
    switch (subcommand) {
      case 'list':     return this.handleListCommand(options);
      case 'status':   return this.handleStatusCommand(args[0], options);
      case 'pause':    return this.handlePauseCommand(args[0], options);
      case 'resume':   return this.handleResumeCommand(args[0], options);
      case 'stop':     return this.handleStopCommand(args[0], options);
      case 'logs':     return this.handleLogsCommand(args[0], options);
      case 'health':   return this.handleHealthCommand(options);
      default:         throw new Error(`Unknown subcommand: ${subcommand}`);
    }
  }

  private async handleListCommand(options: AgentCommandOptions): Promise<CLIResult> {
    const agents = await this.agentNetwork.getAgents({
      repository: options.repository,
      type: options.type,
      status: options.status
    });

    return {
      success: true,
      data: agents.map(agent => ({
        id: agent.id,
        type: agent.type,
        status: agent.currentState,
        repository: agent.repositoryId,
        health: agent.healthScore.overallScore,
        lastActivity: agent.lastActiveTimestamp
      })),
      format: 'table'
    };
  }

  private async handleStatusCommand(agentId: string, options: AgentCommandOptions): Promise<CLIResult> {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    const status = await this.agentNetwork.getAgentStatus(agentId, {
      detailed: options.detailed,
      includeMetrics: options.metrics
    });

    return {
      success: true,
      data: status,
      format: options.detailed ? 'json' : 'formatted'
    };
  }
}
```

### 1.3 CLI Output Formatting & UX

#### 1.3.1 Agent List Display

```bash
$ codeflow agents list --repository sharv619/codeflow-commander

┌─────────────────────────┬─────────────┬──────────┬──────────────┬─────────┬─────────────────┐
│ Agent ID                │ Type        │ Status   │ Repository   │ Health  │ Last Activity   │
├─────────────────────────┼─────────────┼──────────┼──────────────┼─────────┼─────────────────┤
│ security-repo-001       │ security    │ idle     │ sharv609/... │ 0.98    │ 2 hours ago     │
│ architecture-repo-002   │ architecture│ analyzing │ sharv609/... │ 0.95    │ now             │
│ performance-repo-003    │ performance │ error    │ sharv609/... │ 0.87    │ 1 hour ago      │
│ quality-repo-004        │ quality     │ idle     │ sharv609/... │ 0.96    │ 5 minutes ago   │
└─────────────────────────┴─────────────┴──────────┴──────────────┴─────────┴─────────────────┘

4 agents total • 3 healthy • 1 needs attention
Use 'codeflow agents status <agent-id>' for details
```

#### 1.3.2 Detailed Agent Status

```bash
$ codeflow agents status security-repo-001 --detailed

🚀 Agent: security-repo-001 (Security Agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

├── Status:     Idle (Ready for analysis)
├── Health:     0.98 (Excellent)
├── Repository: sharv619/codeflow-commander
└── Type:       Security Agent v2.1.3

📊 Performance Metrics (Last 24h)
├── Analyses: 47 (96% success rate)
├── Average Response: 2.3s
├── Findings: 23 vulnerabilities detected
└── Accepted Rate: 89%

🧠 Learning Status
├── Experience Level: Advanced
├── Confidence Adjustment: +0.02 (improving)
├── Learned Patterns: 156 enterprise-specific
└── Effectiveness: 0.94

🔧 Configuration
├── Confidence Threshold: 0.85
├── Max Actions/Hour: 10
├── Circuit Breaker: Closed
└── Auto-Adaptation: Enabled

📋 Recent Activity
• Detected potential SQL injection vulnerability (3h ago)
• Verified OAuth token validation patterns (5h ago)
• Updated dependency scanning rules (1d ago)
• Participated in cross-agent consensus on crypto standards (2d ago)

💡 Agent is operating optimally. Last analysis found 3 medium-priority issues.
   Use 'codeflow agents logs security-repo-001 --tail' to monitor real-time activity.
```

#### 1.3.3 Health Dashboard

```bash
$ codeflow agents health

🎯 Autonomous Agent Network - Health Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System Status: HEALTHY
Uptime: 24d 8h 32m
Total Agents: 4
Active Analyses: 1
Average Response Time: 2.8s

📊 Agent Health Scores
├── Security:     ████████░░ 0.95 (Excellent)
├── Architecture: ███████░░░ 0.87 (Good)
├── Performance:  ████████░░ 0.92 (Excellent)
├── Quality:      ███████░░░ 0.89 (Good)

🔥 Active Analyses (1 running)
├── security-repo-001 analyzing repo push #1234 (45% complete, ETA 1.2s)

🚨 Recent Issues (None)
└── All systems operating normally

💡 Recent Achievements
├── Overall effectiveness increased by 3.2% this week
├── 47 recommendations accepted by developers
├── 5 new security patterns learned from feedback
└── Zero false positive alerts reported

🔧 Quick Actions
├── codeflow agents list                     # View all agents
├── codeflow agents performance --period 7  # Weekly analytics
└── codeflow agents logs --tail             # Real-time monitoring
```

---

## 2. Phase 4 Service Integration Points

### 2.1 Query Service GraphQL Extensions

The existing Query Service needs enhancement to support agent queries and real-time subscriptions:

#### 2.1.1 New GraphQL Schema Additions

```graphql
# Agent Management Queries
extend type Query {
  # Agent listing and discovery
  agents(repositoryId: ID, status: AgentStatus, type: AgentType): [Agent!]!

  # Detailed agent information
  agent(id: ID!): Agent

  # Agent analyses and results
  agentAnalyses(
    agentId: ID
    repositoryId: ID
    timeframe: TimeframeInput
    limit: Int = 50
  ): [AgentAnalysis!]!

  # Real-time agent status
  agentLiveStatus(agentId: ID!): AgentStatus!

  # Learning and effectiveness metrics
  agentLearningMetrics(
    agentId: ID
    timeframe: TimeframeInput
  ): AgentLearningMetrics!

  # Cross-agent collaboration data
  agentCollaborationSummary(repositoryId: ID!): CollaborationSummary!
}

# Agent Management Mutations
extend type Mutation {
  # Agent lifecycle control
  agentPause(agentId: ID!): AgentActionResult!
  agentResume(agentId: ID!): AgentActionResult!
  agentStop(agentId: ID!): AgentActionResult!

  # Configuration updates
  updateAgentConfiguration(
    agentId: ID!
    config: AgentConfigurationInput!
  ): AgentActionResult!

  # Feedback submission
  submitAgentFeedback(
    recommendationId: ID!
    action: FeedbackAction!
    reason: String
  ): FeedbackSubmissionResult!

  # Learning transfer
  transferAgentLearning(
    fromAgentId: ID!
    toAgentId: ID!
    patternIds: [ID!]
  ): LearningTransferResult!
}

# Real-time Subscriptions
extend type Subscription {
  # Agent status updates
  agentStatusUpdate(agentId: ID!): AgentStatusUpdate!

  # New analysis started
  agentAnalysisStarted(repositoryId: ID!): AgentAnalysisStarted!

  # Analysis completed
  agentAnalysisCompleted(repositoryId: ID!): AgentAnalysisCompleted!

  # Recommendations generated
  agentRecommendation(repositoryId: ID!): AgentRecommendation!

  # Learning updates
  agentLearningUpdate(agentId: ID!): AgentLearningUpdate!

  # System-wide alerts
  agentSystemAlert(severity: AlertSeverity): AgentSystemAlert!
}

# Supporting Types
type Agent {
  id: ID!
  type: AgentType!
  status: AgentStatus!
  repositoryId: ID!
  healthScore: Float!
  configuration: AgentConfiguration!
  performanceMetrics: AgentPerformanceMetrics!
  learningState: AgentLearningState!
  lastActivity: DateTime!
}

type AgentStatus {
  state: AgentStateEnum!
  currentAnalysis: AgentCurrentAnalysis
  uptime: Int!
  healthScore: Float!
  lastHeartbeat: DateTime!
}

type AgentAnalysis {
  id: ID!
  agentId: ID!
  repositoryId: ID!
  triggerEvent: TriggerEvent!
  startTime: DateTime!
  endTime: DateTime
  status: AnalysisStatus!
  findings: [AgentFinding!]!
  recommendations: [AgentRecommendation!]!
  confidence: Float!
  analysisTime: Int!  # milliseconds
}

# Union types for recommendations
union AgentRecommendation = SecurityRecommendation | ArchitectureRecommendation | PerformanceRecommendation | QualityRecommendation

type SecurityRecommendation {
  id: ID!
  type: String!
  severity: RecommendationSeverity!
  confidence: Float!
  location: CodeLocation!
  message: String!
  suggestedFix: String
  relatedVulnerabilities: [String!]
  dependencyUpdate: DependencyUpdate
}

# Enhanced correlation queries
extend type Query {
  # Link agent insights with developer actions
  developerAgentInteractions(
    developerId: ID!
    timeframe: TimeframeInput
  ): [DeveloperAgentInteraction!]!

  # Organizational learning metrics
  organizationalLearningMetrics(timeframe: TimeframeInput): OrganizationalLearningMetrics!
}
```

#### 2.1.2 Query Service Enhancements

```typescript
// Enhanced Query Service with Agent Support
class EnhancedQueryService {
  private ekgClient: EKGClient;
  private agentNetwork: AutonomousAgentNetwork;
  private subscriptionManager: SubscriptionManager;

  // Agent-specific query resolvers
  async getAgent(id: string): Promise<Agent> {
    return await this.agentNetwork.getAgent(id);
  }

  async getAgentsList(filter: AgentFilter): Promise<Agent[]> {
    return await this.agentNetwork.listAgents(filter);
  }

  async getAgentAnalyses(filter: AnalysisFilter): Promise<AgentAnalysis[]> {
    return await this.ekgClient.queryAgentAnalyses(filter);
  }

  async getAgentLearningMetrics(agentId: string, timeframe: Timeframe): Promise<LearningMetrics> {
    const agent = await this.agentNetwork.getAgent(agentId);
    return await this.ekgClient.queryLearningMetrics(agent, timeframe);
  }

  // Agent management mutations
  async pauseAgent(agentId: string): Promise<AgentActionResult> {
    const agent = await this.agentNetwork.getAgent(agentId);
    const result = await agent.pause();

    // Publish status change to subscribers
    await this.subscriptionManager.publish('agent.status.update', {
      agentId,
      previousStatus: agent.currentState,
      newStatus: AgentStateEnum.IDLE,
      timestamp: new Date()
    });

    return result;
  }

  async resumeAgent(agentId: string): Promise<AgentActionResult> {
    const agent = await this.agentNetwork.getAgent(agentId);
    const result = await agent.resume();

    await this.subscriptionManager.publish('agent.status.update', {
      agentId,
      previousStatus: agent.currentState,
      newStatus: AgentStateEnum.IDLE,
      timestamp: new Date()
    });

    return result;
  }

  // New agent-specific subscriptions
  onboarding() {
    this.subscriptionManager.subscribe('agent.analysis.completed', (event) => {
      this.updateEKGWithAgentFindings(event.payload);
    });

    this.subscriptionManager.subscribe('agent.learning.update', (event) => {
      this.persistAgentLearningProgress(event.payload);
    });

    this.subscriptionManager.subscribe('developer.agent.feedback', (event) => {
      this.applyLearningFromDeveloperFeedback(event.payload);
    });
  }

  private async updateEKGWithAgentFindings(analysisData: any) {
    // Store agent findings in EKG for cross-repository learning
    await this.ekgClient.storeAgentFindings(analysisData);

    // Update organizational patterns if necessary
    await this.ekgClient.updateOrganizationalPatterns(analysisData);
  }

  private async persistAgentLearningProgress(learningData: any) {
    await this.ekgClient.storeAgentLearningProgress(learningData);
  }

  private async applyLearningFromDeveloperFeedback(feedbackData: any) {
    // Update EKG with developer-validated findings
    await this.ekgClient.applyDeveloperFeedback(feedbackData);

    // Propagate learning to other agents
    await this.agentNetwork.distributeLearning(feedbackData);
  }
}
```

### 2.2 Real-Time Communication Architecture

#### 2.2.1 WebSocket Integration for Real-Time Status

```typescript
// Real-time status and event streaming
class RealTimeStatusManager {
  private wss: WebSocketServer;
  private subscriptions: Map<string, Set<WebSocket>> = new Map();
  private heartbeatTimers: Map<WebSocket, NodeJS.Timeout> = new Map();

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket) => {
      this.setupConnection(ws);
    });

    log.info(`Real-time status server running on port ${port}`);
  }

  private setupConnection(ws: WebSocket) {
    // Heartbeat mechanism
    const heartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000); // 30 second heartbeat

    this.heartbeatTimers.set(ws, heartbeatTimer);

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        this.handleSubscription(message, ws);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' }
        }));
      }
    });

    ws.on('close', () => {
      clearInterval(this.heartbeatTimers.get(ws)!);
      this.heartbeatTimers.delete(ws);
      this.removeSubscriptions(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      payload: { message: 'Real-time status connection established' }
    }));
  }

  private handleSubscription(message: any, ws: WebSocket) {
    const { action, channel, filter } = message;

    switch (action) {
      case 'subscribe':
        this.subscribe(ws, channel, filter);
        break;
      case 'unsubscribe':
        this.unsubscribe(ws, channel);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
        break;
    }
  }

  private subscribe(ws: WebSocket, channel: string, filter?: any) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(ws);

    // Send subscription confirmation
    ws.send(JSON.stringify({
      type: 'subscribed',
      payload: { channel, filter }
    }));

    // Send initial state if available
    this.sendInitialState(ws, channel, filter);
  }

  private unsubscribe(ws: WebSocket, channel: string) {
    const subscribers = this.subscriptions.get(channel);
    if (subscribers) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        this.subscriptions.delete(channel);
      }
    }
  }

  private removeSubscriptions(ws: WebSocket) {
    for (const subscribers of this.subscriptions.values()) {
      subscribers.delete(ws);
    }
  }

  // Public methods for publishing updates
  async publish(channel: string, payload: any, filter?: any) {
    const subscribers = this.subscriptions.get(channel) || new Set();

    const message = JSON.stringify({
      type: 'update',
      channel,
      payload,
      timestamp: new Date()
    });

    for (const ws of subscribers) {
      // Apply filter if provided
      if (filter && !this.matchesFilter(payload, filter)) {
        continue;
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  private matchesFilter(payload: any, filter: any): boolean {
    // Simple filter matching (can be enhanced)
    for (const key in filter) {
      if (payload[key] !== filter[key]) {
        return false;
      }
    }
    return true;
  }

  private async sendInitialState(ws: WebSocket, channel: string, filter?: any) {
    // Send current state for the channel
    switch (channel) {
      case 'agent.status':
        const agentStatuses = await this.getCurrentAgentStatuses(filter);
        ws.send(JSON.stringify({
          type: 'initial_state',
          channel,
          payload: agentStatuses
        }));
        break;

      case 'analysis.activity':
        const recentAnalyses = await this.getRecentAnalyses(filter);
        ws.send(JSON.stringify({
          type: 'initial_state',
          channel,
          payload: recentAnalyses
        }));
        break;
    }
  }

  private async getCurrentAgentStatuses(filter?: any): Promise<any> {
    // Implementation would query agent network for current states
    return {}; // Placeholder
  }

  private async getRecentAnalyses(filter?: any): Promise<any> {
    // Implementation would query EKG for recent activities
    return []; // Placeholder
  }
}
```

#### 2.2.2 CLI Command Streaming

```typescript
// CLI command with real-time streaming
class StreamingCLICommand {
  private wsClient: WebSocket | null = null;

  async executeStreaming(command: string, args: string[]): Promise<void> {
    // Parse streaming command
    const cmd = `${command} ${args.join(' ')} --stream`;

    return new Promise((resolve, reject) => {
      this.connectToStream(cmd);

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        this.disconnect();
        resolve();
      });
    });
  }

  private connectToStream(command: string) {
    const wsUrl = `ws://localhost:8080/stream/${encodeURIComponent(command)}`;

    this.wsClient = new WebSocket(wsUrl);

    this.wsClient.on('open', () => {
      console.log('🔗 Connected to real-time stream\n');
    });

    this.wsClient.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        this.handleStreamMessage(message);
      } catch (error) {
        console.log(data); // Raw output for non-JSON messages
      }
    });

    this.wsClient.on('error', (error) => {
      console.error('❌ Stream connection error:', error.message);
      process.exit(1);
    });

    this.wsClient.on('close', (code, reason) => {
      console.log(`\n🔌 Stream ended (code: ${code})`);
      if (reason) {
        console.log(`Reason: ${reason}`);
      }
    });
  }

  private handleStreamMessage(message: any) {
    switch (message.type) {
      case 'agent.status':
        this.displayAgentStatus(message.payload);
        break;

      case 'analysis.start':
        this.displayAnalysisStart(message.payload);
        break;

      case 'analysis.progress':
        this.displayAnalysisProgress(message.payload);
        break;

      case 'recommendation':
        this.displayRecommendation(message.payload);
        break;

      case 'error':
        this.displayError(message.payload);
        break;

      default:
        // Pass through for custom commands
        console.log(JSON.stringify(message, null, 2));
    }
  }

  private displayAgentStatus(status: any) {
    console.log(`[AGENT STATUS] ${status.agentId}: ${status.state} (${Math.round(status.healthScore * 100)}% health)`);
  }

  private displayAnalysisStart(data: any) {
    console.log(`[ANALYSIS STARTED] ${data.agentType} analyzing ${data.repositoryId} (${data.estimatedTime}s estimated)`);
  }

  private displayAnalysisProgress(data: any) {
    const progress = Math.round(data.progress * 100);
    const progressBar = '█'.repeat(progress / 2) + '░'.repeat(50 - progress / 2);
    console.log(`[ANALYSIS PROGRESS] ${data.agentType}: [${progressBar}] ${progress}% (${data.currentStep})`);
  }

  private displayRecommendation(rec: any) {
    const color = rec.confidence > 0.8 ? '\x1b[32m' : rec.confidence > 0.6 ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}[RECOMMENDATION] ${rec.message} (confidence: ${Math.round(rec.confidence * 100)}%)${reset}`);

    if (rec.action) {
      console.log(`  💡 Execute: codeflow agents feedback ${rec.id} accepted`);
    }
  }

  private displayError(error: any) {
    console.error(`❌ ERROR: ${error.message}`);
    if (error.details) {
      console.error(`   Details: ${JSON.stringify(error.details, null, 2)}`);
    }
  }

  private disconnect() {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }
  }
}
```

### 2.3 Enhanced Developer Workflow Integration

#### 2.3.1 Git Hook Enhancements

The existing `pre-commit` and `pre-push` hooks gain new capabilities:

```bash
#!/bin/bash
# Enhanced Git Hook with Autonomous Agent Integration

echo "🔬 Codeflow AI Analysis with Autonomous Agents"

# Check for active agents
if curl -s http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ agents(status: IDLE) { id type } }"}' >/dev/null; then

  echo "🤖 Autonomous agents detected - triggering proactive analysis"

  # Submit for automatic analysis
  ANALYSIS_RESULT=$(curl -s http://localhost:4000/graphql \
    -H "Content-Type: application/json" \
    -d '{
      "query": "mutation { analyzeDiff(diffContent: \"'$STAGED_DIFF'\", proactive: true) { analysisId recommendedActions } }"
    }')

  # Poll for completion (simplified)
  ANALYSIS_ID=$(echo $ANALYSIS_RESULT | jq -r '.data.analyzeDiff.analysisId')

  echo "📋 Proactive analysis triggered (ID: $ANALYSIS_ID)"
  echo "💡 Continue working - agents will provide feedback asynchronously"
else
  echo "⚡ Using traditional analysis"
  # Fall back to existing logic
fi

echo "✅ Commit ready for development team"
```

#### 2.3.2 IDE Plugin Integration Points

```typescript
// Integration API for IDE plugins
class IDEAgentIntegration {
  private wsConnection: WebSocket;
  private currentFile: string;
  private repositoryId: string;

  constructor(repositoryId: string) {
    this.repositoryId = repositoryId;
    this.connect();
  }

  async connect() {
    this.wsConnection = new WebSocket('ws://localhost:8080/ide-integration');

    this.wsConnection.onmessage = (event) => {
      const update = JSON.parse(event.data);
      this.handleIdeUpdate(update);
    };
  }

  // File-specific agent consultation
  async getFileSpecificGuidance(filePath: string, cursorPosition?: Position) {
    const guidance = await this.queryEKGForFileGuideline(filePath);

    if (cursorPosition) {
      // Get function-level recommendations
      const functionContext = await this.getFunctionContext(filePath, cursorPosition);
      return {
        ...guidance,
        functionLevel: await this.getFunctionRecommendations(functionContext)
      };
    }

    return guidance;
  }

  // Real-time error detection
  async submitCodeChange(filePath: string, change: IncrementalChange) {
    await this.wsConnection.send(JSON.stringify({
      type: 'code_change',
      payload: {
        filePath,
        change,
        repositoryId: this.repositoryId,
        timestamp: new Date()
      }
    }));
  }

  private async handleIdeUpdate(update: any) {
    switch (update.type) {
      case 'real_time_issue':
        this.showIdeNotification(update.payload, 'warning');
        break;

      case 'improvement_suggestion':
        this.showIdeSuggestion(update.payload);
        break;

      case 'pattern_match':
        this.highlightPatternMatch(update.payload);
        break;
    }
  }
}
```

---

## 3. CLI User Experience Design

### 3.1 Command Discovery & Help System

```bash
$ codeflow agents --help

Autonomous Agent Network Management
Manage and monitor intelligent code analysis agents

USAGE:
    codeflow agents <subcommand> [options]

SUBCOMMANDS:
    list        List all active agents and their status
    status      Get detailed status information for a specific agent
    pause       Temporarily suspend an agent
    resume      Reactivate a suspended agent
    stop        Permanently stop and remove an agent
    config      View or modify agent configuration
    logs
