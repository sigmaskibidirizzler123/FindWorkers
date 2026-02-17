/**
 * Admin Categories Management API
 * GET    - List all categories with hierarchy
 * POST   - Create new category
 * PATCH  - Update category
 * DELETE - Soft delete (hide) category
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

function requireAdmin(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    if (!token) throw new Error('Unauthorized');
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') throw new Error('Forbidden');
    return payload;
}

export async function GET(request: NextRequest) {
    try {
        requireAdmin(request);
    } catch {
        return errorResponse('Không có quyền truy cập', 403);
    }

    try {
        const categories = await prisma.category.findMany({
            include: {
                children: {
                    include: {
                        _count: { select: { jobs: true } },
                    },
                },
                _count: { select: { jobs: true } },
            },
            where: { parentId: null },
            orderBy: { name: 'asc' },
        });

        // Also get flat list for editing
        const allCategories = await prisma.category.findMany({
            include: {
                _count: { select: { jobs: true } },
                parent: { select: { id: true, name: true } },
            },
            orderBy: { name: 'asc' },
        });

        return successResponse({
            tree: categories,
            flat: allCategories,
            total: allCategories.length,
        });
    } catch (error) {
        console.error('[Admin] List categories error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function POST(request: NextRequest) {
    let adminPayload;
    try {
        adminPayload = requireAdmin(request);
    } catch {
        return errorResponse('Không có quyền truy cập', 403);
    }

    try {
        const body = await request.json();
        const { name, icon, parentId } = body;

        if (!name) {
            return errorResponse('Tên danh mục là bắt buộc', 400);
        }

        // Generate slug
        const slug = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Check duplicate slug
        const existing = await prisma.category.findUnique({ where: { slug } });
        if (existing) {
            return errorResponse('Danh mục đã tồn tại', 409);
        }

        const category = await prisma.category.create({
            data: {
                name,
                slug,
                icon: icon || null,
                parentId: parentId || null,
            },
        });

        // Log
        await prisma.activityLog.create({
            data: {
                userId: adminPayload.userId,
                action: 'CATEGORY_CREATE',
                entity: 'Category',
                entityId: category.id,
                metadata: { name, slug },
            },
        });

        return successResponse(category, 201);
    } catch (error) {
        console.error('[Admin] Create category error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function PATCH(request: NextRequest) {
    let adminPayload;
    try {
        adminPayload = requireAdmin(request);
    } catch {
        return errorResponse('Không có quyền truy cập', 403);
    }

    try {
        const body = await request.json();
        const { id, name, icon, parentId } = body;

        if (!id) return errorResponse('ID là bắt buộc', 400);

        const updateData: Record<string, unknown> = {};
        if (name) {
            updateData.name = name;
            updateData.slug = name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        if (icon !== undefined) updateData.icon = icon;
        if (parentId !== undefined) updateData.parentId = parentId || null;

        const category = await prisma.category.update({
            where: { id },
            data: updateData,
        });

        await prisma.activityLog.create({
            data: {
                userId: adminPayload.userId,
                action: 'CATEGORY_UPDATE',
                entity: 'Category',
                entityId: id,
                metadata: updateData as any,
            },
        });

        return successResponse(category);
    } catch (error) {
        console.error('[Admin] Update category error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

export async function DELETE(request: NextRequest) {
    let adminPayload;
    try {
        adminPayload = requireAdmin(request);
    } catch {
        return errorResponse('Không có quyền truy cập', 403);
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return errorResponse('ID là bắt buộc', 400);

        // Check if category has jobs
        const jobCount = await prisma.job.count({ where: { categoryId: id } });
        if (jobCount > 0) {
            return errorResponse(`Không thể xóa danh mục đang có ${jobCount} tin tuyển dụng`, 400);
        }

        await prisma.category.delete({ where: { id } });

        await prisma.activityLog.create({
            data: {
                userId: adminPayload.userId,
                action: 'CATEGORY_DELETE',
                entity: 'Category',
                entityId: id,
            },
        });

        return successResponse({ message: 'Đã xóa danh mục' });
    } catch (error) {
        console.error('[Admin] Delete category error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
