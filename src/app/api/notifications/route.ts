/**
 * Notifications API
 * GET - List user notifications
 * PATCH - Mark notifications as read
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload) return errorResponse('Token không hợp lệ', 401);

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const unreadOnly = searchParams.get('unread') === 'true';

        const where: Record<string, unknown> = { userId: payload.userId };
        if (unreadOnly) where.isRead = false;

        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
            prisma.notification.count({
                where: { userId: payload.userId, isRead: false },
            }),
        ]);

        return successResponse({ notifications, unreadCount });
    } catch (error) {
        console.error('Get notifications error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload) return errorResponse('Token không hợp lệ', 401);

        const body = await request.json();
        const { notificationIds, markAllRead } = body;

        if (markAllRead) {
            await prisma.notification.updateMany({
                where: { userId: payload.userId, isRead: false },
                data: { isRead: true },
            });
        } else if (notificationIds?.length) {
            await prisma.notification.updateMany({
                where: {
                    id: { in: notificationIds },
                    userId: payload.userId,
                },
                data: { isRead: true },
            });
        }

        return successResponse({ message: 'Đã cập nhật' });
    } catch (error) {
        console.error('Update notifications error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
