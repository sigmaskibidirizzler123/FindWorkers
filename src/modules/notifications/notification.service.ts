/**
 * Notification Module - Service Layer
 * Manages notification lifecycle and delivery
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { notificationLogger } from '@/lib/logger';

export class NotificationService {
    /**
     * Get user notifications
     */
    static async list(request: NextRequest) {
        try {
            const token = request.cookies.get('token')?.value;
            if (!token) return errorResponse('Chưa đăng nhập', 401);

            const payload = verifyToken(token);
            if (!payload) return errorResponse('Token không hợp lệ', 401);

            const { searchParams } = new URL(request.url);
            const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
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
            notificationLogger.error('NotificationService.list error', { error });
            return errorResponse('Đã xảy ra lỗi', 500);
        }
    }

    /**
     * Mark notifications as read
     */
    static async markRead(request: NextRequest) {
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
            notificationLogger.error('NotificationService.markRead error', { error });
            return errorResponse('Đã xảy ra lỗi', 500);
        }
    }
}
