#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

const program = new Command();

program
  .name('codeflow-hook')
  .description('Interactive CI/CD simulator and AI-powered code reviewer')
  .version('1.0.0');

// Configure AI provider settings
program
  .command('config')
  .description('Configure AI provider settings')
  .option('-p, --provider <provider>', 'AI provider (gemini, openai, claude)', 'gemini')
  .option('-k, --key <key>', 'API key for the chosen provider')
  .option('-u, --url <url>', 'Custom API URL (optional)')
  .option('-m, --model <model>', 'AI model name (optional - uses provider default)')
  .action(async (options) => {
    const configDir = path.join(process.env.HOME, '.codeflow-hook');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, 'config.json');
    const existingConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

    // Initialize config with existing values, then override with CLI options
    const config = {
      provider: options.provider || existingConfig.provider || 'gemini',
      apiKey: options.key || existingConfig.apiKey,
      apiUrl: options.url || existingConfig.apiUrl,
      model: options.model || existingConfig.model
    };

    // Set default API URL and model if not provided by options or existing config
    if (!config.apiUrl) {
      switch (config.provider) {
        case 'openai':
          config.apiUrl = 'https://api.openai.com/v1/chat/completions';
          config.model = config.model || 'gpt-4'; // Default model for OpenAI
          break;
        case 'claude':
          config.apiUrl = 'https://api.anthropic.com/v1/messages';
          config.model = config.model || 'claude-3-sonnet-20240229'; // Default model for Claude
          break;
        case 'gemini':
        default:
          // Updated Gemini API URL to v1
          config.apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
          // Default model for Gemini
          config.model = config.model || 'gemini-pro'; // Using 'gemini-pro' as a common default
          break;
      }
    }

    // Interactive model selection if model is not explicitly provided via CLI option
    // AND if the model is not already set (either from existing config or default)
    if (!options.model && !config.model) {
      try {
        switch (config.provider) {
          case 'gemini':
            const geminiModels = ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-pro'];
            const geminiRl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });
            config.model = await new Promise(resolve => {
              geminiRl.question(chalk.blue(`Select a Gemini model (${geminiModels.join(', ')}): `), (model) => {
                geminiRl.close();
                resolve(model || config.model); // Use input or current model if empty
              });
            });
            break;
          case 'openai':
            const openaiModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
            const openaiRl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });
            config.model = await new Promise(resolve => {
              openaiRl.question(chalk.blue(`Select an OpenAI model (${openaiModels.join(', ')}): `), (model) => {
                openaiRl.close();
                resolve(model || config.model);
              });
            });
            break;
          case 'claude':
            const claudeModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
            const claudeRl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });
            config.model = await new Promise(resolve => {
              claudeRl.question(chalk.blue(`Select a Claude model (${claudeModels.join(', ')}): `), (model) => {
                claudeRl.close();
                resolve(model || config.model);
              });
            });
            break;
        }
      } catch (error) {
        console.error(chalk.red(`Error selecting model: ${error.message}`));
        process.exit(1); // Exit if model selection fails
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`✅ Configuration saved for ${config.provider} provider`));
    if (config.model) {
      console.log(chalk.green(`   Model: ${config.model}`));
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

      // Create pre-commit hook
      const preCommitHook = `#!/usr/bin/env bash
# Codeflow pre-commit hook
# Auto-generated by codeflow-hook CLI

set -e

echo "🔬 Running Codeflow AI Code Analysis..."

# Get staged changes
STAGED_DIFF=$(git diff --cached --no-color)

if [ -z "$STAGED_DIFF" ]; then
  echo "ℹ️  No staged changes to analyze"
  exit 0
fi

# Run AI analysis
npx codeflow-hook analyze-diff "$STAGED_DIFF"
`;

      fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook, { mode: 0o755 });

      // Create pre-push hook (enhanced version)
      const prePushHook = `#!/usr/bin/env bash
# Codeflow pre-push hook
# Auto-generated by codeflow-hook CLI

set -e

echo "🚀 Running Codeflow CI/CD simulation..."

# Run tests if available
if [ -f "package.json" ]; then
  echo "🧪 Running tests..."
  npm test || (echo "❌ Tests failed" && exit 1)
fi

# Get staged changes for AI analysis
STAGED_DIFF=$(git diff --cached --no-color)

if [ -n "$STAGED_DIFF" ]; then
  echo "🔬 Running AI Code Review..."
  npx codeflow-hook analyze-diff "$STAGED_DIFF" || exit 1
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

// Analyze diff with configured AI provider
program
  .command('analyze-diff')
  .description('Analyze git diff with configured AI provider')
  .argument('<diff>', 'Git diff content')
  .action(async (diff) => {
    try {
      const configPath = path.join(process.env.HOME, '.codeflow-hook', 'config.json');

      if (!fs.existsSync(configPath)) {
        console.log(chalk.red('No configuration found. Run: codeflow-hook config -k <api-key>'));
        process.exit(1);
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (diff.trim() === '') {
        console.log(chalk.gray('ℹ️  No changes to analyze'));
        return;
      }

      const spinner = ora(`Analyzing code with ${config.provider}...`).start();
      const prompt = generateCodeReviewPrompt(diff);

      let result;
      try {
        result = await callAIProvider(config, prompt);
      } catch (error) {
        spinner.fail('Analysis failed');
        console.error(chalk.red(`AI API Error: ${error.message}`));
        process.exit(1);
      }

      spinner.succeed('Analysis complete');

      // Parse and display results
      displayAnalysisResults(result);

    } catch (error) {
      console.log(chalk.red(`Configuration error: ${error.message}`));
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

    // Check configuration
    const configPath = path.join(process.env.HOME, '.codeflow-hook', 'config.json');
    if (fs.existsSync(configPath)) {
      console.log(chalk.green('✅ Configuration: Found'));
    } else {
      console.log(chalk.red('❌ Configuration: Not found (run: codeflow-hook config)'));
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
  });

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

  const response = await axios.post(`${config.apiUrl}?key=${config.apiKey}`, payload, {
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

program.parse();
