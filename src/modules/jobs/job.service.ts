/**
 * Jobs Module - Service Layer
 * 
 * Encapsulates all job-related business logic.
 * Separated from API route handlers for testability and reuse.
 * 
 * Module structure:
 *   src/modules/jobs/
 *     job.service.ts      ← Business logic (this file)
 *     job.types.ts        ← Type definitions
 *     job.repository.ts   ← Database queries (future)
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { apiLogger } from '@/lib/logger';
import { eventBus } from '@/lib/events';

export class JobService {
    /**
     * List jobs with filtering, sorting, pagination
     */
    static async list(request: NextRequest) {
        try {
            const { searchParams } = new URL(request.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50); // Max 50
            const search = searchParams.get('search') || '';
            const category = searchParams.get('category') || '';
            const city = searchParams.get('city') || '';
            const jobType = searchParams.get('jobType') || '';
            const shift = searchParams.get('shift') || '';
            const salaryMin = searchParams.get('salaryMin');
            const salaryMax = searchParams.get('salaryMax');
            const isUrgent = searchParams.get('isUrgent');
            const noExperience = searchParams.get('noExperience');
            const sort = searchParams.get('sort') || 'newest';

            const where: Record<string, unknown> = {
                status: 'ACTIVE',
            };

            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { employer: { businessName: { contains: search, mode: 'insensitive' } } },
                ];
            }

            if (category) where.categoryId = category;
            if (city) where.city = { contains: city, mode: 'insensitive' };
            if (jobType) where.jobType = jobType;
            if (shift) where.shift = shift;
            if (salaryMin) where.salaryMax = { gte: parseInt(salaryMin) };
            if (salaryMax) where.salaryMin = { lte: parseInt(salaryMax) };
            if (isUrgent === 'true') where.isUrgent = true;
            if (noExperience === 'true') where.experienceRequired = 0;

            const orderBy: Record<string, string> = {};
            switch (sort) {
                case 'salary_high': orderBy.salaryMax = 'desc'; break;
                case 'salary_low': orderBy.salaryMin = 'asc'; break;
                case 'popular': orderBy.viewCount = 'desc'; break;
                default: orderBy.createdAt = 'desc';
            }

            const [jobs, total] = await Promise.all([
                prisma.job.findMany({
                    where,
                    include: {
                        employer: {
                            select: {
                                businessName: true,
                                logoUrl: true,
                            },
                        },
                        category: {
                            select: { name: true, slug: true },
                        },
                        _count: {
                            select: { applications: true },
                        },
                    },
                    orderBy: [
                        { isFeatured: 'desc' },
                        orderBy,
                    ],
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.job.count({ where }),
            ]);

            return paginatedResponse(jobs, total, page, limit);
        } catch (error) {
            apiLogger.error('JobService.list error', { error });
            return errorResponse('Đã xảy ra lỗi khi tải danh sách việc làm', 500);
        }
    }

    /**
     * Create a new job posting
     */
    static async create(request: NextRequest) {
        try {
            const token = request.cookies.get('token')?.value;
            if (!token) return errorResponse('Chưa đăng nhập', 401);

            const payload = verifyToken(token);
            if (!payload || payload.role !== 'EMPLOYER') {
                return errorResponse('Chỉ nhà tuyển dụng mới có thể đăng tin', 403);
            }

            const employer = await prisma.employerProfile.findUnique({
                where: { userId: payload.userId },
            });

            if (!employer) {
                return errorResponse('Vui lòng tạo hồ sơ công ty trước', 400);
            }

            const body = await request.json();
            const {
                title, description, requirements, benefits,
                salaryMin, salaryMax, salaryNegotiable,
                location, district, city,
                jobType, shift, experienceRequired,
                genderRequirement, positions, categoryId,
                branchId, isUrgent, expiresAt,
                screeningQuestions,
            } = body;

            if (!title || !description || !location) {
                return errorResponse('Thiếu thông tin bắt buộc', 400);
            }

            // Validate branchId belongs to this employer
            if (branchId) {
                const branch = await prisma.companyBranch.findFirst({
                    where: { id: branchId, employerId: employer.id },
                });
                if (!branch) {
                    return errorResponse('Chi nhánh không hợp lệ', 400);
                }
            }

            const job = await prisma.job.create({
                data: {
                    employerId: employer.id,
                    title,
                    description,
                    requirements,
                    benefits,
                    salaryMin: salaryMin ? parseInt(salaryMin) : null,
                    salaryMax: salaryMax ? parseInt(salaryMax) : null,
                    salaryNegotiable: salaryNegotiable || false,
                    location,
                    district,
                    city,
                    jobType: jobType || 'FULLTIME',
                    shift,
                    experienceRequired: experienceRequired ? parseInt(experienceRequired) : 0,
                    genderRequirement,
                    positions: positions ? parseInt(positions) : 1,
                    categoryId,
                    branchId,
                    isUrgent: isUrgent || false,
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                },
                include: {
                    employer: {
                        select: { businessName: true, logoUrl: true },
                    },
                    category: true,
                },
            });

            // Create screening questions if provided
            if (screeningQuestions && Array.isArray(screeningQuestions) && screeningQuestions.length > 0) {
                await prisma.screeningQuestion.createMany({
                    data: screeningQuestions.map((q: { question: string; isRequired?: boolean }, i: number) => ({
                        jobId: job.id,
                        question: q.question,
                        isRequired: q.isRequired ?? true,
                        sortOrder: i,
                    })),
                });
            }

            // Emit event for downstream processing
            eventBus.emit('job.created', {
                jobId: job.id,
                employerId: employer.id,
                categoryId: categoryId || undefined,
            });

            apiLogger.info('Job created', { jobId: job.id, title, employerId: employer.id });

            return successResponse(job, 201);
        } catch (error) {
            apiLogger.error('JobService.create error', { error });
            return errorResponse('Đã xảy ra lỗi khi tạo tin tuyển dụng', 500);
        }
    }
}
