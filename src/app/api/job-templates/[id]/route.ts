import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/job-templates/:id
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const template = await prisma.jobTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            return errorResponse('Không tìm thấy mẫu', 404);
        }

        return successResponse({
            id: template.id,
            title: template.title,
            description: template.description,
            requirements: template.requirements,
            benefits: template.benefits,
            defaultSalaryMin: template.defaultSalaryMin,
            defaultSalaryMax: template.defaultSalaryMax,
            suggestedShifts: template.suggestedShifts,
            category: template.category,
            categoryId: template.categoryId,
        });
    } catch (error) {
        console.error('Get job template error:', error);
        return errorResponse('Đã xảy ra lỗi khi tải mẫu', 500);
    }
}
