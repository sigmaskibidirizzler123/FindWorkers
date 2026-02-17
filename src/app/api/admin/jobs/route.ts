/**
 * Admin Jobs Moderation API
 * GET  - List all jobs with filters/pagination
 * PATCH - Moderate jobs (approve/reject/close/flag/tag)
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

const SENSITIVE_KEYWORDS = ['lừa đảo', 'đa cấp', 'mlm', 'cam', 'xxx', 'cá độ', 'đánh bạc', 'casino online'];

function requireAdmin(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    if (!token) throw new Error('Unauthorized');
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') throw new Error('Forbidden');
    return payload;
}

function autoFlagCheck(job: { salaryMax?: number | null; location?: string; description?: string; title?: string }) {
    const flags: string[] = [];

    // Salary > 100 million
    if (job.salaryMax && job.salaryMax > 100000000) {
        flags.push('HIGH_SALARY');
    }

    // No location
    if (!job.location || job.location.trim() === '') {
        flags.push('NO_LOCATION');
    }

    // Sensitive keywords
    const contentToCheck = `${job.title} ${job.description}`.toLowerCase();
    for (const keyword of SENSITIVE_KEYWORDS) {
        if (contentToCheck.includes(keyword)) {
            flags.push('SENSITIVE_CONTENT');
            break;
        }
    }

    return flags;
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
        const flagged = searchParams.get('flagged') === 'true';
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};

        if (status && ['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED'].includes(status)) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { employer: { businessName: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where: where as any,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    salaryMin: true,
                    salaryMax: true,
                    salaryNegotiable: true,
                    location: true,
                    jobType: true,
                    status: true,
                    isUrgent: true,
                    isFeatured: true,
                    viewCount: true,
                    positions: true,
                    hiredCount: true,
                    createdAt: true,
                    updatedAt: true,
                    expiresAt: true,
                    employer: {
                        select: {
                            id: true,
                            businessName: true,
                            businessType: true,
                            location: true,
                            user: {
                                select: { isVerified: true },
                            },
                        },
                    },
                    category: {
                        select: { id: true, name: true },
                    },
                    _count: {
                        select: { applications: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.job.count({ where: where as any }),
        ]);

        // Process jobs - add auto-flag info
        const processedJobs = jobs.map(job => {
            const autoFlags = autoFlagCheck(job);
            return {
                ...job,
                autoFlags,
                isFlagged: autoFlags.length > 0,
                applicationCount: job._count.applications,
                isEmployerVerified: job.employer?.user?.isVerified || false,
            };
        });

        // Filter flagged if requested
        const finalJobs = flagged
            ? processedJobs.filter(j => j.isFlagged)
            : processedJobs;

        return successResponse({
            jobs: finalJobs,
            pagination: {
                total: flagged ? finalJobs.length : total,
                page,
                limit,
                totalPages: Math.ceil((flagged ? finalJobs.length : total) / limit),
            },
        });
    } catch (error) {
        console.error('[Admin] List jobs error:', error);
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
        const { jobId, action, reason, tag } = body;

        if (!jobId || !action) {
            return errorResponse('jobId và action là bắt buộc', 400);
        }

        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) return errorResponse('Job không tồn tại', 404);

        let updateData: Record<string, unknown> = {};

        switch (action) {
            case 'APPROVE':
                updateData = { status: 'ACTIVE' };
                break;
            case 'REJECT':
                updateData = { status: 'CLOSED' };
                break;
            case 'CLOSE':
                updateData = { status: 'CLOSED' };
                break;
            case 'REOPEN':
                updateData = { status: 'ACTIVE' };
                break;
            case 'TOGGLE_URGENT':
                updateData = { isUrgent: !job.isUrgent };
                break;
            case 'TOGGLE_FEATURED':
                updateData = { isFeatured: !job.isFeatured };
                break;
            default:
                return errorResponse('Action không hợp lệ', 400);
        }

        await prisma.job.update({
            where: { id: jobId },
            data: updateData as any,
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                userId: adminPayload.userId,
                action: `JOB_${action}`,
                entity: 'Job',
                entityId: jobId,
                metadata: { reason: reason || null, tag: tag || null, jobTitle: job.title },
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
            },
        });

        return successResponse({ message: `Job đã được ${action.toLowerCase()} thành công` });
    } catch (error) {
        console.error('[Admin] Moderate job error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
