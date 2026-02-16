/**
 * Company Branches API
 * GET - List branches for current employer
 * POST - Create a new branch
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
        }

        const employer = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!employer) return errorResponse('Chưa có hồ sơ công ty', 400);

        const branches = await prisma.companyBranch.findMany({
            where: { employerId: employer.id },
            include: {
                _count: {
                    select: { jobs: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        return successResponse(branches);
    } catch (error) {
        console.error('Get branches error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
        }

        const employer = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!employer) return errorResponse('Chưa có hồ sơ công ty', 400);

        const body = await request.json();
        const { name, address, district, city, phone, managerName } = body;

        if (!name || !address || !city) {
            return errorResponse('Tên, địa chỉ và thành phố là bắt buộc', 400);
        }

        const branch = await prisma.companyBranch.create({
            data: {
                employerId: employer.id,
                name,
                address,
                district,
                city,
                phone,
                managerName,
            },
        });

        return successResponse(branch, 201);
    } catch (error) {
        console.error('Create branch error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
