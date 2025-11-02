# Codeflow Commander — Nexus Gateway CLI

**AI-Powered Code Analysis and Git Hook Management**

A lightweight command-line tool that provides AI-driven code analysis, automated git hook installation, and intelligent code review capabilities. This CLI client analyzes your local code changes using advanced AI models and helps maintain code quality through automated pre-commit and pre-push checks.

**⚠️ Important**: This is the **client-side CLI tool** only. Enterprise features like the Enterprise Knowledge Graph (EKG), Autonomous Agent Network (AAN), and ingestion services are part of the broader Codeflow Commander platform and require separate enterprise deployment.

## 🚀 What This CLI Tool Provides

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

## 📦 How It Works

The CLI tool operates entirely on your local machine and analyzes your code changes using AI. Here's the workflow:

1. **Local Analysis**: When you run analysis, the tool captures your git diff locally
2. **AI Processing**: Sends the diff to your configured AI provider (Gemini/OpenAI/Claude)
3. **Context Enhancement**: Optionally includes your project's indexed knowledge for better analysis
4. **Feedback Generation**: Returns quality scores, issues, and recommendations
5. **Hook Integration**: Automatically runs during git operations to maintain code quality

**No data is sent to external servers** except for AI API calls to your configured provider. Your code stays on your machine.

## 📦 Installation

### Global Installation

```bash
npm install -g codeflow-hook
```

### Local Installation (for specific projects)

```bash
npm install --save-dev codeflow-hook
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

**Custom model/URL:**
```bash
codeflow-hook config -p openai -k YOUR_API_KEY -m gpt-3.5-turbo -u https://your-custom-endpoint.com
```

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

## 🔄 How It Works

### Pre-commit Hook
- Analyzes staged changes only
- Provides quick feedback on code quality
- Prevents problematic commits

### Pre-push Hook
- Runs full test suite
- Performs comprehensive AI code review
- Simulates deployment pipeline
- Blocks pushes with failing checks

### AI Analysis Features
- Code quality assessment
- Security vulnerability detection
- Performance optimization suggestions
- Best practice recommendations
- Maintainability evaluation

## 💡 Usage Examples

### Standard Development Workflow

```bash
# Stage your changes
git add .

# Pre-commit hook automatically runs AI analysis
git commit -m "feat: add new authentication"

# Pre-push hook runs tests and full AI review
git push origin main
```

### Manual Analysis

```bash
# Analyze uncommitted changes
git diff | codeflow-hook analyze-diff

# Analyze specific files
git diff path/to/file.js | codeflow-hook analyze-diff

# Analyze between commits
git diff HEAD~1 HEAD | codeflow-hook analyze-diff
```

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

Each provider has optimized prompts and supports custom endpoints.

## 📋 Requirements

- Node.js 16+
- Git repository
- Gemini API key

##  Security

- API keys stored locally (not in your repo)
- Have to make an .env file for the credentials
- No data sent to third parties except Google Gemini
- Code diffs analyzed locally before sending

## 🐛 Troubleshooting

### Common Issues

**"No configuration found"**
```bash
codeflow-hook config -k YOUR_API_KEY
```

**Hooks not running**
```bash
- **Design Pattern Compliance**: Validation against organizational architectural standards
- **Coupling Analysis**: Detection of tight coupling and circular dependencies
- **Layer Architecture**: Enforcement of proper separation between presentation, business logic, and data layers
- **Complexity Assessment**: Monitoring of code complexity and maintainability metrics

**⚡ Performance Agent**:
- **Algorithm Analysis**: Detection of inefficient algorithms and time/space complexity issues
- **Memory Optimization**: Identification of memory leaks and inefficient data structures
- **I/O Optimization**: Analysis of database queries, file operations, and network calls
- **Caching Opportunities**: Recommendations for implementing caching strategies

**✨ Quality Agent**:
- **Code Style Enforcement**: Automated linting and formatting consistency checks
- **Documentation Analysis**: Validation of code comments, JSDoc, and README completeness
- **Test Coverage Assessment**: Analysis of unit test coverage and quality
- **Dead Code Detection**: Identification of unused functions, variables, and imports

