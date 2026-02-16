/**
 * Auth Register API - POST /api/auth/register
 * 
 * Supports role-based registration:
 *   - CANDIDATE: phone + password (email optional)
 *   - EMPLOYER: email + password (phone optional)
 * 
 * Body: { role, phone?, email?, password }
 */
import { NextRequest } from 'next/server';
import { AuthService } from '@/modules/auth/auth.service';
import { authLimiter, checkRateLimit } from '@/lib/rate-limiter';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    const rateLimited = checkRateLimit(request, authLimiter);
    if (rateLimited) return rateLimited;

    const timer = apiLogger.requestTimer('POST', '/api/auth/register');
    try {
        const result = await AuthService.register(request);
        timer.end(result.status);
        return result;
    } catch (error) {
        apiLogger.error('POST /api/auth/register failed', { error });
        timer.end(500);
        throw error;
    }
}
