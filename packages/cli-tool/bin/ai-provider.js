#!/usr/bin/env node
/**
 * AI Provider Module
 * Handles all AI provider interactions including:
 * - External APIs (Gemini, OpenAI, Claude) - for backward compatibility
 * - Local Ollama models - for fortress mode (local-only)
 * 
 * This module eliminates circular dependencies by being a pure provider.
 */

import axios from 'axios';
import { spawn, execSync } from 'child_process';
import chalk from 'chalk';

// Check if we're in fortress mode (local-only)
export function isFortressMode() {
  return process.env.FORTRESS_MODE === 'true' || 
         process.env.LOCAL_ONLY === 'true' ||
         process.env.OFFLINE_MODE === 'true';
}

// Check if Ollama is available
export async function isOllamaAvailable() {
  try {
    execSync('pgrep ollama', { stdio: 'ignore' });
    const response = await axios.get('http://localhost:11434/api/tags', { timeout: 2000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

// Start Ollama if not running
export async function ensureOllamaRunning() {
  if (await isOllamaAvailable()) {
    return true;
  }
  
  console.log(chalk.yellow('🤖 Starting Ollama...'));
  
  try {
    const ollamaProcess = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore'
    });
    
    ollamaProcess.unref();
    
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await isOllamaAvailable()) {
        console.log(chalk.green('✅ Ollama is running'));
        return true;
      }
      attempts++;
    }
    
    return false;
  } catch (error) {
    console.error(chalk.red('❌ Failed to start Ollama:', error.message));
    return false;
  }
}

// Get available models from Ollama
export async function getOllamaModels() {
  try {
    const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
    return response.data.models || [];
  } catch (error) {
    return [];
  }
}

// Main AI provider function
export async function callAIProvider(config, prompt) {
  // Fortress mode: Always use local Ollama
  if (isFortressMode()) {
    const ollamaReady = await ensureOllamaRunning();
    if (!ollamaReady) {
      throw new Error('FORTRESS MODE: Ollama must be running for local-only operation');
    }
    return callOllama(config, prompt);
  }
  
  // Non-fortress mode: Try Ollama first, fall back to external APIs
  const ollamaAvailable = await isOllamaAvailable();
  if (ollamaAvailable) {
    console.log(chalk.blue('🤖 Using local Ollama model'));
    return callOllama(config, prompt);
  }
  
  // Fall back to external provider
  return callExternalProvider(config, prompt);
}

// Call local Ollama
async function callOllama(config, prompt) {
  const model = config.model || process.env.OLLAMA_MODEL || 'codellama:7b-code';
  
  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: model,
      prompt: prompt,
      stream: false
    }, {
      timeout: 120000
    });
    
    return response.data.response;
  } catch (error) {
    console.error(chalk.red('❌ Ollama error:', error.message));
    throw error;
  }
}

// Call external provider (Gemini, OpenAI, Claude)
async function callExternalProvider(config, prompt) {
  const provider = config.provider?.toLowerCase() || 'gemini';
  
  switch (provider) {
    case 'gemini':
      return callGemini(config, prompt);
    case 'openai':
      return callOpenAI(config, prompt);
    case 'claude':
      return callClaude(config, prompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Gemini API
async function callGemini(config, prompt) {
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  const model = config.model || 'gemini-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await axios.post(url, {
    contents: [{
      parts: [{ text: prompt }]
    }]
  });
  
  return response.data.candidates[0].content.parts[0].text;
}

// OpenAI API
async function callOpenAI(config, prompt) {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const model = config.model || 'gpt-4';
  const url = config.apiUrl || 'https://api.openai.com/v1/chat/completions';
  
  const response = await axios.post(url, {
    model: model,
    messages: [{ role: 'user', content: prompt }]
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  
  return response.data.choices[0].message.content;
}

// Claude API
async function callClaude(config, prompt) {
  const apiKey = config.apiKey || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('Claude API key not configured');
  }
  
  const model = config.model || 'claude-3-opus-20240229';
  const url = config.apiUrl || 'https://api.anthropic.com/v1/messages';
  
  const response = await axios.post(url, {
    model: model,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  }, {
    headers: { 
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  });
  
  return response.data.content[0].text;
}

// Validate API key for external providers
export async function validateApiKey(provider, apiKey) {
  const testPrompt = 'Say "OK" if you can read this.';
  
  try {
    const config = { provider, apiKey };
    await callExternalProvider(config, testPrompt);
    return true;
  } catch (error) {
    throw new Error(`API key validation failed: ${error.message}`);
  }
}
