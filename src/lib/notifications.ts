/**
 * Notification Service
 * Handles creating and managing notifications for users
 */
import prisma from './prisma';

type NotificationType =
    | 'APPLICATION_NEW'
    | 'APPLICATION_STATUS'
    | 'JOB_MATCH'
    | 'JOB_EXPIRING'
    | 'INTERVIEW_SCHEDULED'
    | 'SYSTEM'
    | 'REMINDER';

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Create a single notification
 */
export async function createNotification(params: CreateNotificationParams) {
    try {
        return await prisma.notification.create({
            data: {
                userId: params.userId,
                type: params.type,
                title: params.title,
                message: params.message,
                link: params.link,
                metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
            },
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
    params: CreateNotificationParams[]
) {
    try {
        return await prisma.notification.createMany({
            data: params.map((p) => ({
                userId: p.userId,
                type: p.type,
                title: p.title,
                message: p.message,
                link: p.link,
                metadata: p.metadata ? JSON.parse(JSON.stringify(p.metadata)) : undefined,
            })),
        });
    } catch (error) {
        console.error('Failed to create bulk notifications:', error);
        return null;
    }
}

/**
 * Notify employer when a new application is received
 */
export async function notifyNewApplication(
    employerUserId: string,
    candidateName: string,
    jobTitle: string,
    jobId: string
) {
    return createNotification({
        userId: employerUserId,
        type: 'APPLICATION_NEW',
        title: '📩 Ứng viên mới!',
        message: `${candidateName} vừa ứng tuyển vị trí "${jobTitle}"`,
        link: `/employer/jobs/${jobId}/applications`,
        metadata: { jobId, candidateName },
    });
}

/**
 * Notify candidate when their application status changes
 */
export async function notifyApplicationStatus(
    candidateUserId: string,
    jobTitle: string,
    businessName: string,
    status: string,
    jobId: string
) {
    const statusLabels: Record<string, string> = {
        REVIEWED: 'đã được xem',
        SHORTLISTED: 'được chọn',
        INTERVIEW: 'được mời phỏng vấn',
        REJECTED: 'không phù hợp',
        HIRED: 'được tuyển dụng',
    };

    const statusEmojis: Record<string, string> = {
        REVIEWED: '👀',
        SHORTLISTED: '⭐',
        INTERVIEW: '📅',
        REJECTED: '❌',
        HIRED: '🎉',
    };

    const label = statusLabels[status] || status;
    const emoji = statusEmojis[status] || '📋';

    return createNotification({
        userId: candidateUserId,
        type: 'APPLICATION_STATUS',
        title: `${emoji} Cập nhật ứng tuyển`,
        message: `Đơn ứng tuyển "${jobTitle}" tại ${businessName} ${label}`,
        link: `/jobs/${jobId}`,
        metadata: { jobId, status, businessName },
    });
}

/**
 * Notify candidate about matching jobs
 */
export async function notifyJobMatch(
    candidateUserId: string,
    jobTitle: string,
    businessName: string,
    matchScore: number,
    jobId: string
) {
    return createNotification({
        userId: candidateUserId,
        type: 'JOB_MATCH',
        title: '🎯 Việc phù hợp với bạn!',
        message: `${jobTitle} tại ${businessName} (phù hợp ${matchScore}%)`,
        link: `/jobs/${jobId}`,
        metadata: { jobId, matchScore },
    });
}

/**
 * Notify employer that a job is expiring soon
 */
export async function notifyJobExpiring(
    employerUserId: string,
    jobTitle: string,
    jobId: string,
    daysLeft: number
) {
    return createNotification({
        userId: employerUserId,
        type: 'JOB_EXPIRING',
        title: '⏰ Tin sắp hết hạn',
        message: `"${jobTitle}" sẽ hết hạn trong ${daysLeft} ngày`,
        link: `/employer/jobs/${jobId}`,
        metadata: { jobId, daysLeft },
    });
}

/**
 * Send interview reminder
 */
export async function notifyInterviewScheduled(
    candidateUserId: string,
    jobTitle: string,
    businessName: string,
    interviewDate: Date,
    jobId: string
) {
    const dateStr = interviewDate.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return createNotification({
        userId: candidateUserId,
        type: 'INTERVIEW_SCHEDULED',
        title: '📅 Lịch phỏng vấn',
        message: `Phỏng vấn "${jobTitle}" tại ${businessName}: ${dateStr}`,
        link: `/jobs/${jobId}`,
        metadata: { jobId, interviewDate: interviewDate.toISOString() },
    });
}

/**
 * Remind employer to review applications
 */
export async function notifyReviewReminder(
    employerUserId: string,
    jobTitle: string,
    jobId: string,
    pendingCount: number
) {
    return createNotification({
        userId: employerUserId,
        type: 'REMINDER',
        title: '🔔 Nhắc nhở xem CV',
        message: `Có ${pendingCount} ứng viên chưa xem cho "${jobTitle}"`,
        link: `/employer/jobs/${jobId}/applications`,
        metadata: { jobId, pendingCount },
    });
}
