/**
 * Centralized Logger - Production-grade structured logging
 * 
 * Replaces all console.log/error with structured JSON logging.
 * Supports: request logging, error tracking, audit trail, slow query warnings.
 * 
 * Usage:
 *   logger.info('User created', { userId: '123' })
 *   logger.error('Payment failed', { orderId: '456', error })
 *   logger.warn('Slow query', { query: 'SELECT...', duration: 2500 })
 *   logger.audit('status_change', { entity: 'application', from: 'APPLIED', to: 'HIRED' })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    service: string;
    context?: Record<string, unknown>;
    requestId?: string;
    userId?: string;
    duration?: number;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

// Log level priority (higher = more severe)
const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
};

// Minimum log level from env (default: 'info' in production, 'debug' in dev)
const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

class Logger {
    private service: string;

    constructor(service = 'findworkers') {
        this.service = service;
    }

    /** Create a child logger with a specific service/module name */
    child(service: string): Logger {
        return new Logger(`${this.service}.${service}`);
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
    }

    private formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: this.service,
        };

        if (meta) {
            // Extract known fields, put rest in context
            const { requestId, userId, duration, error, ...rest } = meta;
            if (requestId) entry.requestId = requestId as string;
            if (userId) entry.userId = userId as string;
            if (duration) entry.duration = duration as number;
            if (error && error instanceof Error) {
                entry.error = {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                };
            } else if (error) {
                entry.error = { name: 'Error', message: String(error) };
            }
            if (Object.keys(rest).length > 0) {
                entry.context = rest;
            }
        }

        return entry;
    }

    private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
        if (!this.shouldLog(level)) return;

        const entry = this.formatEntry(level, message, meta);

        // In production: JSON structured logging (for log aggregation tools)
        // In development: human-readable format
        if (process.env.NODE_ENV === 'production') {
            const output = JSON.stringify(entry);
            if (level === 'error' || level === 'fatal') {
                console.error(output);
            } else if (level === 'warn') {
                console.warn(output);
            } else {
                console.log(output);
            }
        } else {
            const color = {
                debug: '\x1b[90m',  // gray
                info: '\x1b[36m',   // cyan
                warn: '\x1b[33m',   // yellow
                error: '\x1b[31m',  // red
                fatal: '\x1b[35m',  // magenta
            }[level];

            const reset = '\x1b[0m';
            const emoji = { debug: '🔍', info: '📋', warn: '⚠️', error: '❌', fatal: '💀' }[level];

            let line = `${color}${emoji} [${level.toUpperCase()}]${reset} ${message}`;
            if (entry.context) line += ` ${JSON.stringify(entry.context)}`;
            if (entry.error) line += ` | Error: ${entry.error.message}`;
            if (entry.duration) line += ` | ${entry.duration}ms`;

            if (level === 'error' || level === 'fatal') {
                console.error(line);
                if (entry.error?.stack) console.error(entry.error.stack);
            } else if (level === 'warn') {
                console.warn(line);
            } else {
                console.log(line);
            }
        }
    }

    debug(message: string, meta?: Record<string, unknown>) { this.log('debug', message, meta); }
    info(message: string, meta?: Record<string, unknown>) { this.log('info', message, meta); }
    warn(message: string, meta?: Record<string, unknown>) { this.log('warn', message, meta); }
    error(message: string, meta?: Record<string, unknown>) { this.log('error', message, meta); }
    fatal(message: string, meta?: Record<string, unknown>) { this.log('fatal', message, meta); }

    /**
     * Audit log - write important business events 
     * Always logged regardless of log level
     */
    audit(action: string, meta?: Record<string, unknown>) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `[AUDIT] ${action}`,
            service: this.service,
            context: { ...meta, _audit: true },
        };
        console.log(JSON.stringify(entry));
    }

    /**
     * Request logger for API routes
     * Returns a wrapped handler that logs request/response
     */
    requestTimer(method: string, path: string): { end: (status: number) => void } {
        const start = Date.now();
        return {
            end: (status: number) => {
                const duration = Date.now() - start;
                const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
                this.log(level, `${method} ${path} → ${status}`, { duration, status });

                // Warn on slow requests (> 2 seconds)
                if (duration > 2000) {
                    this.warn(`Slow request detected: ${method} ${path}`, { duration, threshold: 2000 });
                }
            },
        };
    }
}

// Singleton + module loggers
export const logger = new Logger();
export const apiLogger = logger.child('api');
export const authLogger = logger.child('auth');
export const automationLogger = logger.child('automation');
export const matchingLogger = logger.child('matching');
export const notificationLogger = logger.child('notifications');

export default logger;
