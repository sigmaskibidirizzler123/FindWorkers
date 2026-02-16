/**
 * Application Status Update API - Enhanced with automation
 * PATCH - Update application status (employer only)
 * Triggers: notification, auto-close on hire, activity log
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { onApplicationHired, logActivity } from '@/lib/automation';
import { notifyApplicationStatus, notifyInterviewScheduled } from '@/lib/notifications';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
    try {
        const { id: jobId, applicationId } = await params;
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
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
            },
        });

        if (!job || (job as any).employer.userId !== payload.userId) {
            return errorResponse('Không có quyền', 403);
        }

        // Verify application belongs to this job
        const existingApp = await prisma.application.findFirst({
            where: { id: applicationId, jobId },
            select: { id: true, status: true },
        });

        if (!existingApp) {
            return errorResponse('Không tìm thấy đơn ứng tuyển', 404);
        }

        const body = await request.json();
        const { status, note, interviewDate, interviewNote } = body;

        const validStatuses = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'HIRED'];
        if (!validStatuses.includes(status)) {
            return errorResponse('Trạng thái không hợp lệ', 400);
        }

        const previousStatus = existingApp.status;

        // Build update data
        const updateData: Record<string, unknown> = { status };
        if (note !== undefined) updateData.note = note;
        if (status !== 'APPLIED') updateData.reviewedAt = new Date();

        // Handle interview scheduling
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
                        user: {
                            select: { id: true, email: true, phone: true },
                        },
                    },
                },
            },
        });

        // === AUTOMATION: Notify candidate about status change ===
        await notifyApplicationStatus(
            application.candidate.user.id,
            job.title,
            (job as any).employer.businessName,
            status,
            jobId
        );

        // === AUTOMATION: If interview scheduled, send specific notification ===
        if (status === 'INTERVIEW' && interviewDate) {
            await notifyInterviewScheduled(
                application.candidate.user.id,
                job.title,
                (job as any).employer.businessName,
                new Date(interviewDate),
                jobId
            );
        }

        // === AUTOMATION: Handle hiredCount changes ===
        if (status === 'HIRED' && previousStatus !== 'HIRED') {
            // Newly hired → increment and maybe auto-close
            await onApplicationHired(jobId);
        } else if (previousStatus === 'HIRED' && status !== 'HIRED') {
            // Reverting from HIRED → decrement hiredCount
            await prisma.job.update({
                where: { id: jobId },
                data: { hiredCount: { decrement: 1 } },
            });
        }

        // === AUTOMATION: Log activity ===
        await logActivity(
            'application_status_changed',
            'application',
            applicationId,
            { jobId, previousStatus, newStatus: status },
            payload.userId
        );

        return successResponse(application);
    } catch (error) {
        console.error('Update application error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

