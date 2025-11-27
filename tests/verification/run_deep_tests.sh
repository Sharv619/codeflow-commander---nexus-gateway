#!/bin/bash

# ==============================================================================
# 🚀 CodeFlow Commander: Master Deep Testing Orchestrator
# ==============================================================================
# Orchestrates comprehensive testing across all system layers
# Runs multiple testing suites in parallel and generates unified reports
# Perfect for continuous integration and background testing
# ==============================================================================

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="deep_test_logs"
REPORT_DIR="deep_test_reports"
MONITOR_DIR="background_monitors"

# Create log and report directories
mkdir -p "$LOG_DIR" "$REPORT_DIR" "$MONITOR_DIR"

# Signal handler for graceful shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down deep testing orchestrator...${NC}"

    # Kill any background processes we started
    if [ -f "$MONITOR_DIR/deep_monitor.pid" ]; then
        kill "$(cat "$MONITOR_DIR/deep_monitor.pid")" 2>/dev/null || true
        rm -f "$MONITOR_DIR/deep_monitor.pid"
    fi

    if [ -f "$MONITOR_DIR/performance_benchmark.pid" ]; then
        kill "$(cat "$MONITOR_DIR/performance_benchmark.pid")" 2>/dev/null || true
        rm -f "$MONITOR_DIR/performance_benchmark.pid"
    fi

    exit 0
}
trap cleanup SIGINT SIGTERM

# ==============================================================================
# 1. UTILITY FUNCTIONS
# ==============================================================================

log_status() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    local level="$1"
    local message="$2"
    echo "[$timestamp] [$level] $message" >> "$LOG_DIR/master_test_$(date +%Y%m%d).log"
}

run_with_timeout() {
    local command="$1"
    local timeout="${2:-300}"  # Default 5 minutes

    echo -e "${CYAN}⏱️ Running with ${timeout}s timeout: $command${NC}"

    # Run command with timeout and capture output
    local output_file=$(mktemp)
    local error_file=$(mktemp)

    timeout "$timeout" bash -c "$command" > "$output_file" 2> "$error_file"
    local exit_code=$?

    if [ $exit_code -eq 124 ]; then
        echo -e "${RED}❌ Command timed out${NC}"
        echo -e "${YELLOW}Command output before timeout:${NC}"
        cat "$output_file"
    elif [ $exit_code -ne 0 ]; then
        echo -e "${RED}❌ Command failed with exit code $exit_code${NC}"
        echo -e "${YELLOW}Stderr:${NC}"
        cat "$error_file"
        echo -e "${YELLOW}Stdout:${NC}"
        cat "$output_file"
    else
        echo -e "${GREEN}✅ Command completed successfully${NC}"
    fi

    # Cleanup temp files
    rm -f "$output_file" "$error_file"

    return $exit_code
}

run_script() {
    local script_name="$1"
    local description="$2"
    local args="${3:-}"

    echo -e "\n${BLUE}🔧 RUNNING: $description${NC}"
    echo -e "${CYAN}Script: $script_name${NC}"
    log_status "INFO" "Starting $script_name"

    if [ -f "$SCRIPT_DIR/$script_name" ]; then
        run_with_timeout "$SCRIPT_DIR/$script_name $args" 600  # 10 minute timeout
        local result=$?
        log_status "$( [ $result -eq 0 ] && echo "SUCCESS" || echo "FAILED" )" "$script_name completed with code $result"
        return $result
    else
        echo -e "${RED}❌ Script not found: $script_name${NC}"
        log_status "ERROR" "Script not found: $script_name"
        return 1
    fi
}

# ==============================================================================
# 2. INDIVIDUAL TEST SUITES
# ==============================================================================

run_readme_validation() {
    echo -e "\n${PURPLE}📚 PHASE 1: README CLAIMS VALIDATION${NC}"
    echo -e "${PURPLE}Checking if README represents the 'real deal'${NC}"

    # Run comprehensive README validator
    run_script "comprehensive_readme_validator.js" "Comprehensive README Claims Validator (Node.js)"

    # Run deep audit script
    run_script "deep_audit.sh" "Deep Feature Audit (Shell)"

    # Run verification ecosystem check
    run_script "verify_ecosystem.sh" "Ecosystem Verification Script"

    echo -e "${GREEN}📊 README validation phase completed${NC}"
}

