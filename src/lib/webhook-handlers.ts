/**
 * Webhook Event Handlers
 * 
 * Connects the internal EventBus → WebhookService (→ n8n → Telegram/Messenger)
 * 
 * This file registers event handlers that convert internal events
 * into webhook notifications. Import this file once at app startup.
 * 
 * Flow:
 *   ApplicationService.apply() 
 *     → eventBus.emit('application.created', {...})
 *     → this handler catches it
 *     → webhookService.notifyNewApplication({...})
 *     → HTTP POST to n8n webhook URL
 *     → n8n formats & sends to Telegram/Messenger
 */

import { eventBus } from './events';
import { webhookService } from './webhook';
import prisma from './prisma';
import { automationLogger } from './logger';

// ── Helper: Safely fetch related data ────────────────

async function getApplicationDetails(applicationId: string) {
    try {
        return await prisma.application.findUnique({
            where: { id: applicationId },
            include: {
                candidate: {
                    include: {
                        user: { select: { phone: true, email: true } },
                    },
                },
                job: {
                    include: {
                        employer: { select: { businessName: true } },
                    },
                },
            },
        });
    } catch {
        return null;
    }
}

// ── Register Event Handlers ────────────────

export function registerWebhookHandlers() {
    automationLogger.info('[Webhook Handlers] Registering event handlers...');

    // ─────────────────────────────────────────────
    // 1️⃣ Ứng viên mới apply → Alert
    // ─────────────────────────────────────────────
    eventBus.on('application.created', async (payload) => {
        try {
            const app = await getApplicationDetails(payload.applicationId);
            if (!app) return;

            await webhookService.notifyNewApplication({
                candidateName: app.candidate.fullName,
                candidatePhone: app.candidate.phone || app.candidate.user.phone || 'N/A',
                jobTitle: app.job.title,
                employerName: app.job.employer.businessName,
                applicationId: payload.applicationId,
                jobId: payload.jobId,
            });
        } catch (error) {
            automationLogger.error('[Webhook] Failed to notify new application', { error, payload });
        }
    });

    // ─────────────────────────────────────────────
    // 2️⃣ Application status changed → Alert
    // ─────────────────────────────────────────────
    eventBus.on('application.status_changed', async (payload) => {
        try {
            // Only notify for important status changes
            if (!['HIRED', 'REJECTED', 'INTERVIEW'].includes(payload.newStatus)) return;

            const app = await getApplicationDetails(payload.applicationId);
            if (!app) return;

            if (payload.newStatus === 'HIRED') {
                await webhookService.notifyHired({
                    candidateName: app.candidate.fullName,
                    jobTitle: app.job.title,
                    employerName: app.job.employer.businessName,
                });
            }
        } catch (error) {
            automationLogger.error('[Webhook] Failed to notify status change', { error, payload });
        }
    });

    // ─────────────────────────────────────────────
    // 3️⃣ Doanh nghiệp đăng ký → Alert
    // ─────────────────────────────────────────────
    eventBus.on('user.registered', async (payload) => {
        try {
            if (payload.role !== 'EMPLOYER') return;

            // Fetch employer profile
            const employer = await prisma.employerProfile.findUnique({
                where: { userId: payload.userId },
            });

            if (employer) {
                await webhookService.notifyNewEmployer({
                    businessName: employer.businessName,
                    phone: employer.phone,
                    email: payload.email,
                    location: employer.location,
                    registeredBy: 'self',
                });
            }
        } catch (error) {
            automationLogger.error('[Webhook] Failed to notify new employer', { error, payload });
        }
    });

    // ─────────────────────────────────────────────
    // 4️⃣ Job created → Alert
    // ─────────────────────────────────────────────
    eventBus.on('job.created', async (payload) => {
        try {
            const job = await prisma.job.findUnique({
                where: { id: payload.jobId },
                include: {
                    employer: { select: { businessName: true, location: true } },
                },
            });

            if (job) {
                await webhookService.send('job.created', {
                    jobTitle: job.title,
                    employerName: job.employer.businessName,
                    location: job.employer.location,
                    salary: job.salaryMin && job.salaryMax
                        ? `${(job.salaryMin / 1_000_000).toFixed(1)}M - ${(job.salaryMax / 1_000_000).toFixed(1)}M`
                        : 'Thỏa thuận',
                    message: `💼 TIN TUYỂN DỤNG MỚI\n\n📌 ${job.title}\n🏢 ${job.employer.businessName}\n📍 ${job.employer.location}\n💰 ${job.salaryMin ? `${(job.salaryMin / 1_000_000).toFixed(1)}M` : 'Thỏa thuận'}`,
                });
            }
        } catch (error) {
            automationLogger.error('[Webhook] Failed to notify new job', { error, payload });
        }
    });

    automationLogger.info('[Webhook Handlers] ✅ All handlers registered', {
        events: ['application.created', 'application.status_changed', 'user.registered', 'job.created'],
    });
}
