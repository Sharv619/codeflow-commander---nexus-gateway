# 🚀 CodeFlow CI/CD Pipeline - Containerized Deployment

This document provides complete instructions for deploying the CodeFlow CI/CD Pipeline as a containerized system with real CLI integration and frontend display.

## 🎯 Overview

The CodeFlow CI/CD Pipeline is now a **production-ready, containerized system** that combines:

- **React Frontend** (npm-based) - Beautiful UI for pipeline visualization
- **Python Backend** (FastAPI) - Real CI/CD execution and AI code review
- **Nginx Reverse Proxy** - Load balancing and SSL termination
- **Optional Services** - Database, caching, and monitoring

## 📦 What You Get

### ✅ **Before (Simulation)**
- Mock data and fake progress bars
- Static results
- No real command execution

### 🚀 **After (Real Execution)**
- **Real CI/CD commands**: `npm run lint`, `docker compose build`
- **Live monitoring**: Real-time command output and timing
- **Professional CLI output**: Structured, formatted results
- **Real failures**: Actual CI/CD failures with rollback scenarios
- **Production deployment**: One command to deploy everything

## 🛠️ Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git (for cloning the repository)

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd codeflow-commander---nexus-gateway
```

### 2. Deploy Everything
```bash
./scripts/deploy.sh
```

### 3. Access Your System
- **Frontend**: http://localhost (HTTP) or https://localhost (HTTPS)
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/docs
- **Monitoring**: http://localhost:3000 (Grafana - admin/admin)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Python API    │    │   Nginx Proxy   │
│   (Port 80)     │◄──►│   (Port 3001)   │◄──►│   (Port 443)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   CLI Hook      │
                    │   (Real Output) │
                    └─────────────────┘
```

## 🔧 System Components

### **Frontend Service**
- **Technology**: React + TypeScript + Vite
- **Port**: 80 (HTTP), 443 (HTTPS)
- **Features**: Real-time pipeline visualization, AI code review display

### **Backend Service**
- **Technology**: Python + FastAPI + Uvicorn
- **Port**: 3001
- **Features**: Real CI/CD execution, AI code review, project detection

### **Optional Services**
- **PostgreSQL**: Persistent data storage
- **Redis**: Caching and session management
- **Prometheus**: Metrics collection
- **Grafana**: Visualization and monitoring

## 🎮 CLI Integration

### How It Works
1. **Git Hook Triggers**: When you commit code, the hook captures the diff
2. **Real Analysis**: Python backend analyzes code with AI
3. **Pipeline Execution**: Real CI/CD commands execute
4. **Live Updates**: Frontend shows real-time progress

### CLI Commands Available
```bash
# Start the system
./scripts/deploy.sh

# View logs
docker-compose logs -f

# Stop the system
docker-compose down

# Restart services
docker-compose restart

# Update to latest version
docker-compose pull && docker-compose up -d
```

## 📊 Real CLI Output Examples

### Before (Simulation)
```
[✓] Code Quality Analysis: 85% complete
[✓] TypeScript Compilation: 90% complete
[✓] Build Process: 75% complete
```

### After (Real Execution)
```
✅ Code Quality Analysis: PASSED (2.3s)
   - ESLint: No issues found
   - Security scan: Clean

✅ TypeScript Compilation: PASSED (4.1s)
   - All types checked successfully
   - No compilation errors

❌ Build Process: FAILED (15.2s)
   - Error: Missing dependency 'lodash'
   - Command: npm run build
   - Exit code: 1
   
🔄 Rolling back changes...
```

## 🔍 API Endpoints

### Core Endpoints
- `POST /analyze` - AI code review
- `POST /git-hook` - Git hook integration
- `GET /api/pipeline/config` - Project detection
- `POST /api/pipeline/execute` - Start pipeline
- `GET /api/pipeline/status/:id` - Real-time status
- `GET /api/pipeline/logs/:id/:stage` - Live logs

### Frontend Integration
```javascript
// Get real-time pipeline status
const status = await fetch('/api/pipeline/status/12345')
  .then(r => r.json());

// Start a new pipeline
const response = await fetch('/api/pipeline/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ commitMessage, stages })
});
```

## 🚀 Production Deployment

### Environment Variables
Copy `.env.docker` and customize for your environment:
```bash
cp .env.docker .env.production
# Edit .env.production with your settings
```

### SSL Configuration
The deployment includes self-signed SSL certificates for development. For production:
1. Replace certificates in `nginx/ssl/`
2. Update `nginx/proxy.conf` with your domain
3. Configure proper SSL certificates

### Scaling
```bash
# Scale frontend
docker-compose up -d --scale frontend=3

# Scale backend
docker-compose up -d --scale backend=2
```

## 📈 Monitoring

### Health Checks
- Backend: `curl http://localhost:3001/`
- Frontend: `curl http://localhost/`
- All services monitored automatically

### Metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- Custom dashboards for pipeline performance

## 🔧 Troubleshooting

### Common Issues
1. **Port conflicts**: Change ports in `docker-compose.yml`
2. **SSL errors**: Check certificates in `nginx/ssl/`
3. **Build failures**: Check logs with `docker-compose logs`

### Debug Commands
```bash
# Check service status
docker-compose ps

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Restart specific service
docker-compose restart backend
```

## 🎉 What Makes This Special

### Real CI/CD Experience
- **Actual command execution**: See real `npm`, `docker`, `git` commands
- **Authentic failures**: Learn from real CI/CD mistakes and rollbacks
- **Performance metrics**: Real timing and resource usage
- **Professional output**: Structured, formatted CLI output

### Educational Value
- **Learn CI/CD**: Understand real pipeline workflows
- **Security awareness**: AI detects real vulnerabilities
- **DevOps practices**: Experience authentic deployment scenarios

### Production Ready
- **Containerized**: Easy deployment anywhere
- **Scalable**: Add more services as needed
- **Monitored**: Built-in health checks and metrics
- **Secure**: SSL, security headers, and best practices

## 📞 Support

For issues and questions:
1. Check the logs: `docker-compose logs`
2. Verify health: `docker-compose ps`
3. Review configuration: Check `.env.docker`
4. Rebuild: `docker-compose down && docker-compose up -d`

---

**🎉 Congratulations! You now have a complete, production-ready CI/CD development platform!**