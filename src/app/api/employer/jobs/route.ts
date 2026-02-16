import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/employer/jobs — List all jobs for the authenticated employer
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền truy cập', 403);
        }

        const employer = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!employer) {
            return errorResponse('Hồ sơ nhà tuyển dụng không tồn tại', 404);
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const where: Record<string, unknown> = {
            employerId: employer.id,
        };

        if (status && ['DRAFT', 'ACTIVE', 'CLOSED', 'PENDING', 'FEATURED'].includes(status)) {
            where.status = status;
        }

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    category: {
                        select: { name: true, slug: true },
                    },
                    _count: {
                        select: { applications: true },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.job.count({ where }),
        ]);

        // Calculate summary stats
        const allJobs = await prisma.job.groupBy({
            by: ['status'],
            where: { employerId: employer.id },
            _count: { _all: true },
        });

        const summary = {
            total: 0,
            active: 0,
            closed: 0,
            draft: 0,
        };

        allJobs.forEach(g => {
            summary.total += g._count._all;
            if (g.status === 'ACTIVE' || g.status === 'FEATURED') summary.active += g._count._all;
            else if (g.status === 'CLOSED') summary.closed += g._count._all;
            else if (g.status === 'DRAFT') summary.draft += g._count._all;
        });

        return successResponse({
            jobs,
            summary,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get employer jobs error:', error);
        return errorResponse('Đã xảy ra lỗi khi tải danh sách tin', 500);
    }
}
