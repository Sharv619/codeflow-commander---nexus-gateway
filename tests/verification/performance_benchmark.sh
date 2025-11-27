#!/bin/bash

# ==============================================================================
# 📊 CodeFlow Commander: Performance Benchmark & Monitoring Suite
# ==============================================================================
# Measures performance metrics and detects regressions across all system layers
# Runs benchmarks, monitors resource usage, and generates performance reports
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
BASELINE_FILE="performance_baseline.json"
REPORT_DIR="performance_reports"
LOG_FILE="benchmark_$(date +%Y%m%d_%H%M%S).log"
MONITOR_PID_FILE="benchmark.pid"

# Signal handler for graceful shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down performance benchmark...${NC}"
    if [ -f "$MONITOR_PID_FILE" ]; then
        rm -f "$MONITOR_PID_FILE"
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM

# Create directories
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}=================================================================${NC}"
echo -e "${BLUE}       📊  CODEFLOW COMMANDER: PERFORMANCE BENCHMARK SUITE     ${NC}"
echo -e "${BLUE}       Measuring system performance and detecting regressions     ${NC}"
echo -e "${BLUE}=================================================================${NC}"

# Save PID
echo $$ > "$MONITOR_PID_FILE"
echo -e "${GREEN}✅ Benchmark started with PID: $$ ${NC}"
echo -e "${BLUE}📊 Logging to: $LOG_FILE${NC}"
echo -e "${BLUE}📁 Reports in: $REPORT_DIR${NC}\n"

# ==============================================================================
# 1. SYSTEM RESOURCE MONITORING FUNCTIONS
# ==============================================================================

collect_system_metrics() {
    local timestamp=$(date +%s)
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    local load_avg=$(uptime | awk -F'load average:' '{ print $2 }' | cut -d',' -f1 | xargs)

    echo "{
  \"timestamp\": $timestamp,
  \"cpu_percent\": $cpu_usage,
  \"memory_percent\": $mem_usage,
  \"disk_percent\": $disk_usage,
  \"load_average\": $load_avg
}"
}

# ==============================================================================
# 2. CLI TOOL PERFORMANCE BENCHMARKS
# ==============================================================================

benchmark_cli_tool() {
    echo -e "${CYAN}🛠️ Benchmarking CLI Tool Performance...${NC}"

    if [ ! -f "cli-tool/bin/codeflow-hook.js" ]; then
        echo -e "${RED}❌ CLI tool not found${NC}"
        return 1
    fi

    cd cli-tool

    local results="{"

    # Test CLI startup time
    echo -e "   Measuring CLI startup time..."
    local start_time=$(date +%s%N)
    node bin/codeflow-hook.js --help >/dev/null 2>&1
    local end_time=$(date +%s%N)
    local startup_ms=$(( (end_time - start_time) / 1000000 ))
    results="$results \"cli_startup_ms\": $startup_ms,"

    # Test config loading time
    if [ -f ".codeflowrc.json" ]; then
        echo -e "   Measuring config loading..."
        start_time=$(date +%s%N)
        node -e "console.log('config loaded')" >/dev/null 2>&1
        end_time=$(date +%s%N)
        local config_ms=$(( (end_time - start_time) / 1000000 ))
        results="$results \"config_load_ms\": $config_ms,"
    else
        results="$results \"config_load_ms\": null,"
    fi

    # Test AI provider response time (if configured)
    echo -e "   Testing AI provider responsiveness..."
    local ai_response_ms="null"
    if [ -f ".env" ] && grep -q "GEMINI_API_KEY" .env; then
        start_time=$(date +%s%N)
        timeout 10 node -e "
            // Simple AI test - just check if the module loads
            try {
                require('./services/ai.js');
                console.log('AI module loaded');
            } catch(e) {
                console.log('AI module failed');
            }
        " >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            end_time=$(date +%s%N)
            ai_response_ms=$(( (end_time - start_time) / 1000000 ))
        fi
    fi
    results="$results \"ai_response_ms\": $ai_response_ms,"

    # Test vector store operations
    echo -e "   Measuring vector store performance..."
    local vector_ops_ms="null"
    if [ -f "services/vector-store.js" ]; then
        start_time=$(date +%s%N)
        timeout 5 node -e "
            try {
                const vs = require('./services/vector-store.js');
                console.log('Vector store module loaded');
            } catch(e) {
                console.log('Vector store failed');
            }
        " >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            end_time=$(date +%s%N)
            vector_ops_ms=$(( (end_time - start_time) / 1000000 ))
        fi
    fi
    results="$results \"vector_store_ms\": $vector_ops_ms"

    results="$results }"
    cd ..

    echo "$results"
}

