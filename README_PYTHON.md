# CodeFlow CI/CD Pipeline Server - Python Edition

## 🚀 Overview

This is a complete Python rewrite of the CodeFlow CI/CD Pipeline Server, featuring an **embeddable AI code review system** and **real CI/CD pipeline execution**. The system has been transformed from JavaScript/Node.js to Python/FastAPI, making it more powerful and easier to integrate into Python applications.

## 🎯 Key Features

### 🤖 Embeddable AI Code Reviewer
- **Rule-based static analysis** with pattern matching
- **Security vulnerability detection** (eval, exec, pickle, shell injection)
- **Bug pattern detection** (None checks, exception handling, iteration patterns)
- **Code style analysis** (debug prints, TODO comments, imports)
- **Performance optimization suggestions**
- **AST-based deep analysis** for Python code
- **JSON and Markdown output formats**

### 🔄 Real CI/CD Pipeline Execution
- **Automatic project detection** (TypeScript monorepo, React, Node.js, Docker)
- **Smart pipeline generation** based on detected tools and frameworks
- **Real command execution** with subprocess management
- **Real-time monitoring** with live status updates
- **Fail-fast strategy** for critical stages
- **Rollback and cleanup** capabilities

### 🌐 Python Web Server (FastAPI)
- **Modern async API** with FastAPI and Uvicorn
- **Comprehensive API endpoints** for all functionality
- **CORS support** for frontend integration
- **JSON Schema validation** with Pydantic
- **Automatic API documentation** at `/docs`

## 📦 Installation

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd codeflow-commander---nexus-gateway

# Run setup (installs Python dependencies and creates environment)
python setup.py

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Start the server
python start_server.py
```

### Manual Installation
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the server
uvicorn server:app --host 0.0.0.0 --port 3001 --reload
```

## 🚀 Usage

### 1. AI Code Reviewer (Embeddable)

```python
from ai_code_reviewer import CodeReviewer

# Create reviewer instance
reviewer = CodeReviewer()

# Review code
code = '''
def dangerous_function(user_input):
    eval(user_input)  # Security issue!
    return True
'''

result = reviewer.review_code(code, "example.py")

# Get results
print(f"Status: {result.overall_status}")
print(f"Score: {result.score}/10")
print(f"Summary: {result.summary}")

# Convert to JSON
json_output = reviewer.to_json(result)
print(json_output)

# Convert to Markdown
markdown_output = reviewer.to_markdown(result)
print(markdown_output)
```

### 2. Real CI/CD Pipeline Execution

```python
import requests
import json

# Start pipeline execution
response = requests.post('http://localhost:3001/api/pipeline/execute', json={
    "commit_message": "feat: Add new feature",
    "stages": [
        {
            "name": "Code Quality Analysis",
            "command": "npm run lint",
            "timeout": 120000,
            "critical": True
        },
        {
            "name": "Build",
            "command": "npm run build",
            "timeout": 300000,
            "critical": True
        }
    ]
})

execution = response.json()
print(f"Pipeline started: {execution['execution_id']}")

# Monitor execution
while True:
    status_response = requests.get(f"http://localhost:3001/api/pipeline/status/{execution['execution_id']}")
    status = status_response.json()
    
    if status['execution']['status'] != 'running':
        break
    
    print(f"Status: {status['execution']['status']}")
    time.sleep(2)
```

### 3. Project Configuration Detection

```python
import requests

# Detect project configuration
response = requests.get('http://localhost:3001/api/pipeline/config')
config = response.json()

print(f"Project Type: {config['config']['project_type']}")
print(f"Detected Tools: {config['config']['package_managers']}")
print(f"Generated Stages: {len(config['stages'])}")

# Use detected configuration for pipeline execution
stages = config['stages']
```

## 📋 API Endpoints

### Code Review Endpoints
- `POST /analyze` - Analyze code using AI reviewer
- `POST /git-hook` - Handle git hook requests
- `POST /test` - Run tests
- `GET /results` - Get all analysis results
- `GET /result/{id}` - Get specific result

### Pipeline Execution Endpoints
- `POST /api/pipeline/execute` - Execute real pipeline
- `GET /api/pipeline/status/{id}` - Get execution status
- `GET /api/pipeline/logs/{id}/{stage}` - Get stage logs
- `POST /api/pipeline/abort/{id}` - Abort execution
- `GET /api/pipeline/results` - Get all pipeline results
- `GET /api/pipeline/config` - Get project config

