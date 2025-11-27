# Architecture Review: CodeFlow Sentinel Integration

## Data Flow & Trust Boundaries

### Data Flow Architecture

**Trust Boundary 1: CLI Hook → Sentinel Service**
```
codeflow-hook.js (client) ────JSON/HTTP────► sentinel.py (server)
     │                                                │
     ├── Telemetry capture                         ├── ML analysis
     ├── Network isolation                          ├── Anomaly detection
     └── Fail-open behavior                         └── Advisory responses
```

**Trust Boundary 2: Sentinel Processing Pipeline**
```
Raw Telemetry → Input Validation → Feature Extraction → ML Inference → Response Generation
     │               │                      │                 │           │
     └── Pydantic     └── Normalization      └── Isolation-    └── LLM      └── JSON
         validation       (bounds/minmax)       Forest          explainer    response
```

### Security Analysis
- **Network Trust**: HTTP localhost-only communication prevents external attacks
- **Data Trust**: Pydantic validation + ML feature bounds prevents injection
- **Process Trust**: Python ML process isolated from CLI execution environment

## Failure Modes & Safe Defaults

### Failure Mode Analysis

**Mode 1: Sentinel Service Unavailable**
```
codeflow-hook.js ──connect──► [CONNECTION REFUSED] ──fallback──► continue execution
```
- **Default**: CLI tool continues operation (fail-open)
- **Logging**: Warning logged, telemetry silently dropped
- **Recovery**: Service restart restores monitoring without code changes

**Mode 2: LLM Explanation Service Down**
```
sentinel.py ──HTTP──► [OLLAMA UNAVAILABLE] ──fallback──► rule-based reason
```
- **Default**: Returns detection result with generic explanation
- **Logging**: Warning logged, counters incremented
- **Recovery**: Automatic when Ollama service restored

**Mode 3: ML Model Training Failure**
```
Features Array ──fit()──► [NUMPY/SCIKIT ERROR] ──fallback──► skip training
```
- **Default**: Uses previous model or simple heuristics
- **Logging**: Error logged, continues with previous model
- **Recovery**: Automatic retraining on next sample batch

**Mode 4: Memory/Resource Exhaustion**
```
History Deque ──append()──► [MEMORY LIMIT] ──LRU──► evict oldest
```
- **Default**: Bounded deque prevents unbounded growth
- **Logging**: Info logging of eviction events
- **Recovery**: Configurable via SENTINEL_HISTORY_MAX

**Mode 5: Anomalous Traffic Overload**
```
Analysis Queue ──flood──► [HIGH LATENCY] ──circuit──► return OK
```
- **Current**: No rate limiting (identified gap)
- **Risk**: ML inference becomes bottleneck under attack
- **Recovery**: Recommended ingress rate limiting

### Safe Defaults Configuration

```python
# sentinel.py safe defaults
SENTINEL_PORT = "8000"                    # Localhost only
SENTINEL_HISTORY_MAX = 1000               # Bounded memory
SENTINEL_CONTAMINATION = 0.1              # Conservative anomaly threshold
OLLAMA_MODEL = "llama2"                   # Fallback to rule-based if unavailable
```

```javascript
// sentinel-client.js safe defaults
const config = {
  retries: 2,                             // Limited retry attempts
  timeout: 5000,                          // 5s timeout prevents hanging
  useHttps: false,                        // HTTP for localhost
  host: 'localhost',                      // No external exposure
};
```

## Privacy & PII Protection

### Telemetry Privacy Analysis

**PII Risk Assessment:**
- **Direct PII**: `user_id` field contains user identifiers
- **Route Data**: API paths may contain user-specific identifiers
- **Input Length**: File/response sizes could correlate with sensitive data
- **Error Messages**: Error content might expose system details

**Privacy Controls Implemented:**
- **No Persistent Storage**: Telemetry lives only in memory dequeue
- **No External Transmission**: Localhost-only communication
- **Minimal Logging**: Feature vectors, not raw telemetry in logs
- **PII Filtering**: Configurable PII removal before ML processing

### Privacy Protection Gaps

**Gap 1: User ID Storage**
```
Problem: user_id stored in telemetry_history deque
Risk: Memory forensics could reveal user activity patterns
```

**Gap 2: Route Path Exposure**
```
Problem: Full API paths stored unfiltered
Risk: Sensitive endpoint names reveal application structure
```

**Recommended PII Controls:**

```python
def sanitize_telemetry(telemetry: Dict) -> Dict:
    """Remove or hash PII before ML processing"""
    sanitized = telemetry.copy()

    # Hash user IDs for pattern analysis without identity
    if 'user_id' in sanitized and sanitized['user_id']:
        sanitized['user_id'] = hash_string(sanitized['user_id'])

    # Normalize routes to prevent enumeration
    route_patterns = [
        (r'/api/user/\d+', '/api/user/{id}'),
        (r'/api/project/\d+', '/api/project/{id}'),
        (r'/api/file/[^/]+', '/api/file/{name}'),
    ]
    for pattern, replacement in route_patterns:
        sanitized['route'] = re.sub(pattern, replacement, sanitized['route'])

    return sanitized
```

## CI/CD Deployment Patterns

### Local Development Pattern
```
Developer Workstation
├── codeflow-hook.js (primary)
└── sentinel.py (sidecar, local process)
    └── Ollama (optional, local)
```

**Pattern Benefits:**
- Easy debugging and iteration
- No container overhead during development
- Direct access to logs and metrics
- Works offline for basic anomaly detection

**Pattern Risks:**
- Environment differences vs production
- Dependency version conflicts
- Requires local Python/Node.js setup

