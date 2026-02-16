/**
 * API v1 Auth - /api/v1/auth/login
 */

import { NextRequest } from 'next/server';
import { AuthService } from '@/modules/auth/auth.service';
import { apiLogger } from '@/lib/logger';
import { authLimiter, checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
    const rateLimited = checkRateLimit(request, authLimiter);
    if (rateLimited) return rateLimited;

    const timer = apiLogger.requestTimer('POST', '/api/v1/auth/login');
    try {
        const result = await AuthService.login(request);
        timer.end(200);
        return result;
    } catch (error) {
        apiLogger.error('POST /api/v1/auth/login failed', { error });
        timer.end(500);
        throw error;
    }
}
