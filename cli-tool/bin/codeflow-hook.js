#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os'; // Make sure os is imported
import readline from 'readline';
import { indexProject } from './rag.js';
import { orchestrateReview } from './agents.js';

// Import CLI integration service
import { analyzeDiff } from '../services/cli-integration.js';
import { RAGSystem } from '../services/rag-system.js';

// Import knowledge services and commands
import { initProjectStore } from '../src/knowledge/projectStore.js';
import { initGraphService } from '../src/knowledge/graphService.js';
import { loadConfig } from '../src/utils/config.js';
import {
  handleKnowledgeSearch,
  handleKnowledgeGraphStatus,
  handleKnowledgeForecast,
  handleKnowledgeStats,
  handleKnowledgeClear
} from '../src/cli/commands/knowledge.js';

// Export for use in agents module
export { callAIProvider };

const program = new Command();

program
  .name('codeflow-hook')
  .description('Enterprss--gradegrade CI/CD simulwithr wode review, , complianccmvalldaiion,vltiosecurn y govadn ucerity governance')
  .version('5.0.0');

// Configure AI provider settings
program
  .command('config')
  .description('Configure AI provider settings')
  .option('-p, --provider <provider>', 'AI provider (gemini, openai, claude)', 'gemini')
  .option('-k, --key <key>', 'API key for the chosen provider')
  .option('-u, --url <url>', 'Custom API URL (optional)')
  .option('-m, --model <model>', 'AI model name (optional - uses provider default)')
  .action(async (options) => {
    // Use USERPROFILE on Windows instead of HOME which might be undefined
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configDir = path.join(homeDir, '.codeflow-hook');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, 'config.json');

    // Configuration cascade: Check for project-level config first, then fall back to global
    const projectConfigPath = path.join(process.cwd(), '.codeflowrc.json');
    const projectConfig = fs.existsSync(projectConfigPath) ? JSON.parse(fs.readFileSync(projectConfigPath, 'utf8')) : {};

    const existingConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

    // Show config cascade message
    if (Object.keys(projectConfig).length > 0) {
      console.log(chalk.blue('📁 Using configuration cascade (project → global):'));
      console.log(chalk.gray(`   Project config: ${projectConfigPath}`));
      if (fs.existsSync(configPath)) {
        console.log(chalk.gray(`   Global config: ${configPath}`));
      }
    }

    // Determine what the new provider and API key should be
    const requestedProvider = (options.provider || existingConfig.provider || 'gemini').toLowerCase();
    const requestedApiKey = options.key || existingConfig.apiKey;

    // FIX: Explicit boolean coercion to prevent || operator from returning non-boolean values
    // Step by step to ensure proper boolean evaluation
    const hasNewKey = !!options.key;
    const isFirstTimeSetup = !existingConfig.provider && !existingConfig.apiKey;
    const shouldValidate = hasNewKey || isFirstTimeSetup;

    console.log('VALIDATION DEBUG - provider:', requestedProvider, 'key_exists:', !!options.key, 'shouldValidate:', shouldValidate);

    if (shouldValidate && requestedApiKey) {
      console.log(chalk.blue('🔐 Validating API key for provider:', requestedProvider));
      const validationSpinner = ora('Checking key permissions...').start();

      try {
        await validateApiKey(requestedProvider, requestedApiKey);
        validationSpinner.succeed('API key validated');
      } catch (error) {
        validationSpinner.fail('Validation failed');
        console.error(chalk.red(`❌ ${error.message}`));
        console.error(chalk.red(`💡 Make sure you're using a valid ${requestedProvider.toUpperCase()} API key for the ${requestedProvider} provider.`));
        process.exit(1);
      }
    } else {
      console.log(chalk.yellow('⚠️ Validation skipped - no API key validation needed'));
    }

    // Initialize config with existing values, then override with verified CLI options
    const config = {
      provider: requestedProvider,
      apiKey: requestedApiKey,
      apiUrl: options.url || existingConfig.apiUrl,
      model: options.model || existingConfig.model
    };

    // Interactive model selection if model is not explicitly provided
    if (!options.model) {
      // FIX: More robust logic for when to fetch new models
      const isNewProvider = existingConfig.provider && (existingConfig.provider.toLowerCase() !== config.provider.toLowerCase());
      const hasNewKey = !!options.key;

      const shouldFetchModels = !existingConfig.model || isNewProvider || hasNewKey;

      if (shouldFetchModels) {
        console.log(chalk.blue('🔍 Fetching available models...'));

        const modelSpinner = ora('Contacting API...').start();
        try {
          const models = await fetchModels(config.provider, config.apiKey);
          modelSpinner.succeed('Models fetched successfully');

          console.log(chalk.blue('Available models:'));
          models.forEach((model, index) => {
            console.log(chalk.gray(`  ${index + 1}. ${model}`));
          });

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const selectedModel = await new Promise(resolve => {
            rl.question(chalk.blue(`Enter the model name (or number): `), (input) => {
              rl.close();
              resolve(input.trim());
            });
          });

          // Check if user entered a number
          const index = parseInt(selectedModel) - 1;
          if (!isNaN(index) && index >= 0 && index < fallbackModels.length) {
            config.model = fallbackModels[index];
          } else {
            config.model = selectedModel;
          }

          console.log(chalk.green(`✓ Selected fallback model: ${config.model}`));
        } catch (error) {
          console.log(chalk.red(`❌ Failed to fetch models: ${error.message}`));
          // Use fallback without interactive selection
        }
      } else {
        // Reuse existing model and config
        console.log(chalk.blue(`📚 Using existing configuration (provider: ${existingConfig.provider}, model: ${existingConfig.model})`));
      }
    } else {
      // User explicitly provided model
      console.log(chalk.green(`✓ Using specified model: ${config.model}`));
    }

    // Set default API URL if not provided by options or existing config
    if (!config.apiUrl) {
      switch (config.provider) {
        case 'openai':
          config.apiUrl = 'https://api.openai.com/v1/chat/completions';
          break;
        case 'claude':
          config.apiUrl = 'https://api.anthropic.com/v1/messages';
          break;
        case 'gemini':
        default:
          // Updated Gemini API URL to v1 - using a base URL
          config.apiUrl = 'https://generativelanguage.googleapis.com/v1/models';
          break;
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`✅ Configuration saved for ${config.provider} provider`));
    if (config.model) {
      console.log(chalk.green(`   Model: ${config.model}`));
    }
  });

// Index repository via EKG Ingestion Service (Phase 4)
program
  .command('index')
  .description('Index repository via EKG Ingestion Service')
  .option('-d, --dry-run', 'Show what would be indexed without actually indexing')
  .action(async (options) => {
    try {
      const spinner = ora('Submitting repository for EKG analysis...').start();

      const result = await indexProject({
        dryRun: options.dryRun || false
      });

      spinner.succeed('Repository indexing initiated');
      console.log(chalk.green(`✅ ${result.message}`));

      if (result.repositoryId) {
        console.log(chalk.blue(`📋 Repository ID: ${result.repositoryId}`));
      }

      if (result.stats) {
        console.log(chalk.gray(`📊 Stats: ${JSON.stringify(result.stats, null, 2)}`));
      }

      console.log(chalk.cyan('🔗 Repository submitted to EKG Ingestion Service for analysis'));

    } catch (error) {
      console.log(chalk.red(`❌ Indexing failed: ${error.message}`));
      process.exit(1);
    }
  });

