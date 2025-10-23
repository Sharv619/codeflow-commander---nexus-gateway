
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

## Gemini / AI integration (Docker)

This project can be wired to a Gemini API key for AI-assisted analysis in the frontend build/runtime. The frontend's Vite config reads `process.env.GEMINI_API_KEY` which can be provided at build time and runtime via Docker.

1. Copy the example environment file and fill your key (do NOT commit your real key):

```powershell
cp .env.example .env
# edit .env and set GEMINI_API_KEY=your_real_key_here
```

2. Build and run with Docker Compose. Docker Compose will pass `GEMINI_API_KEY` as a build-arg and as a container env var for the frontend service:

```powershell
docker compose up --build -d
```

3. The frontend build will embed `process.env.GEMINI_API_KEY` via Vite's define options so client code can access it as `process.env.GEMINI_API_KEY` (note: embedding secrets in client bundles is not recommended for production; prefer a backend proxy or server-side calls).

Security note: Do not embed private API keys into public frontend bundles in production. Instead, route AI requests through the backend and keep the key server-side.

### Server-side AI proxy (recommended)

To keep your Gemini/OpenAI API key secret, use the server-side proxy endpoint added at `/api/ai`. The frontend should POST `{ model?, input }` to `/api/ai`, and the backend will forward the request to the configured `GEMINI_API_URL` using `GEMINI_API_KEY` from the environment.

Setup (example):

1. Set `GEMINI_API_KEY` and `GEMINI_API_URL` in your `.env` file.
2. Start services with Docker Compose (the variables are passed into the backend service):

```powershell
docker compose up --build -d
```

3. Example request (frontend or curl):

```powershell
curl -X POST http://localhost:3001/api/ai -H "Content-Type: application/json" -d '{"input":"Summarize: const a = 1"}'
```

This keeps the API key on the server and out of the client bundle. You can adapt the proxy payload translation to match the exact Gemini/VertexAI/OpenAI API schema you need.

#### Using the server-side proxy from the frontend

Example frontend code (browser-side) to call the proxy at `/api/ai` and display the result:

```javascript
async function askAi(input) {
	const resp = await fetch('/api/ai', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ input })
	});
	if (!resp.ok) throw new Error(`AI request failed: ${resp.status}`);
	return resp.json();
}

askAi('Summarize: const a = 1;')
	.then(res => console.log('AI response', res))
	.catch(err => console.error(err));
```

Backend mapping note:
- The backend proxy accepts `{ model?, input }` and forwards a JSON body `{ model, input }` to `GEMINI_API_URL` with the `Authorization: Bearer <GEMINI_API_KEY>` header when configured.
- If your AI provider expects a different request shape, adapt the proxy (in `server/server.js`) to translate accordingly.

#### Example curl usage (test locally)

```powershell
curl -X POST http://localhost:3001/api/ai -H "Content-Type: application/json" -d '{"input":"Explain the function of this code: const a = 1"}'
```

#### Docker / .env usage recap

- Copy `.env.example` to `.env` and set `GEMINI_API_KEY` and `GEMINI_API_URL`.
- The `docker-compose.yml` is configured to pass `GEMINI_API_KEY` and `GEMINI_API_URL` into the backend service at runtime.

```powershell
cp .env.example .env
# Edit .env and set GEMINI_API_KEY and GEMINI_API_URL
docker compose up --build -d
```

#### Security / production guidance

- Never expose private API keys in client-side bundles. Use the server-side proxy for production traffic.
- Consider adding rate-limiting, authentication, and request validation to `/api/ai` before exposing it to users.
- Log and monitor usage to detect abuse, and store keys in a secret manager for CI/CD and production deploys.

---

Last updated: 2025-10-23

What changed:
- Clarified API endpoints and `/analyze` normalized response shape.
- Documented the server-side AI proxy (`/api/ai`) and recommended security practices.
- Noted the CSP hash tooling and CI injection workflow.

If you'd like a full rewrite or a shorter README with quick commands only, tell me which style you prefer and I'll replace this file entirely.
