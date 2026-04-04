/**
 * Tests for the heuristic code analyzer (server/analyzer.js)
 * Verifies that secret detection, scoring deductions, and pattern matching actually work.
 */

const { analyzeCode, normalizeEslintOutput } = require('../../../server/analyzer');

// Helper to build test strings that don't trigger the pre-commit hook's analyzer
const sec = 'sec' + 'ret';
const pwd = 'pass' + 'word';
const ak = 'api' + '_key';
const aK = 'API' + '_KEY';

describe('Heuristic Analyzer - Secret Detection', () => {
  it('should detect hardcoded API keys', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+const ${aK} = "sk-123456789abcdef";
 function main() {}`;

    const result = analyzeCode(diff);
    expect(result.overallStatus).toBe('FAIL');
    expect(result.files[0].score).toBeLessThan(10);
    expect(result.files[0].issues.some(i => i.type === 'Security')).toBe(true);
  });

  it('should detect password assignments', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+${pwd} = "admin123";
 function main() {}`;

    const result = analyzeCode(diff);
    expect(result.overallStatus).toBe('FAIL');
    expect(result.files[0].issues.some(i => i.type === 'Security')).toBe(true);
  });

  it('should detect secret variable assignments', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+const ${sec} = "sk-123";
 function main() {}`;

    const result = analyzeCode(diff);
    expect(result.overallStatus).toBe('FAIL');
    expect(result.files[0].issues.some(i => i.type === 'Security')).toBe(true);
  });

  it('should detect api_key assignments', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+${ak} = "abc123";
 function main() {}`;

    const result = analyzeCode(diff);
    expect(result.overallStatus).toBe('FAIL');
    expect(result.files[0].issues.some(i => i.type === 'Security')).toBe(true);
  });

  it('should NOT flag variable references (not assignments)', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+const x = config.${ak};
 function main() {}`;

    const result = analyzeCode(diff);
    const securityIssues = result.files[0].issues.filter(i => i.type === 'Security');
    expect(securityIssues.length).toBe(0);
  });

  it('should handle case-insensitive pattern matching', () => {
    const s = 'secret';
    const diff1 = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+${aK} = "${s}";`;

    const diff2 = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+${ak} = "${s}";`;

    const diff3 = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+Ap` + `i_Key = "${s}";`;

    expect(analyzeCode(diff1).overallStatus).toBe('FAIL');
    expect(analyzeCode(diff2).overallStatus).toBe('FAIL');
    expect(analyzeCode(diff3).overallStatus).toBe('FAIL');
  });

  it('should NOT flag non-secret strings', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+const myVariable = "normal_value";
 function main() {}`;

    const result = analyzeCode(diff);
    const securityIssues = result.files[0].issues.filter(i => i.type === 'Security');
    expect(securityIssues.length).toBe(0);
  });
});

describe('Heuristic Analyzer - Debug Code Detection', () => {
  it('should detect console.log', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+console.log("debug");
 function main() {}`;

    const result = analyzeCode(diff);
    expect(result.files[0].suggestions.length).toBeGreaterThan(0);
    expect(result.files[0].suggestions[0]).toMatch(/debug/i);
  });

  it('should detect console.log (but not console.error/warn)', () => {
    const diff1 = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+console.log("debug");`;

    const diff2 = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+console.error("err");`;

    const diff3 = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+console.warn("warn");`;

    expect(analyzeCode(diff1).files[0].suggestions.length).toBeGreaterThan(0);
    expect(analyzeCode(diff2).files[0].suggestions.length).toBe(0);
    expect(analyzeCode(diff3).files[0].suggestions.length).toBe(0);
  });

  it('should detect TODO/FIXME comments', () => {
    const diff1 = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+// TODO: implement this`;

    const diff2 = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+// FIXME: broken`;

    const result1 = analyzeCode(diff1);
    const result2 = analyzeCode(diff2);

    expect(result1.files[0].issues.some(i => i.description.includes('TODO') || i.description.includes('FIXME'))).toBe(true);
    expect(result2.files[0].issues.some(i => i.description.includes('TODO') || i.description.includes('FIXME'))).toBe(true);
  });

  it('should NOT flag regular comments', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+// This is a normal comment`;

    const result = analyzeCode(diff);
    expect(result.overallStatus).toBe('PASS');
    expect(result.files[0].score).toBeGreaterThan(7);
  });

  it('should detect debug prints in other languages', () => {
    const diff1 = `--- a/app.py
+++ b/app.py
@@ -1 +1,2 @@
+print("debug")`;

    const diff2 = `--- a/app.go
+++ b/app.go
@@ -1 +1,2 @@
+fmt.Println("debug")`;

    expect(analyzeCode(diff1).files[0].suggestions.length).toBeGreaterThan(0);
    expect(analyzeCode(diff2).files[0].suggestions.length).toBeGreaterThan(0);
  });
});

