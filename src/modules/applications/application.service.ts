/**
 * Applications Module - Service Layer
 * 
 * Handles job applications lifecycle with event-driven automation.
 * 
 * Event flow:
 *   Apply → application.created → [matching score, notification, analytics]
 *   Status change → application.status_changed → [notification, analytics]
 *   Hired → application.hired → [auto-close check, notification, analytics]
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { apiLogger } from '@/lib/logger';
import { eventBus } from '@/lib/events';

export class ApplicationService {
    /**
     * List applications for a job (employer only)
     */
    static async listForJob(request: NextRequest, jobId: string) {
        try {
            const token = request.cookies.get('token')?.value;
            if (!token) return errorResponse('Chưa đăng nhập', 401);

            const payload = verifyToken(token);
            if (!payload || payload.role !== 'EMPLOYER') {
                return errorResponse('Không có quyền', 403);
            }

            const { searchParams } = new URL(request.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
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
            if (status) where.status = status;

            let orderBy: Record<string, string>;
            switch (sort) {
                case 'score': orderBy = { matchingScore: 'desc' }; break;
                case 'oldest': orderBy = { appliedAt: 'asc' }; break;
                default: orderBy = { appliedAt: 'desc' };
            }

            const [applications, total] = await Promise.all([
                prisma.application.findMany({
                    where,
                    include: {
                        candidate: {
                            include: {
                                user: { select: { email: true, phone: true, avatarUrl: true } },
                                skills: { include: { skill: true } },
                            },
                        },
                        screeningAnswers: { include: { question: true } },
                    },
                    orderBy,
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.application.count({ where }),
            ]);

            return paginatedResponse(applications, total, page, limit);
        } catch (error) {
            apiLogger.error('ApplicationService.listForJob error', { error, jobId });
            return errorResponse('Đã xảy ra lỗi', 500);
        }
    }

    /**
     * Apply to a job (candidate only), triggers event-driven automation
     */
    static async apply(request: NextRequest, jobId: string) {
        try {
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
                    employer: { select: { userId: true, companyName: true } },
                    screeningQuestions: { orderBy: { sortOrder: 'asc' } },
                },
            });

            if (!job || job.status !== 'ACTIVE') {
                return errorResponse('Tin tuyển dụng không tồn tại hoặc đã đóng', 400);
            }

            const existingApp = await prisma.application.findUnique({
                where: { jobId_candidateId: { jobId, candidateId: candidate.id } },
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
                            employer: { select: { companyName: true } },
                        },
                    },
                },
            });

            // Save screening answers
            if (body.screeningAnswers && Array.isArray(body.screeningAnswers)) {
                await prisma.screeningAnswer.createMany({
                    data: body.screeningAnswers.map((a: { questionId: string; answer: string }) => ({
                        applicationId: application.id,
                        questionId: a.questionId,
                        answer: a.answer,
                    })),
                });
            }

            // === EMIT EVENT (replaces synchronous automation calls) ===
            // All side-effects (matching score, notifications, activity log) 
            // are now handled by event handlers asynchronously
            await eventBus.emit('application.created', {
                applicationId: application.id,
                jobId,
                candidateId: candidate.id,
                candidateUserId: payload.userId,
            });

            apiLogger.info('Application created', {
                applicationId: application.id,
                jobId,
                candidateId: candidate.id,
            });

            return successResponse(application, 201);
        } catch (error) {
            apiLogger.error('ApplicationService.apply error', { error, jobId });
            return errorResponse('Đã xảy ra lỗi khi ứng tuyển', 500);
        }
    }

    /**
     * Update application status (employer only), triggers events
     */
    static async updateStatus(
        request: NextRequest,
        jobId: string,
        applicationId: string
    ) {
        try {
            const token = request.cookies.get('token')?.value;
            if (!token) return errorResponse('Chưa đăng nhập', 401);

            const payload = verifyToken(token);
            if (!payload || payload.role !== 'EMPLOYER') {
                return errorResponse('Không có quyền', 403);
            }

            const job = await prisma.job.findUnique({
                where: { id: jobId },
                include: { employer: { select: { userId: true, companyName: true } } },
            });

            if (!job || job.employer.userId !== payload.userId) {
                return errorResponse('Không có quyền', 403);
            }

            const body = await request.json();
            const { status, note, interviewDate, interviewNote } = body;

            const validStatuses = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'HIRED'];
            if (!validStatuses.includes(status)) {
                return errorResponse('Trạng thái không hợp lệ', 400);
            }

            // Get current application for previous status
            const currentApp = await prisma.application.findUnique({
                where: { id: applicationId },
                select: { status: true },
            });

            // Build update data
            const updateData: Record<string, unknown> = { status };
            if (note !== undefined) updateData.note = note;
            if (status !== 'APPLIED') updateData.reviewedAt = new Date();
            if (status === 'INTERVIEW' && interviewDate) {
                updateData.interviewDate = new Date(interviewDate);
                if (interviewNote) updateData.interviewNote = interviewNote;
            }

            const application = await prisma.application.update({
                where: { id: applicationId },
                data: updateData,
                include: {
                    candidate: {
                        include: {
                            user: { select: { id: true, email: true, phone: true } },
                        },
                    },
                },
            });

            // === EMIT EVENT ===
            await eventBus.emit('application.status_changed', {
                applicationId,
                jobId,
                candidateUserId: application.candidate.user.id,
                previousStatus: currentApp?.status || 'UNKNOWN',
                newStatus: status,
                employerUserId: payload.userId,
            });

            // Special event for hired
            if (status === 'HIRED') {
                await eventBus.emit('application.hired', {
                    applicationId,
                    jobId,
                    candidateUserId: application.candidate.user.id,
                });
            }

            apiLogger.info('Application status updated', {
                applicationId,
                previousStatus: currentApp?.status,
                newStatus: status,
            });

            return successResponse(application);
        } catch (error) {
            apiLogger.error('ApplicationService.updateStatus error', { error, applicationId });
            return errorResponse('Đã xảy ra lỗi', 500);
        }
    }
}
