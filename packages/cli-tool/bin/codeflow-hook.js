#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os'; // Make sure os is imported
import readline from 'readline';
import { execFileSync, spawn } from 'child_process';

// Export for use in agents module
export { callAIProvider };

const program = new Command();

program
  .name('codeflow-hook')
  .description('Local AI-powered code analysis and git hook management')
  .version('2.3.1');

// Configure AI provider settings
program
  .command('config')
  .description('Configure AI provider settings (gemini, openai, claude, ollama)')
  .option('-p, --provider <provider>', 'AI provider (gemini, openai, claude, ollama)', 'gemini')
  .option('-k, --key <key>', 'API key for cloud providers (not needed for ollama)')
  .option('-u, --url <url>', 'Custom API URL (for ollama: http://localhost:11434)')
  .option('-m, --model <model>', 'AI model name (for ollama: auto-discovered if not specified)')
  .option('--ollama-enable', 'Enable Ollama as the primary provider')
  .option('--ollama-disable', 'Disable Ollama and use cloud provider instead')
  .option('--ollama-url <url>', 'Ollama server URL (default: http://localhost:11434)')
  .option('--list-models', 'List available Ollama models and exit')
  .action(async (options) => {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configDir = path.join(homeDir, '.codeflow-hook');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, 'config.json');
    const existingConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

    // List Ollama models mode
    if (options.listModels) {
      const ollamaUrl = options.ollamaUrl || existingConfig.ollama?.url || 'http://localhost:11434';
      console.log(chalk.blue(`🔍 Fetching models from Ollama at ${ollamaUrl}...`));
      try {
        const { listOllamaModels, isOllamaRunning } = await import('../lib/ai-reviewer.cjs');
        const running = await isOllamaRunning(ollamaUrl);
        if (!running) {
          console.log(chalk.red('❌ Ollama is not running or not reachable'));
          console.log(chalk.yellow(`💡 Start Ollama: ollama serve`));
          process.exit(1);
        }
        const models = await listOllamaModels(ollamaUrl);
        if (models.length === 0) {
          console.log(chalk.yellow('⚠️  No models found. Pull a model first:'));
          console.log(chalk.gray('   ollama pull qwen2.5-coder'));
          console.log(chalk.gray('   ollama pull deepseek-coder'));
          console.log(chalk.gray('   ollama pull codellama'));
        } else {
          console.log(chalk.green(`✅ Found ${models.length} model(s):`));
          models.forEach((m, i) => console.log(chalk.gray(`  ${i + 1}. ${m}`)));
        }
        process.exit(0);
      } catch (error) {
        console.log(chalk.red(`❌ Failed to connect to Ollama: ${error.message}`));
        process.exit(1);
      }
    }

    const requestedProvider = (options.provider || existingConfig.provider || 'gemini').toLowerCase();
    const ollamaEnabled = options.ollamaEnable === true ||
      (options.ollamaEnable === undefined && options.ollamaDisable === undefined && existingConfig.ollama?.enabled === true) ||
      requestedProvider === 'ollama';

    // Initialize config structure
    const config = {
      provider: requestedProvider === 'ollama' ? 'ollama' : (existingConfig.provider || 'gemini'),
      apiKey: options.key || existingConfig.apiKey,
      apiUrl: options.url || existingConfig.apiUrl,
      model: options.model || existingConfig.model,
      ollama: {
        enabled: ollamaEnabled,
        url: options.ollamaUrl || existingConfig.ollama?.url || 'http://localhost:11434'
      }
    };

    // If Ollama is the primary provider, discover models
    if (config.ollama.enabled) {
      console.log(chalk.blue('🦙 Ollama provider detected'));
      console.log(chalk.gray(`   URL: ${config.ollama.url}`));

      try {
        const { listOllamaModels, isOllamaRunning } = await import('../lib/ai-reviewer.cjs');
        const running = await isOllamaRunning(config.ollama.url);

        if (!running) {
          console.log(chalk.yellow('⚠️  Ollama is not running or not reachable'));
          console.log(chalk.yellow('   Models will not be auto-discovered'));
          if (!config.model) {
            console.log(chalk.gray('   Using default model: qwen2.5-coder'));
            config.model = 'qwen2.5-coder';
          }
        } else {
          const models = await listOllamaModels(config.ollama.url);
          if (models.length === 0) {
            console.log(chalk.yellow('⚠️  No Ollama models found'));
            console.log(chalk.gray('   Pull a model: ollama pull qwen2.5-coder'));
            if (!config.model) {
              config.model = 'qwen2.5-coder';
            }
          } else {
            console.log(chalk.green(`✅ Found ${models.length} model(s):`));
            models.forEach((m, i) => console.log(chalk.gray(`  ${i + 1}. ${m}`)));

            // Auto-select or prompt
            if (!options.model) {
              const defaultModel = models.find(m => m.includes('coder') || m.includes('code')) || models[0];
              console.log(chalk.blue(`\n💡 Recommended: ${defaultModel}`));

              const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
              });

              const input = await new Promise(resolve => {
                rl.question(chalk.blue(`Select model (name or number, Enter for ${defaultModel}): `), (answer) => {
                  rl.close();
                  resolve(answer.trim());
                });
              });

              if (input === '') {
                config.model = defaultModel;
              } else {
                const idx = parseInt(input) - 1;
                config.model = (!isNaN(idx) && idx >= 0 && idx < models.length) ? models[idx] : input;
              }
              console.log(chalk.green(`✓ Selected: ${config.model}`));
            }
          }
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not connect to Ollama: ${error.message}`));
        if (!config.model) {
          config.model = 'qwen2.5-coder';
        }
      }
    } else if (options.key || !existingConfig.apiKey) {
      // Cloud provider setup with API key validation
      const hasNewKey = !!options.key;
      const isFirstTime = !existingConfig.provider && !existingConfig.apiKey;
      const shouldValidate = hasNewKey || isFirstTime;

      if (shouldValidate && config.apiKey) {
        console.log(chalk.blue(`🔐 Validating API key for ${config.provider}...`));
        try {
          await validateApiKey(config.provider, config.apiKey);
          console.log(chalk.green('✅ API key validated'));
        } catch (error) {
          console.log(chalk.red(`❌ ${error.message}`));
          process.exit(1);
        }
      }

      // Set default API URL for cloud providers
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
            config.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
            break;
        }
      }

      // Interactive model selection for cloud providers
      if (!options.model) {
        const shouldFetch = !existingConfig.model || existingConfig.provider !== config.provider || hasNewKey;
        if (shouldFetch) {
          console.log(chalk.blue('🔍 Fetching available models...'));
          try {
            const models = await fetchModels(config.provider, config.apiKey);
            console.log(chalk.blue('Available models:'));
            models.forEach((m, i) => console.log(chalk.gray(`  ${i + 1}. ${m}`)));

            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            const input = await new Promise(resolve => {
              rl.question(chalk.blue('Enter model name or number: '), (a) => { rl.close(); resolve(a.trim()); });
            });
            const idx = parseInt(input) - 1;
            config.model = (!isNaN(idx) && idx >= 0 && idx < models.length) ? models[idx] : input;
          } catch {
            const fallbacks = getFallbackModels(config.provider);
            fallbacks.forEach((m, i) => console.log(chalk.gray(`  ${i + 1}. ${m}`)));
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            const input = await new Promise(resolve => {
              rl.question(chalk.blue('Select model: '), (a) => { rl.close(); resolve(a.trim()); });
            });
            const idx = parseInt(input) - 1;
            config.model = (!isNaN(idx) && idx >= 0 && idx < fallbacks.length) ? fallbacks[idx] : input;
          }
        }
      }
    }

    // Save config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green('\n✅ Configuration saved'));
    console.log(chalk.gray(`   Provider: ${config.provider}`));
    console.log(chalk.gray(`   Model: ${config.model}`));
    console.log(chalk.gray(`   Ollama: ${config.ollama.enabled ? 'enabled (' + config.ollama.url + ')' : 'disabled'}`));
    if (config.apiKey) {
      console.log(chalk.gray(`   API Key: ${config.apiKey.substring(0, 8)}...`));
    }
  });

// Index repository locally.
program
  .command('index')
  .description('Build a local project file index')
  .option('-d, --dry-run', 'Show what would be indexed without actually indexing')
  .action(async (options) => {
    try {
      const spinner = ora('Indexing project files...').start();

      const result = indexLocalProject(process.cwd(), options.dryRun || false);

      spinner.succeed(options.dryRun ? 'Project scan completed' : 'Local project index written');
      console.log(chalk.green(`✅ ${result.message}`));

      if (result.stats) {
        console.log(chalk.gray(`📊 Stats: ${JSON.stringify(result.stats, null, 2)}`));
      }

      if (!options.dryRun) {
        console.log(chalk.cyan(`Local index: ${result.indexPath}`));
      }

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

      const preCommitHook = `#!/usr/bin/env bash
# Codeflow pre-commit hook
set -e
echo "Running Codeflow AI Code Analysis..."
STAGED_DIFF=$(git diff --cached --no-color)
if [ -z "$STAGED_DIFF" ]; then
  echo "No staged changes to analyze"
  exit 0
fi
echo "$STAGED_DIFF" | npx codeflow-hook analyze-diff
`;

      fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook, { mode: 0o755 });

      const prePushHook = `#!/usr/bin/env bash
# Codeflow pre-push hook
set -e
REMOTE_NAME="$1"
REMOTE_URL="$2"

echo "Running Codeflow CI/CD simulation..."
if [ -f "package.json" ]; then
  npx codeflow-hook simulate fast-dev || exit 1
fi

echo "Running Codeflow pre-push review..."
npx codeflow-hook pre-push-review "$REMOTE_NAME" "$REMOTE_URL"

echo "All checks passed!"
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

// Analyze diff with AI review + heuristic fallback
program
  .command('analyze-diff')
  .description('Analyze git diff with AI code review and heuristic fallback')
  .argument('[diff]', 'Git diff content')
  .option('--min-score <score>', 'Minimum score to pass (1-10, default: 3)', '3')
  .option('--json', 'Output results as JSON only')
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

      // Guard against huge diffs
      if (diffContent.length > 20000) {
        console.log(chalk.yellow('⚠️  Diff too large for AI review (>20KB), using heuristic'));
      }

      const minScore = parseInt(options.minScore, 10);
      const { runAgentReview } = await import('../lib/agents/orchestrator.cjs');

      const result = await runAgentReview(diffContent, { minScore });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const icon = result.success ? '✅' : '❌';
        const color = result.success ? chalk.green : chalk.red;
        const providerLabel = result.provider === 'ollama' ? '🦙 Ollama' :
          result.provider === 'heuristic' ? '🔍 Heuristic' :
          result.provider === 'gemini' ? '💎 Gemini' :
          result.provider === 'openai' ? '🔵 OpenAI' :
          result.provider === 'claude' ? '🟣 Claude' : result.provider;
        console.log(color(`${icon} ${result.message}`));
        console.log(chalk.gray(`   Provider: ${providerLabel}${result.usedFallback ? ' (fallback)' : ''}`));

        if (result.result.score) {
          console.log(chalk.blue(`📊 Score: ${result.result.score}/10 (threshold: ${minScore}/10)`));
        }
        if (result.result.summary) {
          console.log(chalk.gray(`📝 ${result.result.summary}`));
        }
        if (result.result.files && result.result.files.length > 0) {
          for (const file of result.result.files) {
            if (file.issues && file.issues.length > 0) {
              console.log(chalk.yellow(`\n📁 ${file.fileName}:`));
              for (const issue of file.issues) {
                console.log(chalk.red(`   - [${issue.type}] ${issue.description}`));
              }
            }
          }
        }
      }

      if (!result.success) {
        process.exit(1);
      }

    } catch (error) {
      console.log(chalk.red(`❌ Analysis error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('pre-push-review')
  .description('Review the exact commit ranges Git is about to push')
  .argument('[remoteName]', 'Git remote name', 'origin')
  .argument('[remoteUrl]', 'Git remote URL')
  .option('--min-score <score>', 'Minimum score to pass (1-10, default: 3)', '3')
  .option('--json', 'Output results as JSON only')
  .action(async (remoteName, _remoteUrl, options) => {
    try {
      const prePushInput = await readStdinText();
      const ranges = resolvePrePushRanges(prePushInput, remoteName || 'origin');
      if (ranges.length === 0) {
        if (!options.json) {
          console.log(chalk.gray('No push updates to analyze'));
        }
        return;
      }

      const diffContent = gatherPrePushDiff(ranges);
      if (diffContent.trim() === '') {
        if (!options.json) {
          console.log(chalk.gray('No pushed diff to analyze'));
        }
        return;
      }

      const { runAgentReview } = await import('../lib/agents/orchestrator.cjs');
      const result = await runAgentReview(diffContent, { minScore: parseInt(options.minScore, 10) });

      if (options.json) {
        console.log(JSON.stringify({ ranges, ...result }, null, 2));
      } else {
        console.log(chalk.gray(`Analyzed ${ranges.length} pushed ref update(s)`));
        console.log(result.success ? chalk.green(result.message) : chalk.red(result.message));
      }

      if (!options.json) {
        displayAgentResults(result.result.agentResults || []);
      }

      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      console.log(chalk.red(`Pre-push review failed: ${error.message}`));
      process.exit(1);
    }
  });

const agents = program
  .command('agents')
  .description('Run and inspect local review agents');

agents
  .command('list')
  .description('List enabled local agents')
  .action(async () => {
    const { listAgents } = await import('../lib/agents/orchestrator.cjs');
    const enabledAgents = listAgents();
    enabledAgents.forEach((agent) => {
      const mode = agent.blocking ? 'blocking' : 'advisory';
      console.log(`${agent.id} (${mode}) - ${agent.description}`);
    });
  });

agents
  .command('doctor')
  .description('Check local agent orchestration readiness')
  .action(async () => {
    const { doctor } = await import('../lib/agents/orchestrator.cjs');
    const report = doctor();
    report.checks.forEach((check) => {
      const label = check.ok ? chalk.green('PASS') : check.warning ? chalk.yellow('WARN') : chalk.red('FAIL');
      console.log(`${label} ${check.name}${check.ok ? '' : ` - ${check.warning || 'Required check failed'}`}`);
    });

    if (!report.ok) {
      process.exit(1);
    }
  });

agents
  .command('run')
  .description('Run local agents against a git diff')
  .argument('[diff]', 'Git diff content')
  .option('--min-score <score>', 'Minimum score to pass (1-10, default: 3)', '3')
  .option('--json', 'Output results as JSON only')
  .action(async (diff, options) => {
    let diffContent = diff;
    if (!diffContent) {
      diffContent = await readStdinText();
    }

    if (diffContent.trim() === '') {
      console.log(chalk.gray('No changes to analyze'));
      return;
    }

    const { runAgentReview } = await import('../lib/agents/orchestrator.cjs');
    const result = await runAgentReview(diffContent, { minScore: parseInt(options.minScore, 10) });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.success ? chalk.green(result.message) : chalk.red(result.message));
      displayAgentResults(result.result.agentResults || []);
    }

    if (!result.success) {
      process.exit(1);
    }
  });

const history = program
  .command('history')
  .description('Inspect local Codeflow review history');

history
  .command('list')
  .description('List recent local review runs')
  .option('-n, --limit <count>', 'Number of runs to show', '10')
  .action(async (options) => {
    const { listReviewRuns } = await import('../lib/profile/history-store.cjs');
    const runs = listReviewRuns(process.cwd(), parseInt(options.limit, 10));
    if (runs.length === 0) {
      console.log(chalk.gray('No Codeflow history yet'));
      return;
    }

    for (const run of runs) {
      const color = run.success ? chalk.green : chalk.red;
      console.log(color(`${run.id} ${run.status || 'unknown'} score=${run.score ?? 'n/a'} branch=${run.branch || 'unknown'} ${run.timestamp}`));
    }
  });

history
  .command('show')
  .description('Show a local review run')
  .argument('[id]', 'Run id or latest', 'latest')
  .option('--json', 'Output JSON')
  .action(async (id, options) => {
    const { readRun } = await import('../lib/profile/history-store.cjs');
    const run = readRun(process.cwd(), id);
    if (!run) {
      console.log(chalk.red(`History run not found: ${id}`));
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(run, null, 2));
      return;
    }

    displayHistoryRun(run);
  });

history
  .command('clear')
  .description('Delete local Codeflow review history')
  .action(async () => {
    const { clearHistory } = await import('../lib/profile/history-store.cjs');
    clearHistory(process.cwd());
    console.log(chalk.green('Codeflow history cleared'));
  });

const profile = program
  .command('profile')
  .description('Show developer push profile and coaching tips');

profile
  .command('summary')
  .description('Show developer push profile summary')
  .option('--json', 'Output JSON')
  .action(async (options) => {
    const { buildDeveloperProfile } = await import('../lib/profile/profile-builder.cjs');
    const summary = buildDeveloperProfile(process.cwd());
    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }
    displayProfileSummary(summary);
  });

profile
  .command('tips')
  .description('Show personalized code review tips')
  .option('--json', 'Output JSON')
  .action(async (options) => {
    const { buildCoachingTips } = await import('../lib/profile/coaching-engine.cjs');
    const tips = buildCoachingTips(process.cwd());
    if (options.json) {
      console.log(JSON.stringify(tips, null, 2));
      return;
    }
    displayCoachingTips(tips);
  });

// Run pipeline simulation (Enhanced Frontend Integration)
program
  .command('simulate')
  .description('Run configurable CI/CD pipeline simulation')
  .argument('[template]', 'Pipeline template ID (nodejs-basic, fast-dev)')
  .option('-c, --config <file>', 'Custom pipeline configuration JSON file')
  .option('-o, --output <file>', 'Output results to JSON file')
  .option('-m, --mode <mode>', 'Simulation mode (REALISTIC, FAST, DETERMINISTIC, CHAOTIC)', 'REALISTIC')
  .option('--commit-message <message>', 'Custom commit message for simulation')
  .option('--json', 'Output results as JSON only')
  .action(async (template, options) => {
    try {
      let pipelineConfig;

      // Load configuration from file or template
      if (options.config) {
        if (!options.json) {
          console.log(chalk.blue(`📄 Loading pipeline config from: ${options.config}`));
        }
        const fs = await import('fs/promises');
        const configData = await fs.readFile(options.config, 'utf8');
        pipelineConfig = JSON.parse(configData);
      } else {
        const templateId = template || 'nodejs-basic';
        if (!options.json) {
          console.log(chalk.blue(`🎯 Using pipeline template: ${templateId}`));
        }

        pipelineConfig = getPipelineTemplate(templateId);

        if (!pipelineConfig) {
          console.log(chalk.red(`❌ Unknown pipeline template: ${templateId}`));
          console.log(chalk.gray('Available templates:'));
          const templates = getAvailablePipelineTemplates();
          templates.forEach(t => {
            console.log(chalk.gray(`  • ${t.id}: ${t.description}`));
          });
          process.exit(1);
        }
      }

      // Apply customizations
      if (options.mode) {
        pipelineConfig.settings.mode = options.mode.toUpperCase();
      }

      if (options.commitMessage) {
        pipelineConfig.environment = {
          ...pipelineConfig.environment,
          COMMIT_MESSAGE: options.commitMessage
        };
      }

      if (options.json) {
        pipelineConfig.settings.streamOutput = false;
      }

      if (!options.json) {
        console.log(chalk.blue(`🚀 Starting pipeline simulation: ${pipelineConfig.name}`));
        console.log(chalk.gray(`   Mode: ${pipelineConfig.settings.mode}`));
        console.log(chalk.gray(`   Stages: ${pipelineConfig.stages.length}`));
      }

      const spinner = options.json ? null : ora('Running pipeline simulation...').start();

      const result = await runLocalPipelineSimulation(pipelineConfig);

      if (spinner) {
        spinner.succeed('Simulation completed');
      }

      // Display results
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displaySimulationResults(result);
      }

      // Save to file if requested
      if (options.output) {
        const fs = await import('fs/promises');
        await fs.writeFile(options.output, JSON.stringify(result, null, 2), 'utf8');
        console.log(chalk.green(`💾 Results saved to: ${options.output}`));
      }

      // Exit with appropriate code
      process.exit(result.status === 'success' ? 0 : 1);

    } catch (error) {
      console.log(chalk.red(`❌ Simulation failed: ${error.message}`));
      process.exit(1);
    }
  });

// Show status
program
  .command('status')
  .description('Show installation and configuration status')
  .action(async () => {
    console.log(chalk.blue('🔍 Codeflow Hook Status'));
    console.log();

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
      const config = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
      console.log(chalk.green('✅ Global Configuration: Found'));
      console.log(chalk.gray(`   Provider: ${config.provider || 'gemini'}`));
      console.log(chalk.gray(`   Model: ${config.model || '(not set)'}`));
      if (config.ollama?.enabled) {
        console.log(chalk.green(`   Ollama: enabled (${config.ollama.url || 'http://localhost:11434'})`));
        try {
          const { isOllamaRunning } = await import('../lib/ai-reviewer.cjs');
          const running = await isOllamaRunning(config.ollama.url);
          console.log(running ? chalk.green('   Ollama Status: running') : chalk.yellow('   Ollama Status: not running'));
        } catch {
          console.log(chalk.yellow('   Ollama Status: unknown'));
        }
      } else {
        console.log(chalk.gray('   Ollama: disabled'));
      }
      if (config.apiKey) {
        console.log(chalk.gray(`   API Key: ${config.apiKey.substring(0, 8)}...`));
      }
    } else {
      console.log(chalk.red('❌ Global Configuration: Not found (run: codeflow-hook config)'));
    }

    if (!hasGlobalConfig && !hasProjectConfig) {
      console.log(chalk.red('❌ No configuration found. Run: codeflow-hook config'));
      console.log(chalk.gray('   Cloud: codeflow-hook config -k <api-key> -p gemini'));
      console.log(chalk.gray('   Local:  codeflow-hook config --ollama-enable'));
    }

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
    console.log(chalk.gray('   • Use --ollama-enable for local AI (no API key needed)'));
    console.log(chalk.gray('   • List Ollama models: codeflow-hook config --list-models'));
    console.log(chalk.gray('   • Large diffs (>20KB) use heuristic fallback'));
  });


async function validateApiKey(provider, apiKey) {
  console.log(`DEBUG: validateApiKey called for provider: ${provider}`);
  if (!apiKey) {
    throw new Error('No API key provided');
  }

  try {
    console.log(`DEBUG: Making API call for ${provider} validation...`);
    switch (provider) {
      case 'gemini':
        // Test Gemini API key by making a simple models list request
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        console.log(`DEBUG: Gemini URL: ${geminiUrl.substring(0, 80)}...`);
        await axios.get(geminiUrl);
        console.log(`DEBUG: Gemini API call succeeded`);
        break;
      case 'openai':
        const openaiUrl = 'https://api.openai.com/v1/models';
        console.log(`DEBUG: OpenAI URL: ${openaiUrl} with Bearer token`);
        await axios.get(openaiUrl, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log(`DEBUG: OpenAI API call succeeded`);
        break;
      case 'claude':
        // Test Claude API key with a minimal request (Anthropic doesn't have models endpoint, so we use a very basic check)
        console.log(`DEBUG: Claude validation call`);
        try {
          await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Test' }]
          }, {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            }
          });
        } catch (claudeError) {
          console.log(`DEBUG: Claude error status: ${claudeError.response?.status}`);
          if (claudeError.response?.status === 401) {
            throw new Error('Invalid Claude API key');
          }
          // If it's a different error (like rate limit), we'll allow it through
        }
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.log(`DEBUG: Validation failed with error: ${error.message}`);
    console.log(`DEBUG: Error response status: ${error.response?.status}`);
    if (error.response?.status === 401) {
      throw new Error(`Invalid ${provider} API key`);
    } else if (error.response?.status === 403) {
      throw new Error(`API key lacks permissions for ${provider}`);
    } else if (error.response?.status === 429) {
      throw new Error(`API rate limit exceeded. Please try again later.`);
    } else {
      throw new Error(`${provider} API is currently unavailable: ${error.message}`);
    }
  }
}

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

function readCodeflowHookConfig() {
  const configPath = path.join(os.homedir(), '.codeflow-hook', 'config.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid Codeflow config at ${configPath}: ${error.message}`);
  }
}

