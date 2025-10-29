# Codeflow Hook - AI-Powered Git Hooks

An interactive CI/CD simulator and lightweight pre-push code reviewer that uses Google Gemini AI to analyze your code changes before commits and pushes.

## 🚀 Features

- **AI Code Review**: Get intelligent code analysis powered by Gemini AI
- **Automated Git Hooks**: Automatic pre-commit and pre-push checks
- **CI/CD Simulation**: Simulates full pipeline including tests and security checks
- **Easy Installation**: Simple CLI setup for any project
- **Developer-Friendly**: Clear feedback with actionable suggestions

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

**OpenAI:**
```bash
codeflow-hook config -p openai -k YOUR_OPENAI_API_KEY
```

**Claude/Anthropic:**
```bash
codeflow-hook config -p claude -k YOUR_CLAUDE_API_KEY
```

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

### 3. Check Status

```bash
codeflow-hook status
```

## 🛠️ Commands

### Analyze Specific Changes

Manually analyze a git diff:

```bash
git diff --staged | codeflow-hook analyze-diff
```

### Reinstall Hooks

```bash
codeflow-hook install --hooks-dir .custom-hooks
```

### View Help

```bash
codeflow-hook --help
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
