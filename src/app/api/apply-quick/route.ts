import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';
import { sendApplicationEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const jobId = formData.get('jobId') as string;
        const fullName = formData.get('fullName') as string;
        const phone = formData.get('phone') as string;
        const email = formData.get('email') as string;
        const cccd = formData.get('cccd') as string;
        const cccdImage = formData.get('cccdImage') as File | null;

        // Validate required fields
        if (!jobId || !fullName || !phone || !email || !cccd) {
            return errorResponse('Vui lòng điền đầy đủ thông tin', 400);
        }

        // Validate phone
        if (!/^(0|\+84)\d{9,10}$/.test(phone.replace(/\s/g, ''))) {
            return errorResponse('Số điện thoại không hợp lệ', 400);
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return errorResponse('Email không hợp lệ', 400);
        }

        // Validate CCCD (12 digits)
        if (!/^\d{12}$/.test(cccd.replace(/\s/g, ''))) {
            return errorResponse('Số CCCD phải có 12 chữ số', 400);
        }

        // Check job exists
        const job = await prisma.job.findFirst({
            where: { id: jobId, status: 'ACTIVE' },
            include: {
                employer: {
                    select: {
                        userId: true,
                        businessName: true,
                        phone: true,
                        user: { select: { email: true } }
                    }
                }
            }
        });

        if (!job) {
            return errorResponse('Tin tuyển dụng không tồn tại hoặc đã đóng', 404);
        }

        // Upload CCCD image if provided
        // Upload CCCD image if provided
        let cccdImageUrl: string | null = null;

        // VERCEL FIX: Cannot write to disk in serverless environment.
        // TODO: Implement Cloudinary or Vercel Blob for production image storage.
        if (cccdImage && cccdImage.size > 0) {
            console.log('[QuickApply] Received CCCD image:', cccdImage.name, cccdImage.size, 'bytes');
            // Mock URL for now to prevent crash
            cccdImageUrl = `https://placehold.co/600x400?text=CCCD+Uploaded`;
        }

        // Save to database with unique approve token
        const approveToken = crypto.randomUUID();
        const application = await prisma.quickApplication.create({
            data: {
                jobId,
                fullName: fullName.trim(),
                phone: phone.trim(),
                email: email.trim(),
                cccd: cccd.trim(),
                cccdImageUrl,
                approveToken,
            },
        });

        // Create In-App Notification for Employer
        if (job.employer && job.employer.userId) {
            try {
                await prisma.notification.create({
                    data: {
                        userId: job.employer.userId,
                        type: 'APPLICATION_NEW',
                        title: 'Ứng viên mới',
                        message: `${fullName} vừa ứng tuyển vào vị trí ${job.title}`,
                        link: `/employer/applications`, // Link to list
                        isRead: false,
                    }
                });
            } catch (notifError) {
                console.error('[QuickApply] Failed to create notification:', notifError);
            }
        }

        // Use production URL so approve links always go to latest deployment
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://find-workers-p7ka.vercel.app';
        const employerEmail = job.employer?.user?.email || undefined;

        try {
            await sendApplicationEmail({
                applicationId: application.id,
                approveToken: application.approveToken || '',
                jobTitle: job.title,
                companyName: job.employer.businessName || 'Công ty ẩn danh',
                fullName: fullName.trim(),
                phone: phone.trim(),
                email: email.trim(),
                cccd: cccd.trim(),
                cccdImageUrl: cccdImageUrl,
                appliedAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
                baseUrl,
                employerEmail,
            });
        } catch (mailError: any) {
            console.error('[QuickApply] Email send error:', mailError);
            // Return error to user to see what's wrong with SMTP
            return errorResponse(`Gửi đơn thành công nhưng LỖI EMAIL: ${mailError.message}`, 500);
        }

        // 🔔 Discord notification — new quick application
        const discordUrl = process.env.DISCORD_WEBHOOK_URL
            || 'https://discord.com/api/webhooks/1473167290622283882/1qljsLDIUUMmthj4sZu6-CbGvkszIQwfpNtjcJmBK2Gyf6ipZ6CpIJcNpDU23FCw7ES7';
        fetch(discordUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'FindWorkers Bot',
                embeds: [{
                    title: '📨 Ứng Viên Mới (Quick Apply)!',
                    description: `👤 ${fullName}\n📞 ${phone}\n📧 ${email}\n🪣 CCCD: ${cccd}\n📌 Vị trí: ${job.title}\n🏢 ${job.employer.businessName}`,
                    color: 3447003,
                    timestamp: new Date().toISOString(),
                    footer: { text: 'FindWorkers Alert System' },
                }],
            }),
        }).catch(() => { });

        return successResponse({
            id: application.id,
            message: 'Ứng tuyển thành công!',
        }, 201);

    } catch (error) {
        console.error('Quick apply error:', error);
        return errorResponse('Đã xảy ra lỗi khi gửi đơn', 500);
    }
}
