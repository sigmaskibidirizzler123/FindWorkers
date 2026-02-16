import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/job-templates?category=FNB
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || '';
        const categoryId = searchParams.get('categoryId') || '';

        const where: Record<string, unknown> = {
            isActive: true,
        };

        if (category) {
            where.category = category;
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        const templates = await prisma.jobTemplate.findMany({
            where,
            select: {
                id: true,
                title: true,
                category: true,
                categoryId: true,
                defaultSalaryMin: true,
                defaultSalaryMax: true,
                suggestedShifts: true,
            },
            orderBy: { sortOrder: 'asc' },
        });

        return successResponse(templates);
    } catch (error) {
        console.error('Get job templates error:', error);
        return errorResponse('Đã xảy ra lỗi khi tải danh sách mẫu', 500);
    }
}
