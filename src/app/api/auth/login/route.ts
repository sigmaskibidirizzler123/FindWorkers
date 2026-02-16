/**
 * Auth Login API - POST /api/auth/login
 * 
 * Supports:
 *   - Phone + password (candidates) 
 *   - Email + password (employers, admins)
 * 
 * Body: { email?, phone?, password, role? }
 */
import { NextRequest } from 'next/server';
import { AuthService } from '@/modules/auth/auth.service';
import { authLimiter, checkRateLimit } from '@/lib/rate-limiter';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    const rateLimited = checkRateLimit(request, authLimiter);
    if (rateLimited) return rateLimited;

    const timer = apiLogger.requestTimer('POST', '/api/auth/login');
    try {
        const result = await AuthService.login(request);
        timer.end(result.status);
        return result;
    } catch (error) {
        apiLogger.error('POST /api/auth/login failed', { error });
        timer.end(500);
        throw error;
    }
}
