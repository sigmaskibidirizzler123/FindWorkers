import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get('token');
    const action = searchParams.get('action'); // approve or reject

    if (!token || !action || !['approve', 'reject'].includes(action)) {
        return renderPage('❌ Lỗi', 'Link không hợp lệ.', 'error');
    }

    try {
        // Find the application by token
        const application = await prisma.quickApplication.findUnique({
            where: { approveToken: token },
            include: {
                job: {
                    include: {
                        employer: { select: { businessName: true } }
                    }
                }
            }
        });

        if (!application) {
            return renderPage('❌ Không tìm thấy', 'Đơn ứng tuyển không tồn tại hoặc link đã hết hạn.', 'error');
        }

        // Check if already processed
        if (application.status !== 'PENDING') {
            const statusText = application.status === 'APPROVED' ? '✅ Đã duyệt' : '❌ Đã từ chối';
            return renderPage(
                '📋 Đã xử lý rồi',
                `Hồ sơ của <strong>${application.fullName}</strong> đã được xử lý trước đó.<br/>Trạng thái: <strong>${statusText}</strong>`,
                'info'
            );
        }

        if (action === 'approve') {
            // Approve: update status + increment hiredCount on job
            await prisma.$transaction([
                prisma.quickApplication.update({
                    where: { id: application.id },
                    data: { status: 'APPROVED' }
                }),
                prisma.job.update({
                    where: { id: application.jobId },
                    data: { hiredCount: { increment: 1 } }
                })
            ]);

            // Check if job is now full and should auto-close
            const updatedJob = await prisma.job.findUnique({
                where: { id: application.jobId },
                select: { positions: true, hiredCount: true, autoCloseWhenFull: true }
            });

            if (updatedJob && updatedJob.autoCloseWhenFull && updatedJob.hiredCount >= updatedJob.positions) {
                await prisma.job.update({
                    where: { id: application.jobId },
                    data: { status: 'CLOSED' }
                });
            }

            // 🔔 Discord notification — approved
            const discordUrl = process.env.DISCORD_WEBHOOK_URL
                || 'https://discord.com/api/webhooks/1473167290622283882/1qljsLDIUUMmthj4sZu6-CbGvkszIQwfpNtjcJmBK2Gyf6ipZ6CpIJcNpDU23FCw7ES7';
            fetch(discordUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'FindWorkers Bot',
                    embeds: [{
                        title: '✅ Đã Duyệt Ứng Viên!',
                        description: `👤 ${application.fullName}\n📞 ${application.phone}\n📧 ${application.email}\n📌 Vị trí: ${application.job.title}\n🏢 ${application.job.employer.businessName}`,
                        color: 5763719,
                        timestamp: new Date().toISOString(),
                        footer: { text: 'FindWorkers Alert System' },
                    }],
                }),
            }).catch(() => { });

            return renderPage(
                '✅ Đã duyệt hồ sơ!',
                `<strong>${application.fullName}</strong> đã được duyệt cho vị trí <strong>${application.job.title}</strong> tại <strong>${application.job.employer.businessName}</strong>.<br/><br/>
                📱 SĐT: <a href="tel:${application.phone}" style="color: #6366f1;">${application.phone}</a><br/>
                📧 Email: <a href="mailto:${application.email}" style="color: #6366f1;">${application.email}</a><br/><br/>
                <a href="https://zalo.me/${application.phone}" style="display:inline-block;padding:10px 24px;background:#0068ff;color:white;border-radius:8px;text-decoration:none;font-weight:600;">💬 Liên hệ qua Zalo</a>`,
                'success'
            );
        } else {
            // Reject
            await prisma.quickApplication.update({
                where: { id: application.id },
                data: { status: 'REJECTED' }
            });

            // 🔔 Discord notification — rejected
            const discordUrlReject = process.env.DISCORD_WEBHOOK_URL
                || 'https://discord.com/api/webhooks/1473167290622283882/1qljsLDIUUMmthj4sZu6-CbGvkszIQwfpNtjcJmBK2Gyf6ipZ6CpIJcNpDU23FCw7ES7';
            fetch(discordUrlReject, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'FindWorkers Bot',
                    embeds: [{
                        title: '❌ Đã Từ Chối Ứng Viên',
                        description: `👤 ${application.fullName}\n📌 Vị trí: ${application.job.title}\n🏢 ${application.job.employer.businessName}`,
                        color: 15548997,
                        timestamp: new Date().toISOString(),
                        footer: { text: 'FindWorkers Alert System' },
                    }],
                }),
            }).catch(() => { });

            return renderPage(
                '❌ Đã từ chối hồ sơ',
                `Hồ sơ của <strong>${application.fullName}</strong> cho vị trí <strong>${application.job.title}</strong> đã bị từ chối.`,
                'rejected'
            );
        }
    } catch (error) {
        console.error('[Approve] Error:', error);
        return renderPage('❌ Lỗi hệ thống', 'Đã xảy ra lỗi khi xử lý. Vui lòng thử lại.', 'error');
    }
}

function renderPage(title: string, message: string, type: 'success' | 'rejected' | 'error' | 'info') {
    const colors = {
        success: { bg: '#22c55e', icon: '✅', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
        rejected: { bg: '#ef4444', icon: '❌', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
        error: { bg: '#f59e0b', icon: '⚠️', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        info: { bg: '#6366f1', icon: '📋', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    };

    const c = colors[type];

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - FindWorkers</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: #0f172a;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            max-width: 500px;
            width: 100%;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .header {
            background: ${c.gradient};
            padding: 32px;
            text-align: center;
        }
        .header h1 {
            color: white;
            font-size: 24px;
            font-weight: 700;
        }
        .body {
            padding: 32px;
            color: #cbd5e1;
            font-size: 15px;
            line-height: 1.7;
        }
        .footer {
            padding: 16px 32px;
            background: rgba(15, 23, 42, 0.5);
            text-align: center;
            color: #64748b;
            font-size: 12px;
            border-top: 1px solid rgba(255,255,255,0.05);
        }
        a { color: #818cf8; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>${title}</h1>
        </div>
        <div class="body">
            ${message}
        </div>
        <div class="footer">
            FindWorkers &bull; Hệ thống tuyển dụng Phú Quốc
        </div>
    </div>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}
