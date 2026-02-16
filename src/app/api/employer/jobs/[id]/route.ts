
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Verify Token & Role
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền truy cập', 403);
        }

        // 2. Get Employer Profile to get employerId
        const employer = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!employer) {
            return errorResponse('Hồ sơ nhà tuyển dụng không tồn tại', 404);
        }

        // 3. Query Job with Strict Isolation
        const job = await prisma.job.findFirst({
            where: {
                id: id,
                employerId: employer.id,
            },
            include: {
                category: {
                    select: { name: true, slug: true },
                },
                skills: {
                    include: {
                        skill: true,
                    },
                },
                applications: {
                    orderBy: { appliedAt: 'desc' },
                    include: {
                        candidate: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                                currentLocation: true,
                                desiredJob: true,
                                experienceMonths: true,
                                description: true,
                                user: {
                                    select: {
                                        email: true,
                                        avatarUrl: true,
                                    }
                                }
                            }
                        },
                        screeningAnswers: {
                            include: {
                                question: true,
                            }
                        }
                    }
                },
                _count: {
                    select: { applications: true }
                }
            },
        });

        if (!job) {
            return errorResponse('Không tìm thấy tin tuyển dụng', 404);
        }

        // 4. Calculate Pipeline Stats
        const pipeline = {
            applied: 0,
            reviewed: 0,
            shortlisted: 0,
            interview: 0,
            hired: 0,
            rejected: 0,
            total: job._count.applications
        };

        job.applications.forEach(app => {
            if (app.status === 'APPLIED') pipeline.applied++;
            else if (app.status === 'REVIEWED') pipeline.reviewed++;
            else if (app.status === 'SHORTLISTED') pipeline.shortlisted++;
            else if (app.status === 'INTERVIEW') pipeline.interview++;
            else if (app.status === 'HIRED') pipeline.hired++;
            else if (app.status === 'REJECTED') pipeline.rejected++;
        });

        return successResponse({
            job,
            pipeline
        });

    } catch (error) {
        console.error('Get employer job details error:', error);
        return errorResponse('Đã xảy ra lỗi khi tải thông tin việc làm', 500);
    }
}
