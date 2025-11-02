# Phase 2: AI Integration - LLM-Powered Code Analysis

## Executive Summary

This document details the implementation of **Phase 2**, where Codeflow evolves from basic static analysis to an **AI-powered code review system**. By integrating Large Language Models (LLMs) such as Gemini, GPT, and Claude, Phase 2 transforms the basic validation system into an intelligent code analysis platform capable of understanding context, providing actionable recommendations, and learning from developer feedback.

### **Key Deliverables:**
- **AI Analysis Engine** with multiple LLM provider support
- **Context-aware Code Review** using LLM understanding
- **Intelligent Diff Analysis** beyond basic syntax checking
- **Provider abstraction layer** for seamless switching between LLMs
- **Feedback learning system** to improve analysis quality
- **Cost management and rate limiting** for API usage

---

## 1. AI Provider Abstraction Layer

### 1.1 Provider Interface Definition

```typescript
export interface AIProvider {
  readonly name: string;
  readonly maxTokens: number;
  readonly costPerToken: number;

  validateConnection(apiKey: string): Promise<boolean>;

  generateAnalysis(prompt: AnalysisPrompt, options?: GenerationOptions): Promise<AnalysisResult>;

  estimateCost(tokenCount: number): number;
}

export interface AnalysisPrompt {
  systemMessage: string;
  userMessage: string;
  context?: AnalysisContext;
  tokenLimit?: number;
}

export interface AnalysisContext {
  repositoryName: string;
  fileName: string;
  fileType: string;
  diffContent: string;
  relatedFiles?: string[];
  projectStructure?: string;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}
```

### 1.2 Gemini Provider Implementation

```typescript
import axios from 'axios';

export class GeminiProvider implements AIProvider {
  readonly name = 'Gemini';
  readonly maxTokens = 32768; // Gemini 1.5 Pro limit
  readonly costPerToken = 0.00025; // Cost per 1K tokens

  async validateConnection(apiKey: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async generateAnalysis(prompt: AnalysisPrompt, options: GenerationOptions = {}): Promise<AnalysisResult> {
    const payload = {
      contents: [{
        parts: [{
          text: this.buildFullPrompt(prompt)
        }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: options.maxTokens || 2048,
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent?key=${this.apiKey}`;

    const response = await this.makeRequest(apiUrl, payload, options.timeout || 30000);

    return {
      content: response.data.candidates[0].content.parts[0].text,
      tokens: this.estimateTokenUsage(prompt, response.data),
      cost: this.calculateCost(response.data.usageMetadata),
      metadata: {
        model: 'gemini-1.5-pro-latest',
        finishReason: response.data.candidates[0].finishReason
      }
    };
  }

  private buildFullPrompt(prompt: AnalysisPrompt): string {
    let fullPrompt = prompt.systemMessage + '\n\n';

    if (prompt.context) {
      fullPrompt += `Repository: ${prompt.context.repositoryName}\n`;
      fullPrompt += `File: ${prompt.context.fileName} (${prompt.context.fileType})\n\n`;

      if (prompt.context.projectStructure) {
        fullPrompt += `Project Structure:\n${prompt.context.projectStructure}\n\n`;
      }
    }

    fullPrompt += prompt.userMessage;

    return fullPrompt;
  }

  private async makeRequest(url: string, payload: any, timeout: number): Promise<any> {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      timeout
    };

    return axios.post(url, payload, config);
  }
}
```

### 1.3 OpenAI Provider Implementation

```typescript
import OpenAI from 'openai';

