// ------------------------------------------------------------------------------
// Phase 5: Safety Layer - Circuit Breaker Implementation
// Prevents cascade failures and allows graceful degradation
// ------------------------------------------------------------------------------
export class CircuitBreaker {
  private failureThreshold: number;
  private recoveryTimeout: number;
  private failureCount: number;
  private lastFailureTime: Date | null;
  private nextRetryTime: Date | null;
  private state: 'closed' | 'open' | 'half-open';

  constructor(config: { failureThreshold: number; recoveryTimeout: number }) {
    this.failureThreshold = config.failureThreshold;
    this.recoveryTimeout = config.recoveryTimeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextRetryTime = null;
    this.state = 'closed';
  }

  get isOpen(): boolean {
    return this.state === 'open';
  }

  get isClosed(): boolean {
    return this.state === 'closed';
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.failureCount = 0;
      this.state = 'closed';
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'half-open') {
      // If still failing in half-open state, go back to open
      this.state = 'open';
      this.nextRetryTime = new Date(Date.now() + this.recoveryTimeout);
    } else if (this.state === 'closed' && this.failureCount >= this.failureThreshold) {
      // Opened the circuit
      this.state = 'open';
      this.nextRetryTime = new Date(Date.now() + this.recoveryTimeout);
    }
  }

  canAttempt(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      // Check if recovery timeout has passed
      if (this.nextRetryTime && Date.now() >= this.nextRetryTime.getTime()) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }

    // Half-open state always allows one attempt
    return true;
  }

  close(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextRetryTime = null;
  }
}
