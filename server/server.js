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
app.use(bodyParser.json({ limit: '50kb' }));

// Root route - API status
app.get('/', (_req, res) => {
  res.json({
    service: 'codeflow-commander',
    version: '2.0.4',
    endpoints: {
      'GET /': 'This status page',
      'POST /analyze': 'Analyze code diff',
      'POST /git-hook': 'Git hook analysis',
      'POST /test': 'Run tests',
      'POST /devlog': 'Log quality event',
      'GET /results': 'All analysis results',
      'GET /results/trends': 'Aggregated trends',
      'GET /result/:id': 'Single result by ID',
      'POST /api/ai': 'AI proxy (Gemini)',
    },
    resultsCount: results.length,
  });
});

// Rate limiter for analysis endpoints
const analysisLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Too many requests, try again later' } });
app.use('/analyze', analysisLimiter);
app.use('/git-hook', analysisLimiter);
app.use('/test', analysisLimiter);
app.use('/devlog', rateLimit({ windowMs: 60 * 1000, max: 100, message: { error: 'Too many requests' } }));

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
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), { mode: 0o600 });
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
        return res.status(400).json({ error: 'No code or diff provided' });
    }

    if (payload.length > 25000) {
        return res.status(413).json({ error: 'Payload too large (max 25KB)' });
    }

    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `temp_analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.js`);

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
                return res.status(500).json({ error: 'Failed to parse ESLint output' });
            }

            try { fs.unlinkSync(tmpFile); } catch (_) {}

            try {
                const normalized = normalizeEslintOutput(parsed);
                const resultId = Date.now().toString();
                results.push({ id: resultId, type: 'analyze', timestamp: new Date().toISOString(), data: normalized });
                saveResults();
                return res.json(normalized);
            } catch (normErr) {
                return res.status(500).json({ error: 'Failed to normalize ESLint output' });
            }
        });
    } catch (e) {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        return res.status(500).json({ error: 'Analysis failed' });
    }
});

app.post('/git-hook', async (req, res) => {
    const { branch, commitId, diff } = req.body;
    console.log(`Git hook received for branch=${branch} commit=${commitId}`);

    const payload = diff || '';

    if (!payload) {
        return res.status(400).json({ error: 'No diff provided' });
    }

    if (payload.length > 25000) {
        return res.status(413).json({ error: 'Diff too large (max 25KB)' });
    }

    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `temp_git_hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.js`);

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
                return res.status(500).json({ error: 'Failed to parse ESLint output' });
            }

            try { fs.unlinkSync(tmpFile); } catch (_) {}

            try {
                const normalized = normalizeEslintOutput(parsed);
                const resultId = Date.now().toString();
                results.push({ id: resultId, type: 'git-hook-analyze', timestamp: new Date().toISOString(), data: normalized });
                saveResults();
                return res.json({ branch, commitId, result: normalized });
            } catch (normErr) {
                return res.status(500).json({ error: 'Failed to normalize ESLint output' });
            }
        });
    } catch (e) {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        return res.status(500).json({ error: 'Git hook analysis failed' });
    }
});
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

        console.log('Gemini API response status:', resp.status);

        try {
            const json = JSON.parse(text);
            return res.status(resp.status).json(json);
        } catch (e) {
            console.error('Failed to parse Gemini API response as JSON:', e);
            return res.status(resp.status).type('text').send(text);
        }
    } catch (err) {
        console.error('AI proxy error');
        return res.status(502).json({ error: 'Failed to contact AI provider' });
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
        res.status(500).json({ error: 'Test execution failed' });
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

// Dev log trending analysis — shows quality trends over time
app.get('/results/trends', (req, res) => {
    const { days = 30 } = req.query;
    const cutoff = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000);

    const filtered = results.filter(r => new Date(r.timestamp) >= cutoff);
    const byType = {};
    const byDay = {};
    let totalIssues = 0;
    let totalPass = 0;
    let totalFail = 0;

    for (const r of filtered) {
        const date = new Date(r.timestamp).toISOString().split('T')[0];
        if (!byDay[date]) {
            byDay[date] = { analyze: 0, 'git-hook-analyze': 0, test: 0, pass: 0, fail: 0 };
        }
        byDay[date][r.type] = (byDay[date][r.type] || 0) + 1;

        if (!byType[r.type]) {
            byType[r.type] = { total: 0, pass: 0, fail: 0, issues: 0 };
        }
        byType[r.type].total++;

        if (r.type === 'test') {
            if (r.data?.success) {
                byDay[date].pass++;
                totalPass++;
                byType[r.type].pass++;
            } else {
                byDay[date].fail++;
                totalFail++;
                byType[r.type].fail++;
            }
        } else {
            const status = r.data?.overallStatus || 'UNKNOWN';
            if (status === 'PASS') {
                byDay[date].pass++;
                totalPass++;
                byType[r.type].pass++;
            } else if (status === 'FAIL') {
                byDay[date].fail++;
                totalFail++;
                byType[r.type].fail++;
                const issues = (r.data?.files || []).reduce((sum, f) => sum + (f.issues?.length || 0), 0);
                byType[r.type].issues += issues;
                totalIssues += issues;
            }
        }
    }

    const sortedDays = Object.keys(byDay).sort();
    const passRate = filtered.length > 0 ? Math.round((totalPass / (totalPass + totalFail)) * 100) : 0;

    res.json({
        period: `${days} days`,
        totalAnalyses: filtered.length,
        totalPass,
        totalFail,
        passRate: `${passRate}%`,
        totalIssuesDetected: totalIssues,
        byDay: sortedDays.map(d => ({ date: d, ...byDay[d] })),
        byType: Object.fromEntries(Object.entries(byType).sort((a, b) => b[1] - a[1]))
    });
});

// Dev log entry — record commit quality events for trending
app.post('/devlog', (req, res) => {
    const { type, commitHash, branch, score, status, issues, provider, duration } = req.body;

    if (!type || !commitHash) {
        return res.status(400).json({ error: 'Missing required fields: type, commitHash' });
    }

    const entry = {
        id: Date.now().toString(),
        type: 'devlog',
        timestamp: new Date().toISOString(),
        data: {
            eventType: type,
            commitHash,
            branch: branch || 'unknown',
            score: score || null,
            status: status || 'UNKNOWN',
            issues: issues || [],
            provider: provider || 'unknown',
            duration: duration || null
        }
    };

    results.push(entry);
    saveResults();

    res.json({ success: true, id: entry.id });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
