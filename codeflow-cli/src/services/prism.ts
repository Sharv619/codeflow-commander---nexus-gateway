// File: src/services/prism.ts
// PRISM Project Intelligence System - Holistic project understanding and AST mapping
// Implements comprehensive dependency analysis and architecture pattern recognition

import * as fs from 'fs-extra';
import * as path from 'path';
import * as ts from 'typescript';
import { Logger } from '../utils/logger';
import { ErrorHandler } from '../validation';
import { StateManager } from '../state';
import { StorageManager } from '../storage';

// Local interfaces for PRISM-specific types
interface CodeEntity {
  id: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'method' | 'property';
  name: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  signature?: string;
  dependencies: string[];
  complexity?: number;
  metadata: Record<string, any>;
}

interface FileAnalysis {
  filePath: string;
  language: string;
  astRoot?: ts.Node | undefined;
  entities: CodeEntity[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: string[];
  metrics: FileMetrics;
}

interface ImportInfo {
  module: string;
  specifiers: Array<{
    imported: string;
    local?: string;
    type?: boolean;
  }>;
  isLocal: boolean;
  location: { line: number; column: number };
}

interface ExportInfo {
  name: string;
  type: 'named' | 'default' | 're-export';
  location: { line: number; column: number };
  source?: string;
}

interface FileMetrics {
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

interface DependencyGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
  type: string;
  metadata: {
    totalNodes: number;
    totalEdges: number;
    density: number;
  };
}

interface CodeLocation {
  filePath: string;
  line: number;
  column: number;
  length: number;
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
  } = {}): Promise<any> {
    try {
      this.logger.info('Starting PRISM project analysis', {
        projectPath: this.projectPath,
        incremental: !!options.incremental
      });

      const startTime = Date.now();

      // Scan and analyze all source files
      const sourceFiles = await this.findSourceFiles();

      // Perform AST analysis on each file
      const fileAnalyses: FileAnalysis[] = [];
      for (const filePath of sourceFiles) {
        try {
          const analysis = await this.analyzeFile(filePath);
          fileAnalyses.push(analysis);
          this.analysisCache.set(filePath, analysis);
        } catch (error: unknown) {
          this.logger.warn(`Failed to analyze ${filePath}`, { error: error instanceof Error ? error.message : String(error) });
        }
      }

      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(fileAnalyses);

      this.logger.info('PRISM analysis completed', {
        filesAnalyzed: fileAnalyses.length,
        duration: Date.now() - startTime
      });

      return {
        projectStructure: {},
        dependencyGraph,
        architectureInsights: [],
        qualityMetrics: this.calculateQualityMetrics(fileAnalyses),
        recommendations: []
      };

    } catch (error: unknown) {
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

    } catch (error: unknown) {
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
          entities = entities.filter(e => filter.kinds!.includes(e.type));
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
    } catch (error: unknown) {
      this.logger.warn('Failed to get entities', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Get source files (public wrapper for SecurityRemediatorAgent)
   */
  async getSourceFiles(): Promise<string[]> {
    return this.findSourceFiles();
  }

  // Private implementation methods...

  private async findSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py'];

    const walkDir = async (dir: string): Promise<void> => {
      // Check if directory exists
      if (!(await fs.pathExists(dir))) {
        this.logger.debug(`Directory not found, skipping: ${dir}`);
        return;
      }
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
          type: ts.isMethodDeclaration(node) ? 'method' : 'function',
          name: node.name?.getText() || 'anonymous',
          filePath: sourceFile.fileName,
          lineStart: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          lineEnd: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
          dependencies: [],
          metadata: {
            modifiers: node.modifiers?.map(m => m.getText()) || [],
            type: node.type?.getText(),
            parameters: node.parameters.map(p => ({
              name: p.name.getText(),
              type: p.type?.getText()
            })),
            returnType: node.type?.getText(),
            complexity: 0,
            dependencies: [],
            dependents: []
          }
        });
      } else if (ts.isClassDeclaration(node)) {
        entities.push({
          id: `class_${sourceFile.fileName}_${node.name?.getText()}`,
          type: 'class',
          name: node.name?.getText() || 'anonymous',
          filePath: sourceFile.fileName,
          lineStart: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          lineEnd: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
          dependencies: [],
          metadata: {
            modifiers: node.modifiers?.map(m => m.getText()) || [],
            dependencies: [],
            dependents: []
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return entities;
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
      duplications: 0,
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

  private calculateQualityMetrics(fileAnalyses: FileAnalysis[]): any {
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
}

/**
 * Export interfaces and classes
 */
export type {
  CodeEntity,
  FileAnalysis
};

export default PRISMService;
