# Contributing to CodeFlow CLI Tool

Thank you for considering contributing to CodeFlow! We welcome contributions from everyone.

## 🚀 Quick Start

### Setting Up Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/codeflow-commander---nexus-gateway.git
   cd codeflow-commander---nexus-gateway/cli-tool
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Pre-commit Hooks**
   ```bash
   npm run install-hooks
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## 📝 Development Guidelines

### Code Style
- Use TypeScript for all new features
- Follow the existing code style and patterns
- Run `npm run test:lint` before submitting PRs
- Use `npm run test:lint -- --fix` to auto-fix linting issues

### Testing
- All new features must include tests
- Use Jest for unit and integration tests
- Tests should cover both success and failure cases
- Run `npm run test:coverage` to check coverage

### Git Workflow
- Create feature branches: `git checkout -b feature/your-feature-name`
- Commit changes with clear, descriptive messages
- Rebase on latest main before submitting PR
- Ensure all tests pass before pushing

### Commit Message Format
```
feat: add ollama support for local AI models
fix: resolve memory leak in vector store
docs: update installation instructions
test: add unit tests for config validation
```

## 🎯 Areas for Contribution

### 1. Security Patterns
Add new security detection patterns to enhance code analysis:

```javascript
// Example: Add to src/security/patterns.js
export const NEW_SECURITY_PATTERNS = [
  {
    name: 'Insecure Random Number Generation',
    pattern: /Math\.random\(\)/,
    severity: 'medium',
    description: 'Use cryptographically secure random number generation',
    fix: 'Use crypto.randomBytes() or crypto.getRandomValues()'
  }
];
```

### 2. AI Providers
Add support for new AI providers:

```javascript
// Example: Add to src/ai/providers/
export class NewAIProvider {
  constructor(config) {
    this.config = config;
  }

  async generateContent(prompt) {
    // Implementation
  }
}
```

### 3. Vector Store Backends
Implement new vector store backends:

```javascript
// Example: Add to src/knowledge/stores/
export class NewVectorStore {
  async addDocuments(documents) {
    // Implementation
  }

  async similaritySearch(query, k = 5) {
    // Implementation
  }
}
```

### 4. Git Hook Enhancements
Improve pre-commit and pre-push hook functionality:

```javascript
// Example: Add to src/hooks/
export async function enhancedPreCommit() {
  // Additional validation logic
}
```

## 🐛 Bug Reports

### Before Reporting
1. Check if the issue exists in the latest version
2. Search existing issues to avoid duplicates
3. Try to reproduce with minimal configuration

### Bug Report Template
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Run `codeflow-hook config -p gemini -k YOUR_KEY`
2. Execute `git commit -m "test"`
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment Info**
- OS: [e.g. macOS 12.6]
- Node.js version: [e.g. 18.17.0]
- CodeFlow version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

## 🚀 Feature Requests

### Before Requesting
1. Check if the feature already exists
2. Search existing issues and discussions
3. Consider if it fits the project scope

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 📋 Pull Request Guidelines

### Before Submitting
1. Ensure all tests pass: `npm test`
2. Check code coverage: `npm run test:coverage`
3. Run linting: `npm run test:lint`
4. Update documentation if needed
5. Add tests for new functionality

### PR Template
```markdown
## Summary
Brief description of changes made.

## Test plan
Describe how you tested these changes.

## Documentation
- [ ] Updated README.md
- [ ] Added inline documentation
- [ ] Updated API documentation

## Test plan
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Manual testing completed
```

## 🔧 Development Commands

### Running Locally
```bash
# Development mode
npm run dev

# Run specific test
npm test -- --testNamePattern="specific test"

# Run tests with coverage
npm run test:coverage

# Run performance benchmarks
npm run test:performance

# Run security audits
npm run test:security
```

### Building and Testing
```bash
# Install hooks
npm run install-hooks

# Run full CI pipeline locally
npm run ci

# Generate documentation
npm run docs

# Health check
npm run health-check
```

## 🤝 Code Review Process

1. **Automated Checks**: All PRs must pass CI/CD pipeline
2. **Code Review**: At least one maintainer review required
3. **Testing**: All tests must pass, new features need tests
4. **Documentation**: Changes should include documentation updates

## 📚 Architecture Overview

### Core Components
- **CLI Interface**: `bin/codeflow-hook.js` - Main entry point
- **AI Providers**: `src/ai/` - Multi-modal AI integration
- **Knowledge Graph**: `src/knowledge/` - RAG and vector stores
- **Security Engine**: `src/security/` - Compliance and vulnerability detection
- **Git Integration**: `src/hooks/` - Pre-commit and pre-push hooks

### Testing Structure
- **Unit Tests**: `tests/unit/` - Individual component testing
- **Integration Tests**: `tests/integration/` - Cross-component testing
- **E2E Tests**: `tests/e2e/` - Full workflow testing
- **Security Tests**: `tests/security/` - Security-focused testing

## 🎖️ Recognition

Contributors will be recognized in:
- Release notes for significant contributions
- README.md contributors section
- Special recognition for security improvements

## 📞 Getting Help

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: Check the README and docs folder first

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to CodeFlow! 🚀**