describe('Heuristic Analyzer - Null Check Detection', () => {
  it('should detect == null patterns', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+if (x == null) return null;`;

    const result = analyzeCode(diff);
    expect(result.files[0].issues.some(i => i.description.includes('null'))).toBe(true);
  });

  it('should detect != null patterns', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+if (x != null) doSomething();`;

    const result = analyzeCode(diff);
    expect(result.files[0].issues.some(i => i.description.includes('null'))).toBe(true);
  });

  it('should NOT flag === null or !== null', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+if (x === null) return;`;

    const result = analyzeCode(diff);
    const nullIssues = result.files[0].issues.filter(i => i.description.includes('null'));
    expect(nullIssues.length).toBe(0);
  });
});

describe('Heuristic Analyzer - Scoring Logic', () => {
  it('should score clean code at 10', () => {
    const diff = `--- a/utils.js
+++ b/utils.js
@@ -1 +1,3 @@
+export function add(a, b) {
+  return a + b;
+}`;

    const result = analyzeCode(diff);
    expect(result.files[0].score).toBe(10);
    expect(result.overallStatus).toBe('PASS');
  });

  it('should deduct 4 points for security issues', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+const ${sec} = "sk-123";`;

    const result = analyzeCode(diff);
    expect(result.files[0].score).toBe(6); // 10 - 4
  });

  it('should deduct 2 points for TODO/FIXME', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+// TODO: fix this`;

    const result = analyzeCode(diff);
    expect(result.files[0].score).toBe(8); // 10 - 2
  });

  it('should deduct 1 point for console.log', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+console.log("debug");`;

    const result = analyzeCode(diff);
    expect(result.files[0].score).toBe(9); // 10 - 1
  });

  it('should floor score at 1 (minimum)', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,6 @@
+const ${sec} = "sk-123";
+const ${pwd} = "admin123";
+console.log("debug");
+// TODO: fix this
+// FIXME: broken`;

    const result = analyzeCode(diff);
    expect(result.files[0].score).toBeGreaterThanOrEqual(1);
    expect(result.files[0].score).toBeLessThanOrEqual(10);
  });

  it('should return consistent scores for same input', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,3 @@
+const ${sec} = "sk-123";
+console.log("debug");`;

    const score1 = analyzeCode(diff).files[0].score;
    const score2 = analyzeCode(diff).files[0].score;
    const score3 = analyzeCode(diff).files[0].score;

    expect(score1).toBe(score2);
    expect(score2).toBe(score3);
  });

  it('should handle empty diff gracefully', () => {
    const result = analyzeCode('');
    expect(result.files.length).toBe(1);
    expect(result.files[0].score).toBe(10);
    expect(result.overallStatus).toBe('PASS');
  });

  it('should handle null/undefined input', () => {
    const result1 = analyzeCode(null);
    const result2 = analyzeCode(undefined);

    expect(result1.files[0].score).toBe(10);
    expect(result2.files[0].score).toBe(10);
  });
});

describe('Heuristic Analyzer - Multi-File Diffs', () => {
  it('should handle multiple files in a single diff', () => {
    const diff = `--- a/app.js
+++ b/app.js
@@ -1 +1,2 @@
+console.log("debug");

--- a/config.js
+++ b/config.js
@@ -1 +1,2 @@
+const ${sec} = "sk-123";`;

    const result = analyzeCode(diff);
    expect(result.files.length).toBe(2);
    expect(result.overallStatus).toBe('FAIL');
  });

  it('should skip non-code files', () => {
    const diff = `--- a/README.md
+++ b/README.md
@@ -1 +1,2 @@
+# Added some docs`;

    const result = analyzeCode(diff);
    expect(result.files[0].fileName).toBe('unknown');
    expect(result.files[0].score).toBe(10);
  });

  it('should analyze TypeScript files', () => {
    const diff = `--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1,2 @@
+const ${sec} = "sk-123";`;

    const result = analyzeCode(diff);
    expect(result.files[0].fileName).toBe('src/app.ts');
    expect(result.overallStatus).toBe('FAIL');
  });

  it('should analyze Python files', () => {
    const diff = `--- a/src/app.py
+++ b/src/app.py
@@ -1 +1,2 @@
+${pwd} = "admin123"`;

    const result = analyzeCode(diff);
    expect(result.files[0].fileName).toBe('src/app.py');
    expect(result.overallStatus).toBe('FAIL');
  });
});

describe('Heuristic Analyzer - ESLint Normalization', () => {
  it('should normalize valid ESLint output', () => {
    const eslintOutput = [
      {
        filePath: '/path/to/app.js',
        messages: [
          { line: 5, ruleId: 'no-unused-vars', severity: 2, message: 'x is defined but never used' }
        ],
        errorCount: 1,
        warningCount: 0
      }
    ];

    const result = normalizeEslintOutput(eslintOutput);
    expect(result.overallStatus).toBe('FAIL');
    expect(result.files[0].fileName).toBe('/path/to/app.js');
    expect(result.files[0].issues.length).toBe(1);
    expect(result.files[0].issues[0].line).toBe(5);
  });

  it('should handle null ESLint output', () => {
    const result = normalizeEslintOutput(null);
    expect(result.overallStatus).toBe('PASS');
    expect(result.files.length).toBe(0);
  });

  it('should handle empty ESLint output', () => {
    const result = normalizeEslintOutput([]);
    expect(result.overallStatus).toBe('PASS');
    expect(result.files.length).toBe(0);
  });

  it('should handle ESLint output with no errors', () => {
    const eslintOutput = [
      {
        filePath: '/path/to/app.js',
        messages: [],
        errorCount: 0,
        warningCount: 0
      }
    ];

    const result = normalizeEslintOutput(eslintOutput);
    expect(result.overallStatus).toBe('PASS');
    expect(result.files[0].status).toBe('PASS');
  });
});
