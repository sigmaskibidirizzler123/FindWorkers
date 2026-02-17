/**
 * Webhook Notification Service
 * 
 * Sends real-time events from FindWorkers → n8n (or any webhook receiver).
 * This is "Level 2" — direct system events, bypassing Gmail entirely.
 * 
 * Architecture:
 *   EventBus → WebhookService → n8n Webhook → Telegram/Messenger
 * 
 * Features:
 *   - Multiple webhook URLs support
 *   - Automatic retry with exponential backoff
 *   - Duplicate protection (dedup by event ID)
 *   - Structured payload formatting
 *   - Error logging without blocking main flow
 */

import { automationLogger } from './logger';

// ── Types ────────────────

export interface WebhookPayload {
    event: string;
    timestamp: string;
    environment: string;
    data: Record<string, unknown>;
    metadata?: {
        eventId: string;
        source: 'findworkers-app';
        version: '1.0';
    };
}

export type WebhookEventType =
    | 'application.new'
    | 'application.status_changed'
    | 'application.hired'
    | 'employer.registered'
    | 'employer.created_by_admin'
    | 'job.created'
    | 'job.closed'
    | 'system.error'
    | 'system.alert'
    | 'daily.summary';

// ── Deduplication Store (in-memory, 1h TTL) ────────────────

const processedEvents = new Map<string, number>();
const DEDUP_TTL = 60 * 60 * 1000; // 1 hour

function cleanExpired() {
    const now = Date.now();
    for (const [id, ts] of processedEvents.entries()) {
        if (now - ts > DEDUP_TTL) processedEvents.delete(id);
    }
}

// Clean every 10 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanExpired, 10 * 60 * 1000);
}

// ── Webhook Service ────────────────

class WebhookService {
    private maxRetries = 3;
    private timeoutMs = 10000; // 10 seconds

    /**
     * Get configured webhook URLs from environment
     */
    private getWebhookUrls(): string[] {
        const urls: string[] = [];

        // Primary n8n webhook
        const n8nUrl = process.env.N8N_WEBHOOK_URL;
        if (n8nUrl) urls.push(n8nUrl);

        // Secondary/backup webhook (optional)
        const backupUrl = process.env.N8N_WEBHOOK_URL_BACKUP;
        if (backupUrl) urls.push(backupUrl);

        return urls;
    }

    /**
     * Generate unique event ID for deduplication
     */
    private generateEventId(event: string, data: Record<string, unknown>): string {
        const key = `${event}:${JSON.stringify(data)}:${Math.floor(Date.now() / 1000)}`;
        // Simple hash
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `evt_${Math.abs(hash).toString(36)}`;
    }

