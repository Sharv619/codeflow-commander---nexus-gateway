# Contributing

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/codeflow-commander---nexus-gateway.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm run setup`

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker (optional, for containerized development)

### Quick Start
```bash
# Install and build all workspaces
npm run setup

# Start development servers
npm run dev          # Frontend (port 5173)
npm run server       # Backend (port 3001)
```

### Docker Development
```bash
make docker-up       # Start all services
make docker-logs     # View logs
```

## Code Style

### TypeScript
- Strict mode enabled, target ES2020
- Use path aliases (`@/*`) over relative imports
- ESM imports only (`import ... from ...`)

### Naming
- Files: kebab-case for directories, PascalCase for React components, camelCase for utilities
- Test files: `*.test.ts` or `*.spec.ts`
- Unused params: prefix with `_` (e.g., `_req`)

### Formatting
- 2-space indentation
- Run `npm run lint` before committing
- Use `npm run lint -- --fix` for auto-fixable issues

### ESLint Rules
- `@typescript-eslint/no-unused-vars`: error (ignores `_`-prefixed args)
- `@typescript-eslint/no-explicit-any`: warn
- `react-hooks/rules-of-hooks`: error
- `react-hooks/exhaustive-deps`: warn

## Testing

### Running Tests
```bash
# All tests
npm run test:all

# Single package tests
cd packages/simulator-ui && npx jest --testPathPattern="App.test.tsx"
cd packages/codeflow-cli && npx jest --testPathPattern="specific.test.ts"

# Watch mode
cd packages/simulator-ui && npm run test:watch
```

### Writing Tests
- Place tests in `__tests__/` directories or as `*.test.ts` alongside source
- Use descriptive test names that explain the expected behavior
- Mock external services (AI APIs, databases)

## Submitting Changes

1. Make your changes
2. Run tests: `npm run test:all`
3. Run lint: `npm run lint`
4. Run typecheck: `npm run typecheck`
5. Commit with semantic message: `feat: add new analysis feature`
6. Push to your fork
7. Open a Pull Request

### Commit Message Format
Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code restructuring
- `test:` test additions or changes
- `chore:` maintenance tasks

## Project Structure

```
packages/
  simulator-ui/          # React frontend
  cli-tool/              # Published npm CLI
  codeflow-cli/          # Co-Pilot CLI
  services/
    query-service/       # GraphQL API
    ingestion-service/   # Neptune data ingestion
    cli-integration/     # CLI backend bridge
    autonomous-agent-network/  # Phase 5 agents
server/                  # Express backend
IaC/terraform/           # Infrastructure as Code
```

## Reporting Issues

When reporting issues, include:
- Node.js and npm versions
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs or screenshots

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
