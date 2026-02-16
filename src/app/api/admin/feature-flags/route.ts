/**
 * Feature Flags API (Admin only)
 * GET - List all feature flags
 * POST - Create/Update feature flag
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { invalidateFlagCache } from '@/lib/feature-flags';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'ADMIN') {
            return errorResponse('Chỉ admin mới có quyền', 403);
        }

        const flags = await prisma.featureFlag.findMany({
            orderBy: { key: 'asc' },
        });

        return successResponse(flags);
    } catch (error) {
        console.error('Get feature flags error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'ADMIN') {
            return errorResponse('Chỉ admin mới có quyền', 403);
        }

        const body = await request.json();
        const { key, name, description, isEnabled } = body;

        if (!key || !name) {
            return errorResponse('Key và tên là bắt buộc', 400);
        }

        const flag = await prisma.featureFlag.upsert({
            where: { key },
            update: { name, description, isEnabled },
            create: { key, name, description, isEnabled: isEnabled ?? false },
        });

        // Invalidate cache after update
        invalidateFlagCache();

        return successResponse(flag);
    } catch (error) {
        console.error('Update feature flag error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
