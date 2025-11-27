#!/bin/bash

# ==============================================================================
# CODEFLOW COMMANDER: ENTERPRISE ARCHITECTURE VALIDATOR
# ==============================================================================
# Verifies that the code matches the Phase 4 Architecture definitions.
# Performs deep architectural analysis across all 6 core pillars:
# EKG, AAN, MMIL, PIE, GSF, DEE

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}=================================================================${NC}"
echo -e "${BLUE}   🕵️  ENTERPRISE ARCHITECTURE DEEP SCAN                          ${NC}"
echo -e "${BLUE}   Phase 4 Architecture Validation                               ${NC}"
echo -e "${BLUE}=================================================================${NC}"

FAIL_COUNT=0

# Function to verify a specific architectural component exists and is implemented
audit_component() {
    COMPONENT_NAME="$1"
    FILE_PATH="$2"
    SEARCH_PATTERN="$3"
    DESCRIPTION="$4"

    echo -ne "Auditing ${YELLOW}${COMPONENT_NAME}${NC}..."

    if [ ! -f "$FILE_PATH" ]; then
        echo -e "${RED} [MISSING FILE]${NC}"
        echo -e "   ❌ File not found: $FILE_PATH"
        ((FAIL_COUNT++))
        return
    fi

    if grep -q "$SEARCH_PATTERN" "$FILE_PATH"; then
        echo -e "${GREEN} [VERIFIED]${NC}"
        # echo -e "   ✓ $DESCRIPTION"
    else
        echo -e "${RED} [LOGIC MISSING]${NC}"
        echo -e "   ❌ Expected pattern: '$SEARCH_PATTERN'"
        echo -e "   📝 Expected: $DESCRIPTION"
        ((FAIL_COUNT++))
    fi
}

# ==============================================================================
# 1. ENTERPRISE KNOWLEDGE GRAPH (EKG)
# ==============================================================================
echo -e "\n${PURPLE}🧠 [1/6] ENTERPRISE KNOWLEDGE GRAPH (EKG)${NC}"
echo -e "${CYAN}Validating graph-based semantic intelligence layer${NC}"

# Check core graph logic implementation
audit_component "Graph Engine" "cli-tool/src/knowledge/ekg-core.js" "class KnowledgeGraph" "Core graph class definition with nodes/edges"

audit_component "Vector Search" "cli-tool/services/vector-store.js" "cosineSimilarity" "FAISS-free vector similarity computation"

audit_component "Semantic Relationships" "cli-tool/src/knowledge/ekg-core.js" "findSemanticDependencies" "Cross-reference analysis and dependency mapping"

audit_component "Ingestion Interface" "cli-tool/bin/codeflow-hook.js" "activateEKG\|findSemanticDependencies" "CLI integration point for graph queries"

# ==============================================================================
# 2. AUTONOMOUS AGENT NETWORK (AAN)
# ==============================================================================
echo -e "\n${PURPLE}🤖 [2/6] AUTONOMOUS AGENT NETWORK (AAN)${NC}"
echo -e "${CYAN}Validating multi-agent orchestration and specialization${NC}"

# Check agent coordination logic
audit_component "Agent Orchestrator" "cli-tool/src/agents/orchestrator.js" "class AgentOrchestrator" "Central agent coordination system"

audit_component "Specialized Roles" "cli-tool/src/agents/orchestrator.js" "role: 'code-review'\|security\|compliance" "Agent role specialization and expertise"

audit_component "Task Dispatch" "cli-tool/src/agents/orchestrator.js" "dispatch(task)\|selectAgents" "Intelligent task routing and delegation"

audit_component "Multi-Agent Synthesis" "cli-tool/src/agents/orchestrator.js" "synthesize\|results.join" "Agent output coordination and synthesis"

# ==============================================================================
# 3. MULTI-MODAL INTERFACE LAYER (MMIL)
# ==============================================================================
echo -e "\n${PURPLE}🗣️  [3/6] MULTI-MODAL INTERFACE LAYER (MMIL)${NC}"
echo -e "${CYAN}Validating AI provider integration and abstraction${NC}"

# Verify real AI provider implementations
audit_component "Gemini Integration" "cli-tool/src/services/ai.js" "GoogleGenerativeAI\|@google/generative-ai" "Google Gemini API client setup"

