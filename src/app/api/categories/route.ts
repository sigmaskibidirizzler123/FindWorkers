import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            where: { parentId: null },
            include: {
                children: {
                    include: {
                        children: true,
                        _count: {
                            select: { jobs: true },
                        },
                    },
                },
                _count: {
                    select: { jobs: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        return successResponse(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
