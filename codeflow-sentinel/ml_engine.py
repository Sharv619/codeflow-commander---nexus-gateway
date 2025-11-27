"""
Sentinel ML Engine - Production-grade Anomaly Detection
Uses IsolationForest for unsupervised outlier detection in telemetry data.
"""
from sklearn.ensemble import IsolationForest
import numpy as np
import pandas as pd

class AnomalyDetector:
    """
    Production-grade ML Anomaly Detection Engine
    Uses IsolationForest for unsupervised outlier detection.
    """

    def __init__(self, contamination=0.1, random_state=42):
        self.model = IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_estimators=100
        )
        self.is_trained = False
        self.feature_names = ['latency', 'input_size', 'error_count', 'memory_usage']

    def train(self, data):
        """
        Train the anomaly detection model
        Data shape: [samples, features] where features are telemetry metrics
        """
        if len(data) > 0:
            self.model.fit(data)
            self.is_trained = True
            print(f"Trained IsolationForest on {len(data)} samples")
            return True
        return False

    def predict(self, feature_vector, threshold=-0.5):
        """
        Predict anomaly score for new data point
        Returns: 1 (normal), -1 (anomaly)
        """
        if not self.is_trained:
            return 1  # Default to normal if not trained

        if isinstance(feature_vector, list):
            feature_vector = np.array(feature_vector).reshape(1, -1)

        prediction = self.model.predict(feature_vector)[0]
        score = self.model.score_samples(feature_vector)[0]

        # Use score threshold for more nuanced detection
        if score < threshold:
            return -1  # Anomaly
        return 1      # Normal

    def score(self, feature_vector):
        """
        Get raw anomaly score (lower = more anomalous)
        """
        if not self.is_trained:
            return 0.0

        if isinstance(feature_vector, list):
            feature_vector = np.array(feature_vector).reshape(1, -1)

        return self.model.score_samples(feature_vector)[0]

    def explain_anomaly(self, feature_vector):
        """
        Provide explanation for anomaly detection
        """
        if not isinstance(feature_vector, list):
            feature_vector = feature_vector.tolist()

        explanation = []
        for i, (feature, value) in enumerate(zip(self.feature_names, feature_vector)):
            # Simple threshold-based explanation
            if i == 0 and value > 1000:  # latency
                explanation.append(f"High latency: {value}ms")
            elif i == 2 and value > 5:   # error count
                explanation.append(f"Elevated error rate: {value}")
            elif i == 3 and value > 80:  # memory
                explanation.append(f"High memory usage: {value}%")

        return explanation if explanation else ["No clear anomaly indicators"]
