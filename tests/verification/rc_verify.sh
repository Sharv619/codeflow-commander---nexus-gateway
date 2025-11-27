#!/bin/bash

# CodeFlow Commander - Release Candidate Verification
# Validates Build, Packaging, and Runtime Integrity

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 STARTING RELEASE CANDIDATE VALIDATION (v1.0.0)${NC}"
echo "---------------------------------------------------"

FAILURES=0

# Function to run a check
run_check() {
    NAME=$1
    CMD=$2
    echo -ne "Checking ${NAME}..."
    if eval "$CMD" > /dev/null 2>&1; then
        echo -e "${GREEN} [PASS]${NC}"
    else
        echo -e "${RED} [FAIL]${NC}"
        echo -e "   ❌ Command failed: $CMD"
        ((FAILURES++))
    fi
}

# ---------------------------------------------------------
# 1. CLI PACKAGING & INSTALLATION
# ---------------------------------------------------------
echo -e "\n📦 [1/4] Validating CLI Package Structure"

# Check if package.json has the correct bin entry
run_check "package.json bin entry" "grep '\"bin\":' cli-tool/package.json | grep '\"codeflow-hook\"'"

# Check if the executable file has the shebang
run_check "Executable Shebang" "head -n 1 cli-tool/bin/codeflow-hook.js | grep '#!/usr/bin/env node'"

# Simulate NPM Pack (Dry Run) to see if it bundles correctly
echo -ne "Simulating NPM Pack..."
cd cli-tool
if npm pack --dry-run > /dev/null 2>&1; then
    echo -e "${GREEN} [PASS]${NC}"
else
    echo -e "${RED} [FAIL]${NC} (Check your package.json files array)"
    ((FAILURES++))
fi
cd ..

# ---------------------------------------------------------
# 2. RUNTIME SAFETY CHECKS
# ---------------------------------------------------------
echo -e "\n🏃 [2/4] Validating Runtime Execution"

# Does the CLI help command run without crashing?
run_check "CLI Help Command" "node cli-tool/bin/codeflow-hook.js --help"

# Verify the Config command doesn't crash on missing args
run_check "Config Command Safety" "node cli-tool/bin/codeflow-hook.js config --help"

# Verify the RAG Index command structure
run_check "Index Command Availability" "node cli-tool/bin/codeflow-hook.js index --help"

# ---------------------------------------------------------
# 3. SENTINEL DOCKER READINESS
# ---------------------------------------------------------
echo -e "\n🐳 [3/4] Validating Sentinel Docker Config"

# Check if Dockerfile exists
run_check "Sentinel Dockerfile" "[ -f codeflow-sentinel/Dockerfile ]"

# Check if requirements.txt exists
run_check "Python Requirements" "[ -f codeflow-sentinel/requirements.txt ]"

# Verify Dockerfile exposes port 8000
run_check "Port 8000 Exposed" "grep 'EXPOSE 8000' codeflow-sentinel/Dockerfile"

# ---------------------------------------------------------
# 4. DOCUMENTATION ASSETS
# ---------------------------------------------------------
echo -e "\n📚 [4/4] Validating Documentation Assets"

# Check if the architecture diagrams exist where the README expects them
# (Assuming you embedded them or linked to them in docs/)
run_check "Architecture Diagram" "[ -f docs/architecture.mermaid ]"
run_check "Workflow Diagram" "[ -f docs/workflow.mermaid ]"

# ---------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------
echo -e "\n---------------------------------------------------"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ RELEASE CANDIDATE VERIFIED.${NC}"
    echo "   You are ready to run 'npm publish' and push the Docker image."
else
    echo -e "${RED}❌ VERIFICATION FAILED with $FAILURES errors.${NC}"
    echo "   Fix the items marked [FAIL] before publishing."
fi
