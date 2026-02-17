/**
 * Automation Engine
 * Handles automated workflows:
 * - Auto-close jobs when positions filled
 * - Auto-remind employers to review applications
 * - Auto-expire jobs past deadline
 * - Auto-calculate matching scores on new applications
 */
import prisma from './prisma';
import { calculateMatchingScore } from './matching-score';
import {
    notifyJobExpiring,
    notifyReviewReminder,
    notifyApplicationStatus
} from './notifications';
import { isFeatureEnabled, FEATURE_FLAGS } from './feature-flags';

/**
 * Auto-close jobs that have filled all positions
 * Called after a candidate is hired
 */
export async function autoCloseFilledJobs() {
    if (!(await isFeatureEnabled(FEATURE_FLAGS.AUTO_CLOSE_JOBS))) return;

    try {
        const filledJobs = await prisma.job.findMany({
            where: {
                status: 'ACTIVE',
                autoCloseWhenFull: true,
            },
            select: {
                id: true,
                title: true,
                positions: true,
                hiredCount: true,
                employer: {
                    select: { userId: true },
                },
            },
        });

        for (const job of filledJobs) {
            if (job.hiredCount >= job.positions) {
                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'CLOSED' },
                });

                // Log activity
                await logActivity('auto_close', 'job', job.id, {
                    reason: 'positions_filled',
                    hiredCount: job.hiredCount,
                    positions: job.positions,
                });

                console.log(`[Automation] Auto-closed job "${job.title}" - all ${job.positions} positions filled`);
            }
        }
    } catch (error) {
        console.error('[Automation] Auto-close jobs error:', error);
    }
}

/**
 * Auto-expire jobs past their expiration date
 */
export async function autoExpireJobs() {
    try {
        const now = new Date();

        const expiredJobs = await prisma.job.updateMany({
            where: {
                status: 'ACTIVE',
                expiresAt: {
                    lt: now,
                },
            },
            data: {
                status: 'CLOSED',
            },
        });

        if (expiredJobs.count > 0) {
            console.log(`[Automation] Auto-expired ${expiredJobs.count} jobs`);
        }
    } catch (error) {
        console.error('[Automation] Auto-expire jobs error:', error);
    }
}

/**
 * Notify employers about jobs expiring in the next 3 days
 */
export async function notifyExpiringJobs() {
    if (!(await isFeatureEnabled(FEATURE_FLAGS.NOTIFICATIONS))) return;

    try {
        const now = new Date();
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const expiringJobs = await prisma.job.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: {
                    gte: now,
                    lte: threeDaysLater,
                },
            },
            include: {
                employer: {
                    select: { userId: true },
                },
            },
        });

        for (const job of expiringJobs) {
            const daysLeft = Math.ceil(
                (job.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
            );

            await notifyJobExpiring(job.employer.userId, job.title, job.id, daysLeft);
        }
    } catch (error) {
        console.error('[Automation] Notify expiring jobs error:', error);
    }
}

/**
 * Remind employers about unreviewed applications older than 3 days
 */
export async function remindUnreviewedApplications() {
    if (!(await isFeatureEnabled(FEATURE_FLAGS.NOTIFICATIONS))) return;

    try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        // Find jobs with old unreviewed applications
        const jobsWithPending = await prisma.job.findMany({
            where: {
                status: 'ACTIVE',
                applications: {
                    some: {
                        status: 'APPLIED',
                        appliedAt: { lt: threeDaysAgo },
                    },
                },
            },
            include: {
                employer: {
                    select: { userId: true },
                },
                _count: {
                    select: {
                        applications: {
                            where: { status: 'APPLIED' },
                        },
                    },
                },
            },
        });

        for (const job of jobsWithPending) {
            const pendingCount = job._count?.applications || 0;
            if (pendingCount > 0) {
                await notifyReviewReminder(
                    job.employer.userId,
                    job.title,
                    job.id,
                    pendingCount
                );
            }
        }
    } catch (error) {
        console.error('[Automation] Remind unreviewed error:', error);
    }
}

/**
 * Calculate and store matching score for a new application
 */
export async function calculateAndStoreMatchingScore(
    applicationId: string,
    candidateId: string,
    jobId: string
) {
    if (!(await isFeatureEnabled(FEATURE_FLAGS.MATCHING_SCORE))) return;

    try {
        const candidate = await prisma.candidateProfile.findUnique({
            where: { id: candidateId },
        });

        const job = await prisma.job.findUnique({ where: { id: jobId } });

        if (!candidate || !job) return null;

        const score = calculateMatchingScore(
            {
                experienceMonths: 0,
                currentLocation: candidate.currentLocation || '',
                shifts: (candidate as any).shifts ? JSON.parse((candidate as any).shifts) : [],
            },
            {
                experienceRequired: job.experienceRequired,
                city: job.city,
                location: job.location,
                shift: job.shift,
                shifts: job.shifts,
                salaryMin: job.salaryMin,
                salaryMax: job.salaryMax,
                categoryId: job.categoryId,
            }
        );

        await prisma.application.update({
            where: { id: applicationId },
            data: { matchingScore: score },
        });

        return score;
    } catch (error) {
        console.error('[Automation] Calculate matching score error:', error);
        return null;
    }
}

/**
 * When application status changes to HIRED, increment job's hired count
 * and auto-close if all positions filled
 */
export async function onApplicationHired(jobId: string) {
    try {
        const job = await prisma.job.update({
            where: { id: jobId },
            data: { hiredCount: { increment: 1 } },
            select: {
                id: true,
                title: true,
                positions: true,
                hiredCount: true,
                autoCloseWhenFull: true,
            },
        });

        // Auto-close if filled
        if (job.autoCloseWhenFull && job.hiredCount >= job.positions) {
            await prisma.job.update({
                where: { id: job.id },
                data: { status: 'CLOSED' },
            });

            await logActivity('auto_close', 'job', job.id, {
                reason: 'positions_filled',
                hiredCount: job.hiredCount,
                positions: job.positions,
            });

            console.log(`[Automation] Auto-closed "${job.title}" - ${job.hiredCount}/${job.positions} hired`);
        }

        return job;
    } catch (error) {
        console.error('[Automation] On application hired error:', error);
    }
}

/**
 * Log activity for audit trail
 */
export async function logActivity(
    action: string,
    entity: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
    userId?: string
) {
    try {
        await prisma.activityLog.create({
            data: {
                action,
                entity,
                entityId,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
                userId,
            },
        });
    } catch (error) {
        console.error('[Activity Log] Failed to log:', error);
    }
}

/**
 * Run all scheduled automation tasks
 * This should be called by a cron job or API endpoint
 */
export async function runScheduledTasks() {
    console.log('[Automation] Running scheduled tasks...');

    await autoExpireJobs();
    await autoCloseFilledJobs();
    await notifyExpiringJobs();
    await remindUnreviewedApplications();

    console.log('[Automation] Scheduled tasks completed');
}
