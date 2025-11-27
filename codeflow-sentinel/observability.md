# CodeFlow Sentinel Observability Guide

This document outlines production monitoring recommendations for the CodeFlow Sentinel anomaly detection service.

## Architecture Overview

CodeFlow Sentinel provides comprehensive observability through:

- **Health Checks**: `/health` endpoint for load balancer integration
- **Metrics Collection**: `/metrics` endpoint with Prometheus-compatible metrics
- **Structured Logging**: JSON-formatted logs to stdout/stderr
- **End-to-End Testing**: Automated smoke tests with Docker containers

## Recommended Metrics & Alerts

### 1. Anomaly Detection Rate (`sentinel_anomaly_rate`)
**Type**: Gauge (0.0 - 1.0)  
**Description**: Current anomaly detection rate based on IsolationForest predictions  
**Thresholds**:
- Warning: > 0.3 (30% anomaly rate)
- Critical: > 0.7 (70% anomaly rate)
- Alert: Sudden spikes (> 2x baseline)

**Ingestion Queries**:
```promql
# Current anomaly rate
sentinel_anomaly_rate

# Rate of anomaly detection over time
rate(sentinel_anomaly_rate[5m])
```

**Alert Rules**:
```yaml
- alert: SentinelHighAnomalyRate
  expr: sentinel_anomaly_rate > 0.7
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High anomaly detection rate in CodeFlow Sentinel"
    description: "Anomaly rate is {{ $value | printf \"%.2f\" }} (>70%)"
    runbook: "/runbooks/sentinel-anomaly-response.md"

- alert: SentinelAnomalySpike
  expr: increase(sentinel_anomaly_rate[10m]) > 0.3
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Sudden anomaly rate spike detected"
    description: "Anomaly rate increased by {{ $value | printf \"%.2f\" }} in 10m"
```

### 2. Memory Usage (`sentinel_memory_mb`)
**Type**: Gauge  
**Description**: Current memory usage of the sentinel process in MB  
**Thresholds**:
- Warning: > 500 MB
- Critical: > 800 MB
- Alert: Memory leak pattern

**Ingestion Queries**:
```promql
# Current memory usage
sentinel_memory_mb

# Memory usage growth rate
deriv(sentinel_memory_mb[1h])
```

**Alert Rules**:
```yaml
- alert: SentinelHighMemoryUsage
  expr: sentinel_memory_mb > 800
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "CodeFlow Sentinel high memory usage"
    description: "Memory usage is {{ $value }}MB (>800MB)"
    runbook: "/runbooks/sentinel-memory-issues.md"

- alert: SentinelMemoryLeak
  expr: deriv(sentinel_memory_mb[1h]) > 50
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Possible memory leak in sentinel"
    description: "Memory usage increasing by >50MB/hour"
```

### 3. Request Latency (`sentinel_request_duration_seconds`)
**Type**: Histogram  
**Description**: Request processing time for analyze-flow and health endpoints  
**Buckets**: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0]  
**Thresholds**:
- P95 Warning: > 0.1s (100ms)
- P95 Critical: > 1.0s (1s)
- P99 Critical: > 5.0s (5s)

**Ingestion Queries**:
```promql
# 95th percentile latency
histogram_quantile(0.95, rate(sentinel_request_duration_seconds_bucket[5m]))

# 99th percentile latency
histogram_quantile(0.99, rate(sentinel_request_duration_seconds_bucket[5m]))

# Request rate by endpoint
rate(sentinel_requests_total[5m])
```

**Alert Rules**:
```yaml
- alert: SentinelHighLatency
  expr: histogram_quantile(0.95, rate(sentinel_request_duration_seconds_bucket[5m])) > 1.0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High request latency in sentinel"
    description: "P95 latency is {{ $value }}s (>1.0s)"
    runbook: "/runbooks/sentinel-performance-tuning.md"

- alert: SentinelRequestTimeout
  expr: histogram_quantile(0.99, rate(sentinel_request_duration_seconds_bucket[5m])) > 5.0
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Very high request latency detected"
    description: "P99 latency is {{ $value }}s (>5.0s)"
```

### 4. Model Training Frequency (`sentinel_model_fits_total`)
**Type**: Counter  
**Description**: Total number of times the IsolationForest model has been retrained  
**Thresholds**:
- Monitor for expected training patterns
- Alert: No training for extended periods
- Alert: Excessive retraining

