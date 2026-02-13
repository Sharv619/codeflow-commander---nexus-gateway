import axios from 'axios';
import chalk from 'chalk';

export class SentinelClient {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }

    async getStatus() {
        try {
            const response = await axios.get(`${this.baseUrl}/health`);
            return response.data;
        } catch (error) {
            return {
                status: 'unreachable',
                error: error.message
            };
        }
    }

    async analyzeFlow(telemetryData) {
        try {
            const response = await axios.post(`${this.baseUrl}/analyze-flow`, telemetryData);
            return response.data;
        } catch (error) {
            throw new Error(`Sentinel analysis failed: ${error.message}`);
        }
    }

    async getMetrics() {
        try {
            const response = await axios.get(`${this.baseUrl}/metrics`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch metrics: ${error.message}`);
        }
    }
}
