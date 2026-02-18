# Security Agent Logic Map

## Overview

This document traces the complete data flow for the Security Agent from file change detection to suggestion display in the frontend. Every step is mapped with specific file paths and data transformations.

## Data Flow Trace

### 1. File Change Detection → Change Queue

**Source**: File system change (e.g., `src/services/user-service.ts` modified)

**Path**: `server/change-queue.js`
- **Function**: `enqueueChange(changeEvent)`
- **Input**: Raw file change event from daemon
- **Output**: Enqueued change with UUID and metadata

```javascript
// Input format
{
  id: "uuid-v4",
  file: "src/services/user-service.ts",
  repository: "codeflow-commander",
  changeType: "modify",
  timestamp: "2025-01-15T13:30:00Z",
  gitStatus: "modified",
  fileSize: 2048,
  checksum: "abc123def456"
}

// Output format (enqueued)
{
  id: "uuid-v4",
  file: "src/services/user-service.ts",
  repository: "codeflow-commander",
  changeType: "modify",
  timestamp: "2025-01-15T13:30:00Z",
  gitStatus: "modified",
  fileSize: 2048,
  checksum: "abc123def456",
  status: "queued",
  queuedAt: "2025-01-15T13:30:01Z"
}
```

### 2. Change Queue → Agent Orchestrator

**Path**: `server/change-queue.js` → Agent Network
- **Function**: `processChange(change)`
- **Trigger**: Queue processing loop
- **Action**: Calls AgentOrchestrator with change event

### 3. Agent Orchestrator → Security Agent

**Path**: `packages/services/autonomous-agent-network/src/core/AgentOrchestrator.ts` (TO BE CREATED)
- **Function**: `coordinateAgents(changeEvent, context)`
- **Logic**: 
  1. Fetch EKG context from Python backend
  2. Determine which agents to run based on file type
  3. Execute Security Agent for TypeScript/JavaScript files

### 4. Security Agent Analysis

**Path**: `packages/services/autonomous-agent-network/src/agents/SecurityAgent.ts` (TO BE CREATED)
- **Function**: `analyze(change: ChangeEvent, context: AnalysisContext): Promise<AgentResult>`
- **Security Patterns Detected**:

