
'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, or, and } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Award } from 'lucide-react';
import { ExpertCard } from '@/components/expert-card';
import type { ExpertUser } from '@/components/expert-card';

function FeaturedExpertsContent() {
    const firestore = useFirestore();

    const expertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        
        return query(
            collection(firestore, 'users'), 
            where('verified', '==', true),
            or(
                where('tier', '==', 'Premier'),
                where('tier', '==', 'Super Premier')
            )
        );
    }, [firestore]);

    const { data: experts, isLoading } = useCollection<ExpertUser>(expertsQuery);

    const sortedExperts = useMemo(() => {
        if (!experts) return [];
        return [...experts].sort((a, b) => {
            const tierOrder = { 'Super Premier': 0, 'Premier': 1, 'Standard': 2 };
            const aTier = a.tier || 'Standard';
            const bTier = b.tier || 'Standard';
            return tierOrder[aTier] - tierOrder[bTier];
        });
    }, [experts]);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading featured experts...</p>
            </div>
        );
    }
    
    if (!sortedExperts || sortedExperts.length === 0) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-semibold">No Featured Experts Found</h2>
                <p className="text-muted-foreground mt-2">Check back later to see our top-tier talent.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedExperts.map(expert => (
                <ExpertCard key={expert.id} expert={expert} />
            ))}
        </div>
    );
}


export default function FeaturedExpertsPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="pb-8 text-center">
                     <div className="flex items-center justify-center gap-3 mb-4">
                        <Award className="h-10 w-10 text-primary" />
                        <h1 className="text-4xl sm:text-5xl font-bold">Featured Experts</h1>
                    </div>
                    <p className="text-muted-foreground">Our top-tier, most experienced professionals.</p>
                </header>
                <main>
                    <div className="mb-6">
                        <Button variant="outline" asChild>
                            <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                        </Button>
                    </div>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <FeaturedExpertsContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
