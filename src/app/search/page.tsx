

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
    const locationName = searchParams.get('locationName');

    const usersCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        
        let q = query(collection(firestore, 'users'));

        // Always filter for verified users on the public search page
        q = query(q, where('verified', '==', true));

        if (category) {
            q = query(q, where('category', '==', category));
        }

        // Firestore does not support robust text search on parts of a string (like location).
        // A more advanced solution like Algolia would be needed for that.
        // For now, we will filter by category and let the user see the location on the card.

        return q;
    }, [firestore, category]);

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
        let titleParts: (string | JSX.Element)[] = [];
        if (category) {
            titleParts.push(<>Showing <span className="text-primary">{category}</span> experts</>);
        } else {
            titleParts.push(<>Showing all experts</>);
        }

        if (locationName) {
            titleParts.push(<> in <span className="text-primary">{locationName}</span></>);
        }
        
        if (location && !locationName) {
            titleParts.push(<> near <span className="text-primary">{location}</span></>);
        } else if (location && locationName) {
            titleParts.push(<>,</>);
        }

        if (category && (location || locationName)) {
            titleParts.push(<>. Results visible for all locations.</>);
        } else {
             titleParts.push(<>. Results visible for all locations.</>);
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
