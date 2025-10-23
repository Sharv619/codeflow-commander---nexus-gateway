import express from 'express';
import bodyParser from 'body-parser';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

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

    // Prefer code, then diff, then empty (ESLint expects actual source code)
    const payload = code || diff || '';

    // If no payload, return an empty result
    if (!payload) {
        return res.json({ error: 'No code provided' });
    }

    // Write payload to a temporary file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `temp_analysis_${Date.now()}.js`);

    try {
        fs.writeFileSync(tmpFile, payload, 'utf8');

        // Execute ESLint with JSON output. Use npx to ensure local bin is used.
        // Use --no-ignore to avoid skipping files and ensure eslint runs on the temp file
        // Use the local eslint binary from node_modules to avoid relying on 'npx' in PATH
        // Use Node to execute the installed eslint JS entrypoint to avoid platform shell issues
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
app.post('/git-hook', (req, res) => {
    const { branch, commitId, diff } = req.body;
    console.log(`Git hook received for branch=${branch} commit=${commitId}`);

    const result = analyzeCode(diff || '');

    // Respond with the same CodeReviewResult shape
    res.json({ branch, commitId, result });
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

        // Forward a simple JSON payload; adapters can translate as needed for the
        // specific Gemini/VertexAI/OpenAI API shape you target.
        const payload = { model, input };

        const resp = await fetch(geminiUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
        const text = await resp.text();

        // Try parse JSON, otherwise return raw text
        try {
            const json = JSON.parse(text);
            return res.status(resp.status).json(json);
        } catch (e) {
            return res.status(resp.status).type('text').send(text);
        }
    } catch (err) {
        console.error('AI proxy error:', err);
        return res.status(502).json({ error: 'Failed to contact AI provider', detail: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