export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI';
  readonly maxTokens = 128000; // GPT-4 Turbo limit
  readonly costPerToken = 0.00006; // Cost per 1K tokens

  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async validateConnection(): Promise<boolean> {
    try {
      const models = await this.client.models.list();
      return models.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  async generateAnalysis(prompt: AnalysisPrompt, options: GenerationOptions = {}): Promise<AnalysisResult> {
    const messages = [
      { role: 'system' as const, content: prompt.systemMessage },
      { role: 'user' as const, content: prompt.userMessage }
    ];

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: options.temperature || 0.2,
      max_tokens: options.maxTokens || 2048,
      timeout: options.timeout || 30000
    });

    const choice = response.choices[0];
    const usage = response.usage;

    return {
      content: choice.message.content || '',
      tokens: {
        input: usage?.prompt_tokens || 0,
        output: usage?.completion_tokens || 0,
        total: usage?.total_tokens || 0
      },
      cost: this.calculateCost(usage),
      metadata: {
        model: response.model,
        finishReason: choice.finish_reason
      }
    };
  }

  private calculateCost(usage: any): CostBreakdown {
    if (!usage) return { input: 0, output: 0, total: 0, currency: 'USD' };

    // GPT-4 Turbo pricing (approximate)
    const inputCostPerToken = 0.00001;  // $0.01 per 1K input tokens
    const outputCostPerToken = 0.00003; // $0.03 per 1K output tokens

    const inputCost = (usage.prompt_tokens / 1000) * inputCostPerToken;
    const outputCost = (usage.completion_tokens / 1000) * outputCostPerToken;

    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
      currency: 'USD'
    };
  }
}
```

### 1.4 Provider Manager and Selection Logic

```typescript
export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private activeProvider: string;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.initializeProviders();
    this.activeProvider = config.defaultProvider;
  }

  private initializeProviders(): void {
    // Initialize all configured providers
    if (this.config.providers.gemini?.apiKey) {
      this.providers.set('gemini', new GeminiProvider(this.config.providers.gemini.apiKey));
    }

    if (this.config.providers.openai?.apiKey) {
      this.providers.set('openai', new OpenAIProvider(this.config.providers.openai.apiKey));
    }

    if (this.config.providers.claude?.apiKey) {
      this.providers.set('claude', new ClaudeProvider(this.config.providers.claude.apiKey));
    }
  }

  async validateAllConnections(): Promise<ProviderStatus[]> {
    const results: ProviderStatus[] = [];

    for (const [name, provider] of this.providers) {
      const isValid = await provider.validateConnection();
      results.push({
        name,
        status: isValid ? 'connected' : 'error',
        lastChecked: new Date()
      });
    }

    return results;
  }

  async generateAnalysis(prompt: AnalysisPrompt, options?: AnalysisOptions): Promise<AnalysisResult> {
    const provider = this.getActiveProvider();

    // Check if we should switch providers for this request
    if (options?.preferredProvider && this.providers.has(options.preferredProvider)) {
      return this.providers.get(options.preferredProvider)!.generateAnalysis(prompt, options);
    }

    return provider.generateAnalysis(prompt, options);
  }

  private getActiveProvider(): AIProvider {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Active provider '${this.activeProvider}' is not available`);
    }
    return provider;
  }

  async switchProvider(providerName: string): Promise<void> {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider '${providerName}' is not configured`);
    }

    const provider = this.providers.get(providerName)!;
    const isValid = await provider.validateConnection();

    if (!isValid) {
      throw new Error(`Provider '${providerName}' failed connection validation`);
    }

    this.activeProvider = providerName;
  }
}

export interface AIConfig {
  defaultProvider: string;
  providers: {
    gemini?: { apiKey: string; model?: string };
    openai?: { apiKey: string; model?: string };
    claude?: { apiKey: string; model?: string };
  };
  costLimits: {
    monthlyBudget: number;
    perRequestLimit: number;
    currency: string;
  };
}
```

---

## 2. Intelligent Diff Analysis Engine

### 2.1 Context-Aware Analysis Framework

```typescript
export class AIAnalysisEngine {
  private providerManager: AIProviderManager;
  private promptTemplates: Map<string, PromptTemplate> = new Map();

  constructor(providerManager: AIProviderManager) {
    this.providerManager = providerManager;
    this.initializePromptTemplates();
  }

