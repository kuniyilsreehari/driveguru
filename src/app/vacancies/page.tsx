'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function VacanciesPage() {
    const router = useRouter();
    
    useEffect(() => {
        // standalone vacancies page has been removed in favor of the Public Feed
        router.replace('/feed');
    }, [router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Redirecting to Public Feed...</p>
        </div>
    );
}
