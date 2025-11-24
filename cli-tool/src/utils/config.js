import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * cli-tool/src/utils/config.js
 * Configuration management for codeflow-hook CLI
 * Handles feature flags and user settings
 */

const CONFIG_DIR = path.join(os.homedir(), '.codeflow-hook');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default configuration
const DEFAULT_CONFIG = {
  // AI provider settings
  provider: 'gemini',
  apiKey: '',
  apiUrl: '',
  model: '',

  // Knowledge features (Phase 3 & 4)
  enableKnowledgeStore: false,
  enableEnterpriseGraph: false,

  // Enterprise graph settings
  graphUrl: process.env.GRAPH_URL || '',
  graphUser: process.env.GRAPH_USER || '',
  graphPass: process.env.GRAPH_PASS || '',

  // CLI behavior
  verbose: false,
  dryRun: false,

  // Learning and analytics
  collectUsageStats: true,
  enableAutoSuggestions: true,

  // Advanced settings
  cacheTimeout: 3600000, // 1 hour
  maxRetries: 3,
  timeout: 30000
};

/**
 * Ensure configuration directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load configuration from file
 */
export function loadConfig() {
  try {
    ensureConfigDir();

    if (!fs.existsSync(CONFIG_FILE)) {
      // Create default config
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return { ...DEFAULT_CONFIG };
    }

    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);

    // Merge with defaults to ensure new settings are included
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.warn(`⚠️  Failed to load configuration: ${error.message}`);
    console.log('🔄 Using default configuration');
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config) {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`✅ Configuration saved to ${CONFIG_FILE}`);
  } catch (error) {
    console.error(`❌ Failed to save configuration: ${error.message}`);
    throw error;
  }
}

/**
 * Update a specific configuration key
 */
export function setConfig(key, value) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
  return config;
}

/**
 * Get a specific configuration value
 */
export function getConfig(key, defaultValue = null) {
  const config = loadConfig();
  return config[key] !== undefined ? config[key] : defaultValue;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig() {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log('🔄 Configuration reset to defaults');
    return { ...DEFAULT_CONFIG };
  } catch (error) {
    console.error(`❌ Failed to reset configuration: ${error.message}`);
    throw error;
  }
}

/**
 * Validate knowledge store configuration
 */
export function validateKnowledgeStoreConfig() {
  const config = loadConfig();

  if (!config.enableKnowledgeStore) {
    return { valid: true, message: 'Knowledge store not enabled' };
  }

  // Check for potential issues
  const configDirWritable = fs.accessSync(CONFIG_DIR, fs.constants.W_OK);
  if (!configDirWritable) {
    return {
      valid: false,
      message: `Configuration directory not writable: ${CONFIG_DIR}`
    };
  }

  return { valid: true, message: 'Knowledge store configuration valid' };
}

/**
 * Validate enterprise graph configuration
 */
export function validateEnterpriseGraphConfig() {
  const config = loadConfig();

  if (!config.enableEnterpriseGraph) {
    return { valid: true, message: 'Enterprise graph not enabled' };
  }

  // Required environment variables or config
  const required = ['graphUrl', 'graphUser', 'graphPass'];

  for (const key of required) {
    if (!config[key]) {
      return {
        valid: false,
        message: `Missing required configuration: ${key}. Set via environment variable or CLI config.`
      };
    }
  }

  // Validate URL format
  try {
    new URL(config.graphUrl);
  } catch (error) {
    return {
      valid: false,
      message: `Invalid graph URL format: ${config.graphUrl}`
    };
  }

  return { valid: true, message: 'Enterprise graph configuration valid' };
}

/**
 * Get configuration status overview
 */
export function getConfigStatus() {
  const config = loadConfig();

  const knowledgeStoreValidation = validateKnowledgeStoreConfig();
  const enterpriseGraphValidation = validateEnterpriseGraphConfig();

  return {
    configFile: CONFIG_FILE,
    configExists: fs.existsSync(CONFIG_FILE),
    aiConfigured: !!(config.apiKey && config.provider),
    knowledgeStoreEnabled: config.enableKnowledgeStore,
    knowledgeStoreValid: knowledgeStoreValidation.valid,
    enterpriseGraphEnabled: config.enableEnterpriseGraph,
    enterpriseGraphValid: enterpriseGraphValidation.valid,
    validations: {
      knowledgeStore: knowledgeStoreValidation.message,
      enterpriseGraph: enterpriseGraphValidation.message
    },
    features: {
      analysis: true, // Always available
      knowledge: config.enableKnowledgeStore,
      enterprise: config.enableEnterpriseGraph
    }
  };
}

/**
 * Print configuration status to console
 */
export function printConfigStatus() {
  const status = getConfigStatus();

  console.log('🔧 Codeflow Hook Configuration Status\n');

  console.log(`📁 Config Location: ${status.configFile} ${status.configExists ? '✅' : '❌ (will be created on first run)'}`);
  console.log(`🤖 AI Provider: ${status.aiConfigured ? '✅ Configured' : '❌ Not configured (run: codeflow-hook config)'} `);
  console.log('');

  console.log('🧠 Knowledge Store:');
  console.log(`  Status: ${status.knowledgeStoreEnabled ? '✅ Enabled' : '❌ Disabled'}`);
  if (status.knowledgeStoreEnabled) {
    console.log(`  Valid: ${status.knowledgeStoreValid ? '✅' : '❌'} ${status.validations.knowledgeStore}`);
  }
  console.log('');

  console.log('🌐 Enterprise Graph:');
  console.log(`  Status: ${status.enterpriseGraphEnabled ? '✅ Enabled' : '❌ Disabled'}`);
  if (status.enterpriseGraphEnabled) {
    console.log(`  Valid: ${status.enterpriseGraphValid ? '✅' : '❌'} ${status.validations.enterpriseGraph}`);
  }
  console.log('');

  console.log('🚀 Available Features:');
  console.log(`  AI Code Analysis: ${status.features.analysis ? '✅' : '❌'}`);
  console.log(`  Local Knowledge Store: ${status.features.knowledge ? '✅' : '❌'}`);
  console.log(`  Enterprise Knowledge Graph: ${status.features.enterprise ? '✅' : '❌'}`);
}

export { CONFIG_DIR, CONFIG_FILE, DEFAULT_CONFIG };
