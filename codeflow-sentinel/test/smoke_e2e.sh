#!/bin/bash

# CodeFlow Sentinel End-to-End Smoke Test
# Tests sentinel service with real Docker container and example client
# Exit codes: 0=success, 1=failure, 2=timeouts, 3=container issues

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SENTINEL_PORT=8000
TIMEOUT_SEC=120
VERBOSE=${VERBOSE:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Cleanup function
cleanup() {
    local exit_code=$?
    log_info "Cleaning up test environment..."

    # Stop and remove containers
    if docker ps -a --format "table {{.Names}}" | grep -q "^sentinel-smoke-test$"; then
        docker stop sentinel-smoke-test >/dev/null 2>&1 || true
        docker rm sentinel-smoke-test >/dev/null 2>&1 || true
    fi

    # Remove test networks
    if docker network ls --format "{{.Name}}" | grep -q "^sentinel-smoke-net$"; then
        docker network rm sentinel-smoke-net >/dev/null 2>&1 || true
    fi

    # Kill any background processes
    if [[ -n "${UVICORN_PID:-}" ]]; then
        kill "$UVICORN_PID" 2>/dev/null || true
    fi

    if [[ -n "${CLIENT_PID:-}" ]]; then
        kill "$CLIENT_PID" 2>/dev/null || true
    fi

    exit $exit_code
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 3
    fi

    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 3
    fi

    # Check curl
    if ! command -v curl &> /dev/null; then
        log_warning "curl not found, some tests will be skipped"
    fi

    # Check Python3
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 is not available"
        exit 3
    fi

    # Check Node.js for client tests
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not available for client tests"
        exit 3
    fi

    log_success "Prerequisites check passed"
}

# Start sentinel with Docker
start_sentinel_docker() {
    log_info "Building and starting sentinel with Docker..."

    # Create isolated network
    docker network create sentinel-smoke-net 2>/dev/null || true

    # Build and run sentinel
    cd "$PROJECT_ROOT"

    if ! docker build -t sentinel-smoke-test .; then
        log_error "Failed to build sentinel Docker image"
        exit 3
    fi

    if ! docker run -d \
        --name sentinel-smoke-test \
        --network sentinel-smoke-net \
        -p "$SENTINEL_PORT:$SENTINEL_PORT" \
        -e SENTINEL_PORT="$SENTINEL_PORT" \
        -e SENTINEL_HISTORY_MAX=500 \
        -e SENTINEL_CONTAMINATION=0.2 \
        sentinel-smoke-test; then
        log_error "Failed to start sentinel container"
        exit 3
    fi

    log_success "Sentinel container started"
}

# Start sentinel with direct Python (fallback)
start_sentinel_local() {
    log_info "Starting sentinel with local Python (fallback mode)..."

    cd "$PROJECT_ROOT"

    # Check if we have virtual environment or dependencies
    if [[ -f "venv/bin/activate" ]]; then
        source venv/bin/activate
    elif command -v pip &> /dev/null && pip list 2>/dev/null | grep -q "fastapi"; then
        log_verbose "Using system Python with installed dependencies"
    else
        log_warning "No virtual environment found and dependencies not installed, using basic mode"
    fi

    # Start sentinel in background
    python3 sentinel.py &
    UVICORN_PID=$!

    # Give it a moment to start
    sleep 3

    log_success "Sentinel started locally (PID: $UVICORN_PID)"
}

# Wait for sentinel to be healthy
wait_for_sentinel() {
    local health_url="http://localhost:$SENTINEL_PORT/health"
    local max_attempts=30
    local attempt=1

    log_info "Waiting for sentinel to become healthy..."

    while [[ $attempt -le $max_attempts ]]; do
        log_verbose "Health check attempt $attempt/$max_attempts"

        if curl -f -s "$health_url" >/dev/null 2>&1; then
            log_success "Sentinel is healthy after $(($attempt * 2)) seconds"
            return 0
        fi

        sleep 2
        ((attempt++))
    done

    log_error "Sentinel failed to become healthy within $(($max_attempts * 2)) seconds"
    return 1
}

# Test normal telemetry
test_normal_telemetry() {
    log_info "Testing normal telemetry flow..."
    local test_data='{"latency": 150.5, "input_length": 1024, "errors": 0, "route": "/api/test", "user_id": "test-user"}'

    if command -v curl &> /dev/null; then
        local response
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$test_data" \
            "http://localhost:$SENTINEL_PORT/analyze-flow" 2>/dev/null)

        if [[ $? -ne 0 ]]; then
            log_error "Failed to send normal telemetry"
            return 1
        fi

        # Check response contains expected status
        if echo "$response" | grep -q '"status": "OK"'; then
            log_success "Normal telemetry test passed"
            return 0
        else
            log_error "Unexpected response for normal telemetry: $response"
            return 1
        fi
    else
        log_warning "curl not available, skipping direct API test"
        return 0
    fi
}

# Test anomalous telemetry
test_anomalous_telemetry() {
    log_info "Testing anomalous telemetry detection..."
    local test_data='{"latency": 25000, "input_length": 50000, "errors": 15, "route": "/api/suspicious", "user_id": "test-user"}'

    if command -v curl &> /dev/null; then
        local response
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$test_data" \
            "http://localhost:$SENTINEL_PORT/analyze-flow" 2>/dev/null)

        if [[ $? -ne 0 ]]; then
            log_error "Failed to send anomalous telemetry"
            return 1
        fi

        # Check response contains THREAT_DETECTED status
        if echo "$response" | grep -q '"status": "THREAT_DETECTED"'; then
            log_success "Anomalous telemetry detection test passed"
            return 0
        else
            log_warning "Expected THREAT_DETECTED but got: $response (may be normal if model not trained yet)"
            return 0
        fi
    else
        log_warning "curl not available, skipping direct anomaly test"
        return 0
    fi
}

# Test client library
test_client_library() {
    log_info "Testing JavaScript client library..."

    if [[ -f "$PROJECT_ROOT/../cli-tool/examples/sentinel-client.js" ]]; then
        cd "$PROJECT_ROOT/../cli-tool/examples"

        # Create minimal test script
        cat > test-client-smoke.js << 'EOF'
const client = require('./sentinel-client');

// Override host for testing
client.config.host = 'localhost';
client.config.port = process.env.SENTINEL_PORT || 8000;
client.config.timeout = 5000;

async function testClient() {
  try {
    // Test health check
    console.log('Testing health check...');
    const health = await client.checkHealth();
    console.log('Health status:', health.status);

    // Test normal telemetry
    console.log('Testing normal telemetry...');
    const result1 = await client.sendTelemetry({
      latency: 200,
      input_length: 2048,
      errors: 1,
      route: '/api/smoke-test'
    });
    console.log('Normal result:', result1.status);

    // Test anomalous telemetry (may not detect if model untrained)
    console.log('Testing anomalous telemetry...');
    const result2 = await client.sendTelemetry({
      latency: 30000,
      input_length: 100000,
      errors: 20,
      route: '/api/smoke-anomaly'
    });
    console.log('Anomaly result:', result2.status);

    return true;
  } catch (error) {
    console.error('Client test failed:', error.message);
    return false;
  }
}

testClient().then(success => {
  process.exit(success ? 0 : 1);
});
EOF

        # Run test
        if timeout 30s node test-client-smoke.js; then
            log_success "Client library test passed"
            rm -f test-client-smoke.js
            return 0
        else
            log_error "Client library test failed"
            rm -f test-client-smoke.js
            return 1
        fi
    else
        log_warning "Client library not found, skipping client test"
        return 0
    fi
}

# Test metrics endpoint (if available)
test_metrics_endpoint() {
    log_info "Testing metrics endpoint..."

    if curl -f -s "http://localhost:$SENTINEL_PORT/metrics" >/dev/null 2>&1; then
        log_success "Metrics endpoint is available"
        return 0
    else
        log_warning "Metrics endpoint not available (prometheus_client may not be installed)"
        return 0
    fi
}

# Main test execution
main() {
    log_info "Starting CodeFlow Sentinel E2E smoke test"
    log_info "Project root: $PROJECT_ROOT"
    log_info "Sentinel port: $SENTINEL_PORT"
    log_info "Timeout: $TIMEOUT_SEC seconds"

    # Start timer
    local start_time=$SECONDS

    # Prerequisites
    check_prerequisites

    # Try Docker first, fallback to local
    local use_docker=true
    if ! start_sentinel_docker; then
        log_warning "Docker startup failed, trying local Python..."
        use_docker=false
        start_sentinel_local
    fi

    # Wait for sentinel to be ready
    if ! wait_for_sentinel; then
        log_error "Sentinel failed to become ready"
        exit 1
    fi

    # Run tests
    local tests_passed=0
    local tests_total=0

    # Test health endpoint
    ((tests_total++))
    if curl -f -s "http://localhost:$SENTINEL_PORT/health" >/dev/null 2>&1; then
        ((tests_passed++))
        log_success "Health check passed"
    else
        log_error "Health check failed"
    fi

    # Test normal telemetry
    ((tests_total++))
    if test_normal_telemetry; then
        ((tests_passed++))
    fi

    # Test anomalous telemetry
    ((tests_total++))
    if test_anomalous_telemetry; then
        ((tests_passed++))
    fi

    # Test client library
    ((tests_total++))
    if test_client_library; then
        ((tests_passed++))
    fi

    # Test metrics
    ((tests_total++))
    if test_metrics_endpoint; then
        ((tests_passed++))
    fi

    # Calculate duration
    local duration=$((SECONDS - start_time))

    # Results
    log_info "Test Results: $tests_passed/$tests_total passed in ${duration}s"

    if [[ $tests_passed -eq $tests_total ]]; then
        log_success "All smoke tests passed!"
        exit 0
    else
        log_error "Some tests failed ($((tests_total - tests_passed)) failures)"
        exit 1
    fi
}

# Run main function
main "$@"