async function readStdinText() {
  if (process.stdin.isTTY) {
    return '';
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function resolvePrePushRanges(prePushInput, remoteName) {
  const zeroOid = /^0{40}$/;
  return prePushInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [localRef, localOid, remoteRef, remoteOid] = line.split(/\s+/);
      if (!localRef || !localOid || !remoteRef || !remoteOid || zeroOid.test(localOid)) {
        return null;
      }

      if (!zeroOid.test(remoteOid) && gitCommitExists(remoteOid)) {
        return {
          localRef,
          localOid,
          remoteRef,
          remoteOid,
          diffArgs: ['diff', '--no-color', '--find-renames', `${remoteOid}..${localOid}`]
        };
      }

      const trackingRef = resolveRemoteTrackingRef(remoteName, remoteRef);
      const baseRef = trackingRef || resolveDefaultRemoteBase(remoteName) || resolveLocalParent(localOid);
      if (baseRef) {
        return {
          localRef,
          localOid,
          remoteRef,
          remoteOid,
          diffArgs: ['diff', '--no-color', '--find-renames', `${baseRef}...${localOid}`],
          fallbackBase: baseRef
        };
      }

      const emptyTree = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
      return {
        localRef,
        localOid,
        remoteRef,
        remoteOid,
        diffArgs: ['diff', '--no-color', '--find-renames', emptyTree, localOid]
      };
    })
    .filter(Boolean);
}

