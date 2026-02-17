import { NextResponse } from 'next/server';

const DISCORD_URL = process.env.DISCORD_WEBHOOK_URL
    || 'https://discord.com/api/webhooks/1473167290622283882/1qljsLDIUUMmthj4sZu6-CbGvkszIQwfpNtjcJmBK2Gyf6ipZ6CpIJcNpDU23FCw7ES7';

export async function GET() {
    return NextResponse.json({
        discord_url_set: !!process.env.DISCORD_WEBHOOK_URL,
        using_fallback: !process.env.DISCORD_WEBHOOK_URL,
        node_env: process.env.NODE_ENV,
    });
}

export async function POST() {
    try {
        const response = await fetch(DISCORD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'FindWorkers Bot',
                embeds: [{
                    title: '✅ Test Notification Thành Công!',
                    description: '🎉 Discord webhook đã hoạt động!\n\nKhi employer đăng tin, bạn sẽ nhận thông báo ở đây.',
                    color: 5763719,
                    timestamp: new Date().toISOString(),
                    footer: { text: 'FindWorkers Alert System' },
                }],
            }),
        });

        const text = await response.text();
        return NextResponse.json({
            success: response.ok,
            status: response.status,
            response: text || '(empty = success)',
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
