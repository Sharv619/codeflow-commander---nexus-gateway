# Codeflow Commander — Nexus Gateway

This project is a UI simulator for a CI/CD pipeline and a small analysis server that can act as a pre-push code checker.

What I added in this iteration:
- A small Express server at `server/server.js` that exposes `/analyze` and `/git-hook` endpoints.
- A Dockerfile to build the application (frontend build + backend server).
- A sample Git `pre-push` hook in `hooks/pre-push` which can post diffs to the local analysis server.

Quick start (local development)

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

The frontend will call the backend at `http://localhost:3001` for code analysis. When running via docker-compose the frontend (nginx) proxies `/api/` to the backend, so the frontend will make requests to `/api/analyze` in production.

Running with docker-compose

Build and start services:

```powershell
docker compose up --build -d
```

The frontend will be available at http://localhost:8080 and the backend at http://localhost:3001. The frontend (served by nginx) proxies requests under `/api/` to the backend, so `/api/analyze` will reach the backend's `/analyze` endpoint.

Installing the Git hook

- Copy `hooks/pre-push` to your repository `.git/hooks/pre-push` and make it executable.

```powershell
cp hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

Notes & next steps

- The analyzer in `server/server.js` is a simple heuristic — you should replace it with your real static analysis, SAST, unit tests, and container scanning tools.
- For production, secure the server (auth, TLS) and validate the Git hook data before processing.
