# Codeflow Hook - Advanced Local AI Agent for Code Review

An intelligent Local AI Agent that transforms your development workflow with Retrieval-Augmented Generation (RAG) architecture and specialized agentic code review. Uses Google Gemini AI to provide context-aware, multi-perspective code analysis.

## 🚀 Features

- **🤖 Local AI Agent**: Advanced agentic workflow with specialized review agents
- **🧠 RAG-Powered**: Context-aware analysis using project knowledge base
- **🔍 Specialized Agents**: Security, Architecture, and Maintainability experts
- **⚡ Sub-Second Retrieval**: Fast context retrieval from local vector store
- **🔒 Local First**: Everything runs locally, APIs used only for AI inference
- **📊 Structured Output**: Clear, scannable feedback grouped by issue type
- **🔄 Automated Hooks**: Pre-commit and pre-push automation
- **🎯 Laser-Focused**: Each agent specializes in specific concern areas

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

## 🔬 Technology Overview

### Retrieval-Augmented Generation (RAG)
Codeflow Hook uses RAG to provide context-aware analysis:

1. **Local Vector Store**: Project files are indexed and stored as embeddings in `.codeflow/index/`
2. **Semantic Search**: When analyzing code changes, relevant context is retrieved using cosine similarity
3. **Context-Augmented Prompts**: AI agents receive both the code changes AND relevant project context
4. **Sub-Second Retrieval**: Fast local search ensures no delay in development workflow

### Agentic Workflow Architecture
Instead of one monolithic AI prompt, Codeflow uses specialized agents:

**🔒 Security Agent**:
- SQL injection, XSS, CSRF detection
- Credential exposure monitoring
- Insecure dependency analysis
- Authentication bypass prevention

**🏗️ Architecture Agent**:
- Design pattern violations
- Separation of concerns breaches
- Cyclomatic complexity analysis
- Data access pattern evaluation

**📝 Maintainability Agent**:
- Code documentation quality
- Naming convention consistency
- JSDoc/TypeScript annotation completeness
- Long parameter list detection
- Magic number identification

### Benefits
- **Precision**: Each agent specializes in specific concerns
- **Efficiency**: Parallel execution of specialized reviews
- **Context**: RAG provides project-specific context
- **Speed**: Local vector store enables fast retrieval
- **Scalability**: Agent architecture supports future specialization

### Structured Output Format
Results are grouped by concern type and severity:

```
📊 Code Review Summary:
   🔒 Security issues: 0
   🏗️  Architecture issues: 1
   📝 Maintainability issues: 2

📁 server.js (function)
   🏗️ HIGH: Large function exceeds 50 lines
      Line: 15-67
   📝 MEDIUM: Missing JSDoc for public function
      Line: 25-35
```

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

Built with ❤️ using:
- Google Gemini AI
- Commander.js for CLI
- Chalk for terminal colors
- Ora for loading spinners

---

**Ready to supercharge your development workflow? Install Codeflow Hook today!**
