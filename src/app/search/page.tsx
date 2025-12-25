

'use client';

import { Suspense, useMemo, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, limit, or, and } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, MapPin, Star, IndianRupee, Briefcase, Calendar, Phone, MessageCircle, ChevronLeft, ChevronDown, UserCheck, Crown, Sparkles, SearchX } from 'lucide-react';
import { ExpertCard } from '@/components/expert-card';
import type { ExpertUser } from '@/components/expert-card';


// Haversine distance formula
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};


function SearchResults() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const router = useRouter();

    const [searchCenter, setSearchCenter] = useState<{lat: number, lon: number} | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);

    const searchQueryParam = searchParams.get('q');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const pincode = searchParams.get('pincode');
    const locationQuery = searchParams.get('location');
    const roleQuery = searchParams.get('role');
    const verified = searchParams.get('verified') === 'true';
    const available = searchParams.get('available') === 'true';
    const tierParam = searchParams.get('tier');
    const maxRateParam = searchParams.get('maxRate');
    const maxRate = maxRateParam ? parseInt(maxRateParam, 10) : null;
    const radiusParam = searchParams.get('radius');
    const radius = radiusParam ? parseInt(radiusParam, 10) : null;
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');

    useEffect(() => {
        const geocodeLocation = async () => {
            // Priority: lat/lon params > location query > city/state/pincode
            if (latParam && lonParam) {
                setSearchCenter({ lat: parseFloat(latParam), lon: parseFloat(lonParam) });
                return;
            }

            const locationString = locationQuery || [city, state, pincode].filter(Boolean).join(', ');
            if (!locationString || !radius) return;

            setIsGeocoding(true);
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationString)}&limit=1`);
                const data = await response.json();
                if (data && data.length > 0) {
                    setSearchCenter({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
                } else {
                    setSearchCenter(null); // Location not found
                }
            } catch (error) {
                console.error("Geocoding failed:", error);
                setSearchCenter(null);
            } finally {
                setIsGeocoding(false);
            }
        };

        geocodeLocation();
    }, [locationQuery, city, state, pincode, radius, latParam, lonParam]);


    const expertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;

        const baseCollection = collection(firestore, 'users');
        const constraints = [];

        if (verified) {
            constraints.push(where('verified', '==', true));
        }
        if (available) {
            constraints.push(where('isAvailable', '==', true));
        }
        if (roleQuery && roleQuery !== 'all') {
            constraints.push(where('role', '==', roleQuery));
        }
        
        // If a tier is specified in the URL, use it. Otherwise, don't filter by tier.
        if (tierParam) {
            const tiers = tierParam.split(',').filter(t => t);
            if (tiers.length > 0) {
                constraints.push(where('tier', 'in', tiers));
            }
        }

        return query(baseCollection, ...constraints);

    }, [firestore, verified, available, roleQuery, tierParam]);


    const { data: allExperts, isLoading } = useCollection<ExpertUser>(expertsQuery);
    
    const filteredExperts = useMemo(() => {
        if (!allExperts) return null;

        // Wait for geocoding to finish if distance search is active
        if (radius && !searchCenter && isGeocoding) {
            return null; // Indicates loading state for distance filter
        }
        
        let experts = allExperts;

        // Filter by search query
        if (searchQueryParam) {
            const lowercasedQuery = searchQueryParam.toLowerCase();
            experts = experts.filter(expert => {
                const name = `${expert.firstName || ''} ${expert.lastName || ''}`.toLowerCase();
                const company = expert.companyName?.toLowerCase() || '';
                const role = expert.role?.toLowerCase() || '';
                const skills = expert.skills?.toLowerCase() || '';
                const qualification = expert.qualification?.toLowerCase() || '';
                const category = expert.category?.toLowerCase() || '';
                const profession = expert.profession?.toLowerCase() || '';

                return name.includes(lowercasedQuery) ||
                       company.includes(lowercasedQuery) ||
                       role.includes(lowercasedQuery) ||
                       skills.includes(lowercasedQuery) ||
                       qualification.includes(lowercasedQuery) ||
                       category.includes(lowercasedQuery) ||
                       profession.includes(lowercasedQuery);
            });
        }
        
        // Filter by distance if radius and center are set
        if (radius && searchCenter) {
             experts = experts.filter(expert => {
                if (expert.latitude && expert.longitude) {
                    const distance = getDistance(searchCenter.lat, searchCenter.lon, expert.latitude, expert.longitude);
                    return distance <= radius;
                }
                return false;
            });
        } else {
            // Fallback to text-based location filtering if no radius search
            if (city) {
                const lowercased = city.toLowerCase();
                experts = experts.filter(expert => expert.city?.toLowerCase().includes(lowercased));
            }
            if (state) {
                const lowercased = state.toLowerCase();
                experts = experts.filter(expert => expert.state?.toLowerCase().includes(lowercased));
            }
            if (pincode) {
                const lowercased = pincode.toLowerCase();
                experts = experts.filter(expert => expert.pincode?.toLowerCase().includes(lowercased));
            }
             if (locationQuery) {
                const lowercased = locationQuery.toLowerCase();
                experts = experts.filter(expert => 
                    expert.city?.toLowerCase().includes(lowercased) ||
                    expert.state?.toLowerCase().includes(lowercased) ||
                    expert.address?.toLowerCase().includes(lowercased)
                );
            }
        }
        
        // Filter by max rate
        if (maxRate !== null) {
            experts = experts.filter(expert =>
                expert.pricingValue !== undefined && expert.pricingValue <= maxRate
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

    }, [allExperts, searchQueryParam, city, state, pincode, maxRate, radius, searchCenter, isGeocoding, locationQuery]);


    if (isLoading || isGeocoding || filteredExperts === null) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Searching for experts...</p>
            </div>
        );
    }
    
    const experts = filteredExperts;

    if (experts.length === 0) {
        return (
            <Card className="w-full text-center p-8 sm:p-12">
                <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                        <SearchX className="h-8 w-8 text-secondary-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-semibold">No Experts Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        We couldn&apos;t find any experts matching your search criteria.
                    </p>
                    <p className="text-muted-foreground mt-2">
                        Try adjusting your filters or broadening your search query.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const searchTitle = () => {
        let titleParts: (string | JSX.Element)[] = [];
        let locationParts: string[] = [];

        if(locationQuery) locationParts.push(locationQuery);
        else {
             if (city) locationParts.push(city);
            if (state) locationParts.push(state);
            if (pincode) locationParts.push(pincode);
        }
        
        if (roleQuery && roleQuery !== 'all') {
            titleParts.push(<span key="role" className="text-primary">{roleQuery}s</span>);
        } else if (searchQueryParam) {
             titleParts.push(<span key="query">Results for &quot;<span className="text-primary">{searchQueryParam}</span>&quot;</span>);
        } else {
             titleParts.push(<span key="all">Showing all subscribed experts</span>);
        }

        if (radius) {
             titleParts.push(<span key="radius"> within {radius}km</span>);
        }


        if (locationParts.length > 0) {
            titleParts.push(<span key="locationName"> in <span className="text-primary">{locationParts.join(', ')}</span></span>);
        } else if (latParam && lonParam) {
            titleParts.push(<span key="locationName"> near your location</span>);
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
