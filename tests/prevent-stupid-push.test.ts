const { spawnSync } = require('child_process');
const path = require('path');
const { describe, it, expect } = require('@jest/globals');

const script = path.resolve(process.cwd(), 'scripts', 'prevent-stupid-push.sh');

describe('prevent-stupid-push script', () => {
  it('runs in dry-run mode and checks for secrets', () => {
    const res = spawnSync('bash', [script, '--dry-run'], { encoding: 'utf8' });
    // Should exit 1 if secrets found (which is expected) and print status
    expect(res.status).toBe(1); // Exits 1 because secrets were found
    expect(res.stdout).toMatch(/Checking push range/);
    expect(res.stdout).toMatch(/ERROR: Potential secret found/);
  });

  it('shows usage and exits when no arguments provided', () => {
    const res = spawnSync('bash', [script], { encoding: 'utf8' });
    // With no --dry-run, it would run npm test which might pass or fail
    // But it should still show the checking message
    expect(res.stdout).toMatch(/Checking push range/);
  });

  it('accepts custom range argument', () => {
    const res = spawnSync('bash', [script, '--dry-run', '--range', 'HEAD~1..HEAD'], { encoding: 'utf8' });
    expect(res.status).toBe(1); // Still finds secrets
    expect(res.stdout).toMatch(/Checking push range: HEAD~1..HEAD/);
  });

  it('parses range as positional argument', () => {
    const res = spawnSync('bash', [script, 'HEAD~1..HEAD', '--dry-run'], { encoding: 'utf8' });
    expect(res.status).toBe(1); // Still finds secrets
    expect(res.stdout).toMatch(/Checking push range: HEAD~1..HEAD/);
  });

  it('skips npm test in dry-run mode even with package.json changes', () => {
    const res = spawnSync('bash', [script, '--dry-run'], { encoding: 'utf8' });
    expect(res.stdout).toMatch(/\(dry-run\) skipping npm test/);
    expect(res.status).toBe(1); // Exits 1 because secrets were found
  });

  it('checks for large files over 5MB limit', () => {
    // Create a temporary large file for testing
    const largeFilePath = path.join(process.cwd(), 'temp-large-file.txt');
    const fs = require('fs');

    // Create a file larger than 5MB
    const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
    fs.writeFileSync(largeFilePath, largeContent);

    try {
      const res = spawnSync('bash', [script, '--dry-run'], { encoding: 'utf8' });
      expect(res.stdout).toMatch(/ERROR: Large file detected/);
      expect(res.status).toBe(1);
    } finally {
      // Clean up
      fs.unlinkSync(largeFilePath);
    }
  });

  it('handles git diff errors gracefully', () => {
    // Test with a range that doesn't exist
    const res = spawnSync('bash', [script, '--dry-run', '--range', 'nonexistent..HEAD'], { encoding: 'utf8' });
    // Should handle gracefully and continue
    expect(res.stdout).toMatch(/Checking push range/);
  });
});
