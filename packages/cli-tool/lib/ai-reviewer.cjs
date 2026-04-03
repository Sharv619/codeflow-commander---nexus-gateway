const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

/**
 * AI Code Review Module
 *
 * Calls Gemini API to review git diffs with a structured score threshold.
 * Falls back to the deterministic heuristic analyzer if:
 * - API key is missing
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
 * @returns {{ provider: string, apiKey: string, apiUrl: string, model: string } | null}
 */
function loadConfig() {
  try {
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      const raw = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    // Config file exists but is invalid — fall back to heuristic
  }
  return null;
}

/**
 * Call Gemini API with the diff and return structured review.
 * @param {string} diff - Git diff content
 * @param {{ apiKey: string, apiUrl: string, model: string }} config
 * @returns {Promise<{ overallStatus: string, score: number, summary: string, files: Array }>}
 */
async function callGeminiAPI(diff, config) {
  const prompt = AI_REVIEW_PROMPT + diff;

  // Build Gemini API URL — handle both full URL and base URL formats
  let url;
  if (config.apiUrl && config.apiUrl.includes('generativelanguage')) {
    // Base URL format: https://generativelanguage.googleapis.com/v1/models
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

  const urlObj = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 30000 // 30 second timeout
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
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Find JSON object in the text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in AI response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate required fields
  if (!parsed.overallStatus || !parsed.score || !parsed.files) {
    throw new Error('AI response missing required fields (overallStatus, score, files)');
  }

  // Normalize score to integer 1-10
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
 * Tries Gemini API first, falls back to heuristic if unavailable.
 *
 * @param {string} diff - Git diff content
 * @param {{ minScore?: number }} options
 * @returns {Promise<{ success: boolean, result: object, message: string, usedFallback: boolean }>}
 */
async function reviewDiff(diff, options = {}) {
  const minScore = options.minScore || 3;
  const config = loadConfig();

  // No API key configured — use heuristic fallback
  if (!config || !config.apiKey) {
    return {
      success: true,
      result: { overallStatus: 'PASS', score: 7, summary: 'Heuristic analysis (no AI key configured)', files: [] },
      message: 'AI review skipped — no API key configured (using heuristic fallback)',
      usedFallback: true
    };
  }

  // Try AI review
  try {
    const responseText = await callGeminiAPI(diff, config);
    const result = parseAIResponse(responseText);

    if (result.score < minScore) {
      return {
        success: false,
        result,
        message: `AI review score ${result.score}/10 is below threshold ${minScore}/10`,
        usedFallback: false
      };
    }

    if (result.overallStatus === 'FAIL') {
      return {
        success: false,
        result,
        message: 'AI review found critical issues — review required',
        usedFallback: false
      };
    }

    return {
      success: true,
      result,
      message: `AI review passed — score ${result.score}/10`,
      usedFallback: false
    };
  } catch (error) {
    // API call failed — fall back to heuristic
    console.error(`AI review failed (${error.message}), using heuristic fallback`);

    // Import and use the deterministic analyzer
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
      usedFallback: true
    };
  }
}

module.exports = { reviewDiff, loadConfig, callGeminiAPI, parseAIResponse, AI_REVIEW_PROMPT };
