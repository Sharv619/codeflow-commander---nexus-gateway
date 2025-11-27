# CodeFlow Sentinel

A production-ready anomaly detection sidecar service for the CodeFlow Commander ecosystem. Uses FastAPI and IsolationForest to detect anomalous telemetry patterns with optional LLM-powered explanations.

## Overview

CodeFlow Sentinel monitors telemetry data from code execution workflows, identifying potential security threats, performance anomalies, or malicious activities through machine learning-based analysis.

## Features

- **FastAPI Service**: RESTful API with automatic OpenAPI documentation
- **IsolationForest Anomaly Detection**: Unsupervised ML for detecting unusual telemetry patterns
- **Sliding Window Training**: Continuously updated model with bounded memory usage
- **LLM Explanations**: Optional Ollama integration for human-readable threat explanations
- **Prometheus Metrics**: Built-in monitoring and observability
- **Docker Ready**: Production container with health checks and security hardening
- **Graceful Degradation**: Functionally complete without optional dependencies

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python sentinel.py
```

### Docker Production

```bash
# Build and run
docker build -t codeflow-sentinel .
docker run -p 8000:8000 --env-file .env codeflow-sentinel
```

## API Endpoints

### `GET /health`
Health check endpoint for load balancers and monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00",
  "history_size": 150,
  "detector_trained": true,
  "version": "1.0.0"
}
```

### `POST /analyze-flow`
Analyze telemetry data for anomalies.

**Request Body:**
```json
{
  "latency": 250.5,
  "input_length": 1024,
  "errors": 0,
  "route": "/api/analyze",
  "user_id": "user123",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

**Normal Response:**
```json
{
  "status": "OK"
}
```

**Anomaly Response:**
```json
{
  "status": "THREAT_DETECTED",
  "action": "freeze",
  "reason": "Unusually high latency detected, possible resource exhaustion or DoS attempt",
  "prediction_score": 0.85,
  "confidence": 0.95
}
```

### `GET /metrics` (Optional)
Prometheus-formatted metrics endpoint (requires prometheus_client).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SENTINEL_PORT` | `8000` | Service port |
| `SENTINEL_HISTORY_MAX` | `1000` | Maximum telemetry history size |
| `SENTINEL_CONTAMINATION` | `0.1` | Expected anomaly ratio for IsolationForest |
| `OLLAMA_MODEL` | `llama2` | Ollama model for explanations |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API endpoint |

## Architecture

### Data Flow
1. **Telemetry Ingestion**: Receives telemetry via POST /analyze-flow
2. **Feature Extraction**: Converts telemetry to ML features (latency, input_length, errors)
3. **Anomaly Detection**: IsolationForest predicts anomalies using sliding window training
4. **Threat Assessment**: LLM provides detailed explanations for anomalies
5. **Response**: Returns analysis results with recommended actions

### Security Considerations
- **Localhost Binding**: Service binds to 127.0.0.1 by default for security
- **Bounded Resources**: Memory usage limited by SENTINEL_HISTORY_MAX
- **Environment Variables**: Sensitive configuration via environment
- **Non-root Container**: Docker runs as unprivileged user

### Failure Modes
- **LLM Unavailable**: Falls back to rule-based explanations
- **Model Training Errors**: Continues with previous model or simple heuristics
- **Memory Limits**: Bounded deque prevents memory exhaustion

## Integration Examples

### JavaScript Client
```javascript
const response = await fetch('http://localhost:8000/analyze-flow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latency: 150,
    input_length: 512,
    errors: 0,
    route: '/api/process'
  })
});
const result = await response.json();
if (result.status === 'THREAT_DETECTED') {
  console.log('Threat detected:', result.reason);
  // Implement freeze/throttle logic
}
```

### Shell Monitoring
```bash
#!/bin/bash
# Simple monitoring script
while true; do
  curl -s http://localhost:8000/health | jq .status
  sleep 30
done
```

## Development

### Running Tests
```bash
# Install test dependencies
pip install -r requirements.txt

# Run pytest with coverage
pytest tests/ -v --cov=sentinel --cov-report=html
```

### Building Documentation
```bash
# OpenAPI docs available at /docs when running
# ReDoc docs available at /redoc when running
```

## Production Deployment

### Docker Compose
Use with the provided `docker-compose.sentinal.yml` for development environments.

### Kubernetes
See the companion `kubernetes/` directory for production manifests.

### Monitoring
- Health checks every 30 seconds
- Prometheus metrics available at `/metrics`
- Structured logging to stdout

## Troubleshooting

### Common Issues

1. **"Service unhealthy"**: Check logs for startup errors, verify port availability
2. **"LLM explanation failed"**: Ensure Ollama is running and accessible at OLLAMA_HOST
3. **Memory issues**: Reduce SENTINEL_HISTORY_MAX or increase container resources
4. **Poor anomaly detection**: Adjust SENTINEL_CONTAMINATION based on your telemetry patterns

### Performance Tuning

- **History Size**: Balance between memory usage and detection accuracy
- **Training Frequency**: Model re-trains every 50 samples by default
- **Feature Selection**: Modify `extract_features()` for domain-specific telemetry
- **LLM Timeout**: Increase timeout in `explain_async()` for slower models

## Contributing

See the main CodeFlow Commander repository for contribution guidelines. This service follows the same code quality and security standards.

## License

See root repository license.
