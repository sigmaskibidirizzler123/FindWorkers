/**
 * Admin Users Management API
 * GET  - List all users with filters/pagination
 * PATCH - Update user status (suspend/ban/activate)
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
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
        const status = searchParams.get('status') || '';
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Record<string, unknown> = {};

        if (role && ['CANDIDATE', 'EMPLOYER', 'ADMIN'].includes(role)) {
            where.role = role;
        }

        if (status === 'ACTIVE') {
            where.isActive = true;
        } else if (status === 'SUSPENDED') {
            where.isActive = false;
        } else if (status === 'BANNED') {
            where.isActive = false;
            where.lockedUntil = { not: null };
        }

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { candidateProfile: { fullName: { contains: search, mode: 'insensitive' } } },
                { employerProfile: { businessName: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: where as any,
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    isVerified: true,
                    lastLoginAt: true,
                    lastLoginIP: true,
                    failedLoginAttempts: true,
                    lockedUntil: true,
                    createdAt: true,
                    candidateProfile: {
                        select: {
                            id: true,
                            fullName: true,
                            currentLocation: true,
                            desiredJob: true,
                            _count: { select: { applications: true } },
                        },
                    },
                    employerProfile: {
                        select: {
                            id: true,
                            businessName: true,
                            businessType: true,
                            location: true,
                            _count: { select: { jobs: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where: where as any }),
        ]);

        // Process users to add flags
        const processedUsers = users.map(user => {
            const flags: string[] = [];
            const isBanned = !user.isActive && user.lockedUntil && new Date(user.lockedUntil) > new Date('2099-01-01');
            const isSuspended = !user.isActive && !isBanned;

            let userStatus = 'ACTIVE';
            if (isBanned) userStatus = 'BANNED';
            else if (isSuspended) userStatus = 'SUSPENDED';

            // Flag spam candidates (more than 10 applications)
            if (user.candidateProfile && user.candidateProfile._count.applications > 10) {
                flags.push('HIGH_ACTIVITY');
            }

            // Flag prolific employers
            if (user.employerProfile && user.employerProfile._count.jobs > 20) {
                flags.push('HIGH_ACTIVITY');
            }

            return {
                ...user,
                status: userStatus,
                flags,
                displayName: user.candidateProfile?.fullName
                    || user.employerProfile?.businessName
                    || user.email
                    || user.phone
                    || 'Unknown',
                jobCount: user.employerProfile?._count?.jobs || 0,
                applicationCount: user.candidateProfile?._count?.applications || 0,
            };
        });

        return successResponse({
            users: processedUsers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Admin] List users error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function PATCH(request: NextRequest) {
    let adminPayload;
    try {
        adminPayload = requireAdmin(request);
    } catch {
        return errorResponse('Không có quyền truy cập', 403);
    }

    try {
        const body = await request.json();
        const { userId, action, reason } = body;

        if (!userId || !action) {
            return errorResponse('userId và action là bắt buộc', 400);
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return errorResponse('User không tồn tại', 404);
        if (user.role === 'ADMIN') return errorResponse('Không thể thay đổi trạng thái admin', 400);

        let updateData: Record<string, unknown> = {};

        switch (action) {
            case 'SUSPEND':
                updateData = { isActive: false };
                break;
            case 'BAN':
                updateData = { isActive: false, lockedUntil: new Date('2099-12-31') };
                break;
            case 'ACTIVATE':
                updateData = { isActive: true, lockedUntil: null, failedLoginAttempts: 0 };
                break;
            case 'RESET_PASSWORD':
                const bcrypt = await import('bcryptjs');
                updateData = {
                    password: await bcrypt.hash('123456', 12),
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                };
                break;
            case 'VERIFY':
                updateData = { isVerified: true };
                break;
            case 'UNVERIFY':
                updateData = { isVerified: false };
                break;
            default:
                return errorResponse('Action không hợp lệ', 400);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData as any,
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                userId: adminPayload.userId,
                action: `USER_${action}`,
                entity: 'User',
                entityId: userId,
                metadata: { reason: reason || null, targetRole: user.role },
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
            },
        });

        return successResponse({ message: `User đã được ${action.toLowerCase()} thành công` });
    } catch (error) {
        console.error('[Admin] Update user error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
