'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JobsPage() {
    const router = useRouter();
    
    useEffect(() => {
        // Redirect to the Public Feed instead of the discontinued vacancies page
        router.replace('/feed');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <p className="text-muted-foreground">Redirecting to Public Feed...</p>
            </div>
        </div>
    );
}
