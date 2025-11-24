/**
 * cli-tool/tests/security/compliance.test.js
 * Security tests for compliance engines (GDPR, SOX, HIPAA)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';

describe('Compliance Framework', () => {
  describe('GDPR Compliance Engine', () => {
    it('should detect and flag PII data handling violations', async () => {
      // Test for GDPR Article 5 - Lawfulness of processing
      const mockCode = `
        const userData = collectPersonalData();
        storeData(database, userData); // No consent check
      `;

      // Import and test GDPR compliance checker
      const { checkGdprCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkGdprCompliance) {
        const result = await checkGdprCompliance(mockCode);
        expect(result.violations).toContain('Missing explicit consent for data processing');
        expect(result.risk).toBe('HIGH');
      }
    });

    it('should validate data minimization practices', async () => {
      const excessiveDataCollection = `
        const userProfile = {
          name, email, ssn, phone, address, ip, browser_fingerprint,
          purchase_history, location_data, social_security_number,
          medical_records, financial_data // Excessive data collection
        };
      `;

      const { checkGdprCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkGdprCompliance) {
        const result = await checkGdprCompliance(excessiveDataCollection);
        expect(result.dataMinimizationScore).toBeLessThan(0.5);
        expect(result.recommendations).toContain('Reduce collected PII to essential minimum');
      }
    });

    it('should enforce right to erasure (GDPR Article 17)', async () => {
      const dataErasureCode = `
        function deleteUser(userId) {
          // Soft delete only - keeps data accessible
          softDeleteFromDatabase(userId);
        }
      `;

      const { checkGdprCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkGdprCompliance) {
        const result = await checkGdprCompliance(dataErasureCode);
        expect(result.violations).toContain('Insufficient data erasure implementation');
        expect(result.conformance).toBe('NON_COMPLIANT');
      }
    });

    it('should validate data subject access requests handling', async () => {
      const accessRequestHandler = `
        app.get('/api/user/export', (req, res) => {
          // No authentication/authorization checks
          const data = getUserData(req.query.userId);
          res.json(data);
        });
      `;

      const { checkGdprCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkGdprCompliance) {
        const result = await checkGdprCompliance(accessRequestHandler);
        expect(result.securityIssues).toContain('Missing authorization for DSAR endpoint');
        expect(result.gaps).toContain('No identity verification for data export requests');
      }
    });
  });

  describe('SOX Compliance Engine', () => {
    it('should detect financial reporting control weaknesses', async () => {
      const financialLogic = `
        function generateQuarterlyReport() {
          const revenue = getRevenueData();
          report.total *= 1.05; // Manual adjustment without audit trail
          saveToDatabase(report);
        }
      `;

      const { checkSoxCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkSoxCompliance) {
        const result = await checkSoxCompliance(financialLogic);
        expect(result.internalControls).toContain('Manual data manipulation detected');
        expect(result.riskAssessment).toBe('MATERIAL_WEAKNESS');
      }
    });

    it('should validate segregation of duties implementation', async () => {
      const authorizationCode = `
        class FinancialProcessor {
          approveExpense(expense) {
            if (this.user.isManager) {
              expense.status = 'approved'; // No additional approval required
            }
          }
        }
      `;

      const { checkSoxCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkSoxCompliance) {
        const result = await checkSoxCompliance(authorizationCode);
        expect(result.sodViolations).toContain('No dual authorization for financial decisions');
        expect(result.governanceGap).toBe(true);
      }
    });

    it('should audit change management in financial systems', async () => {
      const directToProdCode = `
        // Direct production deployment without testing
        deployToProduction(financialSystemUpdate);
      `;

      const { checkSoxCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkSoxCompliance) {
        const result = await checkSoxCompliance(directToProdCode);
        expect(result.changelog).toContain('Missing formal testing before production deployment');
        expect(result.testingGaps).toContain('No regression testing for financial calculations');
      }
    });
  });

  describe('HIPAA Compliance Engine', () => {
    it('should detect PHI exposure risks', async () => {
      const phiExposure = `
        const patientRecord = getPatientData();
        logToConsole(patientRecord); // PHI in logs
        sendToAnalytics(patientRecord.ssn); // Unencrypted transmission
      `;

      const { checkHipaaCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkHipaaCompliance) {
        const result = await checkHipaaCompliance(phiExposure);
        expect(result.phiExposures).toContain('Patient data logged to console');
        expect(result.phiExposures).toContain('Unencrypted PHI transmission');
        expect(result.securityViolation).toBe('CRITICAL');
      }
    });

    it('should validate data encryption implementation', async () => {
      const unencryptedStorage = `
        function storePatientMedicalRecords(records) {
          saveToUnencryptedJsonFile('/patient-data/', records); // No encryption
        }
      `;

      const { checkHipaaCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkHipaaCompliance) {
        const result = await checkHipaaCompliance(unencryptedStorage);
        expect(result.encryptionViolations).toContain('PHI stored without encryption');
        expect(result.breachRisk).toBe('HIGH');
      }
    });

    it('should enforce minimum necessary access principle', async () => {
      const excessiveAccess = `
        app.get('/api/patients', (req, res) => {
          // Nurse can access ALL patient records, not just assigned
          const allPatients = getAllPatientData();
          res.json(allPatients);
        });
      `;

      const { checkHipaaCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkHipaaCompliance) {
        const result = await checkHipaaCompliance(excessiveAccess);
        expect(result.accessViolations).toContain('Excessive data access - violates minimum necessary rule');
        expect(result.rbacRequired).toBe(true);
      }
    });

    it('should validate breach notification compliance', async () => {
      const breachHandler = `
        function handleSecurityBreach(breach) {
          if (breach.affectedPatients > 500) {
            // Delayed notification - should be immediate for large breaches
            setTimeout(() => notifyAuthorities(), 24 * 60 * 60 * 1000);
          }
        }
      `;

      const { checkHipaaCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkHipaaCompliance) {
        const result = await checkHipaaCompliance(breachHandler);
        expect(result.breachViolations).toContain('Delayed breach notification for large-scale incidents');
        expect(result.complianceScore).toBeLessThan(0.7);
      }
    });
  });

  describe('Cross-Cutting Compliance Validation', () => {
    it('should handle multi-standard compliance checks', async () => {
      const healthcareFinancialCode = `
        function processHealthcareClaim(claim) {
          // HIPAA data + SOX financial controls
          updatePatientRecord(claim.patientData);
          adjustClaimAmount(claim); // Manual financial adjustment
          saveToDatabase(claim);
        }
      `;

      const { checkCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (checkCompliance) {
        const result = await checkCompliance(healthcareFinancialCode, ['HIPAA', 'SOX']);

        expect(result.standards.hipaa).toBeDefined();
        expect(result.standards.sox).toBeDefined();

        expect(result.criticalViolations).toContain('PHI financial data manipulation');
        expect(result.remediationPriority).toBe('CRITICAL');
      }
    });

    it('should generate comprehensive compliance reports', async () => {
      const codebaseSample = {
        gdpr: ['data-processing.js'],
        sox: ['financial-reports.js'],
        hipaa: ['patient-records.js']
      };

      const { generateComplianceReport } = await import('../../../src/cli/commands/compliance.js');

      if (generateComplianceReport) {
        const report = await generateComplianceReport(codebaseSample);

        expect(report.summary).toBeDefined();
        expect(report.byStandard).toBeDefined();
        expect(report.criticalIssues).toBeInstanceOf(Array);
        expect(report.overallScore).toBeGreaterThanOrEqual(0);
        expect(report.overallScore).toBeLessThanOrEqual(100);
      }
    });

    it('should prioritize remediation based on risk assessment', async () => {
      const violations = [
        { standard: 'GDPR', risk: 'HIGH', category: 'data-processing' },
        { standard: 'HIPAA', risk: 'CRITICAL', category: 'phi-exposure' },
        { standard: 'SOX', risk: 'MEDIUM', category: 'financial-controls' }
      ];

      const { prioritizeRemediation } = await import('../../../src/cli/commands/compliance.js');

      if (prioritizeRemediation) {
        const prioritized = prioritizeRemediation(violations);

        expect(prioritized[0].standard).toBe('HIPAA'); // Critical first
        expect(prioritized[prioritized.length - 1].standard).toBe('SOX'); // Medium last
      }
    });

    it('should validate compliance in CI/CD pipelines', async () => {
      const prChanges = [
        'src/patient-data.js - Added new PHI processing',
        'financial/claims.js - Modified claim calculations'
      ];

      const { validatePrCompliance } = await import('../../../src/cli/commands/compliance.js');

      if (validatePrCompliance) {
        const result = await validatePrCompliance(prChanges);

        expect(result.shouldBlockPr).toBe(true);
        expect(result.blockingReasons).toContain('PHI data changes require security review');
        expect(result.blockingReasons).toContain('Financial logic changes need SOX compliance check');
      }
    });
  });

  describe('Security Testing', () => {
    it('should detect common security vulnerabilities', async () => {
      const vulnerableCode = `
        const query = "SELECT * FROM users WHERE id = " + userInput; // SQL injection
        const password = "admin123"; // Hardcoded credentials
        const data = JSON.parse(userInput); // Potential DoS via JSON depth
      `;

      const { performSecurityScan } = await import('../../../src/cli/commands/security.js');

      if (performSecurityScan) {
        const result = await performSecurityScan(vulnerableCode);

        expect(result.vulnerabilities.sqlInjection).toBe(true);
        expect(result.vulnerabilities.hardcodedSecrets).toBe(true);
        expect(result.vulnerabilities.dosVulnerable).toBe(true);
        expect(result.riskScore).toBeGreaterThan(8);
      }
    });

    it('should validate secret management practices', async () => {
      const insecureSecrets = `
        const apiKey = "sk-1234567890abcdef"; // Exposed in code
        const dbPassword = process.env.DB_PASS || "default_password"; // Weak defaults
      `;

      const { scanSecrets } = await import('../../../src/cli/commands/security.js');

      if (scanSecrets) {
        const result = await scanSecrets(insecureSecrets);

        expect(result.exposedSecrets).toContain('apiKey');
        expect(result.documentationRisks).toContain('database password fallback');
        expect(result.securityScore).toBeLessThan(0.5);
      }
    });

    it('should assess dependency security risks', async () => {
      const dependencies = {
        'express': '4.17.1',
        'lodash': '3.10.1', // Known vulnerable version
        'moment': '2.29.4'  // Has security issues
      };

      const { auditDependencies } = await import('../../../src/cli/commands/security.js');

      if (auditDependencies) {
        const result = await auditDependencies(dependencies);

        expect(result.vulnerablePackages).toContain('lodash');
        expect(result.criticalCount).toBeGreaterThan(0);
        expect(result.recommendations).toContain('Update lodash to version 4+');
      }
    });
  });
});
