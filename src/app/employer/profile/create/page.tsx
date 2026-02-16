'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy redirect: /employer/profile/create → /employer/profile
 * The new profile page handles both CREATE and UPDATE modes automatically.
 */
export default function CreateEmployerProfileRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/employer/profile');
    }, [router]);

    return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <p className="text-slate-400">Đang chuyển hướng...</p>
        </div>
    );
}
