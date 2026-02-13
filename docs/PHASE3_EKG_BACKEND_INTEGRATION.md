# Phase 3: EKG Backend Integration - Knowledge Graph Architecture

## Executive Summary

This document details **Phase 3** of the Codeflow evolution, where the system transitions from local processing to **Enterprise Knowledge Graph (EKG) backend integration**. By leveraging Neptune graph database and microservices architecture, Phase 3 enables cross-repository learning, organizational pattern recognition, and scalable analysis capabilities.

### **Key Deliverables:**
- **EKG (Enterprise Knowledge Graph) architecture** with Neptune integration
- **Ingestion Service** for automated repository analysis and graph population
- **Query Service** with GraphQL API for intelligent analysis queries
- **Cross-repository pattern learning** and organizational intelligence
- **Scalable microservices deployment** with Kubernetes orchestration

---

## 1. EKG Architecture Overview

### 1.1 Knowledge Graph Schema Design

The Enterprise Knowledge Graph serves as the central intelligence layer, connecting repositories, patterns, developers, and organizational knowledge:

```cypher
// Core EKG Schema - Nodes and Relationships
(:Repository {
  id: string,
  name: string,
  fullName: string,
  owner: string,
  language: string,
  cloneUrl: string,
  description: string,
  createdAt: datetime,
  lastCommit: datetime,
  metrics: {
    stars: int,
    forks: int,
    contributors: int,
    lastActivity: datetime
  }
})

(:File {
  id: string,
  path: string,
  name: string,
  extension: string,
  language: string,
  size: int,
  lines: int,
  complexity: float,
  lastModified: datetime
})

(:Pattern {
  id: string,
  name: string,
  type: string,  // 'security', 'architecture', 'performance', 'quality'
  category: string,
  confidence: float,
  observationCount: int,
  firstSeen: datetime,
  lastSeen: datetime,
  examples: string[],
  metadata: {
    impact: string,
    fixComplexity: string,
    tags: string[]
  }
})

(:Analysis {
  id: string,
  type: string,  // 'commit', 'pr', 'scheduled', 'manual'
  status: string,  // 'running', 'completed', 'failed'
  startTime: datetime,
  endTime: datetime,
  findings: int,
  recommendations: int,
  confidence: float
})

(:Developer {
  id: string,
  username: string,
  email: string,
  role: string,
  experience: float,
  specializations: string[],
  metrics: {
    commits: int,
    pullRequests: int,
    acceptedSuggestions: int,
    codeReviews: int
  }
})

// Relationships
(repository:Repository)-[:CONTAINS_FILE]->(file:File)
(file:File)-[:USES_PATTERN]->(pattern:Pattern)
(pattern:Pattern)-[:DISCOVERED_IN]->(analysis:Analysis)
(analysis:Analysis)-[:ANALYZES]->(repository:Repository)
(developer:Developer)-[:CREATED]->(analysis:Analysis)
(developer:Developer)-[:COLLABORATES_WITH]->(developer:Developer)
(pattern:Pattern)-[:SIMILAR_TO]->(pattern:Pattern)
```

### 1.2 Graph Query Patterns for Intelligence

