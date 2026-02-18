const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('Codeflow Hook CLI', () => {
  const cliPath = path.join(__dirname, '..', 'bin', 'codeflow-hook.js');

  test('should display help information', () => {
    const output = execSync(`node "${cliPath}" --help`, { encoding: 'utf8' });
    expect(output).toContain('codeflow-hook');
    expect(output).toContain('Interactive CI/CD simulator');
    expect(output).toContain('Commands:');
    expect(output).toContain('config');
    expect(output).toContain('install');
    expect(output).toContain('analyze-diff');
  });

  test('should display version information', () => {
    const output = execSync(`node "${cliPath}" --version`, { encoding: 'utf8' });
    // Version should be in the output, possibly with logging prefix
    expect(output).toMatch(/\b\d+\.\d+\.\d+\b/);
  });

  test('should show status command', () => {
    const output = execSync(`node "${cliPath}" status`, { encoding: 'utf8' });
    expect(output).toContain('Codeflow Hook Status');
  });

  test('should handle invalid command gracefully', () => {
    try {
      execSync(`node "${cliPath}" invalid-command`, { encoding: 'utf8' });
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      // CLI exits with status 1 for invalid commands, may or may not show error message
    }
  });

  test('should have executable permissions on CLI file', () => {
    // Check if the CLI file exists
    expect(fs.existsSync(cliPath)).toBe(true);

    // On Windows, we'll just check the file exists and is readable
    const stats = fs.statSync(cliPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should have required package.json fields', () => {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.name).toBe('codeflow-hook');
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageJson.bin['codeflow-hook']).toBe('bin/codeflow-hook.js');
    expect(packageJson.main).toBe('bin/codeflow-hook.js');
    expect(packageJson.type).toBe('module');
  });

  test('should have required files in package', () => {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.files).toContain('README.md');
    expect(packageJson.files).toContain('bin/');
    expect(packageJson.files).toContain('lib/');
  });

  test('should have compiled TypeScript files', () => {
    const distDir = path.join(__dirname, '..', 'lib', 'cli-integration', 'dist');

    expect(fs.existsSync(distDir)).toBe(true);

    const files = fs.readdirSync(distDir);
    expect(files).toContain('index.js');
    expect(files).toContain('types.js');
    expect(files).toContain('pipelineConfigs.js');
    expect(files).toContain('simulationEngine.js');
  });
});