#### Pattern 1: Hardcoded Secrets
```javascript
// Detection patterns
const SECRET_PATTERNS = [
  /password\s*[:=]\s*['"`][^'"`]+['"`]/i,
  /api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/i,
  /secret\s*[:=]\s*['"`][^'"`]+['"`]/i,
  /token\s*[:=]\s*['"`][^'"`]+['"`]/i
];
```

#### Pattern 2: Insecure Cryptographic Usage
```javascript
// Detection patterns
const CRYPTO_PATTERNS = [
  /md5\(/i,
  /sha1\(/i,
  /eval\(/i,
  /innerHTML\s*=/,
  /document\.write\(/i
];
```

#### Pattern 3: SQL Injection Vulnerabilities
```javascript
// Detection patterns
const SQL_PATTERNS = [
  /query\s*\(\s*['"`][^'"`]*\$\{[^}]+\}/i,
  /execute\s*\(\s*['"`][^'"`]*\$\{[^}]+\}/i,
  /SELECT.*\+.*FROM/i
];
```

#### Pattern 4: XSS Vulnerabilities
```javascript
// Detection patterns
const XSS_PATTERNS = [
  /innerHTML\s*=/,
  /outerHTML\s*=/,
  /insertAdjacentHTML/i,
  /document\.write\(/i
];
```

#### Pattern 5: Path Traversal
```javascript
// Detection patterns
const PATH_PATTERNS = [
  /\.\.\/.*\.\./,
  /path\.join.*\.\./,
  /fs\.readFile.*\.\./
];
```

### 5. Security Agent → Analysis Result

**Output Format**:
```javascript
{
  agentId: "security-agent-v1",
  agentType: "security",
  timestamp: Date,
  suggestions: [
    {
      id: "suggestion-uuid",
      title: "Hardcoded Secret Detected",
      description: "Hardcoded API key found in source code",
      severity: "high",
      confidence: 0.95,
      codePatch: {
        file: "src/services/user-service.ts",
        lineStart: 42,
        lineEnd: 42,
        originalCode: "const apiKey = 'abc123secret';",
        suggestedCode: "const apiKey = process.env.API_KEY;",
        language: "typescript",
        patchType: "replace"
      },
      reasoning: "Hardcoded secrets should be stored in environment variables",
      validationResults: {
        testsPass: true,
        securityScanPass: true,
        performanceImpact: "neutral"
      },
      tags: ["security", "secrets", "hardcoded"]
    }
  ],
  metadata: {
    analysisDepth: "deep",
    contextUsed: ["dependencies", "owners", "risk_factors"],
    dependenciesAnalyzed: ["src/utils/config.ts"],
    policiesApplied: ["confidence_threshold"],
    executionMetrics: {
      executionTime: 150,
      suggestionsCount: 1,
      success: true
    }
  },
  executionTime: 150,
  confidence: 0.95
}
```

### 6. Consensus Protocol

**Path**: `packages/services/autonomous-agent-network/src/core/ConsensusEngine.ts` (TO BE CREATED)

#### Conflicting Opinion Resolution

**Conflict Example**:
- Security Agent: "Remove eval() - CRITICAL security risk"
- Quality Agent: "eval() is acceptable for this dynamic use case"

**Conflict Object Format**:
```javascript
{
  conflictId: "conflict-uuid",
  changeId: "change-uuid",
  timestamp: Date,
  conflictingSuggestions: [
    {
      agentId: "security-agent",
      suggestion: { /* security suggestion */ },
      reasoning: "eval() creates code injection vulnerability"
    },
    {
      agentId: "quality-agent", 
      suggestion: { /* quality suggestion */ },
      reasoning: "eval() is necessary for dynamic template rendering"
    }
  ],
  conflictType: "semantic",
  severity: "high",
  resolutionStrategy: "authority_based"
}
```

#### Resolution Process:
1. **Authority-Based**: Security agent has higher authority for security issues
2. **Evidence-Based**: Analyze code context and usage patterns
3. **Consensus-Based**: If both agents agree on severity, escalate to human review

### 7. Frontend Integration

**Path**: `packages/simulator-ui/components/intelligence/AgentReviewCenter.tsx`
- **Function**: `fetchSuggestions()` and `handleAcceptSuggestion()`
- **Data Flow**: 
  1. Poll backend for new suggestions
  2. Display in Agent Review Center
  3. User accepts/rejects suggestions
  4. Send feedback to learning engine

## File Dependencies Verification

### Existing Files (✅):
- `server/change-queue.js` - Change queue implementation
- `server/ekg_connector.py` - EKG context service
- `packages/services/autonomous-agent-network/src/core/AutonomousAgent.ts` - Base agent class
- `packages/services/autonomous-agent-network/src/types/agent-types.ts` - Type definitions
- `packages/simulator-ui/components/intelligence/AgentReviewCenter.tsx` - Frontend component

### Missing Files (❌ - TO BE CREATED):
- `packages/services/autonomous-agent-network/src/core/AgentOrchestrator.ts` - Agent coordination
- `packages/services/autonomous-agent-network/src/core/ConsensusEngine.ts` - Conflict resolution
- `packages/services/autonomous-agent-network/src/agents/SecurityAgent.ts` - Security analysis
- `packages/services/autonomous-agent-network/src/agents/QualityAgent.ts` - Quality analysis
- `packages/services/autonomous-agent-network/src/agents/ArchitectureAgent.ts` - Architecture analysis
- `packages/services/autonomous-agent-network/src/agents/PerformanceAgent.ts` - Performance analysis

## Verification Points

### ✅ Verified Working:
1. Change Queue accepts POST requests
2. EKG Context service responds to API calls
3. Frontend can communicate with backend
4. Basic agent framework structure exists

### ❌ Needs Implementation:
1. AgentOrchestrator coordination logic
2. SecurityAgent pattern detection
3. ConsensusEngine conflict resolution
4. Real agent execution workflow

## Next Steps

1. **Create missing agent files** (SecurityAgent, QualityAgent, etc.)
2. **Implement AgentOrchestrator** to coordinate agent execution
3. **Build ConsensusEngine** for conflict resolution
4. **Create verification script** to test complete workflow
5. **Integrate with existing backend services**

This logic map provides complete traceability from file change to frontend suggestion, ensuring no "empty shells" in the nervous system.