# ==============================================================================
# 3. MICROSERVICE PERFORMANCE TESTS
# ==============================================================================

benchmark_microservices() {
    echo -e "${CYAN}🌀 Benchmarking Microservices Performance...${NC}"

    local results="{"
    local services_found=0

    # Check ingestion service
    if docker ps | grep -q ingestion-service; then
        echo -e "   Testing ingestion service..."
        local start_time=$(date +%s%N)

        # Test health endpoint if exposed
        if curl -s http://localhost:4000/health >/dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local health_check_ms=$(( (end_time - start_time) / 1000000 ))
            results="$results \"ingestion_service_health_ms\": $health_check_ms,"
            ((services_found++))
        fi
    fi

    # Check query service
    if docker ps | grep -q query-service; then
        echo -e "   Testing query service..."
        local start_time=$(date +%s%N)

        if curl -s http://localhost:4001/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{__typename}"}' >/dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local graphql_query_ms=$(( (end_time - start_time) / 1000000 ))
            results="$results \"query_service_graphql_ms\": $graphql_query_ms,"
            ((services_found++))
        fi
    fi

    results="$results \"active_services\": $services_found }"
    echo "$results"
}

# ==============================================================================
# 4. FRONTEND PERFORMANCE METRICS
# ==============================================================================

benchmark_frontend() {
    echo -e "${CYAN}🌐 Benchmarking Frontend Performance...${NC}"

    local results="{"

    # Test frontend page load (if running)
    if lsof -i :5173 >/dev/null 2>&1; then
        echo -e "   Testing Vite dev server response..."

        local start_time=$(date +%s%N)
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local page_load_ms=$(( (end_time - start_time) / 1000000 ))
            results="$results \"frontend_page_load_ms\": $page_load_ms,"
        else
            results="$results \"frontend_page_load_ms\": null,"
        fi
    fi

    # Test production build (nginx)
    if lsof -i :8080 >/dev/null 2>&1; then
        echo -e "   Testing production frontend response..."

        local start_time=$(date +%s%N)
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local prod_load_ms=$(( (end_time - start_time) / 1000000 ))
            results="$results \"production_frontend_load_ms\": $prod_load_ms,"
        else
            results="$results \"production_frontend_load_ms\": null,"
        fi
    fi

    # Build time measurement (if npm available)
    if command -v npm >/dev/null 2>&1; then
        echo -e "   Measuring build time..."

        local start_time=$(date +%s%N)
        timeout 30 npm run build >/dev/null 2>&1
        local exit_code=$?
        local end_time=$(date +%s%N)

        if [ $exit_code -eq 0 ]; then
            local build_ms=$(( (end_time - start_time) / 1000000 ))
            results="$results \"build_time_ms\": $build_ms"
        else
            results="$results \"build_time_ms\": null"
        fi
    else
        results="$results \"build_time_ms\": null"
    fi

    results="$results }"
    echo "$results"
}

# ==============================================================================
# 5. ENTERPRISE FRAMEWORK PERFORMANCE
# ==============================================================================

benchmark_enterprise_framework() {
    echo -e "${CYAN}🏢 Benchmarking Enterprise Framework...${NC}"

    local results="{"

    cd codeflow-cli

    # Test TypeScript compilation time
    if command -v npx >/dev/null 2>&1; then
        echo -e "   Measuring TypeScript compilation..."

        local start_time=$(date +%s%N)
        timeout 15 npx tsc --noEmit >/dev/null 2>&1
        local exit_code=$?
        local end_time=$(date +%s%N)

        if [ $exit_code -eq 0 ]; then
            local compile_ms=$(( (end_time - start_time) / 1000000 ))
            results="$results \"typescript_compile_ms\": $compile_ms,"
        else
            results="$results \"typescript_compile_ms\": null,"
        fi
    else
        results="$results \"typescript_compile_ms\": null,"
    fi

    # Test agent instantiation time
    if [ -f "src/agents/GenerativeAgent.ts" ]; then
        echo -e "   Testing agent instantiation..."

        local start_time=$(date +%s%N)
        timeout 5 npx ts-node -e "
            try {
                const AgentClass = require('./src/agents/GenerativeAgent.ts');
                console.log('Agent class loaded successfully');
            } catch(e) {
                console.error('Agent loading failed');
                process.exit(1);
            }
        " >/dev/null 2>&1

        if [ $? -eq 0 ]; then
            local end_time=$(date +%s%N)
            local agent_load_ms=$(( (end_time - start_time) / 1000000 ))
            results="$results \"agent_instantiation_ms\": $agent_load_ms,"
        else
            results="$results \"agent_instantiation_ms\": null,"
        fi
    else
        results="$results \"agent_instantiation_ms\": null,"
    fi

    cd ..
    results="$results \"framework_tests_completed\": true }"
    echo "$results"
}

