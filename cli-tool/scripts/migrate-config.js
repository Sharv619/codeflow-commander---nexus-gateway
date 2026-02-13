#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const OLD_CONFIG_PATH = path.join(os.homedir(), '.codeflow-hook', 'config.json');
const NEW_CONFIG_PATH = path.join(os.homedir(), '.codeflow-hook', '.env');

async function migrate() {
  console.log(chalk.blue('🔄 CodeFlow Config Migration Tool\n'));
  
  if (!fs.existsSync(OLD_CONFIG_PATH)) {
    console.log(chalk.yellow('⚠️  No old config.json found. Nothing to migrate.'));
    console.log(chalk.gray('   If you need to configure, run: codeflow-hook config -k YOUR_API_KEY'));
    return;
  }
  
  if (fs.existsSync(NEW_CONFIG_PATH)) {
    console.log(chalk.yellow('⚠️  .env file already exists at:'));
    console.log(chalk.gray(`   ${NEW_CONFIG_PATH}\n`));
    console.log(chalk.blue('Migration skipped. Your existing .env will be preserved.'));
    return;
  }
  
  try {
    const oldConfig = JSON.parse(fs.readFileSync(OLD_CONFIG_PATH, 'utf8'));
    
    const envLines = [
      '# Migrated from config.json',
      `# Migration date: ${new Date().toISOString()}`,
      '',
      '# AI Provider Settings',
      `CODEFLOW_AI_PROVIDER=${oldConfig.provider || 'gemini'}`,
      `CODEFLOW_API_KEY=${oldConfig.apiKey || ''}`,
      `CODEFLOW_API_URL=${oldConfig.apiUrl || ''}`,
      `CODEFLOW_MODEL=${oldConfig.model || ''}`,
      ''
    ];
    
    if (oldConfig.gemini_key) {
      envLines.push(`GEMINI_API_KEY=${oldConfig.gemini_key}`);
    }
    if (oldConfig.openai_key) {
      envLines.push(`OPENAI_API_KEY=${oldConfig.openai_key}`);
    }
    if (oldConfig.anthropic_key) {
      envLines.push(`CLAUDE_API_KEY=${oldConfig.anthropic_key}`);
    }
    
    if (oldConfig.enableKnowledgeStore) {
      envLines.push('', 'ENABLE_KNOWLEDGE_STORE=true');
    }
    if (oldConfig.enableEnterpriseGraph) {
      envLines.push('ENABLE_ENTERPRISE_GRAPH=true');
    }
    
    fs.writeFileSync(NEW_CONFIG_PATH, envLines.join('\n'));
    
    // Backup old config
    const backupPath = `${OLD_CONFIG_PATH}.backup`;
    fs.renameSync(OLD_CONFIG_PATH, backupPath);
    
    console.log(chalk.green('✅ Migration successful!\n'));
    console.log(chalk.gray(`   New config: ${NEW_CONFIG_PATH}`));
    console.log(chalk.gray(`   Backup: ${backupPath}\n`));
    console.log(chalk.blue('Your API keys have been migrated to .env format.'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Migration failed: ${error.message}`));
    process.exit(1);
  }
}

migrate();
