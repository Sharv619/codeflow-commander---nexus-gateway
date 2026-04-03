import express from 'express';
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { analyzeCode, normalizeEslintOutput } from './analyzer.js';

dotenv.config();

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

            try { fs.unlinkSync(tmpFile); } catch (_) {}

            try {
                const normalized = normalizeEslintOutput(parsed);
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

            try { fs.unlinkSync(tmpFile); } catch (_) {}

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
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

app.post('/api/ai', aiLimiter, async (req, res) => {
    const { model = 'default', input } = req.body || {};

    if (!input || typeof input !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid `input` in request body' });
    }

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

        console.log('Raw Gemini API response:', text);

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
