// File: src/services/prism.ts
// PRISM Project Intelligence System - Holistic project understanding and AST mapping
// Implements comprehensive dependency analysis and architecture pattern recognition

import * as fs from 'fs-extra';
import * as path from 'path';
import * as ts from 'typescript';
import { Logger } from '@/utils/logger';
import { ErrorHandler } from '@/validation';
import { ProjectKnowledge, DependencyGraph, ArchitecturePattern } from '@/types/entities';
import { StateManager } from '@/state';
import { StorageManager } from '@/storage';

export interface CodeEntity {
  id: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'method' | 'property' | 'type' | 'import' | 'export';
  name: string;
  location: {
    filePath: string;
    line: number;
    column: number;
    length: number;
  };
  metadata: {
    modifiers?: string[];
    type?: string;
    parameters?: Array<{ name: string; type?: string }>;
    returnType?: string;
    documentation?: string;
    complexity?: number;
    dependencies: string[];
    dependents: string[];
  };
}

export interface FileAnalysis {
  filePath: string;
  language: string;
  astRoot?: ts.Node;
  entities: CodeEntity[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: string[];
  metrics: FileMetrics;
}

export interface ImportInfo {
  module: string;
  specifiers: Array<{
    imported: string;
    local?: string;
    type?: boolean;
  }>;
  isLocal: boolean;
  location: { line: number; column: number };
}

export interface ExportInfo {
  name: string;
  type: 'named' | 'default' | 're-export';
  location: { line: number; column: number };
  source?: string;
}

export interface FileMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  halstead: { volume: number; difficulty: number; effort: number };
  maintainability: number;
  duplications: number;
  dependencies: {
    internal: number;
    external: number;
    circular: boolean;
  };
}

export interface ArchitectureInsight {
  pattern: ArchitecturePattern;
  confidence: number;
  entities: string[];
  couplings: CouplingInfo[];
  suggestions: string[];
}

export interface CouplingInfo {
  from: string;
  to: string;
  type: 'inheritance' | 'composition' | 'usage' | 'data-flow';
  strength: number;
  location: { file: string; line: number };
}

export interface PatternDetectionRule {
  name: string;
  description: string;
  detect: (entities: CodeEntity[], imports: ImportInfo[], exports: ExportInfo[]) => ArchitecturePattern | null;
  confidence: number;
}

export interface PRISMAnalysisResult {
  projectStructure: ProjectKnowledge;
  dependencyGraph: DependencyGraph;
  architectureInsights: ArchitectureInsight[];
  qualityMetrics: QualityMetrics;
  recommendations: Recommendation[];
}

export interface QualityMetrics {
  overallScore: number;
  maintainability: number;
  testCoverage?: number;
  technicalDebt: {
    score: number;
    issues: Array<{
      type: 'security' | 'performance' | 'maintainability' | 'reliability';
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      location: { file: string; line?: number };
    }>;
  };
  complexity: {
    average: number;
    max: number;
    distribution: Record<string, number>;
  };
}

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'refactor' | 'test' | 'security' | 'performance' | 'architecture';
  title: string;
  description: string;
  impact: {
    time: number; // hours
    risk: number;
    benefit: number;
  };
  locations: Array<{ file: string; line?: number }>;
  automated: boolean;
}

/**
 * PRISM Project Intelligence System - Core analyzer for holistic code understanding
 * Enables NEURON agents to reason about project structure, dependencies, and architecture
 */
export class PRISMService {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private stateManager: StateManager;
  private storageManager: StorageManager;
  private projectPath: string;

  // Cached analysis results
  private analysisCache: Map<string, FileAnalysis> = new Map();
  private patternRules: PatternDetectionRule[] = [];

  constructor(
    projectPath: string,
    stateManager: StateManager,
    storageManager: StorageManager,
    logger?: Logger
  ) {
    this.logger = logger || require('@/utils/logger').defaultLogger;
    this.errorHandler = new ErrorHandler(this.logger);
    this.stateManager = stateManager;
    this.storageManager = storageManager;
    this.projectPath = projectPath;

    this.initializePatternRules();
  }

