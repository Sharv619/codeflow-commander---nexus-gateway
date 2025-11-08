import express from 'express';
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

// Security: Validate required environment variables
const requiredEnvVars = ['GEMINI_API_KEY', 'GEMINI_API_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName] === 'YOUR_GEMINI_API_KEY_HERE');

if (missingVars.length > 0) {
  console.error('❌ SECURITY ERROR: Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these variables in your .env file before running the application.');
  process.exit(1);
}

// Security: Validate API key format (basic check)
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length < 20) {
  console.error('❌ SECURITY ERROR: GEMINI_API_KEY appears to be invalid or placeholder value');
  console.error('Please set a valid Gemini API key in your .env file.');
  process.exit(1);
}

console.log('✅ Environment variables validated successfully');

const AI_REVIEW_PROMPT_TEMPLATE = `You are "Codeflow", a world-class AI software engineering assistant acting as a Principal Engineer. Your mission is to perform a rigorous and constructive code review on the provided code snippet.

Your analysis must be objective, precise, and focused on creating clean, maintainable, and secure code.

The code to review is:
[CODE_SNIPPET_HERE]

Your response MUST be a single, valid JSON object. Do not include any text, markdown, or explanations outside of this JSON object.

The JSON object must match the documented structure: an object containing overallStatus, summary, score, and files. files should be an array with one entry describing the submitted snippet.

Guidelines (short):
- overallStatus: Use "FAIL" if any Security, Bug, or critical Performance issues are found; otherwise "PASS".
- summary: A one-sentence executive summary of the code's quality.
- score: Integer 1-10 representing overall quality.
- files: An array with one object describing the reviewed snippet. Include fileName (use "submitted_code.js"), status (PASS/FAIL), an issues array with line, type, description, and link (or null), and an optional suggestions array.

Begin your analysis now.`;

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// Results storage - persisted to results.json
const RESULTS_FILE = path.join(process.cwd(), 'results.json');
let results = [];

function loadResults() {
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    }
  } catch (e) {
    results = [];
  }
}

function saveResults() {
  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  } catch (e) {
    console.error('Failed to save results:', e);
  }
}

loadResults();

