const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');

/**
 * AI Code Review Module
 *
 * Supports multiple AI providers:
 * - gemini: Google Gemini API (cloud, requires API key)
 * - openai: OpenAI API (cloud, requires API key)
 * - claude: Anthropic Claude API (cloud, requires API key)
 * - ollama: Ollama local models (self-hosted, no API key needed)
 *
 * Falls back to the deterministic heuristic analyzer if:
 * - No provider is configured or enabled
 * - API call fails (network, timeout, invalid key)
 * - Response cannot be parsed
 *
 * This ensures the pre-commit hook never blocks development due to
 * missing or broken AI configuration.
 */

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.codeflow-hook', 'config.json');

const AI_REVIEW_PROMPT = `You are "Codeflow", a Principal Engineer performing a rigorous code review on the provided git diff.

Your response MUST be a single, valid JSON object with no markdown, no code blocks, no extra text.

The JSON must have this exact structure:
{
  "overallStatus": "PASS" or "FAIL",
  "score": integer 1-10,
  "summary": "one sentence executive summary",
  "files": [
    {
      "fileName": "path/to/file",
      "status": "PASS" or "FAIL",
      "issues": [
        { "line": number, "type": "Security"|"Bug"|"Performance"|"Quality"|"Best Practice", "description": "clear description" }
      ],
      "suggestions": ["actionable suggestion"]
    }
  ]
}

Rules:
- overallStatus must be "FAIL" if ANY Security, Bug, or critical Performance issues exist
- score: 1-10 (10 = production-ready, 1 = fundamentally broken)
- Be constructive and precise
- Focus on: security vulnerabilities, bugs, performance issues, code quality

Git diff to review:
`;

/**
 * Load AI provider configuration from ~/.codeflow-hook/config.json
 * @returns {{ provider: string, apiKey: string, apiUrl: string, model: string, ollama: { enabled: boolean, url: string } } | null}
 */
function loadConfig() {
  try {
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      const raw = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
      const config = JSON.parse(raw);
      // Ensure ollama section exists with defaults
      if (!config.ollama) {
        config.ollama = { enabled: false, url: 'http://localhost:11434' };
      }
      return config;
    }
  } catch (e) {
    // Config file exists but is invalid — fall back to heuristic
  }
  return null;
}

/**
 * Call Ollama local API with the diff and return structured review.
 * Uses /api/generate endpoint with format: "json" for structured output.
 * @param {string} diff - Git diff content
 * @param {{ model: string, url: string }} config
 * @returns {Promise<string>} - Raw text response from Ollama
 */