function resolveRemoteTrackingRef(remoteName, remoteRef) {
  const branchPrefix = 'refs/heads/';
  if (!remoteRef?.startsWith(branchPrefix)) {
    return null;
  }

  const branchName = remoteRef.slice(branchPrefix.length);
  const trackingRef = `refs/remotes/${remoteName}/${branchName}`;
  return gitCommitExists(trackingRef) ? trackingRef : null;
}

function resolveDefaultRemoteBase(remoteName) {
  const candidates = [
    `refs/remotes/${remoteName}/HEAD`,
    `${remoteName}/main`,
    `${remoteName}/master`,
    'origin/main',
    'origin/master'
  ];

  for (const candidate of candidates) {
    try {
      execGit(['rev-parse', '--verify', candidate]);
      return candidate;
    } catch {
      // Try the next conventional base ref.
    }
  }

  return null;
}

function resolveLocalParent(localOid) {
  const parentRef = `${localOid}^`;
  return gitCommitExists(parentRef) ? parentRef : null;
}

function gitCommitExists(ref) {
  try {
    execFileSync('git', ['cat-file', '-e', `${ref}^{commit}`], {
      cwd: process.cwd(),
      stdio: ['ignore', 'ignore', 'ignore'],
      windowsHide: true
    });
    return true;
  } catch {
    return false;
  }
}

