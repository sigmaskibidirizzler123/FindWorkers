/**
 * Employer Branch by ID API
 * 
 * PUT    - Update a branch
 * DELETE - Delete a branch
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

// ─── PUT: Update branch ───
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
            return errorResponse('Không có quyền', 403);
        }

        const profile = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
            select: { id: true },
        });

        if (!profile) return errorResponse('Chưa có hồ sơ', 404);

        // Verify branch belongs to employer
        const branch = await prisma.companyBranch.findFirst({
            where: { id, employerId: profile.id },
        });

        if (!branch) return errorResponse('Không tìm thấy chi nhánh', 404);

        const body = await request.json();
        const { name, address, phone, managerName, managerPhone, isMain } = body;

        // If setting as main, unset other main branches
        if (isMain && !branch.isMain) {
            await prisma.companyBranch.updateMany({
                where: { employerId: profile.id, isMain: true },
                data: { isMain: false },
            });
        }

        const updated = await prisma.companyBranch.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(address !== undefined && { address: address.trim() }),
                ...(phone !== undefined && { phone: phone?.trim() || null }),
                ...(managerName !== undefined && { managerName: managerName?.trim() || null }),
                ...(managerPhone !== undefined && { managerPhone: managerPhone?.trim() || null }),
                ...(isMain !== undefined && { isMain }),
            },
        });

        return successResponse(updated);
    } catch (error) {
        console.error('Update branch error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

// ─── DELETE: Remove branch ───
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
            return errorResponse('Không có quyền', 403);
        }

        const profile = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
            select: { id: true },
        });

        if (!profile) return errorResponse('Chưa có hồ sơ', 404);

        // Verify branch belongs to employer
        const branch = await prisma.companyBranch.findFirst({
            where: { id, employerId: profile.id },
        });

        if (!branch) return errorResponse('Không tìm thấy chi nhánh', 404);

        await prisma.companyBranch.delete({ where: { id } });

        return successResponse({ message: 'Đã xóa chi nhánh' });
    } catch (error) {
        console.error('Delete branch error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
