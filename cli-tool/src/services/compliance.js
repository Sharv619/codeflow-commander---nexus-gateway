// src/services/compliance/compliance.js

export const COMPLIANCE_RULES = {
  HIPAA_SSN: {
    id: 'HIPAA_SSN',
    name: 'Potential Social Security Number',
    // Matches official SSN format: XXX-XX-XXXX (with some basic validations)
    regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/,
    severity: 'CRITICAL',
    remediation: 'Do not commit PII. Use a placeholder or environment variable.'
  },
  AWS_KEY: {
    id: 'SEC_AWS_KEY',
    name: 'AWS Access Key ID',
    // Matches AKIA... or ASIA... patterns (20+ chars for robustness)
    regex: /(AKIA|ASIA)[0-9A-Z]{16}/,
    severity: 'CRITICAL',
    remediation: 'Revoke this key immediately. Use .env files and never commit keys to git.'
  },
  GDPR_EMAIL_LIST: {
    id: 'GDPR_EMAIL_LIST',
    name: 'Hardcoded Email List (Potential PII)',
    // Detects array/list of 3+ emails (indicates bulk customer data)
    regex: /(['"][^'"]+@[^'"]+\.[^'"]+['"]\s*,\s*){2,}/,
    severity: 'HIGH',
    remediation: 'Store customer data in a database, not in code. Remove personally identifiable information.'
  },
  PRIVATE_KEY: {
    id: 'SEC_PRIVATE_KEY',
    name: 'Private Key Block',
    regex: /-----BEGIN (RSA|DSA|EC|PGP) PRIVATE KEY-----/,
    severity: 'CRITICAL',
    remediation: 'Never commit private keys. Use secure key management systems.'
  },
  API_KEY_CREDENTIAL: {
    id: 'SEC_API_KEY',
    name: 'Generic API Key Credential',
    regex: /(api_key|apikey|secret_key).*[:=]\s*['"`][^'"\s]{20,}['"`]/gi,
    severity: 'HIGH',
    remediation: 'Move API keys to environment variables or secure vaults.'
  }
};

/**
 * Scans content against defined compliance rules.
 * @param {string} content - The file content to scan
 * @param {string} fileName - The name of the file
 * @returns {Array} List of violations found
 */
export function scanContent(content, fileName) {
  const violations = [];

  // Skip certain file types
  if (fileName.match(/\.(lock|png|jpg|jpeg|gif|pdf|exe|dll|so|zip)$/i)) {
    return violations;
  }

  for (const [key, rule] of Object.entries(COMPLIANCE_RULES)) {
    if (rule.regex.test(content)) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: `[${rule.severity}] ${rule.name} detected in ${fileName}`,
        remediation: rule.remediation,
        file: fileName
      });
    }
  }

  return violations;
}

/**
 * Scans an entire directory recursively for compliance violations
 * @param {string} directory - Directory path to scan
 * @returns {Array} All violations found in the directory
 */
export function scanDirectory(directory) {
  const fs = require('fs');
  const path = require('path');
  const allViolations = [];

  function scanDir(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
        scanDir(fullPath);
      } else if (stat.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const violations = scanContent(content, fullPath);
          allViolations.push(...violations);
        } catch (error) {
          // Skip files that can't be read (binary, permission issues, etc.)
        }
      }
    }
  }

  scanDir(directory);
  return allViolations;
}
