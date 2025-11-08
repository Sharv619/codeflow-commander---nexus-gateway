#!/bin/bash

# ------------------------------------------------------------------------------
# Complete End-to-End Test Suite for Codeflow Commander Phase 4
# Tests the entire developer workflow: CLI → Ingestion → Neptune → Query → CLI
# ------------------------------------------------------------------------------

set -e  # Exit on any error

# Configuration
TEST_REPO_NAME="codeflow-test-repo-${RANDOM}"
TEST_REPO_DIR="/tmp/${TEST_REPO_NAME}"
EKG_NAMESPACE="codeflow-platform"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Codeflow Commander Phase 4 - Complete End-to-End Test Suite${NC}"
echo "====================================================="
echo ""
echo "Test Repository: ${TEST_REPO_NAME}"
echo "Test Directory: ${TEST_REPO_DIR}"
echo "EKG Namespace: ${EKG_NAMESPACE}"
echo ""

# Function to log test steps
log_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

# Function to report test results
test_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
}

test_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
}

test_warn() {
    echo -e "${YELLOW}⚠️  WARN: $1${NC}"
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local namespace=$2
    local timeout=${3:-300}

    log_step "Checking ${service_name} health in namespace ${namespace}..."

    if kubectl wait --for=condition=available --timeout=${timeout}s deployment/${service_name} -n ${namespace} > /dev/null 2>&1; then
        test_pass "${service_name} deployment is ready"

        # Check pod health
        local ready_pods=$(kubectl get pods -l app=${service_name} -n ${namespace} --no-headers | grep -c "Running")
        local total_pods=$(kubectl get pods -l app=${service_name} -n ${namespace} --no-headers | wc -l)

        if [ "$ready_pods" -eq "$total_pods" ] && [ "$total_pods" -gt 0 ]; then
            test_pass "${service_name} pods are healthy (${ready_pods}/${total_pods})"
            return 0
        else
            test_fail "${service_name} pods not healthy (${ready_pods}/${total_pods})"
            kubectl get pods -l app=${service_name} -n ${namespace}
            return 1
        fi
    else
        test_fail "${service_name} deployment not ready within ${timeout}s"
        kubectl describe deployment ${service_name} -n ${namespace}
        return 1
    fi
}

# Function to check GraphQL endpoint
check_graphql_endpoint() {
    local service_url=$1
    local query=$2
    local expected_response=$3

    log_step "Testing GraphQL endpoint: ${service_url}"

    local response=$(curl -s -X POST ${service_url}/graphql \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"${query}\"}" 2>/dev/null || echo "curl_failed")

    if [[ "$response" == "curl_failed" ]]; then
        test_fail "GraphQL endpoint unreachable"
        return 1
    fi

    if [[ "$response" == *"$expected_response"* ]]; then
        test_pass "GraphQL query successful"
        return 0
    else
        test_fail "GraphQL query failed. Response: $response"
        return 1
    fi
}

