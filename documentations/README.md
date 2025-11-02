
# Codeflow Commander — AI-Powered Development Tools

A comprehensive suite of developer tools featuring a **standalone AI-powered CLI tool** for Git workflow enhancement and an **interactive CI/CD simulator** for pipeline prototyping. Transform your development experience with intelligent code analysis and automated quality gates.

## 🏗️ **Project Overview**

This repository contains two complementary tools designed to enhance developer workflows:

### **1. Codeflow Hook CLI Tool** ⭐ (Primary - Standalone npm package)
A globally installable npm package that brings AI-powered code reviews directly into any developer's git workflow. **Published to npm** and ready for immediate use in any project.

### **2. Interactive CI/CD Simulator** (Development/Prototyping Tool)
A containerized React application for prototyping and testing CI/CD pipelines with live code analysis, designed for teams building deployment workflows.

## ✨ **Key Features**

### **CI/CD Simulator**
- **Interactive Pipeline UI**: React + Vite interface simulating deployment stages
- **Live Code Analysis**: Real-time ESLint and Jest integration with detailed feedback
- **Container Orchestration**: Docker Compose setup with Nginx frontend and Express backend
- **AI Console**: Direct Gemini AI integration for advanced code analysis
- **Development Workflow**: Hot-reload development with containerized overrides

### **AI Git Workflow Tool** ⭐
- **Universal Installation**: `npm install -g codeflow-hook` works on any machine
- **Multi-Provider AI Support**: Gemini, OpenAI, Claude, or custom AI providers
- **Automated Git Hooks**: Pre-commit and pre-push quality gates with AI analysis
- **Cross-Platform**: Works on Linux, macOS, and Windows
- **Standalone Package**: No server dependencies, works independently
- **Team-Ready**: Secure API key management and configuration

## 🆕 **Recent Major Enhancements**

### **GitHub Actions CI/CD Integration**
- **CSP Hash Injection**: Automatic Content Security Policy updates via GitHub Actions
- **Permission Resolution**: Fixed repository write access for automated deployments
- **Branch Management**: Organized codebase with dedicated feature branches

### **AI-Powered Development Tool**
- **Universal CLI Creation**: Transformed simulator into globally distributable npm package
- **Direct AI Integration**: Eliminated local server dependencies for broader adoption
- **Enhanced Git Hooks**: Sophisticated pre-commit and pre-push automation
- **Security & Privacy**: Local API key storage with minimal data transmission

### **Infrastructure Improvements**
- **Development Fixes**: Resolved backend connectivity and dependency conflicts
- **Test Suite Enhancement**: Configured Jest for comprehensive React component testing
- **Container Optimization**: Streamlined Docker setup with development overrides
- **Git Workflow Integration**: Automated quality checks in development workflow

## 🚀 **Quick Start Guide**

### **Option 1: Use the CLI Tool (Recommended for Developers)**

For immediate AI-powered development workflow enhancement:

```bash
# Install globally
npm install -g codeflow-hook

# Configure Gemini AI (get key from Google AI Studio)
codeflow-hook config -k YOUR_GEMINI_API_KEY

# Install in any git repository
cd your-project
codeflow-hook install
```

### **Option 2: Run the Full CI/CD Simulator**

For pipeline prototyping and interactive analysis:

#### **Local Development Setup**
1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Create `.env` file with `GEMINI_API_KEY` and `VITE_API_PROXY=http://localhost:3001`

3. **Run Services**
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   npm run server
   ```

#### **Production Setup with Docker**
```bash
# Build and run with Docker Compose
docker compose up --build -d

# Frontend: http://localhost:8080
# Backend API: http://localhost:3001
```

### **Development Override (Hot-Reload in Container)**
```bash
# Uses docker-compose.override.yml for development
docker compose up --build -d
# Vite dev server on port 5173 with hot reload
```

## 🏛️ **Architecture Details**

### **CI/CD Simulator Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Express       │    │   Gemini AI     │
│   (Vite)        │────│   Backend       │────│   Console       │
│   localhost:5173 │    │   localhost:3001│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────── Nginx ───────┴──── Docker Network ───┘
                         Production: localhost:8080
```

### **CLI Tool Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Developer     │    │   CLI Tool      │    │   Gemini AI     │
│   Workflow      │────│   (npm package) │────│   API           │
│   (Any Git Repo)│    │   Direct calls   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └─────── Git Hooks ─────┴─────── Quality Gates ─┘
                  Pre-commit & Pre-push automation
