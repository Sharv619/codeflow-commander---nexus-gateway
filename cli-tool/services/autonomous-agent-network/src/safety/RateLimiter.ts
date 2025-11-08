// ------------------------------------------------------------------------------
// Phase 5: Safety Layer - Rate Limiter Implementation
// Prevents agent spam and ensures sustainable operation
// ------------------------------------------------------------------------------
export class RateLimiter {
  private maxActions: number;
  private windowMs: number;
  private actionCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: { maxActions: number; windowMs: number }) {
    this.maxActions = config.maxActions;
    this.windowMs = config.windowMs;
  }

  canTakeAction(key: string = 'default'): boolean {
    const now = Date.now();
    const record = this.actionCounts.get(key);

    // Reset counter if window has expired
    if (!record || now >= record.resetTime) {
      this.actionCounts.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    // Check if we're within limits
    if (record.count >= this.maxActions) {
      return false;
    }

    // Increment counter
    record.count++;
    this.actionCounts.set(key, record);
    return true;
  }

  getRemainingActions(key: string = 'default'): number {
    const record = this.actionCounts.get(key);
    if (!record) return this.maxActions;

    return Math.max(0, this.maxActions - record.count);
  }

  getResetTime(key: string = 'default'): Date | null {
    const record = this.actionCounts.get(key);
    return record ? new Date(record.resetTime) : null;
  }

  reset(key: string = 'default'): void {
    this.actionCounts.delete(key);
  }
}
