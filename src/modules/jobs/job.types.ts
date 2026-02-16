/**
 * Jobs Module - Type Definitions
 */

export interface CreateJobInput {
    title: string;
    description: string;
    requirements?: string;
    benefits?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryNegotiable?: boolean;
    location: string;
    district?: string;
    city?: string;
    jobType?: 'FULLTIME' | 'PARTTIME' | 'CONTRACT' | 'SEASONAL' | 'SHIFT';
    shift?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'FLEXIBLE';
    experienceRequired?: number;
    genderRequirement?: string;
    positions?: number;
    categoryId?: string;
    branchId?: string;
    isUrgent?: boolean;
    expiresAt?: string;
    screeningQuestions?: {
        question: string;
        isRequired?: boolean;
    }[];
}

export interface JobListFilters {
    search?: string;
    category?: string;
    city?: string;
    jobType?: string;
    shift?: string;
    salaryMin?: number;
    salaryMax?: number;
    isUrgent?: boolean;
    noExperience?: boolean;
    sort?: 'newest' | 'salary_high' | 'salary_low' | 'popular';
    page?: number;
    limit?: number;
}

export interface JobListResponse {
    id: string;
    title: string;
    location: string;
    city?: string;
    salaryMin?: number;
    salaryMax?: number;
    isUrgent: boolean;
    isFeatured: boolean;
    employer: {
        companyName: string;
        logoUrl?: string;
        isVerified: boolean;
    };
    category?: {
        name: string;
        slug: string;
    };
    _count: {
        applications: number;
    };
}
