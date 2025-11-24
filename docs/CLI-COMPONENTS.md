# CLI Tool Components Documentation

## 🔧 **Codeflow Hook CLI Tool - Component Guide**

The CLI tool is the primary user interface of Codeflow Commander, designed as a self-contained, configurable AI-powered Git workflow assistant. This document explains how each component works and how they integrate together.

---

## 🧠 **Local RAG System (`services/rag-system.js`)**

### **Purpose**
The RAG (Retrieval-Augmented Generation) system provides context-aware AI analysis by indexing and retrieving relevant code segments from your project.

### **How It Works**
```
Code Analysis Flow:
1. Repository Indexing     →   Files scanned and chunked
2. Embedding Generation    →   Text chunks converted to vectors
3. Vector Storage         →   SQLite database (.codeflow/index/)
4. Query Processing       →   Semantic search on user questions
5. Context Retrieval      →   Relevant code segments returned
6. AI Enhancement         →   Context injected into prompts
```

### **Key Implementation Details**

#### **Chunking Strategy**
```javascript
// Text chunking with intelligent boundary detection
chunkText(text, chunkSize = 1000, overlap = 200) {
  // Looks for sentence boundaries within chunkSize window
  // Handles code blocks, comments, and natural language breaks
  // Returns array of text chunks with overlap for continuity
}
```

#### **Vector Storage**
```javascript
// Local SQLite storage for embeddings
async addVectors(embeddings, metadata) {
  // Creates FAISS-compatible index
  // Stores embeddings with metadata:
  // - filePath: relative path to source file
  // - chunkIndex: position in file
  // - language: programming language
  // - lastModified: file modification timestamp
}
```

#### **Semantic Search**
```javascript
// Retrieves context for user queries
async retrieveContext(query, options) {
  // 1. Generate embedding for user query
  // 2. Find similar vectors in index (cosine similarity)
  // 3. Filter by score threshold and language relevance
  // 4. Return ranked context chunks with metadata
}
```

### **Usage Examples**
```bash
# Index repository for RAG
codeflow-hook rag-index

# Analyze with RAG context
codeflow-hook rag-analyze "implement authentication" --query "security patterns"

# Check RAG system status
codeflow-hook rag-status

# Clear and rebuild index
codeflow-hook rag-clear
```

---

## 💾 **Project Knowledge Store (`src/knowledge/`)**

### **Purpose**
The knowledge store maintains project intelligence and patterns learned from your development activities over time.

### **Components**

#### **Project Store (`projectStore.js`)**
```javascript
class ProjectStore {
  // Maintains project-wide intelligence:
  // - Coding patterns and conventions
  // - Architecture decisions
  // - Security policies
  // - Performance best practices

  addPattern(pattern) {
    // Learns from AI suggestions and user feedback
    // Builds project-specific knowledge base
  }

  getContext(query) {
    // Returns relevant project context
    // Used to enhance AI analysis with project history
  }
}
```

#### **Knowledge Graph (`graphService.js`)**
```javascript
class GraphService {
  // Lightweight knowledge graph for relationships:
  // - File dependencies and imports
  // - Code patterns and anti-patterns
  // - Development team knowledge areas
  // - Change impact analysis

  findSimilarPatterns(codeSnippet) {
    // Graph-based similarity search
    // Faster and more precise than embeddings
  }

  buildRelationships() {
    // Creates links between code elements
    // Enables context-aware suggestions
  }
}
```

### **Learning Mechanisms**
```javascript
// Pattern learning from AI interactions
learnFromInteraction(userCode, aiSuggestion, feedback) {
  // Records successful patterns
  // Adapts to team preferences
  // Improves future suggestions

  if (feedback === 'helpful') {
    this.patternStore.recordSuccess(aiSuggestion.pattern);
    this.updatePreferences(aiSuggestion.category, +0.1);
  }
}
```

---

## 🛡️ **Compliance & Security Engine (CLI Core)**

### **Purpose**
Built-in compliance validation and security scanning integrated into the Git workflow.

### **Compliance Frameworks**

#### **GDPR Compliance**
```javascript
checkGDPRCompliance(diffContent) {
  // Personal Data Processing
  const personalData = /email|phone|address|name|ssn|credit.?card/i;

  // Legal Basis Checks
  const consentMechanism = /consent|permission|opt.?in/i;
  const retentionPolicy = /retention|delete.*after|store.*for/i;

  // Data Subject Rights
  const accessRights = /access.*request|delete.*request|rectification/i;

  // Risk Assessment
  return {
    containsPersonalData: personalData.test(diffContent),
    validLegalBasis: consentMechanism.test(diffContent),
    retentionDefined: retentionPolicy.test(diffContent),
    subjectRightsImplemented: accessRights.test(diffContent)
  };
}
```