// Simple deterministic analyzer that converts a diff string into a CodeReviewResult-like object
function analyzeCode(diffText) {
    // Very small heuristic-based analyzer — look for keywords to generate issues
    const issues = [];
    const files = [];

    const lines = (diffText || '').split(/\r?\n/).slice(0, 500);
    let fileCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (l.startsWith('+++ b/')) {
            fileCount++;
            const fileName = l.replace('+++ b/', '').trim();
            const fileIssues = [];
            const suggestions = [];
            let score = 10;

            // Scan a few lines after the file header for common bad patterns
            for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
                const ln = lines[j];
                if (/TODO|FIXME/.test(ln)) {
                    fileIssues.push({ line: j + 1, type: 'Quality', description: 'Left TODO/FIXME in code', link: null });
                    score -= 2;
                }
                if (/password|secret|apikey|api_key/i.test(ln)) {
                    fileIssues.push({ line: j + 1, type: 'Security', description: 'Potential secret leaked in code', link: null });
                    score -= 4;
                }
                if (/console\.log\(|fmt\.Println\(|print\(/.test(ln)) {
                    suggestions.push('Remove debug prints from production code');
                    score -= 1;
                }
                if (/==\s*null|!=\s*null/.test(ln)) {
                    fileIssues.push({ line: j + 1, type: 'Best Practice', description: 'Prefer explicit null checks or optional chaining', link: null });
                    score -= 1;
                }
            }

            files.push({ fileName, status: fileIssues.length === 0 ? 'PASS' : 'FAIL', score: Math.max(1, score), issues: fileIssues, suggestions });
        }
    }

    // If no files detected, create a default file result
    if (files.length === 0) {
        files.push({ fileName: 'unknown', status: 'PASS', score: 10, issues: [], suggestions: [] });
    }

    const overallStatus = files.every(f => f.status === 'PASS') ? 'PASS' : 'FAIL';
    const summary = overallStatus === 'PASS' ? 'No critical issues found.' : 'Issues detected — review required.';

    return { overallStatus, summary, files };
}

// Translate raw ESLint JSON output into the CodeReviewResult shape expected by the frontend
function normalizeEslintOutput(eslintJson) {
    // eslintJson is expected to be an array of file results produced by ESLint's JSON formatter
    if (!Array.isArray(eslintJson)) {
        return { overallStatus: 'PASS', summary: 'No issues found.', files: [] };
    }

    const files = [];
    let totalErrors = 0;

    for (const f of eslintJson) {
        const errorCount = typeof f.errorCount === 'number' ? f.errorCount : 0;
        totalErrors += errorCount;

        const issues = (f.messages || []).map(m => ({
            line: m.line || 0,
            type: m.ruleId || (m.severity === 2 ? 'error' : m.severity === 1 ? 'warning' : 'unknown'),
            description: m.message || ''
        }));

        files.push({
            fileName: f.filePath || f.fileName || 'unknown',
            status: errorCount > 0 ? 'FAIL' : 'PASS',
            issues
        });
    }

    const overallStatus = totalErrors > 0 ? 'FAIL' : 'PASS';
    const summary = totalErrors > 0 ? `${totalErrors} issues found.` : 'No issues found.';

    return { overallStatus, summary, files };
}

app.post('/analyze', async (req, res) => {
    const { code, diff, commit } = req.body;
    console.log('Analyze request received — commit:', commit ? commit.id : '(no commit)');

    const payload = code || diff || '';

    if (!payload) {
        return res.json({ error: 'No code provided' });
    }

    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `temp_analysis_${Date.now()}.js`);

    try {
        fs.writeFileSync(tmpFile, payload, 'utf8');

        const eslintEntry = path.join(process.cwd(), 'node_modules', 'eslint', 'bin', 'eslint.js');
        const nodeExe = process.execPath;

        let eslint;
        try {
            const projectEslintConfig = path.join(process.cwd(), '.eslintrc.json');
            eslint = spawn(nodeExe, [eslintEntry, '--no-ignore', '--config', projectEslintConfig, tmpFile, '--format', 'json'], { stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (spawnErr) {
            try { fs.unlinkSync(tmpFile); } catch (_) {}
            return res.status(500).json({ error: 'Failed to spawn eslint', detail: spawnErr.message });
        }

        let out = '';
        let err = '';
        eslint.stdout.on('data', (chunk) => { out += chunk.toString(); });
        eslint.stderr.on('data', (chunk) => { err += chunk.toString(); });

        eslint.on('close', (code) => {
            // Try parse stdout first, then stderr
            let parsed = null;
            try {
                if (out && out.trim()) parsed = JSON.parse(out);
            } catch (e) {
                parsed = null;
            }

            if (parsed === null) {
                try {
                    if (err && err.trim()) parsed = JSON.parse(err);
                } catch (e) {
                    parsed = null;
                }
            }

            if (parsed === null) {
                // Cleanup temp file then return a helpful error
                try { fs.unlinkSync(tmpFile); } catch (_) {}
                return res.status(500).json({ error: 'Failed to parse ESLint output', stdout: out, stderr: err, exitCode: code });
            }

            // Cleanup temp file now that ESLint has finished reading it
            try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }

            // Normalize ESLint output into the frontend's expected CodeReviewResult shape
            try {
                const normalized = normalizeEslintOutput(parsed);
                // Save the result
                const resultId = Date.now().toString();
                results.push({ id: resultId, type: 'analyze', timestamp: new Date().toISOString(), data: normalized });
                saveResults();
                return res.json(normalized);
            } catch (normErr) {
                return res.status(500).json({ error: 'Failed to normalize ESLint output', detail: normErr.message });
            }
        });
    } catch (e) {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        return res.status(500).json({ error: e.message });
    }
});

// Endpoint that would be called by a git hook. Accepts a minimal push payload and runs analysis.
app.post('/git-hook', async (req, res) => {
    const { branch, commitId, diff } = req.body;
    console.log(`Git hook received for branch=${branch} commit=${commitId}`);

    const payload = diff || '';

    if (!payload) {
        return res.json({ error: 'No diff provided' });
    }

    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `temp_git_hook_analysis_${Date.now()}.js`);

    try {
        fs.writeFileSync(tmpFile, payload, 'utf8');

        const eslintEntry = path.join(process.cwd(), 'node_modules', 'eslint', 'bin', 'eslint.js');
        const nodeExe = process.execPath;

        let eslint;
        try {
            const projectEslintConfig = path.join(process.cwd(), '.eslintrc.json');
            eslint = spawn(nodeExe, [eslintEntry, '--no-ignore', '--config', projectEslintConfig, tmpFile, '--format', 'json'], { stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (spawnErr) {
            try { fs.unlinkSync(tmpFile); } catch (_) {}
            return res.status(500).json({ error: 'Failed to spawn eslint', detail: spawnErr.message });
        }

        let out = '';
        let err = '';
        eslint.stdout.on('data', (chunk) => { out += chunk.toString(); });
        eslint.stderr.on('data', (chunk) => { err += chunk.toString(); });

        eslint.on('close', (code) => {
            let parsed = null;
            try {
                if (out && out.trim()) parsed = JSON.parse(out);
            } catch (e) {
                parsed = null;
            }

            if (parsed === null) {
                try {
                    if (err && err.trim()) parsed = JSON.parse(err);
                } catch (e) {
                    parsed = null;
                }
            }

            if (parsed === null) {
                try { fs.unlinkSync(tmpFile); } catch (_) {}
                return res.status(500).json({ error: 'Failed to parse ESLint output', stdout: out, stderr: err, exitCode: code });
            }

            try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }

            try {
                const normalized = normalizeEslintOutput(parsed);
                const resultId = Date.now().toString();
                results.push({ id: resultId, type: 'git-hook-analyze', timestamp: new Date().toISOString(), data: normalized });
                saveResults();
                return res.json({ branch, commitId, result: normalized });
            } catch (normErr) {
                return res.status(500).json({ error: 'Failed to normalize ESLint output', detail: normErr.message });
            }
        });
    } catch (e) {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        return res.status(500).json({ error: e.message });
    }
});


// Server-side AI proxy endpoint
// Accepts { model?, input } and forwards to a configured GEMINI_API_URL using the
// GEMINI_API_KEY from environment. This keeps API keys on the server and out of
// client bundles. Configure GEMINI_API_URL and GEMINI_API_KEY in your environment.
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 }); // 30 requests per minute

app.post('/api/ai', aiLimiter, async (req, res) => {
    const { model = 'default', input } = req.body || {};

    if (!input || typeof input !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid `input` in request body' });
    }

    // Simple input size guard
    if (input.length > 20000) {
        return res.status(413).json({ error: 'Input too large' });
    }

    const geminiUrl = process.env.GEMINI_API_URL;
    if (!geminiUrl) {
        return res.status(500).json({ error: 'GEMINI_API_URL not configured on server' });
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (process.env.GEMINI_API_KEY) {
            headers['Authorization'] = `Bearer ${process.env.GEMINI_API_KEY}`;
        }

        const payload = { model, input };

        const resp = await fetch(geminiUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
        const text = await resp.text();

        // Log the raw response text for debugging
        console.log('Raw Gemini API response:', text);

        // Try parse JSON, otherwise return raw text
        try {
            const json = JSON.parse(text);
            return res.status(resp.status).json(json);
        } catch (e) {
            console.error('Failed to parse Gemini API response as JSON:', e);
            return res.status(resp.status).type('text').send(text);
        }
    } catch (err) {
        console.error('AI proxy error:', err);
        return res.status(502).json({ error: 'Failed to contact AI provider', detail: err.message });
    }
});

// Endpoint to run tests and return output
app.post('/test', async (req, res) => {
    try {
        const jestPath = path.join(process.cwd(), 'node_modules', '.bin', 'jest');
        const child = spawn('node', [jestPath, '--json'], { stdio: 'pipe' });

        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            error += data.toString();
        });

        child.on('close', (code) => {
            const success = code === 0;
            const data = { success, output, error };
            // Save the result
            const resultId = Date.now().toString();
            results.push({ id: resultId, type: 'test', timestamp: new Date().toISOString(), data });
            saveResults();
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    res.json({ success: true, result });
                } catch (e) {
                    res.json({ success: true, output });
                }
            } else {
                res.json({ success: false, output, error });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/results', (req, res) => {
    res.json(results);
});

app.get('/result/:id', (req, res) => {
    const result = results.find(r => r.id === req.params.id);
    if (result) {
        res.json(result);
    } else {
        res.status(404).json({ error: 'Result not found' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
