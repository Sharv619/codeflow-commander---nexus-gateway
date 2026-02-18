# 🏰 Digital Fortress v2.0

**Local-Only Code Intelligence • Self-Learning • 100% Private**

Digital Fortress is a unified code review and intelligence system that combines the power of `codeflow-hook` (npm package with 191+ weekly downloads) with a local-only AI engine. Your code **never leaves your laptop**.

## 🔒 Security First

- **AES-256-GCM encryption** for all local data
- **Password-based key derivation** (PBKDF2 with 100k iterations)
- **100% offline operation** via Ollama local models
- **No external API calls** in fortress mode
- **Self-learning** from your patterns - stored locally

## 🚀 Quick Start

### Option 1: Digital Fortress (Recommended for Privacy)

```bash
# Clone and enter the repository
git clone <your-repo>
cd <your-repo>

# Initialize fortress
node fortress.js init

# Follow prompts to:
# 1. Set encryption password
# 2. Download Ollama models
# 3. Install git hooks
```

### Option 2: codeflow-hook (npm package - maintains backward compatibility)

```bash
# Install globally
npm install -g codeflow-hook

# Configure for local mode
codeflow-hook config --provider local
codeflow-hook models --install codellama:7b-code

# Or use external APIs (original behavior)
codeflow-hook config --provider gemini --key YOUR_API_KEY
```

## 📦 Components

### 1. Digital Fortress CLI (`fortress.js`)

Unified command-line interface for maximum privacy:

```bash
fortress init              # Initialize with encryption
fortress config            # View/change configuration
fortress review [file]     # Review code locally
fortress learn             # Learn from your patterns
fortress status            # Check fortress status
fortress hook-install      # Install pre-commit hook
fortress serve             # Start local API server
```

### 2. codeflow-hook (npm package)

Maintains backward compatibility while adding local mode:

```bash
codeflow-hook init                    # Setup
codeflow-hook config                  # Configure provider
codeflow-hook models                  # List available models
codeflow-hook models --install <model> # Install Ollama model
codeflow-hook analyze-diff            # Review staged changes
codeflow-hook status                  # Check status
```

## 🔧 Configuration

### Environment Variables

```bash
# Fortress Mode (blocks all external APIs)
export FORTRESS_MODE=true

# Ollama Configuration
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=codellama:7b-code

# Local Only Mode
export LOCAL_ONLY=true
export OFFLINE_MODE=true
```

### Local AI Models

Default models available:
- `codellama:7b-code` - Fast code analysis (4GB)
- `codellama:13b-code` - Higher quality (8GB)
- `llama2:7b` - General purpose (4GB)

Install models:
```bash
ollama pull codellama:7b-code
ollama pull codellama:13b-code
```

## 🧠 Self-Learning System

The fortress learns from your coding patterns:

1. **Feedback Tracking**: Records which suggestions you accept/reject
2. **Pattern Recognition**: Identifies your coding style preferences
3. **Acceptance Rate**: Calculates effectiveness per suggestion type
4. **Local Storage**: All data encrypted in SQLite database

View learning stats:
```bash
fortress learn
```

## 🪝 Git Hooks

### Pre-commit Hook (Recommended)

Automatically analyzes staged changes before each commit:

```bash
fortress hook-install
```

The hook:
1. Checks if Ollama is running (starts if not)
2. Analyzes staged changes with local AI
3. Blocks commit on critical security issues
4. Learns from your accept/reject patterns

To bypass (not recommended):
```bash
git commit --no-verify
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Digital Fortress v2.0                     │
├─────────────────────────────────────────────────────────────┤
│  🏰 fortress (Unified CLI)                                   │
│     ├── AES-256 encryption module                            │
│     ├── Ollama auto-start/management                         │
│     ├── Git hook installer                                   │
│     └── Self-learning engine                                 │
├─────────────────────────────────────────────────────────────┤
│  🐍 Python AI Engine (local_ai_engine.py)                   │
│     ├── Ollama API client                                    │
│     ├── Code review analysis                                 │
│     ├── Security scanning                                    │
│     └── SQLite learning database                             │
├─────────────────────────────────────────────────────────────┤
│  📦 codeflow-hook (npm package)                             │
│     ├── Backward compatible with external APIs              │
│     ├── Local mode via Ollama                               │
│     ├── Multi-agent review system                           │
│     └── RAG knowledge base                                  │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Encryption Details

All sensitive data is encrypted using:

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: 32 bytes random
- **IV**: 16 bytes per encryption
- **Auth Tag**: 16 bytes GCM tag

Data encrypted:
- Configuration files
- Learning patterns database
- Developer feedback history
- Session data

## 📊 Comparison

| Feature | codeflow-hook (v3.0) | Digital Fortress |
|---------|---------------------|------------------|
| External APIs | ✅ Supported | ❌ Blocked |
| Local Ollama | ✅ Supported | ✅ Required |
| Encryption | ❌ No | ✅ AES-256 |
| Self-Learning | ✅ Basic | ✅ Advanced |
| Git Hooks | ✅ Pre-commit + Pre-push | ✅ Smart Pre-commit |
| npm Package | ✅ Published | ❌ Direct use |
| Privacy Level | Configurable | Maximum |

## 🛠️ Development

### Project Structure

```
codeflow-commander---nexus-gateway/
├── fortress.js                    # Main fortress CLI
├── .fortress/
│   ├── encryption.js              # AES-256 encryption
│   ├── local_ai_engine.py         # Python AI engine
│   └── hooks/                     # Git hooks storage
├── packages/
│   └── cli-tool/                  # codeflow-hook npm package
│       ├── bin/
│       │   ├── codeflow-hook.js   # Main CLI
│       │   ├── ai-provider.js     # AI provider abstraction
│       │   ├── agents.js          # Review agents
│       │   └── rag.js             # Knowledge base
│       └── package.json
└── .fortress.env                  # Environment configuration
```

### Building

```bash
# Install dependencies
npm install

# Link fortress CLI globally
chmod +x fortress.js
npm link

# Or use directly
node fortress.js init
```

## 📝 Changelog

### v2.0.0 (Digital Fortress)
- ✅ AES-256-GCM encryption for all data
- ✅ Password-based key derivation
- ✅ Unified fortress CLI
- ✅ Smart pre-commit hook
- ✅ Ollama auto-start
- ✅ Self-learning improvements

### v3.0.0 (codeflow-hook)
- ✅ Local Ollama support
- ✅ Fixed circular dependencies
- ✅ New `models` command
- ✅ Fortress mode detection
- ✅ Backward compatibility

## 🤝 Integration

Both systems work together seamlessly:

```bash
# Use codeflow-hook for flexibility
npm install -g codeflow-hook
codeflow-hook config --provider gemini --key XXX  # External API
codeflow-hook config --provider local             # Local only

# Use fortress for maximum privacy
fortress init
fortress review
```

## ⚠️ Important Notes

1. **Never commit `.fortress/` directory** - Add to `.gitignore`
2. **Remember your password** - No recovery possible
3. **First run requires Ollama setup** - Download models
4. **Pre-commit hook blocks critical issues** - Use `--no-verify` to bypass

## 📄 License

MIT - See LICENSE file

---

**🔒 Remember: With Digital Fortress, your code never leaves your laptop.**