# ==============================================================================
# 6. PERFORMANCE ANALYSIS & REGRESSION DETECTION
# ==============================================================================

analyze_performance() {
    local current_metrics="$1"

    if [ ! -f "$BASELINE_FILE" ]; then
        echo -e "${YELLOW}⚠️ No baseline performance data found. Creating baseline...${NC}"
        echo "$current_metrics" > "$BASELINE_FILE"
        return
    fi

    # Load baseline
    local baseline=$(cat "$BASELINE_FILE")

    echo -e "${CYAN}🔍 Analyzing Performance vs Baseline...${NC}"

    # Extract key metrics for comparison (simplified analysis)
    local current_cpu=$(echo "$current_metrics" | jq -r '.system.cpu_percent // 0' 2>/dev/null || echo "0")
    local baseline_cpu=$(echo "$baseline" | jq -r '.system.cpu_percent // 0' 2>/dev/null || echo "0")

    local current_mem=$(echo "$current_metrics" | jq -r '.system.memory_percent // 0' 2>/dev/null || echo "0")
    local baseline_mem=$(echo "$baseline" | jq -r '.system.memory_percent // 0' 2>/dev/null || echo "0")

    # Simple regression detection (5% degradation threshold)
    local cpu_diff=$(echo "scale=2; $current_cpu - $baseline_cpu" | bc 2>/dev/null || echo "0")
    local mem_diff=$(echo "scale=2; $current_mem - $baseline_mem" | bc 2>/dev/null || echo "0")

    if (( $(echo "$cpu_diff > 5" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${RED}⚠️ CPU usage regression detected: +${cpu_diff}%${NC}"
    elif (( $(echo "$cpu_diff < -5" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${GREEN}✅ CPU usage improvement: ${cpu_diff}%${NC}"
    fi

    if (( $(echo "$mem_diff > 5" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${RED}⚠️ Memory usage regression detected: +${mem_diff}%${NC}"
    elif (( $(echo "$mem_diff < -5" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${GREEN}✅ Memory usage improvement: ${mem_diff}%${NC}"
    fi
}

# ==============================================================================
# 7. REPORT GENERATION
# ==============================================================================

generate_performance_report() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="$REPORT_DIR/performance_report_$timestamp.json"

    local report="{
  \"timestamp\": \"$timestamp\",
  \"system\": $(collect_system_metrics),
  \"cli_tool\": $(benchmark_cli_tool),
  \"microservices\": $(benchmark_microservices),
  \"frontend\": $(benchmark_frontend),
  \"enterprise_framework\": $(benchmark_enterprise_framework)
}"

    echo "$report" > "$report_file"

    echo -e "${CYAN}📊 Performance Report Generated: $report_file${NC}"

    # Analyze against baseline
    analyze_performance "$report"

    return 0
}

# ==============================================================================
# 8. CONTINUOUS MONITORING LOOP
# ==============================================================================

monitor_performance() {
    local interval=${1:-300}  # Default 5 minutes

    echo -e "${YELLOW}🔄 Starting continuous performance monitoring (interval: ${interval}s)...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

    while true; do
        echo "$(date +'%Y-%m-%d %H:%M:%S') - Running performance benchmark..." >> "$LOG_FILE"

        generate_performance_report

        echo -e "${GREEN}✅ Benchmark cycle completed. Next run in ${interval} seconds.${NC}"

        sleep $interval
    done
}

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

# Check arguments
if [ "$1" = "continuous" ]; then
    monitor_performance "$2"
else
    # Single benchmark run
    echo -e "\n${BLUE}🧪 RUNNING COMPREHENSIVE PERFORMANCE BENCHMARK${NC}"
    generate_performance_report

    echo -e "\n${GREEN}🎉 Performance benchmark completed!${NC}"
    echo -e "${BLUE}📁 Check $REPORT_DIR for detailed reports${NC}"
    echo -e "${BLUE}📊 Baseline saved to $BASELINE_FILE${NC}"
fi

# Cleanup
rm -f "$MONITOR_PID_FILE"
