/**
 * n8n Webhook Receiver API
 * 
 * POST - Receive callbacks from n8n (e.g. after processing, or for triggering actions)
 * GET  - Health check for n8n to verify connectivity
 * 
 * This enables two-way communication:
 *   FindWorkers → n8n (via WebhookService)
 *   n8n → FindWorkers (via this endpoint)
 * 
 * Use cases:
 *   - n8n tells FindWorkers to update a record
 *   - n8n triggers a daily summary
 *   - n8n sends processed data back
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { apiLogger } from '@/lib/logger';
import prisma from '@/lib/prisma';

function verifyWebhookSecret(request: NextRequest): boolean {
    const secret = request.headers.get('x-webhook-secret')
        || request.headers.get('authorization')?.replace('Bearer ', '');
    const expected = process.env.WEBHOOK_SECRET;

    if (!expected) return true; // If no secret configured, allow (dev mode)
    return secret === expected;
}

export async function GET() {
    return successResponse({
        status: 'ok',
        service: 'FindWorkers n8n Webhook',
        timestamp: new Date().toISOString(),
        version: '1.0',
    });
}

export async function POST(request: NextRequest) {
    // Verify webhook secret
    if (!verifyWebhookSecret(request)) {
        return errorResponse('Invalid webhook secret', 401);
    }

    try {
        const body = await request.json();
        const { action, data } = body;

        apiLogger.info('[n8n Webhook] Received callback', { action });

        switch (action) {
            // ── Trigger daily summary ──
            case 'daily_summary': {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const [applications, jobs, employers, candidates, hired] = await Promise.all([
                    prisma.application.count({ where: { appliedAt: { gte: today } } }),
                    prisma.job.count({ where: { createdAt: { gte: today } } }),
                    prisma.employerProfile.count({ where: { createdAt: { gte: today } } }),
                    prisma.candidateProfile.count({ where: { createdAt: { gte: today } } }),
                    prisma.application.count({ where: { status: 'HIRED', updatedAt: { gte: today } } }),
                ]);

                return successResponse({
                    date: today.toISOString().split('T')[0],
                    totalApplications: applications,
                    totalNewJobs: jobs,
                    totalNewEmployers: employers,
                    totalNewCandidates: candidates,
                    hiredToday: hired,
                    message: `📊 BÁO CÁO NGÀY ${today.toISOString().split('T')[0]}\n\n📋 Đơn ứng tuyển: ${applications}\n💼 Tin mới: ${jobs}\n🏢 DN mới: ${employers}\n👤 UV mới: ${candidates}\n✅ Đã tuyển: ${hired}`,
                });
            }

            // ── Get system health ──
            case 'system_health': {
                const [userCount, jobCount, activeJobs] = await Promise.all([
                    prisma.user.count(),
                    prisma.job.count(),
                    prisma.job.count({ where: { status: 'ACTIVE' } }),
                ]);

                return successResponse({
                    status: 'healthy',
                    users: userCount,
                    totalJobs: jobCount,
                    activeJobs,
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                });
            }

            // ── Get recent applications ──
            case 'recent_applications': {
                const limit = data?.limit || 5;
                const apps = await prisma.application.findMany({
                    take: limit,
                    orderBy: { appliedAt: 'desc' },
                    include: {
                        candidate: { select: { fullName: true, phone: true } },
                        job: {
                            select: {
                                title: true,
                                employer: { select: { businessName: true } },
                            },
                        },
                    },
                });

                return successResponse({
                    applications: apps.map(a => ({
                        id: a.id,
                        candidateName: a.candidate.fullName,
                        candidatePhone: a.candidate.phone,
                        jobTitle: a.job.title,
                        employer: a.job.employer.businessName,
                        status: a.status,
                        appliedAt: a.appliedAt,
                    })),
                });
            }

            // ── Update application status from n8n ──
            case 'update_application_status': {
                if (!data?.applicationId || !data?.status) {
                    return errorResponse('applicationId and status required', 400);
                }

                const app = await prisma.application.update({
                    where: { id: data.applicationId },
                    data: { status: data.status },
                });

                return successResponse({ updated: true, application: app });
            }

            default:
                return errorResponse(`Unknown action: ${action}`, 400);
        }
    } catch (error) {
        apiLogger.error('[n8n Webhook] Error processing callback', { error });
        return NextResponse.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
        );
    }
}