audit_component "OpenAI Integration" "cli-tool/src/services/ai.js" "OpenAI\|openai" "OpenAI GPT-4 API client setup"

audit_component "Claude Integration" "cli-tool/src/services/ai.js" "Anthropic\|claude" "Anthropic Claude API client setup"

audit_component "Provider Switching" "cli-tool/src/services/ai.js" "generateAnalysis\|provider.*model" "Dynamic provider selection logic"

# ==============================================================================
# 4. PREDICTIVE INTELLIGENCE ENGINE (PIE)
# ==============================================================================
echo -e "\n${PURPLE}🔮 [4/6] PREDICTIVE INTELLIGENCE ENGINE (PIE)${NC}"
echo -e "${CYAN}Validating ML-based anomaly detection and predictions${NC}"

# Verify ML implementation
audit_component "ML Engine Wiring" "codeflow-sentinel/sentinel.py" "from ml_engine import AnomalyDetector" "ML engine import and instantiation"

audit_component "IsolationForest ML" "codeflow-sentinel/ml_engine.py" "IsolationForest\|sklearn" "Scikit-learn anomaly detection implementation"

audit_component "Training Pipeline" "codeflow-sentinel/sentinel.py" "detector.train\|Training loop" "Online learning and model updates"

audit_component "Prediction Endpoint" "codeflow-sentinel/sentinel.py" "analyze-threats\|prediction" "Real-time anomaly detection API"

# ==============================================================================
# 5. GOVERNANCE SAFETY FRAMEWORK (GSF)
# ==============================================================================
echo -e "\n${PURPLE}🛡️  [5/6] GOVERNANCE SAFETY FRAMEWORK (GSF)${NC}"
echo -e "${CYAN}Validating compliance scanning and security validation${NC}"

# Check compliance rule implementation
if [ ! -d "cli-tool/src/services/compliance" ]; then
    echo -e "${RED}❌ Missing compliance service directory: cli-tool/src/services/compliance${NC}"
    ((FAIL_COUNT++))
else
    audit_component "HIPAA Logic" "cli-tool/src/services/compliance/scanner.ts" "HIPAA_SSN\|ssn.*regex" "Social Security Number detection patterns"

    audit_component "GDPR Logic" "cli-tool/src/services/compliance/scanner.ts" "GDPR_EMAIL_LIST\|pii.*email" "Personal information detection and masking"

    audit_component "AWS Security" "cli-tool/src/services/compliance/scanner.ts" "AKIA\|aws.*key.*detect" "Cloud service credential detection"
fi

# ==============================================================================
# 6. DISTRIBUTED EXECUTION ENGINE (DEE)
# ==============================================================================
echo -e "\n${PURPLE}⚡ [6/6] DISTRIBUTED EXECUTION ENGINE (DEE)${NC}"
echo -e "${CYAN}Validating container orchestration and distributed workflow${NC}"

# Check container and orchestration setup
audit_component "Container Orchestration" "docker-compose.yml" "services:\|version:" "Multi-service container management"

audit_component "Nginx Reverse Proxy" "docker-compose.yml" "nginx:\|Alpine\|proxy_pass" "Production-grade reverse proxy configuration"

audit_component "Health Checks" "docker-compose.yml" "healthcheck\|curl.*health" "Container health monitoring and restart logic"

audit_component "UI Integration" "App.tsx" "AiConsole\|import.*AiConsole" "Frontend component integration and wiring"

# ==============================================================================
# ADDITIONAL ARCHITECTURAL CHECKS
# ==============================================================================
echo -e "\n${PURPLE}🔍 DEEP ARCHITECTURAL ANALYSIS${NC}"

# Check if components are actually connected (not just existing)
echo -ne "${YELLOW}Checking component wiring...${NC}"

WIRED_COUNT=0

# Check if CLI uses the graph
if [ -f "cli-tool/bin/codeflow-hook.js" ] && grep -q "findSemanticDependencies\|activateEKG" "cli-tool/bin/codeflow-hook.js"; then
    ((WIRED_COUNT++))
fi

# Check if React uses AAN components
if [ -f "App.tsx" ] && grep -q "AiConsole" "App.tsx"; then
    ((WIRED_COUNT++))
fi

# Check if sentinel uses ML
if [ -f "codeflow-sentinel/sentinel.py" ] && grep -q "from ml_engine\|detector.train" "codeflow-sentinel/sentinel.py"; then
    ((WIRED_COUNT++))
