# Codeflow Commander — Nexus Gateway CLI

[![NPM Version](https://img.shields.io/npm/v/codeflow-cli-tool.svg)](https://www.npmjs.com/package/codeflow-cli-tool)
[![Downloads](https://img.shields.io/npm/dm/codeflow-cli-tool.svg)](https://www.npmjs.com/package/codeflow-cli-tool)
[![License](https://img.shields.io/npm/l/codeflow-cli-tool.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Sharv619/codeflow-commander---nexus-gateway/ci.yml)](https://github.com/Sharv619/codeflow-commander---nexus-gateway/actions)
[![Coverage](https://img.shields.io/codecov/c/github/Sharv619/codeflow-commander---nexus-gateway)](https://codecov.io/gh/Sharv619/codeflow-commander---nexus-gateway)

**The autonomous engineering CLI for enterprise-scale AI code review and workflow automation**

Your gateway to the Codeflow Commander Nexus Gateway — a comprehensive AI-driven engineering ecosystem that spans the entire software development lifecycle. This CLI tool serves as the entry point to enterprise-wide autonomous engineering capabilities, from intelligent code analysis to organization-scale workflow automation.

## 🚀 Quick Start (3 Commands)

```bash
# 1. Install globally
npm install -g codeflow-cli-tool

# 2. Configure your AI provider
codeflow-hook config

# 3. Install git hooks and start reviewing
codeflow-hook install
```

## 🎯 Why Codeflow Commander?

### 🤖 Multi-Modal AI Intelligence
- **Enterprise Knowledge Graph (EKG)**: Cross-repository intelligence and semantic dependency mapping
- **Autonomous Agent Network (AAN)**: Self-healing operations and workflow automation
- **Multi-Modal Interface Layer (MMIL)**: Conversational code generation and design-to-code pipeline
- **Predictive Intelligence Engine (PIE)**: Tech debt forecasting and performance prediction

### 🛡️ Enterprise-Grade Security
- **Real-time Compliance**: GDPR, HIPAA, SOX compliance checking
- **Security Pattern Detection**: Hardcoded secrets, SQL injection, XSS vulnerabilities
- **Supply Chain Intelligence**: Vulnerability tracking and license compliance
- **Governance Safety Framework**: Dynamic access control and emergency controls

### ⚡ Developer Experience
- **Zero-Configuration**: Works out of the box with intelligent defaults
- **Multi-Provider Support**: Gemini, OpenAI, Claude, and local Ollama models
- **RAG-Powered**: Context-aware analysis using your project's knowledge base
- **Git Integration**: Seamless pre-commit and pre-push hook integration

## 📊 Comparison: Codeflow vs CodeRabbit vs Standard Linters

| Feature | Codeflow Commander | CodeRabbit | Standard Linters |
|---------|-------------------|------------|------------------|
| **AI Code Review** | ✅ Multi-modal AI with RAG | ✅ Single AI provider | ❌ No AI |
| **Multi-Modal Support** | ✅ Gemini, OpenAI, Claude, Ollama | ❌ Limited | ❌ No |
| **Local AI Support** | ✅ Ollama integration | ❌ Cloud-only | ❌ No |
| **Enterprise Knowledge Graph** | ✅ Cross-repository intelligence | ❌ Single repo | ❌ No |
| **Autonomous Agents** | ✅ Self-healing operations | ❌ Manual workflows | ❌ No |
| **Security Scanning** | ✅ Real-time + compliance | ✅ Basic security | ✅ Basic linting |
| **Predictive Analytics** | ✅ Tech debt forecasting | ❌ No | ❌ No |
| **Git Hook Integration** | ✅ Pre-commit + pre-push | ✅ Pre-commit only | ✅ Basic hooks |
| **RAG Context** | ✅ Project knowledge base | ❌ No context | ❌ No |
| **Enterprise Scale** | ✅ Multi-repository federation | ❌ Single repository | ❌ Limited |

## 🏗️ Architecture Overview

The CLI serves as your interface to the Codeflow Commander Nexus Gateway — a distributed, autonomous engineering platform designed for enterprise-scale operation.

```
┌─────────────────────────────────────────────────────────┐
│               MULTI-MODAL INTERFACE LAYER (MMIL)      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│  │ Conversational  │ │ Design→Code     │ │  IDE        │ │
│  │ Interfaces      │ │ Pipeline        │ │ Integrations│ │
│  └─────────────────┘ └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────┐
│         AUTONOMOUS AGENT NETWORK (AAN) - ORCHESTRATOR  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│  │ Workflow Agents │ │ Maintenance     │ │ Self-Heal   │ │
│  │                 │ │ Bots            │ │ Agents      │ │
│  └─────────────────┘ └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────┐
│      GOVERNANCE & SAFETY FRAMEWORK - RISK CONTROL      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│  │ Permission      │ │ Audit &        │ │ Emergency    │ │
│  │ Engine          │ │ Compliance      │ │ Controls    │ │
│  └─────────────────┘ └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────┐
│     ENTERPRISE KNOWLEDGE GRAPH (EKG) - INTELLIGENCE    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│  │ Cross-Repo      │ │ Semantic        │ │ Expert      │ │
│  │ Dependencies    │ │ Mapping         │ │ Discovery   │ │
│  └─────────────────┘ └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────┐
│  PREDICTIVE INTELLIGENCE ENGINE (PIE) - FORECASTING    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│  │ Tech Debt       │ │ Performance     │ │ Risk        │ │
│  │ Forecasting     │ │ Prediction      │ │ Analytics   │ │
│  └─────────────────┘ └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────┐
│      DISTRIBUTED EXECUTION ENGINE (DEE) - RUNTIME      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│  │ Repository      │ │ Workflow        │ │ State       │ │
│  │ Federation      │ │ Orchestration   │ │ Sync        │ │
│  └─────────────────┘ └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────┐
│         EXTERNAL SYSTEMS INTEGRATION                    │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │GitHub│ │GitLab│ │JIRA │ │Slack│ │Jenkins│     │
│  │Actions│ │     │ │     │ │     │ │       │     │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────────────────────────────┘
```

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g codeflow-cli-tool
```

### Local Installation (for specific projects)

```bash
npm install --save-dev codeflow-cli-tool
```

## ⚙️ Setup

### 1. Configure AI Provider

Choose your AI provider and configure with your API key:

**Gemini (default):**
```bash
codeflow-hook config -p gemini -k YOUR_GEMINI_API_KEY
```
*You'll be prompted to select a model: `gemini-1.5-pro-latest`, `gemini-1.5-flash-latest`, or `gemini-pro`*

**OpenAI:**
```bash
codeflow-hook config -p openai -k YOUR_OPENAI_API_KEY
```
*You'll be prompted to select a model: `gpt-4o`, `gpt-4-turbo`, `gpt-4`, or `gpt-3.5-turbo`*

**Claude/Anthropic:**
```bash
codeflow-hook config -p claude -k YOUR_CLAUDE_API_KEY
```
*You'll be prompted to select a model: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, or `claude-3-haiku-20240307`*

**🎯 Local AI Spotlight: Ollama Integration**

For privacy-focused, offline AI analysis:

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama2
ollama pull codellama
ollama pull gemma

# Configure Codeflow to use Ollama
codeflow-hook config -p ollama -m llama2
```

**Benefits of Local AI:**
- ✅ **Privacy**: No data leaves your machine
- ✅ **Cost**: No API fees or usage limits
- ✅ **Offline**: Works without internet connection
- ✅ **Custom Models**: Use any Ollama-compatible model
- ✅ **Speed**: No network latency for local processing

### 2. Install Git Hooks

In your project directory:

```bash
codeflow-hook install
```

This creates:
- `pre-commit`: AI analysis of staged changes
- `pre-push`: Full CI/CD simulation (tests + AI review)

### 3. Index Project Knowledge (RAG Setup)

Build a local knowledge base for context-aware analysis:

```bash
# Index current project files for RAG
codeflow-hook index

# Dry run to see what files would be indexed
codeflow-hook index --dry-run
```

The knowledge base is stored in `.codeflow/index/` and includes:
- README.md and documentation files
- Source code files (.ts, .tsx, .js, .jsx, .json)
- Configuration files (package.json, jest.config.*, etc.)
- Architecture and design documents

### 4. Check Status

```bash
codeflow-hook status
```

## 🛠️ Commands

### Core Commands

**Index Project Knowledge**:
```bash
# Build local RAG knowledge base
codeflow-hook index

# Preview what will be indexed
codeflow-hook index --dry-run
```

**Analyze Diff**:
```bash
# Analyze staged changes
git diff --staged | codeflow-hook analyze-diff

# Disable RAG context (faster but less precise)
git diff | codeflow-hook analyze-diff --no-rag

# Use legacy monolithic analysis
git diff | codeflow-hook analyze-diff --legacy
```

**Configuration & Setup**:
```bash
# Configure AI provider
codeflow-hook config -p gemini -k YOUR_API_KEY

# Install git hooks
codeflow-hook install

# Check installation status
codeflow-hook status
```

### Advanced Options

```bash
# Use legacy mode for backwards compatibility
codeflow-hook analyze-diff --legacy

# Skip RAG for faster analysis
codeflow-hook analyze-diff --no-rag

# Custom hooks directory
codeflow-hook install --hooks-dir .custom-hooks
```

### View Help

```bash
codeflow-hook --help             # Main help
codeflow-hook index --help      # Index command help
codeflow-hook analyze-diff --help # Analysis options
```

## 🔧 Configuration

Configuration is stored in `~/.codeflow-hook/config.json`:

```json
{
  "provider": "gemini",
  "apiKey": "your-api-key",
  "apiUrl": "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
  "model": "gemini-pro"
}
```

### Supported AI Providers

- **Gemini**: `provider: "gemini"` - Default, uses Google AI
- **OpenAI**: `provider: "openai"` - GPT models
- **Claude**: `provider: "claude"` - Anthropic models
- **Ollama**: `provider: "ollama"` - Local AI models

Each provider has optimized prompts and supports custom endpoints.

## 🚨 Troubleshooting

### Common Issues

**"No configuration found"**
```bash
codeflow-hook config -k YOUR_API_KEY
```

**Hooks not running**
```bash
codeflow-hook install
# Ensure scripts are executable
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

**API errors**
- Verify your API key is valid
- Check AI provider service status
- Ensure you have quota remaining

**Ollama not working**
```bash
# Check if Ollama is running
ollama list

# Start Ollama service
ollama serve

# Verify model is available
ollama pull llama2
```

**Performance issues**
```bash
# Use faster models
codeflow-hook config -p gemini -m gemini-1.5-flash-latest

# Disable RAG for faster analysis
git diff | codeflow-hook analyze-diff --no-rag
```

### System Diagnostics

Run `codeflow-hook doctor` to check:
- ✅ Node.js version compatibility (>= 18)
- ✅ Git repository presence
- ✅ AI provider connectivity
- ✅ Configuration file security
- ✅ Network connectivity
- ✅ Ollama service (if configured)

### Manual Hook Setup

If automatic installation fails:

1. Create `.git/hooks/pre-commit`
2. Add executable permissions: `chmod +x .git/hooks/pre-commit`
3. Call the CLI: `npx codeflow-hook analyze-diff "$(git diff --cached)"`

## 🎯 AI Analysis Output

The tool provides:

- **Rating**: 1-10 quality score with color coding
- **Summary**: Brief assessment of changes
- **Issues**: Specific problems with solutions
- **Recommendations**: Improvement suggestions

Example output:
```
⭐ **Rating:** 9/10
📝 **Summary:** Clean implementation with good separation of concerns

⚠️ **Issues:**
- Consider adding input validation for edge cases

💡 **Recommendations:**
- Add comprehensive error handling
- Consider extracting common logic to a utility function
```

## 🔒 Security

- API keys stored locally (not in your repo)
- Have to make an .env file for the credentials 
- No data sent to third parties except configured AI providers
- Code diffs analyzed locally before sending
- Enterprise-grade encryption for sensitive data

## 📋 Requirements

- Node.js 18+
- Git repository
- AI provider API key (or Ollama for local AI)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas for Contribution

- **Security Patterns**: Add new vulnerability detection rules
- **AI Providers**: Integrate additional AI services
- **Vector Stores**: Implement new knowledge base backends
- **Git Hooks**: Enhance pre-commit and pre-push functionality

## 📄 License

MIT License - see LICENSE file for details

## 🎉 Acknowledgments

Built with ❤️ using enterprise-grade technologies:

### **Core Intelligence Stack**
- **Multi-Modal AI Integration**: Google Gemini, OpenAI GPT-4, Anthropic Claude, Ollama
- **Distributed Graph Database**: Neo4j Enterprise for Knowledge Graph operations
- **Federated Learning Infrastructure**: PyTorch and TensorFlow for ML model training
- **Container Orchestration**: Kubernetes for enterprise-scale deployment

### **Development & CLI Framework**
- **Commander.js**: Professional CLI experience and command orchestration
- **Chalk & Ora**: Advanced terminal rendering with progress indicators
- **Axios**: Enterprise HTTP client with retry logic and circuit breakers
- **Node.js & TypeScript**: Type-safe, scalable runtime environment

### **Enterprise Integrations**
- **Git Platforms**: Native GitHub, GitLab, and Bitbucket integration
- **Project Management**: JIRA, Linear, and Azure DevOps workflows
- **Communication**: Slack, Microsoft Teams, and Discord integrations
- **Monitoring**: Datadog, New Relic, and Prometheus telemetry

### **Security & Governance**
- **Audit Framework**: Blockchain-verified audit trails
- **Access Management**: OAuth 2.0, SAML, and LDAP integration
- **Encryption**: End-to-end encryption with key management
- **Compliance**: SOC 2, GDPR, and enterprise security standards

---

**🚀 Ready to transform your organization's engineering capabilities?**

Join the autonomous engineering revolution with Codeflow Commander Nexus Gateway — where AI meets enterprise-scale software development.

**Install today and experience organization-wide autonomous engineering:**
```bash
npm install -g codeflow-cli-tool
```

**Visit [codeflow-commander-nexus-gateway](https://github.com/Sharv619/codeflow-commander---nexus-gateway) to explore the full platform.**

**Questions?** Join our [Discussions](https://github.com/Sharv619/codeflow-commander---nexus-gateway/discussions) or [Report Issues](https://github.com/Sharv619/codeflow-commander---nexus-gateway/issues)