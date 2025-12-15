
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, MapPin, Star, IndianRupee, Briefcase, Calendar, Phone, MessageCircle, ChevronLeft, ChevronDown, UserCheck, Crown, Sparkles } from 'lucide-react';
import { ExpertCard } from '@/components/expert-card';
import type { ExpertUser } from '@/components/expert-card';


function SearchResults() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const router = useRouter();

    const location = searchParams.get('location');
    const category = searchParams.get('category');

    const usersCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        
        let q = query(collection(firestore, 'users'), where('verified', '==', true));

        if (category) {
            q = query(q, where('category', '==', category));
        }

        if (location) {
             const locationLower = location.toLowerCase();
             q = query(q, where('location', '>=', locationLower), where('location', '<=', locationLower + '\uf8ff'));
        }

        return q;
    }, [firestore, location, category]);

    const { data: experts, isLoading } = useCollection<ExpertUser>(usersCollectionRef);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Searching for verified experts...</p>
            </div>
        );
    }

    if (!experts || experts.length === 0) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-semibold">No Verified Experts Found</h2>
                <p className="text-muted-foreground mt-2">Try adjusting your search filters or check back later.</p>
            </div>
        );
    }

    const searchTitle = () => {
        if (location && category) {
            return <>Searching for <span className="text-primary">{category}</span> experts in <span className="text-primary">{location}</span></>
        }
        if (location) {
            return <>Searching for experts in <span className="text-primary">{location}</span></>
        }
        if (category) {
            return <>Searching for <span className="text-primary">{category}</span> experts</>
        }
        return "Showing all verified experts"
    }

    return (
        <div className="space-y-6">
            <div className='flex items-center justify-between'>
                 <h2 className="text-2xl font-bold">
                    {searchTitle()}
                </h2>
                <p className="text-muted-foreground">{experts.length} result{experts.length === 1 ? '' : 's'} found.</p>
            </div>
            {experts.map(expert => (
                <ExpertCard key={expert.id} expert={expert} />
            ))}
        </div>
    );
}


export default function SearchPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="pb-8">
                    <Button variant="outline" asChild className="mb-4">
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
                </header>
                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <SearchResults />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