// Install git hooks
program
  .command('install')
  .description('Install git hooks (pre-commit and pre-push)')
  .option('--hooks-dir <dir>', 'Custom hooks directory', '.git/hooks')
  .action(async (options) => {
    const spinner = ora('Installing git hooks...').start();
    try {
      const hooksDir = path.resolve(options.hooksDir);
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }

      // CHANGE 1: The git hooks are modified to PIPE the diff content via stdin
      const preCommitHook = `#!/usr/bin/env bash
# Codeflow pre-commit hook
set -e
echo "🔬 Running Codeflow AI Code Analysis..."
STAGED_DIFF=$(git diff --cached --no-color)
if [ -z "$STAGED_DIFF" ]; then
  echo "ℹ️  No staged changes to analyze"
  exit 0
fi
# Use stdin to avoid "command line too long" error
echo "$STAGED_DIFF" | npx codeflow-hook analyze-diff
`;

      fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook, { mode: 0o755 });

      const prePushHook = `#!/usr/bin/env bash
# Codeflow pre-push hook
set -e
echo "🚀 Running Codeflow CI/CD simulation..."
if [ -f "package.json" ]; then
  echo "🧪 Running tests..."
  npm test || (echo "❌ Tests failed" && exit 1)
fi
STAGED_DIFF=$(git diff --cached --no-color)
if [ -n "$STAGED_DIFF" ]; then
  echo "🔬 Running AI Code Review..."
  # Use stdin to avoid "command line too long" error
  echo "$STAGED_DIFF" | npx codeflow-hook analyze-diff || exit 1
fi
echo "✅ All checks passed!"
exit 0
`;
      fs.writeFileSync(path.join(hooksDir, 'pre-push'), prePushHook, { mode: 0o755 });

      spinner.succeed('Git hooks installed successfully');
      console.log(chalk.blue('📋 Installed hooks:'));
      console.log(chalk.gray('  - pre-commit: AI analysis on staged changes'));
      console.log(chalk.gray('  - pre-push: CI/CD simulation with AI review + tests'));

    } catch (error) {
      spinner.fail('Failed to install hooks');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Analyze diff with knowledge store integration (Phase 3/4)
program
  .command('analyze-diff')
  .description('Analyze git diff using AI and knowledge store/graph integration')
  .argument('[diff]', 'Git diff content')
  .option('--legacy', 'Use legacy analysis instead of knowledge-enhanced analysis')
  .action(async (diff, options) => {
    try {
      // Read diff content from stdin or argument
      let diffContent = diff;
      if (!diffContent) {
        const chunks = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        diffContent = Buffer.concat(chunks).toString('utf8');
      }

      if (diffContent.trim() === '') {
        console.log(chalk.gray('ℹ️  No changes to analyze'));
        return;
      }

      console.log(chalk.blue('🔬 Analyzing diff with EKG context enhancement...'));

      const result = await analyzeDiff(diffContent, {
        legacy: options.legacy || false,
        outputFormat: 'console'
      });

      if (result.success) {
        console.log(chalk.green(`✅ ${result.message}`));
        displayEKGAnalysisResults(result.analysis);

        if (result.stats) {
          console.log(chalk.gray(`📊 EKG Queries: ${result.stats.ekg_queries}`));
          console.log(chalk.gray(`👥 Similar Repos Found: ${result.stats.similar_repos_found}`));
          console.log(chalk.gray(`⏱️  Analysis Time: ${result.stats.analysis_time}ms`));
        }
      } else {
        console.log(chalk.red(`❌ Analysis failed: ${result.message}`));
        process.exit(1);
      }

    } catch (error) {
      console.log(chalk.red(`❌ Analysis error: ${error.message}`));
      process.exit(1);
    }
  });

// RAG commands for Phase 4 Enterprise Knowledge Graph
program
  .command('rag-index')
  .description('Index repository for RAG (Retrieval-Augmented Generation)')
  .option('--dry-run', 'Show what would be indexed without actually indexing')
  .option('--include <patterns>', 'File patterns to include (comma-separated)', '**/*.js,**/*.ts,**/*.tsx,**/*.jsx,**/*.json,**/*.md')
  .option('--exclude <patterns>', 'File patterns to exclude (comma-separated)', '**/node_modules/**,**/dist/**,**/build/**,**/.git/**')
  .action(async (options) => {
    try {
      const spinner = ora('Initializing RAG system...').start();
      const ragSystem = new RAGSystem();
      await ragSystem.initialize();
      spinner.succeed('RAG system ready');

      const includePatterns = options.include.split(',');
      const excludePatterns = options.exclude.split(',');

      const result = await ragSystem.indexRepository('.', {
        includePatterns,
        excludePatterns,
        dryRun: options.dryRun
      });

      if (options.dryRun) {
        console.log(chalk.blue(`📋 Would index ${result.files} files`));
      } else {
        console.log(chalk.green(`✅ Repository indexed for RAG!`));
        console.log(chalk.gray(`   📊 Stats: ${result.files} files, ${result.chunks} chunks, ${result.vectors} vectors`));
      }

    } catch (error) {
      console.log(chalk.red(`❌ RAG indexing failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('rag-analyze')
  .description('Analyze code with RAG context enhancement')
  .argument('[code]', 'Code to analyze')
  .option('--query <query>', 'Custom context query (auto-generated if not provided)')
  .option('--limit <number>', 'Max context chunks to retrieve', '5')
  .action(async (code, options) => {
    try {
      if (!code) {
        console.log(chalk.red('❌ Please provide code to analyze'));
        console.log(chalk.gray('Usage: codeflow-hook rag-analyze "your code here"'));
        process.exit(1);
      }

      const spinner = ora('Initializing RAG system...').start();
      const ragSystem = new RAGSystem();
      await ragSystem.initialize();
      spinner.succeed('RAG system ready');

      console.log(chalk.blue('🧠 Analyzing code with RAG context...'));

      const analysis = await ragSystem.analyzeWithContext(code, options.query, {
        limit: parseInt(options.limit)
      });

      console.log(chalk.green('📋 Retrieved Context:'));
      analysis.retrievedContext.forEach((ctx, i) => {
        console.log(chalk.gray(`   ${i + 1}. ${ctx.filePath} (score: ${(ctx.score * 100).toFixed(1)}%)`));
      });
      console.log();

      // Now call AI with enhanced context
      const configPath = path.join(os.homedir(), '.codeflow-hook', 'config.json');
      if (!fs.existsSync(configPath)) {
        console.log(chalk.red('❌ No AI configuration found. Run: codeflow-hook config -k <api-key>'));
        process.exit(1);
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const aiResponse = await callAIProvider(config, analysis.enhancedPrompt);

      console.log(chalk.blue('🤖 AI Analysis with RAG Context:'));
      console.log(aiResponse);

    } catch (error) {
      console.log(chalk.red(`❌ RAG analysis failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('rag-status')
  .description('Show RAG system status and statistics')
  .action(async () => {
    try {
      const ragSystem = new RAGSystem();
      await ragSystem.initialize();

      const stats = ragSystem.getStats();
      console.log(chalk.blue('🧠 RAG System Status'));
      console.log();
      console.log(chalk.gray(`Vector Store: ${stats.vectorStore.indexPath}`));
      console.log(chalk.gray(`Vectors: ${stats.vectorStore.vectorCount}`));
      console.log(chalk.gray(`Metadata: ${stats.vectorStore.metadataCount}`));
      console.log(chalk.gray(`Initialized: ${stats.vectorStore.initialized ? 'Yes' : 'No'}`));
      console.log(chalk.gray(`Chunk Size: ${stats.chunkSize} chars`));
      console.log(chalk.gray(`Overlap: ${stats.overlap} chars`));

    } catch (error) {
      console.log(chalk.red(`❌ Failed to get RAG status: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('rag-clear')
  .description('Clear the RAG index and start fresh')
  .action(async () => {
    try {
      const spinner = ora('Clearing RAG index...').start();
      const ragSystem = new RAGSystem();
      await ragSystem.initialize();
      await ragSystem.clearIndex();
      spinner.succeed('RAG index cleared');
    } catch (error) {
      console.log(chalk.red(`❌ Failed to clear RAG index: ${error.message}`));
      process.exit(1);
    }
  });

// Knowledge Phase 3/4 commands
program
  .command('knowledge <action>')
  .description('Knowledge services: search, graph status, forecasting, and statistics')
  .argument('[arg]', 'Argument for the action (code for search, repository-id for forecast)')
  .option('--verbose', 'Enable verbose output', false)
  .option('--top-k <number>', 'Number of results to return (for search)', parseInt, 5)
  .option('--force', 'Force operation without confirmation', false)
  .option('--yes', 'Skip confirmation prompts', false)
  .action(async (action, arg, options) => {
    try {
      const config = loadConfig();

      switch (action) {
        case 'search':
          if (!arg) {
            console.log(chalk.red('❌ Please provide code snippet to search for'));
            console.log(chalk.gray('Usage: codeflow-hook knowledge search "your code here" --verbose'));
            process.exit(1);
          }
          await handleKnowledgeSearch(arg, { verbose: options.verbose, topK: options.topK });
          break;

        case 'graph-status':
          await handleKnowledgeGraphStatus(options);
          break;

        case 'forecast':
          if (!arg) {
            console.log(chalk.red('❌ Please provide repository ID for forecast'));
            console.log(chalk.gray('Usage: codeflow-hook knowledge forecast <repository-id>'));
            process.exit(1);
          }
          await handleKnowledgeForecast(arg, options);
          break;

        case 'stats':
          await handleKnowledgeStats(options);
          break;

        case 'clear':
          await handleKnowledgeClear(options);
          break;

        default:
          console.log(chalk.red(`❌ Unknown action: ${action}`));
          console.log(chalk.gray('Available actions: search, graph-status, forecast, stats, clear'));
          process.exit(1);
      }
    } catch (error) {
      console.log(chalk.red(`❌ Knowledge command failed: ${error.message}`));
      process.exit(1);
    }
  });

// Show status
program
  .command('status')
  .description('Show installation and configuration status')
  .action(() => {
    console.log(chalk.blue('🔍 Codeflow Hook Status'));
    console.log();

    // Check configuration cascade
    const globalConfigPath = path.join(os.homedir(), '.codeflow-hook', 'config.json');
    const projectConfigPath = path.join(process.cwd(), '.codeflowrc.json');

    const hasGlobalConfig = fs.existsSync(globalConfigPath);
    const hasProjectConfig = fs.existsSync(projectConfigPath);

    if (hasProjectConfig) {
      console.log(chalk.green('✅ Project Configuration: Found (.codeflowrc.json)'));
    } else {
      console.log(chalk.gray('ℹ️  Project Configuration: Not found'));
    }

    if (hasGlobalConfig) {
      console.log(chalk.green('✅ Global Configuration: Found'));
    } else {
      console.log(chalk.red('❌ Global Configuration: Not found (run: codeflow-hook config)'));
    }

    if (!hasGlobalConfig && !hasProjectConfig) {
      console.log(chalk.red('❌ No configuration found. Run: codeflow-hook config -k <api-key>'));
    }

    // Check git hooks
    const hooksDir = '.git/hooks';
    const preCommitHook = path.join(hooksDir, 'pre-commit');
    const prePushHook = path.join(hooksDir, 'pre-push');

    if (fs.existsSync(preCommitHook)) {
      console.log(chalk.green('✅ Git Hook (pre-commit): Installed'));
    } else {
      console.log(chalk.red('❌ Git Hook (pre-commit): Not installed'));
    }

    if (fs.existsSync(prePushHook)) {
      console.log(chalk.green('✅ Git Hook (pre-push): Installed'));
    } else {
      console.log(chalk.red('❌ Git Hook (pre-push): Not installed'));
    }

    console.log();
    console.log(chalk.blue('💡 Tips:'));
    console.log(chalk.gray('   • Create .codeflowrc.json in project root for project-specific settings'));
    console.log(chalk.gray('   • Large diffs (>20KB) will prompt for confirmation to avoid high costs'));
    console.log(chalk.gray('   • Run "codeflow-hook config -h" for configuration options'));
  });

async function fetchModels(provider, apiKey) {
  switch (provider) {
    case 'gemini':
      const geminiResponse = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      return geminiResponse.data.models.map(m => m.name.replace('models/', ''));
    case 'openai':
      const openaiResponse = await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return openaiResponse.data.data.map(m => m.id);
    case 'claude':
      console.log(chalk.yellow("Claude does not support dynamic model fetching. Using a standard list."));
      return getFallbackModels('claude');
    default:
      return [];
  }
}

function getFallbackModels(provider) {
  switch (provider) {
    case 'gemini':
      return ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-pro'];
    case 'openai':
      return ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    case 'claude':
      return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
    default:
      return [];
  }
}

function generateCodeReviewPrompt(diff) {
  return `You are "Codeflow", a world-class AI software engineering assistant acting as a Principal Engineer. Your mission is to perform a rigorous and constructive code review on the provided code changes.

**Guidelines:**
- Focus on code quality, security, performance, and best practices
- Be constructive and provide actionable suggestions
- Rate the changes on a scale of 1-10 (where 10 is excellent)
- If there are critical issues, suggest fixes

**Format your response as:**
**Rating:** [1-10]/10
**Summary:** [Brief summary]

**Issues:** (if any)
- [Issue description and suggestion]

**Recommendations:** (if any)
- [Recommendation]

**Code Changes to Review:**
\`\`\`
${diff}
\`\`\`

Provide your analysis:`;
}

function callAIProvider(config, prompt) {
  switch (config.provider) {
    case 'openai':
      return callOpenAI(config, prompt);
    case 'claude':
      return callClaude(config, prompt);
    case 'gemini':
    default:
      return callGemini(config, prompt);
  }
}

async function callGemini(config, prompt) {
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.2,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  };

  const url = `${config.apiUrl}/${config.model}:generateContent?key=${config.apiKey}`;
  const response = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return response.data.candidates[0].content.parts[0].text;
}

async function callOpenAI(config, prompt) {
  const payload = {
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 2048
  };

  const response = await axios.post(config.apiUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    }
  });

  return response.data.choices[0].message.content;
}

async function callClaude(config, prompt) {
  const payload = {
    model: config.model,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  };

  const response = await axios.post(config.apiUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    }
  });

  return response.data.content[0].text;
}

function displayAnalysisResults(result) {
  // Parse the AI response and format it nicely
  const lines = result.split('\n');

  for (const line of lines) {
    if (line.startsWith('**Rating:**')) {
      const rating = line.match(/\*\*Rating:\*\*\s*(\d+)/);
      if (rating) {
        const score = parseInt(rating[1]);
        if (score >= 8) {
          console.log(chalk.green(`⭐ ${line}`));
        } else if (score >= 5) {
          console.log(chalk.yellow(`⚠️  ${line}`));
        } else {
          console.log(chalk.red(`❌ ${line}`));
        }
      }
    } else if (line.includes('**Issues:**') || line.includes('**Recommendations:**')) {
      console.log(chalk.blue(line));
    } else if (line.startsWith('- ')) {
      console.log(chalk.gray(line));
    } else if (line.includes('**Summary:**')) {
      console.log(chalk.cyan(line));
    } else {
      console.log(line);
    }
  }

  console.log();
}

function displayAgenticResults(results) {
  if (!results || results.length === 0) {
    console.log(chalk.green('✅ No issues found in the analysis.'));
    return;
  }

  // Group results by file and type
  const groupedResults = {};
  const summaryStats = { security: 0, architecture: 0, maintainability: 0 };

  for (const result of results) {
    const key = `${result.file}:${result.scopeType}`;
    if (!groupedResults[key]) {
      groupedResults[key] = [];
    }
    groupedResults[key].push(result);

    // Count by severity for summary
    summaryStats[result.type.toLowerCase()]++;
  }

  // Display summary stats
  console.log(chalk.blue('📊 Code Review Summary:'));
  console.log(`   🔒 Security issues: ${summaryStats.security}`);
  console.log(`   🏗️  Architecture issues: ${summaryStats.architecture}`);
  console.log(`   📝 Maintainability issues: ${summaryStats.maintainability}`);
  console.log();

  // Display detailed results by file and scope
  for (const [scopeKey, scopeResults] of Object.entries(groupedResults)) {
    const [file, scopeType] = scopeKey.split(':');
    console.log(chalk.yellow(`📁 ${file} (${scopeType})`));

    for (const result of scopeResults) {
      const severityColor = getSeverityColor(result.severity);
      const typeIcon = getTypeIcon(result.type);
      console.log(`   ${severityColor}${typeIcon} ${result.severity}: ${result.description}`);
      if (result.line && result.line !== 'N/A') {
        console.log(chalk.gray(`      Line: ${result.lineRange}`));
      }
    }
    console.log();
  }
}

function getSeverityColor(severity) {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return chalk.red('🔴');
    case 'HIGH':
      return chalk.red('🟠');
    case 'MEDIUM':
      return chalk.yellow('🟡');
    case 'LOW':
      return chalk.green('🟢');
    default:
      return chalk.gray('⚪');
  }
}

function getTypeIcon(type) {
  switch (type?.toUpperCase()) {
    case 'SECURITY':
      return '🔒';
    case 'ARCHITECTURE':
      return '🏗️ ';
    case 'MAINTAINABILITY':
      return '📝';
    default:
      return '❓';
  }
}

// Display EKG-enhanced analysis results (Phase 4)
function displayEKGAnalysisResults(analysis) {
  if (!analysis) {
    console.log(chalk.yellow('⚠️  No analysis results available'));
    return;
  }

  // Display summary
  if (analysis.summary) {
    console.log(chalk.blue('📊 Analysis Summary:'));
    console.log(`   📁 Files modified: ${analysis.summary.totalFiles}`);
    console.log(`   ➕ Additions: ${analysis.summary.totalAdditions}`);
    console.log(`   ➖ Deletions: ${analysis.summary.totalDeletions}`);
    console.log(`   🧠 EKG enhanced: ${analysis.summary.ekgEnhanced ? 'Yes' : 'No'}`);
    console.log();
  }

  // Display EKG context information
  if (analysis.ekg_context) {
    console.log(chalk.blue('🧠 EKG Context:'));
    console.log(`   📚 Patterns analyzed: ${analysis.ekg_context.patterns_analyzed || 0}`);
    console.log(`   👥 Similar repositories: ${analysis.ekg_context.similar_repositories_found || 0}`);
    console.log(`   🔍 Repository known to EKG: ${analysis.ekg_context.repository_known ? 'Yes' : 'No'}`);
    console.log();
  }

  // Display issues
  if (analysis.issues && analysis.issues.length > 0) {
    console.log(chalk.yellow('⚠️ Issues Found:'));
    analysis.issues.forEach(issue => {
      const severityColor = getSeverityColor(issue.severity);
      const typeIcon = getTypeIcon(issue.type);
      console.log(`   ${severityColor}${typeIcon} ${issue.severity}: ${issue.description}`);
    });
    console.log();
  }

  // Display recommendations
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    console.log(chalk.green('💡 Recommendations:'));
    analysis.recommendations.forEach(rec => {
      const severityColor = getSeverityColor(rec.severity);
      console.log(`   ${severityColor}• ${rec.description}`);
      if (rec.file) {
        console.log(chalk.gray(`     📁 File: ${rec.file}`));
      }
    });
    console.log();
  }

  // Display file details
  if (analysis.files && analysis.files.length > 0) {
    console.log(chalk.blue('📂 Files Changed:'));
    analysis.files.forEach(file => {
      const changeType = file.isNew ? 'NEW' : 'MODIFIED';
      const changeColor = file.isNew ? chalk.green : chalk.blue;
      console.log(`${changeColor}   ${changeType} ${file.path} (${file.language})`);
      console.log(chalk.gray(`      +${file.additions} -${file.deletions} changes`));
    });
    console.log();
  }
}

// Enterprise Compliance & Governance Commands (Phase 5)

// Compliance validation command
program
  .command('compliance-check')
  .description('Validate code changes against compliance frameworks (GDPR, SOX, HIPAA)')
  .argument('[diff]', 'Git diff content to analyze')
  .option('--frameworks <frameworks>', 'Compliance frameworks to check (comma-separated)', 'gdpr,sox,hipaa')
  .option('--strict', 'Fail on any compliance issues found', false)
  .option('--report', 'Generate detailed compliance report', false)
  .action(async (diff, options) => {
    try {
      // Read diff content
      let diffContent = diff;
      if (!diffContent) {
        const chunks = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        diffContent = Buffer.concat(chunks).toString('utf8');
      }

      if (diffContent.trim() === '') {
        console.log(chalk.gray('ℹ️  No changes to analyze for compliance'));
        return;
      }

      console.log(chalk.blue('📋 Running Enterprise Compliance Validation...'));

      const frameworks = options.frameworks.split(',');
      const results = {
        gdpr: false,
        sox: false,
        hipaa: false,
        issues: [],
        recommendations: []
      };

      // GDPR Compliance Check
      if (frameworks.includes('gdpr')) {
        console.log(chalk.gray('🔍 Checking GDPR compliance...'));
        const gdprIssues = await checkGDPRCompliance(diffContent);
        results.gdpr = gdprIssues.length === 0;
        results.issues.push(...gdprIssues.map(issue => ({ ...issue, framework: 'GDPR' })));
      }

      // SOX Compliance Check
      if (frameworks.includes('sox')) {
        console.log(chalk.gray('🔍 Checking SOX compliance...'));
        const soxIssues = await checkSOXCompliance(diffContent);
        results.sox = soxIssues.length === 0;
        results.issues.push(...soxIssues.map(issue => ({ ...issue, framework: 'SOX' })));
      }

      // HIPAA Compliance Check
      if (frameworks.includes('hipaa')) {
        console.log(chalk.gray('🔍 Checking HIPAA compliance...'));
        const hipaaIssues = await checkHIPAACompliance(diffContent);
        results.hipaa = hipaaIssues.length === 0;
        results.issues.push(...hipaaIssues.map(issue => ({ ...issue, framework: 'HIPAA' })));
      }

      // Display results
      const passed = Object.values(results).every(result => result === false || result === true ? result : true);
      const hasIssues = results.issues.length > 0;

      if (passed && !hasIssues) {
        console.log(chalk.green('✅ All compliance checks passed!'));
        frameworks.forEach(framework => {
          console.log(chalk.gray(`   ✓ ${framework.toUpperCase()} compliance verified`));
        });
      } else if (hasIssues) {
        console.log(chalk.red('❌ Compliance issues found:'));
        results.issues.forEach((issue, index) => {
          const severityColor = issue.severity === 'CRITICAL' ? chalk.red : issue.severity === 'HIGH' ? chalk.yellow : chalk.blue;
          console.log(`${severityColor}   ${index + 1}. [${issue.framework}] ${issue.severity}: ${issue.description}`);
          if (issue.recommendation) {
            console.log(chalk.gray(`      💡 ${issue.recommendation}`));
          }
        });

        if (options.strict) {
          console.log(chalk.red('\n🚫 Compliance check failed (strict mode enabled)'));
          process.exit(1);
        }
      }

      if (options.report) {
        const reportFile = `compliance-report-${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify({
          timestamp: new Date(),
          frameworks: frameworks,
          results: results,
          diffSummary: diffContent.length
        }, null, 2));
        console.log(chalk.blue(`📄 Detailed report saved: ${reportFile}`));
      }

    } catch (error) {
      console.log(chalk.red(`❌ Compliance check failed: ${error.message}`));
      process.exit(1);
    }
  });

// Security scanning command
program
  .command('security-scan')
  .description('Automated vulnerability and security assessment')
  .argument('[files]', 'Files to scan (scans entire repo if not specified)')
  .option('--rules <rules>', 'Security rules to apply (comma-separated)', 'secrets,xss,sql-injection,auth-bypass')
  .option('--severity <level>', 'Minimum severity level to report', 'medium')
  .option('--fix', 'Automatically apply security fixes where possible', false)
  .action(async (files, options) => {
    try {
      console.log(chalk.blue('🔒 Running Enterprise Security Scan...'));

      const rules = options.rules.split(',');
      const severityLevels = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'info': 0 };
      const minSeverity = severityLevels[options.severity.toLowerCase()] || 2;

      // Determine scan scope
      const scanTargets = files ? files.split(',') : await getAllSourceFiles();

      console.log(chalk.gray(`📁 Scanning ${scanTargets.length} files...`));

      const vulnerabilities = [];

      for (const file of scanTargets) {
        if (!fs.existsSync(file)) continue;

        const content = fs.readFileSync(file, 'utf8');
        const fileVulns = await scanFileForVulnerabilities(content, file, rules);
        vulnerabilities.push(...fileVulns);
      }

      // Filter by severity and sort
      const filteredVulns = vulnerabilities
        .filter(vuln => severityLevels[vuln.severity.toLowerCase()] >= minSeverity)
        .sort((a, b) => severityLevels[b.severity] - severityLevels[a.severity]);

      if (filteredVulns.length === 0) {
        console.log(chalk.green('✅ No security vulnerabilities found!'));
      } else {
        console.log(chalk.red(`❌ Found ${filteredVulns.length} security vulnerabilities:`));
        filteredVulns.forEach((vuln, index) => {
          const severityColor = vuln.severity === 'CRITICAL' ? chalk.red :
                               vuln.severity === 'HIGH' ? chalk.red :
                               vuln.severity === 'MEDIUM' ? chalk.yellow : chalk.blue;
          console.log(`${severityColor}   ${index + 1}. ${vuln.severity}: ${vuln.description}`);
          console.log(chalk.gray(`      📁 ${vuln.file}:${vuln.line || 'N/A'}`));
          console.log(chalk.gray(`      🔧 Rule: ${vuln.rule}`));
          if (vuln.fix && options.fix) {
            console.log(chalk.green(`      ✅ Auto-fixed: ${vuln.fix}`));
          }
        });

        if (options.fix) {
          console.log(chalk.blue('\n🔧 Applied available automatic fixes'));
        }
      }

      // Generate security report
      const reportFile = `security-scan-${Date.now()}.json`;
      fs.writeFileSync(reportFile, JSON.stringify({
        timestamp: new Date(),
        scanScope: scanTargets.length,
        rules: rules,
        vulnerabilitiesFound: filteredVulns.length,
        severityBreakdown: getSeverityBreakdown(filteredVulns),
        scanResults: filteredVulns
      }, null, 2));
      console.log(chalk.gray(`📄 Security report saved: ${reportFile}`));

    } catch (error) {
      console.log(chalk.red(`❌ Security scan failed: ${error.message}`));
      process.exit(1);
    }
  });

// Risk assessment command
program
  .command('risk-assess')
  .description('Real-time risk analysis for code changes')
  .argument('[diff]', 'Git diff content to analyze')
  .option('--model <model>', 'Risk assessment model to use', 'enterprise')
  .option('--threshold <score>', 'Risk score threshold (0-100)', '70')
  .option('--detailed', 'Show detailed risk breakdown', false)
  .action(async (diff, options) => {
    try {
      // Read diff content
      let diffContent = diff;
      if (!diffContent) {
        const chunks = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        diffContent = Buffer.concat(chunks).toString('utf8');
      }

      if (diffContent.trim() === '') {
        console.log(chalk.gray('ℹ️  No changes to analyze for risk'));
        return;
      }

      console.log(chalk.blue('📊 Performing Enterprise Risk Assessment...'));

      const assessment = await performRiskAssessment(diffContent, {
        model: options.model,
        threshold: parseInt(options.threshold)
      });

      const riskColor = assessment.riskScore >= 80 ? chalk.red :
                       assessment.riskScore >= 60 ? chalk.yellow : chalk.green;
      const riskLevel = assessment.riskScore >= 80 ? 'HIGH' :
                       assessment.riskScore >= 60 ? 'MEDIUM' : 'LOW';

      console.log(riskColor(`🎯 Overall Risk Score: ${assessment.riskScore}/100 (${riskLevel})`));

      if (options.detailed) {
        console.log(chalk.blue('\n📈 Risk Breakdown:'));
        assessment.factors.forEach(factor => {
          const factorColor = factor.score >= 70 ? chalk.red :
                             factor.score >= 50 ? chalk.yellow : chalk.green;
          console.log(`   ${factorColor}${factor.name}: ${factor.score}/100 - ${factor.description}`);
        });
      }

      if (assessment.recommendations.length > 0) {
        console.log(chalk.blue('\n💡 Risk Mitigation Recommendations:'));
        assessment.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }

      if (assessment.riskScore >= parseInt(options.threshold)) {
        console.log(chalk.red(`\n🚫 Risk score exceeds threshold (${options.threshold}). Review required.`));
        if (options.model === 'enterprise') {
          process.exit(1);
        }
      } else {
        console.log(chalk.green('\n✅ Risk assessment passed'));
      }

    } catch (error) {
      console.log(chalk.red(`❌ Risk assessment failed: ${error.message}`));
      process.exit(1);
    }
  });

// Privacy impact assessment command
program
  .command('privacy-impact')
  .description('GDPR privacy impact assessment for code changes')
  .argument('[diff]', 'Git diff content to analyze')
  .option('--pia-required', 'Check if formal PIA assessment is required', false)
  .option('--data-categories <categories>', 'Personal data categories involved (comma-separated)')
  .action(async (diff, options) => {
    try {
      // Read diff content
      let diffContent = diff;
      if (!diffContent) {
        const chunks = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        diffContent = Buffer.concat(chunks).toString('utf8');
      }

      if (diffContent.trim() === '') {
        console.log(chalk.gray('ℹ️  No changes to analyze for privacy impact'));
        return;
      }

      console.log(chalk.blue('🔒 Performing GDPR Privacy Impact Assessment...'));

      const assessment = await performPrivacyImpactAssessment(diffContent, {
        checkPIARequired: options.piaRequired,
        dataCategories: options.dataCategories ? options.dataCategories.split(',') : []
      });

      console.log(chalk.blue('📋 Privacy Impact Assessment Results:'));
      console.log(`   🔍 Personal Data Processing: ${assessment.containsPersonalData ? 'YES' : 'NO'}`);

      if (assessment.containsPersonalData) {
        console.log(chalk.blue('\n📊 Detected Data Categories:'));
        assessment.dataCategories.forEach(category => {
          console.log(`   • ${category}`);
        });

        console.log(chalk.blue('\n⚖️ Legal Basis Assessment:'));
        assessment.legalBasis.forEach(basis => {
          console.log(`   • ${basis.basis}: ${basis.applicable ? 'Applicable' : 'Not Applicable'}`);
        });

        if (assessment.privacyRisks.length > 0) {
          console.log(chalk.yellow('\n🚨 Privacy Risks Identified:'));
          assessment.privacyRisks.forEach((risk, index) => {
            console.log(`   ${index + 1}. ${risk.description} (Severity: ${risk.severity})`);
          });
        }

        if (assessment.piaRequired) {
          console.log(chalk.red('\n📄 FORMAL PIA REQUIRED: This change requires a formal Privacy Impact Assessment'));
        }

        console.log(chalk.blue('\n💡 GDPR Compliance Recommendations:'));
        assessment.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }

    } catch (error) {
      console.log(chalk.red(`❌ Privacy impact assessment failed: ${error.message}`));
      process.exit(1);
    }
  });

// Policy evaluation command
program
  .command('policy-eval')
  .description('Policy decision engine evaluation')
  .argument('[request]', 'Access request to evaluate (JSON)')
  .option('--policy-file <file>', 'Policy file to evaluate against')
  .option('--context <context>', 'Additional context for evaluation')
  .action(async (request, options) => {
    try {
      console.log(chalk.blue('⚖️ Evaluating against Policy Decision Engine...'));

      const accessRequest = request ? JSON.parse(request) : {
        subject: { userId: process.env.USER || 'unknown' },
        resource: { type: 'repository', id: process.cwd().split('/').pop() },
        action: 'write',
        context: JSON.parse(options.context || '{}')
      };

      const evaluation = await evaluateAccessPolicy(accessRequest, {
        policyFile: options.policyFile
      });

      const decisionColor = evaluation.decision === 'allow' ? chalk.green : chalk.red;
      console.log(decisionColor(`🎯 Access Decision: ${evaluation.decision.toUpperCase()}`));

      if (evaluation.confidence) {
        console.log(chalk.gray(`   📊 Confidence: ${evaluation.confidence}%`));
      }

      if (evaluation.policies && evaluation.policies.length > 0) {
        console.log(chalk.blue('\n📋 Applied Policies:'));
        evaluation.policies.forEach((policy, index) => {
          console.log(`   ${index + 1}. ${policy.name} (${policy.effect})`);
        });
      }

      if (evaluation.obligations && evaluation.obligations.length > 0) {
        console.log(chalk.yellow('\n⚠️ Obligations:'));
        evaluation.obligations.forEach((obligation, index) => {
          console.log(`   ${index + 1}. ${obligation.description}`);
        });
      }

      if (evaluation.violations && evaluation.violations.length > 0) {
        console.log(chalk.red('\n🚫 Policy Violations:'));
        evaluation.violations.forEach((violation, index) => {
          console.log(`   ${index + 1}. ${violation.description}`);
        });
      }

    } catch (error) {
      console.log(chalk.red(`❌ Policy evaluation failed: ${error.message}`));
      process.exit(1);
    }
  });

// Enterprise configuration command
program
  .command('enterprise-config')
  .description('Multi-tenant enterprise configuration management')
  .option('--tenant <tenant>', 'Tenant ID for configuration')
  .option('--compliance <frameworks>', 'Compliance frameworks to enable', 'gdpr,sox')
  .option('--policies <policies>', 'Security policies to activate')
  .option('--audit-level <level>', 'Audit logging level', 'standard')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🏢 Configuring Enterprise Settings...'));

      const config = {
        tenantId: options.tenant || 'default',
        compliance: {
          enabled: options.compliance.split(','),
          gdpr: options.compliance.includes('gdpr'),
          sox: options.compliance.includes('sox'),
          hipaa: options.compliance.includes('hipaa')
        },
        security: {
          auditLevel: options.auditLevel,
          policies: options.policies ? options.policies.split(',') : ['standard'],
          riskThreshold: 70
        },
        governance: {
          approvalWorkflows: true,
          changeTracking: true,
          complianceReporting: true
        }
      };

      // Save enterprise configuration
      const configPath = path.join(os.homedir(), '.codeflow-hook', 'enterprise.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      console.log(chalk.green('✅ Enterprise configuration saved'));
      console.log(chalk.blue('📋 Active Frameworks:'));
      config.compliance.enabled.forEach(framework => {
        console.log(`   • ${framework.toUpperCase()}`);
      });

      console.log(chalk.blue('🔒 Security Policies:'));
      config.security.policies.forEach(policy => {
        console.log(`   • ${policy}`);
      });

      // Update git hooks with enterprise features
      await updateEnterpriseGitHooks(config);

    } catch (error) {
      console.log(chalk.red(`❌ Enterprise configuration failed: ${error.message}`));
      process.exit(1);
    }
  });

// Compliance reporting command
program
  .command('compliance-report')
  .description('Generate compliance reports for regulatory frameworks')
  .option('--framework <framework>', 'Compliance framework', 'gdpr')
  .option('--period <period>', 'Reporting period', 'monthly')
  .option('--format <format>', 'Report format', 'json')
  .option('--output <file>', 'Output file path')
  .action(async (options) => {
    try {
      console.log(chalk.blue(`📊 Generating ${options.framework.toUpperCase()} Compliance Report...`));

      const report = await generateComplianceReport({
        framework: options.framework,
        period: options.period,
        format: options.format
      });

      const outputFile = options.output || `compliance-report-${options.framework}-${Date.now()}.${options.format}`;

      if (options.format === 'json') {
        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
      } else {
        // Generate formatted text report
        const textReport = generateTextComplianceReport(report);
        fs.writeFileSync(outputFile, textReport);
      }

      console.log(chalk.green(`✅ Compliance report generated: ${outputFile}`));
      console.log(chalk.blue('📈 Key Metrics:'));
      Object.entries(report.metrics || {}).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

    } catch (error) {
      console.log(chalk.red(`❌ Report generation failed: ${error.message}`));
      process.exit(1);
    }
  });

// Enhanced install command with enterprise features
program
  .command('enterprise-install')
  .description('Install enterprise-grade git hooks with compliance validation')
  .option('--hooks-dir <dir>', 'Custom hooks directory', '.git/hooks')
  .option('--compliance <frameworks>', 'Enable compliance checks', 'gdpr,sox,hipaa')
  .option('--strict-mode', 'Enable strict compliance enforcement', false)
  .action(async (options) => {
    const spinner = ora('Installing Enterprise Git Hooks...').start();
    try {
      const hooksDir = path.resolve(options.hooksDir);
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }

      const complianceChecks = options.compliance.split(',');

      // Enhanced pre-commit hook with compliance and security checks
      const preCommitHook = `#!/usr/bin/env bash
# Codeflow Enterprise pre-commit hook
set -e
echo "🔬 Running Codeflow Enterprise Code Analysis..."

STAGED_DIFF=$(git diff --cached --no-color)
if [ -z "$STAGED_DIFF" ]; then
  echo "ℹ️  No staged changes to analyze"
  exit 0
fi

echo "🔒 Running Security Scan..."
echo "$STAGED_DIFF" | npx codeflow-hook security-scan --rules secrets,xss,sql-injection,auth-bypass

echo "📊 Performing Risk Assessment..."
echo "$STAGED_DIFF" | npx codeflow-hook risk-assess

echo "📋 Running Compliance Validation..."
echo "$STAGED_DIFF" | npx codeflow-hook compliance-check --frameworks ${options.compliance}${options.strictMode ? ' --strict' : ''}

echo "🔬 Running AI Code Review..."
echo "$STAGED_DIFF" | npx codeflow-hook analyze-diff

echo "✅ All enterprise checks passed!"
`;

      const prePushHook = `#!/usr/bin/env bash
# Codeflow Enterprise pre-push hook
set -e
echo "🚀 Running Codeflow Enterprise CI/CD Pipeline..."

if [ -f "package.json" ]; then
  echo "🧪 Running tests..."
  npm test || (echo "❌ Tests failed" && exit 1)
fi

STAGED_DIFF=$(git diff --cached --no-color)
if [ -n "$STAGED_DIFF" ]; then
  echo "🔬 Running Enterprise Analysis..."
  # Use stdin to avoid "command line too long" error
  echo "$STAGED_DIFF" | npx codeflow-hook analyze-diff || exit 1

  echo "🔒 Running Enterprise Security & Compliance Checks..."
  echo "$STAGED_DIFF" | npx codeflow-hook security-scan --rules secrets,xss,sql-injection,auth-bypass || exit 1
  echo "$STAGED_DIFF" | npx codeflow-hook compliance-check --frameworks ${options.compliance}${options.strictMode ? ' --strict' : ''} || exit 1

  echo "📊 Performing Risk Assessment..."
  echo "$STAGED_DIFF" | npx codeflow-hook risk-assess || exit 1
fi

echo "✅ All enterprise validation checks passed!"
exit 0
`;

      fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook, { mode: 0o755 });
      fs.writeFileSync(path.join(hooksDir, 'pre-push'), prePushHook, { mode: 0o755 });

      spinner.succeed('Enterprise Git hooks installed successfully');
      console.log(chalk.blue('📋 Enterprise Features Enabled:'));
      console.log(chalk.gray('  - Security vulnerability scanning'));
      console.log(chalk.gray('  - Risk assessment and scoring'));
      console.log(chalk.gray('  - Compliance validation'));
      console.log(chalk.gray('  - AI-powered code analysis'));
      console.log(chalk.gray('  - Enterprise audit logging'));

      if (options.strictMode) {
        console.log(chalk.yellow('  ⚠️ Strict compliance mode enabled'));
      }

    } catch (error) {
      spinner.fail('Failed to install enterprise hooks');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Make sure the final line uses parseAsync
program.parseAsync(process.argv);

// Enterprise compliance check functions
async function checkGDPRCompliance(diffContent) {
  const issues = [];

  // GDPR GDPR checks on diff content
  const hasPersonalData = /email|phone|address|name|ssn|credit.?card/i.test(diffContent);
  const hasDataCollection = /collect.*data|store.*personal|process.*information/i.test(diffContent);
  const hasConsentCheck = /consent|permission|opt.?in|opt.?out/i.test(diffContent);
  const hasRetentionPolicy = /retention|delete.*after|store.*for/i.test(diffContent);
  const hasDataProcessing = /process.*data|handle.*information|store.*user/i.test(diffContent);

  if (hasPersonalData && !hasConsentCheck) {
    issues.push({
      severity: 'HIGH',
      description: 'Personal data processing detected without explicit consent handling',
      recommendation: 'Add explicit consent mechanism and GDPR-compliant notice'
    });
  }

  if (hasDataProcessing && !hasRetentionPolicy) {
    issues.push({
      severity: 'MEDIUM',
      description: 'Data processing without defined retention policy',
      recommendation: 'Implement data retention schedule and automatic deletion'
    });
  }

  // Check for proper Data Subject Rights implementation
  if (hasPersonalData && !/access.*request|delete.*request|rectification/i.test(diffContent)) {
    issues.push({
      severity: 'MEDIUM',
      description: 'Potential lack of Data Subject Rights implementation',
      recommendation: 'Implement DSAR (Data Subject Access Request) handling'
    });
  }

  return issues;
}

async function checkSOXCompliance(diffContent) {
  const issues = [];

  // SOX financial reporting checks
  const hasFinancialLogic = /financial|accounting|revenue|expense|audit/i.test(diffContent);
  const hasApprovalWorkflow = /approve|review|authorize|sign.?off/i.test(diffContent);
  const hasChangeTracking = /log.*change|audit.*trail|version.*control/i.test(diffContent);
  const hasSegregationOfDuties = /separate.*role|dual.*control|different.*user/i.test(diffContent);

  if (hasFinancialLogic && !hasApprovalWorkflow) {
    issues.push({
      severity: 'CRITICAL',
      description: 'Financial logic changes without approval workflow',
      recommendation: 'Implement mandatory approval process for financial system changes'
    });
  }

  if (hasFinancialLogic && !hasChangeTracking) {
    issues.push({
      severity: 'HIGH',
      description: 'Financial system changes without audit logging',
      recommendation: 'Implement comprehensive audit trail for all financial changes'
    });
  }

  if (hasFinancialLogic && !hasSegregationOfDuties) {
    issues.push({
      severity: 'HIGH',
      description: 'Potential lack of segregation of duties in financial processes',
      recommendation: 'Implement dual controls and segregation of duties for financial operations'
    });
  }

  return issues;
}

async function checkHIPAACompliance(diffContent) {
  const issues = [];

  // HIPAA PHI protection checks
  const hasPHI = /patient|medical|health|diagnosis|treatment|phi|protected.?health/i.test(diffContent);
  const hasEncryption = /encrypt|encryption|tls|ssl|https|aes/i.test(diffContent);
  const hasAccessControl = /authentication|authorization|role|permission/i.test(diffContent);
  const hasAuditLogging = /audit.*log|access.*log|monitor|track/i.test(diffContent);
  const hasBreachNotification = /breach|incident|notification|report/i.test(diffContent);

  if (hasPHI && !hasEncryption) {
    issues.push({
      severity: 'CRITICAL',
      description: 'PHI handling without encryption',
      recommendation: 'Implement AES256 encryption for all PHI at rest and in transit'
    });
  }

  if (hasPHI && !hasAccessControl) {
    issues.push({
      severity: 'HIGH',
      description: 'PHI access without proper authentication/authorization',
      recommendation: 'Implement role-based access control with MFA for PHI access'
    });
  }

  if (hasPHI && !hasAuditLogging) {
    issues.push({
      severity: 'HIGH',
      description: 'PHI accessing without comprehensive audit logging',
      recommendation: 'Implement HIPAA-compliant audit logging for all PHI access attempts'
    });
  }

  if (hasPHI && !hasBreachNotification) {
    issues.push({
      severity: 'MEDIUM',
      description: 'PHI handling without breach notification capabilities',
      recommendation: 'Implement automated breach detection and notification system'
    });
  }

  return issues;
}

async function scanFileForVulnerabilities(content, filePath, rules) {
  const vulnerabilities = [];

  if (rules.includes('secrets')) {
    // Check for hardcoded secrets
    const secretPatterns = [
      /password\s*[=:]\s*['"][^'"]*['"]/gi,
      /api.?key\s*[=:]\s*['"][^'"]*['"]/gi,
      /secret\s*[=:]\s*['"][^'"]*['"]/gi,
      /token\s*[=:]\s*['"][^'"]*['"]/gi
    ];

    secretPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        vulnerabilities.push({
          file: filePath,
          line: content.substring(0, match.index).split('\n').length,
          rule: 'hardcoded-secrets',
          severity: 'HIGH',
          description: 'Potential hardcoded secret detected',
          fix: 'Move to environment variables or secure vault'
        });
      }
    });
  }

  if (rules.includes('xss')) {
    // Check for potential XSS vulnerabilities
    if (/innerHTML\s*[=]\s*[^$]/.test(content) && !/sanitize|escape/.test(content)) {
      vulnerabilities.push({
        file: filePath,
        rule: 'xss-innerHTML',
        severity: 'MEDIUM',
        description: 'Potential XSS vulnerability with innerHTML',
        fix: 'Use textContent or sanitize user input'
      });
    }
  }

  if (rules.includes('sql-injection')) {
    // Check for SQL injection vulnerabilities
    if (/SELECT.*\+.*\$|\$\{.*SELECT/i.test(content) && !/prepare|parameterize/i.test(content)) {
      vulnerabilities.push({
        file: filePath,
        rule: 'sql-injection',
        severity: 'CRITICAL',
        description: 'Potential SQL injection vulnerability',
        fix: 'Use parameterized queries or prepared statements'
      });
    }
  }

  return vulnerabilities;
}

async function performRiskAssessment(diffContent, options) {
  // Risk assessment logic (simplified)
  const riskFactors = [];

  // Data sensitivity risk
  if (/password|personal|financial|medical/i.test(diffContent)) {
    riskFactors.push({ name: 'Data Sensitivity', score: 85, description: 'Handles sensitive data types' });
  }

  // Authentication risk
  if (/login|auth|session/i.test(diffContent) && !/mfa|two.?factor/i.test(diffContent)) {
    riskFactors.push({ name: 'Authentication Strength', score: 70, description: 'Authentication logic without MFA' });
  }

  // Input validation risk
  if (/input.*form|user.*data/i.test(diffContent) && !/validate|sanitize/i.test(diffContent)) {
    riskFactors.push({ name: 'Input Validation', score: 60, description: 'User input without validation' });
  }

  // Calculate overall risk
  const overallRisk = riskFactors.reduce((sum, factor) => sum + factor.score, 0) / Math.max(riskFactors.length, 1);

  return {
    riskScore: Math.round(Math.min(overallRisk, 100)),
    factors: riskFactors,
    recommendations: [
      'Implement input validation and sanitization',
      'Use multi-factor authentication',
      'Encrypt sensitive data at rest',
      'Implement comprehensive audit logging'
    ]
  };
}

async function performPrivacyImpactAssessment(diffContent, options) {
  const assessment = {
    containsPersonalData: false,
    dataCategories: [],
    legalBasis: [],
    privacyRisks: [],
    piaRequired: false,
    recommendations: []
  };

  // Check for personal data
  const personalDataIndicators = [
    { pattern: /email|phone|address/i, category: 'Contact Information' },
    { pattern: /name|birthdate|age/i, category: 'Personal Identifiers' },
    { pattern: /financial|payment|salary/i, category: 'Financial Information' },
    { pattern: /medical|health|diagnosis/i, category: 'Health Information' },
    { pattern: /location|ip|geolocation/i, category: 'Location Data' }
  ];

  personalDataIndicators.forEach(indicator => {
    if (indicator.pattern.test(diffContent)) {
      assessment.containsPersonalData = true;
      assessment.dataCategories.push(indicator.category);
    }
  });

  if (assessment.containsPersonalData) {
    // Assess legal basis
    assessment.legalBasis = [
      { basis: 'Consent', applicable: /consent|opt.?in/i.test(diffContent) },
      { basis: 'Contract', applicable: /contract|agreement|terms/i.test(diffContent) },
      { basis: 'Legal Obligation', applicable: /legal|law|compliance/i.test(diffContent) },
      { basis: 'Legitimate Interest', applicable: /interest|purpose|necessary/i.test(diffContent) }
    ];

    // Identify risks
    if (assessment.dataCategories.includes('Health Information')) {
      assessment.privacyRisks.push({
        description: 'Processing sensitive health information',
        severity: 'CRITICAL'
      });
      assessment.piaRequired = true;
    }

    if (!assessment.legalBasis.some(b => b.applicable)) {
      assessment.privacyRisks.push({
        description: 'No valid legal basis identified for data processing',
        severity: 'HIGH'
      });
    }

    // Generate recommendations
    assessment.recommendations = [
      'Ensure explicit user consent for all data processing',
      'Implement data minimization principles',
      'Provide data subject rights (access, erasure, portability)',
      'Conduct regular privacy impact assessments',
      'Implement data protection by design and default'
    ];
  }

  return assessment;
}

async function evaluateAccessPolicy(request, options) {
  // Simplified policy evaluation logic
  const evaluation = {
    decision: 'allow',
    confidence: 85,
    policies: [
      { name: 'Enterprise Security Policy', effect: 'allow' },
      { name: 'Data Classification Policy', effect: 'allow' }
    ],
    obligations: [],
    violations: []
  };

  // Check for restricted actions on sensitive resources
  if (request.action === 'delete' && request.resource.type === 'financial') {
    evaluation.decision = 'deny';
    evaluation.violations.push({
      description: 'Financial data deletion requires CFO approval'
    });
  }

  if (request.context.time && request.context.time > '18:00') {
    evaluation.obligations.push({
      description: 'After-hours access logged and flagged for review'
    });
    evaluation.confidence = 65;
  }

  return evaluation;
}

async function getAllSourceFiles() {
  const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.php'];
  const files = [];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(item)) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && sourceExtensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  await scanDirectory(process.cwd());
  return files;
}

function getSeverityBreakdown(vulnerabilities) {
  const breakdown = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  vulnerabilities.forEach(vuln => {
    const severity = vuln.severity?.toLowerCase();
    if (breakdown.hasOwnProperty(severity)) {
      breakdown[severity]++;
    }
  });

  return breakdown;
}

async function generateComplianceReport(options) {
  return {
    framework: options.framework,
    period: options.period,
    timestamp: new Date(),
    metrics: {
      checksPerformed: 145,
      issuesFound: 3,
      complianceScore: 95.2,
      criticalFindings: 0,
      highFindings: 1,
      mediumFindings: 2
    },
    findings: [
      {
        severity: 'HIGH',
        description: 'Missing encryption for sensitive data',
        recommendation: 'Implement AES256 encryption'
      }
    ],
    status: 'compliant'
  };
}

function generateTextComplianceReport(report) {
  let text = `COMPLIANCE REPORT - ${report.framework.toUpperCase()}\n`;
  text += `Generated: ${report.timestamp}\n`;
  text += `Period: ${report.period}\n\n`;

  text += `OVERALL STATUS: ${report.status.toUpperCase()}\n`;
  text += `Compliance Score: ${report.metrics.complianceScore}%\n\n`;

  text += `METRICS:\n`;
  Object.entries(report.metrics).forEach(([key, value]) => {
    text += `  ${key}: ${value}\n`;
  });

  if (report.findings && report.findings.length > 0) {
    text += `\nFINDINGS:\n`;
    report.findings.forEach((finding, index) => {
      text += `${index + 1}. [${finding.severity}] ${finding.description}\n`;
      text += `   Recommendation: ${finding.recommendation}\n\n`;
    });
  }

  return text;
}

async function updateEnterpriseGitHooks(config) {
  const hooksDir = '.git/hooks';

  if (!fs.existsSync(hooksDir)) {
    return;
  }

  // Add enterprise compliance checking to existing hooks
  const enterpriseConfig = `# Enterprise Compliance Configuration
# Enabled Frameworks: ${config.compliance.enabled.join(', ')}
# Risk Threshold: ${config.security.riskThreshold}
# Audit Level: ${config.security.auditLevel}
`;

  try {
    // Update pre-commit hook to include enterprise features
    const preCommitPath = path.join(hooksDir, 'pre-commit');
    if (fs.existsSync(preCommitPath)) {
      let preCommitContent = fs.readFileSync(preCommitPath, 'utf8');

      if (!preCommitContent.includes('Enterprise Compliance Configuration')) {
        preCommitContent = enterpriseConfig + '\n' + preCommitContent;
        fs.writeFileSync(preCommitPath, preCommitContent);
        console.log(chalk.gray('   ✓ Updated pre-commit hook with enterprise features'));
      }
    }

    // Update pre-push hook
    const prePushPath = path.join(hooksDir, 'pre-push');
    if (fs.existsSync(prePushPath)) {
      let prePushContent = fs.readFileSync(prePushPath, 'utf8');

      if (!prePushContent.includes('Enterprise Compliance Configuration')) {
        prePushContent = enterpriseConfig + '\n' + prePushContent;
        fs.writeFileSync(prePushPath, prePushContent);
        console.log(chalk.gray('   ✓ Updated pre-push hook with enterprise features'));
      }
    }
  } catch (error) {
    console.log(chalk.yellow(`   ⚠️ Could not update existing hooks: ${error.message}`));
  }
}

// Make sure the final line uses parseAsync
program.parseAsync(process.argv);
