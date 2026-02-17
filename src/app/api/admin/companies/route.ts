/**
 * Admin Companies Management API
 * GET  - List all employers/companies with details
 * PATCH - Approve/reject/suspend/verify companies
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
        const status = searchParams.get('status') || '';
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { role: 'EMPLOYER' as const };

        if (status === 'PENDING') {
            where.isVerified = false;
            where.isActive = true;
        } else if (status === 'APPROVED') {
            where.isVerified = true;
            where.isActive = true;
        } else if (status === 'SUSPENDED') {
            where.isActive = false;
        }

        if (search) {
            where.OR = [
                { employerProfile: { businessName: { contains: search, mode: 'insensitive' } } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [employers, total] = await Promise.all([
            prisma.user.findMany({
                where: where as any,
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    isActive: true,
                    isVerified: true,
                    createdAt: true,
                    lastLoginAt: true,
                    employerProfile: {
                        select: {
                            id: true,
                            businessName: true,
                            businessType: true,
                            location: true,
                            address: true,
                            phone: true,
                            description: true,
                            _count: {
                                select: { jobs: true },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where: where as any }),
        ]);

        // Calculate employer health scores
        const processedEmployers = await Promise.all(
            employers.map(async (emp) => {
                let healthScore = 50; // Base score
                let status = 'PENDING';

                if (!emp.isActive) status = 'SUSPENDED';
                else if (emp.isVerified) status = 'APPROVED';

                if (emp.employerProfile) {
                    const profileId = emp.employerProfile.id;

                    // Get job stats
                    const [activeJobs, totalApplications, hiredCount] = await Promise.all([
                        prisma.job.count({ where: { employerId: profileId, status: 'ACTIVE' } }),
                        prisma.application.count({ where: { job: { employerId: profileId } } }),
                        prisma.application.count({ where: { job: { employerId: profileId }, status: 'HIRED' } }),
                    ]);

                    // Calculate score factors
                    if (emp.isVerified) healthScore += 20;
                    if (activeJobs > 0) healthScore += 10;
                    if (totalApplications > 0 && hiredCount > 0) {
                        const hireRate = hiredCount / totalApplications;
                        healthScore += Math.round(hireRate * 20);
                    }
                    if (emp.lastLoginAt) {
                        const daysSinceLogin = (Date.now() - new Date(emp.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24);
                        if (daysSinceLogin < 7) healthScore += 10;
                    }
                    if (emp.employerProfile.description) healthScore += 5;

                    healthScore = Math.min(100, healthScore);

                    return {
                        ...emp,
                        status,
                        healthScore,
                        activeJobs,
                        totalApplications,
                        hiredCount,
                    };
                }

                return {
                    ...emp,
                    status,
                    healthScore: 0,
                    activeJobs: 0,
                    totalApplications: 0,
                    hiredCount: 0,
                };
            })
        );

        return successResponse({
            employers: processedEmployers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Admin] List companies error:', error);
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

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { employerProfile: true },
        });
        if (!user) return errorResponse('Doanh nghiệp không tồn tại', 404);
        if (user.role !== 'EMPLOYER') return errorResponse('User không phải employer', 400);

        let updateData: Record<string, unknown> = {};

        switch (action) {
            case 'APPROVE':
                updateData = { isVerified: true, isActive: true };
                break;
            case 'REJECT':
                updateData = { isVerified: false };
                break;
            case 'SUSPEND':
                updateData = { isActive: false };
                break;
            case 'ACTIVATE':
                updateData = { isActive: true };
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
                action: `EMPLOYER_${action}`,
                entity: 'Employer',
                entityId: userId,
                metadata: {
                    reason: reason || null,
                    businessName: user.employerProfile?.businessName || 'N/A',
                },
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
            },
        });

        return successResponse({ message: `Doanh nghiệp đã được ${action.toLowerCase()} thành công` });
    } catch (error) {
        console.error('[Admin] Moderate company error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
