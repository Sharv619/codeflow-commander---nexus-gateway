#!/usr/bin/env python3
"""
CodeFlow Sentinel - Anomaly Detection Sidecar Service
FastAPI-based service with IsolationForest anomaly detection and optional LLM explainers.
"""

import asyncio
import os
from collections import deque
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
from sklearn.ensemble import IsolationForest
import numpy as np

# Optional imports
try:
    from prometheus_client import Counter, Histogram, Gauge, generate_latest
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables with defaults
SENTINEL_PORT = int(os.getenv("SENTINEL_PORT", "8000"))
SENTINEL_HISTORY_MAX = int(os.getenv("SENTINEL_HISTORY_MAX", "1000"))
SENTINEL_CONTAMINATION = float(os.getenv("SENTINEL_CONTAMINATION", "0.1"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama2")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

app = FastAPI(title="CodeFlow Sentinel", version="1.0.0")

# In-memory bounded history for telemetry data
telemetry_history: deque = deque(maxlen=SENTINEL_HISTORY_MAX)
anomaly_detector: Optional[IsolationForest] = None
features_window: List[List[float]] = []

# Pydantic models
class TelemetryData(BaseModel):
    latency: float
    input_length: int
    errors: int
    route: str
    user_id: Optional[str] = None
    timestamp: Optional[datetime] = None

class AnalysisResponse(BaseModel):
    status: str
    action: Optional[str] = None
    reason: Optional[str] = None
    prediction_score: Optional[float] = None
    confidence: Optional[float] = None

# Prometheus metrics (if available)
if PROMETHEUS_AVAILABLE:
    REQUEST_COUNT = Counter('sentinel_requests_total', 'Total requests', ['endpoint', 'method'])
    ANOMALY_RATE = Gauge('sentinel_anomaly_rate', 'Current anomaly detection rate')
    MEMORY_USAGE = Gauge('sentinel_memory_mb', 'Memory usage in MB')
    LATENCY_HISTOGRAM = Histogram('sentinel_request_duration_seconds', 'Request duration')
    HEALTH_CHECK_FAILS = Counter('sentinel_health_check_fails_total', 'Health check failures')
    LLM_FAILURES = Counter('sentinel_llm_failures_total', 'LLM explainer failures')

async def explain_async(features: List[float], payload: Dict[str, Any]) -> str:
    """
    Async LLM explainer using MCP Ollama server with fallback to rule-based reasons.
    """
    try:
        # Prepare prompt for anomaly explanation
        prompt = f"""Analyze this telemetry data for potential security threats in code execution:
        Latency: {features[0]}ms
        Input Length: {features[1]}
        Errors: {features[2]}
        Route: {payload.get('route', 'unknown')}

        Explain why this might be anomalous or provide a brief reason."""

        # Use MCP Ollama server for explanation
        # Note: In a real implementation, this would import and use the MCP client
        # For now, using direct MCP tool call simulation
        messages = [
            {"role": "user", "content": prompt}
        ]

        # Simulate MCP tool call - in practice, this would be:
        # from mcp_client import call_tool
        # result = await call_tool("github.com/NightTrek/Ollama-mcp", "chat_completion", {
        #     "model": OLLAMA_MODEL,
        #     "messages": messages,
        #     "temperature": 0.7,
        #     "timeout": 5000
        # })

        # For this implementation, using httpx to call the MCP server
        # The MCP server exposes the same API
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{OLLAMA_HOST}/api/chat",  # MCP server exposes OpenAI-compatible API
                json={
                    "model": OLLAMA_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 150,
                    "stream": False
                }
            )
            if response.status_code == 200:
                result = response.json()
                explanation = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if explanation:
                    if PROMETHEUS_AVAILABLE:
                        REQUEST_COUNT.labels(endpoint="llm", method="mcp-ollama").inc()
                    return explanation

    except Exception as e:
        logger.warning(f"MCP Ollama explanation failed: {e}")
        if PROMETHEUS_AVAILABLE:
            LLM_FAILURES.inc()

    # Fallback rule-based explanations
    latency, input_len, errors = features[0], features[1], features[2]
    if latency > 5000:
        return "Unusually high latency detected, possible resource exhaustion or DoS attempt"
    elif errors > 5:
        return "High error rate suggests potential attack or system degradation"
    elif input_len > 10000:
        return "Excessive input size may indicate buffer overflow attempt"
    else:
        return "Unusual combination of telemetry metrics detected"

def update_anomaly_detector() -> None:
    """
    Re-train IsolationForest on current telemetry window.
    """
    global anomaly_detector, features_window

    if len(features_window) < 10:  # Minimum samples for meaningful training
        return

    try:
        features_array = np.array(features_window)
        anomaly_detector = IsolationForest(
            contamination=SENTINEL_CONTAMINATION,
            random_state=42,
            n_estimators=100
        )
        anomaly_detector.fit(features_array)
        logger.info(f"Re-trained anomaly detector on {len(features_window)} samples")
    except Exception as e:
        logger.error(f"Failed to train anomaly detector: {e}")

def extract_features(telemetry: TelemetryData) -> List[float]:
    """
    Extract numerical features from telemetry for anomaly detection.
    """
    return [
        float(telemetry.latency),
        float(telemetry.input_length),
        float(telemetry.errors)
    ]

@app.get("/health")
async def health_check():
    """Health endpoint for load balancers and monitoring."""
    try:
        # Basic health checks
        history_size = len(telemetry_history)
        detector_trained = anomaly_detector is not None

        status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "history_size": history_size,
            "detector_trained": detector_trained,
            "version": "1.0.0"
        }

        if PROMETHEUS_AVAILABLE:
            REQUEST_COUNT.labels(endpoint="health", method="get").inc()

        return status

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        if PROMETHEUS_AVAILABLE:
            HEALTH_CHECK_FAILS.inc()
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.post("/analyze-flow", response_model=AnalysisResponse)
async def analyze_flow(telemetry: TelemetryData):
    """
    Analyze telemetry data for anomalies using IsolationForest.
    """
    if PROMETHEUS_AVAILABLE:
        REQUEST_COUNT.labels(endpoint="analyze-flow", method="post").inc()
        with LATENCY_HISTOGRAM.time():

            # Extract features
            features = extract_features(telemetry)
            features_window.append(features)

            # Add to history (with timestamp if not provided)
            if telemetry.timestamp is None:
                telemetry.timestamp = datetime.utcnow()

            telemetry_history.append({
                "features": features,
                "telemetry": telemetry.dict(),
                "timestamp": telemetry.timestamp.isoformat()
            })

            # Update anomaly detector periodically
            if len(features_window) % 50 == 0:  # Re-train every 50 samples
                update_anomaly_detector()

            # Perform anomaly detection
            if anomaly_detector and len(features_window) >= 10:
                try:
                    prediction_score = anomaly_detector.decision_function([features])[0]
                    prediction = anomaly_detector.predict([features])[0]

                    is_anomaly = prediction == -1  # -1 indicates anomaly

                    if is_anomaly:
                        # Get LLM explanation
                        reason = await explain_async(features, telemetry.dict())

                        # Update Prometheus metrics
                        if PROMETHEUS_AVAILABLE:
                            ANOMALY_RATE.set(1.0)

                        return AnalysisResponse(
                            status="THREAT_DETECTED",
                            action="freeze",  # Recommended action: freeze execution
                            reason=reason,
                            prediction_score=-prediction_score,  # Convert to positive anomaly score
                            confidence=min(abs(prediction_score) * 10, 1.0)  # Scale confidence
                        )

                except Exception as e:
                    logger.error(f"Anomaly detection failed: {e}")
                    # Continue with OK response on detector errors

            # Normal response
            if PROMETHEUS_AVAILABLE:
                ANOMALY_RATE.set(0.0)

            return AnalysisResponse(status="OK")

@app.get("/metrics")
async def metrics():
    """
    Prometheus metrics endpoint.
    """
    if not PROMETHEUS_AVAILABLE:
        raise HTTPException(status_code=404, detail="Prometheus client not available")

    try:
        # Update memory metric
        import psutil
        memory_mb = psutil.Process().memory_info().rss / 1024 / 1024
        MEMORY_USAGE.set(memory_mb)

        return generate_latest()

    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        raise HTTPException(status_code=500, detail="Metrics collection failed")

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting CodeFlow Sentinel on port {SENTINEL_PORT}")
    uvicorn.run(
        app,
        host="127.0.0.1",  # Bind to localhost for security
        port=SENTINEL_PORT,
        log_level="info"
    )