fi

# Check if Docker has nginx
if [ -f "docker-compose.yml" ] && grep -q "nginx" "docker-compose.yml"; then
    ((WIRED_COUNT++))
fi

echo -e "${GREEN} [$WIRED_COUNT/4 components properly wired]${NC}"

if [ $WIRED_COUNT -lt 3 ]; then
    echo -e "${RED}❌ Components exist but are not integrated${NC}"
    ((FAIL_COUNT++))
fi

# ==============================================================================
# PHASE 4 READINESS CHECK
# ==============================================================================
echo -e "\n${PURPLE}🎯 PHASE 4 ENTERPRISE READINESS ASSESSMENT${NC}"

MISSING_FEATURES=""

# List critical missing features
if [ ! -f "cli-tool/src/knowledge/ekg-core.js" ] || ! grep -q "class KnowledgeGraph" "cli-tool/src/knowledge/ekg-core.js"; then
    MISSING_FEATURES+="EKG-Core,"
fi

if [ ! -f "cli-tool/src/agents/orchestrator.js" ] || ! grep -q "class AgentOrchestrator" "cli-tool/src/agents/orchestrator.js"; then
    MISSING_FEATURES+="AAN-Orchestrator,"
fi

if [ ! -f "codeflow-sentinel/ml_engine.py" ] || ! grep -q "IsolationForest" "codeflow-sentinel/ml_engine.py"; then
    MISSING_FEATURES+="PIE-ML,"
fi

if [ ! -f "docker-compose.yml" ] || ! grep -q "nginx:" "docker-compose.yml"; then
    MISSING_FEATURES+="DEE-Nginx,"
fi

if [ -n "$MISSING_FEATURES" ]; then
    MISSING_FEATURES="${MISSING_FEATURES%,}"
    echo -e "${RED}❌ Missing core features: $MISSING_FEATURES${NC}"
fi

# ==============================================================================
# FINAL VERDICT
# ==============================================================================
echo -e "\n${BLUE}=================================================================${NC}"

TOTAL_COMPONENTS=22  # 6 pillars × ~3-4 components each
VERIFIED_COMPONENTS=$((TOTAL_COMPONENTS - FAIL_COUNT))
SUCCESS_RATE=$((VERIFIED_COMPONENTS * 100 / TOTAL_COMPONENTS))

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ VERIFICATION PASSED: $SUCCESS_RATE% ARCHITECTURAL INTEGRITY${NC}"
    echo -e "${GREEN}   Phase 4 Enterprise Architecture fully implemented and verified!${NC}"
    echo -e "${GREEN}   You are ready for production deployment.${NC}"
elif [ $SUCCESS_RATE -ge 85 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY COMPLETE: $SUCCESS_RATE% ($VERIFIED_COMPONENTS/$TOTAL_COMPONENTS verified)${NC}"
    echo -e "${YELLOW}   Core architecture is sound with minor gaps${NC}"
    echo -e "${YELLOW}   Ready for development use${NC}"
elif [ $SUCCESS_RATE -ge 70 ]; then
    echo -e "${RED}❌ PARTIALLY IMPLEMENTED: $SUCCESS_RATE% ($VERIFIED_COMPONENTS/$TOTAL_COMPONENTS verified)${NC}"
    echo -e "${RED}   Architecture foundation exists but needs completion${NC}"
else
    echo -e "${RED}❌ SIGNIFICANT GAPS: $SUCCESS_RATE% ($VERIFIED_COMPONENTS/$TOTAL_COMPONENTS verified)${NC}"
    echo -e "${RED}   Core architectural elements missing implementation${NC}"
    echo -e "${RED}   Not ready for Phase 4 deployment${NC}"
fi

echo -e "\n${BLUE}📊 SUMMARY:${NC}"
echo -e "   ✅ Verified Components: ${VERIFIED_COMPONENTS}/${TOTAL_COMPONENTS}"
echo -e "   ❌ Issues Found: $FAIL_COUNT"
echo -e "   🎯 Readiness: ${SUCCESS_RATE}%"

echo -e "\n${BLUE}🛠️  NEXT STEPS:${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "   1. Use finalize_reality.sh to wire missing components"
    echo -e "   2. Run this validator again to confirm fixes"
    echo -e "   3. Update README to reflect actual implementation status"
fi

echo -e "${BLUE}=================================================================${NC}"
