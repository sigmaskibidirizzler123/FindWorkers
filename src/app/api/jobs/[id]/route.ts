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

        // Check if request is from the job owner (employer)
        let isOwner = false;
        const token = request.cookies.get('token')?.value;
        if (token) {
            const payload = verifyToken(token);
            if (payload && payload.role === 'EMPLOYER') {
                const employer = await prisma.employerProfile.findUnique({
                    where: { userId: payload.userId },
                    select: { id: true },
                });
                if (employer) {
                    const ownedJob = await prisma.job.findFirst({
                        where: { id, employerId: employer.id },
                        select: { id: true },
                    });
                    isOwner = !!ownedJob;
                }
            }
        }

        // Owner can view any status, public only sees ACTIVE
        const whereClause = isOwner
            ? { id }
            : { id, status: 'ACTIVE' as const };

        const job = await prisma.job.findFirst({
            where: whereClause,
            include: {
                employer: {
                    select: {
                        id: true,
                        businessName: true,
                        businessType: true,
                        description: true,
                        logoUrl: true,
                        companyImages: true,
                        phone: true,
                        address: true,
                        location: true,
                    },
                },
                category: true,
                skills: {
                    include: {
                        skill: true,
                    },
                },
                _count: {
                    select: {
                        applications: true,
                    },
                },
            },
        });

        if (!job) {
            return errorResponse('Không tìm thấy tin tuyển dụng hoặc tin đã đóng', 404);
        }

        // Only increment view count for non-owner views
        if (!isOwner) {
            await prisma.job.update({
                where: { id },
                data: { viewCount: { increment: 1 } },
            });
        }

        return successResponse(job);
    } catch (error) {
        console.error('Get job error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền chỉnh sửa', 403);
        }

        // Get employer profile for isolation
        const employer = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });
        if (!employer) return errorResponse('Hồ sơ nhà tuyển dụng không tồn tại', 404);

        // Strict isolation: only own jobs
        const job = await prisma.job.findFirst({
            where: { id, employerId: employer.id },
        });
        if (!job) return errorResponse('Không tìm thấy tin', 404);

        const body = await request.json();

        // Whitelist allowed fields
        const allowedFields: Record<string, unknown> = {};
        const fieldWhitelist = [
            'title', 'description', 'requirements', 'benefits',
            'salaryMin', 'salaryMax', 'salaryNegotiable',
            'location', 'district', 'city',
            'jobType', 'shift', 'shifts', 'experienceRequired',
            'genderRequirement', 'positions', 'categoryId',
            'isUrgent', 'expiresAt',
        ];

        for (const field of fieldWhitelist) {
            if (body[field] !== undefined) {
                if (['salaryMin', 'salaryMax', 'experienceRequired', 'positions'].includes(field)) {
                    allowedFields[field] = body[field] !== null ? parseInt(body[field]) : null;
                } else if (field === 'shifts' && Array.isArray(body[field])) {
                    allowedFields[field] = JSON.stringify(body[field]);
                } else if (field === 'expiresAt' && body[field]) {
                    allowedFields[field] = new Date(body[field]);
                } else {
                    allowedFields[field] = body[field];
                }
            }
        }

        const updated = await prisma.job.update({
            where: { id },
            data: allowedFields,
            include: {
                employer: { select: { businessName: true } },
                category: { select: { name: true, slug: true } },
            },
        });

        return successResponse(updated);
    } catch (error) {
        console.error('Update job error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
        }

        const employer = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });
        if (!employer) return errorResponse('Hồ sơ nhà tuyển dụng không tồn tại', 404);

        const job = await prisma.job.findFirst({
            where: { id, employerId: employer.id },
        });
        if (!job) return errorResponse('Không tìm thấy tin', 404);

        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'close':
                await prisma.job.update({ where: { id }, data: { status: 'CLOSED' } });
                return successResponse({ message: 'Đã đóng tin tuyển dụng', status: 'CLOSED' });

            case 'reopen':
                await prisma.job.update({ where: { id }, data: { status: 'ACTIVE' } });
                return successResponse({ message: 'Đã mở lại tin tuyển dụng', status: 'ACTIVE' });

            case 'draft':
                await prisma.job.update({ where: { id }, data: { status: 'DRAFT' } });
                return successResponse({ message: 'Đã chuyển thành bản nháp', status: 'DRAFT' });

            default:
                return errorResponse('Action không hợp lệ. Dùng: close, reopen, draft', 400);
        }
    } catch (error) {
        console.error('Patch job error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền xoá', 403);
        }

        const employer = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });
        if (!employer) return errorResponse('Hồ sơ nhà tuyển dụng không tồn tại', 404);

        // Strict isolation
        const job = await prisma.job.findFirst({
            where: { id, employerId: employer.id },
        });
        if (!job) return errorResponse('Không tìm thấy tin', 404);

        // Soft delete — change to CLOSED instead of hard delete
        await prisma.job.update({
            where: { id },
            data: { status: 'CLOSED' },
        });

        return successResponse({ message: 'Đã đóng tin tuyển dụng' });
    } catch (error) {
        console.error('Delete job error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
