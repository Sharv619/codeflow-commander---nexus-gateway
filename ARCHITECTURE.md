# Architecture

## Overview

Codeflow Commander — Nexus Gateway is a monorepo containing developer tools for AI-powered code review and CI/CD pipeline simulation. The system combines a React frontend simulator, Express backend API, CLI tools for git workflow enhancement, and GraphQL services backed by Amazon Neptune for enterprise knowledge graph capabilities.

## Components

### 1. Simulator UI (packages/simulator-ui)
- **Purpose**: Interactive CI/CD pipeline prototyping and visualization
- **Tech**: React 19, Vite 7, TailwindCSS, Jest
- **Trade-offs**: Vite chosen over CRA for faster HMR and smaller bundles
- **Data Flow**: React UI → Express Backend → AI Services

### 2. Express Backend (server/server.js)
- **Purpose**: API server with AI proxy, ESLint analysis, and test runner
- **Tech**: Express.js, rate limiting, CORS
- **Trade-offs**: Standalone server (not in workspace) for simpler deployment
- **Data Flow**: Receives code → spawns analysis → returns JSON results

### 3. CLI Tools (packages/cli-tool, packages/codeflow-cli)
- **Purpose**: Git hook integration and AI-powered code review
- **Tech**: Commander.js, published as npm packages
- **Trade-offs**: Direct AI API calls eliminate server dependency
- **Data Flow**: Git diff → CLI tool → AI provider → structured feedback

### 4. GraphQL Services (packages/services/query-service)
- **Purpose**: Enterprise Knowledge Graph API
- **Tech**: Apollo Server, GraphQL
- **Trade-offs**: GraphQL chosen over REST for flexible data queries

### 5. Ingestion Service (packages/services/ingestion-service)
- **Purpose**: GitHub repository data ingestion into Neptune
- **Tech**: Gremlin, Neptune client
- **Data Flow**: GitHub API → transform → Neptune graph

### 6. Infrastructure (IaC/terraform)
- **Purpose**: AWS infrastructure provisioning
- **Tech**: Terraform modules for VPC, EKS, Neptune

## Data Flow

```
Developer commits code
    ↓
Git hook (pre-commit/pre-push)
    ↓
CLI tool captures diff
    ↓
AI analysis (Gemini/OpenAI/Claude)
    ↓
Structured JSON feedback
    ↓
Pass/Fail gate → commit or reject
```

## Key Design Decisions

### Decision 1: Monorepo with npm Workspaces
- **Why**: Shared types, unified tooling, easier cross-package development
- **Trade-off**: Larger install times, tighter coupling
- **Solution**: Workspace boundaries with clear package.json dependencies

### Decision 2: Multi-Provider AI Support
- **Why**: Avoid vendor lock-in, allow user choice
- **Trade-off**: More complex configuration
- **Solution**: Abstract provider interface with config-driven selection

### Decision 3: Docker Compose for Local Development
- **Why**: Consistent environment across machines
- **Trade-off**: Docker dependency, slower startup
- **Solution**: Fallback to direct npm scripts for simple workflows

## Performance

- **Frontend**: Vite provides sub-second HMR, optimized production builds
- **Backend**: Rate-limited AI proxy (30 req/min) prevents abuse
- **CLI**: Direct API calls bypass server latency (~200ms overhead eliminated)
- **GraphQL**: Query batching reduces round trips for complex data fetches

## Security

- API keys stored locally (`~/.codeflow-hook/config.json`), never committed
- Rate limiting on AI proxy endpoints (30 req/min)
- Input validation with 20KB payload limits
- Non-root container execution
- CORS configured for specific origins
- Content Security Policy via Nginx

## Future Improvements

- Plugin system for custom analysis rules
- Team analytics dashboard for code review trends
- Offline mode with cached AI analysis
- WebSocket support for real-time analysis streaming
- Integration with additional CI/CD platforms (GitHub Actions, GitLab CI)
