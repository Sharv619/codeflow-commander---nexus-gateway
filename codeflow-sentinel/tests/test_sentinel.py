#!/usr/bin/env python3
"""
Tests for CodeFlow Sentinel anomaly detection service.
Uses pytest and monkeypatch to test normal/anomaly flows without external dependencies.
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import numpy as np

# Import the FastAPI app and required modules
from sentinel import (
    app,
    telemetry_history,
    anomaly_detector,
    features_window,
    IsolationForest,
    extract_features
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_global_state():
    """Reset global state before each test."""
    global telemetry_history, anomaly_detector, features_window
    telemetry_history.clear()
    features_window.clear()
    import sentinel
    sentinel.anomaly_detector = None
    yield

class TestHealthEndpoint:
    """Test health check endpoint."""

    def test_health_check_basic(self):
        """Test basic health check response."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "history_size" in data
        assert "detector_trained" in data
        assert data["version"] == "1.0.0"

    def test_health_check_with_data(self):
        """Test health check with telemetry data present."""
        # Add some telemetry data
        telemetry_history.append({
            "features": [100, 512, 0],
            "telemetry": {"latency": 100, "input_length": 512, "errors": 0, "route": "/test"},
            "timestamp": datetime.utcnow().isoformat()
        })

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["history_size"] == 1
        assert data["detector_trained"] is False  # Not trained without features_window

class TestTelemetryAnalysis:
    """Test telemetry analysis and anomaly detection."""

    def generate_normal_telemetry(self, count=20):
        """Generate normal telemetry data for training baseline."""
        normal_data = []
        for i in range(count):
            latency = np.random.normal(200, 50)  # Normal latency around 200ms
            input_len = np.random.normal(1000, 200)  # Normal input length
            errors = np.random.randint(0, 2)  # 0-1 errors
            data = {
                "latency": max(0, latency),
                "input_length": max(0, int(input_len)),
                "errors": errors,
                "route": f"/api/test{i}"
            }
            normal_data.append(data)
        return normal_data

    def generate_anomalous_telemetry(self, count=5):
        """Generate anomalous telemetry data for testing detection."""
        anomaly_data = []
        for i in range(count):
            # High latency (100x normal)
            latency = np.random.normal(20000, 5000)
            # Large input (10x normal)
            input_len = np.random.normal(10000, 2000)
            # High errors
            errors = np.random.randint(5, 15)
            data = {
                "latency": max(0, latency),
                "input_length": max(0, int(input_len)),
                "errors": errors,
                "route": f"/api/malicious{i}"
            }
            anomaly_data.append(data)
        return anomaly_data

    @patch('sentinel.explain_async', new_callable=AsyncMock)
    def test_normal_telemetry_flow(self, mock_explain):
        """Test normal telemetry processing."""
        # Generate normal data first to establish baseline
        normal_data = self.generate_normal_telemetry(25)
        features_window.extend([extract_features(d) for d in normal_data])

        # Send normal telemetry
        telemetry = {
            "latency": 180,
            "input_length": 900,
            "errors": 1,
            "route": "/api/normal"
        }

        response = client.post("/analyze-flow", json=telemetry)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "OK"
        # Should not be called for non-anomalous data
        mock_explain.assert_not_called()

    @patch('sentinel.explain_async', new_callable=AsyncMock)
    def test_anomalous_telemetry_detection(self, mock_explain):
        """Test anomaly detection with crafted anomalous data."""
        # Set up LLM explanation mock
        mock_explain.return_value = "High latency detected, potential DoS attempt"

        # Establish baseline with normal data
        normal_data = self.generate_normal_telemetry(20)
        features_window.extend([extract_features(d) for d in normal_data])

        # Send anomalous telemetry (high latency)
        anomalous_telemetry = {
            "latency": 15000,  # Much higher than normal
            "input_length": 20000,  # Much larger than normal
            "errors": 8,  # Much higher than normal
            "route": "/api/suspicious"
        }

        response = client.post("/analyze-flow", json=anomalous_telemetry)
        assert response.status_code == 200
        data = response.json()

        # Should detect anomaly
        assert data["status"] == "THREAT_DETECTED"
        assert data["action"] == "freeze"
        assert "reason" in data
        assert isinstance(data["prediction_score"], (int, float))
        assert isinstance(data["confidence"], (int, float))
        assert 0 <= data["confidence"] <= 1

        # LLM explanation should be called for anomalies
        mock_explain.assert_called_once()

    @patch('sentinel.explain_async', new_callable=AsyncMock)
    def test_llm_explanation_called_for_anomalies_only(self, mock_explain):
        """Ensure LLM explanation is only called for detected anomalies."""
        # Normal data first
        normal_data = self.generate_normal_telemetry(15)
        for telemetry in normal_data:
            response = client.post("/analyze-flow", json=telemetry)
            data = response.json()
            assert data["status"] == "OK"

        # Anomalous data should trigger LLM
        mock_explain.return_value = "Anomalous pattern detected"
        anomaly_telemetry = {
            "latency": 30000,
            "input_length": 50000,
            "errors": 20,
            "route": "/api/very-suspicious"
        }

        response = client.post("/analyze-flow", json=anomaly_telemetry)
        data = response.json()
        assert data["status"] == "THREAT_DETECTED"
        mock_explain.assert_called_once()

    def test_telemetry_validation(self):
        """Test input validation for telemetry data."""
        # Missing required fields
        incomplete_data = {"latency": 100}  # Missing other fields
        response = client.post("/analyze-flow", json=incomplete_data)
        assert response.status_code == 422  # Validation error

        # Invalid data types
        invalid_data = {
            "latency": "not-a-number",
            "input_length": 512,
            "errors": 0,
            "route": "/api/test"
        }
        response = client.post("/analyze-flow", json=invalid_data)
        assert response.status_code == 422

        # Negative values that don't make sense
        negative_data = {
            "latency": -100,  # Negative latency
            "input_length": 512,
            "errors": 0,
            "route": "/api/test"
        }
        response = client.post("/analyze-flow", json=negative_data)
        # This should work since pydantic allows negative floats, but our logic handles it
        assert response.status_code == 200

