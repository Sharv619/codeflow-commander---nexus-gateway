# Codeflow Hook

Local AI-powered code analysis and git hook management.

`codeflow-hook` reviews git diffs before commit or push. It can use Ollama locally, or cloud providers such as Gemini, OpenAI, and Claude. If no AI provider is available, it falls back to a deterministic local analyzer for basic quality and secret checks.

## Install

```bash
npm install -g codeflow-hook
```

## Configure

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

## Commands

```bash
codeflow-hook config
codeflow-hook install
codeflow-hook analyze-diff
codeflow-hook index
codeflow-hook status
```

## Analyze Changes

```bash
git diff --staged | codeflow-hook analyze-diff
```

## Install Git Hooks

```bash
codeflow-hook install
```

This installs:

- `pre-commit`: analyzes staged changes.
- `pre-push`: runs `npm test` when `package.json` exists, then analyzes staged changes.

## Local Index

```bash
codeflow-hook index
```

This writes a local `.codeflow-index.json` file with project file paths, sizes, and timestamps.

## Requirements

- Node.js 16+
- Git repository
- Optional: Ollama or an API key for Gemini, OpenAI, or Claude

## Privacy

- Config is stored in `~/.codeflow-hook/config.json`.
- Ollama analysis stays local.
- Cloud provider analysis sends the diff to the configured provider.
- No telemetry is collected by this package.
