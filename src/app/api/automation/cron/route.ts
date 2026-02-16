/**
 * Automation Cron API - Enhanced Security
 * POST - Trigger scheduled automation tasks
 * 
 * Security layers:
 *   1. Bearer token (CRON_SECRET)
 *   2. Rate limiting (5 req/min)
 *   3. Request logging
 */
import { NextRequest } from 'next/server';
import { runScheduledTasks } from '@/lib/automation';
import { successResponse, errorResponse } from '@/lib/api-response';
import { cronLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limiter';
import { automationLogger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'findworkers-cron-secret';

export async function POST(request: NextRequest) {
    // 1. Rate limit
    const rateLimited = checkRateLimit(request, cronLimiter);
    if (rateLimited) return rateLimited;

    const ip = getClientIP(request);

    try {
        // 2. Verify cron secret
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            automationLogger.warn('Cron unauthorized access attempt', { ip });
            return errorResponse('Unauthorized', 401);
        }

        automationLogger.info('Cron triggered', { ip, triggeredBy: 'api' });

        const startTime = Date.now();
        await runScheduledTasks();
        const duration = Date.now() - startTime;

        automationLogger.info('Cron completed', { ip, duration });

        return successResponse({
            message: 'Automation tasks completed',
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
        });
    } catch (error) {
        automationLogger.error('Cron failed', { ip, error });
        return errorResponse('Automation tasks failed', 500);
    }
}
