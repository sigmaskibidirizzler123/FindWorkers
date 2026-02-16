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

        // Send email notification — pass local path so mailer can embed the image
        const baseUrl = request.nextUrl.origin || 'http://localhost:3000';
        const employerEmail = job.employer?.user?.email || undefined;

        sendApplicationEmail({
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
        }).catch((err) => {
            console.error('[QuickApply] Email send error:', err);
        });

        return successResponse({
            id: application.id,
            message: 'Ứng tuyển thành công!',
        }, 201);

    } catch (error) {
        console.error('Quick apply error:', error);
        return errorResponse('Đã xảy ra lỗi khi gửi đơn', 500);
    }
}
