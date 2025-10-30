#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os'; // Make sure os is imported
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
          if (!isNaN(index) && index >= 0 && index < models.length) {
            config.model = models[index];
          } else {
            config.model = selectedModel;
          }

          console.log(chalk.green(`✓ Selected model: ${config.model}`));

        } catch (error) {
          modelSpinner.fail('Failed to fetch models');
          console.error(chalk.red(`❌ API Error: ${error.message}`));
          // Fallback to hardcoded list if API call fails
          const fallbackModels = getFallbackModels(config.provider);

          console.log(chalk.yellow('⚠️ Using fallback model list:'));
          fallbackModels.forEach((model, index) => {
            console.log(chalk.gray(`  ${index + 1}. ${model}`));
          });

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const selectedModel = await new Promise(resolve => {
            rl.question(chalk.blue(`Select a model (name or number): `), (input) => {
              rl.close();
              resolve(input.trim());
            });
          });

          const index = parseInt(selectedModel) - 1;
          if (!isNaN(index) && index >= 0 && index < fallbackModels.length) {
            config.model = fallbackModels[index];
          } else {
            config.model = selectedModel;
          }

          console.log(chalk.green(`✓ Selected fallback model: ${config.model}`));
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

// Analyze diff with configured AI provider
program
  .command('analyze-diff')
  .description('Analyze git diff with configured AI provider')
  // CHANGE 2: The argument is now OPTIONAL (square brackets)
  .argument('[diff]', 'Git diff content')
  .action(async (diff) => {
    try {
      // CHANGE 3: New logic block to read from stdin if no argument is given
      let diffContent = diff;
      if (!diffContent) {
        const chunks = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        diffContent = Buffer.concat(chunks).toString('utf8');
      }

      const configPath = path.join(os.homedir(), '.codeflow-hook', 'config.json');

      if (!fs.existsSync(configPath)) {
        console.log(chalk.red('No configuration found. Run: codeflow-hook config -k <api-key>'));
        process.exit(1);
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (diffContent.trim() === '') {
        console.log(chalk.gray('ℹ️  No changes to analyze'));
        return;
      }

      const spinner = ora(`Analyzing code with ${config.provider}...`).start();
      const prompt = generateCodeReviewPrompt(diffContent);

      let result;
      try {
        result = await callAIProvider(config, prompt);
      } catch (error) {
        spinner.fail('Analysis failed');
        console.error(chalk.red(`AI API Error: ${error.message}`));
        process.exit(1);
      }

      spinner.succeed('Analysis complete');
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

    // Check configuration cascade
    // Use USERPROFILE on Windows instead of HOME which might be undefined
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const globalConfigPath = path.join(homeDir, '.codeflow-hook', 'config.json');
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
        // Test OpenAI API key by making a simple models list request
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

// Make sure the final line uses parseAsync
program.parseAsync(process.argv);
