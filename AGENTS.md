# AGENTS.md — Codeflow Commander: Nexus Gateway

## Project Overview
Monorepo (npm workspaces) with TypeScript, React 19 + Vite frontend, Express backend, GraphQL services, and multiple CLI tools. Docker Compose orchestrates 5 services.

## Commands

### Root-Level (run from repo root)
```
npm run dev              # Start frontend dev server (Vite, port 5173)
npm run server           # Start Express backend (port 3001)
npm run build:all        # Build all workspaces
npm run test:all         # Run all tests
npm run lint             # ESLint: packages/*/src --ext .ts,.tsx
npm run typecheck        # tsc --noEmit
npm run setup            # npm install + build:all
```

### Makefile
```
make install             # npm install + build:all
make test                # Run all tests
make lint                # lint + typecheck
make dev                 # Start dev server
make docker-up           # docker compose up -d
make ci                  # Full CI: lint + typecheck + test:all + build:all
```

### Running a Single Test
```bash
# simulator-ui (Jest + jsdom)
cd packages/simulator-ui
npx jest --testPathPattern="App.test.tsx"
npx jest -t "test name pattern"

# codeflow-cli (Jest + ts-jest, node env)
cd packages/codeflow-cli
npx jest --testPathPattern="specific.test.ts"
npx jest -t "test name pattern"
npx jest --coverage

# Root-level Jest tests
npx jest tests/App.test.tsx
```

### Per-Package Scripts
- **simulator-ui**: `npm run test:watch`, `npm run test:analyze`, `npm run test:ai`
- **codeflow-cli**: `npm run lint:fix`, `npm run format`, `npm run type-check`

## Code Style

### TypeScript
- Strict mode enabled. Target ES2020. ESNext modules with `moduleResolution: node`.
- `esModuleInterop` and `allowSyntheticDefaultImports` enabled.
- Path aliases: `@/*` → `src/*`, `@components/*` → `packages/simulator-ui/src/components/*`
- JSX transform: `react-jsx` (no need to import React).

### Imports
- Use ESM imports (`import ... from ...`). Several packages set `"type": "module"`.
- Use path aliases (`@/`) over relative imports where available.
- Group imports: external libraries first, then internal modules.

### Naming Conventions
- Files: kebab-case for directories, PascalCase for React components, camelCase for utilities.
- Test files: `*.test.ts` / `*.test.tsx` or `*.spec.ts`.
- Unused params: prefix with `_` (e.g., `_req`) to satisfy ESLint.
- Interfaces/types: PascalCase, prefixed with `I` only when disambiguating.

### Formatting
- No `.prettierrc` at root. `codeflow-cli` package uses Prettier with `eslint-config-prettier`.
- 2-space indentation (TypeScript default). Semicolons as configured by TypeScript.
- Run `npm run lint` before committing. Use `--fix` for auto-fixable issues.

### ESLint Rules (`.eslintrc.json`)
- `@typescript-eslint/no-unused-vars`: **error** (ignores `_`-prefixed args)
- `@typescript-eslint/no-explicit-any`: **warn** (disabled in test files)
- `@typescript-eslint/explicit-function-return-type`: **off**
- `react/prop-types`: **off** (using TypeScript)
- `react-hooks/rules-of-hooks`: **error**
- `react-hooks/exhaustive-deps`: **warn**

### Error Handling
- Use try/catch with specific HTTP status codes (400, 413, 500, 502).
- Clean up resources in catch blocks (e.g., temp file deletion).
- Graceful degradation: fallback to deterministic analyzers when AI unavailable.
- Input validation: enforce size limits (e.g., 20KB max on payloads).
- Rate limiting on external-facing endpoints (e.g., 30 req/min on AI proxy).

### Testing
- Test files live in `__tests__/` dirs or as `*.test.ts`/`*.spec.ts` alongside source.
- `collectCoverageFrom` excludes `.d.ts` files and CLI entry points.
- Use `--experimental-fetch` flag for AI-powered test scripts.

## Architecture
```
packages/
  simulator-ui/          # React + Vite CI/CD Simulator (frontend)
  cli-tool/              # codeflow-hook (published npm CLI)
  codeflow-cli/          # Generative Engineering Co-Pilot CLI
  services/
    query-service/       # GraphQL API (Apollo Server, port 4000)
    ingestion-service/   # GitHub data → Neptune ingestion
    cli-integration/     # Bridges CLI with EKG backend
    autonomous-agent-network/  # Phase 5: autonomous agents
server/server.js         # Standalone Express backend + AI proxy
IaC/terraform/           # VPC, EKS, Neptune infrastructure
```

## Notes
- No existing `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md`.
- `.clinerules.txt` exists but is empty.
- Node >= 18, npm >= 9 required.
- Docker services: frontend (8080), backend (3001), query-service (4000), Neptune (8182).
