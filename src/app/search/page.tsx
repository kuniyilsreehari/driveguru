

'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, limit } from 'firebase/firestore';
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
    const locationName = searchParams.get('locationName');
    const verified = searchParams.get('verified') === 'true';
    const available = searchParams.get('available') === 'true';

    const expertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        
        let q = query(collection(firestore, 'users'));

        if (verified) {
            q = query(q, where('verified', '==', true));
        }

        if (available) {
            q = query(q, where('isAvailable', '==', true));
        }

        if (category) {
            q = query(q, where('category', '==', category));
        }

        // Firestore does not support robust text search on parts of a string (like location).
        // A more advanced solution like Algolia would be needed for that.
        // For now, we will filter by category and let the user see the location on the card.

        return q;
    }, [firestore, category, verified, available]);

    const { data: experts, isLoading } = useCollection<ExpertUser>(expertsQuery);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Searching for experts...</p>
            </div>
        );
    }

    if (!experts || experts.length === 0) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-semibold">No Experts Found</h2>
                <p className="text-muted-foreground mt-2">Try adjusting your search filters or check back later.</p>
            </div>
        );
    }

    const searchTitle = () => {
        let titleParts: (string | JSX.Element)[] = [];
        if (category) {
            titleParts.push(<span key="category">Showing <span className="text-primary">{category}</span> experts</span>);
        } else {
            titleParts.push(<span key="all">Showing all experts</span>);
        }

        if (locationName) {
            titleParts.push(<span key="locationName"> in <span className="text-primary">{locationName}</span></span>);
        }
        
        if (location && !locationName) {
            titleParts.push(<span key="location"> near <span className="text-primary">{location}</span></span>);
        }

        if (category && (location || locationName)) {
            titleParts.push(<span key="all_locations">. Results visible for all locations.</span>);
        } else if (!category && (location || locationName)) {
             titleParts.push(<span key="all_locations_else">. Results visible for all locations.</span>);
        }

        return <>{titleParts}</>
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
