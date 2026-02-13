#!/usr/bin/env node

/**
 * Security Check Script for Codeflow Commander - Nexus Gateway
 * Comprehensive security validation and vulnerability scanning
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { securityConfig, validateSecurityConfig } = require('../config/security.config');

// Security check results
const results = {
  status: 'pending',
  timestamp: new Date().toISOString(),
  overallScore: 0,
  checks: [],
  recommendations: []
};

// Security check categories
const categories = {
  JWT: { score: 0, max: 30, weight: 0.3 },
  API: { score: 0, max: 25, weight: 0.25 },
  Encryption: { score: 0, max: 20, weight: 0.2 },
  Headers: { score: 0, max: 15, weight: 0.15 },
  CSP: { score: 0, max: 10, weight: 0.1 }
};

// Security check functions
async function runSecurityChecks() {
  console.log('\ud83d\ude80 Running Security Checks...');
  console.log('='.repeat(50));

  // JWT Security Check
  await checkJWTConfiguration();
  await checkJWTImplementation();

  // API Security Check
  await checkAPIRateLimiting();
  await checkAPICORSConfiguration();

  // Encryption Security Check
  await checkEncryptionConfiguration();
  await checkEncryptionImplementation();

  // Security Headers Check
  await checkSecurityHeaders();

  // CSP Check
  await checkCSPConfiguration();

  // Calculate overall score
  calculateOverallScore();

  // Generate recommendations
  generateRecommendations();

  // Output results
  outputResults();
}

// JWT Security Checks
async function checkJWTConfiguration() {
  const check = {
    name: 'JWT Configuration',
    passed: true,
    score: 0,
    details: [],
    recommendations: []
  };

  // Check JWT secret
  if (!process.env.JWT_SECRET) {
    check.passed = false;
    check.details.push('JWT_SECRET not set in environment variables');
  } else if (process.env.JWT_SECRET.length < 64) {
    check.passed = false;
    check.details.push('JWT_SECRET should be at least 64 characters long for RS256');
  } else {
    check.score += 10;
    check.details.push('JWT_SECRET is properly configured');
  }

  // Check JWT expiration
  if (securityConfig.jwt.expiresIn === '15m') {
    check.score += 10;
    check.details.push('JWT expiration is set to secure 15 minutes');
  } else {
    check.passed = false;
    check.details.push('JWT expiration should be 15 minutes for better security');
  }

  // Check JWT algorithm
  if (securityConfig.jwt.algorithm === 'RS256') {
    check.score += 10;
    check.details.push('JWT algorithm is set to secure RS256');
  } else {
    check.passed = false;
    check.details.push('JWT algorithm should be RS256 for better security');
  }

  results.checks.push(check);
  categories.JWT.score = check.score;
}

async function checkJWTImplementation() {
  const check = {
    name: 'JWT Implementation',
    passed: true,
    score: 0,
    details: [],
    recommendations: []
  };

  // Check for JWT usage in code
  const jwtUsage = await checkFileForPattern('server/server.js', /jwt|jsonwebtoken/gi);
  if (jwtUsage.found) {
    check.score += 10;
    check.details.push('JWT implementation found in server');
  } else {
    check.passed = false;
    check.details.push('JWT implementation not found in server');
  }

  results.checks.push(check);
  categories.JWT.score += check.score;
}

// API Security Checks
async function checkAPIRateLimiting() {
  const check = {
    name: 'API Rate Limiting',
    passed: true,
    score: 0,
    details: [],
    recommendations: []
  };

  // Check rate limit configuration
  if (securityConfig.api.rateLimit.max === 50) {
    check.score += 10;
    check.details.push('Rate limit is set to secure 50 requests per 15 minutes');
  } else {
    check.passed = false;
    check.details.push('Rate limit should be 50 requests per 15 minutes');
  }

  // Check rate limit window
  if (securityConfig.api.rateLimit.windowMs === 900000) {
    check.score += 5;
    check.details.push('Rate limit window is set to secure 15 minutes');
  } else {
    check.passed = false;
    check.details.push('Rate limit window should be 15 minutes');
  }

  // Check rate limit handler
  if (securityConfig.api.rateLimit.handler) {
    check.score += 5;
    check.details.push('Custom rate limit handler is implemented');
  } else {
    check.passed = false;
    check.details.push('Custom rate limit handler should be implemented');
  }

  results.checks.push(check);
  categories.API.score = check.score;
}

async function checkAPICORSConfiguration() {
  const check = {
    name: 'CORS Configuration',
    passed: true,
    score: 0,
    details: [],
    recommendations: []
  };

  // Check CORS configuration
  const corsConfig = securityConfig.api.cors;
  if (corsConfig.origin && Array.isArray(corsConfig.origin)) {
    check.score += 5;
    check.details.push('CORS origin is properly configured');
  } else {
    check.passed = false;
    check.details.push('CORS origin should be properly configured');
  }

  if (corsConfig.credentials === true) {
    check.score += 5;
    check.details.push('CORS credentials are properly configured');
  } else {
    check.passed = false;
    check.details.push('CORS credentials should be enabled');
  }

  if (corsConfig.methods && corsConfig.methods.length > 0) {
    check.score += 5;
    check.details.push('CORS methods are properly configured');
  } else {
    check.passed = false;
    check.details.push('CORS methods should be properly configured');
  }

  results.checks.push(check);
  categories.API.score += check.score;
}

// Encryption Security Checks
async function checkEncryptionConfiguration() {
  const check = {
    name: 'Encryption Configuration',
    passed: true,
    score: 0,
    details: [],
    recommendations: []
  };

  // Check encryption algorithm
  if (securityConfig.encryption.algorithm === 'aes-256-gcm') {
    check.score += 5;
    check.details.push('Encryption algorithm is set to secure AES-256-GCM');
  } else {
    check.passed = false;
    check.details.push('Encryption algorithm should be AES-256-GCM');
  }

  // Check encryption key length
  if (securityConfig.encryption.keyLength === 32) {
    check.score += 5;
    check.details.push('Encryption key length is set to secure 256 bits');
  } else {
    check.passed = false;
    check.details.push('Encryption key length should be 32 bytes (256 bits)');
  }

  // Check key derivation
  if (securityConfig.encryption.keyDerivation.enabled) {
    check.score += 5;
    check.details.push('Key derivation is enabled for better security');
  } else {
    check.passed = false;
    check.details.push('Key derivation should be enabled for better security');
  }

  // Check key derivation iterations
  if (securityConfig.encryption.keyDerivation.iterations >= 100000) {
    check.score += 5;
    check.details.push('Key derivation iterations are set to secure 100,000+');
  } else {
    check.passed = false;
    check.details.push('Key derivation iterations should be at least 100,000');
  }

  results.checks.push(check);
  categories.Encryption.score = check.score;
}

async function checkEncryptionImplementation() {
  const check = {
    name: 'Encryption Implementation',
    passed: true,
    score: 0,
    details: [],
    recommendations: []
  };

  // Check for encryption usage in code
  const encryptionUsage = await checkFileForPattern('server/server.js', /encrypt|decrypt|crypto/gi);
  if (encryptionUsage.found) {
    check.score += 5;
    check.details.push('Encryption implementation found in server');
  } else {
    check.passed = false;
    check.details.push('Encryption implementation not found in server');
  }

  results.checks.push(check);
  categories.Encryption.score += check.score;
}

// Security Headers Checks
async function checkSecurityHeaders() {
  const check = {
    name: 'Security Headers',
    passed: true,
    score: 0,
    details: [],
    recommendations: []
  };

  // Check security headers configuration
  const headers = securityConfig.headers;
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Strict-Transport-Security'
  ];

  requiredHeaders.forEach(header => {
    if (headers[header]) {
      check.score += 3;
      check.details.push(`${header} header is configured`);
    } else {
      check.passed = false;
      check.details.push(`${header} header is missing`);
    }
  });

  results.checks.push(check);
  categories.Headers.score = check.score;
}

// CSP Checks
async function checkCSPConfiguration() {
  const check = {
    name: 'Content Security Policy',
    passed: true,
    score: 0,
    details: [],
    recommendations: []
  };

  // Check CSP configuration
  if (securityConfig.csp.enabled) {
    check.score += 5;
    check.details.push('CSP is enabled');
  } else {
    check.passed = false;
    check.details.push('CSP should be enabled');
  }

  // Check CSP directives
  const requiredDirectives = [
    'defaultSrc',
    'scriptSrc',
    'styleSrc',
    'imgSrc',
    'connectSrc',
    'frameSrc'
  ];

  requiredDirectives.forEach(directive => {
    if (securityConfig.csp.directives[directive]) {
      check.score += 1;
      check.details.push(`${directive} directive is configured`);
    } else {
      check.passed = false;
      check.details.push(`${directive} directive is missing`);
    }
  });

  results.checks.push(check);
  categories.CSP.score = check.score;
}

// Helper functions
async function checkFileForPattern(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = pattern.test(content);
    return { found, content: content.substring(0, 100) };
  } catch (error) {
    return { found: false, error: error.message };
  }
}

function calculateOverallScore() {
  const totalWeight = Object.values(categories).reduce((sum, category) => sum + category.weight, 0);
  let totalScore = 0;

  Object.values(categories).forEach(category => {
    totalScore += (category.score / category.max) * category.weight;
  });

  results.overallScore = Math.round(totalScore * 100);
  results.status = results.overallScore >= 80 ? 'secure' : 'needs-improvement';
}

function generateRecommendations() {
  results.checks.forEach(check => {
    if (!check.passed) {
      results.recommendations.push(...check.recommendations);
    }
  });

  // Add general recommendations
  if (results.overallScore < 80) {
    results.recommendations.push(
      'Consider implementing additional security measures',
      'Regularly update dependencies and security patches',
      'Implement security monitoring and logging',
      'Conduct regular security audits and penetration testing'
    );
  }
}

function outputResults() {
  console.log('\ud83d\udcca Security Check Results');
  console.log('='.repeat(50));
  console.log(`\ud83d\udcca Overall Security Score: ${results.overallScore}/100`);
  console.log(`\ud83d\udcca Status: ${results.status}`);
  console.log();

  // Output detailed results
  results.checks.forEach(check => {
    console.log(`\ud83d\udd0d ${check.name}: ${check.passed ? '\u2705 Passed' : '\u274c Failed'} (${check.score}/20)`);
    check.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
    console.log();
  });

  // Output recommendations
  if (results.recommendations.length > 0) {
    console.log('\ud83d\udca1 Security Recommendations:');
    console.log('-'.repeat(30));
    results.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    console.log();
  }

  // Output summary
  console.log('\ud83d\udccb Summary:');
  console.log(`   JWT Security: ${categories.JWT.score}/30`);
  console.log(`   API Security: ${categories.API.score}/25`);
  console.log(`   Encryption: ${categories.Encryption.score}/20`);
  console.log(`   Security Headers: ${categories.Headers.score}/15`);
  console.log(`   CSP: ${categories.CSP.score}/10`);
  console.log();
}

// Run the security checks
runSecurityChecks().catch(error => {
  console.error('\u274c Security check failed:', error);
  process.exit(1);
});