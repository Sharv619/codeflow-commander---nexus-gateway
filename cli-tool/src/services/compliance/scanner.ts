/**
 * Governance Safety Framework - Compliance Scanner
 * Implements HIPAA, GDPR, AWS credential detection
 */

// HIPAA SSN Detection (regex for XXX-XX-XXXX pattern)
export const HIPAA_SSN = /\b\d{3}-\d{2}-\d{4}\b/g;

// GDPR Email List Pattern (simple email detection in lists)
export const GDPR_EMAIL_LIST = /['"][^'"]+@[^'"]+\.[^'"]+['"]/g;

// AWS Secret Key Detection (AKIA followed by 16 characters)
export const AWS_SECRET_PATTERN = /\bAKIA[0-9A-Z]{16}\b/g;

/**
 * Compliance Scanner Implementation
 */
export class ComplianceScanner {
    private rules = {
        HIPAA: {
            patterns: [HIPAA_SSN],
            severity: 'HIGH',
            description: 'Health Insurance Portability and Accountability Act'
        },
        GDPR: {
            patterns: [GDPR_EMAIL_LIST],
            severity: 'HIGH',
            description: 'General Data Protection Regulation'
        },
        AWS: {
            patterns: [AWS_SECRET_PATTERN],
            severity: 'CRITICAL',
            description: 'AWS Credential Exposure'
        }
    };

    scan(text: string) {
        const violations = [];

        for (const [framework, config] of Object.entries(this.rules)) {
            for (const pattern of config.patterns) {
                const matches = text.match(pattern);
                if (matches) {
                    violations.push({
                        framework,
                        pattern: pattern.source,
                        matches: matches,
                        severity: config.severity,
                        description: config.description
                    });
                }
            }
        }

        return violations;
    }
}

export const COMPLIANCE_SCANNER = new ComplianceScanner();
