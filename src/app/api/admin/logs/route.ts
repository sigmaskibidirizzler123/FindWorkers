/**
 * Admin Activity Logs API
 * GET - List activity logs with filters/pagination
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

function requireAdmin(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    if (!token) throw new Error('Unauthorized');
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') throw new Error('Forbidden');
    return payload;
}

export async function GET(request: NextRequest) {
    try {
        requireAdmin(request);
    } catch {
        return errorResponse('Không có quyền truy cập', 403);
    }

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const action = searchParams.get('action') || '';
        const entity = searchParams.get('entity') || '';
        const userId = searchParams.get('userId') || '';
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (action) where.action = { contains: action, mode: 'insensitive' };
        if (entity) where.entity = entity;
        if (userId) where.userId = userId;

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: where as any,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.activityLog.count({ where: where as any }),
        ]);

        // Enrich logs with user info
        const userIds = [...new Set(logs.filter(l => l.userId).map(l => l.userId!))];
        const users = userIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    role: true,
                    candidateProfile: { select: { fullName: true } },
                    employerProfile: { select: { businessName: true } },
                },
            })
            : [];

        const userMap = new Map(users.map(u => [u.id, {
            id: u.id,
            email: u.email,
            phone: u.phone,
            role: u.role,
            displayName: u.candidateProfile?.fullName || u.employerProfile?.businessName || u.email || u.phone || 'Unknown',
        }]));

        const enrichedLogs = logs.map(log => ({
            ...log,
            user: log.userId ? userMap.get(log.userId) || null : null,
        }));

        return successResponse({
            logs: enrichedLogs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Admin] Activity logs error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