  private initializePromptTemplates(): void {
    // Code Review Template
    this.promptTemplates.set('code-review', {
      systemMessage: `You are "Codeflow", an expert software engineering consultant providing code reviews.
You focus on code quality, maintainability, security, and best practices.
Provide constructive feedback that helps developers improve their code.

Format your response as:
**Rating:** [1-10]/10

**Summary:**
[Brief overview]

**Issues:**
- [Issue 1]
- [Issue 2]

**Recommendations:**
- [Recommendation 1]
- [Recommendation 2]

**Security Notes:** (if applicable)
- [Security concern]`,
      userMessageTemplate: `Please review these code changes:

**File:** {fileName}
**Language:** {language}
**Changes:**
{diff}

**Context:**
{projectContext}

Provide your analysis:`
    });

    // Architecture Assessment Template
    this.promptTemplates.set('architecture', {
      systemMessage: `You are an expert software architect analyzing code for architectural concerns.
Focus on design patterns, coupling, cohesion, and scalability implications.`,
      userMessageTemplate: `Analyze architectural implications of these changes:

{diff}

**Project Structure:**
{structure}

What are the architectural considerations?`
    });
  }

  async analyzeDiff(diffContent: string, context: AnalysisContext, analysisType = 'code-review'): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(analysisType, diffContent, context);

      // Pre-process diff for better context
      const enrichedPrompt = await this.enrichPromptWithContext(prompt, context);

      const analysis = await this.providerManager.generateAnalysis(enrichedPrompt);

      // Post-process results
      const processedResult = await this.processAnalysisResult(analysis, context);

      const analysisTime = Date.now() - startTime;

      return {
        analysis: processedResult,
        metadata: {
          analysisType,
          provider: analysis.metadata?.model || 'unknown',
          tokens: analysis.tokens,
          cost: analysis.cost,
          analysisTime,
          timestamp: new Date()
        }
      };

    } catch (error) {
      return {
        error: `Analysis failed: ${error.message}`,
        metadata: {
          analysisType,
          analysisTime: Date.now() - startTime,
          timestamp: new Date(),
          failed: true
        }
      };
    }
  }

  private buildPrompt(analysisType: string, diffContent: string, context: AnalysisContext): AnalysisPrompt {
    const template = this.promptTemplates.get(analysisType);
    if (!template) {
      throw new Error(`Unknown analysis type: ${analysisType}`);
    }

    const userMessage = this.interpolateTemplate(template.userMessageTemplate, {
      fileName: context.fileName,
      language: context.fileType,
      diff: diffContent,
      projectContext: this.summarizeProjectContext(context),
      structure: context.projectStructure || 'Not available'
    });

    return {
      systemMessage: template.systemMessage,
      userMessage,
      context
    };
  }

  private async enrichPromptWithContext(prompt: AnalysisPrompt, context: AnalysisContext): Promise<AnalysisPrompt> {
    // Add recent commits context
    const recentCommits = await this.getRecentCommits(context.repositoryName, 5);
    const commitContext = recentCommits.map(c => `- ${c.message}`).join('\n');

    // Add related file patterns
    const similarPatterns = await this.findSimilarCodePatterns(context);

    const enrichedMessage = `${prompt.userMessage}

**Recent Commits:**
${commitContext}

**Similar Patterns in Codebase:**
${similarPatterns}
`;
    return { ...prompt, userMessage: enrichedMessage };
  }

  private interpolateTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/{(\w+)}/g, (match, key) => variables[key] || match);
  }

  private summarizeProjectContext(context: AnalysisContext): string {
    return `Repository: ${context.repositoryName}
Technologies: ${this.detectTechnologies(context).join(', ')}
Similar Files: ${context.relatedFiles?.slice(0, 3).join(', ') || 'None'}`;
  }

  private detectTechnologies(context: AnalysisContext): string[] {
    const techIndicators = {
      'typescript': ['.ts', '.tsx', 'typescript'],
      'javascript': ['.js', '.jsx'],
      'react': ['react', 'jsx', 'tsx'],
      'node': ['node_modules', 'package.json'],
      'python': ['.py', 'requirements.txt'],
      'java': ['.java', 'pom.xml', 'gradle'],
    };

    const detected: string[] = [];

    for (const [tech, indicators] of Object.entries(techIndicators)) {
      if (indicators.some(indicator =>
        context.fileName.includes(indicator) ||
        context.projectStructure?.includes(indicator)
      )) {
        detected.push(tech);
      }
    }

    return detected;
  }

  private async processAnalysisResult(rawResult: AnalysisResult, context: AnalysisContext): Promise<ProcessedAnalysis> {
    // Extract structured information from AI response
    const parsedContent = this.parseAIResponse(rawResult.content);

    return {
      rating: parsedContent.rating,
      summary: parsedContent.summary,
      issues: parsedContent.issues,
      recommendations: parsedContent.recommendations,
      securityNotes: parsedContent.securityNotes,
      rawResponse: rawResult.content
    };
  }

  private parseAIResponse(content: string): ParsedAIResponse {
    const lines = content.split('\n');
    const result: ParsedAIResponse = {
      rating: 5, // Default
      summary: '',
      issues: [],
      recommendations: [],
      securityNotes: []
    };

    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('**Rating:**')) {
        const match = line.match(/\*\*Rating:\*\*\s*(\d+)/);
        if (match) {
          result.rating = parseInt(match[1]);
        }
      } else if (line.startsWith('**Summary:**')) {
        currentSection = 'summary';
      } else if (line.startsWith('**Issues:**')) {
        currentSection = 'issues';
      } else if (line.startsWith('**Recommendations:**')) {
        currentSection = 'recommendations';
      } else if (line.startsWith('**Security Notes:**')) {
        currentSection = 'security';
      } else if (line.trim().startsWith('- ') && currentSection) {
        const item = line.trim().substring(2);
        switch (currentSection) {
          case 'issues':
            result.issues.push({ description: item, severity: this.guessSeverity(item) });
            break;
          case 'recommendations':
            result.recommendations.push(item);
            break;
          case 'security':
            result.securityNotes.push(item);
            break;
        }
      } else if (currentSection === 'summary' && line.trim()) {
        result.summary += line.trim() + ' ';
      }
    }

    result.summary = result.summary.trim();
    return result;
  }

  private guessSeverity(description: string): 'low' | 'medium' | 'high' | 'critical' {
    const lower = description.toLowerCase();
    if (lower.includes('security') || lower.includes('vulnerability') || lower.includes('breach')) {
      return 'critical';
    }
    if (lower.includes('error') || lower.includes('fail') || lower.includes('break')) {
      return 'high';
    }
    if (lower.includes('warning') || lower.includes('caution')) {
      return 'medium';
    }
    return 'low';
  }
}
```

### 2.2 Cost Management and Rate Limiting

```typescript
export class AICostManager {
  private budgetTracker: MonthlyBudgetTracker;
  private rateLimiter: SlidingWindowRateLimiter;
  private costLogger: CostLogger;

