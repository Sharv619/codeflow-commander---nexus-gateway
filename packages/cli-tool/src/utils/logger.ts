// File: src/utils/logger.ts
// Logging utility for Phase 3 implementation
// Temporary implementation - will be enhanced later

interface LogInfo {
  timestamp: string;
  level: string;
  message: string;
}

// Create a simple console logger for now
const formatLog = (info: LogInfo): string => {
  return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
};

const getTimestamp = (): string => {
  return new Date().toISOString();
};

export class Logger {
  public level: 'debug' | 'info' | 'warn' | 'error' = 'info';

  info(message: string, meta?: any): void {
    if (['info', 'warn', 'error'].includes(this.level)) {
      console.log(formatLog({
        timestamp: getTimestamp(),
        level: 'info',
        message: meta ? `${message} ${JSON.stringify(meta)}` : message
      }));
    }
  }

  warn(message: string, meta?: any): void {
    if (['warn', 'error'].includes(this.level)) {
      console.warn(formatLog({
        timestamp: getTimestamp(),
        level: 'warn',
        message: meta ? `${message} ${JSON.stringify(meta)}` : message
      }));
    }
  }

  error(message: string, meta?: any): void {
    console.error(formatLog({
      timestamp: getTimestamp(),
      level: 'error',
      message: meta ? `${message} ${JSON.stringify(meta)}` : message
    }));
  }

  debug(message: string, meta?: any): void {
    if (this.level === 'debug') {
      console.debug(formatLog({
        timestamp: getTimestamp(),
        level: 'debug',
        message: meta ? `${message} ${JSON.stringify(meta)}` : message
      }));
    }
  }

  emergency(message: string, meta?: any): void {
    console.error(formatLog({
      timestamp: getTimestamp(),
      level: 'EMERGENCY',
      message: meta ? `${message} ${JSON.stringify(meta)}` : message
    }));
  }
}

// Export singleton instance
export const defaultLogger = new Logger();
