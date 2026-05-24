# Codeflow Hook

Local AI-powered code review, Git hook automation, and developer push profiling.

`codeflow-hook` runs before commit or push, reviews the actual Git diff, runs local review agents, optionally performs an AI second pass with Ollama or a cloud provider, and stores local review history for developer coaching.

## Version

Current package version: `2.3.0`.

## What Changed Since 2.2.0

### 2.2.x: Standalone Local Hook Package

The package was simplified into a standalone CLI that no longer depends on the larger EKG/backend integration runtime.

- Removed backend/EKG indexing dependency from the CLI path.
- Removed unused runtime dependencies such as `dotenv`, `simple-git`, and `winston`.
- Made `bin/codeflow-hook.js` the package entrypoint.
- Added local `.codeflow-index.json` generation through `codeflow-hook index`.
- Added deterministic fallback review when AI providers are unavailable.
- Added OpenAI and Claude review support alongside Gemini and Ollama.
- Fixed Windows test execution by using `jest --runInBand`.

### 2.3.0: Local Agent Orchestration and Developer Profile

`2.3.0` turns the hook from a single reviewer into a local orchestration runtime.

- Added local review agents:
  - `security`
  - `quality`
  - `testImpact`
  - `dependency`
  - `architecture`
  - `aiReasoning`
- Added `pre-push-review`, which reads Git pre-push stdin and reviews the actual pushed commit ranges.
- Fixed pre-push handling when the remote old commit is not present locally by falling back to remote-tracking refs such as `origin/main`.
- Replaced fake simulation timing with real child-process execution for configured pipeline stages.
- Added local review history under `.codeflow/`.
- Added developer profile and coaching commands.
- Added package files for `lib/agents/` and `lib/profile/`.

## Install

```bash
npm install -g codeflow-hook
```

For local development inside this monorepo:

```bash
npx --no-install codeflow-hook --version
```

## Configure AI

AI is optional. Without AI configuration, deterministic local agents still run.

```bash
# Local Ollama
codeflow-hook config --provider ollama --ollama-enable

# Gemini
codeflow-hook config --provider gemini --key YOUR_GEMINI_API_KEY

# OpenAI
codeflow-hook config --provider openai --key YOUR_OPENAI_API_KEY

# Claude
codeflow-hook config --provider claude --key YOUR_CLAUDE_API_KEY
```

Config is stored at:

```text
~/.codeflow-hook/config.json
```

Agent config example:

```json
{
  "provider": "ollama",
  "model": "qwen2.5-coder",
  "ollama": {
    "enabled": true,
    "url": "http://localhost:11434"
  },
  "agents": {
    "enabled": true,
    "aiEnabled": true,
    "parallel": true,
    "blocking": {
      "security": true,
      "quality": true,
      "dependency": true,
      "testImpact": false,
      "architecture": false,
      "aiReasoning": false
    }
  }
}
```

## Commands

```bash
codeflow-hook config
codeflow-hook install
codeflow-hook analyze-diff
codeflow-hook pre-push-review
codeflow-hook agents list
codeflow-hook agents doctor
codeflow-hook agents run
codeflow-hook history list
codeflow-hook history show latest
codeflow-hook history clear
codeflow-hook profile summary
codeflow-hook profile tips
codeflow-hook simulate
codeflow-hook index
codeflow-hook status
```

## Git Hooks

Install hooks in the current Git repository:

```bash
codeflow-hook install
```

This writes:

- `pre-commit`: reviews staged changes with local agents.
- `pre-push`: runs `codeflow-hook simulate fast-dev`, then reviews the commit ranges Git is about to push.

The pre-push hook reads the lines Git passes on stdin:

```text
<local-ref> <local-oid> <remote-ref> <remote-oid>
```

It uses `remoteOid..localOid` when the remote commit exists locally. If the remote commit is missing, it falls back to a safe local base such as `refs/remotes/origin/main...localOid`.

## Review Changes

```bash
git diff --staged | codeflow-hook analyze-diff
```

Run agents directly:

```bash
git diff | codeflow-hook agents run
git diff | codeflow-hook agents run --json
```

## Local Agents

`security`
: Detects hardcoded secrets and dangerous execution patterns.

`quality`
: Checks unresolved comment markers and noisy debug output.

`testImpact`
: Warns when source changes are not accompanied by likely test changes.

`dependency`
: Checks package manifest and lockfile consistency.

`architecture`
: Warns when changes span multiple package boundaries.

`aiReasoning`
: Runs an advisory second-pass AI review when Ollama or a cloud provider is configured.

## Simulation

Run a local pipeline template:

```bash
codeflow-hook simulate fast-dev
codeflow-hook simulate nodejs-basic
```

Templates execute real commands through child processes:

- `fast-dev`: `npm test`
- `nodejs-basic`: `npm install --ignore-scripts`, `npm test`, `npm run build`

Stage timeout can be configured:

```json
{
  "simulation": {
    "stageTimeoutMs": 600000
  }
}
```

## History and Developer Profile

Review results are stored locally:

```text
.codeflow/
  latest.json
  runs/
```

Show recent runs:

```bash
codeflow-hook history list
codeflow-hook history show latest
```

Show your developer push profile:

```bash
codeflow-hook profile summary
```

Example output:

```text
Codeflow Developer Profile
  Push Health: 88/100
  Review Trend: stable
  Runs: 12 (92% pass rate)
  Average Score: 8/10
```

Get review coaching tips:

```bash
codeflow-hook profile tips
```

Clear local history:

```bash
codeflow-hook history clear
```

## Local Index

```bash
codeflow-hook index
```

This writes `.codeflow-index.json` with project file paths, sizes, timestamps, and total bytes.

## Privacy

- Config is stored in `~/.codeflow-hook/config.json`.
- Review history is stored locally under `.codeflow/`.
- Ollama analysis stays local.
- Cloud AI analysis sends the diff to the configured provider.
- No telemetry is collected by this package.

## Requirements

- Node.js 16+
- Git repository
- Optional: Ollama or an API key for Gemini, OpenAI, or Claude

## Notes for Windows

- The package test script uses `jest --runInBand` to avoid Windows worker-spawn issues.
- Git hooks should run under Git for Windows shell during real `git commit` and `git push`.
- Line-ending warnings from Git are not hook failures.
