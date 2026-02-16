/**
 * Rate Limiter - In-memory sliding window
 * 
 * Protects API endpoints from abuse. In production, replace with
 * Redis-based (e.g., @upstash/ratelimit) for multi-instance support.
 * 
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60000, max: 30 });
 *   const result = limiter.check(clientIP);
 *   if (!result.allowed) return errorResponse('Too many requests', 429);
 */

import { NextRequest } from 'next/server';
import { errorResponse } from './api-response';
import { apiLogger } from './logger';

interface RateLimitConfig {
    /** Time window in milliseconds */
    windowMs: number;
    /** Maximum requests per window */
    max: number;
    /** Label for logging */
    label?: string;
}

interface RequestRecord {
    timestamps: number[];
    blockedUntil?: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

class RateLimiter {
    private config: Required<RateLimitConfig>;
    private store = new Map<string, RequestRecord>();
    private cleanupInterval: ReturnType<typeof setInterval>;

    constructor(config: RateLimitConfig) {
        this.config = {
            label: 'default',
            ...config,
        };

        // Cleanup expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);

        // Prevent Node from keeping process alive just for cleanup
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }

    /**
     * Check if a request is allowed
     */
    check(identifier: string): RateLimitResult {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        let record = this.store.get(identifier);
        if (!record) {
            record = { timestamps: [] };
            this.store.set(identifier, record);
        }

        // Check if currently blocked
        if (record.blockedUntil && now < record.blockedUntil) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: record.blockedUntil,
            };
        }

        // Clean old timestamps
        record.timestamps = record.timestamps.filter(t => t > windowStart);

        // Check limit
        if (record.timestamps.length >= this.config.max) {
            // Block for the remaining window time
            record.blockedUntil = now + this.config.windowMs;

            apiLogger.warn(`Rate limit exceeded: [${this.config.label}]`, {
                identifier: identifier.substring(0, 20),
                requests: record.timestamps.length,
                limit: this.config.max,
                window: `${this.config.windowMs / 1000}s`,
            });

            return {
                allowed: false,
                remaining: 0,
                resetAt: record.blockedUntil,
            };
        }

        // Allow request
        record.timestamps.push(now);
        return {
            allowed: true,
            remaining: this.config.max - record.timestamps.length,
            resetAt: now + this.config.windowMs,
        };
    }

    private cleanup() {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        for (const [key, record] of this.store.entries()) {
            record.timestamps = record.timestamps.filter(t => t > windowStart);
            if (record.timestamps.length === 0 && (!record.blockedUntil || now > record.blockedUntil)) {
                this.store.delete(key);
            }
        }
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}

// ── Pre-built limiters for different endpoint types ────────────────

/** General API: 60 requests per minute */
export const generalLimiter = new RateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    label: 'general',
});

/** Auth endpoints (login/register): 10 per minute (brute-force protection) */
export const authLimiter = new RateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    label: 'auth',
});

/** Cron/automation: 5 per minute */
export const cronLimiter = new RateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    label: 'cron',
});

/** Notifications: 30 per minute (polling protection) */
export const notificationLimiter = new RateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    label: 'notifications',
});

/** File upload: 10 per minute */
export const uploadLimiter = new RateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    label: 'upload',
});

// ── Helper: extract client IP ────────────────

export function getClientIP(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||   // Cloudflare
        '127.0.0.1'
    );
}

// ── Helper: apply rate limit to an API route ────────────────

/**
 * Check rate limit and return error response if exceeded
 * Returns null if allowed, or a 429 Response if rate limited
 */
export function checkRateLimit(
    request: NextRequest,
    limiter: RateLimiter = generalLimiter
): Response | null {
    const ip = getClientIP(request);
    const result = limiter.check(ip);

    if (!result.allowed) {
        return errorResponse(
            `Quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil((result.resetAt - Date.now()) / 1000)} giây.`,
            429
        ) as unknown as Response;
    }

    return null;
}

export { RateLimiter, createRateLimiter };

function createRateLimiter(config: RateLimitConfig) {
    return new RateLimiter(config);
}
