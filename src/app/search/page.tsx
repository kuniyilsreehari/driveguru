'use client';

import { Suspense, useMemo, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, limit, or, and, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
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

    const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
    const { data: appConfig } = useDoc<any>(appConfigDocRef);

    useEffect(() => {
        const geocodeLocation = async () => {
            // Priority: lat/lon params > location query > city/state/pincode
            if (latParam && lonParam) {
                setSearchCenter({ lat: parseFloat(latParam), lon: parseFloat(lonParam) });
                return;
            }

            const locationString = locationQuery || [city, state, pincode].filter(Boolean).join(', ');
            
            // Only geocode if we HAVE a radius and a location string
            if (!locationString || !radius) {
                setSearchCenter(null);
                return;
            }

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

        // Filter out hidden profiles
        experts = experts.filter(e => {
            if (!e.hiddenUntil) return true;
            return (e.hiddenUntil as any).toDate() < new Date();
        });

        // 1. PINCODE FILTER (Highest Priority)
        // If a 6-digit pincode is provided, we strictly match it first
        if (pincode && pincode.length === 6) {
            const matchedInZip = experts.filter(e => e.pincode === pincode);
            if (matchedInZip.length > 0) {
                experts = matchedInZip;
            }
        }

        // 2. KEYWORD FILTER (Name, Profession, Skill)
        if (searchQueryParam) {
            const keywords = searchQueryParam.toLowerCase().split(' ').filter(kw => kw);
            experts = experts.filter(expert => {
                return keywords.every(keyword => {
                    const searchable = [
                        expert.firstName, expert.lastName, expert.companyName, 
                        expert.role, expert.skills, expert.qualification,
                        expert.category, expert.profession, expert.city,
                        expert.state, expert.pincode, expert.address
                    ].map(v => (v || '').toLowerCase()).join(' ');
                    
                    return searchable.includes(keyword);
                });
            });
        }
        
        // 3. DISTANCE FILTER (If radius and center are set)
        if (radius && searchCenter) {
             experts = experts.filter(expert => {
                if (expert.latitude && expert.longitude) {
                    const distance = getDistance(searchCenter.lat, searchCenter.lon, expert.latitude, expert.longitude);
                    return distance <= radius;
                }
                return false;
            });
        } else {
            // Text-based fallback location filtering
            if (city) {
                const lowCity = city.toLowerCase();
                experts = experts.filter(e => (e.city || '').toLowerCase().includes(lowCity));
            }
            if (state) {
                const lowState = state.toLowerCase();
                experts = experts.filter(e => (e.state || '').toLowerCase().includes(lowState));
            }
             if (locationQuery) {
                const lowLoc = locationQuery.toLowerCase();
                experts = experts.filter(e => 
                    (e.city || '').toLowerCase().includes(lowLoc) ||
                    (e.state || '').toLowerCase().includes(lowLoc) ||
                    (e.address || '').toLowerCase().includes(lowLoc)
                );
            }
        }
        
        // 4. BUDGET FILTER
        if (maxRate !== null) {
            experts = experts.filter(expert =>
                expert.pricingValue !== undefined && expert.pricingValue <= maxRate
            );
        }
        
        // SORTING: Tier (Elite first) -> Verified -> Recent
        experts.sort((a, b) => {
            const tierOrder = { 'Super Premier': 0, 'Premier': 1, 'Standard': 2 };
            const aTier = a.tier || 'Standard';
            const bTier = b.tier || 'Standard';

            if (tierOrder[aTier] !== tierOrder[bTier]) return tierOrder[aTier] - tierOrder[bTier];
            if (a.verified !== b.verified) return a.verified ? -1 : 1;
            return 0;
        });

        return experts;

    }, [allExperts, searchQueryParam, city, state, pincode, maxRate, radius, searchCenter, isGeocoding, locationQuery]);


    if (isLoading || isGeocoding || filteredExperts === null) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
                    {isGeocoding ? 'Calculating Coordinates...' : 'Filtering Professionals...'}
                </p>
            </div>
        );
    }
    
    const experts = filteredExperts;

    if (experts.length === 0) {
        return (
            <Card className="w-full text-center p-12 bg-[#24262d] border-none rounded-[2.5rem] shadow-2xl">
                <CardHeader>
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/5 mb-6">
                        <SearchX className="h-10 w-10 text-orange-500/20" />
                    </div>
                    <CardTitle className="text-3xl font-black text-white uppercase italic">Zero Matches Found</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                        No professionals matched your exact criteria. Try broadening your location or budget range.
                    </p>
                    <Button variant="link" className="text-orange-500 font-black uppercase tracking-widest text-[10px]" onClick={() => router.push('/')}>
                        Reset all filters
                    </Button>
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
            titleParts.push(<span key="role" className="text-orange-500">{roleQuery}s</span>);
        } else if (searchQueryParam) {
             titleParts.push(<span key="query">Matches for &quot;<span className="text-orange-500">{searchQueryParam}</span>&quot;</span>);
        } else {
             titleParts.push(<span key="all">Registry Result</span>);
        }

        if (radius) {
             titleParts.push(<span key="radius"> within {radius}km</span>);
        }


        if (locationParts.length > 0) {
            titleParts.push(<span key="locationName"> in <span className="text-orange-500">{locationParts.join(', ')}</span></span>);
        } else if (latParam && lonParam) {
            titleParts.push(<span key="locationName"> near your location</span>);
        }

        return <>{titleParts.map((part, i) => <span key={i}>{part}</span>)}</>
    }

    return (
        <div className="space-y-8">
            <div className='flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/5'>
                 <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
                    {searchTitle()}
                </h2>
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-none font-black h-8 px-4 rounded-xl uppercase text-[10px]">
                    {experts.length} Professional{experts.length === 1 ? '' : 's'}
                </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {experts.map(expert => (
                    <ExpertCard key={expert.id} expert={expert} />
                ))}
            </div>
        </div>
    );
}


export default function SearchPage() {
    return (
        <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="pb-8">
                    <Button variant="outline" asChild className="rounded-xl border-white/10 bg-transparent text-white font-black h-10 px-6 uppercase text-[10px] tracking-widest hover:bg-white/5">
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Return to Home</Link>
                    </Button>
                </header>
                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                        </div>
                    }>
                        <SearchResults />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