```typescript
// Intelligent Relationship Queries
class EKGMiningEngine {
  private neptuneClient: NeptuneClient;

  // Find similar repositories for comparative analysis
  async findSimilarRepositories(repositoryId: string, limit = 5): Promise<SimilarRepository[]> {
    const query = `
      MATCH (target:Repository {id: $repositoryId})
      MATCH (other:Repository)
      WHERE other.id <> $repositoryId

      // Calculate similarity based on shared patterns
      OPTIONAL MATCH (target)-[:CONTAINS_FILE]->(f1:File)-[:USES_PATTERN]->(p:Pattern)<-[:USES_PATTERN]-(f2:File)<-[:CONTAINS_FILE]-(other)

      WITH target, other, COUNT(DISTINCT p) as sharedPatterns,
           COLLECT(DISTINCT p.name) as patternNames

      WHERE sharedPatterns > 0

      // Calculate size similarity
      WITH target, other, sharedPatterns, patternNames,
           ABS(target.metrics.contributors - other.metrics.contributors) / MAX(target.metrics.contributors, other.metrics.contributors) as contributorSimilarity

      // Score and rank
      WITH other, sharedPatterns, patternNames, contributorSimilarity,
           (sharedPatterns * 100) + ((1 - contributorSimilarity) * 50) as similarityScore

      ORDER BY similarityScore DESC
      LIMIT $limit

      RETURN other.id as repositoryId,
             other.fullName as fullName,
             similarScore,
             sharedPatterns,
             patternNames[0..3] as examples`;

    const result = await this.neptuneClient.query(query, { repositoryId, limit });
    return result.records.map(record => ({
      repositoryId: record.get('repositoryId'),
      fullName: record.get('fullName'),
      similarityScore: record.get('similarScore'),
      sharedPatterns: record.get('sharedPatterns'),
      examples: record.get('examples') || []
    }));
  }

  // Discover organizational patterns across repositories
  async discoverOrganizationalPatterns(minOccurrences = 3): Promise<OrganizationalPattern[]> {
    const query = `
      MATCH (repo:Repository)-[:CONTAINS_FILE]->(file:File)-[:USES_PATTERN]->(pattern:Pattern)

      WITH COUNT(DISTINCT repo) as repoCount, pattern,
           COLLECT(DISTINCT repo.name)[0..5] as affectedRepos,
           COLLECT(DISTINCT file.language) as languages

      WHERE repoCount >= $minOccurrences

      // Calculate pattern impact
      MATCH (pattern)-[:USED_IN_ANALYSIS]->(analysis:Analysis)
      WITH pattern, repoCount, affectedRepos, languages,
           COUNT(DISTINCT analysis) as occurrenceCount,
           AVG(analysis.confidence) as averageConfidence

      ORDER BY occurrenceCount DESC, repoCount DESC

      RETURN pattern.id as patternId,
             pattern.name as patternName,
             pattern.type as type,
             repoCount,
             occurrenceCount,
             averageConfidence,
             affectedRepos,
             languages`;

    return await this.neptuneClient.query(query, { minOccurrences });
  }

  // Find patterns similar to a given code fragment
  async findSimilarCodePatterns(codeFragment: string, language: string): Promise<CodePatternMatch[]> {
    // Complex pattern matching using AST and semantic analysis
    // This would integrate with code embedding techniques

    const embedding = await this.generateCodeEmbedding(codeFragment, language);

    // Find patterns with similar embeddings (simplified)
    const query = `
      MATCH (pattern:Pattern)-[:HAS_EMBEDDING]->(embedding:Embedding)
      WHERE pattern.language = $language

      // Calculate vector similarity (would use cosine similarity)
      WITH pattern,
           $embedding AS targetEmbedding,
           embedding.vector AS patternEmbedding,
           embedding.metadata AS metadata

      // Placeholder for similarity calculation
      ORDER BY pattern.confidence DESC, pattern.observationCount DESC
      LIMIT 10

      RETURN pattern.id, pattern.name, pattern.type, pattern.confidence`;

    return await this.neptuneClient.query(query, {
      embedding: embedding.vector,
      language
    });
  }

  // Get repository-specific recommendations based on organizational patterns
  async getRepositoryRecommendations(repositoryId: string): Promise<RepositoryRecommendation[]> {
    const query = `
      MATCH (target:Repository {id: $repositoryId})
      MATCH (other:Repository)-[:CONTAINS_FILE]->(:File)-[:USES_PATTERN]->(pattern:Pattern)

      WHERE other.id <> $repositoryId
        AND NOT (target)-[:CONTAINS_FILE]->(:File)-[:USES_PATTERN]->(pattern)

      WITH target, pattern,
           COUNT(DISTINCT other) as adoptionCount,
           COLLECT(DISTINCT other.name)[0..3] as examples

      ORDER BY adoptionCount DESC, pattern.type ASC
      LIMIT 20

      RETURN pattern.id as patternId,
             pattern.name as patternName,
             pattern.type as type,
             pattern.description as description,
             adoptionCount,
             examples`;

    return await this.neptuneClient.query(query, { repositoryId });
  }
}
```

---

## 2. Ingestion Service Architecture

### 2.1 Repository Analysis Pipeline