#### **SOX Compliance (Financial)**
```javascript
checkSOXCompliance(diffContent) {
  // Financial Data Handling
  const financialLogic = /financial|accounting|revenue|expense/i;

  // Approval Workflows
  const approvalRequired = /approve|review|authorize/i;

  // Audit Trails
  const changeLogging = /log.*change|audit.*trail/i;

  // Segregation of Duties
  const roleSeparation = /separate.*role|dual.*control/i;

  return {
    requiresApproval: financialLogic.test(diffContent),
    approvalWorkflow: approvalRequired.test(diffContent),
    auditTrail: changeLogging.test(diffContent),
    properSegregation: roleSeparation.test(diffContent)
  };
}
```

#### **HIPAA Compliance (Healthcare)**
```javascript
checkHIPAACompliance(diffContent) {
  // PHI (Protected Health Information)
  const containsPHI = /patient|medical|health|diagnosis|treatment|phi/i;

  // Security Controls
  const encryptionUsed = /encrypt|encryption|tls|ssl|https|aes/i;
  const accessControl = /authentication|authorization|role|permission/i;
  const auditLogging = /audit.*log|access.*log|track/i;

  return {
    containsProtectedData: containsPHI.test(diffContent),
    encryptionImplemented: encryptionUsed.test(diffContent),
    accessControlActive: accessControl.test(diffContent),
    auditTrailEnabled: auditLogging.test(diffContent)
  };
}
```

### **Security Scanning**
```javascript
scanForVulnerabilities(content, filePath, rules) {
  // Pattern-based vulnerability detection
  const vulnerabilities = [];

  if (rules.includes('secrets')) {
    // Check for hardcoded secrets
    const secretMatches = content.match(/password.*=|api.?key.*=|secret.*=/gi);
    if (secretMatches) {
      vulnerabilities.push({
        rule: 'hardcoded-secrets',
        severity: 'HIGH',
        fix: 'Use environment variables or secure vault'
      });
    }
  }

  if (rules.includes('xss')) {
    // XSS vulnerability patterns
    const xssPatterns = /innerHTML.*=.*[^$]|dangerouslySetInnerHTML/i;
    if (xssPatterns.test(content)) {
      vulnerabilities.push({
        rule: 'xss-innerHTML',
        severity: 'MEDIUM',
        fix: 'Use textContent or sanitize input'
      });
    }
  }

  return vulnerabilities;
}
```

### **Risk Assessment**
```javascript
performRiskAssessment(diffContent, threshold) {
  const factors = [];

  // Data Sensitivity Risk
  if (/password|personal|financial|medical/i.test(diffContent)) {
    factors.push({
      name: 'Data Sensitivity',
      score: 85,
      description: 'Handles sensitive data types'
    });
  }

  // Authentication Risk
  if (/login|auth|session/i.test(diffContent) && !/mfa|two.?factor/i.test(diffContent)) {
    factors.push({
      name: 'Authentication Strength',
      score: 70,
      description: 'Authentication without MFA consideration'
    });
  }

  // Input Validation Risk
  if (/input.*user|form.*data/i.test(diffContent) && !/validate|sanitize/i.test(diffContent)) {
    factors.push({
      name: 'Input Validation',
      score: 60,
      description: 'User input without validation'
    });
  }

  // Overall Risk Calculation
  const overallRisk = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;

  return {
    riskScore: Math.round(Math.min(overallRisk, 100)),
    factors,
    thresholdExceeded: overallRisk > threshold
  };
}
```

---

## 🤖 **AI Provider Abstraction Layer**

### **Purpose**
Provides unified interface to multiple AI providers while keeping configuration local and secure.

### **Architecture**
```javascript
// AI Provider Abstraction
const aiProviders = {
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1/models',
    authHeader: 'key', // API key in header
    formatPrompt: formatGeminiPrompt,
    parseResponse: parseGeminiResponse
  },

  openai: {
    baseURL: 'https://api.openai.com/v1/chat/completions',
    authHeader: 'Bearer', // Bearer token
    formatPrompt: formatOpenAIPrompt,
    parseResponse: parseOpenAIResponse
  },

  claude: {
    baseURL: 'https://api.anthropic.com/v1/messages',
    authHeader: 'x-api-key',
    formatPrompt: formatClaudePrompt,
    parseResponse: parseClaudeResponse
  }
};
```

