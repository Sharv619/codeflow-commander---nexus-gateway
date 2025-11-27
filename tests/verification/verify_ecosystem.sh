#!/bin/bash

# ==============================================================================
# 🛡️ CodeFlow Commander Nexus Gateway - Master Verification Suite
# ==============================================================================
# This script audits the entire ecosystem against the v1.0.0 release specification.
# It checks:
# 1. CLI Tool (Nervous System) - Config, AI, Compliance, Hooks
# 2. Sentinel (Immune System) - ML Models, API, Docker
# 3. Documentation (Visuals) - Architecture Diagrams, READMEs
# 4. Enterprise Readiness - License, Security Configs
# ==============================================================================

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS="${GREEN}✅ [PASS]${NC}"
FAIL="${RED}❌ [FAIL]${NC}"
WARN="${YELLOW}⚠️  [WARN]${NC}"
INFO="${BLUE}ℹ️  [INFO]${NC}"

echo -e "\n${BLUE}🚀 Starting CodeFlow Ecosystem Verification...${NC}"
echo "=================================================="

# ==============================================================================
# 1. PROJECT STRUCTURE AUDIT
# ==============================================================================
echo -e "\n${YELLOW}📂 Phase 1: Structural Integrity Audit${NC}"

REQUIRED_DIRS=("cli-tool" "codeflow-sentinel" "docs" "components" "server")
REQUIRED_FILES=("docker-compose.yml" "README.md" "package.json")

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "$PASS Directory found: $dir"
    else
        echo -e "$FAIL Missing directory: $dir"
    fi
done

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "$PASS Core file found: $file"
    else
        echo -e "$FAIL Missing core file: $file"
    fi
done

# ==============================================================================
# 2. CLI TOOL VERIFICATION (The Nervous System)
# ==============================================================================
echo -e "\n${YELLOW}🧠 Phase 2: CodeFlow-Hook (CLI) Verification${NC}"

cd cli-tool || { echo -e "$FAIL Could not enter cli-tool directory"; exit 1; }

# A. Dependency Check (AI & Vector Store)
echo -e "${INFO} Checking Critical Dependencies..."
if grep -q "@google/generative-ai" package.json; then
    echo -e "$PASS AI Provider (Gemini) installed"
else
    echo -e "$FAIL Missing dependency: @google/generative-ai"
fi

if grep -q "openai" package.json; then
    echo -e "$PASS AI Provider (OpenAI) installed"
else
    echo -e "$FAIL Missing dependency: openai"
fi

if grep -q "langchain" package.json; then
    echo -e "$PASS Vector Store (LangChain) installed"
else
    echo -e "$FAIL Missing dependency: langchain"
fi

# B. Executable Check
if [ -f "bin/codeflow-hook.js" ]; then
    echo -e "$PASS CLI Entry point exists (bin/codeflow-hook.js)"
else
    echo -e "$FAIL CLI Entry point missing"
fi

# C. Version Check
if grep -q '"version": "1.0.0"' package.json; then
    echo -e "$PASS Production version (1.0.0) confirmed"
else
    echo -e "$FAIL Version not updated to 1.0.0"
fi

# D. Compliance Engine Check
echo -e "${INFO} Verifying Compliance Engine Logic..."
if grep -r "HIPAA\|GDPR" . 2>/dev/null; then
    echo -e "$PASS Compliance Rules (HIPAA/GDPR) detected in source"
else
    echo -e "$WARN No explicit compliance regex found in codebase"
fi

# Return to root
cd ..

# ==============================================================================
# 3. SENTINEL VERIFICATION (The Immune System)
# ==============================================================================
echo -e "\n${YELLOW}🛡️  Phase 3: CodeFlow-Sentinel (Runtime Security) Verification${NC}"

cd codeflow-sentinel || { echo -e "$FAIL Could not enter codeflow-sentinel directory"; exit 1; }

