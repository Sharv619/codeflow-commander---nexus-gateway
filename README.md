
# Codeflow Commander — Nexus Gateway



An interactive CI/CD simulator and lightweight pre-push code reviewer. Use it to prototype automated checks (static analysis, linters, container scans) and to test UI flows for gating deployments.

## Highlights

- **Frontend**: React + Vite UI that simulates pipeline stages and shows logs and code-review details.
- **Backend**: Minimal Express analysis server (`/analyze`, `/git-hook`) that accepts diffs and returns a CodeReviewResult-shaped payload.
- **Containerized**: Nginx serves the static frontend; backend runs as a separate container. Development override supports running Vite inside a container.
- **Git hooks**: Example `pre-push` scripts (bash + PowerShell) that post diffs to `/git-hook`.

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

### /analyze response shape

The backend's `/analyze` endpoint now runs ESLint on submitted code and returns a normalized CodeReviewResult-shaped JSON object. The shape is:

- `overallStatus`: `PASS` or `FAIL` (FAIL when one or more ESLint errors were found)
- `summary`: short human-readable summary, e.g. "2 issues found." or "No issues found."
- `files`: array of file results with the fields:
	- `fileName`: path of the file analyzed
	- `status`: `PASS` or `FAIL` for that file
	- `issues`: array of `{ line, type, description }` objects

Example curl request and expected response (trimmed):

```powershell
curl -X POST http://localhost:3001/analyze -H "Content-Type: application/json" -d '{"code":"const unused = 1; console.log(2);"}' | jq

{
	"overallStatus": "FAIL",
	"summary": "1 issues found.",
	"files": [
		{
			"fileName": "/tmp/temp_analysis_...js",
			"status": "FAIL",
			"issues": [
				{ "line": 1, "type": "no-unused-vars", "description": "'unused' is assigned a value but never used." }
			]
		}
	]
}
```

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

Both scripts attempt to POST the staged diff to **http://localhost:8080/git-hook** (frontend/nginx) and fall back to **http://localhost:3001/git-hook** (backend) if unavailable.

To install the hook (example):

```powershell
cp hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
# Or for PowerShell hook: copy hooks/pre-push.ps1 to .git/hooks and call it from a shim
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

### Content-Security-Policy (development)

During development this project adds a permissive Content-Security-Policy header via the Nginx config so Vite, Tailwind's CDN inline config, and local resources (favicon, API endpoints) can load without blocked inline scripts/styles. This is intended for developer convenience only.

If you see browser console errors like "Content-Security-Policy: The page’s settings blocked an inline script/style", that indicates the CSP is too strict for development. We added a development-friendly CSP to `nginx/default.conf` that allows the CDN and inline styles/scripts. To apply that change you may need to restart the frontend (nginx) service in Docker Compose:

```powershell
# Restart only the frontend (nginx) service so it picks up the new Nginx config
docker compose restart frontend

# Or rebuild & recreate the frontend service
docker compose up -d --no-deps --build frontend

# Then verify services
docker compose ps
```

Security note: the dev CSP uses `'unsafe-inline'` and broader host allowances. Do NOT use this policy in production. For production, prefer using nonces or script/style hashes (the browser console will include suggested sha256 hashes), remove `'unsafe-inline'`, and allow only the minimal trusted sources.

## Contributing

If you'd like me to continue, tell me which of the following you'd like next:

1. Integrate real linters/tests and show their output in the UI.
2. Add Vite proxy adjustments for Windows host.docker.internal by default.
3. Add an optional persistent results backend and an API to fetch previous analyses.

**Pick a number or describe a change and I’ll implement it.**

<!-- Removed duplicate/docker-compose/help section (already present above) -->

## CSP hashes and integration test

If you modify the inline scripts in `index.html` (the Tailwind inline config or the importmap), you must recompute the SHA256 hashes used by the production CSP. A small helper script is included:

```powershell
# Compute updated hashes (requires Node)
node tmp_compute_hashes.cjs
# Output will show two sha256 hashes you can paste into nginx/default.conf
```

To enable the production CSP in `nginx/default.conf`:

1. Replace or remove the development `add_header Content-Security-Policy` line and uncomment the production `add_header` that contains the computed sha256 hashes.
2. Restart or recreate the frontend (nginx) service:

```powershell
docker compose up -d --no-deps --build frontend
```

Integration test for `/analyze`:

1. Start the backend server:

```powershell
npm run server
```

2. In another terminal, run the analyzer integration test:

```powershell
npm run test:analyze
```

The test will POST a small JS snippet to `http://localhost:3001/analyze` and assert the normalized `CodeReviewResult` shape.