  /**
   * Perform comprehensive project analysis
   * Main entry point for PRISM intelligence gathering
   */
  async analyzeProject(options: {
    incremental?: boolean;
    includeMetrics?: boolean;
    detectPatterns?: boolean;
    generateRecommendations?: boolean;
  } = {}): Promise<PRISMAnalysisResult> {
    try {
      this.logger.info('Starting PRISM project analysis', {
        projectPath: this.projectPath,
        incremental: !!options.incremental
      });

      const startTime = Date.now();

      // Get current project knowledge
      const projectState = this.stateManager.getProjectState(path.basename(this.projectPath));
      let currentKnowledge = projectState.knowledge || {};

      if (options.incremental && currentKnowledge.lastPrismAnalysis) {
        // Skip files that haven't changed since last analysis
        const changedFiles = await this.getChangedFiles(currentKnowledge.lastPrismAnalysis);
        if (changedFiles.length === 0) {
          this.logger.info('Incremental analysis: no changes detected');
          return this.buildAnalysisResult(currentKnowledge, [], [], [], []);
        }
      }

      // Scan and analyze all source files
      const sourceFiles = await this.findSourceFiles();

      // Perform AST analysis on each file
      const fileAnalyses: FileAnalysis[] = [];
      for (const filePath of sourceFiles) {
        try {
          const analysis = await this.analyzeFile(filePath);
          fileAnalyses.push(analysis);
          this.analysisCache.set(filePath, analysis);
        } catch (error) {
          this.logger.warn(`Failed to analyze ${filePath}`, { error: error.message });
        }
      }

      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(fileAnalyses);

      // Detect architectural patterns (if enabled)
      const architectureInsights: ArchitectureInsight[] = [];
      if (options.detectPatterns) {
        architectureInsights.push(...await this.detectArchitecturePatterns(fileAnalyses));
      }

      // Calculate quality metrics (if enabled)
      const qualityMetrics: QualityMetrics | undefined = options.includeMetrics ?
        await this.calculateQualityMetrics(fileAnalyses) : undefined;

      // Generate recommendations (if enabled)
      const recommendations: Recommendation[] = [];
      if (options.generateRecommendations) {
        recommendations.push(...await this.generateRecommendations(
          fileAnalyses,
          architectureInsights,
          qualityMetrics
        ));
      }

      // Update project knowledge
      const updatedKnowledge = this.updateProjectKnowledge(
        currentKnowledge,
        fileAnalyses,
        dependencyGraph,
        architectureInsights
      );

      // Save to state
      projectState.knowledge = updatedKnowledge;
      await this.stateManager.updateProjectState(projectState.projectId, projectState);

      const result = this.buildAnalysisResult(
        updatedKnowledge,
        dependencyGraph,
        architectureInsights,
        qualityMetrics,
        recommendations
      );

      this.logger.info('PRISM analysis completed', {
        filesAnalyzed: fileAnalyses.length,
        insightsFound: architectureInsights.length,
        recommendations: recommendations.length,
        duration: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'analyzeProject', projectPath: this.projectPath });
      throw error;
    }
  }

  /**
   * Analyze a single file for code entities and structure
   */
  async analyzeFile(filePath: string): Promise<FileAnalysis> {
    try {
      const absolutePath = path.resolve(this.projectPath, filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');

      const language = this.detectLanguage(filePath);
      let astRoot: ts.Node | undefined;
      let entities: CodeEntity[] = [];
      let imports: ImportInfo[] = [];
      let exports: ExportInfo[] = [];

      if (language === 'typescript' || language === 'javascript') {
        // Parse with TypeScript compiler
        const sourceFile = ts.createSourceFile(
          filePath,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        astRoot = sourceFile;
        entities = this.extractEntitiesFromAST(sourceFile);
        imports = this.extractImportsFromAST(sourceFile);
        exports = this.extractExportsFromAST(sourceFile);
      } else if (language === 'python') {
        // Could implement Python AST parsing
        this.logger.debug('Python analysis not yet implemented, using basic parsing');
      }

      const dependencies = this.extractDependencies(imports, filePath);
      const metrics = await this.calculateFileMetrics(content, entities);

      return {
        filePath,
        language,
        astRoot,
        entities,
        imports,
        exports,
        dependencies,
        metrics
      };

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'analyzeFile', filePath });
      throw error;
    }
  }