    /**
     * Send event to all configured webhooks + Discord fallback
     */
    async send(event: WebhookEventType, data: Record<string, unknown>): Promise<void> {
        const urls = this.getWebhookUrls();
        const discordUrl = process.env.DISCORD_WEBHOOK_URL;

        if (urls.length === 0 && !discordUrl) {
            automationLogger.debug(`[Webhook] No webhook URLs configured, skipping event: ${event}`);
            return;
        }

        // Deduplication check
        const eventId = this.generateEventId(event, data);
        if (processedEvents.has(eventId)) {
            automationLogger.debug(`[Webhook] Duplicate event skipped: ${eventId}`);
            return;
        }
        processedEvents.set(eventId, Date.now());

        const payload: WebhookPayload = {
            event,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            data,
            metadata: {
                eventId,
                source: 'findworkers-app',
                version: '1.0',
            },
        };

        const promises: Promise<void>[] = [];

        // Send to n8n webhooks
        promises.push(...urls.map(url => this.sendToUrl(url, payload)));

        // Direct Discord fallback (if no n8n, or as additional channel)
        if (discordUrl) {
            promises.push(this.sendToDiscord(discordUrl, event, data));
        }

        const results = await Promise.allSettled(promises);

        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            automationLogger.error(`[Webhook] ${failures.length} webhook(s) failed for ${event}`, {
                eventId,
                failures: failures.map(f => (f as PromiseRejectedResult).reason?.message),
            });
        }
    }

    /**
     * Send directly to Discord with rich embeds (no n8n needed)
     */
    private async sendToDiscord(url: string, event: WebhookEventType, data: Record<string, unknown>): Promise<void> {
        const colorMap: Record<string, number> = {
            'application.new': 16744448,       // Orange
            'application.hired': 5763719,      // Green
            'application.status_changed': 3447003, // Blue
            'employer.registered': 3447003,    // Blue
            'employer.created_by_admin': 3447003,
            'job.created': 5793266,            // Teal
            'job.closed': 10070709,            // Gray
            'system.error': 15158332,          // Red
            'system.alert': 15158332,
            'daily.summary': 10181046,         // Purple
        };

        const titleMap: Record<string, string> = {
            'application.new': '🔥 Ứng Viên Mới Apply!',
            'application.hired': '✅ Tuyển Dụng Thành Công!',
            'application.status_changed': '📋 Cập Nhật Ứng Tuyển',
            'employer.registered': '🏢 Doanh Nghiệp Mới Đăng Ký!',
            'employer.created_by_admin': '🏢 Admin Tạo Doanh Nghiệp Mới',
            'job.created': '💼 Tin Tuyển Dụng Mới!',
            'job.closed': '🔒 Tin Tuyển Dụng Đã Đóng',
            'system.error': '🚨 Lỗi Hệ Thống!',
            'system.alert': '⚠️ Cảnh Báo Hệ Thống',
            'daily.summary': '📊 Báo Cáo Ngày',
        };

        const discordPayload = {
            username: 'FindWorkers Bot',
            avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135692.png',
            embeds: [{
                title: titleMap[event] || `🔔 ${event}`,
                description: String(data.message || ''),
                color: colorMap[event] || 3447003,
                timestamp: new Date().toISOString(),
                footer: { text: 'FindWorkers Alert System' },
            }],
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload),
        });

        if (!response.ok) {
            throw new Error(`Discord webhook failed: HTTP ${response.status}`);
        }

        automationLogger.info(`[Webhook] ✅ Discord notification sent for ${event}`);
    }

    /**
     * Send payload to a single URL with retry logic
     */
    private async sendToUrl(url: string, payload: WebhookPayload): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Source': 'findworkers',
                        'X-Webhook-Event': payload.event,
                        'X-Webhook-ID': payload.metadata?.eventId || '',
                        // Secret for n8n to verify
                        'X-Webhook-Secret': process.env.WEBHOOK_SECRET || '',
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                automationLogger.info(`[Webhook] ✅ Sent ${payload.event} to ${url}`, {
                    eventId: payload.metadata?.eventId,
                    status: response.status,
                    attempt,
                });
                return;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < this.maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 8000); // 1s, 2s, 4s, 8s
                    automationLogger.warn(`[Webhook] Retry ${attempt + 1}/${this.maxRetries} for ${url}`, {
                        error: lastError.message,
                        nextRetryMs: delay,
                    });
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }

        throw lastError;
    }

    // ── High-Level Event Helpers ────────────────

    /**
     * 🔥 New candidate applied for a job
     */
    async notifyNewApplication(data: {
        candidateName: string;
        candidatePhone: string;
        jobTitle: string;
        employerName: string;
        applicationId: string;
        jobId: string;
    }) {
        await this.send('application.new', {
            ...data,
            adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/jobs`,
            message: `🔥 ỨNG VIÊN MỚI\n\n👤 ${data.candidateName}\n📱 ${data.candidatePhone}\n💼 ${data.jobTitle}\n🏢 ${data.employerName}\n\n🔗 Xem chi tiết: ${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/jobs`,
        });
    }

    /**
     * 🏢 New employer registered
     */
    async notifyNewEmployer(data: {
        businessName: string;
        phone: string;
        email?: string;
        location: string;
        registeredBy: 'self' | 'admin';
    }) {
        await this.send(
            data.registeredBy === 'admin' ? 'employer.created_by_admin' : 'employer.registered',
            {
                ...data,
                adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/companies`,
                message: `🏢 DOANH NGHIỆP MỚI\n\n🏪 ${data.businessName}\n📱 ${data.phone}\n📍 ${data.location}\n📝 Đăng ký bởi: ${data.registeredBy === 'admin' ? 'Admin' : 'Tự đăng ký'}\n\n🔗 Xem: ${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/companies`,
            }
        );
    }

    /**
     * ✅ Candidate got hired
     */
    async notifyHired(data: {
        candidateName: string;
        jobTitle: string;
        employerName: string;
    }) {
        await this.send('application.hired', {
            ...data,
            message: `✅ TUYỂN DỤNG THÀNH CÔNG\n\n👤 ${data.candidateName}\n💼 ${data.jobTitle}\n🏢 ${data.employerName}`,
        });
    }

    /**
     * 🚨 System error alert
     */
    async notifySystemError(data: {
        errorType: string;
        errorMessage: string;
        endpoint?: string;
        userId?: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }) {
        const emoji = {
            low: '⚠️',
            medium: '🟡',
            high: '🔴',
            critical: '🚨',
        };

        await this.send('system.error', {
            ...data,
            message: `${emoji[data.severity]} LỖI HỆ THỐNG [${data.severity.toUpperCase()}]\n\n📌 ${data.errorType}\n💬 ${data.errorMessage}\n${data.endpoint ? `🔗 Endpoint: ${data.endpoint}` : ''}\n${data.userId ? `👤 User: ${data.userId}` : ''}`,
        });
    }

    /**
     * 📊 Daily summary report
     */
    async notifyDailySummary(data: {
        date: string;
        totalApplications: number;
        totalNewJobs: number;
        totalNewEmployers: number;
        totalNewCandidates: number;
        hiredToday: number;
    }) {
        await this.send('daily.summary', {
            ...data,
            message: `📊 BÁO CÁO NGÀY ${data.date}\n\n📋 Đơn ứng tuyển: ${data.totalApplications}\n💼 Tin mới: ${data.totalNewJobs}\n🏢 Doanh nghiệp mới: ${data.totalNewEmployers}\n👤 Ứng viên mới: ${data.totalNewCandidates}\n✅ Đã tuyển: ${data.hiredToday}`,
        });
    }
}

// ── Singleton ────────────────
export const webhookService = new WebhookService();
export default webhookService;
