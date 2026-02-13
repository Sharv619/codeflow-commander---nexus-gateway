/**
 * Security Configuration for Codeflow Commander - Nexus Gateway
 * Implements security best practices and key management
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Security configuration
const securityConfig = {
// JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || generateSecureSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m', // Reduced from 24h for better security
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Added refresh token
    algorithm: 'RS256', // Changed to asymmetric encryption for better security
    blacklist: {
      enabled: process.env.JWT_BLACKLIST_ENABLED === 'true',
      store: process.env.JWT_BLACKLIST_STORE || 'memory' // Could be 'redis' for production
    }
  },
  
// API Security
  api: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50, // Reduced from 100 for better security
      message: 'Too many requests from this IP, please try again later.',
      skipSuccessfulRequests: false, // Count all requests
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Please try again later',
          retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 60000)
        });
      }
    },
    cors: {
      origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:8080'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    }
  },
  
// Content Security Policy
  csp: {
    enabled: process.env.CSP_ENABLED === 'true',
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "wss://"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      sandbox: ["allow-scripts", "allow-same-origin"],
      reportUri: process.env.CSP_REPORT_URI || '/csp-report-endpoint'
    }
  },
  
// Encryption Configuration
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    keyDerivation: {
      enabled: process.env.ENCRYPTION_KEY_DERIVATION === 'true',
      algorithm: 'pbkdf2',
      iterations: parseInt(process.env.ENCRYPTION_ITERATIONS) || 100000,
      saltLength: 16
    }
  },
  
// Security Headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-Download-Options': 'noopen',
    'X-Powered-By': 'Codeflow Commander'
  }
};

/**
 * Generate a cryptographically secure secret key
 */
function generateSecureSecret() {
  // Use crypto.randomUUID for better security
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

/**
 * Generate cryptographically secure API keys
 */
function generateApiKey() {
  return 'ak_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Generate cryptographically secure JWT secrets
 */
function generateJwtSecret() {
  return {
    privateKey: crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }).privateKey,
    publicKey: crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }).publicKey
  };
}

/**
 * Validate security configuration
 */
function validateSecurityConfig() {
  const issues = [];

  // Check JWT secret
  if (!process.env.JWT_SECRET) {
    issues.push('JWT_SECRET not set in environment variables');
  } else if (process.env.JWT_SECRET.length < 64) {
    issues.push('JWT_SECRET should be at least 64 characters long for RS256');
  }

  // Check API keys
  if (!process.env.GEMINI_API_KEY) {
    issues.push('GEMINI_API_KEY not set in environment variables');
  } else if (process.env.GEMINI_API_KEY.length < 32) {
    issues.push('GEMINI_API_KEY should be at least 32 characters long');
  }

  // Check rate limiting
  if (process.env.RATE_LIMIT_MAX_REQUESTS && parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) > 500) {
    issues.push('Rate limit too high, consider reducing for security');
  }

  // Check encryption key
  if (!process.env.ENCRYPTION_KEY) {
    issues.push('ENCRYPTION_KEY not set in environment variables');
  } else if (process.env.ENCRYPTION_KEY.length < 32) {
    issues.push('ENCRYPTION_KEY should be at least 32 characters long');
  }

  // Check CSP configuration
  if (process.env.CSP_ENABLED === 'true' && !process.env.CSP_REPORT_URI) {
    issues.push('CSP_REPORT_URI should be set when CSP is enabled');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Encrypt sensitive data
 */
function encrypt(text, key = process.env.ENCRYPTION_KEY) {
  if (!key) {
    throw new Error('Encryption key not provided');
  }

  const algorithm = securityConfig.encryption.algorithm;
  const iv = crypto.randomBytes(securityConfig.encryption.ivLength);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
  if (!key) {
    throw new Error('Decryption key not provided');
  }

  const algorithm = securityConfig.encryption.algorithm;
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(encryptedData.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate API key
 */
function generateApiKey() {
  return 'ak_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Validate API key
 */
function validateApiKey(apiKey) {
  // Implement your API key validation logic here
  // This could check against a database, environment variables, etc.
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}

/**
 * Hash password using bcrypt with configurable salt rounds
 */
function hashPassword(password, saltRounds = 12) {
  const bcrypt = require('bcrypt');
  return bcrypt.hashSync(password, saltRounds);
}

/**
 * Verify password
 */
function verifyPassword(password, hash) {
  const bcrypt = require('bcrypt');
  return bcrypt.compareSync(password, hash);
}

/**
 * Generate cryptographically secure random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Security middleware for Express
 */
function securityMiddleware(req, res, next) {
  // Apply CSP headers
  if (securityConfig.csp.enabled) {
    const cspDirectives = Object.entries(securityConfig.csp.directives)
      .map(([key, value]) => `${key} ${Array.isArray(value) ? value.join(' ') : value}`)
      .join('; ');

    res.setHeader('Content-Security-Policy', cspDirectives);
  }

  // Apply security headers
  Object.entries(securityConfig.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Rate limiting headers
  const rateLimit = securityConfig.api.rateLimit;
  if (rateLimit) {
    res.setHeader('X-RateLimit-Limit', rateLimit.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimit.max - 1));
    res.setHeader('X-RateLimit-Reset', Date.now() + rateLimit.windowMs);
  }

  // Check for API key if required
  if (process.env.REQUIRE_API_KEY === 'true') {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Validate API key (implement your validation logic)
    if (!validateApiKey(apiKey)) {
      return res.status(403).json({ error: 'Invalid API key' });
    }
  }

  // Security logging
  const logger = require('@/utils/logger');
  logger.info('Security middleware applied', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: req.originalUrl
  });

  next();
}

/**
 * Validate API key (placeholder implementation)
 */
function validateApiKey(apiKey) {
  // Implement your API key validation logic here
  // This could check against a database, environment variables, etc.
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}

module.exports = {
  securityConfig,
  validateSecurityConfig,
  encrypt,
  decrypt,
  generateApiKey,
  hashPassword,
  verifyPassword,
  securityMiddleware,
  generateSecureSecret
};
