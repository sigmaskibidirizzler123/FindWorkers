/**
 * Discord Webhook — 3 Kênh Riêng Biệt
 * 
 * #bang-tin-doanh-nghiep  → Employer đăng tin tuyển dụng mới
 * #tin-tuyen-dung-moi     → Cập nhật trạng thái ứng viên (duyệt/từ chối/phỏng vấn)
 * #thong-bao-ung-tuyen    → Ứng viên ứng tuyển mới
 * 
 * IMPORTANT: All exported functions are async and MUST be awaited
 * in Vercel serverless — otherwise the function terminates before
 * the fetch completes and Discord never receives the message.
 */

// Channel: #bang-tin-doanh-nghiep — Employer đăng tin
const DISCORD_JOB_POSTED = 'https://discord.com/api/webhooks/1473167293973397588/a00r5z7P_GDxq1X-hd8EoKBx1x8wVGsIvJxX0CJrbuh5p_3s4N9JVPqwZe52J5lXrOqi';

// Channel: #tin-tuyen-dung-moi — Duyệt/từ chối ứng viên
const DISCORD_STATUS_CHANGE = 'https://discord.com/api/webhooks/1473253421686587524/cFb_l1xn-vxhE0X44uN17pUt6rBhDkVnnFF1yaWh8ZkUwjLfWdEEkeiXt8EmwOB2kMJK';

// Channel: #thong-bao-ung-tuyen — Ứng viên ứng tuyển
const DISCORD_APPLICATION = 'https://discord.com/api/webhooks/1473253508076535881/j9Ylf7wO8W7nCaAPGtoKIxUtetgG2ZCchMUOJH0ke1exgj_enfsMvWfggu1lWmqCRMOz';

interface DiscordEmbed {
    title: string;
    description: string;
    color: number;
    timestamp?: string;
    footer?: { text: string };
}

async function sendDiscord(webhookUrl: string, embeds: DiscordEmbed[]): Promise<void> {
    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'FindWorkers Bot',
                embeds: embeds.map(e => ({
                    ...e,
                    timestamp: e.timestamp || new Date().toISOString(),
                    footer: e.footer || { text: 'FindWorkers • Phú Quốc' },
                })),
            }),
        });
        console.log(`[Discord] Sent to webhook. Status: ${res.status}`);
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error(`[Discord] Webhook error (${res.status}): ${text}`);
        }
    } catch (err) {
        console.error(`[Discord] Failed:`, err instanceof Error ? err.message : err);
    }
}

/** 💼 Employer đăng tin → #bang-tin-doanh-nghiep */
export async function discordJobPosted(jobTitle: string, employerName: string, location: string, salary: string) {
    await sendDiscord(DISCORD_JOB_POSTED, [{
        title: '💼 Tin Tuyển Dụng Mới!',
        description: `📌 ${jobTitle}\n🏢 ${employerName}\n📍 ${location}\n💰 ${salary}`,
        color: 5793266,
    }]);
}

/** 📊 Cập nhật trạng thái → #tin-tuyen-dung-moi */
export async function discordStatusChange(candidateName: string, jobTitle: string, employerName: string, previousStatus: string, newStatus: string) {
    const statusLabels: Record<string, string> = {
        'REVIEWED': '👁️ Đã xem',
        'SHORTLISTED': '⭐ Chọn lọc',
        'INTERVIEW': '📅 Phỏng vấn',
        'HIRED': '🎉 Đã tuyển',
        'REJECTED': '❌ Từ chối',
    };
    const statusColors: Record<string, number> = {
        'REVIEWED': 7506394,
        'SHORTLISTED': 16776960,
        'INTERVIEW': 3447003,
        'HIRED': 5763719,
        'REJECTED': 15548997,
    };
    await sendDiscord(DISCORD_STATUS_CHANGE, [{
        title: `${statusLabels[newStatus] || newStatus} — Cập nhật hồ sơ`,
        description: `👤 ${candidateName}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}\n\n📊 ${previousStatus} → **${newStatus}**`,
        color: statusColors[newStatus] || 7506394,
    }]);
}

/** ✅ Quick approve → #tin-tuyen-dung-moi */
export async function discordQuickApprove(fullName: string, phone: string, email: string, jobTitle: string, employerName: string) {
    await sendDiscord(DISCORD_STATUS_CHANGE, [{
        title: '✅ Đã Duyệt Ứng Viên!',
        description: `👤 ${fullName}\n📞 ${phone}\n📧 ${email}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}`,
        color: 5763719,
    }]);
}

/** ❌ Quick reject → #tin-tuyen-dung-moi */
export async function discordQuickReject(fullName: string, jobTitle: string, employerName: string) {
    await sendDiscord(DISCORD_STATUS_CHANGE, [{
        title: '❌ Đã Từ Chối Ứng Viên',
        description: `👤 ${fullName}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}`,
        color: 15548997,
    }]);
}

/** 📨 Ứng viên ứng tuyển → #thong-bao-ung-tuyen */
export async function discordNewApplication(candidateName: string, phone: string, email: string, jobTitle: string, employerName: string, cccd?: string) {
    const desc = cccd
        ? `👤 ${candidateName}\n📞 ${phone}\n📧 ${email}\n🪪 CCCD: ${cccd}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}`
        : `👤 ${candidateName}\n📞 ${phone}\n📧 ${email}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}`;

    await sendDiscord(DISCORD_APPLICATION, [{
        title: '📨 Ứng Viên Mới Ứng Tuyển!',
        description: desc,
        color: 3447003,
    }]);
}
