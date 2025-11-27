#!/bin/bash

# ==============================================================================
# 🔍 CodeFlow Commander: Deep Service Monitoring & Health Check Suite
# ==============================================================================
# Run continuously in background to validate README claims and system integrity
# Monitors all 3 architecture layers: CLI, Enterprise, Simulator
# ==============================================================================

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
MONITOR_INTERVAL=60  # Check every 60 seconds
LOG_FILE="deep_monitor_$(date +%Y%m%d_%H%M%S).log"
PID_FILE="deep_monitor.pid"

# Signal handler for graceful shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down deep monitor...${NC}"
    if [ -f "$PID_FILE" ]; then
        rm -f "$PID_FILE"
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}=================================================================${NC}"
echo -e "${BLUE}       🔍  CODEFLOW COMMANDER: DEEP SERVICE MONITOR           ${NC}"
echo -e "${BLUE}       Background health validation and README verification     ${NC}"
echo -e "${BLUE}=================================================================${NC}"

# Save PID
echo $$ > "$PID_FILE"
echo -e "${GREEN}✅ Monitor started with PID: $$ ${NC}"
echo -e "${BLUE}📊 Logging to: $LOG_FILE${NC}"
echo -e "${BLUE}⏰ Check interval: $MONITOR_INTERVAL seconds${NC}\n"

# ==============================================================================
# 1. HEALTH MONITORING FUNCTIONS
# ==============================================================================

check_frontend_health() {
    echo -e "${CYAN}🌐 Checking Frontend Services...${NC}"

    # Check Vite dev server
    if lsof -i :5173 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend Dev Server (localhost:5173)${NC}"
    else
        echo -e "${RED}❌ Frontend Dev Server (localhost:5173)${NC}"
        return 1
    fi

    # Check production Nginx
    if curl -s http://localhost:8080 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Production Frontend (localhost:8080)${NC}"
    else
        echo -e "${RED}❌ Production Frontend (localhost:8080)${NC}"
        return 1
    fi

    return 0
}

check_backend_health() {
    echo -e "${CYAN}⚙️ Checking Backend Services...${NC}"

    # Check Express backend
    if lsof -i :3001 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend API (localhost:3001)${NC}"
    else
        echo -e "${RED}❌ Backend API (localhost:3001)${NC}"
        return 1
    fi

    # Test health endpoint
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend Health Check${NC}"
    else
        echo -e "${RED}❌ Backend Health Check${NC}"
        return 1
    fi

    return 0
}

check_microservices_health() {
    echo -e "${CYAN}🌀 Checking Microservices...${NC}"

    # Check ingestion service
    if docker ps | grep -q ingestion-service; then
        echo -e "${GREEN}✅ Ingestion Service (Docker)${NC}"
    else
        echo -e "${RED}❌ Ingestion Service (Docker)${NC}"
        return 1
    fi

    # Check query service
    if docker ps | grep -q query-service; then
        echo -e "${GREEN}✅ Query Service (Docker)${NC}"
    else
        echo -e "${RED}❌ Query Service (Docker)${NC}"
        return 1
    fi

    return 0
}

check_cli_tool_readiness() {
    echo -e "${CYAN}🛠️ Checking CLI Tool Integrity...${NC}"

    cd cli-tool || return 1

    # Check if CLI binary exists and is executable
    if [ -x "bin/codeflow-hook.js" ]; then
        echo -e "${GREEN}✅ CLI Binary exists${NC}"
    else
        echo -e "${RED}❌ CLI Binary missing${NC}"
        cd ..
        return 1
    fi

    # Test CLI help command (no npm install needed)
    if node bin/codeflow-hook.js --help >/dev/null 2>&1; then
        echo -e "${GREEN}✅ CLI Help Command${NC}"
    else
        echo -e "${RED}❌ CLI Help Command${NC}"
        cd ..
        return 1
    fi

    # Check package version
    if grep -q '"version": "1.0.0"' package.json; then
        echo -e "${GREEN}✅ Production Version (1.0.0)${NC}"
    else
        echo -e "${RED}❌ Version not 1.0.0${NC}"
        cd ..
        return 1
    fi

    cd ..
    return 0
}

check_ai_provider_integrations() {
    echo -e "${CYAN}🤖 Checking AI Provider Integrations...${NC}"

    cd cli-tool || return 1

    # Check Gemini integration
    if grep -q "@google/generative-ai" package.json; then
        echo -e "${GREEN}✅ Google Gemini Integration${NC}"
    else
        echo -e "${RED}❌ Missing Google Gemini${NC}"
        cd ..
        return 1
    fi

    # Check OpenAI integration
    if grep -q "openai" package.json; then
        echo -e "${GREEN}✅ OpenAI Integration${NC}"
    else
        echo -e "${RED}❌ Missing OpenAI${NC}"
        cd ..
        return 1
    fi

    cd ..
    return 0
}

check_docker_containers() {
    echo -e "${CYAN}🐳 Checking Docker Services...${NC}"

    if docker ps | grep -q codeflow; then
        running=$(docker ps | grep codeflow | wc -l)
        echo -e "${GREEN}✅ $running Docker containers running${NC}"
        return 0
    else
        echo -e "${RED}❌ No CodeFlow Docker containers running${NC}"
        return 1
    fi
}

# ==============================================================================
# 2. README CLAIM VERIFICATION
# ==============================================================================

