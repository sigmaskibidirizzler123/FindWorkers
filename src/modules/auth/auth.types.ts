/**
 * Auth Module - Type Definitions
 */

export interface LoginInput {
    email: string;
    password: string;
}

export interface RegisterInput {
    email: string;
    password: string;
    role: 'CANDIDATE' | 'EMPLOYER';
    phone?: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        role: string;
        hasProfile?: boolean;
    };
    token: string;
}
