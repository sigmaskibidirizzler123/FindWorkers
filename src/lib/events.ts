/**
 * Event System - Decoupled event bus for async workflows
 * 
 * Separates "what happened" from "what should happen next".
 * Makes it trivial to add SMS, email, analytics, etc. later.
 * 
 * Usage:
 *   eventBus.emit('application.created', { applicationId, jobId, candidateId });
 *   eventBus.on('application.created', async (payload) => { ... });
 * 
 * Future migration path:
 *   Replace with BullMQ / RabbitMQ / Kafka for distributed processing.
 *   The event names and handler signatures stay the same.
 */

import { automationLogger } from './logger';

// ── Event Types ────────────────

export interface EventMap {
    // Application lifecycle
    'application.created': {
        applicationId: string;
        jobId: string;
        candidateId: string;
        candidateUserId: string;
    };
    'application.status_changed': {
        applicationId: string;
        jobId: string;
        candidateUserId: string;
        previousStatus: string;
        newStatus: string;
        employerUserId: string;
    };
    'application.hired': {
        applicationId: string;
        jobId: string;
        candidateUserId: string;
    };

    // Job lifecycle
    'job.created': {
        jobId: string;
        employerId: string;
        categoryId?: string;
    };
    'job.updated': {
        jobId: string;
        changes: Record<string, unknown>;
    };
    'job.closed': {
        jobId: string;
        reason: 'manual' | 'auto_filled' | 'expired';
    };
    'job.expiring': {
        jobId: string;
        employerUserId: string;
        expiresAt: Date;
    };

    // User lifecycle
    'user.registered': {
        userId: string;
        role: string;
        email: string;
    };
    'user.login': {
        userId: string;
        ip: string;
    };

    // System events
    'automation.cron_run': {
        triggeredBy: string;
        timestamp: Date;
    };
}

// ── Event Bus Implementation ────────────────

type EventHandler<T> = (payload: T) => Promise<void> | void;
type EventName = keyof EventMap;

class EventBus {
    private handlers = new Map<string, EventHandler<unknown>[]>();
    private maxRetries = 2;

    /**
     * Register an event handler
     */
    on<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): void {
        const existing = this.handlers.get(event) || [];
        existing.push(handler as EventHandler<unknown>);
        this.handlers.set(event, existing);

        automationLogger.debug(`Handler registered for event: ${event}`, {
            totalHandlers: existing.length,
        });
    }

    /**
     * Remove a specific handler
     */
    off<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): void {
        const existing = this.handlers.get(event) || [];
        this.handlers.set(
            event,
            existing.filter(h => h !== handler)
        );
    }

    /**
     * Emit an event - all handlers run asynchronously (fire-and-forget)
     * Errors in handlers are logged but don't block the caller
     */
    async emit<E extends EventName>(event: E, payload: EventMap[E]): Promise<void> {
        const handlers = this.handlers.get(event) || [];

        if (handlers.length === 0) {
            automationLogger.debug(`No handlers for event: ${event}`);
            return;
        }

        automationLogger.info(`Event emitted: ${event}`, {
            handlersCount: handlers.length,
            payload: this.sanitizePayload(payload),
        });

        // Run all handlers concurrently (non-blocking)
        const results = await Promise.allSettled(
            handlers.map(async (handler, index) => {
                return this.executeWithRetry(event, handler, payload, index);
            })
        );

        // Log failures
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            automationLogger.error(`${failures.length}/${handlers.length} handlers failed for event: ${event}`, {
                failures: failures.map((f, i) => ({
                    index: i,
                    reason: (f as PromiseRejectedResult).reason?.message || String((f as PromiseRejectedResult).reason),
                })),
            });
        }
    }

    /**
     * Emit with guaranteed execution — waits for all handlers to complete.
     * Use sparingly, only when you must ensure all side-effects finish.
     */
    async emitSync<E extends EventName>(event: E, payload: EventMap[E]): Promise<void> {
        await this.emit(event, payload);
    }

    private async executeWithRetry(
        event: string,
        handler: EventHandler<unknown>,
        payload: unknown,
        handlerIndex: number
    ): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                await handler(payload);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < this.maxRetries) {
                    automationLogger.warn(`Handler retry ${attempt + 1}/${this.maxRetries} for ${event}`, {
                        handlerIndex,
                        error: lastError.message,
                    });
                    // Exponential backoff: 100ms, 200ms
                    await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
                }
            }
        }

        throw lastError;
    }

    private sanitizePayload(payload: unknown): Record<string, unknown> {
        if (typeof payload !== 'object' || payload === null) return {};
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
            // Don't log sensitive fields
            if (['password', 'token', 'secret'].includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    /**
     * Get stats about registered handlers
     */
    stats(): Record<string, number> {
        const stats: Record<string, number> = {};
        for (const [event, handlers] of this.handlers.entries()) {
            stats[event] = handlers.length;
        }
        return stats;
    }
}

// ── Singleton ────────────────

export const eventBus = new EventBus();
export default eventBus;
