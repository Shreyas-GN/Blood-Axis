"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/request/wizard');
    }, [router]);

    return (
        <div className="pt-24 px-6 max-w-md mx-auto">
            <p className="text-[var(--color-text-muted)] font-medium">Redirecting...</p>
        </div>
    );
}