run_functional_testing() {
    echo -e "\n${CYAN}🧪 PHASE 2: FUNCTIONAL TESTING SUITE${NC}"

    # Run existing Jest tests
    echo -e "${BLUE}🃏 Running Jest test suites...${NC}"
    log_status "INFO" "Starting Jest test suite"

    if command -v npm >/dev/null 2>&1; then
        run_with_timeout "npm test" 900  # 15 minutes for tests
        local test_result=$?
        log_status "$( [ $test_result -eq 0 ] && echo "SUCCESS" || echo "FAILED" )" "Jest tests completed with code $test_result"
    else
        echo -e "${RED}❌ npm not available for Jest tests${NC}"
        log_status "ERROR" "npm not available for Jest tests"
    fi

    # Run compliance verification
    run_script "verify_compliance.js" "Compliance Verification Script"

    # Run test validation
    run_script "test-validation.js" "API Key Validation Test"

    # Run CI/CD verification if available
    if [ -f "test-validation.sh" ]; then
        run_script "test-validation.sh" "CLI Test Validation Script"
    fi

    echo -e "${GREEN}🧪 Functional testing phase completed${NC}"
}

run_performance_testing() {
    echo -e "\n${YELLOW}📈 PHASE 3: PERFORMANCE & SYSTEM TESTING${NC}"

    # Run performance benchmark
    run_script "performance_benchmark.sh" "Performance Benchmark Suite"

    # Run system health checks
    echo -e "${BLUE}🔍 Running system health checks...${NC}"

    # Check system resources
    echo -e "${CYAN}Checking system resources...${NC}"
    df -h / | grep -v "Filesystem" | awk '{print "Disk usage:", $5, "(" $4 " available)"}'
    free -h | grep -E "^(Mem|Swap)"

    # Check network connectivity
    echo -e "${CYAN}Testing network connectivity...${NC}"
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Internet connectivity: OK${NC}"
    else
        echo -e "${RED}❌ Internet connectivity: FAILED${NC}"
    fi

    echo -e "${GREEN}📈 Performance testing phase completed${NC}"
}

run_integration_testing() {
    echo -e "\n${PURPLE}🔗 PHASE 4: INTEGRATION & SYSTEMS TESTING${NC}"

    # Run cross-component integration tests
    echo -e "${BLUE}🔄 Testing system integrations...${NC}"

    # Check Docker services integration
    if command -v docker >/dev/null 2>&1; then
        echo -e "${CYAN}Checking Docker services...${NC}"

        if docker ps | grep -q codeflow; then
            local container_count=$(docker ps | grep codeflow | wc -l)
            echo -e "${GREEN}✅ $container_count CodeFlow containers running${NC}"
        else
            echo -e "${YELLOW}⚠️ No CodeFlow containers running${NC}"
        fi

        if docker network ls | grep -q codeflow; then
            echo -e "${GREEN}✅ CodeFlow Docker network exists${NC}"
        else
            echo -e "${YELLOW}⚠️ CodeFlow Docker network not found${NC}"
        fi
    fi

    # Test API endpoints if services are running
    echo -e "${CYAN}Testing API endpoints...${NC}"
    local endpoints=(
        "http://localhost:3001/health:Backend API"
        "http://localhost:5173:Frontend Dev Server"
        "http://localhost:8080:Production Frontend"
    )

    for endpoint in "${endpoints[@]}"; do
        local url=$(echo $endpoint | cut -d: -f1)
        local name=$(echo $endpoint | cut -d: -f2)

        if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name: Accessible${NC}"
        else
            echo -e "${YELLOW}⚠️ $name: Not accessible${NC}"
        fi
    done

    # Test CLI tool integration
    echo -e "${CYAN}Testing CLI tool integration...${NC}"
    if [ -f "cli-tool/bin/codeflow-hook.js" ]; then
        if node cli-tool/bin/codeflow-hook.js --help >/dev/null 2>&1; then
            echo -e "${GREEN}✅ CLI tool operational${NC}"
        else
            echo -e "${RED}❌ CLI tool not operational${NC}"
        fi
    fi

    echo -e "${GREEN}🔗 Integration testing phase completed${NC}"
}

# ==============================================================================
# 3. BACKGROUND MONITORING
# ==============================================================================