function gatherPrePushDiff(ranges) {
  return ranges.map((range) => {
    const header = [
      `diff --codeflow-pre-push ${range.remoteRef} ${range.localRef}`,
      `# remote ${range.remoteOid}`,
      `# local ${range.localOid}`
    ].join('\n');
    const diff = execGit(range.diffArgs);
    return `${header}\n${diff}`;
  }).join('\n');
}

function execGit(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true
  });
}

function indexLocalProject(rootDir, dryRun) {
  const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.turbo']);
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const stats = fs.statSync(fullPath);
      files.push({
        path: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
        size: stats.size,
        modifiedAt: stats.mtime.toISOString()
      });
    }
  }

  walk(rootDir);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const indexPath = path.join(rootDir, '.codeflow-index.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    root: rootDir,
    files,
    totalBytes
  };

  if (!dryRun) {
    fs.writeFileSync(indexPath, JSON.stringify(payload, null, 2));
  }

  return {
    ...payload,
    indexPath,
    message: dryRun ? 'Dry run completed' : 'Local project index written',
    stats: { files: files.length, totalBytes }
  };
}

function getAvailablePipelineTemplates() {
  return [
    { id: 'nodejs-basic', description: 'Install dependencies, run tests, run build' },
    { id: 'fast-dev', description: 'Run tests only' }
  ];
}

