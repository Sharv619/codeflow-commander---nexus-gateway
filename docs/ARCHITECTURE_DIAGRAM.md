# Codeflow Commander Architecture Diagram

This document maps the implemented architecture of Codeflow Commander and the `codeflow-hook` multi-agent review workflow.

## System Architecture

```mermaid
flowchart TB
    DEV[Developer] --> GIT[Git Repository]
    GIT --> HOOK[Pre-commit / Pre-push Hook]
    HOOK --> CLI[codeflow-hook CLI]

    subgraph REVIEW[Multi-Agent Review Plane]
        CLI --> DIFF[Capture Git Diff]
        DIFF --> CTX[Build Review Context]
        CTX --> POOL{{Agent Pool}}

        POOL --> SEC[Security Agent]
        POOL --> QUAL[Quality Agent]
        POOL --> TEST[Test Impact Agent]
        POOL --> DEP[Dependency Agent]
        POOL --> ARCH[Architecture Agent]
        POOL --> AIR[AI Reasoning Agent]

        SEC --> AGG[Result Aggregator]
        QUAL --> AGG
        TEST --> AGG
        DEP --> AGG
        ARCH --> AGG
        AIR --> AGG

        CTX --> CFG[Local Config]
        CTX --> PKG[package.json / Lockfiles]
        CTX --> META[Branch / Commit Range / Changed Files]

        AIR --> PROVIDERS{{AI Provider Adapter}}
        PROVIDERS --> OLLAMA[Ollama / Local Model]
        PROVIDERS --> GEMINI[Google Gemini]
        PROVIDERS --> OPENAI[OpenAI]
        PROVIDERS --> CLAUDE[Claude]

        AGG --> SCORE[Overall Score and Status]
        SCORE --> GATE{Passes minimum score?}
        GATE -->|Yes| ALLOW[Allow Commit / Push]
        GATE -->|No| BLOCK[Block and Return Findings]
        SCORE --> HISTORY[Persist Review History]
    end

    subgraph PLATFORM[Commander Platform Plane]
        USER[Developer / Reviewer] --> UI[React 19 + Vite Simulator UI]
        UI --> API[Express Backend]
        API --> ANALYSIS[ESLint / Test Runner / AI Proxy]
        ANALYSIS --> PROVIDERS

        GH[GitHub API / Webhooks] --> INGEST[Ingestion Service]
        INGEST --> TRANSFORM[Repository Data Transform]
        TRANSFORM --> NEPTUNE[(Amazon Neptune Graph DB)]

        UI --> QUERY[Apollo GraphQL Query Service]
        QUERY --> NEPTUNE
        CLI --> BRIDGE[CLI Integration Service]
        BRIDGE --> QUERY

        AAN[Autonomous Agent Network] --> QUERY
        AAN --> PROVIDERS
    end

    subgraph DELIVERY[Infrastructure and Delivery]
        DOCKER[Docker Compose / Nginx] --> UI
        DOCKER --> API
        DOCKER --> QUERY
        TF[Terraform] --> AWS[AWS VPC / EKS / Neptune / ECR / IAM / CloudWatch]
        AWS --> DOCKER
        CI[GitHub Actions] --> TESTS[Lint / Typecheck / Tests / Build]
        TESTS --> DOCKER
    end
```

## Review Execution Sequence

```mermaid
sequenceDiagram
    actor Developer
    participant Git as Git Hook
    participant CLI as codeflow-hook
    participant Orch as runAgentReview
    participant Agents as Six Review Agents
    participant AI as AI Provider
    participant Agg as Result Aggregator
    participant Store as History Store

    Developer->>Git: Commit or push code
    Git->>CLI: Invoke hook with repository diff
    CLI->>Orch: Submit diff and options
    Orch->>Orch: Load config and build context
    Orch->>Agents: Run reviews in parallel or sequence
    Agents->>AI: Optional reasoning request
    AI-->>Agents: Structured analysis
    Agents-->>Orch: Findings, status, and score
    Orch->>Agg: Aggregate all agent results
    Agg-->>Orch: Overall status and score
    Orch->>Store: Persist review record
    Orch-->>CLI: PASS or FAIL with findings
    CLI-->>Git: Allow or block operation
    Git-->>Developer: Final review outcome
```

## Architectural Boundaries

| Boundary | Responsibility |
|---|---|
| Git integration | Captures repository changes and enforces the quality gate |
| Review orchestrator | Builds shared context and coordinates enabled agents |
| Specialist agents | Evaluate security, quality, tests, dependencies, architecture, and AI-assisted reasoning |
| Aggregation layer | Produces the final score, status, and blocking decision |
| Provider layer | Keeps model selection configurable and prevents hard coupling to one vendor |
| Platform services | Provide simulation, API analysis, ingestion, and graph querying |
| Infrastructure | Packages, deploys, observes, and validates the system |

## Source Mapping

- `packages/cli-tool/lib/agents/orchestrator.cjs`: review context, agent pool, parallel execution, aggregation, gate, and history persistence
- `packages/simulator-ui`: React and Vite CI/CD simulator
- `server`: Express analysis backend and AI proxy
- `packages/services/query-service`: Apollo GraphQL access layer
- `packages/services/ingestion-service`: GitHub-to-Neptune ingestion
- `packages/services/autonomous-agent-network`: autonomous coordination layer
- `IaC/terraform`: AWS infrastructure definitions