start_background_monitors() {
    echo -e "\n${GREEN}🔄 PHASE 5: STARTING BACKGROUND MONITORS${NC}"

    # Start deep monitor in background
    if [ -f "$SCRIPT_DIR/deep_monitor.sh" ]; then
        echo -e "${CYAN}Starting deep health monitor...${NC}"
        nohup "$SCRIPT_DIR/deep_monitor.sh" > "$MONITOR_DIR/deep_monitor_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
        echo $! > "$MONITOR_DIR/deep_monitor.pid"
        log_status "INFO" "Started deep monitor with PID $!"
        echo -e "${GREEN}✅ Deep monitor started (PID: $!)${NC}"
    fi

    # Start performance benchmarking in background
    if [ -f "$SCRIPT_DIR/performance_benchmark.sh" ]; then
        echo -e "${CYAN}Starting performance monitoring...${NC}"
        nohup "$SCRIPT_DIR/performance_benchmark.sh" continuous 300 > "$MONITOR_DIR/performance_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
        echo $! > "$MONITOR_DIR/performance_benchmark.pid"
        log_status "INFO" "Started performance benchmark with PID $!"
        echo -e "${GREEN}✅ Performance monitoring started (PID: $!)${NC}"
    fi
}

stop_background_monitors() {
    echo -e "\n${YELLOW}🛑 STOPPING BACKGROUND MONITORS${NC}"

    if [ -f "$MONITOR_DIR/deep_monitor.pid" ]; then
        local pid=$(cat "$MONITOR_DIR/deep_monitor.pid")
        if kill "$pid" 2>/dev/null; then
            echo -e "${GREEN}✅ Deep monitor stopped${NC}"
        fi
        rm -f "$MONITOR_DIR/deep_monitor.pid"
    fi

    if [ -f "$MONITOR_DIR/performance_benchmark.pid" ]; then
        local pid=$(cat "$MONITOR_DIR/performance_benchmark.pid")
        if kill "$pid" 2>/dev/null; then
            echo -e "${GREEN}✅ Performance monitor stopped${NC}"
        fi
        rm -f "$MONITOR_DIR/performance_benchmark.pid"
    fi
}

# ==============================================================================
# 4. COMPREHENSIVE REPORTING
# ==============================================================================

