const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface AnalysisResult {
  overallStatus: 'PASS' | 'FAIL';
  summary: string;
  files: {
    fileName: string;
    status: 'PASS' | 'FAIL';
    score: number;
    issues: { line: number; type: string; description: string; link?: string }[];
    suggestions: string[];
  }[];
}

export interface TestResult {
  success: boolean;
  output: string;
  error: string;
}

export interface DevlogEntry {
  eventType: string;
  commitHash: string;
  branch: string;
  score: number | null;
  status: string;
  issues: unknown[];
  provider: string;
  duration: number | null;
}

export interface ResultEntry {
  id: string;
  type: 'analyze' | 'git-hook-analyze' | 'test' | 'devlog';
  timestamp: string;
  data: AnalysisResult | TestResult | DevlogEntry;
}

export interface TrendData {
  period: string;
  totalAnalyses: number;
  totalPass: number;
  totalFail: number;
  passRate: string;
  totalIssuesDetected: number;
  byDay: {
    date: string;
    analyze: number;
    'git-hook-analyze': number;
    test: number;
    pass: number;
    fail: number;
  }[];
  byType: Record<string, { total: number; pass: number; fail: number; issues: number }>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30_000;

class RestDataProvider {
  private baseUrl: string;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  private getCacheKey(endpoint: string, params?: Record<string, string>): string {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return `${endpoint}${query}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  private async fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async fetchResults(limit?: number): Promise<ResultEntry[]> {
    const key = this.getCacheKey('/results', limit ? { limit: String(limit) } : undefined);
    const cached = this.getFromCache<ResultEntry[]>(key);
    if (cached) return cached;

    const endpoint = limit ? `/results?limit=${limit}` : '/results';
    const data = await this.fetchJson<ResultEntry[]>(endpoint);
    this.setCache(key, data);
    return data;
  }

  async fetchResult(id: string): Promise<ResultEntry> {
    const key = this.getCacheKey(`/result/${id}`);
    const cached = this.getFromCache<ResultEntry>(key);
    if (cached) return cached;

    const data = await this.fetchJson<ResultEntry>(`/result/${id}`);
    this.setCache(key, data);
    return data;
  }

  async fetchTrends(days: number = 30): Promise<TrendData> {
    const key = this.getCacheKey('/results/trends', { days: String(days) });
    const cached = this.getFromCache<TrendData>(key);
    if (cached) return cached;

    const data = await this.fetchJson<TrendData>(`/results/trends?days=${days}`);
    this.setCache(key, data);
    return data;
  }

  async runAnalysis(code?: string, diff?: string, commit?: string): Promise<AnalysisResult> {
    const body: Record<string, unknown> = {};
    if (code) body.code = code;
    if (diff) body.diff = diff;
    if (commit) body.commit = commit;

    const data = await this.fetchJson<AnalysisResult>('/analyze', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    this.invalidateCache('/results');
    this.invalidateCache('/results/trends');
    return data;
  }

  async runTests(): Promise<TestResult> {
    const data = await this.fetchJson<TestResult>('/test', {
      method: 'POST',
    });

    this.invalidateCache('/results');
    return data;
  }

  async logDevlog(entry: Omit<DevlogEntry, 'eventType'> & { type?: string }): Promise<void> {
    const body = {
      type: entry.type || 'devlog',
      commitHash: entry.commitHash,
      branch: entry.branch,
      score: entry.score,
      status: entry.status,
      issues: entry.issues,
      provider: entry.provider,
      duration: entry.duration,
    };

    await this.fetchJson('/devlog', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    this.invalidateCache('/results');
    this.invalidateCache('/results/trends');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/results`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const restDataProvider = new RestDataProvider();
export default RestDataProvider;
