import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import cors from 'cors';

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

app.post('/analyze', (req, res) => {
    const { code, diff, commit } = req.body;
    console.log('Analyze request received — commit:', commit ? commit.id : '(no commit)');

    // Prefer diff, then code, then empty
    const payload = diff || code || '';

    // Simulate analysis delay
    setTimeout(() => {
        const result = analyzeCode(payload);
        res.json(result);
    }, 1200);
});

// Endpoint that would be called by a git hook. Accepts a minimal push payload and runs analysis.
app.post('/git-hook', (req, res) => {
    const { branch, commitId, diff } = req.body;
    console.log(`Git hook received for branch=${branch} commit=${commitId}`);

    const result = analyzeCode(diff || '');

    // Respond with the same CodeReviewResult shape
    res.json({ branch, commitId, result });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
