

'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, limit, or } from 'firebase/firestore';
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

    const searchQueryParam = searchParams.get('q');
    const location = searchParams.get('location');
    const locationName = searchParams.get('locationName');
    const verified = searchParams.get('verified') === 'true';
    const available = searchParams.get('available') === 'true';

    const expertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        
        let constraints = [];

        if (verified) {
            constraints.push(where('verified', '==', true));
        }

        if (available) {
            constraints.push(where('isAvailable', '==', true));
        }
        
        // Firestore does not support case-insensitive search or partial text search natively.
        // For a simple search, we can use multiple `where` clauses with an `or` condition.
        // This is still limited but better than nothing.
        // For a robust solution, a dedicated search service like Algolia is recommended.
        if (searchQueryParam) {
            const q = searchQueryParam.trim();
            // This will not work as Firestore does not support 'OR' queries on different fields.
            // We will filter on the client side.
        }
        
        if (constraints.length > 0) {
            return query(collection(firestore, 'users'), ...constraints);
        }

        return query(collection(firestore, 'users'));

    }, [firestore, verified, available]);

    const { data: allExperts, isLoading } = useCollection<ExpertUser>(expertsQuery);
    
    const filteredExperts = useMemoFirebase(() => {
        if (!allExperts) return null;
        if (!searchQueryParam) return allExperts;

        const lowercasedQuery = searchQueryParam.toLowerCase();
        
        return allExperts.filter(expert => {
            const name = `${expert.firstName || ''} ${expert.lastName || ''}`.toLowerCase();
            const company = expert.companyName?.toLowerCase() || '';
            const role = expert.role?.toLowerCase() || '';
            const skills = expert.skills?.toLowerCase() || '';

            return name.includes(lowercasedQuery) ||
                   company.includes(lowercasedQuery) ||
                   role.includes(lowercasedQuery) ||
                   skills.includes(lowercasedQuery);
        });

    }, [allExperts, searchQueryParam]);


    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Searching for experts...</p>
            </div>
        );
    }
    
    const experts = filteredExperts;

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
        
        if (searchQueryParam) {
             titleParts.push(<span key="query">Results for &quot;<span className="text-primary">{searchQueryParam}</span>&quot;</span>);
        } else {
             titleParts.push(<span key="all">Showing all experts</span>);
        }

        if (locationName) {
            titleParts.push(<span key="locationName"> in <span className="text-primary">{locationName}</span></span>);
        }
        
        if (location && !locationName) {
            titleParts.push(<span key="location"> near <span className="text-primary">{location}</span></span>);
        }
        
        if (searchQueryParam && (location || locationName)) {
            titleParts.push(<span key="all_locations_else">. Location filter is not applied.</span>);
        } else if (location || locationName) {
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
