# Codeflow Hook

**AI-Powered Code Analysis and Git Hook Management**

A lightweight command-line tool that provides AI-driven code analysis, automated git hook installation, and intelligent code review capabilities. This standalone CLI tool analyzes your local code changes using advanced AI models (Gemini, OpenAI GPT, or Claude) and helps maintain code quality through automated pre-commit and pre-push checks.

**✨ Standalone Package**: This CLI tool works independently and can be installed globally via npm. No additional setup or enterprise infrastructure required.

## 🚀 Features

### **AI-Powered Code Analysis**
- **Local Code Diff Analysis**: Analyze git diffs using Gemini, OpenAI GPT, or Claude AI models
- **Quality Assessment**: Get 1-10 quality ratings with detailed feedback on code changes
- **Security Detection**: Identify potential security vulnerabilities in code changes
- **Performance Insights**: Receive suggestions for performance optimizations

### **Git Hook Automation**
- **Pre-commit Hooks**: Automatic analysis of staged changes before commits
- **Pre-push Hooks**: Comprehensive code review simulation before pushing to remote
- **Quality Gates**: Prevent problematic commits and pushes based on AI analysis
- **Customizable Thresholds**: Configure when to block commits based on quality scores

### **Local Knowledge Base (RAG)**
- **Project Context Indexing**: Build searchable knowledge base from your project files
- **Context-Aware Analysis**: AI analysis considers your project's documentation and code patterns
- **Offline Capability**: Works without internet for local analysis (with indexed knowledge)
- **Incremental Updates**: Automatically update knowledge base as project evolves

### **Multi-Provider AI Support**
- **Google Gemini**: Default AI provider with latest models (1.5 Pro, 1.5 Flash, Pro)
- **OpenAI GPT**: Support for GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic Claude**: Integration with Claude 3 Opus, Sonnet, and Haiku
- **Custom Endpoints**: Connect to self-hosted or custom AI model endpoints

## 📦 Installation

### Global Installation

```bash
npm install -g codeflow-hook
```

### Local Installation (for specific projects)

```bash
npm install --save-dev codeflow-hook
```

## ⚙️ Quick Start

### 1. Configure AI Provider

Choose your AI provider and configure with your API key:

```bash
# Gemini (default, recommended)
codeflow-hook config -p gemini -k YOUR_GEMINI_API_KEY

# OpenAI
codeflow-hook config -p openai -k YOUR_OPENAI_API_KEY

# Claude/Anthropic
codeflow-hook config -p claude -k YOUR_CLAUDE_API_KEY
```

### 2. Install Git Hooks

```bash
codeflow-hook install
```

### 3. Start Analyzing Code

```bash
# Analyze your current changes
git diff | codeflow-hook analyze-diff

# Or let the hooks run automatically on commit/push
git add .
git commit -m "feat: add new feature"
```

## 🛠️ Commands

### Core Commands

```bash
codeflow-hook config     # Configure AI provider settings
codeflow-hook install    # Install git hooks
codeflow-hook analyze-diff # Analyze code changes
codeflow-hook index      # Build local knowledge base
codeflow-hook status     # Check installation status
```

### Usage Examples

```bash
# Configure with Gemini (default)
codeflow-hook config -p gemini -k your-api-key

# Install hooks in current project
codeflow-hook install

# Analyze staged changes
git diff --staged | codeflow-hook analyze-diff

# Build project knowledge base
codeflow-hook index

# Check everything is working
codeflow-hook status
```

## 🔧 Configuration

Configuration is stored in `~/.codeflow-hook/config.json`:

```json
{
  "provider": "gemini",
  "apiKey": "your-api-key",
  "model": "gemini-1.5-pro-latest"
}
```

### Supported AI Providers

- **Gemini**: `provider: "gemini"` - Google AI (recommended)
- **OpenAI**: `provider: "openai"` - GPT models
- **Claude**: `provider: "claude"` - Anthropic models

## 📋 Requirements

- Node.js 16+
- Git repository
- AI API key (Gemini, OpenAI, or Claude)

## 🔒 Security & Privacy

- **Local Processing**: All code analysis happens on your machine
- **API Keys Stored Locally**: Keys are stored in `~/.codeflow-hook/config.json`
- **No Data Collection**: Code diffs are only sent to your configured AI provider
- **No Telemetry**: No usage data is collected or transmitted

## 🐛 Troubleshooting

### Common Issues

**"No configuration found"**
```bash
codeflow-hook config -k YOUR_API_KEY
```

**Hooks not running**
```bash
codeflow-hook install
# On Windows, ensure hooks are executable
```

**API errors**
- Verify your API key is valid and has quota remaining
- Check your internet connection
- Try a different AI provider

### Manual Hook Setup

If automatic installation fails:

1. Create `.git/hooks/pre-commit`:
```bash
#!/bin/sh
codeflow-hook analyze-diff
```

2. Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## 📄 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**🚀 Enhance your development workflow with AI-powered code analysis!**

```bash
npm install -g codeflow-hook
codeflow-hook config -k YOUR_API_KEY
codeflow-hook install
