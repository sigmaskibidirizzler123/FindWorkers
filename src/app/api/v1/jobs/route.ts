/**
 * API v1 Router - Versioned API Entry Point
 * 
 * All API routes are versioned: /api/v1/jobs, /api/v1/auth, etc.
 * Ensures backward compatibility when making breaking changes.
 * 
 * When v2 is needed:
 *   1. Copy /api/v1 → /api/v2
 *   2. Modify v2 freely
 *   3. Keep v1 unchanged (deprecated but functional)
 *   4. Gradually migrate clients to v2
 *   5. Remove v1 after migration period
 * 
 * This file re-exports from the service layer.
 */

import { NextRequest } from 'next/server';
import { JobService } from '@/modules/jobs/job.service';
import { apiLogger } from '@/lib/logger';
import { generalLimiter, checkRateLimit } from '@/lib/rate-limiter';

/**
 * v1 Jobs: GET /api/v1/jobs
 */
export async function GET(request: NextRequest) {
    const rateLimited = checkRateLimit(request, generalLimiter);
    if (rateLimited) return rateLimited;

    const timer = apiLogger.requestTimer('GET', '/api/v1/jobs');
    try {
        const result = await JobService.list(request);
        timer.end(200);
        return result;
    } catch (error) {
        apiLogger.error('GET /api/v1/jobs failed', { error });
        timer.end(500);
        throw error;
    }
}

/**
 * v1 Jobs: POST /api/v1/jobs
 */
export async function POST(request: NextRequest) {
    const rateLimited = checkRateLimit(request, generalLimiter);
    if (rateLimited) return rateLimited;

    const timer = apiLogger.requestTimer('POST', '/api/v1/jobs');
    try {
        const result = await JobService.create(request);
        timer.end(201);
        return result;
    } catch (error) {
        apiLogger.error('POST /api/v1/jobs failed', { error });
        timer.end(500);
        throw error;
    }
}
