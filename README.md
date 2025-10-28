
# Codeflow Commander — Nexus Gateway



An interactive CI/CD simulator and lightweight pre-push code reviewer. Use it to prototype automated checks (static analysis, linters, container scans) and to test UI flows for gating deployments.

## Highlights

- **Frontend**: React + Vite UI that simulates pipeline stages and shows logs and code-review details.
- **Backend**: Minimal Express analysis server (`/analyze`, `/git-hook`) that accepts diffs and returns a CodeReviewResult-shaped payload.
- **Containerized**: Nginx serves the static frontend; backend runs as a separate container. Development override supports running Vite inside a container.
- **Git hooks**: Example `pre-push` scripts (bash + PowerShell) that post diffs to `/git-hook`.

## Recent Changes

This session focused on resolving critical application errors and enhancing the CI/CD workflow:

1.  **Initial Error Resolution:**
    *   Fixed `getaddrinfo ENOTFOUND backend` errors by updating `vite.config.ts` to correctly proxy requests to `http://localhost:3001` for `/api`, `/results`, and `/analyze` endpoints.
    *   Ensured both the frontend (`npm run dev`) and backend (`npm run server`) run simultaneously for local development.

2.  **Dependency and Linting Fixes:**
    *   Updated various development dependencies in `package.json` to their latest compatible versions.
    *   Resolved a dependency conflict by downgrading ESLint to version `8.57.0` (from v9) to maintain compatibility with existing plugins.
    *   Updated the `.eslintrc.json` file to use the correct parser and plugins for TypeScript and React, ensuring proper linting.

3.  **Test Suite Rectification:**
    *   Modified `jest.config.cjs` to set the `testEnvironment` to `jsdom` and updated `testMatch` patterns to include `.tsx` files.
    *   Removed the `--no-config` flag from the `test` script in `package.json` so Jest would use its configuration file.
    *   Confirmed that all local tests were passing after these changes.

4.  **Pre-push Git Hook Implementation:**
    *   Converted the CI/CD simulation into a pre-push Git hook.
    *   The new `hooks/pre-push` script now collects staged changes and automatically runs AI code review and containerized tests before a push, blocking the push if any stage fails.
    *   The script was made executable.

## Quick start — Local dev

1. Install dependencies

```powershell
npm install
```

2. Run the frontend dev server (Vite) in one terminal

```powershell
npm run dev
```

3. Run the backend server in another terminal

```powershell
npm run server
```

The frontend will make analysis requests to **http://localhost:3001** unless you configure proxies (see Docker/dev sections below).

## Run with Docker (recommended)

Build and run both services using Docker Compose:

```powershell
docker compose up --build -d
```

- Frontend (static, served by Nginx): http://localhost:8080
- Backend API: http://localhost:3001

When using the static frontend, requests to `/analyze` and `/git-hook` are proxied by Nginx to the backend.

### Development override (hot-reload inside container)

The repository includes `docker-compose.override.yml` which lets the frontend run Vite inside the container and mounts the repo into `/app`. Use the same compose command above — the override is applied automatically by Docker Compose.

The Vite dev server proxies `/api/*` to a backend target configured by the `VITE_API_PROXY` env var. Example for Windows Docker Desktop:

```powershell
#$env:VITE_API_PROXY='http://host.docker.internal:3001'
npm run dev
```

Or when using the override (inside container), the default proxy target is `http://backend:3001`.

**Ports used by the project**

- Vite dev server (override / containerized): **5173**
- Nginx static frontend: **8080**
- Backend API: **3001**

## Git hooks

- Bash: `hooks/pre-push`
- PowerShell: `hooks/pre-push.ps1`

The `hooks/pre-push` script now runs the full CI/CD simulation (AI Code Review and Containerized Tests) before allowing a push. If any stage fails, the push will be aborted.

To install the hook:

```bash
cp hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Useful NPM / Makefile commands

- Start dev frontend: `npm run dev`
- Start backend server: `npm run server`
- Docker compose up: `npm run compose:up` or `make up`
- Docker compose down: `npm run compose:down` or `make down`
- Stream logs: `npm run compose:logs` or `make logs`

## Notes & next steps

- The current server's analyzer (`server/server.js`) is a heuristic placeholder — integrate real tools (ESLint, go vet, Trivy, unit test runners) for serious use.
- Secure the analysis API before exposing it externally (add authentication, TLS, request validation).
- Consider adding a persistent results store (DB) and WebSocket/Server-Sent Events so the frontend can display push results in real time.

## Contributing

If you'd like me to continue, tell me which of the following you'd like next:

1. Integrate real linters/tests and show their output in the UI.
2. Add Vite proxy adjustments for Windows host.docker.internal by default.
3. Add an optional persistent results backend and an API to fetch previous analyses.

**Pick a number or describe a change and I’ll implement it.**