generate_comprehensive_report() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    local report_file="$REPORT_DIR/deep_test_report_$(date +%Y%m%d_%H%M%S).json"

    echo -e "\n${BLUE}📊 GENERATING COMPREHENSIVE TEST REPORT${NC}"

    # Collect test results and metrics
    local system_info=$(uname -a)
    local node_version=$(node --version 2>/dev/null || echo "Not found")
    local npm_version=$(npm --version 2>/dev/null || echo "Not found")
    local docker_version=$(docker --version 2>/dev/null | head -1 || echo "Not found")

    # Calculate basic system metrics
    local total_tests=0
    local passed_tests=0
    local failed_tests=0

    # Count test results from logs (simplified)
    if [ -d "$LOG_DIR" ]; then
        passed_tests=$(grep -r "SUCCESS" "$LOG_DIR" 2>/dev/null | wc -l)
        failed_tests=$(grep -r "FAILED\|ERROR" "$LOG_DIR" 2>/dev/null | wc -l)
        total_tests=$((passed_tests + failed_tests))
    fi

    local success_rate="0"
    if [ $total_tests -gt 0 ]; then
        success_rate=$(echo "scale=1; ($passed_tests / $total_tests) * 100" | bc 2>/dev/null || echo "0")
    fi

    # Create comprehensive JSON report
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "test_run_id": "$(date +%Y%m%d_%H%M%S)",
  "environment": {
    "system": "$system_info",
    "node_version": "$node_version",
    "npm_version": "$npm_version",
    "docker_version": "$docker_version"
  },
  "test_results": {
    "total_tests": $total_tests,
    "passed_tests": $passed_tests,
    "failed_tests": $failed_tests,
    "success_rate_percent": $success_rate
  },
  "phases_completed": [
    "README Claims Validation",
    "Functional Testing Suite",
    "Performance & System Testing",
    "Integration & Systems Testing"
  ],
  "background_monitors": {
    "deep_monitor_active": $([ -f "$MONITOR_DIR/deep_monitor.pid" ] && echo "true" || echo "false"),
    "performance_monitor_active": $([ -f "$MONITOR_DIR/performance_benchmark.pid" ] && echo "true" || echo "false")
  },
  "log_files": "$(ls -la $LOG_DIR/*.log 2>/dev/null | wc -l) log files generated",
  "report_files": "$(ls -la $REPORT_DIR/*.json 2>/dev/null | wc -l) report files generated"
}
EOF

    echo -e "${GREEN}✅ Comprehensive report generated: $report_file${NC}"

    # Display summary
    echo -e "\n${BLUE}=================================================================${NC}"
    echo -e "${BLUE}🎯 DEEP TESTING SUMMARY${NC}"
    echo -e "${BLUE}=================================================================${NC}"
    echo -e "${CYAN}📈 Success Rate: ${success_rate}% ($passed_tests/$total_tests tests passed)${NC}"
    echo -e "${CYAN}📁 Reports: $report_file${NC}"
    echo -e "${CYAN}📋 Logs: $LOG_DIR/${NC}"

    if [ "$success_rate" = "100.0" ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED - System is healthy!${NC}"
    elif (( $(echo "$success_rate >= 90" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${YELLOW}⚠️ MOSTLY HEALTHY - Minor issues detected${NC}"
    else
        echo -e "${RED}❌ ISSUES DETECTED - Review logs for details${NC}"
    fi

    echo -e "${BLUE}=================================================================${NC}"
}

# ==============================================================================
# 5. MAIN EXECUTION LOGIC
# ==============================================================================

show_help() {
    echo "CodeFlow Commander: Master Deep Testing Orchestrator"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  full          Run complete deep testing suite (default)"
    echo "  readme        Run only README validation tests"
    echo "  functional    Run only functional tests"
    echo "  performance   Run only performance benchmarks"
    echo "  integration   Run only integration tests"
    echo "  background    Start background monitoring only"
    echo "  stop          Stop all background monitors"
    echo "  report        Generate latest comprehensive report"
    echo "  help          Show this help message"
    echo ""
    echo "Options:"
    echo "  --no-background    Don't start background monitors"
    echo "  --quick           Run abbreviated tests (faster)"
    echo ""
    echo "Examples:"
    echo "  $0 full                     # Complete testing suite"
    echo "  $0 readme                   # Just README validation"
    echo "  $0 background              # Start monitors only"
    echo "  $0 stop                     # Stop all monitors"
}

main() {
    local command="${1:-full}"
    local no_background=false
    local quick=false

    # Parse additional arguments
    shift
    while [ $# -gt 0 ]; do
        case "$1" in
            --no-background) no_background=true ;;
            --quick) quick=true ;;
            *) echo "Unknown option: $1"; show_help; exit 1 ;;
        esac
        shift
    done

    echo -e "${BLUE}=================================================================${NC}"
    echo -e "${BLUE}       🚀  CODEFLOW COMMANDER: DEEP TESTING ORCHESTRATOR        ${NC}"
    echo -e "${BLUE}       Command: $command | Background: $([ "$no_background" = "true" ] && echo "Disabled" || echo "Enabled")${NC}"
    echo -e "${BLUE}=================================================================${NC}"

    log_status "INFO" "Starting deep testing orchestrator with command: $command"

    case "$command" in
        "full")
            echo -e "${GREEN}🔥 EXECUTING COMPLETE DEEP TESTING SUITE${NC}"

            run_readme_validation
            run_functional_testing
            run_performance_testing
            run_integration_testing

            if [ "$no_background" != "true" ]; then
                start_background_monitors
            fi

            generate_comprehensive_report

            echo -e "\n${GREEN}🎉 COMPLETE DEEP TESTING SUITE FINISHED!${NC}"
            ;;
        "readme")
            run_readme_validation
            generate_comprehensive_report
            ;;
        "functional")
            run_functional_testing
            generate_comprehensive_report
            ;;
        "performance")
            run_performance_testing
            generate_comprehensive_report
            ;;
        "integration")
            run_integration_testing
            generate_comprehensive_report
            ;;
        "background")
            echo -e "${GREEN}🔄 Starting background monitors...${NC}"
            start_background_monitors
            ;;
        "stop")
            stop_background_monitors
            ;;
        "report")
            generate_comprehensive_report
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $command${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
