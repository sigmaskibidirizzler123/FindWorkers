import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
    try {
        // 1. Verify Token & Role
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền truy cập', 403);
        }

        // 2. Get Employer Profile
        const employer = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!employer) {
            return errorResponse('Hồ sơ nhà tuyển dụng không tồn tại', 404);
        }

        // 3. Query Jobs with Applications (Real Data)
        const jobs = await prisma.job.findMany({
            where: { employerId: employer.id },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { applications: true },
                },
                applications: {
                    select: { status: true },
                },
            },
        });

        // 4. Calculate Stats & Pipeline
        let totalApplications = 0;
        let pendingReview = 0;
        let interviewScheduled = 0;
        let totalHired = 0; // Hired via application status
        let totalViews = 0;
        let activeJobs = 0;

        const processedJobs = jobs.map((job) => {
            // Calculate pipeline for this specific job
            const pipeline = {
                applied: 0,
                reviewed: 0,
                shortlisted: 0,
                interview: 0,
                hired: 0,
                rejected: 0,
            };

            job.applications.forEach((app) => {
                switch (app.status) {
                    case 'APPLIED': pipeline.applied++; break;
                    case 'REVIEWED': pipeline.reviewed++; break;
                    case 'SHORTLISTED': pipeline.shortlisted++; break;
                    case 'INTERVIEW': pipeline.interview++; break;
                    case 'HIRED': pipeline.hired++; break;
                    case 'REJECTED': pipeline.rejected++; break;
                }
            });

            // Aggregate global stats
            totalApplications += job._count.applications;
            pendingReview += pipeline.applied; // APPLIED status means pending review
            interviewScheduled += pipeline.interview;
            totalHired += pipeline.hired;
            totalViews += job.viewCount;
            if (job.status === 'ACTIVE') activeJobs++;

            return {
                ...job,
                // Remove raw applications array to reduce payload size, keep pipeline stats
                applications: undefined,
                pipeline,
            };
        });

        const stats = {
            totalJobs: jobs.length,
            activeJobs,
            totalApplications,
            pendingReview,
            interviewScheduled,
            totalHired, // Or use job.hiredCount if logic differs
            totalViews,
            avgTimeToHire: 0, // Placeholder calculation
            conversionRate: totalApplications > 0 ? Math.round((totalHired / totalApplications) * 100) : 0,
        };

        return successResponse({ stats, jobs: processedJobs });

    } catch (error) {
        console.error('Employer dashboard error:', error);
        return errorResponse('Đã xảy ra lỗi khi tải dữ liệu dashboard', 500);
    }
}