  constructor(config: CostConfig) {
    this.budgetTracker = new MonthlyBudgetTracker(config.monthlyLimit);
    this.rateLimiter = new SlidingWindowRateLimiter({
      maxRequests: config.requestsPerMinute,
      windowMs: 60000 // 1 minute
    });
    this.costLogger = new CostLogger();
  }

  async checkRequestAllowed(provider: string, estimatedTokens: number): Promise<CostApproval> {
    // Check budget remaining
    const remainingBudget = await this.budgetTracker.getRemainingBudget();
    const estimatedCost = this.calculateEstimatedCost(provider, estimatedTokens);

    if (estimatedCost > remainingBudget) {
      return {
        allowed: false,
        reason: 'Monthly budget exceeded',
        estimatedCost,
        remainingBudget
      };
    }

    // Check rate limits
    if (!this.rateLimiter.canMakeRequest()) {
      const resetTime = this.rateLimiter.getResetTime();
      return {
        allowed: false,
        reason: `Rate limit exceeded. Reset at ${resetTime}`,
        estimatedCost,
        remainingBudget
      };
    }

    return {
      allowed: true,
      estimatedCost,
      remainingBudget
    };
  }

  async recordUsage(provider: string, tokens: TokenUsage, actualCost: CostBreakdown): Promise<void> {
    await Promise.all([
      this.budgetTracker.recordCost(actualCost.total),
      this.rateLimiter.recordRequest(),
      this.costLogger.logUsage(provider, tokens, actualCost)
    ]);
  }