**Ingestion Queries**:
```promql
# Training rate per minute
rate(sentinel_model_fits_total[5m])

# Time since last training (custom metric needed)
time() - (sentinel_model_fits_total - sentinel_model_fits_total offset 10m)
```

**Alert Rules**:
```yaml
- alert: SentinelModelNotTraining
  expr: rate(sentinel_model_fits_total[5m]) == 0
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Model not being retrained"
    description: "No model updates for 1 hour"
    runbook: "/runbooks/sentinel-model-training.md"

- alert: SentinelExcessiveTraining
  expr: rate(sentinel_model_fits_total[5m]) > 10
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Excessive model retraining"
    description: "Model retrained {{ $value | printf \"%.1f\" }}/min"
    runbook: "/runbooks/sentinel-model-training.md"
```

### 5. Health Check Failures (`sentinel_health_check_fails_total`)
**Type**: Counter  
**Description**: Total number of health check failures  
**Thresholds**:
- Warning: Any non-zero rate
- Critical: Increasing failure rate

**Ingestion Queries**:
```promql
# Health check failure rate
rate(sentinel_health_check_fails_total[5m])

# Total health check failures
increase(sentinel_health_check_fails_total[1h])
```

**Alert Rules**:
```yaml
- alert: SentinelHealthCheckFailure
  expr: increase(sentinel_health_check_fails_total[5m]) > 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Sentinel health check failures detected"
    description: "{{ $value }} health check failures in 5m"
    runbook: "/runbooks/sentinel-health-monitoring.md"
```

### 6. LLM Explanation Failures (`sentinel_llm_failures_total`)
**Type**: Counter  
**Description**: Total number of LLM explainer failures (falls back to rule-based)  
**Thresholds**:
- Warning: > 10% of anomaly detections fail
- Critical: > 50% of anomaly detections fail

**Ingestion Queries**:
```promql
# LLM failure rate
rate(sentinel_llm_failures_total[5m])

# LLM failure ratio
rate(sentinel_llm_failures_total[5m]) / rate(sentinel_requests_total{endpoint="llm"}[5m])
```

**Alert Rules**:
```yaml
- alert: SentinelLLMFallbackHigh
  expr: (rate(sentinel_llm_failures_total[5m]) / rate(sentinel_requests_total{endpoint="llm"}[5m])) > 0.5
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "High LLM explainer failure rate"
    description: "{{ $value | printf \"%.1%\" }} of LLM requests failing"
    runbook: "/runbooks/sentinel-llm-failures.md"

- alert: SentinelLLMUnavailable
  expr: rate(sentinel_llm_failures_total[5m]) > rate(sentinel_requests_total{endpoint="llm"}[5m])
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "LLM service completely unavailable"
    description: "All LLM requests failing for 5m"
    runbook: "/runbooks/sentinel-llm-failures.md"
```

## Request Count Metrics (`sentinel_requests_total`)
**Type**: Counter{endpoint, method}  
**Description**: Total requests by endpoint and HTTP method  
**Monitoring**:
- Track API usage patterns
- Detect unusual request volumes
- Monitor endpoint health

```promql
# Requests per endpoint
sum(rate(sentinel_requests_total[5m])) by (endpoint)

# Error rates by endpoint
rate(sentinel_requests_total{status=~"5.."}[5m]) / rate(sentinel_requests_total[5m])
```

## Dashboard Recommendations

### Grafana Dashboard Panels

1. **Anomaly Rate Trend**
   ```
   Title: Anomaly Detection Rate
   Query: sentinel_anomaly_rate
   Type: Time series graph
   Thresholds: Warning >0.3, Critical >0.7
   ```

2. **Request Latency Distribution**
   ```
   Title: P95 Request Latency
   Query: histogram_quantile(0.95, rate(sentinel_request_duration_seconds_bucket[5m]))
   Type: Stat panel
   Unit: seconds
   Thresholds: Warning >0.1, Critical >1.0
   ```

3. **Memory Usage**
   ```
   Title: Memory Usage
   Query: sentinel_memory_mb
   Type: Gauge
   Unit: MB
   Thresholds: Warning >500, Critical >800
   ```

4. **Training Activity**
   ```
   Title: Model Retraining Rate
   Query: rate(sentinel_model_fits_total[5m])
   Type: Time series graph
   Description: IsolationForest model retrains/minute
   ```

