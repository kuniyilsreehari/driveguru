

'use client';

import { Suspense, useMemo } from 'react';
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
    const maxRateParam = searchParams.get('maxRate');
    const maxRate = maxRateParam ? parseInt(maxRateParam, 10) : null;

    const expertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        
        let constraints = [];

        if (verified) {
            constraints.push(where('verified', '==', true));
        }

        if (available) {
            constraints.push(where('isAvailable', '==', true));
        }
        
        // We will query with basic filters first, then apply text and location search on the client.
        if (constraints.length > 0) {
            return query(collection(firestore, 'users'), ...constraints);
        }

        return query(collection(firestore, 'users'));

    }, [firestore, verified, available]);

    const { data: allExperts, isLoading } = useCollection<ExpertUser>(expertsQuery);
    
    const filteredExperts = useMemo(() => {
        if (!allExperts) return null;
        
        let experts = allExperts;

        // Filter by search query
        if (searchQueryParam) {
            const lowercasedQuery = searchQueryParam.toLowerCase();
            experts = experts.filter(expert => {
                const name = `${expert.firstName || ''} ${expert.lastName || ''}`.toLowerCase();
                const company = expert.companyName?.toLowerCase() || '';
                const role = expert.role?.toLowerCase() || '';
                const skills = expert.skills?.toLowerCase() || '';

                return name.includes(lowercasedQuery) ||
                       company.includes(lowercasedQuery) ||
                       role.includes(lowercasedQuery) ||
                       skills.includes(lowercasedQuery);
            });
        }

        // Filter by location
        if (location) {
            const lowercasedLocation = location.toLowerCase();
            experts = experts.filter(expert => 
                expert.location?.toLowerCase().includes(lowercasedLocation)
            );
        }
        
        // Filter by max rate
        if (maxRate !== null) {
            experts = experts.filter(expert =>
                expert.hourlyRate !== undefined && expert.hourlyRate <= maxRate
            );
        }
        
        // Sort experts
        experts.sort((a, b) => {
            const tierOrder = { 'Super Premier': 0, 'Premier': 1, 'Standard': 2 };
            const aTier = a.tier || 'Standard';
            const bTier = b.tier || 'Standard';

            // Sort by tier first
            if (tierOrder[aTier] !== tierOrder[bTier]) {
                return tierOrder[aTier] - tierOrder[bTier];
            }

            // If tiers are the same, sort by verification status (verified first)
            if (a.verified !== b.verified) {
                return a.verified ? -1 : 1;
            }

            return 0;
        });

        return experts;

    }, [allExperts, searchQueryParam, location, maxRate]);


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
             titleParts.push(<span key="all">Showing experts</span>);
        }

        if (locationName) {
            titleParts.push(<span key="locationName"> in <span className="text-primary">{locationName}</span></span>);
        } else if (location) {
            titleParts.push(<span key="location"> near <span className="text-primary">{location}</span></span>);
        }

        return <>{titleParts.map((part, i) => <span key={i}>{part}</span>)}</>
    }

    return (
        <div className="space-y-6">
            <div className='flex items-center justify-between'>
                 <h2 className="text-2xl font-bold">
                    {searchTitle()}
                </h2>
                <p className="text-muted-foreground">{experts.length} result{experts.length === 1 ? '' : 's'} found.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {experts.map(expert => (
                    <ExpertCard key={expert.id} expert={expert} />
                ))}
            </div>
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
