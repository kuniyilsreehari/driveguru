'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JobsPage() {
    const router = useRouter();
    
    useEffect(() => {
        // Correctly redirect to the restored vacancies page
        router.replace('/vacancies');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <p className="text-muted-foreground">Redirecting to Vacancies Board...</p>
            </div>
        </div>
    );
}