async function callOllamaAPI(diff, config) {
  const prompt = AI_REVIEW_PROMPT + diff;
  const baseUrl = config.url || 'http://localhost:11434';
  const urlObj = new URL(`${baseUrl}/api/generate`);

  const payload = JSON.stringify({
    model: config.model || 'qwen2.5-coder',
    prompt,
    stream: false,
    format: 'json',
    options: {
      temperature: 0.2,
      num_ctx: 8192,
    }
  });

  const isHttps = urlObj.protocol === 'https:';
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(urlObj, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 120000 // 2 minute timeout for local models
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Ollama returned ${res.statusCode}: ${data.substring(0, 200)}`));
        }
        try {
          const response = JSON.parse(data);
          const text = response.response;
          if (!text) {
            return reject(new Error('Ollama returned no text response'));
          }
          resolve(text);
        } catch (e) {
          reject(new Error(`Failed to parse Ollama response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama request timed out after 120s — is the model loaded?'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * List available Ollama models by calling /api/tags
 * @param {string} baseUrl - Ollama URL (default: http://localhost:11434)
 * @returns {Promise<string[]>} - Array of model names
 */
async function listOllamaModels(baseUrl) {
  const url = `${baseUrl || 'http://localhost:11434'}/api/tags`;
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === 'https:';
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(urlObj, {
      method: 'GET',
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Ollama returned ${res.statusCode}`));
        }
        try {
          const response = JSON.parse(data);
          const models = (response.models || []).map(m => m.name);
          resolve(models);
        } catch (e) {
          reject(new Error(`Failed to parse Ollama model list: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama connection timed out — is Ollama running?'));
    });

    req.end();
  });
}

/**
 * Check if Ollama is running and reachable
 * @param {string} baseUrl - Ollama URL
 * @returns {Promise<boolean>}
 */
async function isOllamaRunning(baseUrl) {
  try {
    const models = await listOllamaModels(baseUrl);
    return models.length > 0;
  } catch {
    return false;
  }
}

/**
 * Call Gemini API with the diff and return structured review.
 * @param {string} diff - Git diff content
 * @param {{ apiKey: string, apiUrl: string, model: string }} config
 * @returns {Promise<string>} - Raw text response
 */
async function callGeminiAPI(diff, config) {
  const prompt = AI_REVIEW_PROMPT + diff;

  let url;
  if (config.apiUrl && config.apiUrl.includes('generativelanguage')) {
    url = `${config.apiUrl}/${config.model || 'gemini-2.0-flash'}:generateContent?key=${config.apiKey}`;
  } else if (config.apiUrl) {
    url = config.apiUrl;
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-2.0-flash'}:generateContent?key=${config.apiKey}`;
  }

  const payload = JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Gemini API returned ${res.statusCode}: ${data.substring(0, 200)}`));
        }
        try {
          const response = JSON.parse(data);
          const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            return reject(new Error('Gemini returned no text response'));
          }
          resolve(text);
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out after 30s'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Parse AI response text into structured review result.
 * Handles cases where the response is wrapped in markdown code blocks.
 * @param {string} text - Raw AI response text
 * @returns {{ overallStatus: string, score: number, summary: string, files: Array }}
 */
function parseAIResponse(text) {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in AI response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.overallStatus || !parsed.score || !parsed.files) {
    throw new Error('AI response missing required fields (overallStatus, score, files)');
  }

  const score = Math.max(1, Math.min(10, Math.round(parsed.score)));

  return {
    overallStatus: parsed.overallStatus.toUpperCase() === 'FAIL' ? 'FAIL' : 'PASS',
    score,
    summary: parsed.summary || 'No summary provided',
    files: Array.isArray(parsed.files) ? parsed.files : []
  };
}

/**
 * Main entry point: review a git diff.
 * Provider priority: Ollama (if enabled) → Cloud provider (Gemini/OpenAI/Claude) → Heuristic fallback
 *
 * @param {string} diff - Git diff content
 * @param {{ minScore?: number }} options
 * @returns {Promise<{ success: boolean, result: object, message: string, usedFallback: boolean, provider: string }>}
 */
async function reviewDiff(diff, options = {}) {
  const minScore = options.minScore || 3;
  const config = loadConfig();

  // Determine which provider to use
  const useOllama = config?.ollama?.enabled === true;
  const provider = useOllama ? 'ollama' : (config?.provider || 'none');

  // Try Ollama if enabled
  if (useOllama) {
    try {
      const ollamaConfig = {
        model: config.model || 'qwen2.5-coder',
        url: config.ollama.url || 'http://localhost:11434'
      };
      const responseText = await callOllamaAPI(diff, ollamaConfig);
      const result = parseAIResponse(responseText);

      if (result.score < minScore) {
        return {
          success: false,
          result,
          message: `Ollama review score ${result.score}/10 is below threshold ${minScore}/10`,
          usedFallback: false,
          provider: 'ollama'
        };
      }

      if (result.overallStatus === 'FAIL') {
        return {
          success: false,
          result,
          message: 'Ollama review found critical issues — review required',
          usedFallback: false,
          provider: 'ollama'
        };
      }

      return {
        success: true,
        result,
        message: `Ollama review passed — score ${result.score}/10 (${ollamaConfig.model})`,
        usedFallback: false,
        provider: 'ollama'
      };
    } catch (error) {
      console.error(`Ollama review failed (${error.message}), trying cloud provider...`);
    }
  }

  // Try cloud provider (Gemini, OpenAI, Claude)
  if (config?.apiKey) {
    try {
      const responseText = await callGeminiAPI(diff, config);
      const result = parseAIResponse(responseText);

      if (result.score < minScore) {
        return {
          success: false,
          result,
          message: `${provider} review score ${result.score}/10 is below threshold ${minScore}/10`,
          usedFallback: false,
          provider
        };
      }

      if (result.overallStatus === 'FAIL') {
        return {
          success: false,
          result,
          message: `${provider} review found critical issues — review required`,
          usedFallback: false,
          provider
        };
      }

      return {
        success: true,
        result,
        message: `${provider} review passed — score ${result.score}/10`,
        usedFallback: false,
        provider
      };
    } catch (error) {
      console.error(`${provider} review failed (${error.message}), using heuristic fallback`);
    }
  }

  // Final fallback: heuristic analyzer
  const { analyzeCode } = require('../../../server/analyzer.js');
  const heuristicResult = analyzeCode(diff);
  const score = heuristicResult.files.reduce((min, f) => Math.min(min, f.score), 10);
  const passed = score >= minScore && heuristicResult.overallStatus === 'PASS';

  return {
    success: passed,
    result: { ...heuristicResult, score },
    message: passed
      ? `Heuristic review passed — score ${score}/10 (AI unavailable)`
      : `Heuristic review failed — score ${score}/10 (AI unavailable)`,
    usedFallback: true,
    provider: 'heuristic'
  };
}

module.exports = {
  reviewDiff,
  loadConfig,
  callGeminiAPI,
  callOllamaAPI,
  listOllamaModels,
  isOllamaRunning,
  parseAIResponse,
  AI_REVIEW_PROMPT
};
