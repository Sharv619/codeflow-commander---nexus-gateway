const { analyzeCode, normalizeEslintOutput } = require('./analyzer.js');

describe('analyzeCode', () => {
  test('returns PASS for empty diff', () => {
    const result = analyzeCode('');
    expect(result.overallStatus).toBe('PASS');
    expect(result.files).toHaveLength(1);
    expect(result.files[0].fileName).toBe('unknown');
    expect(result.files[0].score).toBe(10);
  });

  test('returns PASS for clean diff with no issues', () => {
    const diff = `diff --git a/src/utils.ts b/src/utils.ts
+++ b/src/utils.ts
@@ -0,0 +1,3 @@
+const greeting = "hello";
+export function sayHello() {
+  return greeting;
+}`;
    const result = analyzeCode(diff);
    expect(result.overallStatus).toBe('PASS');
    expect(result.files[0].fileName).toBe('src/utils.ts');
    expect(result.files[0].issues).toHaveLength(0);
    expect(result.files[0].score).toBe(10);
  });

  test('detects TODO/FIXME as quality issues', () => {
    const diff = `diff --git a/src/handler.ts b/src/handler.ts
+++ b/src/handler.ts
@@ -0,0 +1,3 @@
+function process() {
+  // TODO: implement this properly
+  return null;
+}`;
    const result = analyzeCode(diff);
    expect(result.overallStatus).toBe('FAIL');
    const qualityIssues = result.files[0].issues.filter(i => i.type === 'Quality');
    expect(qualityIssues.length).toBeGreaterThan(0);
    expect(qualityIssues[0].description).toContain('TODO/FIXME');
  });

  test('detects potential secrets as security issues', () => {
    const diff = `diff --git a/src/config.js b/src/config.js
+++ b/src/config.js
@@ -0,0 +1,2 @@
+const apiKey = "sk-1234567890";
+const dbPassword = "supersecret123";
+}`;
    const result = analyzeCode(diff);
    expect(result.overallStatus).toBe('FAIL');
    const securityIssues = result.files[0].issues.filter(i => i.type === 'Security');
    expect(securityIssues.length).toBeGreaterThan(0);
    expect(securityIssues[0].description).toContain('secret');
  });

  test('flags console.log as anti-pattern with suggestion', () => {
    const diff = `diff --git a/src/debug.ts b/src/debug.ts
+++ b/src/debug.ts
@@ -0,0 +1,2 @@
+function init() {
+  console.log("starting up");
+}`;
    const result = analyzeCode(diff);
    expect(result.files[0].suggestions).toContain('Remove debug prints from production code');
    expect(result.files[0].score).toBeLessThan(10);
  });

  test('detects multiple issues in same file', () => {
    const diff = `diff --git a/src/bad.ts b/src/bad.ts
+++ b/src/bad.ts
@@ -0,0 +1,5 @@
+const api_key = "leaked-key-12345";
+// FIXME: this is broken
+console.log("debug info");
+if (value == null) {
+  return;
+}`;
    const result = analyzeCode(diff);
    expect(result.overallStatus).toBe('FAIL');
    expect(result.files[0].issues.length).toBeGreaterThan(1);
    expect(result.files[0].score).toBeLessThan(5);
  });

  test('handles diff with multiple files', () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
+++ b/src/a.ts
@@ -0,0 +1 @@
+const clean = true;
diff --git a/src/b.ts b/src/b.ts
+++ b/src/b.ts
@@ -0,0 +1 @@
+const password = "leaked";
`;
    const result = analyzeCode(diff);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].fileName).toBe('src/a.ts');
    expect(result.files[1].fileName).toBe('src/b.ts');
    expect(result.overallStatus).toBe('FAIL');
  });

  test('score never drops below 1', () => {
    const diff = `diff --git a/src/worst.ts b/src/worst.ts
+++ b/src/worst.ts
@@ -0,0 +1,10 @@
+const api_key = "key1";
+const password = "pass1";
+const secret = "sec1";
+// TODO: fix
+// TODO: fix2
+// TODO: fix3
+// FIXME: broken
+console.log("debug");
+if (x == null) {}
+if (y != null) {}
`;
    const result = analyzeCode(diff);
    expect(result.files[0].score).toBeGreaterThanOrEqual(1);
  });

  test('handles null/undefined input gracefully', () => {
    expect(() => analyzeCode(null)).not.toThrow();
    expect(() => analyzeCode(undefined)).not.toThrow();
    const resultNull = analyzeCode(null);
    expect(resultNull.overallStatus).toBe('PASS');
  });
});

describe('normalizeEslintOutput', () => {
  test('returns PASS for empty array', () => {
    const result = normalizeEslintOutput([]);
    expect(result.overallStatus).toBe('PASS');
  });

  test('returns PASS for non-array input', () => {
    const result = normalizeEslintOutput(null);
    expect(result.overallStatus).toBe('PASS');
  });

  test('returns FAIL when errors exist', () => {
    const eslintOutput = [
      {
        filePath: 'src/bad.ts',
        errorCount: 2,
        messages: [
          { line: 5, ruleId: 'no-unused-vars', severity: 2, message: 'x is defined but never used' }
        ]
      }
    ];
    const result = normalizeEslintOutput(eslintOutput);
    expect(result.overallStatus).toBe('FAIL');
    expect(result.files[0].status).toBe('FAIL');
    expect(result.files[0].issues).toHaveLength(1);
  });

  test('returns PASS when no errors', () => {
    const eslintOutput = [
      {
        filePath: 'src/good.ts',
        errorCount: 0,
        messages: []
      }
    ];
    const result = normalizeEslintOutput(eslintOutput);
    expect(result.overallStatus).toBe('PASS');
  });
});
