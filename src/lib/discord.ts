/**
 * Discord Webhook Configuration
 * Each channel has its own webhook URL for different notification types
 */

// Channel: #ban-tin-doanh-nghiep — Employer posts a new job
const DISCORD_JOB_POSTED = 'https://discord.com/api/webhooks/1473167293973397588/a00r5z7P_GDxq1X-hd8EoKBx1x8wVGsIvJxX0CJrbuh5p_3s4N9JVPqwZe52J5lXrOqi';

// Channel: #tin-tuyen-dung-moi — Approve/Reject candidate
const DISCORD_STATUS_CHANGE = 'https://discord.com/api/webhooks/1473253421686587524/cFb_l1xn-vxhE0X44uN17pUt6rBhDkVnnFF1yaWh8ZkUwjLfWdEEkeiXt8EmwOB2kMJK';

// Channel: #thong-bao-ung-tuyen — Candidate applies
const DISCORD_APPLICATION = 'https://discord.com/api/webhooks/1473253508076535881/j9Ylf7wO8W7nCaAPGtoKIxUtetgG2ZCchMUOJH0ke1exgj_enfsMvWfggu1lWmqCRMOz';

interface DiscordEmbed {
    title: string;
    description: string;
    color: number;
    timestamp?: string;
    footer?: { text: string };
}

function sendDiscord(webhookUrl: string, embeds: DiscordEmbed[]) {
    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'FindWorkers Bot',
            embeds: embeds.map(e => ({
                ...e,
                timestamp: e.timestamp || new Date().toISOString(),
                footer: e.footer || { text: 'FindWorkers Alert System' },
            })),
        }),
    })
        .then(res => console.log(`[Discord] Sent to webhook. Status: ${res.status}`))
        .catch(err => console.error(`[Discord] Failed:`, err.message));
}

/** Employer đăng tin tuyển dụng → #ban-tin-doanh-nghiep */
export function discordJobPosted(jobTitle: string, employerName: string, location: string, salary: string) {
    sendDiscord(DISCORD_JOB_POSTED, [{
        title: '💼 Tin Tuyển Dụng Mới!',
        description: `📌 ${jobTitle}\n🏢 ${employerName}\n📍 ${location}\n💰 ${salary}`,
        color: 5793266, // green
    }]);
}

/** Duyệt/từ chối ứng viên → #tin-tuyen-dung-moi */
export function discordStatusChange(candidateName: string, jobTitle: string, employerName: string, previousStatus: string, newStatus: string) {
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
    sendDiscord(DISCORD_STATUS_CHANGE, [{
        title: `${statusLabels[newStatus] || newStatus} — Cập nhật hồ sơ`,
        description: `👤 ${candidateName}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}\n\n📊 ${previousStatus} → **${newStatus}**`,
        color: statusColors[newStatus] || 7506394,
    }]);
}

/** Quick approve → #tin-tuyen-dung-moi */
export function discordQuickApprove(fullName: string, phone: string, email: string, jobTitle: string, employerName: string) {
    sendDiscord(DISCORD_STATUS_CHANGE, [{
        title: '✅ Đã Duyệt Ứng Viên!',
        description: `👤 ${fullName}\n📞 ${phone}\n📧 ${email}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}`,
        color: 5763719,
    }]);
}

/** Quick reject → #tin-tuyen-dung-moi */
export function discordQuickReject(fullName: string, jobTitle: string, employerName: string) {
    sendDiscord(DISCORD_STATUS_CHANGE, [{
        title: '❌ Đã Từ Chối Ứng Viên',
        description: `👤 ${fullName}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}`,
        color: 15548997,
    }]);
}

/** Ứng viên ứng tuyển → #thong-bao-ung-tuyen */
export function discordNewApplication(candidateName: string, phone: string, email: string, jobTitle: string, employerName: string, cccd?: string) {
    const desc = cccd
        ? `👤 ${candidateName}\n📞 ${phone}\n📧 ${email}\n🪪 CCCD: ${cccd}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}`
        : `👤 ${candidateName}\n📞 ${phone}\n📧 ${email}\n📌 Vị trí: ${jobTitle}\n🏢 ${employerName}`;

    sendDiscord(DISCORD_APPLICATION, [{
        title: '📨 Ứng Viên Mới Ứng Tuyển!',
        description: desc,
        color: 3447003,
    }]);
}
