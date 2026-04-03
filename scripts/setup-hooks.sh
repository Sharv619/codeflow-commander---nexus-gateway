#!/usr/bin/env bash
# Setup script for Codeflow Commander
# Installs dependencies, configures AI review, and installs git hooks
set -e

echo "🚀 Setting up Codeflow Commander..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Step 2: Check for Gemini API key
echo ""
echo "🔑 AI Code Review Setup"
echo "   Get a free API key at: https://ai.google.dev"
echo ""

CONFIG_DIR="$HOME/.codeflow-hook"
CONFIG_FILE="$CONFIG_DIR/config.json"

if [ -f "$CONFIG_FILE" ]; then
  echo "✅ AI config found at $CONFIG_FILE"
  PROVIDER=$(node -e "try { console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE', 'utf8')).provider || 'gemini') } catch(e) { console.log('gemini') }")
  echo "   Provider: $PROVIDER"
else
  read -p "Enter your Gemini API key (or press Enter to skip): " API_KEY

  if [ -n "$API_KEY" ]; then
    mkdir -p "$CONFIG_DIR"
    cat > "$CONFIG_FILE" << EOF
{
  "provider": "gemini",
  "apiKey": "$API_KEY",
  "apiUrl": "https://generativelanguage.googleapis.com/v1beta/models",
  "model": "gemini-2.0-flash"
}
EOF
    echo "✅ AI config saved to $CONFIG_FILE"
  else
    echo "ℹ️  Skipping AI setup — heuristic analyzer will be used as fallback"
  fi
fi

# Step 3: Install git hooks
echo ""
echo "🪝 Installing git hooks..."

HOOKS_DIR=".git/hooks"
if [ ! -d "$HOOKS_DIR" ]; then
  mkdir -p "$HOOKS_DIR"
fi

# Copy pre-commit hook
if [ -f "hooks/pre-commit" ]; then
  cp hooks/pre-commit "$HOOKS_DIR/pre-commit"
  chmod +x "$HOOKS_DIR/pre-commit"
  echo "✅ Pre-commit hook installed"
fi

# Copy pre-push hook
if [ -f "hooks/pre-push" ]; then
  cp hooks/pre-push "$HOOKS_DIR/pre-push"
  chmod +x "$HOOKS_DIR/pre-push"
  echo "✅ Pre-push hook installed"
fi

# Step 4: Quick verification
echo ""
echo "🧪 Running quick verification..."

echo "   Lint check..."
if npm run lint --silent 2>/dev/null; then
  echo "   ✅ Lint passed"
else
  echo "   ⚠️  Lint has issues (non-blocking)"
fi

echo "   Test check..."
if npm run test:pre-commit --silent 2>/dev/null; then
  echo "   ✅ Tests passed"
else
  echo "   ⚠️  Tests failed (non-blocking)"
fi

# Step 5: Done
echo ""
echo "🎉 Ready to go!"
echo ""
echo "Quick start:"
echo "  npm run dev          # Start frontend (port 5173)"
echo "  npm run server       # Start backend (port 3001)"
echo "  npm run test:all     # Run all tests"
echo "  npm run lint         # Check code quality"
echo ""
echo "Quality gates are active — every commit will be checked!"