### **Configuration Management**
```javascript
// Local, secure configuration
class ConfigManager {
  constructor() {
    this.configPath = path.join(
      os.homedir(),
      '.codeflow-hook',
      'config.json'
    );
  }

  // Sensitive data remains local
  saveProviderConfig(provider, apiKey, model) {
    const config = {
      provider,
      apiKey: this.encrypt(apiKey), // Basic encryption
      model,
      lastUpdated: new Date().toISOString()
    };

    // Write to user home directory
    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }
}
```

### **Provider Selection Logic**
```javascript
chooseBestProvider(context) {
  // 1. Check user preference
  if (this.hasPreferredProvider()) {
    return this.preferredProvider;
  }

  // 2. Select based on task type
  switch(context.taskType) {
    case 'code-review':
      return 'claude'; // Better at code analysis
    case 'security-scan':
      return 'openai'; // Good for classification
    case 'general':
      return 'gemini'; // Fast and reliable
    default:
      return 'gemini';
  }

  // 3. Fallback to availability
  // 4. Cost optimization
}
```

---

## ⚙️ **Git Integration Layer**

### **Purpose**
Provides seamless integration with Git workflows through hooks and diff processing.

### **Hook System**
```bash
# Pre-commit hook installation
installPreCommitHook() {
  const hookContent = `#!/bin/bash
# Codeflow analysis hook
STAGED_DIFF=$(git diff --cached)
if [ -n "$STAGED_DIFF" ]; then
  echo "$STAGED_DIFF" | codeflow-hook analyze-diff
fi
`;

  writeFileSync('.git/hooks/pre-commit', hookContent);
  chmod('+x', '.git/hooks/pre-commit');
}

# Pre-push hook for full CI validation
installPrePushHook() {
  const hookContent = `#!/bin/bash
# Full CI validation with Codeflow
npm test &&
git diff --cached | codeflow-hook analyze-diff &&
codeflow-hook compliance-check &&
echo "✅ All validations passed"
`;

  writeFileSync('.git/hooks/pre-push', hookContent);
  chmod('+x', '.git/hooks/pre-push');
}
```

### **Diff Processing Engine**
```javascript
processGitDiff(diffContent) {
  // 1. Parse diff format
  const diffLines = diffContent.split('\n');

  // 2. Extract file changes
  const changedFiles = this.parseFileHeaders(diffLines);

  // 3. Analyze change types
  changedFiles.forEach(file => {
    file.changeType = this.classifyChange(file.additions, file.deletions);
    file.riskLevel = this.calculateChangeRisk(file);
    file.testRequired = this.requiresTesting(file);
  });

  // 4. Generate summary
  return {
    totalFiles: changedFiles.length,
    totalAdditions: sum(changedFiles, 'additions'),
    totalDeletions: sum(changedFiles, 'deletions'),
    files: changedFiles,
    summary: this.generateSummary(changedFiles)
  };
}
```

---

## 🔄 **Data Processing Pipeline**

### **Analysis Pipeline**
```
Input (Diff/Files)
    ↓
Diff Processing → Structured Change Data
    ↓
Local Context Retrieval → RAG + Knowledge Graph
    ↓
AI Provider Selection → Gemini/OpenAI/Claude
    ↓
Enhanced Prompt Construction → Context + AI Task
    ↓
AI Analysis → Code Review + Recommendations
    ↓
Compliance Validation → Security + Legal Checks
    ↓
Risk Assessment → Business Impact Evaluation
    ↓
Output Generation → Terminal + Structured Data
```

### **Context Building**
```javascript
buildAnalysisContext(diffAnalysis) {
  return {
    // Code context from RAG
    codeContext: await this.ragSystem.retrieveContext(
      this.generateContextQuery(diffAnalysis),
      { limit: 3 }
    ),

    // Knowledge context from local store
    projectPatterns: await this.knowledgeStore.getRelevantPatterns(
      diffAnalysis.languages,
      diffAnalysis.categories
    ),

    // Repository-specific context
    repositoryInfo: await this.getRepositoryContext(
      diffAnalysis.files
    ),

    // Personalization from user history
    userPreferences: await this.getUserPreferences(),

    // Compliance requirements
    complianceRules: this.determineRequiredCompliance(
      diffAnalysis.sensitiveContent
    )
  };
}
```

### **AI Interaction Layer**
```javascript
async performAIAnalysis(context, task) {
  // 1. Select appropriate model
  const provider = this.selectBestProvider(task, context);

  // 2. Build optimized prompt
  const prompt = this.constructAIPrompt(task, context);

  // 3. Make API call with retry logic
  const response = await this.callAIProvider(provider, prompt);

  // 4. Parse and validate response
  const analysis = this.parseAIResponse(response, task);

  // 5. Apply AI confidence filtering
  if (analysis.confidence < this.confidenceThreshold) {
    analysis.recommendations = analysis.recommendations.filter(
      rec => rec.confidence >= this.confidenceThreshold
    );
  }

  return analysis;
}
```

