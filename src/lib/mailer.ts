import nodemailer from 'nodemailer';
import path from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Gmail SMTP configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

interface ApplicationEmailData {
    applicationId: string;
    approveToken: string;  // For email approval buttons
    jobTitle: string;
    companyName: string;
    fullName: string;
    phone: string;
    email: string;
    cccd: string;
    cccdImageUrl: string | null;
    appliedAt: string;
    baseUrl: string; // e.g. http://localhost:3000
    employerEmail?: string;
}

export async function sendApplicationEmail(data: ApplicationEmailData) {
    const toEmail = process.env.NOTIFY_EMAIL || 'Luongnguyennhatminh2009@gmail.com';

    // Build approval URLs
    const approveUrl = `${data.baseUrl}/api/apply-quick/approve?token=${data.approveToken}&action=approve`;
    const rejectUrl = `${data.baseUrl}/api/apply-quick/approve?token=${data.approveToken}&action=reject`;

    // Prepare CCCD image as inline attachment
    const attachments: nodemailer.SendMailOptions['attachments'] = [];
    let cccdSection = '';

    if (data.cccdImageUrl) {
        // CASE 1: Remote URL (Cloudinary, Placeholder, etc.)
        if (data.cccdImageUrl.startsWith('http')) {
            cccdSection = `
            <tr>
                <td colspan="2" style="padding: 16px; border: 1px solid #e2e8f0; text-align: center; background: #fafafa;">
                    <p style="font-weight: 600; color: #475569; margin: 0 0 12px; font-size: 14px;">📷 Ảnh CCCD mặt trước</p>
                    <img src="${data.cccdImageUrl}" alt="CCCD mặt trước" style="max-width: 100%; max-height: 350px; border-radius: 8px; border: 2px solid #e2e8f0;" />
                </td>
            </tr>`;
        }
        // CASE 2: Local File (Development only)
        else {
            const localPath = path.join(process.cwd(), 'public', data.cccdImageUrl);
            if (existsSync(localPath)) {
                const imageBuffer = await readFile(localPath);
                const ext = path.extname(localPath).slice(1) || 'jpg';
                const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

                attachments.push({
                    filename: `cccd_${data.cccd}.${ext}`,
                    content: imageBuffer,
                    cid: 'cccd_image',
                    contentType: mimeType,
                });

                cccdSection = `
                <tr>
                    <td colspan="2" style="padding: 16px; border: 1px solid #e2e8f0; text-align: center; background: #fafafa;">
                        <p style="font-weight: 600; color: #475569; margin: 0 0 12px; font-size: 14px;">📷 Ảnh CCCD mặt trước</p>
                        <img src="cid:cccd_image" alt="CCCD mặt trước" style="max-width: 100%; max-height: 350px; border-radius: 8px; border: 2px solid #e2e8f0;" />
                    </td>
                </tr>`;
            }
        }
    }

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🔔 Có ứng viên mới!</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">FindWorkers - Hệ thống tuyển dụng</p>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">

            <!-- Thông tin việc làm -->
            <div style="background: #f0f4ff; border-radius: 10px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #6366f1;">
                <p style="margin: 0 0 4px; font-size: 13px; color: #6366f1; font-weight: 600;">📋 VỊ TRÍ TUYỂN DỤNG</p>
                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">${data.jobTitle}</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Công ty: ${data.companyName}</p>
            </div>

            <!-- Thông tin ứng viên -->
            <p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">👤 Thông tin ứng viên</p>

            <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden;">
                <tr style="background: #f8fafc;">
                    <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569; width: 140px;">Họ và tên</td>
                    <td style="padding: 12px 16px; border: 1px solid #e2e8f0; color: #1e293b; font-size: 16px; font-weight: 700;">${data.fullName}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">📱 Số điện thoại</td>
                    <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">
                        <a href="tel:${data.phone}" style="color: #6366f1; text-decoration: none; font-size: 16px; font-weight: 700;">${data.phone}</a>
                    </td>
                </tr>
                <tr style="background: #f8fafc;">
                    <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">📧 Email</td>
                    <td style="padding: 12px 16px; border: 1px solid #e2e8f0;">
                        <a href="mailto:${data.email}" style="color: #6366f1; text-decoration: none;">${data.email}</a>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-weight: 600; color: #475569;">🪪 Số CCCD</td>
                    <td style="padding: 12px 16px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 16px; font-weight: 600; letter-spacing: 1px;">${data.cccd}</td>
                </tr>
                ${cccdSection}
            </table>

            <!-- ═══════════════════════════════════ -->
            <!-- APPROVE / REJECT BUTTONS -->
            <!-- ═══════════════════════════════════ -->
            <div style="margin-top: 24px; padding: 20px; background: #fffbeb; border-radius: 12px; border: 1px solid #fbbf24; text-align: center;">
                <p style="color: #92400e; font-weight: 700; font-size: 15px; margin: 0 0 6px;">⚡ Duyệt hồ sơ ngay</p>
                <p style="color: #a16207; font-size: 12px; margin: 0 0 16px;">Bấm nút bên dưới để duyệt hoặc từ chối ứng viên này</p>
                
                <table style="width: 100%; border-spacing: 8px; border-collapse: separate;">
                    <tr>
                        <td style="width: 50%;">
                            <a href="${approveUrl}" style="display: block; padding: 14px 8px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; text-align: center;">
                                ✅ Duyệt hồ sơ
                            </a>
                        </td>
                        <td style="width: 50%;">
                            <a href="${rejectUrl}" style="display: block; padding: 14px 8px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; text-align: center;">
                                ❌ Từ chối
                            </a>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Quick Contact -->
            <div style="margin-top: 16px; text-align: center;">
                <p style="color: #64748b; font-size: 13px; margin: 0 0 12px;">Liên hệ ứng viên:</p>
                <a href="tel:${data.phone}" style="display: inline-block; padding: 10px 24px; background: #22c55e; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 4px; font-size: 13px;">📞 Gọi ${data.fullName}</a>
                <a href="https://zalo.me/${data.phone}" style="display: inline-block; padding: 10px 24px; background: #0068ff; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 4px; font-size: 13px;">💬 Nhắn Zalo</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                FindWorkers • Thời gian ứng tuyển: ${data.appliedAt}<br/>
                Mã đơn: ${data.applicationId}
            </p>
        </div>
    </div>`;

    // Let errors propagate to caller for debugging
    await transporter.sendMail({
        from: `"FindWorkers" <${process.env.SMTP_USER}>`,
        to: process.env.NOTIFY_EMAIL || 'Luongnguyennhatminh2009@gmail.com',
        cc: data.employerEmail, // Send copy to Employer
        subject: `🔔 Ứng viên mới: ${data.fullName} ứng tuyển ${data.jobTitle}`,
        html,
        attachments,
    });
    console.log(`✅ [Email] Sent notification: ${data.fullName} → ${data.jobTitle}`);
    return true;
}
