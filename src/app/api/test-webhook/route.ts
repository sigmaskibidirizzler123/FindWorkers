/**
 * Test webhook endpoint - for debugging Discord notifications
 * GET  - Check if DISCORD_WEBHOOK_URL is configured
 * POST - Send a test notification to Discord
 */
import { NextResponse } from 'next/server';

export async function GET() {
    const discordUrl = process.env.DISCORD_WEBHOOK_URL;
    const n8nUrl = process.env.N8N_WEBHOOK_URL;

    return NextResponse.json({
        discord_configured: !!discordUrl,
        discord_url_preview: discordUrl ? discordUrl.substring(0, 50) + '...' : 'NOT SET',
        n8n_configured: !!n8nUrl,
        node_env: process.env.NODE_ENV,
        app_url: process.env.NEXT_PUBLIC_APP_URL,
    });
}

export async function POST() {
    const discordUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!discordUrl) {
        return NextResponse.json({
            error: 'DISCORD_WEBHOOK_URL is NOT set in environment variables!',
            fix: 'Go to Vercel → Settings → Environment Variables → Add DISCORD_WEBHOOK_URL',
        }, { status: 400 });
    }

    try {
        const payload = {
            username: 'FindWorkers Bot',
            embeds: [{
                title: '✅ Test Notification Thành Công!',
                description: '🎉 Discord webhook đã được cấu hình đúng!\n\nKhi employer đăng tin hoặc ứng viên apply, bạn sẽ nhận thông báo ở đây.',
                color: 5763719,
                timestamp: new Date().toISOString(),
                footer: { text: 'FindWorkers Alert System' },
            }],
        };

        const response = await fetch(discordUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        return NextResponse.json({
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            discord_url_preview: discordUrl.substring(0, 50) + '...',
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