---

## 🔧 **Configuration & Extensibility**

### **Configuration Cascade**
```javascript
loadConfiguration() {
  // 1. Load global config (~/.codeflow-hook/config.json)
  // 2. Load project config (.codeflowrc.json in repo)
  // 3. Load environment-specific overrides
  // 4. Apply CLI flags on top

  // Later settings override earlier ones
  return mergeConfigs(globalConfig, projectConfig, envConfig, cliFlags);
}
```

### **Plugin System**
```javascript
// Extensible analysis plugins
const plugins = {
  customCompliance: {
    name: 'Custom Security Rules',
    check: async (diff) => {
      // Custom rules for specific organizations
      return customValidation(diff);
    }
  },

  industrySpecific: {
    name: 'Finance Industry Rules',
    analyze: async (context) => {
      // Banking-specific code analysis
      return {
        soxCompliant: await checkSOXrules(context),
        riskAssessed: await assessFinancialRisk(context)
      };
    }
  }
};
```

---

## 📊 **Performance & Scalability**

### **Local Processing Benefits**
- **No Network Latency**: All analysis happens instantly
- **No API Limits**: No rate limiting or quota concerns
- **Offline Capability**: Works without internet connection
- **Predictable Costs**: AI provider costs only when using AI

### **Resource Optimization**
```javascript
optimizeForPerformance() {
  // Memory management
  if (this.memoryUsage > this.maxMemoryMB) {
    this.ragSystem.clearLeastUsedEmbeddings();
  }

  // Selective indexing
  if (repo.size > this.largeRepoThreshold) {
    this.enableSelectiveIndexing(excludePatterns);
  }

  // Background processing
  if (!this.userIsTyping) {
    this.performBackgroundIndexing();
  }
}
```

### **Incremental Updates**
```javascript
incrementalIndexing(changedFiles) {
  // Updates only changed files in RAG index
  // Maintains consistency without full rebuild
  // Enables real-time context updates

  changedFiles.forEach(async (file) => {
    await this.ragSystem.updateFileEmbeddings(file);
    await this.knowledgeStore.updateFilePatterns(file);
  });
}
```

---

## 🎯 **Extensibility Points**

### **For Contributors**
```javascript
// Add new AI provider
registerProvider('custom-ai', {
  baseURL: 'https://custom-ai.com/api',
  formatPrompt: (prompt) => ({ text: prompt }),
  parseResponse: (res) => res.data.text
});

// Add custom compliance rules
registerComplianceRule('my-industry', {
  name: 'Industry Compliance',
  check: async (diff) => customComplianceLogic(diff),
  severity: 'HIGH'
});

// Extend analysis types
registerAnalysisType('code-smell', {
  description: 'Detect code quality issues',
  patterns: [/long.method/i, /duplicate.code/i],
  suggestions: ['extract method', 'remove duplication']
});
```

### **Plugin API**
```typescript
interface CodeflowPlugin {
  name: string;
  version: string;

  // Hook into CLI lifecycle
  preAnalysis?: (diff: DiffAnalysis) => Promise<void>;
  postAnalysis?: (results: AnalysisResults) => Promise<void>;

  // Add custom commands
  commands?: CommandDefinition[];

  // Extend analysis pipeline
  analyzers?: Analyzer[];
}
```

---

## 📈 **Metrics & Analytics**

### **Usage Tracking (Opt-in)**
```javascript
// Anonymous, local usage metrics
trackUsage(feature, metadata) {
  if (!this.optedIntoAnalytics) return;

  const metric = {
    timestamp: Date.now(),
    feature,
    metadata: anonymize(metadata),
    sessionId: this.sessionId
  };

  // Store locally for user review
  this.metricsStore.add(metric);

  // Optional: Send aggregated insights (never raw data)
}
```

### **Performance Monitoring**
```javascript
monitorPerformance(operation, startTime) {
  const duration = Date.now() - startTime;
  const metric = {
    operation,
    duration,
    resourceUsage: process.memoryUsage(),
    successRate: operation.success ? 1 : 0
  };

  // Performance optimization
  if (duration > this.performanceThreshold) {
    this.performanceInsights.identifyBottlenecks(operation);
  }

  // Continuous improvement
  this.performanceHistory.record(metric);
}
```

---

This CLI tool represents a sophisticated yet accessible approach to AI-enhanced development workflows, prioritizing privacy, performance, and extensibility while maintaining a simple installation and usage model.