  private calculateEstimatedCost(provider: string, tokens: number): number {
    const rates: Record<string, number> = {
      'gemini': 0.00025,  // $0.00025 per 1K tokens
      'openai': 0.00002,  // $0.00002 per 1K tokens
      'claude': 0.000015  // $0.000015 per 1K tokens
    };

    return (tokens / 1000) * (rates[provider] || 0.0001);
  }
}

export class MonthlyBudgetTracker {
  private readonly budget: number;
  private readonly storage: CostStorage;

  constructor(monthlyBudget: number) {
    this.budget = monthlyBudget;
    this.storage = new SQLiteCostStorage();
  }

  async getRemainingBudget(): Promise<number> {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const spentThisMonth = await this.storage.getMonthlyCost(currentMonth);
    return Math.max(0, this.budget - spentThisMonth);
  }

  async recordCost(cost: number): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    await this.storage.recordCost(currentMonth, cost, new Date());
  }
}

export interface CostConfig {
  monthlyLimit: number;
  requestsPerMinute: number;
  alertThreshold: number; // Alert when budget reaches this percentage
}

export interface CostApproval {
  allowed: boolean;
  reason?: string;
  estimatedCost: number;
  remainingBudget: number;
}
```

---

## 3. Enhanced CLI with AI Analysis

### 3.1 AI Analysis Commands

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { AIAnalysisEngine } from './ai/AIAnalysisEngine';
import { GitIntegrationService } from './git/GitIntegrationService';
import chalk from 'chalk';

const program = new Command();

program
  .name('codeflow')
  .description('AI-powered code review system')
  .version('2.0.0');

// AI-powered diff analysis
program
  .command('analyze')
  .description('Analyze code changes with AI')
  .argument('<diff>', 'Git diff content')
  .option('-p, --provider <provider>', 'AI provider (gemini, openai, claude)')
  .option('-t, --type <type>', 'Analysis type (review, architecture, security)', 'review')
  .option('--cost', 'Show cost estimation before analysis')
  .action(async (diffContent, options) => {
    const engine = new AIAnalysisEngine();

    // Read diff from stdin if not provided as argument
    if (!diffContent) {
      diffContent = fs.readFileSync(0, 'utf8');
    }

    // Parse diff to extract context
    const gitService = new GitIntegrationService();
    const context = await gitService.extractDiffContext(diffContent);

    if (options.cost) {
      const costEstimate = await engine.estimateCost(diffContent, options.provider);
      console.log(chalk.blue(`💰 Estimated cost: $${costEstimate.toFixed(4)}`));

      const answer = await askQuestion('Proceed with analysis? (y/N): ');
      if (!answer.toLowerCase().startsWith('y')) {
        process.exit(0);
      }
    }

    console.log(chalk.blue('🤖 Analyzing with AI...'));
    const spinner = ora('Generating analysis...').start();

    try {
      const result = await engine.analyzeDiff(diffContent, context, options.type);

      spinner.succeed('Analysis complete');

      if (result.error) {
        console.error(chalk.red(`❌ ${result.error}`));
        process.exit(1);
      }

      // Display formatted results
      displayAnalysisResults(result.analysis, result.metadata);

      if (result.metadata.cost) {
        console.log(chalk.gray(`💰 Cost: $${result.metadata.cost.total.toFixed(4)}`));
      }

    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Cost monitoring
program
  .command('costs')
  .description('Show AI usage costs')
  .option('-m, --month <month>', 'Month to show (YYYY-MM)', new Date().toISOString().substring(0, 7))
  .action(async (options) => {
    const costManager = new AICostManager();

    const costs = await costManager.getMonthlyUsage(options.month);

    console.log(chalk.blue(`📊 Cost Report for ${options.month}`));
    console.log(chalk.gray('='.repeat(50)));

    console.log(`Total Cost: ${chalk.green('$' + costs.total.toFixed(2))}`);
    console.log(`Remaining Budget: ${chalk.green('$' + costs.remainingBudget.toFixed(2))}`);
    console.log(`Requests This Month: ${costs.totalRequests}`);

    console.log('\nBy Provider:');
    for (const [provider, amount] of Object.entries(costs.byProvider)) {
      const percentage = (amount / costs.total) * 100;
      console.log(`  ${provider}: $${amount.toFixed(2)} (${percentage.toFixed(1)}%)`);
    }
  });

// Provider management
program
  .command('providers')
  .description('Manage AI providers')
  .addCommand(
    new Command('list')
      .description('List available providers')
      .action(async () => {
        const providerManager = new AIProviderManager();

        const providers = await providerManager.validateAllConnections();

        console.log(chalk.blue('🤖 AI Providers'));
        console.log();

        for (const provider of providers) {
          const status = provider.status === 'connected' ? '🟢' : '🔴';
          console.log(`${status} ${provider.name}: ${provider.status}`);
        }
      })
  )
  .addCommand(
    new Command('switch')
      .description('Switch active provider')
      .argument('<provider>', 'Provider name')
      .action(async (provider) => {
        const providerManager = new AIProviderManager();

        try {
          await providerManager.switchProvider(provider);
          console.log(chalk.green(`✅ Switched to ${provider}`));
        } catch (error) {
          console.error(chalk.red(`❌ Failed to switch provider: ${error.message}`));
        }
      })
  );

// Parse arguments
program.parse();
```

