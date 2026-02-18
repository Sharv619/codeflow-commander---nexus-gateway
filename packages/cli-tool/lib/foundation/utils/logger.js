// File: src/utils/logger.ts
// Logging utility for Phase 3 implementation
// Temporary implementation - will be enhanced later
// Create a simple console logger for now
const formatLog = (info) => {
    return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
};
const getTimestamp = () => {
    return new Date().toISOString();
};
export class Logger {
    constructor() {
        this.level = 'info';
    }
    info(message, meta) {
        if (['info', 'warn', 'error'].includes(this.level)) {
            console.log(formatLog({
                timestamp: getTimestamp(),
                level: 'info',
                message: meta ? `${message} ${JSON.stringify(meta)}` : message
            }));
        }
    }
    warn(message, meta) {
        if (['warn', 'error'].includes(this.level)) {
            console.warn(formatLog({
                timestamp: getTimestamp(),
                level: 'warn',
                message: meta ? `${message} ${JSON.stringify(meta)}` : message
            }));
        }
    }
    error(message, meta) {
        console.error(formatLog({
            timestamp: getTimestamp(),
            level: 'error',
            message: meta ? `${message} ${JSON.stringify(meta)}` : message
        }));
    }
    debug(message, meta) {
        if (this.level === 'debug') {
            console.debug(formatLog({
                timestamp: getTimestamp(),
                level: 'debug',
                message: meta ? `${message} ${JSON.stringify(meta)}` : message
            }));
        }
    }
    emergency(message, meta) {
        console.error(formatLog({
            timestamp: getTimestamp(),
            level: 'EMERGENCY',
            message: meta ? `${message} ${JSON.stringify(meta)}` : message
        }));
    }
}
// Export singleton instance
export const defaultLogger = new Logger();
