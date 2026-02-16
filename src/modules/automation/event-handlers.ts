/**
 * Event Handlers Registration
 * 
 * This file registers all event handlers when the app starts.
 * It connects the event bus to the automation services.
 * 
 * Architecture:
 *   API Route → Service → eventBus.emit('event') → handlers (this file)
 *   
 * Each handler is a standalone async function that:
 *   1. Receives the event payload
 *   2. Performs its side-effect
 *   3. Logs the result
 *   4. Never throws (errors are caught and logged)
 */

import { eventBus, EventMap } from '@/lib/events';
import { calculateAndStoreMatchingScore, onApplicationHired, logActivity } from '@/lib/automation';
import {
    notifyNewApplication,
    notifyApplicationStatus,
    notifyInterviewScheduled
} from '@/lib/notifications';
import { automationLogger } from '@/lib/logger';
import prisma from '@/lib/prisma';

/**
 * Initialize all event handlers - call this once at app startup
 */
export function registerEventHandlers() {
    automationLogger.info('Registering event handlers...');

    // ── Application Created ────────────────
    eventBus.on('application.created', async (payload: EventMap['application.created']) => {
        const { applicationId, jobId, candidateId } = payload;

        // 1. Calculate matching score (async, non-blocking)
        try {
            await calculateAndStoreMatchingScore(applicationId, candidateId, jobId);
            automationLogger.debug('Matching score calculated', { applicationId });
        } catch (error) {
            automationLogger.error('Failed to calculate matching score', { applicationId, error });
        }

        // 2. Notify employer about new application
        try {
            const [candidate, job] = await Promise.all([
                prisma.candidateProfile.findUnique({ where: { id: candidateId }, select: { fullName: true } }),
                prisma.job.findUnique({ where: { id: jobId }, select: { title: true, employer: { select: { userId: true } } } }),
            ]);

            if (candidate && job) {
                await notifyNewApplication(
                    job.employer.userId,
                    candidate.fullName,
                    job.title,
                    jobId
                );
            }
        } catch (error) {
            automationLogger.error('Failed to notify employer', { applicationId, error });
        }

        // 3. Log activity
        try {
            await logActivity('application_created', 'application', applicationId, { jobId, candidateId });
        } catch (error) {
            automationLogger.error('Failed to log activity', { applicationId, error });
        }
    });

    // ── Application Status Changed ────────────────
    eventBus.on('application.status_changed', async (payload: EventMap['application.status_changed']) => {
        const { applicationId, jobId, candidateUserId, previousStatus, newStatus, employerUserId } = payload;

        // 1. Notify candidate
        try {
            const job = await prisma.job.findUnique({
                where: { id: jobId },
                select: { title: true, employer: { select: { businessName: true } } },
            });

            if (job) {
                await notifyApplicationStatus(
                    candidateUserId,
                    job.title,
                    job.employer.businessName,
                    newStatus,
                    jobId
                );
            }
        } catch (error) {
            automationLogger.error('Failed to notify status change', { applicationId, error });
        }

        // 2. If interview scheduled, send specific notification
        if (newStatus === 'INTERVIEW') {
            try {
                const application = await prisma.application.findUnique({
                    where: { id: applicationId },
                    select: { interviewDate: true },
                });

                if (application?.interviewDate) {
                    const job = await prisma.job.findUnique({
                        where: { id: jobId },
                        select: { title: true, employer: { select: { businessName: true } } },
                    });

                    if (job) {
                        await notifyInterviewScheduled(
                            candidateUserId,
                            job.title,
                            job.employer.businessName,
                            application.interviewDate,
                            jobId
                        );
                    }
                }
            } catch (error) {
                automationLogger.error('Failed to notify interview', { applicationId, error });
            }
        }

        // 3. Log activity
        try {
            await logActivity(
                'application_status_changed',
                'application',
                applicationId,
                { jobId, previousStatus, newStatus },
                employerUserId
            );
        } catch (error) {
            automationLogger.error('Failed to log status change', { applicationId, error });
        }
    });

    // ── Application Hired ────────────────
    eventBus.on('application.hired', async (payload: EventMap['application.hired']) => {
        const { applicationId, jobId } = payload;

        try {
            await onApplicationHired(jobId);
            automationLogger.info('Hired handler completed', { applicationId, jobId });
        } catch (error) {
            automationLogger.error('Failed to process hired event', { applicationId, error });
        }
    });

    // ── Job Created ────────────────
    eventBus.on('job.created', async (payload: EventMap['job.created']) => {
        const { jobId, employerId, categoryId } = payload;

        // 1. Log activity
        try {
            await logActivity('job_created', 'job', jobId, { employerId, categoryId });
        } catch (error) {
            automationLogger.error('Failed to log job creation', { jobId, error });
        }

        // 2. Future: notify matching candidates
        // if (await isFeatureEnabled(FEATURE_FLAGS.AI_RECOMMENDATIONS)) {
        //   await notifyMatchingCandidates(jobId, categoryId);
        // }
    });

    // ── Job Closed ────────────────
    eventBus.on('job.closed', async (payload: EventMap['job.closed']) => {
        const { jobId, reason } = payload;

        try {
            await logActivity('job_closed', 'job', jobId, { reason });
            automationLogger.info('Job closed', { jobId, reason });
        } catch (error) {
            automationLogger.error('Failed to log job close', { jobId, error });
        }
    });

    // ── User Registered ────────────────
    eventBus.on('user.registered', async (payload: EventMap['user.registered']) => {
        const { userId, role } = payload;

        try {
            await logActivity('user_registered', 'user', userId, { role });
            automationLogger.info('User registered', { userId, role });
        } catch (error) {
            automationLogger.error('Failed to log registration', { userId, error });
        }

        // Future: send welcome email, setup defaults, etc.
    });

    // ── User Login ────────────────
    eventBus.on('user.login', async (payload: EventMap['user.login']) => {
        const { userId, ip } = payload;

        try {
            await logActivity('user_login', 'user', userId, { ip });
        } catch (error) {
            automationLogger.error('Failed to log login', { userId, error });
        }
    });

    const stats = eventBus.stats();
    automationLogger.info('Event handlers registered', { stats });
}