### 3.2 Interactive Configuration System

```typescript
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';

export class AISetupWizard {
  async run(): Promise<AIConfig> {
    console.log(chalk.blue.bold('🤖 Codeflow AI Setup'));
    console.log('Configure your AI providers for intelligent code analysis\n');

    const config: AIConfig = {
      defaultProvider: 'gemini',
      providers: {},
      costLimits: {
        monthlyBudget: 20, // Default $20/month
        perRequestLimit: 0.1, // Max $0.10 per request
        currency: 'USD'
      }
    };

    // Provider selection
    const providerChoices = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedProviders',
        message: 'Which AI providers do you want to configure?',
        choices: [
          { name: 'Google Gemini (Recommended)', value: 'gemini' },
          { name: 'OpenAI GPT', value: 'openai' },
          { name: 'Anthropic Claude', value: 'claude' }
        ]
      }
    ]);

    // Configure each selected provider
    for (const provider of providerChoices.selectedProviders) {
      config.providers[provider] = await this.configureProvider(provider);
    }

    // Set default provider
    if (providerChoices.selectedProviders.length > 1) {
      const defaultChoice = await inquirer.prompt([
        {
          type: 'list',
          name: 'defaultProvider',
          message: 'Which provider should be used by default?',
          choices: providerChoices.selectedProviders
        }
      ]);
      config.defaultProvider = defaultChoice.defaultProvider;
    }

    // Cost limits
    const costConfig = await inquirer.prompt([
      {
        type: 'number',
        name: 'monthlyBudget',
        message: 'What is your monthly AI budget? (USD)',
        default: 20
      },
      {
        type: 'number',
        name: 'perRequestLimit',
        message: 'Maximum cost per request? (USD)',
        default: 0.1
      }
    ]);

    config.costLimits.monthlyBudget = costConfig.monthlyBudget;
    config.costLimits.perRequestLimit = costConfig.perRequestLimit;

    // Save configuration
    this.saveConfiguration(config);

    return config;
  }

  private async configureProvider(providerName: string): Promise<ProviderConfig> {
    const prompts = {
      gemini: {
        apiKey: await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your Gemini API key (get from https://makersuite.google.com/app/apikey):',
            validate: (input) => input.length > 10 || 'API key seems too short'
          }
        ])
      },
      openai: {
        apiKey: await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your OpenAI API key (get from https://platform.openai.com/api-keys):',
            validate: (input) => input.length > 10 || 'API key seems too short'
          }
        ])
      },
      claude: {
        apiKey: await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your Anthropic API key (get from https://console.anthropic.com/):',
            validate: (input) => input.length > 10 || 'API key seems too short'
          }
        ])
      }
    };

    return prompts[providerName].apiKey;
  }

  private saveConfiguration(config: AIConfig): void {