```typescript
// Ingestion Service - Phase 3 Core Component
class IngestionService {
  private queue: Queue;
  private neptuneClient: NeptuneClient;
  private githubClient: GitHubClient;

  async initialize() {
    // Set up webhook endpoints
    await this.setupWebhookEndpoints();

    // Initialize analysis queue
    this.queue = new analysisQueue('repository-analysis', {
      concurrency: 5,
      redisUrl: process.env.REDIS_URL
    });

    // Start background jobs
    await this.startBackgroundJobs();
  }

  async setupWebhookEndpoints() {
    // GitHub webhook endpoint
    this.app.post('/webhooks/github', this.handleGitHubWebhook.bind(this));

    // Manual submission endpoint
    this.app.post('/api/repositories/:repoId/analyze',
      this.authenticateRequest,
      this.manualRepositoryAnalysis.bind(this)
    );
  }

  async handleGitHubWebhook(req: Request, res: Response) {
    const event = req.headers['x-github-event'] as string;
    const payload = req.body;

    switch (event) {
      case 'repository.indexed':
        await this.queueRepositoryForAnalysis(payload.repository, {
          trigger: 'webhook',
          priority: 'high',
          webhooks: ['neptune-processing', 'pattern-extraction']
        });
        break;

      case 'pull_request.opened':
      case 'pull_request.synchronize':
        await this.analyzePullRequestChanges(payload);
        break;

      case 'push':
        await this.analyzePushChanges(payload);
        break;
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  }

  async queueRepositoryForAnalysis(repository: RepositoryData, options: AnalysisOptions) {
    const jobId = `analyze-${repository.id}-${Date.now()}`;

    await this.queue.add(jobId, {
      repository,
      analysisConfig: {
        depth: options.depth || 'full',
        includeTests: true,
        includeDependencies: true,
        detectLanguages: true,
        extractPatterns: true
      },
      hooks: options.webhooks || []
    }, {
      priority: this.calculateJobPriority(options),
      removeOnComplete: 30,
      removeOnFail: 10
    });

    logger.info(`Queued repository analysis`, { jobId, repositoryId: repository.id });
  }

  private calculateJobPriority(options: AnalysisOptions): number {
    switch (options.priority) {
      case 'critical': return 100;
      case 'high': return 50;
      case 'normal': return 20;
      case 'low': return 1;
      default: return 20;
    }
  }

  async performRepositoryAnalysis(job: Job) {
    const { repository, analysisConfig } = job.data;

    try {
      logger.info(`Starting repository analysis`, { repositoryId: repository.id });

      // 1. Clone/pull repository
      const repoPath = await this.prepareRepository(repository);

      // 2. Analyze structure and metadata
      const structure = await this.analyzeRepositoryStructure(repoPath);

      // 3. Extract patterns and intelligence
      const intelligence = await this.extractRepositoryIntelligence(repoPath, structure, analysisConfig);

      // 4. Store in EKG
      await this.storeInEKG(repository.id, {
        structure,
        intelligence,
        metadata: {
          analyzedAt: new Date(),
          analysisVersion: '3.0',
          complexity: structure.metrics.complexity,
          languageDistribution: structure.languages
        }
      });

      // 5. Execute post-analysis hooks
      await this.executePostAnalysisHooks(repository, structure, intelligence);

      logger.info(`Repository analysis completed`, { repositoryId: repository.id });

    } catch (error) {
      logger.error(`Repository analysis failed`, {
        repositoryId: repository.id,
        error: error.message,
        stack: error.stack
      });

      throw error; // Let the queue handle retries
    }
  }

  private async prepareRepository(repository: RepositoryData): Promise<string> {
    const cacheDir = path.join(process.env.REPOSITORY_CACHE || '/tmp/repositories');
    const repoPath = path.join(cacheDir, repository.id);

    if (!fs.existsSync(repoPath)) {
      // Clone new repository
      await execAsync(`git clone ${repository.cloneUrl} ${repoPath}`);
    } else {
      // Update existing clone
      await execAsync(`cd ${repoPath} && git pull --ff-only`);
    }

    return repoPath;
  }

  private async analyzeRepositoryStructure(repoPath: string): Promise<RepositoryStructure> {
    const files = await this.scanRepositoryFiles(repoPath);
    const languages = this.detectLanguages(files);
    const dependencies = await this.analyzeDependencies(repoPath, languages);
    const metrics = this.calculateRepositoryMetrics(files, dependencies);

    return {
      files,
      languages,
      dependencies,
      metrics,
      directoryTree: await this.buildDirectoryTree(repoPath),
      patterns: await this.extractStructuralPatterns(files)
    };
  }

  private async extractRepositoryIntelligence(
    repoPath: string,
    structure: RepositoryStructure,
    config: AnalysisConfig
  ): Promise<RepositoryIntelligence> {

    const intelligence: RepositoryIntelligence = {
      patterns: [],
      securityProfile: {},
      architectureProfile: {},
      codeQualityMetrics: {},
      dependencyInsights: {},
      collaborationPatterns: {}
    };

    // Parallel analysis pipelines
    const analysisPromises = [
      this.extractSecurityPatterns(repoPath, structure.files),
      this.extractArchitecturalPatterns(structure),
      this.calculateCodeQualityMetrics(structure.files),
      this.analyzeDependencySecurity(structure.dependencies),
      this.identifyCollaborationPatterns(structure)
    ];

    const results = await Promise.allSettled(analysisPromises);

    // Merge results
    intelligence.securityProfile = results[0]?.status === 'fulfilled' ? results[0].value : {};
    intelligence.architectureProfile = results[1]?.status === 'fulfilled' ? results[1].value : {};
    intelligence.codeQualityMetrics = results[2]?.status === 'fulfilled' ? results[2].value : {};
    intelligence.dependencyInsights = results[3]?.status === 'fulfilled' ? results[3].value : {};
    intelligence.collaborationPatterns = results[4]?.status === 'fulfilled' ? results[4].value : {};

    // Extract cross-cutting patterns
    intelligence.patterns = await this.extractCrossCuttingPatterns(repoPath, structure);

    return intelligence;
  }

  private async storeInEKG(repositoryId: string, data: RepositoryEKGData) {
    // Create or update repository node
    await this.neptuneClient.createOrUpdateRepository(repositoryId, data.metadata);

    // Store file structure
    await this.storeFileStructure(repositoryId, data.structure.files);

    // Store extracted patterns
    await this.storePatterns(repositoryId, data.intelligence.patterns);

    // Store relationships and metadata
    await this.storeRelationships(repositoryId, data);
  }

  private async storePatterns(repositoryId: string, patterns: Pattern[]) {
    for (const pattern of patterns) {
      // Create pattern node if it doesn't exist
      const patternNode = await this.neptuneClient.getOrCreatePattern({
        ...pattern,
        repositoryId,
        firstSeen: new Date(),
        observationCount: 1
      });

      // Link repository to pattern via file usage
      await this.neptuneClient.createRepositoryPatternRelationship(
        repositoryId,
        patternNode.id,
        {
          confidence: pattern.confidence,
          source: pattern.source,
          metadata: pattern.metadata
        }
      );
    }
  }

  private async executePostAnalysisHooks(repository: RepositoryData, structure: any, intelligence: any) {
    // Trigger configured post-analysis actions
    const hooks = [
      'pattern-learning',        // Feed patterns to machine learning models
      'quality-dashboard',       // Update quality dashboards
      'dependency-alerts',       // Send dependency security alerts
      'recommendation-engine'    // Update recommendation system
    ];

    for (const hook of hooks) {
      try {
        await this.executeHook(hook, repository, structure, intelligence);
      } catch (error) {
        logger.warn(`Post-analysis hook failed`, { hook, repositoryId: repository.id, error: error.message });
      }
    }
  }

  private async executeHook(hookName: string, repository: any, structure: any, intelligence: any) {
    const hookConfig = this.configuration.hooks[hookName];
    if (!hookConfig?.enabled) return;

    switch (hookName) {
      case 'recommendation-engine':
        await this.updateRecommendationEngine(repository.id, structure, intelligence);
        break;

      case 'dependency-alerts':
        await this.checkDependencyAlerts(repository, intelligence.dependencyInsights);
        break;

      default:
        // Custom webhook call
        await this.notifyExternalService(hookConfig.endpoint, {
          repository,
          structure,
          intelligence,
          timestamp: new Date()
        });
    }
  }
}
```

