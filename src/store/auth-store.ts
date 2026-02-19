'use client';

import { create } from 'zustand';

interface User {
    id: string;
    email?: string | null;
    phone?: string | null;
    role: string;
    avatarUrl?: string;
    phoneVerified?: boolean;
    emailVerified?: boolean;
    firebaseUid?: string;
    candidateProfile?: Record<string, unknown>;
    employerProfile?: Record<string, unknown>;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
    fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,

    setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

    setLoading: (isLoading) => set({ isLoading }),

    logout: async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {
            console.error('Logout error:', e);
        }
        set({ user: null, isAuthenticated: false });

        // Force redirect to home page
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    },

    fetchUser: async () => {
        try {
            console.log('fetchUser: starting...');
            set({ isLoading: true });
            const res = await fetch('/api/auth/me', {
                credentials: 'include',
                cache: 'no-store',
                headers: { 'Pragma': 'no-cache' }
            });
            console.log('fetchUser: response status', res.status);

            if (res.status === 401) {
                console.log('fetchUser: 401 Unauthorized - Server rejected session');
                // Attempt to read body for error details
                try {
                    const err = await res.json();
                    console.log('fetchUser: 401 Details:', err);
                } catch (e) { }
                set({ user: null, isAuthenticated: false, isLoading: false });
                return;
            }

            const data = await res.json();
            console.log('fetchUser: data', data);

            if (data.success) {
                set({ user: data.data.user, isAuthenticated: true, isLoading: false });
            } else {
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        } catch (e) {
            console.error('fetchUser error:', e);
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
}));