5. **Health Status**
   ```
   Title: Service Health
   Query: up{job="sentinel"}
   Type: Stat panel
   Value mappings: 1=Healthy, 0=Unhealthy
   ```

### AlertManager Integration

```yaml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'sentinel-alerts'
  routes:
  - match:
      service: sentinel
    receiver: 'sentinel-pager'

receivers:
- name: 'sentinel-alerts'
  email_configs:
  - to: 'devops@company.com'
    subject: 'CodeFlow Sentinel Alert: {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      Runbook: {{ .Annotations.runbook }}

      Details:
      {{ range .Labels }}  {{ .Name }}: {{ .Value }}
      {{ end }}
      {{ end }}

- name: 'sentinel-pager'
  pagerduty_configs:
  - service_key: 'sentinel-service-key'
```

## Log Monitoring

### Structured Logging Format
```json
{
  "timestamp": "2025-01-01T12:00:00Z",
  "level": "INFO",
  "service": "sentinel",
  "message": "Anomaly detected",
  "telemetry": {
    "latency": 25000,
    "input_length": 50000,
    "errors": 15,
    "route": "/api/suspicious"
  },
  "prediction_score": -0.85,
  "action": "freeze",
  "reason": "High latency detected, possible resource exhaustion"
}
```

### Log Queries (ELK Stack)

```elasticsearch
# Anomaly detections
service:sentinel AND "Anomaly detected"

# Model training events
service:sentinel AND "Re-trained anomaly detector"

# LLM failures
service:sentinel AND "LLM explanation failed"

# Health check failures
service:sentinel AND "Health check failed"
```

## Capacity Planning

### Resource Requirements
- **Memory**: 200-500 MB baseline, scales with telemetry history
- **CPU**: Minimal for ML inference, occasional spikes during model retraining
- **Disk**: <100MB for container image
- **Network**: Low bandwidth, primarily localhost communication

### Scaling Considerations
- Horizontal scaling not recommended (distributed anomaly detection needed)
- Vertical scaling provides better model accuracy
- Implement rate limiting at ingress level
- Monitor telemetry_history deque size for memory pressure

## Operations Runbooks

### `/runbooks/sentinel-anomaly-response.md`
**Purpose**: Handle high anomaly rate alerts
**Steps**:
1. Check current telemetry patterns
2. Review recent model training status
3. Investigate potential security incidents
4. Consider adjusting contamination threshold
5. Monitor for false positive patterns

### `/runbooks/sentinel-memory-issues.md`
**Purpose**: Handle memory usage issues
**Steps**:
1. Check telemetry_history size vs SENTINEL_HISTORY_MAX
2. Monitor model retraining frequency
3. Consider reducing history size
4. Restart service if memory leak confirmed

### `/runbooks/sentinel-performance-tuning.md`
**Purpose**: Optimize request latency
**Steps**:
1. Profile ML inference performance
2. Check system resource utilization
3. Optimize model parameters (n_estimators, contamination)
4. Consider hardware acceleration for ML operations

### `/runbooks/sentinel-model-training.md`
**Purpose**: Handle model training issues
**Steps**:
1. Verify sufficient training data (>10 samples)
2. Check training frequency settings
3. Monitor model accuracy over time
4. Consider manual model retriggering if needed

### `/runbooks/sentinel-health-monitoring.md`
**Purpose**: Diagnose health check failures
**Steps**:
1. Check service logs for errors
2. Verify dependencies (scikit-learn, prometheus-client)
3. Test individual endpoints manually
4. Check resource constraints

### `/runbooks/sentinel-llm-failures.md`
**Purpose**: Handle LLM service issues
**Steps**:
1. Check Ollama service status
2. Verify SENTINEL_OLLAMA_* environment variables
3. Test Ollama connectivity directly
4. Monitor fallback rate effectiveness
5. Consider LLM service redundancy

## Configuration Validation

Use the following environment variables to tune monitoring thresholds:

```bash
# Sentinel configuration
export SENTINEL_PORT=8000
export SENTINEL_HISTORY_MAX=1000
export SENTINEL_CONTAMINATION=0.1

# Monitoring thresholds
export SENTINEL_MEMORY_WARNING_MB=500
export SENTINEL_MEMORY_CRITICAL_MB=800
export SENTINEL_LATENCY_WARNING_P95=0.1
export SENTINEL_LATENCY_CRITICAL_P95=1.0