### 2.2 Pattern Extraction and Learning

```typescript
// Advanced Pattern Extraction Engine
class PatternExtractionEngine {
  private astParsers: Map<string, ASTParser> = new Map();
  private embeddingGenerator: EmbeddingGenerator;
  private patternClassifier: PatternClassifier;

  constructor() {
    this.initializeParsers();
    this.embeddingGenerator = new BERTEmbeddingGenerator();
    this.patternClassifier = new MLPatternClassifier();
  }

  private initializeParsers() {
    // Support for multiple languages
    this.astParsers.set('javascript', new JavaScriptASTParser());
    this.astParsers.set('typescript', new TypeScriptASTParser());
    this.astParsers.set('python', new PythonASTParser());
    this.astParsers.set('java', new JavaASTParser());
    this.astParsers.set('go', new GoASTParser());
  }

  // Extract patterns from file content
  async extractFilePatterns(filePath: string, content: string): Promise<FilePattern[]> {
    const language = this.detectLanguage(filePath);
    const parser = this.astParsers.get(language);

    if (!parser) {
      return []; // Unsupported language
    }

    const ast = parser.parse(content);
    const patterns = [];

    // 1. Security Pattern Detection
    patterns.push(...await this.detectSecurityPatterns(ast, language, filePath));

    // 2. Architecture Pattern Detection
    patterns.push(...await this.detectArchitecturePatterns(ast, language, filePath));

    // 3. Code Quality Patterns
    patterns.push(...await this.detectCodeQualityPatterns(ast, language, filePath));

    // 4. Performance Pattern Detection
    patterns.push(...await this.detectPerformancePatterns(ast, language, filePath));

    return patterns.map(pattern => ({
      ...pattern,
      file: filePath,
      language,
      extractedAt: new Date(),
      codeSnippet: this.extractCodeSnippet(content, pattern.location)
    }));
  }

  private async detectSecurityPatterns(ast: any, language: string, filePath: string): Promise<SecurityPattern[]> {
    const patterns = [];

    // SQL Injection Patterns
    const sqlInjections = await this.detectSQLInjectionPatterns(ast);
    patterns.push(...sqlInjections);

    // XSS Vulnerability Patterns
    const xssVulnerabilities = await this.detectXSSPatterns(ast);
    patterns.push(...xssVulnerabilities);

    // Authentication Bypass Patterns
    const authBypasses = await this.detectAuthBypassPatterns(ast);
    patterns.push(...authBypasses);

    // Input Validation Patterns
    const validationPatterns = await this.detectInputValidationPatterns(ast);
    patterns.push(...validationPatterns);

    return patterns;
  }

  private async detectSQLInjectionPatterns(ast: any): Promise<SecurityPattern[]> {
    const patterns = [];

    // Look for string concatenation in SQL queries
    this.traverseAST(ast, (node) => {
      if (this.isSQLQuery(node) && this.hasStringConcatenation(node)) {
        patterns.push({
          type: 'security',
          name: 'sql-injection',
          category: 'input-validation',
          confidence: 0.95,
          severity: 'high',
          location: this.getNodeLocation(node),
          description: 'Potential SQL injection vulnerability due to string concatenation',
          metadata: {
            risk: 'data-breach',
            impact: 'critical',
            fixComplexity: 'medium',
            tags: ['sql', 'injection', 'security']
          },
          suggestedFix: 'Use parameterized queries or prepared statements'
        });
      }
    });

    // Look for unsanitized user input in database operations
    const userInputs = this.findUserInputInQueries(ast);
    for (const input of userInputs) {
      if (!this.isSanitized(input)) {
        patterns.push({
          type: 'security',
          name: 'unsanitized-input',
          category: 'input-validation',
          confidence: 0.85,
          severity: 'high',
          location: input.location,
          description: 'User input used in database query without sanitization',
          metadata: {
            risk: 'sql-injection',
            impact: 'high',
            fixComplexity: 'easy',
            tags: ['input', 'sanitization', 'sql']
          },
          suggestedFix: 'Implement input sanitization or use parameterized queries'
        });
      }
    }

    return patterns;
  }

  private async detectArchitecturePatterns(ast: any, language: string, filePath: string): Promise<ArchitecturePattern[]> {
    const patterns = [];

    // God Class Detection (class with too many responsibilities)
    const classes = this.extractClasses(ast);
    for (const cls of classes) {
      if (cls.methods.length > 20 && cls.fields.length > 30) {
        patterns.push({
          type: 'architecture',
          name: 'god-class',
          category: 'design-patterns',
          confidence: 0.80,
          severity: 'medium',
          location: cls.location,
          description: `Large class (${cls.methods.length} methods, ${cls.fields.length} fields) may violate Single Responsibility Principle`,
          metadata: {
            complexity: cls.complexity,
            methodsCount: cls.methods.length,
            fieldsCount: cls.fields.length,
            tags: ['architecture', 'solid', 'responsibility']
          },
          suggestedFix: 'Consider splitting into smaller, focused classes'
        });
      }
    }

    // Tight Coupling Detection
    const couplings = this.detectTightCoupling(ast);
    for (const coupling of couplings) {
      patterns.push({
        type: 'architecture',
        name: 'tight-coupling',
        category: 'coupling-cohesion',
        confidence: 0.70,
        severity: 'medium',
        location: coupling.location,
        description: `High coupling detected between ${coupling.modules.length} modules`,
        metadata: {
          couplingDegree: coupling.degree,
          affectedModules: coupling.modules,
          tags: ['architecture', 'coupling', 'maintainability']
        },
        suggestedFix: 'Consider dependency injection or interface abstraction'
      });
    }

    // Repository Pattern Compliance
    const repoCompliance = await this.checkRepositoryPatternCompliance(ast, filePath);
    patterns.push(...repoCompliance);

    return patterns;
  }

  // Generate embeddings for semantic pattern matching
  private async generatePatternEmbeddings(patterns: Pattern[]): Promise<PatternEmbedding[]> {
    const embeddings = [];

    for (const pattern of patterns) {
      const semanticText = this.patternToSemanticString(pattern);
      const embedding = await this.embeddingGenerator.generateEmbedding(semanticText);

      embeddings.push({
        patternId: pattern.id,
        embedding: embedding,
        semanticText,
        generatedAt: new Date(),
        metadata: pattern.metadata
      });
    }

    return embeddings;
  }

  private patternToSemanticString(pattern: Pattern): string {
    return [
      `This is a ${pattern.type} pattern named "${pattern.name}"`,
      `It belongs to category: ${pattern.category}`,
      `Description: ${pattern.description}`,
      `Common tags: ${pattern.metadata?.tags?.join(', ') || 'none'}`,
      `Severity level: ${pattern.severity}`,
      `This pattern ${pattern.suggestedFix ? 'can be fixed by: ' + pattern.suggestedFix : 'has been identified and flagged'}`
    ].join('. ');
  }

  // Classification and categorization
  async classifyPattern(pattern: Pattern): Promise<ClassifiedPattern> {
    const features = this.extractPatternFeatures(pattern);
    const classification = await this.patternClassifier.classify(features);

    return {
      ...pattern,
      autoCategory: classification.category,
      confidence: classification.confidence,
      relatedPatterns: classification.related,
      organizationalImpact: classification.impact
    };
  }

  private extractPatternFeatures(pattern: Pattern): PatternFeatures {
    return {
      type: pattern.type,
      complexity: this.calculateComplexity(pattern),
      keywords: this.extractKeywords(pattern),
      contextIndicators: this.extractContextIndicators(pattern),
      severityIndicators: this.extractSeverityIndicators(pattern),
      languageFeatures: this.extractLanguageFeatures(pattern)
    };
  }
}
```

---

## 3. Query Service with GraphQL API

### 3.1 GraphQL Schema and Resolvers

```typescript
import { ApolloServer, gql } from 'apollo-server';
import { NeptuneClient } from './neptune-client';
import { EKGMiningEngine } from './ekg-mining-engine';

// GraphQL Schema Definition
const typeDefs = gql`
  type Query {
    # Repository Queries
    repository(id: ID!): Repository
    repositories(
      owner: String
      language: String
      limit: Int = 20
      offset: Int = 0
    ): RepositoryConnection!

    # Pattern