function getPipelineTemplate(templateId) {
  const templates = {
    'nodejs-basic': {
      name: 'Node.js Basic',
      settings: { mode: 'REALISTIC', execute: true },
      environment: {},
      stages: [
        { id: 'install', command: 'npm install --ignore-scripts' },
        { id: 'test', command: 'npm test' },
        { id: 'build', command: 'npm run build' }
      ]
    },
    'fast-dev': {
      name: 'Fast Dev',
      settings: { mode: 'FAST', execute: true },
      environment: {},
      stages: [
        { id: 'test', command: 'npm test' }
      ]
    }
  };

  return templates[templateId] || null;
}

async function runLocalPipelineSimulation(pipelineConfig) {
  const globalConfig = readCodeflowHookConfig();
  const startedAt = Date.now();
  const stageTimeoutMs = Number(globalConfig.simulation?.stageTimeoutMs || pipelineConfig.settings?.stageTimeoutMs || 10 * 60 * 1000);
  const shouldExecute = pipelineConfig.settings?.execute !== false;
  const stages = [];
  const logs = [];
  let stopped = false;

  for (const stage of pipelineConfig.stages) {
    if (stopped) {
      stages.push({
        id: stage.id,
        name: stage.name || stage.id,
        status: 'SKIPPED',
        duration: 0,
        command: stage.command,
        metrics: zeroResourceMetrics()
      });
      continue;
    }

    if (!shouldExecute) {
      stages.push({
        id: stage.id,
        name: stage.name || stage.id,
        status: 'SKIPPED',
        duration: 0,
        command: stage.command,
        metrics: zeroResourceMetrics()
      });
      logs.push({ level: 'info', message: `Skipped ${stage.id}; execution disabled by pipeline settings` });
      continue;
    }

    const result = await runPipelineStage(stage, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...(pipelineConfig.environment || {})
      },
      stream: pipelineConfig.settings?.streamOutput !== false,
      timeoutMs: stage.timeoutMs || stageTimeoutMs
    });

    stages.push(result);
    logs.push(...result.logs.map((message) => ({
      level: result.status === 'SUCCESS' ? 'info' : 'error',
      stage: stage.id,
      message
    })));

    if (result.status === 'FAILED' && stage.continueOnError !== true) {
      stopped = true;
    }
  }

  const totalDuration = Date.now() - startedAt;
  const successCount = stages.filter((stage) => stage.status === 'SUCCESS').length;
  const failureCount = stages.filter((stage) => stage.status === 'FAILED').length;
  const skippedCount = stages.filter((stage) => stage.status === 'SKIPPED').length;
  const completedStages = stages.filter((stage) => stage.duration > 0);
  const bottleneckStage = completedStages.reduce((max, stage) => (
    !max || stage.duration > max.duration ? stage : max
  ), null);

  return {
    status: failureCount > 0 ? 'failed' : 'success',
    executionId: `local-${Date.now()}`,
    pipelineName: pipelineConfig.name,
    stages,
    metrics: {
      totalDuration,
      totalStages: stages.length,
      stageCount: stages.length,
      successCount,
      failureCount,
      skippedCount,
      averageStageDuration: completedStages.length ? completedStages.reduce((sum, stage) => sum + stage.duration, 0) / completedStages.length : 0,
      successRate: stages.length ? Math.round((successCount / stages.length) * 100) : 100,
      bottleneckStage: bottleneckStage?.id,
      resourceUtilization: {
        avgCpu: 0,
        avgMemory: 0,
        peakCpu: 0,
        peakMemory: 0
      }
    },
    logs
  };
}

