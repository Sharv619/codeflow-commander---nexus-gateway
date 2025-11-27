#!/usr/bin/env node

/**
 * CodeFlow Sentinel JavaScript Client
 * Provides telemetry submission functionality for the anomaly detection sidecar.
 *
 * Example usage:
 * const client = require('./sentinel-client');
 * const response = await client.sendTelemetry({
 *   latency: 150,
 *   input_length: 1024,
 *   errors: 0,
 *   route: '/api/process'
 * });
 */

const https = require('https');
const http = require('http');

/**
 * Configuration for the Sentinel client
 */
const SENTINEL_CONFIG = {
  host: process.env.SENTINEL_HOST || 'localhost',
  port: parseInt(process.env.SENTINEL_PORT || '8000', 10),
  timeout: parseInt(process.env.SENTINEL_TIMEOUT || '5000', 10), // 5s default timeout
  retries: parseInt(process.env.SENTINEL_RETRIES || '2', 10),
  useHttps: process.env.SENTINEL_USE_HTTPS === 'true'
};

/**
 * Send telemetry data to CodeFlow Sentinel for anomaly detection
 *
 * @param {Object} telemetry - Telemetry data object
 * @param {number} telemetry.latency - Request latency in milliseconds
 * @param {number} telemetry.input_length - Length of input data
 * @param {number} telemetry.errors - Number of errors encountered
 * @param {string} telemetry.route - API route or endpoint path
 * @param {string} [telemetry.user_id] - Optional user identifier
 * @param {Date|string} [telemetry.timestamp] - Optional timestamp
 *
 * @returns {Promise<Object>} Analysis response from sentinel
 * @returns {string} response.status - "OK" or "THREAT_DETECTED"
 * @returns {string} [response.action] - Recommended action (e.g., "freeze")
 * @returns {string} [response.reason] - Explanation for anomaly detection
 */
async function sendTelemetry(telemetry) {
  // Validate input
  const requiredFields = ['latency', 'input_length', 'errors', 'route'];
  const missing = requiredFields.filter(field => telemetry[field] === undefined);

  if (missing.length > 0) {
    throw new Error(`Missing required telemetry fields: ${missing.join(', ')}`);
  }

  // Prepare data
  const data = {
    latency: parseFloat(telemetry.latency),
    input_length: parseInt(telemetry.input_length, 10),
    errors: parseInt(telemetry.errors, 10),
    route: String(telemetry.route),
    user_id: telemetry.user_id ? String(telemetry.user_id) : undefined,
    timestamp: telemetry.timestamp instanceof Date ?
      telemetry.timestamp.toISOString() : telemetry.timestamp
  };

  let lastError = null;

  // Retry logic
  for (let attempt = 0; attempt <= SENTINEL_CONFIG.retries; attempt++) {
    try {
      const response = await makeRequest(data);
      const result = JSON.parse(response);

      // Log anomalous results
      if (result.status === 'THREAT_DETECTED') {
        console.warn(`[SENTINEL] Threat detected: ${result.reason}`);
        if (result.action) {
          console.warn(`[SENTINEL] Recommended action: ${result.action}`);
        }
      } else {
        console.debug(`[SENTINEL] Telemetry accepted: ${data.route}`);
      }

      return result;

    } catch (error) {
      lastError = error;
      console.warn(`[SENTINEL] Attempt ${attempt + 1} failed: ${error.message}`);

      // Don't retry on client errors (4xx)
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < SENTINEL_CONFIG.retries) {
        await sleep(Math.pow(2, attempt) * 100);
      }
    }
  }

  // If we get here, all retries failed
  console.error(`[SENTINEL] All retry attempts failed: ${lastError.message}`);
  throw new Error(`Sentinel communication failed after ${SENTINEL_CONFIG.retries + 1} attempts: ${lastError.message}`);
}

/**
 * Make HTTP request to sentinel service
 * @param {Object} data - Telemetry payload
 * @returns {Promise<string>} Response body
 */
function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SENTINEL_CONFIG.host,
      port: SENTINEL_CONFIG.port,
      path: '/analyze-flow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CodeFlow-Sentinel-Client/1.0.0'
      },
      timeout: SENTINEL_CONFIG.timeout
    };

    const protocol = SENTINEL_CONFIG.useHttps ? https : http;
    const req = protocol.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          const error = new Error(`HTTP ${res.statusCode}: ${body}`);
          error.statusCode = res.statusCode;
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check sentinel health
 * @returns {Promise<Object>} Health status
 */
async function checkHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SENTINEL_CONFIG.host,
      port: SENTINEL_CONFIG.port,
      path: '/health',
      method: 'GET',
      timeout: SENTINEL_CONFIG.timeout
    };

    const protocol = SENTINEL_CONFIG.useHttps ? https : http;
    const req = protocol.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error('Invalid JSON response from health check'));
          }
        } else {
          reject(new Error(`Health check failed: HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });

    req.end();
  });
}

/**
 * Example usage in codeflow-hook.js integration:
 *
 * // In codeflow-hook.js
 * const { sendTelemetry } = require('./examples/sentinel-client');
 *
 * // During post-push hook execution
 * async function analyzePush(pushData) {
 *   try {
 *     const startTime = Date.now();
 *     // ... existing analysis logic ...
 *     const endTime = Date.now();
 *
 *     const telemetry = {
 *       latency: endTime - startTime,
 *       input_length: pushData.files?.length || 0,
 *       errors: pushData.errors || 0,
 *       route: '/git/push',
 *       user_id: pushData.user
 *     };
 *
 *     const response = await sendTelemetry(telemetry);
 *
 *     if (response.status === 'THREAT_DETECTED') {
 *       console.error('[SECURITY] Push blocked due to anomaly:', response.reason);
 *       process.exit(1); // Reject the push
 *     } else {
 *       console.log('[SECURITY] Push analysis completed successfully');
 *     }
 *
 *   } catch (error) {
 *     console.warn('[SENTINEL] Telemetry submission failed:', error.message);
 *     // Continue with push - fail open for availability
 *   }
 * }
 */

module.exports = {
  sendTelemetry,
  checkHealth,
  config: SENTINEL_CONFIG
};

// CLI usage example
if (require.main === module) {
  const exampleTelemetry = {
    latency: 150.5,
    input_length: 1024,
    errors: 0,
    route: '/api/example',
    user_id: 'test-user',
    timestamp: new Date().toISOString()
  };

  console.log('Testing CodeFlow Sentinel client...');
  console.log('Sending telemetry:', JSON.stringify(exampleTelemetry, null, 2));

  sendTelemetry(exampleTelemetry)
    .then(result => {
      console.log('Response:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
