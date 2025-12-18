

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building, ChevronDown, Laptop, LocateIcon, MapPin, Search, Smartphone, Wrench, Loader2, Star, UserCheck, Crown, Sparkles, HelpCircle, Bot, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { ExpertCard } from '@/components/expert-card';
import type { ExpertUser } from '@/components/expert-card';
import * as LucideIcons from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { parseSearchQuery } from '@/ai/flows/ai-search-flow';
import Link from 'next/link';


type AppConfig = {
    featuredExpertsLimit?: number;
};


function HomePageContent() {
    const [searchQuery, setSearchQuery] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [maxRate, setMaxRate] = useState<number | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const firestore = useFirestore();

    const [aiSearchQuery, setAiSearchQuery] = useState('');
    const [isParsingQuery, setIsParsingQuery] = useState(false);
    
    const { user, isUserLoading } = useUser();

    const userProfileDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<ExpertUser>(userProfileDocRef);

    const isPremiumUser = userProfile?.tier === 'Premier' || userProfile?.tier === 'Super Premier';
    const isLoadingUserData = isUserLoading || isUserProfileLoading;

    const appConfigDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'app_config', 'homepage');
    }, [firestore]);
    
    const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<AppConfig>(appConfigDocRef);
    const featuredExpertsLimit = appConfig?.featuredExpertsLimit || 3;


    const expertsQuery = useMemoFirebase(() => {
        if (!firestore || isAppConfigLoading) return null;
        return query(collection(firestore, 'users'), where('tier', '==', 'Super Premier'), limit(featuredExpertsLimit));
    }, [firestore, isAppConfigLoading, featuredExpertsLimit]);
    

    const { data: experts, isLoading: isLoadingExperts } = useCollection<ExpertUser>(expertsQuery);

    const getCurrentPosition = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
    }

    const handleDetectLocation = () => {
        setIsDetecting(true);
        getCurrentPosition().then(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                
                const address = data.address;
                const detectedCity = address.city || address.town || address.village || address.city_district || '';
                const detectedState = address.state || '';
                const detectedPincode = address.postcode || '';

                setCity(detectedCity);
                setState(detectedState);
                setPincode(detectedPincode);

                toast({
                    title: 'Location Detected',
                    description: `Your location has been set to ${[detectedCity, detectedState].filter(Boolean).join(', ')}.`,
                });

            } catch (apiError) {
                toast({
                    variant: 'destructive',
                    title: 'Could not fetch location name.',
                    description: 'Please enter your location manually.'
                });
            } finally {
                setIsDetecting(false);
            }
        }).catch((error) => {
            setIsDetecting(false);
            toast({
                variant: 'destructive',
                title: 'Unable to retrieve your location.',
                description: error.message,
            });
        });
    };

    const handleSearch = () => {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.set('q', searchQuery);
        if (city) queryParams.set('city', city);
        if (state) queryParams.set('state', state);
        if (pincode) queryParams.set('pincode', pincode);
        if (showVerifiedOnly) queryParams.set('verified', 'true');
        if (showAvailableOnly) queryParams.set('available', 'true');
        if (maxRate !== null) queryParams.set('maxRate', maxRate.toString());
        
        router.push(`/search?${queryParams.toString()}`);
    };
    
    const handleAiSearch = async () => {
        if (!isPremiumUser) {
             toast({
                variant: 'destructive',
                title: 'Premium Feature',
                description: 'Upgrade to a Premier or Super Premier plan to use AI Search.',
            });
            return;
        }

        if (!aiSearchQuery.trim()) {
            toast({ variant: 'destructive', title: "Empty Query", description: "Please enter what you're looking for."});
            return;
        }

        setIsParsingQuery(true);
        
        let userLat: number | undefined;
        let userLon: number | undefined;

        if (aiSearchQuery.toLowerCase().includes('near me') || aiSearchQuery.toLowerCase().includes('nearby')) {
            try {
                const position = await getCurrentPosition();
                userLat = position.coords.latitude;
                userLon = position.coords.longitude;
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Location Required',
                    description: 'Could not get your location for a "near me" search. Please enable location services or try a different query.'
                });
                setIsParsingQuery(false);
                return;
            }
        }

        try {
            const result = await parseSearchQuery({ query: aiSearchQuery, userLat, userLon });
            
            const queryParams = new URLSearchParams();
            if (result.searchQuery) {
                queryParams.set('q', result.searchQuery);
            }
            if (result.location) {
                queryParams.set('location', result.location);
            }
            if (result.isVerified) {
                queryParams.set('verified', 'true');
            }
            if (result.isAvailable) {
                queryParams.set('available', 'true');
            }
            if (result.maxRate) {
                queryParams.set('maxRate', result.maxRate.toString());
            }
            if (result.radius) {
                queryParams.set('radius', result.radius.toString());
            }
            if (result.lat) {
                queryParams.set('lat', result.lat.toString());
            }
            if (result.lon) {
                queryParams.set('lon', result.lon.toString());
            }
            // Add tier filter for AI search
            queryParams.set('tier', 'Premier,Super Premier');

            router.push(`/search?${queryParams.toString()}`);

        } catch (error) {
            console.error("AI search parsing failed:", error);
            toast({
                variant: 'destructive',
                title: 'AI Search Failed',
                description: 'Could not understand the query. Please try rephrasing it or use the manual filters.'
            });
        } finally {
            setIsParsingQuery(false);
        }
    };

    return (
        <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center py-8 sm:py-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-primary">DriveGuru</h1>
                    <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                        Your one-stop platform for finding trusted local service professionals and kickstarting your career.
                    </p>
                </header>

                <main>
                    <Card className="transition-all hover:border-orange-500/50 hover:shadow-orange-500/10 focus-within:border-orange-500/50 focus-within:shadow-orange-500/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Bot /> AI-Powered Search
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             {!isPremiumUser && (
                                <CardDescription className="mb-4 text-orange-400">
                                    <div className="flex items-center gap-2">
                                        <Lock />
                                        <span>
                                            This is a premium feature. <Link href="/dashboard" className="underline font-bold">Upgrade your plan</Link> to activate.
                                        </span>
                                    </div>
                                </CardDescription>
                            )}
                            <div className="flex flex-col sm:flex-row items-stretch gap-2">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="ai-search"
                                        placeholder="I'm looking for a verified plumber in Mumbai..."
                                        className={cn("pl-10 text-base", !isPremiumUser && "cursor-not-allowed")}
                                        value={aiSearchQuery}
                                        onChange={(e) => setAiSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                                        disabled={!isPremiumUser || isLoadingUserData}
                                    />
                                </div>
                                <Button onClick={handleAiSearch} disabled={isParsingQuery || !isPremiumUser || isLoadingUserData} className="w-full sm:w-auto">
                                    {isParsingQuery ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="mr-2 h-4 w-4" />
                                    )}
                                    Search with AI
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="text-center my-4 font-semibold text-muted-foreground">OR</div>

                    <Card className="p-6 sm:p-8">
                        <CardHeader className="p-0 mb-6">
                            <CardTitle className="text-2xl">Manual Search</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                             <div className="mb-4">
                                <Label htmlFor="search">I&apos;m looking for...</Label>
                                <div className="relative mt-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="e.g. 'Software Developer', 'Plumber', 'Acme Inc.'"
                                        className="pl-10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <Label>Location</Label>
                                    <Button variant="outline" size="sm" onClick={handleDetectLocation} disabled={isDetecting} className="float-right">
                                        {isDetecting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <LocateIcon className="mr-2 h-4 w-4" />
                                        )}
                                        Detect
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="city" className="text-xs text-muted-foreground">District / City</Label>
                                        <Input id="city" placeholder="e.g., Malappuram" value={city} onChange={(e) => setCity(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label htmlFor="state" className="text-xs text-muted-foreground">State</Label>
                                        <Input id="state" placeholder="e.g., Kerala" value={state} onChange={(e) => setState(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="pincode" className="text-xs text-muted-foreground">Pincode</Label>
                                    <Input id="pincode" placeholder="e.g., 679587" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                                </div>
                            </div>

                            <div className='my-6'>
                                <Label>User Type</Label>
                                <Tabs defaultValue="experts" className="mt-2">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="experts"><Briefcase className="mr-2" />Experts</TabsTrigger>
                                        <TabsTrigger value="freshers"><Icons.graduate className="mr-2" />Freshers</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                            
                            <div className="mt-6">
                                <Label htmlFor="hourly-rate">
                                    Max Hourly Rate: {maxRate ? <span className="text-primary font-bold">up to ₹{maxRate}/hr</span> : <span className="text-primary font-bold">Any</span>}
                                </Label>
                                <Slider 
                                    defaultValue={[maxRate || 5000]}
                                    value={[maxRate || 5000]}
                                    max={5000} 
                                    step={100} 
                                    className="mt-3" 
                                    onValueChange={(value) => setMaxRate(value[0] === 5000 ? null : value[0])}
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-6">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="verified" checked={showVerifiedOnly} onCheckedChange={(checked) => setShowVerifiedOnly(!!checked)} />
                                    <Label htmlFor="verified">Show verified only</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="available" checked={showAvailableOnly} onCheckedChange={(checked) => setShowAvailableOnly(!!checked)} />
                                    <Label htmlFor="available">Show available only</Label>
                                </div>
                            </div>

                            <Button size="lg" className="w-full mt-8 text-lg" onClick={handleSearch}>
                                <Search className="mr-2 h-5 w-5" />
                                Search Experts
                            </Button>
                        </CardContent>
                    </Card>

                     <div className="mt-12">
                        <h2 className="text-3xl font-bold text-center mb-8">Featured Experts</h2>
                        {isLoadingExperts ? (
                             <div className="flex justify-center items-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="ml-3 text-muted-foreground">Loading experts...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {experts && experts.length > 0 ? (
                                    experts.map(expert => (
                                        <ExpertCard key={expert.id} expert={expert} />
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground">No featured experts available right now.</p>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}

export default function TalentSearchPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <HomePageContent />
        </Suspense>
    );
}