  /**
   * Get entity information for navigation and context understanding
   */
  async getEntities(filePath?: string, filter?: {
    kinds?: string[];
    name?: string;
    scope?: 'file' | 'module' | 'project';
  }): Promise<CodeEntity[]> {
    try {
      if (filePath) {
        // Get from cache or analyze
        let analysis = this.analysisCache.get(filePath);
        if (!analysis) {
          analysis = await this.analyzeFile(filePath);
          this.analysisCache.set(filePath, analysis);
        }

        let entities = analysis.entities;

        // Apply filters
        if (filter?.kinds) {
          entities = entities.filter(e => filter.kinds!.includes(e.kind));
        }
        if (filter?.name) {
          entities = entities.filter(e => e.name.includes(filter.name!));
        }

        return entities;
      } else {
        // Get all entities across project
        const sourceFiles = await this.findSourceFiles();
        const allEntities: CodeEntity[] = [];

        for (const file of sourceFiles) {
          const entities = await this.getEntities(file, filter);
          allEntities.push(...entities);
        }

        return allEntities;
      }
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'getEntities', filePath });
      return [];
    }
  }

  /**
   * Find references to a specific entity across the project
   */
  async findReferences(entityId: string): Promise<Array<{
    filePath: string;
    location: { line: number; column: number };
    context: string;
    type: 'definition' | 'reference' | 'usage' | 'import';
  }>> {
    try {
      const references: Array<{
        filePath: string;
        location: { line: number; column: number };
        context: string;
        type: 'definition' | 'reference' | 'usage' | 'import';
      }> = [];

      const sourceFiles = await this.findSourceFiles();

      for (const filePath of sourceFiles) {
        const analysis = await this.analyzeFile(filePath);

        // Search imports
        for (const imp of analysis.imports) {
          if (imp.specifiers.some(s => s.imported === entityId || s.local === entityId)) {
            references.push({
              filePath,
              location: imp.location,
              context: `import from ${imp.module}`,
              type: 'import'
            });
          }
        }

        // Search entity usages in dependencies
        for (const entity of analysis.entities) {
          if (entity.metadata.dependencies.includes(entityId)) {
            references.push({
              filePath,
              location: entity.location,
              context: `${entity.kind} ${entity.name}`,
              type: 'usage'
            });
          }
        }
      }

      return references;

    } catch (error) {
      this.logger.warn('Failed to find references', { entityId, error: error.message });
      return [];
    }
  }

  /**
   * Analyze impact of changing a code entity
   */
  async analyzeChangeImpact(entityId: string): Promise<{
    affectedEntities: CodeEntity[];
    impact: {
      files: number;
      entities: number;
      risk: 'low' | 'medium' | 'high' | 'critical';
    };
    recommendations: string[];
    breakingChanges: Array<{
      type: string;
      location: { file: string; line?: number };
      affected: string;
    }>;
  }> {
    try {
      const entity = await this.findEntityById(entityId);
      if (!entity) {
        throw new Error(`Entity not found: ${entityId}`);
      }

      // Find all dependents
      const dependents = await this.getEntityDependents(entityId);

      // Analyze impact scope
      const affectedEntities: CodeEntity[] = [];
      const affectedFiles = new Set<string>();

      for (const dep of dependents) {
        const depEntity = await this.findEntityById(dep);
        if (depEntity) {
          affectedEntities.push(depEntity);
          affectedFiles.add(depEntity.location.filePath);
        }
      }

      // Determine risk level
      let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (affectedEntities.length > 20) risk = 'critical';
      else if (affectedEntities.length > 10) risk = 'high';
      else if (affectedEntities.length > 5) risk = 'medium';

      // Analyze for breaking changes
      const breakingChanges = await this.analyzeBreakingChanges(entity, affectedEntities);

      return {
        affectedEntities,
        impact: {
          files: affectedFiles.size,
          entities: affectedEntities.length,
          risk
        },
        recommendations: this.generateImpactRecommendations(entity, affectedEntities, risk),
        breakingChanges
      };

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'analyzeChangeImpact', entityId });
      throw error;
    }
  }

  /**
   * Detect architectural patterns in the codebase
   */
  private async detectArchitecturePatterns(fileAnalyses: FileAnalysis[]): Promise<ArchitectureInsight[]> {
    const allEntities = fileAnalyses.flatMap(f => f.entities);
    const insights: ArchitectureInsight[] = [];

    for (const rule of this.patternRules) {
      try {
        for (const analysis of fileAnalyses) {
          const pattern = rule.detect(analysis.entities, analysis.imports, analysis.exports);
          if (pattern) {
            const couplings = this.analyzeCouplings(pattern, allEntities);

            insights.push({
              pattern,
              confidence: rule.confidence,
              entities: pattern.entities,
              couplings,
              suggestions: this.generatePatternSuggestions(pattern, couplings)
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Pattern detection failed for ${rule.name}`, { error: error.message });
      }
    }

    return insights;
  }

  /**
   * Initialize pattern detection rules
   */
  private initializePatternRules(): void {
    this.patternRules = [
      // Repository Pattern Detection
      {
        name: 'Repository Pattern',
        description: 'Data access layer with repository interfaces',
        detect: (entities, imports, exports) => {
          const interfaces = entities.filter(e => e.kind === 'interface');
          const classes = entities.filter(e => e.kind === 'class');

          const repos = interfaces.filter(i => i.name.toLowerCase().includes('repository'));
          const impls = classes.filter(c => repos.some(r => c.name.includes(r.name.slice(0, -'Repository'.length))));

          if (repos.length > 0 && impls.length > 0) {
            return {
              id: `repo_${Date.now()}`,
              type: 'repository',
              entities: [...repos, ...impls].map(e => e.id),
              relationships: impls.map(impl => ({
                from: impl.id,
                to: repos.find(r => impl.name.includes(r.name.slice(0, -'Repository'.length)))!.id,
                type: 'implements'
              })),
              confidence: Math.min(repos.length / 5 + impls.length / 10, 1),
              location: repos[0].location
            };
          }
          return null;
        },
        confidence: 0.8
      },

      // Dependency Injection Pattern
      {
        name: 'Dependency Injection',
        description: 'Constructor-based or setter-based dependency injection',
        detect: (entities, imports, exports) => {
          const classes = entities.filter(e => e.kind === 'class');

          for (const cls of classes) {
            const constructor = entities.find(e =>
              e.kind === 'method' && e.name === 'constructor' &&
              cls.location.filePath === e.location.filePath &&
              e.location.line > cls.location.line &&
              e.location.line < cls.location.line + 50 // Approximate class range
            );

            if (constructor && constructor.metadata.parameters && constructor.metadata.parameters.length > 2) {
              const deps = constructor.metadata.parameters!.map(p => p.type).filter(Boolean);
              if (deps.length >= 3) { // Assume DI if many dependencies in constructor
                return {
                  id: `di_${Date.now()}`,
                  type: 'dependency_injection',
                  entities: [cls.id],
                  relationships: [],
                  confidence: 0.7,
                  location: cls.location
                };
              }
            }
          }
          return null;
        },
        confidence: 0.7
      }
    ];
  }

  // Private implementation methods...

  private async findSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py'];

    const walkDir = async (dir: string): Promise<void> => {
      const items = await fs.readdir(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          await walkDir(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          const relativePath = path.relative(this.projectPath, fullPath);
          files.push(relativePath);
        }
      }
    };

    await walkDir(this.projectPath);
    return files;
  }

  private async getChangedFiles(since: Date): Promise<string[]> {
    const sourceFiles = await this.findSourceFiles();
    const changedFiles: string[] = [];

    for (const file of sourceFiles) {
      const absolutePath = path.resolve(this.projectPath, file);
      const stat = await fs.stat(absolutePath);

      if (stat.mtime > since) {
        changedFiles.push(file);
      }
    }

    return changedFiles;
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts': return 'typescript';
      case '.tsx': return 'typescript';
      case '.js': return 'javascript';
      case '.jsx': return 'javascript';
      case '.py': return 'python';
      default: return 'unknown';
    }
  }

  private extractEntitiesFromAST(sourceFile: ts.SourceFile): CodeEntity[] {
    const entities: CodeEntity[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        entities.push({
          id: `func_${sourceFile.fileName}_${node.name?.getText()}`,
          kind: ts.isMethodDeclaration(node) ? 'method' : 'function',
          name: node.name?.getText() || 'anonymous',
          location: this.getNodeLocation(node, sourceFile),
          metadata: {
            modifiers: node.modifiers?.map(m => m.getText()),
            type: node.type?.getText(),
            parameters: node.parameters.map(p => ({
              name: p.name.getText(),
              type: p.type?.getText()
            })),
            returnType: node.type?.getText(),
            dependencies: [], // Would analyze function body
            dependents: []
          }
        });
      } else if (ts.isClassDeclaration(node)) {
        entities.push({
          id: `class_${sourceFile.fileName}_${node.name?.getText()}`,
          kind: 'class',
          name: node.name?.getText() || 'anonymous',
          location: this.getNodeLocation(node, sourceFile),
          metadata: {
            modifiers: node.modifiers?.map(m => m.getText()),
            dependencies: [], // Would analyze class members
            dependents: []
          }
        });
      }
      // Add more entity types as needed

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return entities;
  }

  private getNodeLocation(node: ts.Node, sourceFile: ts.SourceFile): {
    filePath: string;
    line: number;
    column: number;
    length: number;
  } {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      filePath: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
      length: node.getEnd() - node.getStart()
    };
  }

  private extractImportsFromAST(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleName = node.moduleSpecifier.getText().replace(/['"]/g, '');
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

        const specifiers: ImportInfo['specifiers'] = [];
        if (node.importClause) {
          if (node.importClause.name) { // Default import
            specifiers.push({
              imported: 'default',
              local: node.importClause.name.getText(),
              type: false
            });
          }

          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const element of node.importClause.namedBindings.elements) {
                specifiers.push({
                  imported: element.name.getText(),
                  local: element.propertyName?.getText() || element.name.getText(),
                  type: element.isTypeOnly || false
                });
              }
            }
          }
        }

        imports.push({
          module: moduleName,
          specifiers,
          isLocal: !moduleName.startsWith('.') && !moduleName.startsWith('@/'),
          location: { line: line + 1, column: character + 1 }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  private extractExportsFromAST(sourceFile: ts.SourceFile): ExportInfo[] {
    // Implementation for export extraction
    return [];
  }

  private extractDependencies(imports: ImportInfo[], filePath: string): string[] {
    // Extract unique dependencies from imports
    return imports.flatMap(imp =>
      imp.specifiers.map(s => `${imp.module}#${s.imported}`)
    );
  }

  private async calculateFileMetrics(content: string, entities: CodeEntity[]): Promise<FileMetrics> {
    // Placeholder metrics calculation
    const linesOfCode = content.split('\n').length;
    const cyclomaticComplexity = Math.min(entities.length + 1, 20); // Simplified

    return {
      linesOfCode,
      cyclomaticComplexity,
      halstead: {
        volume: linesOfCode * Math.log(entities.length + 1) || 1,
        difficulty: cyclomaticComplexity,
        effort: 0
      },
      maintainability: Math.max(0, 100 - (linesOfCode / 100) - (cyclomaticComplexity * 10)),
      duplications: 0, // Would require duplication analysis
      dependencies: {
        internal: 0,
        external: 0,
        circular: false
      }
    };
  }

  private buildDependencyGraph(fileAnalyses: FileAnalysis[]): DependencyGraph {
    const nodes = fileAnalyses.map(f => f.filePath);
    const edges = fileAnalyses.flatMap(from =>
      from.dependencies.map(to => ({ from: from.filePath, to }))
    );

    return {
      nodes,
      edges,
      type: 'file',
      metadata: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        density: edges.length / (nodes.length * (nodes.length - 1)) || 0
      }
    };
  }

  private analyzeCouplings(pattern: ArchitecturePattern, allEntities: CodeEntity[]): CouplingInfo[] {
    // Placeholder coupling analysis
    return [];
  }

  private generatePatternSuggestions(pattern: ArchitecturePattern, couplings: CouplingInfo[]): string[] {
    // Generate suggestions based on pattern type
    switch (pattern.type) {
      case 'repository':
        return [
          'Ensure repository interfaces are well-defined',
          'Consider adding unit tests for repository implementations',
          'Keep data access logic separate from business logic'
        ];
      case 'dependency_injection':
        return [
          'Consider using dependency injection containers',
          'Avoid tight coupling in constructor parameters',
          'Favor interface-based dependencies'
        ];
      default:
        return [];
    }
  }

  private async calculateQualityMetrics(fileAnalyses: FileAnalysis[]): Promise<QualityMetrics> {
    // Placeholder quality calculation
    return {
      overallScore: 75,
      maintainability: 70,
      technicalDebt: {
        score: 25,
        issues: []
      },
      complexity: {
        average: 5,
        max: 15,
        distribution: {}
      }
    };
  }

  private async generateRecommendations(
    analyses: FileAnalysis[],
    insights: ArchitectureInsight[],
    metrics?: QualityMetrics
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Complexity recommendations
    analyses.forEach(analysis => {
      if (analysis.metrics.cyclomaticComplexity > 10) {
        recommendations.push({
          priority: 'medium',
          category: 'refactor',
          title: 'High cyclomatic complexity detected',
          description: `Function complexity in ${analysis.filePath} suggests refactoring opportunity`,
          impact: { time: 2, risk: 1, benefit: 3 },
          locations: [{ file: analysis.filePath }],
          automated: true
        });
      }
    });

    return recommendations;
  }

  private updateProjectKnowledge(
    current: ProjectKnowledge,
    analyses: FileAnalysis[],
    dependencyGraph: DependencyGraph,
    insights: ArchitectureInsight[]
  ): ProjectKnowledge {
    return {
      ...current,
      entities: analyses.flatMap(a => a.entities),
      dependencyGraph,
      architecturePatterns: insights.map(i => i.pattern),
      qualityMetrics: {
        complexity: analyses.reduce((sum, a) => sum + a.metrics.cyclomaticComplexity, 0) / analyses.length,
        maintainability: analyses.reduce((sum, a) => sum + a.metrics.maintainability, 0) / analyses.length
      },
      lastPrismAnalysis: new Date(),
      version: '3.0.0'
    };
  }

  private buildAnalysisResult(
    knowledge: ProjectKnowledge,
    dependencies: DependencyGraph,
    insights: ArchitectureInsight[],
    metrics?: QualityMetrics,
    recommendations?: Recommendation[]
  ): PRISMAnalysisResult {
    return {
      projectStructure: knowledge,
      dependencyGraph: dependencies,
      architectureInsights: insights,
      qualityMetrics: metrics || {
        overallScore: 70,
        maintainability: 65,
        technicalDebt: { score: 30, issues: [] },
        complexity: { average: 8, max: 20, distribution: {} }
      },
      recommendations: recommendations || []
    };
  }

  private async findEntityById(id: string): Promise<CodeEntity | null> {
    const allEntities = await this.getEntities();
    return allEntities.find(e => e.id === id) || null;
  }

  private async getEntityDependents(id: string): Promise<string[]> {
    // Would traverse dependency graph to find all entities that depend on the given entity
    return [];
  }

  private async analyzeBreakingChanges(entity: CodeEntity, affected: CodeEntity[]): Promise<Array<{
    type: string;
    location: { file: string; line?: number };
    affected: string;
  }>> {
    // Analyze what changes would break for affected entities
    return [];
  }

  private generateImpactRecommendations(
    entity: CodeEntity,
    affected: CodeEntity[],
    risk: string
  ): string[] {
    const recommendations: string[] = [];

    if (risk === 'critical') {
      recommendations.push('Consider creating a feature flag to gradually rollout changes');
      recommendations.push('Ensure comprehensive test coverage before making changes');
      recommendations.push('Consider breaking change into smaller, safer modifications');
    }

    return recommendations;
  }
}

/**
 * Export interfaces and classes
 */
export type {
  CodeEntity,
  FileAnalysis,
  ArchitectureInsight,
  QualityMetrics,
  Recommendation,
  PRISMAnalysisResult
};

export default PRISMService;