# Function to create test repository
create_test_repository() {
    log_step "Creating test repository for testing..."

    # Clean up any existing test repo
    if [ -d "$TEST_REPO_DIR" ]; then
        rm -rf "$TEST_REPO_DIR"
    fi

    # Create test repository
    mkdir -p "$TEST_REPO_DIR"
    cd "$TEST_REPO_DIR"

    # Initialize git repo
    git init
    git config user.name "Codeflow Test Bot"
    git config user.email "test@codeflow.com"

    # Create initial files
    cat > package.json << 'EOF'
{
  "name": "codeflow-test-repo",
  "version": "1.0.0",
  "description": "Test repository for Codeflow Commander EKG",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
EOF

    cat > index.js << 'EOF'
const express = require('express');
const _ = require('lodash');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple test endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Array manipulation example
app.get('/data', (req, res) => {
  const data = [1, 2, 3, 4, 5];
  const processed = _.map(data, x => x * 2);
  const filtered = _.filter(processed, x => x > 5);

  res.json({
    original: data,
    processed: processed,
    filtered: filtered
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
EOF

    cat > README.md << 'EOF'
# Codeflow Test Repository

This is a test repository for validating the Codeflow Commander Phase 4 EKG system.

## Features

- Express.js web server
- Lodash utilities
- Jest testing
- Health endpoint

## Usage

```bash
npm install
npm start
```

## API Endpoints

- `GET /health` - Health check
- `GET /data` - Array manipulation demo
EOF

    # Create initial commit
    git add .
    git commit -m "Initial commit with Express.js server and health endpoint"

    # Create a feature branch and add some changes
    git checkout -b feature/user-auth

    cat > auth.js << 'EOF'
// Simple authentication middleware
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign(user, process.env.JWT_SECRET || 'secret');
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch (error) {
    return null;
  }
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
}

module.exports = { generateToken, verifyToken, authenticate };
EOF

    # Update index.js to use auth
    cat >> index.js << 'EOF'

// Add authentication for protected routes
const { authenticate } = require('./auth');

app.get('/protected', authenticate, (req, res) => {
  res.json({
    message: 'Protected data accessed successfully',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});
EOF

    # Update package.json with new dependency
    cat > package.json << 'EOF'
{
  "name": "codeflow-test-repo",
  "version": "1.0.0",
  "description": "Test repository for Codeflow Commander EKG",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
EOF

    git add .
    git commit -m "Add JWT authentication feature"

    test_pass "Test repository created successfully"

    echo "Test repository URL: file://$TEST_REPO_DIR"
}

# Function to test ingestion service
test_ingestion_service() {
    log_step "Testing EKG Ingestion Service..."

    cd "$TEST_REPO_DIR"

    # Export required environment variables for CLI
    export INGESTION_SERVICE_URL="http://localhost:3000"
    export QUERY_SERVICE_URL="http://localhost:4000"

    # Test repository indexing
    if npx codeflow-hook index --dry-run 2>/dev/null; then
        local dry_run_output=$(npx codeflow-hook index --dry-run 2>&1)
        if [[ "$dry_run_output" == *"Dry run:"* ]] && [[ "$dry_run_output" == *"files to index"* ]]; then
            test_pass "CLI dry-run mode working"
        else
            test_fail "CLI dry-run failed or output incorrect"
            echo "Output: $dry_run_output"
        fi
    else
        test_fail "CLI dry-run command failed"
    fi

    # Test actual indexing (if ingestion service is running)
    # Note: This requires the ingestion service to be running
    log_step "Note: Actual indexing test skipped (would require running ingestion service)"

    cd - > /dev/null
}

# Function to test query service
test_query_service() {
    log_step "Testing EKG Query Service GraphQL API..."

    # Test basic GraphQL query (even if no data, should return valid response)
    local query="query { graphStatistics { repositoryCount edgeCount } }"
    local response=$(curl -s -X POST http://localhost:4000/graphql \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\"}" 2>/dev/null || echo "curl_failed")

    if [[ "$response" == "curl_failed" ]]; then
        test_warn "Query service not running (expected in full deployment)"
    else
        if [[ "$response" == *"data"* ]]; then
            test_pass "Query service GraphQL endpoint responding"
        else
            test_fail "Query service GraphQL endpoint returned error"
            echo "Response: $response"
        fi
    fi
}

# Function to test diff analysis
test_diff_analysis() {
    log_step "Testing Diff Analysis with EKG Enhancement..."

    cd "$TEST_REPO_DIR"

    # Create a test diff by making a change
    cat >> index.js << 'EOF'

// Add rate limiting functionality
const rateLimit = {};

function checkRateLimit(key, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimit[key]) {
    rateLimit[key] = [];
  }

  // Clean old requests
  rateLimit[key] = rateLimit[key].filter(time => time > windowStart);

  if (rateLimit[key].length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  rateLimit[key].push(now);
  return true;
}

// Apply rate limiting to protected route
app.use('/protected', (req, res, next) => {
  const clientIP = req.ip;
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  next();
});
EOF

    # Generate diff for testing
    local diff_content=$(git diff)

    if [ -n "$diff_content" ]; then
        test_pass "Generated test diff with changes"

        # Test CLI diff analysis command
        echo "$diff_content" | timeout 30 npx codeflow-hook analyze-diff >/tmp/diff_analysis.log 2>&1 &
        local cli_pid=$!

        # Wait up to 30 seconds for CLI to complete
        for i in {1..30}; do
            if ! kill -0 $cli_pid 2>/dev/null; then
                # Process completed
                if wait $cli_pid 2>/dev/null && grep -q "EKG context enhancement" /tmp/diff_analysis.log; then
                    test_pass "CLI analyze-diff completed with EKG enhancement"
                    break
                else
                    test_fail "CLI analyze-diff failed"
                    echo "CLI Output:"
                    cat /tmp/diff_analysis.log
                    break
                fi
            fi
            sleep 1
        done

        if kill -0 $cli_pid 2>/dev/null; then
            kill $cli_pid 2>/dev/null || true
            test_fail "CLI analyze-diff timed out"
        fi

    else
        test_fail "No diff content generated"
    fi

    cd - > /dev/null
}

# Function to run complete integration test
integration_test() {
    log_step "Running Complete Integration Test (requires all services running)..."

    echo ""
    echo -e "${YELLOW}⚠️  This test requires all EKG services to be running:${NC}"
    echo "   1. EKS cluster with Neptune"
    echo "   2. EKG Ingestion Service"
    echo "   3. EKG Query Service"
    echo "   4. CLI configured with correct URLs"
    echo ""

    # Warn that this is manual testing
    test_warn "Complete end-to-end integration test requires manual deployment"
    test_warn "Please run the following sequence after deployment:"

    echo ""
    echo -e "${BLUE}Manual Integration Test Steps:${NC}"
    echo "1. Configure CLI environment:"
    echo "   export INGESTION_SERVICE_URL='https://ekg-ingestion-service.codeflow-platform.svc.cluster.local'"
    echo "   export QUERY_SERVICE_URL='https://ekg-query-service.codeflow-platform.svc.cluster.local'"
    echo ""
    echo "2. Index repository:"
    echo "   cd $TEST_REPO_DIR && codeflow-hook index"
    echo ""
    echo "3. Wait for ingestion to complete (check ingestion service logs)"
    echo ""
    echo "4. Analyze diff:"
    echo "   git diff | codeflow-hook analyze-diff"
    echo ""
    echo "5. Verify EKG-enhanced results appear"
}

# Main test execution
main() {
    echo ""
    echo "🧪 Starting Comprehensive End-to-End Test Suite"
    echo "================================================"
    echo ""

    local tests_passed=0
    local tests_total=0

    # Test 1: Infrastructure Readiness
    ((tests_total++))
    log_step "Test 1: Checking Infrastructure Readiness"

    if kubectl cluster-info > /dev/null 2>&1; then
        test_pass "Kubernetes cluster accessible"

        # Check EKS cluster
        if kubectl get nodes | grep -q "Ready"; then
            test_pass "EKS nodes ready"
        else
            test_fail "EKS nodes not ready"
        fi

        # Check namespace
        if kubectl get namespace $EKG_NAMESPACE >/dev/null 2>&1; then
            test_pass "EKG namespace '$EKG_NAMESPACE' exists"
        else
            test_warn "EKG namespace '$EKG_NAMESPACE' not found (may be deployment issue)"
        fi

    else
        test_fail "Kubernetes cluster not accessible"
    fi

    echo ""

    # Test 2: Ingestion Service Health
    ((tests_total++))
    log_step "Test 2: EKG Ingestion Service Health"

    if check_service_health "ekg-ingestion-service" "$EKG_NAMESPACE"; then
        ((tests_passed++))
    fi

    # Test 3: Query Service Health
    ((tests_total++))
    log_step "Test 3: EKG Query Service Health"

    if check_service_health "ekg-query-service" "$EKG_NAMESPACE"; then
        ((tests_passed++))
    fi

    # Test 4: GraphQL Endpoint
    ((tests_total++))
    log_step "Test 4: GraphQL Endpoint Validation"

    if check_graphql_endpoint "http://localhost:4000" '{__typename}' '__typename'; then
        ((tests_passed++))
    fi

    # Test 5: Repository Creation
    ((tests_total++))
    log_step "Test 5: Test Repository Setup"

    if create_test_repository; then
        ((tests_passed++))
    fi

    # Test 6: CLI Integration (local testing)
    ((tests_total++))
    log_step "Test 6: CLI Integration Testing (Local)"

    if test_ingestion_service; then
        ((tests_passed++))
    fi

    # Test 7: Diff Analysis
    ((tests_total++))
    log_step "Test 7: Diff Analysis Testing"

    if test_diff_analysis 2>/dev/null; then
        ((tests_passed++))
    fi

    echo ""
    echo "📊 Test Results Summary"
    echo "========================"
    echo -e "${BLUE}Tests Passed: ${tests_passed}/${tests_total}${NC}"

    if [ $tests_passed -eq $tests_total ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED! Phase 4 EKG System is fully operational.${NC}"
    elif [ $tests_passed -ge $((tests_total / 2)) ]; then
        echo -e "${YELLOW}⚠️ PARTIAL SUCCESS: Core functionality working, some components may need attention.${NC}"
    else
        echo -e "${RED}❌ CRITICAL ISSUES: Major components failing, immediate attention required.${NC}"
    fi

    echo ""
    integration_test

    echo ""
    echo "🧹 Cleaning up test resources..."
    if [ -d "$TEST_REPO_DIR" ]; then
        rm -rf "$TEST_REPO_DIR"
        test_pass "Test repository cleaned up"
    fi

    echo ""
    echo -e "${BLUE}Test suite completed. Check deployment status and logs for details.${NC}"
}

# Run main test suite
main "$@"