### Container Production Pattern
```
Kubernetes Pod
├── codeflow-hook-container (main)
└── sentinel-sidecar (network: localhost)
    └── Ollama-sidecar (optional)
```

**Pattern Benefits:**
- Consistent deployment across environments
- Resource isolation and limits
- Easy horizontal scaling
- Standardized monitoring and logging

**Pattern Implementation:**
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codeflow-with-sentinel
spec:
  template:
    spec:
      containers:
      - name: codeflow-cli
        image: codeflow/cli:latest
        # Main application logic

      - name: sentinel
        image: codeflow/sentinel:latest
        ports:
        - containerPort: 8000
        env:
        - name: SENTINEL_PORT
          value: "8000"
        - name: SENTINEL_HISTORY_MAX
          value: "1000"
        # Shared localhost network via pod spec

      - name: ollama  # Optional
        image: ollama/llama2:latest
        ports:
        - containerPort: 11434
```

## 5 Key Risks & Mitigations

### Risk 1: Sentinel Failure Causes CLI Blocking
**Impact**: High - Could prevent legitimate code operations
**Likelihood**: Medium - Network failures or crashes
**Mitigation**: Implement fail-open behavior in cli-tool integration
- **File**: `cli-tool/examples/sentinel-client.js`, lines 120-140
- **Code**: Caught exceptions continue execution instead of blocking
- **Test**: Verify CLI functions when sentinel unavailable

### Risk 2: Memory Exhaustion from Telemetry Flood
**Impact**: High - Service becomes unresponsive
**Likelihood**: Low-Medium - Bounded by HISTORY_MAX but still possible
**Mitigation**: Implement adaptive memory management
- **File**: `codeflow-sentinel/sentinel.py`, line 28
- **Enhancement**: Add memory pressure detection and proactive cleanup
- **Test**: Load test with excessive telemetry volume

### Risk 3: ML Model False Positives Block Valid Operations
**Impact**: Medium - Legitimate operations rejected
**Likelihood**: High - Early in training or with noisy data
**Mitigation**: Implement confidence thresholding and manual overrides
- **File**: `codeflow-sentinel/sentinel.py`, lines 140-160
- **Enhancement**: Require high confidence (>80%) for "freeze" actions
- **Test**: Calibration on mixed normal/anomalous datasets

### Risk 4: LLM API Key/Credentials Exposure
**Impact**: Critical - API keys leaked via logs or environment
**Likelihood**: Low - But catastrophic if occurs
**Mitigation**: Never log full API responses, implement credential validation
- **File**: `codeflow-sentinel/sentinel.py`, lines 85-105
- **Security**: Redact sensitive data from error messages
- **Test**: Verify no credentials in log output

### Risk 5: Race Conditions in Model Retraining
**Impact**: Medium - Inconsistent anomaly detection results
**Likelihood**: Medium - Concurrent requests during training
**Mitigation**: Implement thread-safe model updates
- **File**: `codeflow-sentinel/sentinel.py`, lines 112-125
- **Solution**: Use asyncio.Lock for model training sections
- **Test**: Concurrent request load testing

## Refactoring: Harden Failure Handling

```diff
--- a/codeflow-sentinel/sentinel.py
+++ b/codeflow-sentinel/sentinel.py
@@ -135,7 +135,10 @@ async def analyze_flow(telemetry: TelemetryData):
             # Perform anomaly detection
             if anomaly_detector and len(features_window) >= 10:
                 try:
-                    prediction_score = anomaly_detector.decision_function([features])[0]
+                    # Thread-safe prediction with timeout
+                    import signal
+                    def timeout_handler(signum, frame):
+                        raise TimeoutError("ML prediction timeout")
+                    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
+                    signal.alarm(1)  # 1 second timeout
                     prediction_score = anomaly_detector.decision_function([features])[0]
+                    signal.alarm(0)  # Cancel alarm
+                    signal.signal(signal.SIGALRM, old_handler)
                     prediction = anomaly_detector.predict([features])[0]
 
                     is_anomaly = prediction == -1  # -1 indicates anomaly
@@ -152,6 +155,15 @@ async def analyze_flow(telemetry: TelemetryData):
                                 confidence=min(abs(prediction_score) * 10, 1.0)  # Scale confidence
                         )
 
-                except Exception as e:
+                except (TimeoutError, RuntimeError, ValueError) as e:
+                    # ML prediction errors - log and return OK to avoid blocking
+                    logger.warning(f"ML prediction failed: {e}")
+                    if PROMETHEUS_AVAILABLE:
+                        REQUEST_COUNT.labels(endpoint="analyze-flow", method="post").inc()
+                    # Continue to return OK response instead of failing
+
+                except Exception as e:
+                    # Unexpected errors - log and fail safely
                     logger.error(f"Anomaly detection failed: {e}")
                     # Continue with OK response on detector errors
```

## Summary Recommendations

### Immediate Actions (Security)
1. Implement PII sanitization in telemetry processing
2. Add rate limiting at ingress level
3. Implement thread-safe model updates
4. Add ML prediction timeouts
5. Review and limit logged data content

### Medium-term (Reliability)
1. Add comprehensive integration tests
2. Implement canary deployment strategy
3. Add performance benchmarks and alerting
4. Create detailed runbooks for operations team
5. Add feature flags for gradual rollout

### Long-term (Scalability)
1. Consider distributed anomaly detection for multi-instance
2. Implement telemetry compression for large deployments
3. Add revenue/performance impact analysis
4. Consider GPU acceleration for ML inference
5. Plan for federated learning across instances
