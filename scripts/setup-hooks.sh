#!/usr/bin/env bash
# Setup script for Codeflow Commander
# Installs dependencies, configures AI review (cloud or local Ollama), and installs git hooks
set -e

echo "🚀 Setting up Codeflow Commander..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Step 2: AI provider selection
echo ""
echo "🤖 AI Code Review Setup"
echo "   Choose your AI provider:"
echo "   1) Ollama (local, free, no API key) — recommended"
echo "   2) Google Gemini (cloud, free tier)"
echo "   3) Skip (heuristic analyzer only)"
echo ""

CONFIG_DIR="$HOME/.codeflow-hook"
CONFIG_FILE="$CONFIG_DIR/config.json"

if [ -f "$CONFIG_FILE" ]; then
  echo "✅ AI config found at $CONFIG_FILE"
  PROVIDER=$(node -e "try { console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE', 'utf8')).provider || 'gemini') } catch(e) { console.log('gemini') }")
  echo "   Provider: $PROVIDER"
else
  read -p "Select provider (1/2/3) [1]: " CHOICE
  CHOICE=${CHOICE:-1}

  mkdir -p "$CONFIG_DIR"

  if [ "$CHOICE" = "1" ]; then
    # Ollama setup
    read -p "Ollama URL [http://localhost:11434]: " OLLAMA_URL
    OLLAMA_URL=${OLLAMA_URL:-http://localhost:11434}

    # Check if Ollama is running
    if curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
      echo "✅ Ollama is running"
      MODELS=$(curl -s "$OLLAMA_URL/api/tags" | node -e "
        const d=require('fs').readFileSync('/dev/stdin','utf8');
        try { JSON.parse(d).models.forEach(m => console.log(m.name)) } catch(e) {}
      " 2>/dev/null)
      if [ -n "$MODELS" ]; then
        echo "   Available models:"
        echo "$MODELS" | nl -w2 -s'. '
        FIRST_MODEL=$(echo "$MODELS" | head -1)
        read -p "Select model [$FIRST_MODEL]: " MODEL
        MODEL=${MODEL:-$FIRST_MODEL}
      else
        MODEL="qwen2.5-coder"
        echo "⚠️  No models found. Defaulting to: $MODEL"
        echo "   Pull a model: ollama pull $MODEL"
      fi
    else
      echo "⚠️  Ollama is not running at $OLLAMA_URL"
      echo "   Install: https://ollama.ai"
      echo "   Start: ollama serve"
      MODEL="qwen2.5-coder"
    fi

    cat > "$CONFIG_FILE" << EOF
{
  "provider": "ollama",
  "model": "$MODEL",
  "ollama": {
    "enabled": true,
    "url": "$OLLAMA_URL"
  }
}
EOF
    echo "✅ Ollama config saved to $CONFIG_FILE"

  elif [ "$CHOICE" = "2" ]; then
    read -p "Enter your Gemini API key: " API_KEY
    if [ -n "$API_KEY" ]; then
      cat > "$CONFIG_FILE" << EOF
{
  "provider": "gemini",
  "apiKey": "$API_KEY",
  "apiUrl": "https://generativelanguage.googleapis.com/v1beta/models",
  "model": "gemini-2.0-flash",
  "ollama": {
    "enabled": false,
    "url": "http://localhost:11434"
  }
}
EOF
      echo "✅ Gemini config saved to $CONFIG_FILE"
    else
      echo "ℹ️  No API key — heuristic analyzer will be used"
      cat > "$CONFIG_FILE" << EOF
{
  "provider": "gemini",
  "ollama": {
    "enabled": false,
    "url": "http://localhost:11434"
  }
}
EOF
    fi
  else
    echo "ℹ️  Skipping AI setup — heuristic analyzer will be used as fallback"
    cat > "$CONFIG_FILE" << EOF
{
  "provider": "gemini",
  "ollama": {
    "enabled": false,
    "url": "http://localhost:11434"
  }
}
EOF
  fi
fi

# Step 3: Install git hooks
echo ""
echo "🪝 Installing git hooks..."

HOOKS_DIR=".git/hooks"
if [ ! -d "$HOOKS_DIR" ]; then
  mkdir -p "$HOOKS_DIR"
fi

if [ -f "hooks/pre-commit" ]; then
  cp hooks/pre-commit "$HOOKS_DIR/pre-commit"
  chmod +x "$HOOKS_DIR/pre-commit"
  echo "✅ Pre-commit hook installed"
fi

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
echo "AI provider options:"
echo "  codeflow-hook config --ollama-enable     # Switch to local Ollama"
echo "  codeflow-hook config --list-models       # List Ollama models"
echo "  codeflow-hook config -k <key> -p gemini  # Switch to Gemini"
echo ""
echo "Quality gates are active — every commit will be checked!"