function runPipelineStage(stage, options) {
  const startedAt = Date.now();
  const command = stage.command;
  const output = [];
  const errors = [];
  const logs = [];

  if (!command || typeof command !== 'string') {
    return Promise.resolve({
      id: stage.id,
      name: stage.name || stage.id,
      status: 'FAILED',
      duration: 0,
      command,
      exitCode: null,
      metrics: zeroResourceMetrics(),
      errors: [{ message: 'Stage command must be a non-empty string' }],
      logs
    });
  }

  return new Promise((resolve) => {
    let completed = false;
    let timedOut = false;

    const child = spawn(command, {
      cwd: options.cwd,
      env: options.env,
      shell: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const finish = (status, exitCode, signal, errorMessage) => {
      if (completed) {
        return;
      }
      completed = true;
      clearTimeout(timeout);
      process.off('SIGINT', terminate);
      process.off('SIGTERM', terminate);

      if (errorMessage) {
        errors.push({ message: errorMessage });
      }

      resolve({
        id: stage.id,
        name: stage.name || stage.id,
        status,
        duration: Date.now() - startedAt,
        command,
        exitCode,
        signal,
        metrics: {
          ...zeroResourceMetrics(),
          timedOut
        },
        errors,
        logs,
        output: output.join('').slice(-12000)
      });
    };

    const terminate = () => {
      terminateChildProcess(child);
      finish('FAILED', null, 'SIGTERM', `Stage ${stage.id} was terminated`);
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      terminateChildProcess(child);
      finish('FAILED', null, 'SIGTERM', `Stage ${stage.id} timed out after ${options.timeoutMs}ms`);
    }, options.timeoutMs);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (options.stream) {
        process.stdout.write(text);
      }
      output.push(text);
      logs.push(text.trimEnd());
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      if (options.stream) {
        process.stderr.write(text);
      }
      output.push(text);
      logs.push(text.trimEnd());
    });

    child.on('error', (error) => {
      finish('FAILED', null, null, error.message);
    });

    child.on('close', (code, signal) => {
      if (code === 0 && !timedOut) {
        finish('SUCCESS', code, signal);
      } else if (!completed) {
        finish('FAILED', code, signal, `Command exited with ${signal ? `signal ${signal}` : `code ${code}`}`);
      }
    });

    process.once('SIGINT', terminate);
    process.once('SIGTERM', terminate);
  });
}

