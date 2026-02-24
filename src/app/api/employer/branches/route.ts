/**
 * Employer Branches API
 * 
 * GET  - List all branches for the employer
 * POST - Create a new branch
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

// ─── GET: List branches ───
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
        }

        const profile = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
            select: { id: true },
        });

        if (!profile) return errorResponse('Chưa có hồ sơ doanh nghiệp', 404);

        const branches = await prisma.companyBranch.findMany({
            where: { employerId: profile.id },
            orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
            include: {
                _count: { select: { jobs: true } },
            },
        });

        return successResponse(branches);
    } catch (error) {
        console.error('Get branches error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

// ─── POST: Create a branch ───
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
        }

        const profile = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
            select: { id: true },
        });

        if (!profile) return errorResponse('Chưa có hồ sơ doanh nghiệp', 404);

        const body = await request.json();
        const { name, address, phone, managerName, managerPhone, isMain } = body;

        if (!name?.trim() || !address?.trim()) {
            return errorResponse('Vui lòng nhập tên và địa chỉ chi nhánh', 400);
        }

        // If setting as main, unset other main branches
        if (isMain) {
            await prisma.companyBranch.updateMany({
                where: { employerId: profile.id, isMain: true },
                data: { isMain: false },
            });
        }

        const branch = await prisma.companyBranch.create({
            data: {
                employerId: profile.id,
                name: name.trim(),
                address: address.trim(),
                phone: phone?.trim() || null,
                managerName: managerName?.trim() || null,
                managerPhone: managerPhone?.trim() || null,
                isMain: isMain || false,
            },
        });

        return successResponse(branch, 201);
    } catch (error) {
        console.error('Create branch error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