```

## 📁 **Project Structure**

```
codeflow-commander---nexus-gateway/
├── 📂 cli-tool/                 # Universal npm package (NEW)
│   ├── package.json            # NPM configuration
│   ├── bin/codeflow-hook.js    # CLI executable
│   └── README.md               # Tool documentation
├── 📂 components/              # React UI components
├── 📂 hooks/                   # Example git hooks
├── 📂 nginx/                   # Web server configuration
├── 📂 scripts/                 # Utility scripts
├── 📂 server/                  # Express backend API
├── 📂 tests/                   # Jest test suite
├── 📂 .github/workflows/       # GitHub Actions CI/CD
├── docker-compose.yml          # Container orchestration
├── vite.config.ts             # Frontend build config
└── README.md                  # This documentation
```

## 🔧 **CLI Tool Commands**

```bash
codeflow-hook config -k <api-key>     # Setup Gemini AI
codeflow-hook install                 # Install git hooks
codeflow-hook analyze-diff <diff>    # Manual analysis
codeflow-hook status                  # Check configuration
```

### **Git Hook Integration**
- **Pre-commit**: AI analysis of staged changes
- **Pre-push**: Full CI simulation (tests + AI review)

## 🐳 **Docker Services**

| Service | Port | Purpose |
|---------|------|---------|
| Frontend (Vite) | 5173 | Development with hot-reload |
| Frontend (Nginx) | 8080 | Production static serving |
| Backend API | 3001 | Express server with AI integration |

## ⚙️ **Configuration**

### **Environment Variables** (`.env`)
```bash
GEMINI_API_KEY=your-key-here
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
VITE_API_PROXY=http://localhost:3001
```

### **GitHub Actions**
- **CSP Injection**: Automatic hash updates on main branch pushes
- **Permissions**: Repository write access for auto-commits

## 📊 **Development Workflow**

### **For Individual Developers**
1. Install CLI tool globally: `npm install -g codeflow-hook`
2. Configure AI: `codeflow-hook config -k <key>`
3. Enable in any project: `codeflow-hook install`
4. Get AI feedback on every commit and push

### **For Teams & CI/CD**
1. Use the interactive simulator to prototype pipelines
2. Deploy containerized version for team collaboration
3. Integrate CLI tool into team development workflows
4. Customize analysis rules and feedback templates

## 🧪 **Testing & Quality**

### **Automated Testing**
- **Jest**: React component testing with jsdom
- **ESLint**: Code quality and consistency checks
- **Git Hooks**: Automated pre-commit quality gates

### **Manual Testing**
- **AI Console**: Direct Gemini API interaction testing
- **Pipeline Simulation**: End-to-end CI/CD workflow validation

## 🔒 **Security & Privacy**

### **CLI Tool Security**
- API keys stored locally (`~/.codeflow-hook/config.json`)
- Git-ignored configuration files
- Minimal data transmission (diffs only, no full code)

### **Container Security**
- Non-root container execution
- Minimal attack surface
- Environment-based secrets management

## 🚦 **API Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/analyze` | POST | Code analysis requests |
| `/git-hook` | POST | Git hook diff processing |
| `/api/ai` | POST | Direct Gemini AI proxy |
| `/results` | GET | Analysis history retrieval |

## 🤝 **Contributing**

We welcome contributions to both the simulator and CLI tool:

### **Development Setup**
1. Clone repository and setup simulator (see Quick Start)
2. Work on CLI tool in `cli-tool/` directory
3. Test changes across both components

### **Pull Request Guidelines**
- Update both READMEs for feature changes
- Include tests for new functionality
- Validate CLI tool installation process
- Ensure Docker builds remain functional

## 🛠️ **Useful Commands**

### **Simulator Commands**
```bash
npm run dev          # Start frontend development
npm run server       # Start backend API
npm run test         # Run Jest tests
npm run compose:up   # Docker services
make logs           # View container logs
```

### **CLI Tool Commands**
```bash
npm install -g .     # Install CLI locally
codeflow-hook --help # View available commands
```

## 📈 **Roadmap & Future Enhancements**

### **Short Term**
- **Plugin System**: Custom analysis rules
- ✅ **Multi-Provider AI**: Support for Claude, GPT-4 (implemented in CLI v2.0.0)
- **Results Dashboard**: Web interface for analysis history

### **Long Term**
- **Team Analytics**: Code review insights and trends
- **Integration APIs**: Webhooks for external tools
- **Offline Mode**: Cached AI analysis capabilities

## 📄 **License**

MIT License - see LICENSE file for details

## 🙏 **Acknowledgments**

Built with ❤️ using:
- **React & Vite** for modern frontend development
- **Express.js** for robust API architecture
- **Docker** for containerization excellence
- **Google Gemini AI** for intelligent code analysis
- **Commander.js** for professional CLI experiences

---

**Ready to revolutionize your development workflow?** Choose your path:

🎯 **For individual developers**: Install the CLI tool for instant AI-powered Git workflows
🏗️ **For teams**: Deploy the simulator to prototype and perfect your CI/CD pipelines
🤝 **For contributors**: Join us in building the future of developer tooling

**Start with `npm install -g codeflow-hook` and experience AI-enhanced development today!**