verify_readme_claims() {
    echo -e "${CYAN}📚 Verifying README Claims...${NC}"

    FAILURES=0

    # Multi-provider AI support
    if grep -r "Claude" cli-tool/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Multi-provider AI (Claude)${NC}"
    else
        echo -e "${RED}❌ Missing Claude integration${NC}"
        ((FAILURES++))
    fi

    # Compliance frameworks
    if grep -r "HIPAA\|GDPR\|SOX" cli-tool/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Compliance Frameworks${NC}"
    else
        echo -e "${RED}❌ Compliance frameworks not implemented${NC}"
        ((FAILURES++))
    fi

    # Git hooks
    if [ -f "hooks/pre-push" ] || [ -f "cli-tool/bin/codeflow-hook.js" ]; then
        echo -e "${GREEN}✅ Git Hook Integration${NC}"
    else
        echo -e "${RED}❌ Git hooks missing${NC}"
        ((FAILURES++))
    fi

    # Documentation artifacts
    if [ -f "docs/architecture.mermaid" ] && [ -f "social-media-posts.md" ]; then
        echo -e "${GREEN}✅ Documentation Artifacts${NC}"
    else
        echo -e "${RED}❌ Missing documentation${NC}"
        ((FAILURES++))
    fi

    return $FAILURES
}

# ==============================================================================
# 3. PERFORMANCE MONITORING
# ==============================================================================

check_system_performance() {
    echo -e "${CYAN}📊 Checking System Performance...${NC}"

    # Memory usage
    mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    echo -e "${BLUE}💾 Memory Usage: ${mem_usage}%${NC}"

    if (( $(echo "$mem_usage < 80" | bc -l) )); then
        echo -e "${GREEN}✅ Memory usage acceptable${NC}"
    else
        echo -e "${RED}❌ High memory usage${NC}"
        return 1
    fi

    # Disk space
    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo -e "${BLUE}💿 Disk Usage: ${disk_usage}%${NC}"

    if [ "$disk_usage" -lt 90 ]; then
        echo -e "${GREEN}✅ Disk space acceptable${NC}"
    else
        echo -e "${RED}❌ Low disk space${NC}"
        return 1
    fi

    return 0
}

# ==============================================================================
# 4. LOG ANALYSIS & ANOMALY DETECTION
# ==============================================================================

analyze_logs() {
    echo -e "${CYAN}🔍 Analyzing Logs for Anomalies...${NC}"

    # Check for error patterns in recent logs
    if [ -d "logs" ]; then
        error_count=$(find logs -name "*.log" -newer $(date -d '1 hour ago' +%Y%m%d%H%M) -exec grep -l "ERROR\|Exception" {} \; | wc -l 2>/dev/null || echo 0)
        echo -e "${BLUE}🚨 Recent errors: $error_count${NC}"

        if [ "$error_count" -eq 0 ]; then
            echo -e "${GREEN}✅ No recent errors detected${NC}"
        elif [ "$error_count" -lt 5 ]; then
            echo -e "${YELLOW}⚠️ Some errors detected${NC}"
        else
            echo -e "${RED}❌ High error count${NC}"
            return 1
        fi
    fi

    return 0
}

# ==============================================================================
# 5. DEEP FEATURE VALIDATION
# ==============================================================================

test_ai_api_endpoints() {
    echo -e "${CYAN}🧠 Testing AI API Endpoints...${NC}"

    # Test Gemini API endpoint (if configured)
    if grep -q "GEMINI_API_KEY" .env 2>/dev/null; then
        if curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Gemini API reachable${NC}"
        else
            echo -e "${RED}❌ Gemini API unreachable${NC}"
            return 1
        fi
    fi

    # Test backend AI proxy
    if curl -s http://localhost:3001/api/ai >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend AI proxy responsive${NC}"
    else
        echo -e "${RED}❌ Backend AI proxy unresponsive${NC}"
        return 1
    fi

    return 0
}

# ==============================================================================
# 6. MAIN MONITORING LOOP
# ==============================================================================

echo "$(date +'%Y-%m-%d %H:%M:%S') - Deep Monitor Started" > "$LOG_FILE"

monitor_cycle() {
    local cycle_start=$(date +%s)
    local failures=0

    echo -e "\n${BLUE}=================================================================${NC}"
    echo -e "${BLUE}⏰ MONITOR CYCLE: $(date +'%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${BLUE}=================================================================${NC}"

    # Run all health checks
    check_frontend_health || ((failures++))
    check_backend_health || ((failures++))
    check_microservices_health || ((failures++))
    check_cli_tool_readiness || ((failures++))
    check_ai_provider_integrations || ((failures++))
    check_docker_containers || ((failures++))
    verify_readme_claims || ((failures++))
    check_system_performance || ((failures++))
    analyze_logs || ((failures++))
    test_ai_api_endpoints || ((failures++))

    # Calculate cycle duration
    local cycle_end=$(date +%s)
    local duration=$((cycle_end - cycle_start))

    # Report results
    echo -e "\n${BLUE}=================================================================${NC}"
    if [ $failures -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED - System is healthy${NC}"
        echo -e "${GREEN}📈 Cycle completed in ${duration}s${NC}"
        STATUS="✅ HEALTHY"
    else
        echo -e "${RED}⚠️ $failures checks failed - Issues detected${NC}"
        echo -e "${RED}⏱️ Cycle completed in ${duration}s${NC}"
        STATUS="❌ ISSUES DETECTED"
    fi
    echo -e "${BLUE}=================================================================${NC}"

    # Log results
    echo "$(date +'%Y-%m-%d %H:%M:%S') - Status: $STATUS - Failures: $failures - Duration: ${duration}s" >> "$LOG_FILE"
}

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

# Run initial check
monitor_cycle

# Continuous monitoring loop
echo -e "\n${YELLOW}🔄 Entering continuous monitoring mode...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

while true; do
    sleep $MONITOR_INTERVAL
    monitor_cycle
done
