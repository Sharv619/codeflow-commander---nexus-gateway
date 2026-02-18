# AGENTS.md - Repository Governance Constitution

## Project Overview

This repository contains Codeflow Commander - an AI-powered development tool with CI/CD simulator and intelligent git workflow enhancement. It uses a multi-package monorepo structure with workspaces.

---

## Build/Lint/Test Commands

### Root Commands
```bash
npm run lint           # ESLint on all packages
npm run typecheck      # TypeScript type checking
npm run test           # Run simulator-ui tests
npm run test:all       # Run tests across all workspaces
npm run build:all      # Build all packages
```

### CLI Tool (codeflow-hook)
```bash
cd packages/cli-tool
npm test               # Run jest tests
npm run build         # No-op (pure ES modules)
```

### Single Test
```bash
npx jest --testPathPattern=<file-name>
# or
npm test -- --testPathPattern=<pattern>
```

---

## Code Style Guidelines

### TypeScript
- Strict mode enabled in tsconfig.json
- Use path aliases: `@/*` maps to `src/*`
- Avoid `any` - use `unknown` or specific types

### ESLint Rules
- `@typescript-eslint/no-unused-vars`: error
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/explicit-function-return-type`: off
- No console.log - use winston logger

### Naming Conventions
- Variables/functions: camelCase
- Classes/Types: PascalCase
- Constants: SCREAMING_SNAKE_CASE

### Imports
- Use relative imports for local modules
- Use path aliases for cross-package imports
- Group: external → internal → relative

### Error Handling
- Always use try/catch with winston logging
- Never swallow errors silently
- Return typed error results

---

## Decision Authority Hierarchy

| Agent | Authority |
|-------|-----------|
| **Architecture Agent** | Decides system structure, rejects scope creep |
| **Implementation Agent** | Cannot override architecture decisions |
| **Validation Agent** | Can block merges on regressions/issues |
| **Compliance Agent** | Can block on logging violations |
| **Refactor Agent** | Requires explicit activation (disabled by default) |

---

## 5-Agent Workflow

### 1️⃣ Architecture Agent (Planner)
- **Purpose:** Maintain system boundaries, break features into atomic tasks
- **Rules:** Cannot write code. Only outputs task plans. Must reference existing files.
- **Input:** Reads PROJECT_STATE.md, ARCHITECTURE_OVERVIEW.md

### 2️⃣ Implementation Agent (Coder)
- **Purpose:** Apply minimal diffs, follow architecture tasks
- **Rules:** 
  - Must use diff format
  - Must update docs/ChangedDataLog.md
  - Must verify file existence before editing
  - No refactors unless explicitly requested

### 3️⃣ Validation Agent (QA)
- **Purpose:** Detect regressions, validate schema compatibility
- **Rules:** 
  - Cannot modify files
  - Only reports issues
  - Flags "UNVERIFIED ASSUMPTION" cases
  - Checks: hallucinated imports, unused variables, signature changes

### 4️⃣ Compliance/Logging Agent
- **Purpose:** Enforce governance standards
- **Rules:**
  - Ensures docs/ChangedDataLog.md updated
  - Ensures .gitignore includes it
  - No silent data mutations

### 5️⃣ Refactor Agent (Optional)
- **Purpose:** Technical debt reduction
- **Rules:** Disabled by default. Only activated when:
  - User says "refactor mode"
  - Tech debt ticket exists

---

## Diff Enforcement

- **No full file rewrites** unless explicitly required
- **No changes > 150 lines** without documented justification
- Prefer incremental changes over wholesale replacements
- Each edit must have clear purpose

---

## Refactor Restrictions

- Refactoring disabled by default
- Only permitted with explicit user request OR tech debt ticket
- Must maintain backward compatibility
- Must update tests accordingly

---

## Logging Requirements

### Change Tracking
- **Must update:** `docs/ChangedDataLog.md`
- **Format:** Timestamp + Action + Reason + Affected Files

### Example Entry
```markdown
### Feature: [Title]
**Timestamp**: YYYY-MM-DD HH:MM:SS TZ
**Action**: [What was done]
**Reason**: [Why it was needed]
**Files**: [list of files]
```

### .gitignore
Must include:
```
docs/ChangedDataLog.md
```

---

## Stability Policy

Before generating code, always:

1. ✅ **Restate task** - Confirm what you're building
2. ✅ **List impacted files** - Identify all files that will change
3. ✅ **Verify file existence** - Confirm target files exist before editing
4. ✅ **Confirm path case sensitivity** - File paths are case-sensitive on Linux
5. ✅ **Check scope** - No unrelated file edits
6. ✅ **Confirm compatibility** - Verify with existing structure/patterns

---

## Change Size Threshold Policy

| Change Size | Requirement |
|-------------|-------------|
| < 50 lines | Standard review |
| 50-150 lines | Requires clear justification |
| > 150 lines | **BLOCKED** unless explicit requirement documented |

---

## Skills (Execution Capabilities)

When working in this repo, apply these skills:

1. **File Scanner** - Always verify file exists before editing
2. **Schema Awareness** - Read existing code patterns before touching backend logic
3. **State Snapshot** - Reference PROJECT_STATE.md and ARCHITECTURE_OVERVIEW.md
4. **Regression Check** - Verify no broken imports, exports, or signatures

---

## Mode Switching

Available modes (controlled by user):

| Mode | Behavior |
|------|----------|
| SAFE_MODE | Default - conservative changes only |
| ARCHITECTURE_MODE | Focus on structure/planning |
| IMPLEMENTATION_MODE | Focus on code generation |
| VALIDATION_MODE | Focus on QA/regression checks |
| REFACTOR_MODE | Allow refactoring (manual activation only) |

---

*This document serves as the constitution for all agents operating in this repository.*
