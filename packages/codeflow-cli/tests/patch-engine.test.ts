import { PatchEngine } from '../src/services/patch-engine';

describe('PatchEngine', () => {
  let engine: PatchEngine;

  beforeEach(() => {
    engine = new PatchEngine();
  });

  describe('parseUnifiedDiff', () => {
    it('should parse file paths from diff --git lines', async () => {
      const diffContent = `diff --git a/src/foo.ts b/src/foo.ts
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,4 @@
 const x = 1;
+const y = 2;
 const z = 3;
`;

      const result = await (engine as any).parseUnifiedDiff(diffContent);
      expect(result.filesAffected).toContain('src/foo.ts');
      expect(result.changes).toBeGreaterThan(0);
    });

    it('should return empty filesAffected for empty diff', async () => {
      const result = await (engine as any).parseUnifiedDiff('');
      expect(result.filesAffected).toEqual([]);
    });
  });

  describe('simulateConflicts', () => {
    it('should return empty conflicts for empty diff', async () => {
      const conflicts = await (engine as any).simulateConflicts('');
      expect(conflicts).toEqual([]);
    });

    it('should detect conflicts when source file does not exist', async () => {
      const diffContent = `diff --git a/nonexistent.ts b/nonexistent.ts
--- a/nonexistent.ts
+++ b/nonexistent.ts
@@ -1 +1 @@
-old
+new
`;

      const conflicts = await (engine as any).simulateConflicts(diffContent);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(['content-conflict', 'file-deleted']).toContain(conflicts[0].type);
    });
  });

  describe('createBackupForFiles', () => {
    it('should return null for empty file list', async () => {
      const result = await (engine as any).createBackupForFiles([]);
      expect(result).toBeNull();
    });

    it('should return backup id even for non-existent files', async () => {
      const result = await (engine as any).createBackupForFiles(['/nonexistent/file.ts']);
      expect(result).not.toBeNull();
    });
  });

  describe('applyUnifiedDiff', () => {
    it('should return conflicts for invalid diff', async () => {
      const conflicts = await (engine as any).applyUnifiedDiff('not a valid diff');
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });
});