class TestFeatureExtraction:
    """Test feature extraction logic."""

    def test_extract_features_basic(self):
        """Test basic feature extraction."""
        from sentinel import TelemetryData

        telemetry = TelemetryData(
            latency=250.5,
            input_length=1024,
            errors=2,
            route="/api/test"
        )

        features = extract_features(telemetry)
        expected = [250.5, 1024, 2]
        assert features == expected
        assert all(isinstance(f, float) for f in features)

    def test_extract_features_edge_cases(self):
        """Test feature extraction with edge cases."""
        from sentinel import TelemetryData

        # Zero values
        zero_telemetry = TelemetryData(latency=0, input_length=0, errors=0, route="/test")
        features = extract_features(zero_telemetry)
        assert features == [0, 0, 0]

        # Large values
        large_telemetry = TelemetryData(latency=1e6, input_length=1e7, errors=1000, route="/test")
        features = extract_features(large_telemetry)
        assert features == [1e6, 1e7, 1000]

class TestAsyncExplanation:
    """Test LLM explanation functionality."""

    @patch('httpx.AsyncClient')
    @pytest.mark.asyncio
    async def test_explain_async_success(self, mock_client):
        """Test successful LLM explanation."""
        from sentinel import explain_async

        # Mock successful Ollama response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"response": "Potential DoS attack detected"}

        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_response)
        mock_ctx.__aexit__ = AsyncMock(return_value=None)

        mock_client.return_value = mock_ctx

        result = await explain_async([10000, 5000, 5], {"route": "/api/attack"})
        assert "Potential DoS attack detected" in result

    @patch('httpx.AsyncClient')
    @pytest.mark.asyncio
    async def test_explain_async_fallback(self, mock_client):
        """Test fallback explanation when LLM fails."""
        from sentinel import explain_async

        # Mock failed HTTP request
        mock_client.side_effect = Exception("Ollama unavailable")

        # Should use fallback logic
        result = await explain_async([15000, 20000, 10], {"route": "/api/bad"})
        assert isinstance(result, str)
        assert len(result) > 0
        # Should match rule-based logic for high errors
        assert "High error rate" in result

    def test_explain_async_fallback_scenarios(self):
        """Test various fallback reason scenarios."""
        from sentinel import explain_async
        import asyncio

        async def test_fallback(features, expected_contains):
            result = await explain_async(features, {"route": "/test"})
            assert expected_contains in result

        # High latency fallback
        asyncio.run(test_fallback([6000, 1000, 2], "high latency"))

        # High error fallback
        asyncio.run(test_fallback([200, 1000, 8], "High error rate"))

        # Large input fallback
        asyncio.run(test_fallback([200, 15000, 2], "Excessive input size"))

        # Generic fallback
        asyncio.run(test_fallback([500, 2000, 3], "Unusual combination"))

class TestMetricsEndpoint:
    """Test Prometheus metrics endpoint."""

    def test_metrics_without_prometheus(self):
        """Test metrics endpoint when prometheus_client is not available."""
        # This would normally be tested by mocking the import, but our implementation
        # handles the absent dependency gracefully
        response = client.get("/metrics")
        if response.status_code == 404:
            assert "Prometheus client not available" in response.json()["detail"]
        else:
            # If prometheus is available in test environment
            assert response.status_code == 200
            content = response.text
            assert "sentinel_requests_total" in content or "prometheus" in content

class TestConfiguration:
    """Test configuration and environment variable handling."""

    def test_default_configuration(self):
        """Test that default configuration values are used."""
        import sentinel

        assert sentinel.SENTINEL_PORT == 8000
        assert sentinel.SENTINEL_HISTORY_MAX == 1000
        assert sentinel.SENTINEL_CONTAMINATION == 0.1
        assert sentinel.OLLAMA_MODEL == "llama2"

    @patch.dict('os.environ', {'SENTINEL_PORT': '9000'})
    def test_custom_environment_variables(self):
        """Test that environment variables override defaults."""
        # Reimport to pick up new env vars
        import importlib
        import sentinel
        importlib.reload(sentinel)

        assert sentinel.SENTINEL_PORT == 9000

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