### Root Endpoint
- `GET /` - API information and documentation

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Server Configuration
HOST=0.0.0.0
PORT=3001
DEBUG=True

# AI Provider Configuration (Optional)
GEMINI_API_URL=
GEMINI_API_KEY=

# Security Configuration
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=*

# Pipeline Configuration
MAX_EXECUTION_TIME=3600
MAX_CONCURRENT_EXECUTIONS=5
LOG_LEVEL=INFO
```

## 🧪 Testing

### Python Test Runner
```bash
# Run comprehensive pipeline tests
python test_real_pipeline.py
```

### Test Coverage
- ✅ Project configuration detection
- ✅ Pipeline execution
- ✅ Real-time status monitoring
- ✅ Stage logs retrieval
- ✅ Results persistence
- ✅ Error handling

## 🏗️ Architecture

### Core Components

1. **AI Code Reviewer** (`ai_code_reviewer.py`)
   - Rule-based analysis engine
   - Pattern matching for security/bugs/style/performance
   - AST-based deep code analysis
   - Configurable issue detection

2. **Pipeline Executor** (`server.py`)
   - Real command execution with subprocess
   - Project type detection
   - Smart pipeline generation
   - Real-time monitoring and logging

3. **FastAPI Server** (`server.py`)
   - Modern async web server
   - Comprehensive API endpoints
   - JSON Schema validation
   - CORS and security middleware

### Data Flow

```
Code Input → AI Reviewer → Analysis Results → JSON/Markdown Output
     ↓
Git Hook → Diff Analysis → Security Check → Results Storage
     ↓
Project Detection → Pipeline Generation → Real Execution → Status Updates
```

## 🎨 Frontend Integration

The Python server is fully compatible with the existing React frontend:

```javascript
// Frontend can still use the same API endpoints
fetch('/api/pipeline/config')
  .then(response => response.json())
  .then(data => {
    // Use detected configuration
    setPipelineStages(data.stages);
  });
```

## 🔒 Security Features

### AI Code Reviewer Security Checks
- **Code Injection**: Detects `eval()`, `exec()`, shell commands
- **Deserialization**: Warns about unsafe `pickle` usage
- **Hardcoded Secrets**: Detects passwords, API keys, secrets
- **Command Injection**: Warns about shell=True in subprocess

### Pipeline Security
- **Sandboxed Execution**: Commands run in controlled environment
- **Timeout Protection**: Prevents infinite loops
- **Resource Limits**: Configurable execution limits
- **Rollback Support**: Automatic cleanup on failure

## 📊 Performance

### AI Code Reviewer
- **Fast Pattern Matching**: Regex-based analysis
- **AST Parsing**: Deep code structure analysis
- **Memory Efficient**: Processes code in chunks
- **Scalable**: Can handle large codebases

### Pipeline Execution
- **Async Processing**: Non-blocking command execution
- **Concurrent Stages**: Parallel execution where possible
- **Real-time Updates**: WebSocket-like updates via polling
- **Resource Management**: Automatic cleanup and monitoring

## 🚀 Deployment

### Docker Support
```bash
# Build and run with Docker
docker-compose up -d
```

### Production Deployment
```bash
# Install in production environment
pip install -r requirements.txt

# Run with Gunicorn
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker

# Or use the startup script
python start_server.py
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Setup
```bash
# Clone and setup
git clone <repository-url>
cd codeflow-commander---nexus-gateway
python setup.py

# Activate environment
source venv/bin/activate

# Install dev dependencies
pip install -r requirements.txt

# Run tests
pytest

# Start development server
uvicorn server:app --host 0.0.0.0 --port 3001 --reload
```

## 📚 Documentation

- **API Documentation**: Available at `http://localhost:3001/docs`
- **Code Examples**: See `ai_code_reviewer.py` for usage examples
- **Test Examples**: See `test_real_pipeline.py` for integration examples

## 🐛 Troubleshooting

### Common Issues

1. **Python Version**: Ensure Python 3.8+ is installed
2. **Dependencies**: Run `pip install -r requirements.txt`
3. **Virtual Environment**: Activate with `source venv/bin/activate`
4. **Port Conflicts**: Change PORT in `.env` if 3001 is in use

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python start_server.py
```

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation and parsing
- **Uvicorn** - ASGI server
- **AST Module** - Python Abstract Syntax Tree parsing

---

**Transform your CI/CD workflow with AI-powered code review and real pipeline execution!** 🚀