### **Federated Data Architecture**
Enterprise-scale data management across distributed repositories:

**🌐 Enterprise Knowledge Graph (EKG)**:
- Multi-modal data integration (code, documentation, metrics, design artifacts)
- Semantic relationship mapping across the entire organization
- Real-time knowledge updates with conflict-free replication

**📈 Predictive Intelligence Engine (PIE)**:
- Time-series analytics for development velocity and quality trends
- Anomaly detection using unsupervised learning algorithms
- Forecasting models trained on enterprise development data

### **Distributed Execution Framework**
Coordination of autonomous operations across multiple systems:

**⚡ Distributed Execution Engine (DEE)**:
- Multi-repository workflow orchestration with dependency management
- Resource optimization through intelligent load balancing
- Federated state management with eventual consistency guarantees

**🔐 Governance Safety Framework (GSF)**:
- Risk-based permission evaluation with dynamic access controls
- Multi-level audit trails with blockchain-verified immutability
- Emergency stop mechanisms with graduated escalation protocols

### **Structured Intelligence Output Format**
Enterprise reporting with actionable insights and automated workflows:

```
🏢 Enterprise Code Review Summary:
   🔒 Organization-wide Security risks: 2
   🏗️ Architecture Optimization opportunities: 7
   📝 Cross-repository Maintainability issues: 15
   🎯 Predictive Maintenance alerts: 3

📊 Trend Analysis:
   📈 Code quality velocity: +12% (improving)
   📉 Tech debt accumulation: -8% (reducing)
   🎲 Risk exposure index: LOW (confidence: 94%)

📋 Recommended Actions:
   🔧 Automated fixes available for 23 issues
   🚀 Cross-repository refactor suggested for auth module
   📅 Maintenance window scheduled for Q4 dependency updates
```

### **Multi-Repository Analysis Benefits**
- **Scale**: Analyzes thousands of repositories simultaneously
- **Intelligence**: Learns organizational patterns and standards
- **Automation**: Initiates cross-cutting improvements autonomously
- **Governance**: Ensures compliance across all engineering activities
- **Prediction**: Forecasts development bottlenecks before they occur

## 💡 Usage Examples

### Standard Development Workflow

```bash
# Stage your changes
git add .

# Pre-commit hook automatically runs AI analysis
git commit -m "feat: add new authentication"

# Pre-push hook runs tests and full AI review
git push origin main
```

### Manual Analysis

```bash
# Analyze uncommitted changes
git diff | codeflow-hook analyze-diff

# Analyze specific files
git diff path/to/file.js | codeflow-hook analyze-diff

# Analyze between commits
git diff HEAD~1 HEAD | codeflow-hook analyze-diff
```

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

Each provider has optimized prompts and supports custom endpoints.

## 📋 Requirements

- Node.js 16+
- Git repository
- Gemini API key

## 🔒 Security

- API keys stored locally (not in your repo)
- Have to make an .env file for the credentials 
- No data sent to third parties except Google Gemini
- Code diffs analyzed locally before sending

## 🐛 Troubleshooting

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
- Check Gemini API service status
- Ensure you have quota remaining

### Manual Hook Setup

If automatic installation fails:

1. Create `.git/hooks/pre-commit`
2. Add executable permissions: `chmod +x .git/hooks/pre-commit`
3. Call the CLI: `npx codeflow-hook analyze-diff "$(git diff --cached)"`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎉 Acknowledgments

Built with ❤️ using enterprise-grade technologies:

### **Core Intelligence Stack**
- **Multi-Modal AI Integration**: Google Gemini, OpenAI GPT-4, Anthropic Claude
- **Distributed Graph Database**: Amazon Neptune for Enterprise Knowledge Graph operations
- **Ingestion & Query Services**: Microservices architecture with GraphQL APIs
- **Autonomous Agent Network**: Specialized agents for Security, Architecture, Performance, and Quality analysis
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
npm install -g codeflow-hook
```

**Visit [codeflow-commander-nexus-gateway](https://github.com/Sharv619/codeflow-commander---nexus-gateway) to explore the full platform.**