function terminateChildProcess(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32' && child.pid) {
    try {
      execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
      return;
    } catch {
      // Fall back to child.kill below.
    }
  }

  child.kill('SIGTERM');
}

function zeroResourceMetrics() {
  return {
    cpuUsage: 0,
    memoryUsage: 0
  };
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

function displayAgentResults(agentResults) {
  if (!agentResults.length) {
    return;
  }

  console.log(chalk.blue('Agent Results:'));
  for (const result of agentResults) {
    const color = result.status === 'fail' ? chalk.red : result.status === 'warn' ? chalk.yellow : chalk.green;
    console.log(color(`  ${result.agent}: ${result.status.toUpperCase()} (${result.score}/10)`));

    for (const finding of result.findings || []) {
      const location = finding.fileName ? `${finding.fileName}${finding.line ? `:${finding.line}` : ''}` : 'repository';
      console.log(chalk.gray(`    - ${location} ${finding.description}`));
    }
  }
}

function displayHistoryRun(run) {
  console.log(chalk.blue(`Run: ${run.id}`));
  console.log(`  Status: ${run.success ? chalk.green(run.status) : chalk.red(run.status)}`);
  console.log(`  Score: ${run.score ?? 'n/a'}/10`);
  console.log(`  Branch: ${run.branch || 'unknown'}`);
  console.log(`  Time: ${run.timestamp}`);
  if (run.summary) {
    console.log(`  Summary: ${run.summary}`);
  }
  displayAgentResults(run.agentResults || []);
}

function displayProfileSummary(summary) {
  console.log(chalk.blue('Codeflow Developer Profile'));
  console.log(`  Push Health: ${summary.pushHealth}/100`);
  console.log(`  Review Trend: ${summary.trend}`);
  console.log(`  Runs: ${summary.totalRuns} (${summary.passRate}% pass rate)`);
  console.log(`  Average Score: ${summary.averageScore}/10`);

  if (summary.mostCommonIssues.length > 0) {
    console.log(chalk.yellow('\nMost Common Issues:'));
    summary.mostCommonIssues.forEach((issue) => {
      console.log(`  - ${issue.type}: ${issue.count}`);
    });
  }

  if (summary.strengths.length > 0) {
    console.log(chalk.green('\nStrengths:'));
    summary.strengths.forEach((strength) => console.log(`  - ${strength}`));
  }

  if (summary.focusAreas.length > 0) {
    console.log(chalk.cyan('\nRecommended Focus:'));
    summary.focusAreas.forEach((area) => console.log(`  - ${area}`));
  }
}

function displayCoachingTips(tips) {
  console.log(chalk.blue('Codeflow Review Tips'));
  tips.forEach((tip, index) => {
    const color = tip.priority === 'high' ? chalk.red : tip.priority === 'medium' ? chalk.yellow : chalk.gray;
    console.log(color(`${index + 1}. ${tip.title}`));
    console.log(chalk.gray(`   ${tip.detail}`));
  });
}

// Display pipeline simulation results
function displaySimulationResults(result) {
  if (!result) {
    console.log(chalk.yellow('⚠️  No simulation results available'));
    return;
  }

  // Overall status
  const statusIcon = result.status === 'success' ? '✅' :
                    result.status === 'failed' ? '❌' :
                    result.status === 'partial' ? '⚠️' : '⏸️';
  const statusColor = result.status === 'success' ? chalk.green :
                     result.status === 'failed' ? chalk.red :
                     result.status === 'partial' ? chalk.yellow : chalk.gray;

  console.log(statusColor(`${statusIcon} Pipeline ${result.status.toUpperCase()}`));
  console.log(chalk.blue(`📋 Execution ID: ${result.executionId}`));
  console.log(chalk.gray(`⏱️  Duration: ${(result.metrics.totalDuration / 1000).toFixed(2)}s`));
  console.log();

  // Pipeline metrics
  console.log(chalk.blue('📊 Pipeline Metrics:'));
  console.log(`   📊 Stages: ${result.metrics.successCount}/${result.metrics.stageCount} passed`);
  if (result.metrics.failureCount > 0) {
    console.log(chalk.red(`   ❌ Failed: ${result.metrics.failureCount}`));
  }
  if (result.metrics.skippedCount > 0) {
    console.log(chalk.yellow(`   ⏭️  Skipped: ${result.metrics.skippedCount}`));
  }
  console.log(`   📈 Avg Stage Duration: ${(result.metrics.averageStageDuration / 1000).toFixed(2)}s`);
  if (result.metrics.bottleneckStage) {
    console.log(chalk.yellow(`   🐌 Bottleneck: ${result.metrics.bottleneckStage}`));
  }
  console.log();

  // Resource utilization
  console.log(chalk.blue('💻 Resource Utilization:'));
  console.log(`   🖥️  Avg CPU: ${result.metrics.resourceUtilization.avgCpu}%`);
  console.log(`   🧠 Avg Memory: ${result.metrics.resourceUtilization.avgMemory}MB`);
  console.log(`   🔥 Peak CPU: ${result.metrics.resourceUtilization.peakCpu}%`);
  console.log(`   💾 Peak Memory: ${result.metrics.resourceUtilization.peakMemory}MB`);
  console.log();

  // Stage details
  console.log(chalk.blue('🔧 Stage Results:'));
  result.stages.forEach(stage => {
    const stageIcon = stage.status === 'SUCCESS' ? '✅' :
                     stage.status === 'FAILED' ? '❌' :
                     stage.status === 'SKIPPED' ? '⏭️' : '⏳';
    const stageColor = stage.status === 'SUCCESS' ? chalk.green :
                      stage.status === 'FAILED' ? chalk.red :
                      stage.status === 'SKIPPED' ? chalk.yellow : chalk.gray;

    const duration = stage.duration ? `${(stage.duration / 1000).toFixed(2)}s` : 'N/A';
    console.log(`${stageColor(`   ${stageIcon} ${stage.id}: ${duration}`)}`);

    // Show metrics if available
    if (stage.metrics) {
      console.log(chalk.gray(`      CPU: ${stage.metrics.cpuUsage}%, Mem: ${stage.metrics.memoryUsage}MB`));
    }

    // Show errors if any
    if (stage.errors && stage.errors.length > 0) {
      stage.errors.forEach(error => {
        console.log(chalk.red(`      💥 ${error.message}`));
      });
    }
  });
  console.log();

  // Artifacts
  if (result.artifacts && result.artifacts.length > 0) {
    console.log(chalk.blue('📦 Generated Artifacts:'));
    result.artifacts.forEach(artifact => {
      console.log(`   📄 ${artifact.name} (${(artifact.size / 1024 / 1024).toFixed(2)}MB)`);
      console.log(chalk.gray(`      ${artifact.path}`));
    });
    console.log();
  }

  // Execution logs summary
  if (result.logs && result.logs.length > 0) {
    console.log(chalk.blue('📝 Execution Summary:'));
    // Show last few log lines
    const recentLogs = result.logs.slice(-5);
    recentLogs.forEach(log => {
      const message = typeof log === 'string' ? log : log.message || JSON.stringify(log);
      console.log(chalk.gray(`   ${message}`));
    });
    if (result.logs.length > 5) {
      console.log(chalk.gray(`   ... and ${result.logs.length - 5} more log entries`));
    }
    console.log();
  }
}

// Make sure the final line uses parseAsync
program.parseAsync(process.argv);
