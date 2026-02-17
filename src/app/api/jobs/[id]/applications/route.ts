/**
 * Job Applications API - Enhanced with automation
 * GET - List applications for a job (employer only)
 * POST - Apply to a job (candidate only) + auto matching score + notification
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { calculateAndStoreMatchingScore, logActivity } from '@/lib/automation';
import { notifyNewApplication } from '@/lib/notifications';
import { webhookService } from '@/lib/webhook';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params;
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status');
        const sort = searchParams.get('sort') || 'newest';

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { employer: true },
        });

        if (!job) return errorResponse('Không tìm thấy tin', 404);
        if (job.employer.userId !== payload.userId) {
            return errorResponse('Không có quyền xem', 403);
        }

        const where: Record<string, unknown> = { jobId };
        if (status) {
            where.status = status;
        }

        // Sort options
        let orderBy: Record<string, string>;
        switch (sort) {
            case 'score':
                orderBy = { matchingScore: 'desc' };
                break;
            case 'oldest':
                orderBy = { appliedAt: 'asc' };
                break;
            default:
                orderBy = { appliedAt: 'desc' };
        }

        const [applications, total] = await Promise.all([
            prisma.application.findMany({
                where,
                include: {
                    candidate: {
                        include: {
                            user: {
                                select: {
                                    email: true,
                                    phone: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                    },
                    screeningAnswers: {
                        include: { question: true },
                    },
                },
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.application.count({ where }),
        ]);

        return paginatedResponse(applications, total, page, limit);
    } catch (error) {
        console.error('Get applications error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params;
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'CANDIDATE') {
            return errorResponse('Chỉ ứng viên mới có thể ứng tuyển', 403);
        }

        const candidate = await prisma.candidateProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!candidate) {
            return errorResponse('Vui lòng tạo hồ sơ trước khi ứng tuyển', 400);
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                employer: {
                    select: {
                        userId: true,
                        businessName: true,
                    },
                },
                screeningQuestions: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });

        if (!job || job.status !== 'ACTIVE') {
            return errorResponse('Tin tuyển dụng không tồn tại hoặc đã đóng', 400);
        }

        const existingApp = await prisma.application.findUnique({
            where: {
                jobId_candidateId: {
                    jobId,
                    candidateId: candidate.id,
                },
            },
        });

        if (existingApp) {
            return errorResponse('Bạn đã ứng tuyển công việc này rồi', 409);
        }

        const body = await request.json().catch(() => ({}));

        // Create application
        const application = await prisma.application.create({
            data: {
                jobId,
                candidateId: candidate.id,
                coverLetter: body.coverLetter || null,
            },
            include: {
                job: {
                    select: {
                        title: true,
                        employer: {
                            select: { businessName: true },
                        },
                    },
                },
            },
        });

        // Save screening answers if provided
        if (body.screeningAnswers && Array.isArray(body.screeningAnswers)) {
            await prisma.screeningAnswer.createMany({
                data: body.screeningAnswers.map((a: { questionId: string; answer: string }) => ({
                    applicationId: application.id,
                    questionId: a.questionId,
                    answer: a.answer,
                })),
            });
        }

        // === AUTOMATION: Calculate matching score ===
        const score = await calculateAndStoreMatchingScore(
            application.id,
            candidate.id,
            jobId
        );

        // === AUTOMATION: Notify employer ===
        await notifyNewApplication(
            job.employer.userId,
            candidate.fullName,
            job.title,
            jobId
        );

        // === AUTOMATION: Log activity ===
        await logActivity(
            'application_created',
            'application',
            application.id,
            { jobId, matchingScore: score },
            payload.userId
        );

        // 🔔 Discord notification for admin — candidate applied
        const discordUrl = process.env.DISCORD_WEBHOOK_URL
            || 'https://discord.com/api/webhooks/1473167290622283882/1qljsLDIUUMmthj4sZu6-CbGvkszIQwfpNtjcJmBK2Gyf6ipZ6CpIJcNpDU23FCw7ES7';

        fetch(discordUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'FindWorkers Bot',
                embeds: [{
                    title: '📋 Ứng Viên Mới Apply!',
                    description: `👤 ${candidate.fullName}\n📞 ${candidate.phone || 'N/A'}\n📌 Vị trí: ${job.title}\n🏢 ${job.employer.businessName}`,
                    color: 3447003,
                    timestamp: new Date().toISOString(),
                    footer: { text: 'FindWorkers Alert System' },
                }],
            }),
        })
            .then(res => console.log('[Discord] Application notify sent! Status:', res.status))
            .catch(err => console.error('[Discord] Application notify failed:', err.message));

        return successResponse({ ...application, matchingScore: score }, 201);
    } catch (error) {
        console.error('Apply error:', error);
        return errorResponse('Đã xảy ra lỗi khi ứng tuyển', 500);
    }
}
