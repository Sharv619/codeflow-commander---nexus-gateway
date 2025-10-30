#!/usr/bin/env node

console.log('=== SIMPLE TEST START ===');

// Test path resolution
import path from 'path';
import os from 'os';
import fs from 'fs';

const configDir = path.join(os.homedir(), '.codeflow-hook');
console.log('Config dir:', configDir);
console.log('Config dir exists:', fs.existsSync(configDir));

const configPath = path.join(configDir, 'config.json');
console.log('Config path:', configPath);
console.log('Config file exists:', fs.existsSync(configPath));

// Test the config loading
const existingConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
console.log('Existing config:', JSON.stringify(existingConfig, null, 2));

// Test the validation logic
const options = { key: 'AIzaSyBIEmWx8lRqHveNgiPl3fokbGDdOMUwjms' }; // Gemini key
const shouldValidate = options.key || (!existingConfig.provider && !existingConfig.apiKey);
console.log('shouldValidate:', shouldValidate);
console.log('options.key exists:', !!options.key);
console.log('empty existing config:', !existingConfig.provider && !existingConfig.apiKey);

console.log('=== SIMPLE TEST END ===');
