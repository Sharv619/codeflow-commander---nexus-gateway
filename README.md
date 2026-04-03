# Codeflow Commander — Nexus Gateway

AI-powered development toolkit with CI/CD simulator, intelligent git workflow enhancement, and enterprise knowledge graph capabilities.

## Overview

Codeflow Commander is a monorepo containing developer tools that integrate AI into your development workflow. It provides:

- **CLI Tool**: AI-powered code reviews directly in git hooks (published to npm)
- **CI/CD Simulator**: Interactive React interface for pipeline prototyping
- **Enterprise Knowledge Graph**: GraphQL services backed by Amazon Neptune
- **Multi-Provider AI**: Support for Gemini, OpenAI, Claude, and custom providers

## Features

- 🤖 **AI Code Review**: Automated pre-commit and pre-push quality gates
- 📊 **CI/CD Simulation**: Visual pipeline builder with live code analysis
- 🔗 **Enterprise Knowledge Graph**: GitHub data ingestion into Neptune graph database
- 🌐 **Multi-Provider AI**: Switch between AI providers without code changes
- 🐳 **Docker Ready**: Full containerization with development and production profiles
- 📦 **npm Published**: `codeflow-hook` available for global installation

## Tech Stack

- **Frontend**: React 19, Vite 7, TailwindCSS
- **Backend**: Express.js, Apollo Server (GraphQL)
- **Database**: Amazon Neptune (Graph)
- **CLI**: Commander.js, published npm packages
- **AI**: Google Gemini (primary), OpenAI, Claude
- **Infrastructure**: Docker Compose, Terraform (AWS)

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker (optional)

### Setup

```bash
git clone https://github.com/Sharv619/codeflow-commander---nexus-gateway.git
cd codeflow-commander---nexus-gateway
npm run setup
```

### Running

```bash
# Development
npm run dev          # Frontend (port 5173)
npm run server       # Backend (port 3001)

# Docker
make docker-up       # All services (frontend: 8080, backend: 3001, GraphQL: 4000)
```

### CLI Tool

```bash
npm install -g codeflow-hook
codeflow-hook config -k YOUR_AI_API_KEY
codeflow-hook install
```

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  React UI   │───▶│  Express    │───▶│  Gemini AI  │
│  (Vite)     │    │  Backend    │    │  API        │
└─────────────┘    └─────────────┘    └─────────────┘
                        │
                        ▼
                  ┌─────────────┐
                  │  Neptune    │
                  │  (Graph DB) │
                  └─────────────┘
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed design decisions.

## Project Structure

```
codeflow-commander---nexus-gateway/
├── packages/
│   ├── simulator-ui/          # React + Vite CI/CD Simulator
│   ├── cli-tool/              # codeflow-hook (npm package)
│   ├── codeflow-cli/          # Co-Pilot CLI
│   └── services/
│       ├── query-service/     # GraphQL API
│       ├── ingestion-service/ # GitHub → Neptune ingestion
│       ├── cli-integration/   # CLI backend bridge
│       └── autonomous-agent-network/
├── server/                    # Express backend + AI proxy
├── IaC/terraform/             # AWS infrastructure
├── nginx/                     # Nginx configuration
├── scripts/                   # Utility scripts
└── tests/                     # Root-level tests
```

## Commands

```bash
npm run dev              # Start frontend dev server
npm run server           # Start Express backend
npm run build:all        # Build all workspaces
npm run test:all         # Run all tests
npm run lint             # ESLint check
npm run typecheck        # TypeScript type checking
make docker-up           # Start Docker services
make ci                  # Full CI: lint + typecheck + test + build
```

See [AGENTS.md](AGENTS.md) for detailed development commands and code style.

## Contributing

1. Fork and clone
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes and run tests: `npm run test:all`
4. Commit with semantic message
5. Open PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

MIT License
