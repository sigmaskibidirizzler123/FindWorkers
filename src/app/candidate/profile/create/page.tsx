'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy redirect: /candidate/profile/create → /candidate/profile
 * The new profile page handles both CREATE and UPDATE modes automatically.
 */
export default function CreateCandidateProfileRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/candidate/profile');
    }, [router]);

    return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <p className="text-slate-400">Đang chuyển hướng...</p>
        </div>
    );
}
