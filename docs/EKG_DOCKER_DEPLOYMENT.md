# EKG Services Docker Deployment Guide

## Overview

This guide covers deploying the Enterprise Knowledge Graph (EKG) services using Docker. The EKG services consist of:

| Service | Port | Description |
|---------|------|-------------|
| EKG Ingestion Service | 3000 | Receives webhook events, processes repository data, stores in graph DB |
| EKG Query Service | 4000 | GraphQL API for querying EKG context |
| Gremlin Server (optional) | 8182 | Local graph database (for development) |

## Quick Start

### 1. Start EKG Services

```bash
# Start all services
docker compose -f docker-compose.ekg.yml up -d

# Check status
docker compose -f docker-compose.ekg.yml ps

# View logs
docker compose -f docker-compose.ekg.yml logs -f
```

### 2. Verify Services

```bash
# Check ingestion service
curl http://localhost:3000/health

# Check query service
curl http://localhost:4000/health
```

### 3. Test with CLI

```bash
# Set environment variables
export ALLOW_LOCALHOST=true
export INGESTION_SERVICE_URL=http://localhost:3000
export QUERY_SERVICE_URL=http://localhost:4000

# Index repository
npx codeflow-hook index

# Analyze diff
git diff --staged | npx codeflow-hook analyze-diff
```

## Docker Compose Configuration

### Services

#### EKG Ingestion Service (Port 3000)

```yaml
ekg-ingestion:
  build:
    context: ./packages/services/ingestion-service
    dockerfile: Dockerfile
  ports:
    - "3000:3000"
  environment:
    - NODE_ENV=production
    - PORT=3000
    - WEBHOOK_SECRET=${WEBHOOK_SECRET:-dev-secret-123}
    - SKIP_NEPTUNE=true
    - CORS_ORIGIN=*
```

#### EKG Query Service (Port 4000)

```yaml
ekg-query:
  build:
    context: ./packages/services/query-service
    dockerfile: Dockerfile
  ports:
    - "4000:4000"
  environment:
    - NODE_ENV=production
    - PORT=4000
    - SKIP_NEPTUNE=true
    - CORS_ORIGIN=*
    - INGESTION_SERVICE_URL=http://ekg-ingestion:3000
```

## Environment Variables

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3000 (ingestion) / 4000 (query) |
| `NODE_ENV` | Environment | production |
| `CORS_ORIGIN` | CORS allowed origins | * |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBHOOK_SECRET` | Secret for webhook authentication | dev-secret-123 |
| `SKIP_NEPTUNE` | Skip Neptune connection (dev mode) | false |
| `NEPTUNE_ENDPOINT` | Neptune cluster endpoint | - |
| `NEPTUNE_PORT` | Neptune port | 8182 |
| `NEPTUNE_AUTH_MODE` | Authentication mode | IAM |
| `AWS_REGION` | AWS region for Neptune | us-east-1 |
| `GITHUB_TOKEN` | GitHub API token | - |
| `ALLOW_LOCALHOST` | Allow localhost URLs (dev only) | false |

## Local Development

### Without Neptune (Default)

The services run with `SKIP_NEPTUNE=true` by default, which:
- ✅ Accepts indexing requests
- ✅ Returns success responses
- ❌ Does not store graph data
- ❌ Does not provide full EKG context

### With Gremlin Server (Local Graph DB)

To enable full EKG functionality, add Gremlin server:

```yaml
# Add to docker-compose.ekg.yml
gremlin-server:
  image: tinkerpop/gremlin-server:3.7.1
  ports:
    - "8182:8182"
```

Then update service environment:
```yaml
environment:
  - SKIP_NEPTUNE=false
  - NEPTUNE_ENDPOINT=gremlin-server
  - NEPTUNE_PORT=8182
  - NEPTUNE_AUTH_MODE=
```

## Production Deployment (AWS Neptune)

### 1. Configure AWS Credentials

Copy the example configuration:
```bash
cp .env.aws.example .env.aws
```

Edit `.env.aws` with your values:
```bash
export AWS_REGION=us-east-1
export NEPTUNE_ENDPOINT=your-cluster.xxxx.us-east-1.neptune.amazonaws.com
export GITHUB_TOKEN=your_github_pat
export WEBHOOK_SECRET=your-secure-secret
```

Source the variables:
```bash
source .env.aws
```

### 2. Update Docker Compose

```yaml
ekg-ingestion:
  environment:
    - NEPTUNE_ENDPOINT=${NEPTUNE_ENDPOINT}
    - NEPTUNE_PORT=8182
    - NEPTUNE_AUTH_MODE=IAM
    - AWS_REGION=${AWS_REGION}
    - GITHUB_TOKEN=${GITHUB_TOKEN}
    - WEBHOOK_SECRET=${WEBHOOK_SECRET}
    - SKIP_NEPTUNE=false
```

### 3. AWS Setup Requirements

#### Neptune Cluster
- Create Neptune DB cluster in AWS Console
- Note the cluster endpoint (writer instance)
- Enable IAM authentication (recommended)

#### Security Groups
- Allow inbound on port 8182 (Neptune)
- Allow inbound on ports 3000, 4000 (EKG services)

#### IAM Roles (ECS)
- ECS Task Execution Role
- ECS Task Role with `neptune-db:Connect` permission

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.ekg.yml logs ekg-ingestion
docker compose -f docker-compose.ekg.yml logs ekg-query

# Rebuild without cache
docker compose -f docker-compose.ekg.yml build --no-cache
docker compose -f docker-compose.ekg.yml up -d
```

### Connection Refused

```bash
# Check if ports are available
netstat -tuln | grep -E '3000|4000|8182'

# Check container status
docker ps -a
```

### Neptune Connection Timeout

```bash
# For local development, ensure SKIP_NEPTUNE=true
# Check Gremlin server is running
curl http://localhost:8182

# For AWS, verify:
# - Security group allows port 8182
# - Neptune cluster is in same VPC
# - IAM authentication configured
```

### CLI "Invalid URL" Error

```bash
# Set ALLOW_LOCALHOST for local development
export ALLOW_LOCALHOST=true
export INGESTION_SERVICE_URL=http://localhost:3000
export QUERY_SERVICE_URL=http://localhost:4000
```

## Health Check Endpoints

| Service | Endpoint | Response |
|---------|----------|----------|
| Ingestion | `GET /health` | `{"status": "healthy", "service": "ekg-ingestion-service"}` |
| Query | `GET /health` | `{"status": "healthy", "service": "ekg-query-service"}` |
| Query | `GET /graphql` | GraphQL Playground (if enabled) |

## API Endpoints

### Ingestion Service (Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /webhooks/github | Receive GitHub webhook events |
| POST | /api/ingest | Submit repository for indexing |
| GET | /health | Health check |

### Query Service (Port 4000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /graphql | GraphQL query endpoint |
| GET | /health | Health check |

## Additional Resources

- [PHASE3 EKG Backend Integration](../docs/PHASE3_EKG_BACKEND_INTEGRATION.md)
- [EKG Schema Design](../docs/EKG_SCHEMA_DESIGN.md)
- [AWS Neptune Documentation](https://docs.aws.amazon.com/neptune/)
- [Gremlin Server Documentation](https://tinkerpop.apache.org/docs/3.7.1/reference/)