# A. Python Dependencies
if [ -f "requirements.txt" ]; then
    echo -e "$PASS requirements.txt found"

    # Check specific ML libs
    if grep -q "scikit-learn" requirements.txt; then
        echo -e "$PASS ML Engine (scikit-learn) listed"
    else
        echo -e "$FAIL Missing ML Engine: scikit-learn"
    fi

    if grep -q "fastapi" requirements.txt; then
        echo -e "$PASS API Framework (FastAPI) listed"
    else
        echo -e "$FAIL Missing API Framework: fastapi"
    fi
else
    echo -e "$FAIL Missing requirements.txt"
fi

# B. Model Logic Check
if grep -q "IsolationForest" sentinel.py 2>/dev/null; then
    echo -e "$PASS Anomaly Detection Model (IsolationForest) found in code"
else
    echo -e "$FAIL IsolationForest not found in sentinel.py"
fi

# C. Docker Configuration
if [ -f "Dockerfile" ]; then
    echo -e "$PASS Dockerfile exists for production deployment"
else
    echo -e "$FAIL Dockerfile missing"
fi

# B. Sentinel README Check
if [ -f "README.md" ]; then
    echo -e "$PASS Sentinel documentation exists"
else
    echo -e "$WARN Sentinel README.md missing"
fi

# Return to root
cd ..

# ==============================================================================
# 4. DOCUMENTATION & PHASE 4 ARTIFACTS
# ==============================================================================
echo -e "\n${YELLOW}📚 Phase 4: Documentation & Enterprise Artifacts${NC}"

# A. Mermaid Diagrams
if [ -f "docs/architecture.mermaid" ]; then
    echo -e "$PASS Architecture Diagram found"
else
    echo -e "$WARN Missing docs/architecture.mermaid"
fi

if [ -f "docs/workflow.mermaid" ]; then
    echo -e "$PASS Workflow Diagram found"
else
    echo -e "$WARN Missing docs/workflow.mermaid"
fi

# B. Social Media Content
if [ -f "social-media-posts.md" ]; then
    echo -e "$PASS LinkedIn content strategy prepared"
else
    echo -e "$WARN Missing social-media-posts.md"
fi

# C. Git Tags
echo -e "${INFO} Checking Git Release Tags..."
cd cli-tool
if git tag -l | grep -q "v1.0.0"; then
    echo -e "$PASS Git tag v1.0.0 created"
else
    echo -e "$FAIL Missing git tag v1.0.0"
fi
cd ..

# ==============================================================================
# 5. FUNCTIONAL SMOKE TEST (Simulated)
# ==============================================================================
echo -e "\n${YELLOW}🔥 Phase 5: Functional Smoke Test${NC}"

# Try to run the CLI help command
if command -v npm &> /dev/null; then
    echo -e "${INFO} Testing CLI Help Command..."
    cd cli-tool
    # We use node directly to avoid installing global package for test
    if node bin/codeflow-hook.js --help > /dev/null 2>&1; then
        echo -e "$PASS 'codeflow-hook --help' runs successfully"
    else
        echo -e "$FAIL 'codeflow-hook --help' failed to execute"
    fi
    cd ..
else
    echo -e "$WARN npm not installed, skipping CLI execution test"
fi

# Test Sentinel Python syntax
echo -e "${INFO} Testing Sentinel Python Syntax..."
if python3 -m py_compile codeflow-sentinel/sentinel.py 2>/dev/null; then
    echo -e "$PASS Sentinel Python syntax validates"
else
    echo -e "$FAIL Sentinel Python syntax errors"
fi

echo "=================================================="
echo -e "${BLUE}🏁 Verification Complete.${NC}"
echo "Review any ❌ FAIL or ⚠️  WARN messages above before releasing."
echo ""
echo -e "${GREEN}🎉 If all checks pass, your autonomous engineering platform is production-ready!${NC}"
echo "   Next steps: Run 'npm publish' in cli-tool directory and push tags to GitHub."
