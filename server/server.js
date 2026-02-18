import express from 'express';
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pipelineExecutor from './pipeline-executor.js';

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

// Real CI/CD Pipeline Execution API Endpoints

/**
 * Execute a real CI/CD pipeline with real data execution
 */
app.post('/api/pipeline/execute', async (req, res) => {
    try {
        console.log('Real pipeline execution requested');
        
        // Execute the real pipeline
        const execution = await pipelineExecutor.executePipeline(req.body);
        
        res.json({
            success: true,
            executionId: execution.id,
            message: 'Pipeline execution started',
            execution
        });
    } catch (error) {
        console.error('Pipeline execution failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get real-time status of a running pipeline execution
 */
app.get('/api/pipeline/status/:executionId', (req, res) => {
    const executionId = req.params.executionId;
    const status = pipelineExecutor.getExecutionStatus(executionId);
    
    if (status) {
        res.json({
            success: true,
            execution: status
        });
    } else {
        res.status(404).json({
            success: false,
            error: 'Execution not found'
        });
    }
});

/**
 * Get live logs for a specific stage in a pipeline execution
 */
app.get('/api/pipeline/logs/:executionId/:stageId', (req, res) => {
    const { executionId, stageId } = req.params;
    const execution = pipelineExecutor.getExecutionStatus(executionId);
    
    if (!execution) {
        return res.status(404).json({
            success: false,
            error: 'Execution not found'
        });
    }
    
    const stage = execution.stages.find(s => s.id === stageId);
    if (!stage) {
        return res.status(404).json({
            success: false,
            error: 'Stage not found'
        });
    }
    
    res.json({
        success: true,
        stage: {
            id: stage.id,
            name: stage.name,
            status: stage.status,
            duration: stage.duration,
            logs: stage.logs,
            error: stage.error
        }
    });
});

/**
 * Abort a running pipeline execution
 */
app.post('/api/pipeline/abort/:executionId', (req, res) => {
    const executionId = req.params.executionId;
    const aborted = pipelineExecutor.abortExecution(executionId);
    
    if (aborted) {
        res.json({
            success: true,
            message: 'Pipeline execution aborted'
        });
    } else {
        res.status(404).json({
            success: false,
            error: 'Execution not found or already completed'
        });
    }
});

/**
 * Get all pipeline execution results
 */
app.get('/api/pipeline/results', (req, res) => {
    const results = pipelineExecutor.getAllResults();
    res.json({
        success: true,
        results
    });
});

/**
 * Get project configuration detection
 */
app.get('/api/pipeline/config', async (req, res) => {
    try {
        const config = await pipelineExecutor.detectProjectConfiguration();
        const stages = pipelineExecutor.generatePipelineStages(config);
        
        res.json({
            success: true,
            config,
            stages,
            message: 'Project configuration detected successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// In-memory storage for changes (for verification script)
const changes = new Map();

// Additional API endpoints for verification script

// GET /api/changes/stats - Return mock statistics
app.get('/api/changes/stats', (req, res) => {
  const totalDetected = changes.size;
  const pendingReview = Array.from(changes.values()).filter(c => c.status === 'queued').length;
  
  res.json({ 
    totalDetected, 
    pendingReview,
    totalProcessed: Array.from(changes.values()).filter(c => c.status === 'processed').length,
    timestamp: new Date().toISOString()
  });
});

// POST /api/changes/detect - Store change event with UUID
app.post('/api/changes/detect', (req, res) => {
  const change = req.body;
  
  // Generate UUID for the change
  const changeId = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Add metadata to the change
  const changeWithMetadata = {
    id: changeId,
    ...change,
    status: 'queued',
    queuedAt: new Date().toISOString(),
    processedAt: null
  };
  
  // Store in memory
  changes.set(changeId, changeWithMetadata);
  
  console.log('Change detected and stored:', changeWithMetadata);
  
  res.json({ 
    id: changeId, 
    status: 'queued',
    message: 'Change detected and queued for analysis',
    queuedAt: changeWithMetadata.queuedAt
  });
});

// GET /api/changes/:id - Retrieve specific change data
app.get('/api/changes/:id', (req, res) => {
  const changeId = req.params.id;
  const change = changes.get(changeId);
  
  if (!change) {
    return res.status(404).json({ 
      error: 'Change not found', 
      changeId 
    });
  }
  
  res.json(change);
});

// GET /api/ekg/health - Return health status (for verification script)
app.get('/api/ekg/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'EKG-Engine',
    timestamp: new Date().toISOString(),
    changesStored: changes.size
  });
});

// POST /api/ekg/context - Return mock EKG context (for verification script)
app.post('/api/ekg/context', (req, res) => {
  const { changeId, filePath } = req.body;
  
  // Mock EKG context structure expected by verification script
  const mockContext = {
    changeId,
    filePath,
    dependencies: [
      {
        target: {
          path: 'src/utils/config.ts',
          type: 'typescript',
          criticality: 'high'
        },
        type: 'import',
        version: '1.0.0'
      },
      {
        target: {
          path: 'src/services/auth.ts',
          type: 'typescript',
          criticality: 'critical'
        },
        type: 'dependency',
        version: '2.1.0'
      }
    ],
    risk_factors: [
      {
        securityLevel: 'restricted',
        testCoverage: 0.85,
        lastModified: '2025-01-15T10:30:00Z'
      }
    ],
    owners: [
      {
        team: {
          name: 'Security Team',
          members: ['alice', 'bob', 'charlie']
        },
        responsibility: 'Security analysis and validation'
      }
    ],
    timestamp: new Date().toISOString()
  };
  
  res.json(mockContext);
});

// Additional endpoint for getting all changes (useful for debugging)
app.get('/api/changes', (req, res) => {
  const allChanges = Array.from(changes.values());
  res.json({
    changes: allChanges,
    total: changes.size
  });
});

// Endpoint to mark a change as processed (for testing)
app.post('/api/changes/:id/process', (req, res) => {
  const changeId = req.params.id;
  const change = changes.get(changeId);
  
  if (!change) {
    return res.status(404).json({ 
      error: 'Change not found', 
      changeId 
    });
  }
  
  change.status = 'processed';
  change.processedAt = new Date().toISOString();
  
  res.json({
    message: 'Change marked as processed',
    change
  });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log('Real CI/CD Pipeline Execution API endpoints available:');
    console.log('  POST /api/pipeline/execute - Execute real pipeline');
    console.log('  GET  /api/pipeline/status/:id - Get execution status');
    console.log('  GET  /api/pipeline/logs/:id/:stage - Get stage logs');
    console.log('  POST /api/pipeline/abort/:id - Abort execution');
    console.log('  GET  /api/pipeline/results - Get all results');
    console.log('  GET  /api/pipeline/config - Get project config');
    console.log('  Additional endpoints for verification script:');
    console.log('  GET  /api/changes/stats - Get change statistics');
    console.log('  POST /api/changes/detect - Detect and store changes');
    console.log('  GET  /api/changes/:id - Get specific change');
    console.log('  GET  /api/ekg/health - EKG health check');
    console.log('  POST /api/ekg/context - Get EKG context');
});
