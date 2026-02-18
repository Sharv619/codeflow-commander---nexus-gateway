# codeflow-sentinel Implementation Plan

## Vision
**Offline AI-powered code analysis agent** - runs locally with no cloud dependencies. Uses Ollama/llamafile for AI inference, wraps existing ai_code_reviewer.py, adds multi-agent orchestration.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    codeflow-sentinel CLI                     │
├─────────────────────────────────────────────────────────────┤
│  CLI Layer (Typer)                                          │
│  ├── analyze                                                │
│  ├── watch                                                  │
│  ├── agent                                                  │
│  └── serve                                                 │
├─────────────────────────────────────────────────────────────┤
│  Agent Orchestration Layer                                  │
│  ├── SentinelAgent (base)                                   │
│  ├── SecurityAgent                                          │
│  ├── QualityAgent                                           │
│  └── ConsensusEngine                                        │
├─────────────────────────────────────────────────────────────┤
│  AI Providers (pluggable)                                   │
│  ├── OllamaProvider (offline)                              │
│  ├── LlamafileProvider (offline)                          │
│  └── CloudProvider (online fallback)                       │
├─────────────────────────────────────────────────────────────┤
│  Code Analysis Layer                                        │
│  ├── RuleBasedAnalyzer (from ai_code_reviewer.py)         │
│  ├── ASTAnalyzer                                            │
│  └── DiffAnalyzer                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Core CLI Skeleton
**Files to create/modify:**
- `sentinel/pyproject.toml` - Package config with dependencies
- `sentinel/src/sentinel/__init__.py` - Main package
- `sentinel/src/sentinel/cli.py` - Typer CLI with commands
- `sentinel/src/sentinel/config.py` - Settings & config

**Commands:**
```bash
sentinel --help
sentinel analyze <file|diff>
sentinel analyze --watch
sentinel agent start
sentinel config set model codellama
```

### Phase 2: AI Provider Integration
**Files:**
- `sentinel/src/sentinel/ai/providers.py` - Provider ABC
- `sentinel/src/sentinel/ai/ollama.py` - Ollama integration
- `sentinel/src/sentinel/ai/llamafile.py` - Llamafile integration
- `sentinel/src/sentinel/ai/cloud.py` - OpenAI/Gemini fallback

**Features:**
- Auto-detect available providers
- Model selection (codellama, mistral, etc.)
- Streaming responses
- Local cache for prompts

### Phase 3: Agent System
**Files:**
- `sentinel/src/sentinel/agents/base.py` - SentinelAgent base
- `sentinel/src/sentinel/agents/security.py` - SecurityAgent
- `sentinel/src/sentinel/agents/quality.py` - QualityAgent
- `sentinel/src/sentinel/agents/orchestrator.py` - AgentOrchestrator
- `sentinel/src/sentinel/agents/consensus.py` - ConsensusEngine

**Features:**
- Multi-agent analysis with voting
- Authority-based conflict resolution
- Parallel agent execution

### Phase 4: Analysis Engine
**Files:**
- `sentinel/src/sentinel/analysis/reviewer.py` - Wrap ai_code_reviewer.py
- `sentinel/src/sentinel/analysis/diff.py` - Git diff analysis
- `sentinel/src/sentinel/analysis/ast.py` - AST-based analysis

### Phase 5: Git Integration
**Files:**
- `sentinel/src/sentinel/git/hook.py` - Pre-commit/pre-push hooks
- `sentinel/src/sentinel/git/watcher.py` - File watcher mode

### Phase 6: Server Mode
**Files:**
- `sentinel/src/sentinel/server/app.py` - FastAPI server
- `sentinel/src/sentinel/server/api.py` - REST endpoints

---

## File Structure

```
sentinel/
├── pyproject.toml
├── README.md
├── CHANGELOG.md
├── LICENSE
├── src/sentinel/
│   ├── __init__.py
│   ├── __main__.py
│   ├── cli.py              # Typer CLI
│   ├── config.py           # Settings
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── providers.py    # Abstract provider
│   │   ├── ollama.py       # Ollama
│   │   ├── llamafile.py    # Llamafile
│   │   └── cloud.py        # Cloud fallback
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── security.py
│   │   ├── quality.py
│   │   ├── orchestrator.py
│   │   └── consensus.py
│   ├── analysis/
│   │   ├── __init__.py
│   │   ├── reviewer.py     # Port ai_code_reviewer.py
│   │   ├── diff.py
│   │   └── ast.py
│   ├── git/
│   │   ├── __init__.py
│   │   ├── hook.py
│   │   └── watcher.py
│   └── server/
│       ├── __init__.py
│       ├── app.py
│       └── api.py
└── tests/
    ├── __init__.py
    ├── test_agents.py
    ├── test_analysis.py
    └── test_ai_providers.py
```

---

## Dependencies

```toml
[project.dependencies]
typer = ">=0.12.0"
rich = ">=13.7.0"
httpx = ">=0.27.0"
pydantic = ">=2.5.0"
gitpython = ">=3.1.40"
watchdog = ">=4.0.0"
fastapi = ">=0.109.0"
uvicorn = ">=0.27.0"

[project.optional-dependencies]
ollama = ">=0.1.0"
dev = ["pytest", "pytest-cov", "ruff", "mypy"]
```

---

## CLI Usage Examples

```bash
# Analyze a file
sentinel analyze src/main.py

# Analyze git diff (pre-commit)
git diff | sentinel analyze --diff

# Watch mode (auto-analyze on save)
sentinel analyze --watch src/

# Multi-agent analysis
sentinel agent analyze --agents security,quality src/

# Start local server
sentinel serve --port 8080

# Install git hooks
sentinel hook install --pre-commit

# Configure model
sentinel config set model mistral
sentinel config set provider ollama
```

---

## Exit Criteria

- [ ] `pip install codeflow-sentinel` works
- [ ] `sentinel analyze <file>` returns results
- [ ] Works offline with Ollama
- [ ] Git hooks functional
- [ ] Server mode works
- [ ] Multi-agent consensus works

---

## Estimated Timeline

| Phase | Effort |
|-------|--------|
| Phase 1: CLI Skeleton | 2 hours |
| Phase 2: AI Providers | 3 hours |
| Phase 3: Agent System | 4 hours |
| Phase 4: Analysis Engine | 3 hours |
| Phase 5: Git Integration | 2 hours |
| Phase 6: Server Mode | 2 hours |
| Testing & Polish | 3 hours |
| **Total** | **~19 hours** |
