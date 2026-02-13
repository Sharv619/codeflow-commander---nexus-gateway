#!/usr/bin/env node

/**
 * Security Setup Script for Codeflow Commander - Nexus Gateway
 * Generates secure keys and validates security configuration
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { securityConfig, validateSecurityConfig, generateSecureSecret } = require('../config/security.config');

console.log('🔒 Codeflow Commander - Security Setup');
console.log('=====================================\n');

/**
 * Generate a secure JWT secret
 */
function generateJWTSecret() {
  const secret = generateSecureSecret();
  console.log('✅ Generated secure JWT secret');
  console.log(`   JWT_SECRET=${secret}`);
  return secret;
}

/**
 * Generate API keys
 */
function generateAPIKeys(count = 2) {
  const keys = [];
  for (let i = 0; i < count; i++) {
    keys.push('ak_' + crypto.randomBytes(32).toString('hex'));
  }
  console.log(`✅ Generated ${count} API keys`);
  console.log(`   VALID_API_KEYS=${keys.join(',')}`);
  return keys;
}

/**
 * Create .env file with secure defaults
 */
function createSecureEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from template...');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env file created from template');
    } else {
      console.log('❌ .env.example template not found');
      return false;
    }
  }
  
  // Generate secure values
  const jwtSecret = generateJWTSecret();
  const apiKeys = generateAPIKeys();
  
  // Update .env file with secure values
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace placeholder values
  envContent = envContent.replace('your_jwt_secret_key_here', jwtSecret);
  envContent = envContent.replace('your_api_key_1,your_api_key_2', apiKeys.join(','));
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file updated with secure values');
  
  return true;
}

/**
 * Validate current security configuration
 */
function validateSecurity() {
  console.log('\n🔍 Validating Security Configuration...');
  const validation = validateSecurityConfig();
  
  if (validation.valid) {
    console.log('✅ Security configuration is valid');
  } else {
    console.log('⚠️  Security configuration issues found:');
    validation.issues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  }
  
  return validation.valid;
}

/**
 * Check file permissions
 */
function checkFilePermissions() {
  console.log('\n📁 Checking File Permissions...');
  
  const filesToCheck = [
    '.env',
    'config/security.config.js',
    'server/server.js'
  ];
  
  filesToCheck.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const mode = stats.mode & parseInt('777', 8);
      const octalMode = mode.toString(8);
      
      if (filePath === '.env' && octalMode !== '600') {
        console.log(`⚠️  ${filePath}: Consider setting permissions to 600 (current: ${octalMode})`);
      } else {
        console.log(`✅ ${filePath}: Permissions OK (${octalMode})`);
      }
    } else {
      console.log(`❌ ${filePath}: File not found`);
    }
  });
}

/**
 * Generate SSL certificates for development (optional)
 */
function generateSSLCertificates() {
  console.log('\n🔐 Generating Development SSL Certificates...');
  
  const certDir = path.join(__dirname, '..', 'certs');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
  
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');
  
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('📝 Generating self-signed SSL certificate for development...');
    
    // Generate private key
    const privateKey = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    // Generate certificate (simplified - in production use proper CA)
    const cert = crypto.createCertificate({
      key: privateKey.privateKey,
      csr: crypto.createSign('sha256').update('dummy').sign(privateKey.privateKey, 'base64')
    });
    
    fs.writeFileSync(keyPath, privateKey.privateKey);
    fs.writeFileSync(certPath, cert);
    
    console.log('✅ SSL certificates generated');
    console.log(`   Key: ${keyPath}`);
    console.log(`   Cert: ${certPath}`);
  } else {
    console.log('✅ SSL certificates already exist');
  }
}

/**
 * Create security audit report
 */
function createSecurityAudit() {
  console.log('\n📋 Creating Security Audit Report...');
  
  const auditReport = {
    timestamp: new Date().toISOString(),
    securityConfig: {
      jwt: {
        secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'not set',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        algorithm: 'HS256'
      },
      api: {
        rateLimit: {
          windowMs: process.env.RATE_LIMIT_WINDOW_MS || '900000',
          max: process.env.RATE_LIMIT_MAX_REQUESTS || '100'
        },
        cors: {
          origin: process.env.CORS_ORIGIN || 'localhost:5173,localhost:8080'
        }
      },
      csp: {
        enabled: process.env.CSP_ENABLED === 'true'
      }
    },
    recommendations: [
      'Use environment variables for all sensitive configuration',
      'Rotate JWT secrets regularly in production',
      'Implement proper API key management',
      'Enable HTTPS in production',
      'Regular security audits and dependency updates',
      'Use a proper Certificate Authority for SSL certificates'
    ]
  };
  
  const auditPath = path.join(__dirname, '..', 'security-audit.json');
  fs.writeFileSync(auditPath, JSON.stringify(auditReport, null, 2));
  
  console.log('✅ Security audit report created');
  console.log(`   Report: ${auditPath}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting security setup...\n');
  
  // Create secure environment
  const envCreated = createSecureEnv();
  
  if (envCreated) {
    // Validate configuration
    const configValid = validateSecurity();
    
    // Check file permissions
    checkFilePermissions();
    
    // Generate SSL certificates
    generateSSLCertificates();
    
    // Create audit report
    createSecurityAudit();
    
    console.log('\n🎉 Security setup completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Review the generated .env file');
    console.log('   2. Update API keys as needed');
    console.log('   3. Set proper file permissions (chmod 600 .env)');
    console.log('   4. Review security-audit.json for recommendations');
    console.log('   5. Restart your development servers');
    
    if (!configValid) {
      console.log('\n⚠️  Please address the security configuration issues above');
    }
  } else {
    console.log('\n❌ Security setup failed');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateJWTSecret,
  generateAPIKeys,
  createSecureEnv,
  validateSecurity,
  checkFilePermissions,
  generateSSLCertificates,
  createSecurityAudit
};