'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building, ChevronDown, LocateIcon, MapPin, Search, Loader2, UserCheck, Crown, Sparkles, Bot, Lock, Users, User, Check, GraduationCap, UserPlus, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ExpertCard } from '@/components/expert-card';
import type { ExpertUser } from '@/components/expert-card';
import * as LucideIcons from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { parseSearchQuery } from '@/ai/flows/ai-search-flow';
import Link from 'next/link';
import { FloatingActions } from '@/components/floating-actions';
import type { HomepageCategory } from '@/app/admin/page';
import { WelcomeRedirect } from '@/components/welcome-redirect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription as UiDialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


type AppConfig = {
    featuredExpertsLimit?: number;
    homepageCategories?: HomepageCategory[];
};


function HomePageContent() {
    const [searchQuery, setSearchQuery] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [maxRate, setMaxRate] = useState<number | null>(null);
    const [role, setRole] = useState<string>('all');
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const firestore = useFirestore();

    const [aiSearchQuery, setAiSearchQuery] = useState('');
    const [isParsingQuery, setIsParsingQuery] = useState(false);
    const [useAiSearch, setUseAiSearch] = useState(false);
    const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
    const [moduleSearchQuery, setModuleSearchQuery] = useState('');
    const [mounted, setMounted] = useState(false);
    
    const { user, isUserLoading } = useUser();

    useEffect(() => {
        setMounted(true);
    }, []);

    const userProfileDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<ExpertUser>(userProfileDocRef);

    const isLoadingUserData = isUserLoading || isUserProfileLoading;

    const appConfigDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'app_config', 'homepage');
    }, [firestore]);
    
    const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<AppConfig>(appConfigDocRef);
    const featuredExpertsLimit = appConfig?.featuredExpertsLimit || 3;
    const homepageCategories = appConfig?.homepageCategories || [];


    const topExpertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'), 
            where('tier', 'in', ['Premier', 'Super Premier']),
            where('verified', '==', true),
            limit(30)
        );
    }, [firestore]);
    
    const { data: topExperts, isLoading: isLoadingTopExperts } = useCollection<ExpertUser>(topExpertsQuery);

    const filterHidden = (experts: ExpertUser[] | null) => {
        if (!experts) return [];
        return experts.filter(e => {
            if (!e.hiddenUntil) return true;
            return e.hiddenUntil.toDate() < new Date();
        });
    }

    const filteredTopExperts = useMemo(() => {
        const visibleExperts = filterHidden(topExperts);
        if (!moduleSearchQuery) return visibleExperts;
        const lowQuery = moduleSearchQuery.toLowerCase();
        return visibleExperts.filter(e => 
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(lowQuery) ||
            e.profession?.toLowerCase().includes(lowQuery) ||
            e.role?.toLowerCase().includes(lowQuery)
        );
    }, [topExperts, moduleSearchQuery]);

    const featuredExpertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'), 
            where('verified', '==', true),
            limit(featuredExpertsLimit + 10) // Fetch extra to account for hidden filtering
        );
    }, [firestore, featuredExpertsLimit]);
    
    const { data: rawFeaturedExperts, isLoading: isLoadingExperts } = useCollection<ExpertUser>(featuredExpertsQuery);

    const featuredExperts = useMemo(() => {
        return filterHidden(rawFeaturedExperts).slice(0, featuredExpertsLimit);
    }, [rawFeaturedExperts, featuredExpertsLimit]);


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
        setIsDetectingLocation(true);
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
                setIsDetectingLocation(false);
            }
        }).catch((error) => {
            setIsDetectingLocation(false);
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
        if (role && role !== 'all') queryParams.set('role', role);
        if (showVerifiedOnly) queryParams.set('verified', 'true');
        if (showAvailableOnly) queryParams.set('available', 'true');
        if (maxRate !== null) queryParams.set('maxRate', maxRate.toString());
        
        router.push(`/search?${queryParams.toString()}`);
    };

    const handleAiModeToggle = (checked: boolean) => {
        if (checked) {
            if (userProfile?.tier === 'Super Premier') {
                setUseAiSearch(true);
            } else {
                setIsPremiumDialogOpen(true);
            }
        } else {
            setUseAiSearch(false);
        }
    };
    
    const handleAiSearch = async () => {
        const queryParams = new URLSearchParams();

        if (useAiSearch) {
             if (userProfile?.tier !== 'Super Premier' && !isLoadingUserData) {
                setIsPremiumDialogOpen(true);
                return;
            }
            setIsParsingQuery(true);
            try {
                const result = await parseSearchQuery({ query: aiSearchQuery });
                if (result.error === 'AI_FLOW_FAILED') {
                     toast({
                        variant: "destructive",
                        title: "AI Search Error",
                        description: "Could not process AI query. This may be due to a missing API key. Please check your setup.",
                    });
                    setIsParsingQuery(false);
                    return;
                }

                if (result.searchQuery) queryParams.set('q', result.searchQuery);
                if (result.location) queryParams.set('location', result.location);
                if (result.maxRate) queryParams.set('maxRate', result.maxRate.toString());
                if (result.isVerified) queryParams.set('verified', 'true');
                if (result.isAvailable) queryParams.set('available', 'true');
                if (result.radius) queryParams.set('radius', result.radius.toString());
                if (result.useUserLocation) {
                     const position = await getCurrentPosition();
                     queryParams.set('lat', position.coords.latitude.toString());
                     queryParams.set('lon', position.coords.longitude.toString());
                }
            } catch (e) {
                console.error("AI search parsing failed", e);
                toast({
                    variant: "destructive",
                    title: "AI Search Error",
                    description: "Could not understand your query. Please try rephrasing or use manual search.",
                });
                setIsParsingQuery(false);
                return;
            }
            setIsParsingQuery(false);
        } else {
             if (aiSearchQuery) queryParams.set('q', aiSearchQuery);
        }

        if (role && role !== 'all') queryParams.set('role', role);
        router.push(`/search?${queryParams.toString()}`);
    };

    const handleToggleFollow = async (expertId: string) => {
        if (!user) {
            router.push('/login');
            return;
        }
        if (!userProfileDocRef) return;

        const isFollowing = userProfile?.following?.includes(expertId);
        const action = isFollowing ? arrayRemove(expertId) : arrayUnion(expertId);
        
        try {
            await updateDocumentNonBlocking(userProfileDocRef, { following: action });
            toast({
                title: isFollowing ? "Unfollowed" : "Following",
                description: isFollowing ? "You've stopped following this expert." : "You are now following this expert.",
            });
        } catch (e) {
            console.error(e);
        }
    }

    const getIcon = (name: string) => {
        const Icon = (LucideIcons as any)[name];
        return Icon ? <Icon className="w-8 h-8 text-primary" /> : <Briefcase className="w-8 h-8 text-primary" />;
    };
    
    const userTypes = [
        { value: 'all', label: 'All User Types', icon: Users },
        { value: 'Freelancer', label: 'Freelancers', icon: User },
        { value: 'Company', label: 'Companies', icon: Building },
        { value: 'Authorized Pro', label: 'Authorized Pros', icon: Briefcase },
        { value: 'Fresher', label: 'Freshers (Find Jobs)', icon: GraduationCap, href: '/feed' },
    ];

    return (
        <div className="min-h-screen">
            <WelcomeRedirect />
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
                <header className="text-center py-8 sm:py-12">
                    <h1 className="text-4xl sm:text-6xl font-bold text-primary tracking-tight">DriveGuru</h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
                        Your one-stop platform for finding trusted local service professionals and kickstarting your career.
                    </p>
                </header>

                <main className="space-y-12">
                    {/* Top Experts Carousel - Matching High-Fidelity Module Design */}
                    <section className="bg-[#24262d] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-hidden">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-white">Top Rated Experts</h2>
                            <p className="text-sm text-muted-foreground font-medium">Expand your network by following our top-tier professionals.</p>
                        </div>

                        {/* Module Search Bar */}
                        <div className="relative group mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                            <Input 
                                placeholder="Search suggestions..." 
                                className="pl-12 h-14 bg-[#1a1c23] border-2 border-orange-500 rounded-2xl text-white text-lg placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-orange-400 transition-all shadow-[0_0_15px_rgba(249,115,22,0.1)]" 
                                value={moduleSearchQuery} 
                                onChange={(e) => setModuleSearchQuery(e.target.value)} 
                            />
                        </div>

                        {/* Experts Carousel */}
                        <div className="relative">
                            <div className="flex gap-6 overflow-x-auto pb-8 pt-2 scrollbar-hide snap-x px-1">
                                {isLoadingTopExperts ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="min-w-[240px] max-w-[240px] h-[380px] bg-[#1a1c23] rounded-[2rem] animate-pulse" />
                                    ))
                                ) : filteredTopExperts.length > 0 ? (
                                    filteredTopExperts.map(expert => (
                                        <Card key={expert.id} className="min-w-[240px] max-w-[240px] bg-[#1a1c23] border-white/5 flex flex-col items-center p-8 text-center rounded-[2rem] snap-start transition-all hover:scale-[1.05] group shadow-xl">
                                            <div className="relative mb-6">
                                                <Avatar className="h-24 w-24 border-4 border-white/10 group-hover:border-orange-500/50 transition-colors duration-500">
                                                    <AvatarImage src={expert.photoUrl} className="object-cover" />
                                                    <AvatarFallback className="bg-orange-500/10 text-orange-500 text-3xl font-black">
                                                        {expert.firstName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {expert.verified && (
                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 p-1.5 rounded-full border-4 border-[#1a1c23]">
                                                        <UserCheck className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-black text-white text-xl line-clamp-1 mb-1 tracking-tight">{expert.firstName} {expert.lastName}</p>
                                            <p className="text-[11px] text-[#8a92a6] uppercase tracking-[0.15em] font-black mb-10 line-clamp-1 h-4">{expert.profession || expert.role}</p>
                                            <Button 
                                                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-sm h-12 shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
                                                onClick={() => handleToggleFollow(expert.id)}
                                            >
                                                <UserPlus className="h-4 w-4 mr-2" />
                                                {userProfile?.following?.includes(expert.id) ? 'Following' : 'Follow'}
                                            </Button>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="w-full flex flex-col items-center justify-center py-16 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/10">
                                        <Sparkles className="h-16 w-16 text-orange-500/20 mb-4 animate-pulse" />
                                        <p className="text-xl font-black text-white/40 tracking-tight">Our Premium Network is Growing</p>
                                        <p className="text-sm text-muted-foreground/60 max-w-xs text-center mt-2 font-medium">Be among the first to showcase your expertise at the top of our platform.</p>
                                        <Button variant="link" className="mt-4 text-orange-500 font-bold" asChild>
                                            <Link href="/dashboard#plans">Upgrade Your Plan</Link>
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Navigation Bar matching design */}
                            <div className="flex items-center justify-between mt-4 px-2">
                                <Button variant="ghost" size="icon" className="text-muted-foreground/40 hover:text-white hover:bg-white/5 rounded-full h-8 w-8">
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                                <div className="flex-1 mx-8 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                    <div className="absolute left-[30%] top-0 bottom-0 w-[40%] bg-white/30 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                                </div>
                                <Button variant="ghost" size="icon" className="text-muted-foreground/40 hover:text-white hover:bg-white/5 rounded-full h-8 w-8">
                                    <ChevronRight className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    </section>

                    <Card className="transition-all border-2 border-transparent hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10 focus-within:border-orange-500/50 focus-within:shadow-orange-500/10 rounded-[2.5rem] p-4">
                        <CardHeader>
                             <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-2xl font-black">
                                    <Sparkles className="text-orange-500" /> AI-Powered Search
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                    <Switch id="ai-mode" checked={useAiSearch} onCheckedChange={handleAiModeToggle} className="data-[state=checked]:bg-orange-500" />
                                    <Label htmlFor="ai-mode" className="flex items-center gap-1 font-bold">
                                        <Bot className={cn("h-4 w-4 transition-colors", useAiSearch ? "text-orange-500" : "text-muted-foreground")} />
                                        AI Mode
                                    </Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row items-stretch gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-bold rounded-xl h-14 bg-white/5 border-none">
                                            <span className="flex-1">{userTypes.find(t => t.value === role)?.label || 'Select a user type'}</span>
                                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-3xl border-none bg-[#1a1c23]">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-black">Select User Type</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-1 gap-4 pt-4">
                                            {userTypes.map((type) => (
                                                <DialogTrigger key={type.value} asChild>
                                                    <Card 
                                                        className={cn(
                                                            "cursor-pointer transition-all duration-300 transform hover:-translate-y-1 bg-white/5 border-none",
                                                            role === type.value && !type.href
                                                                ? "ring-2 ring-orange-500 bg-orange-500/10" 
                                                                : "hover:bg-white/10"
                                                        )}
                                                        onClick={() => {
                                                            if (type.href) {
                                                                router.push(type.href);
                                                            } else {
                                                                setRole(type.value)
                                                            }
                                                        }}
                                                    >
                                                        <CardHeader className="flex flex-row items-center justify-between p-4">
                                                            <div className="flex items-center gap-4">
                                                                <type.icon className="h-6 w-6 text-orange-500" />
                                                                <CardTitle className="text-base font-bold">{type.label}</CardTitle>
                                                            </div>
                                                            {role === type.value && !type.href && <Check className="h-5 w-5 text-orange-500" />}
                                                        </CardHeader>
                                                    </Card>
                                                </DialogTrigger>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <div className="relative flex-grow">
                                    <Input
                                        id="ai-search"
                                        placeholder={useAiSearch ? `e.g. 'available verified plumber in Mumbai'` : `Search by keyword, name, profession...`}
                                        className={cn("text-base h-14 bg-white/5 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500")}
                                        value={aiSearchQuery}
                                        onChange={(e) => setAiSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                                    />
                                </div>
                                <Button onClick={handleAiSearch} disabled={isParsingQuery} className="w-full sm:w-auto h-14 rounded-xl bg-orange-500 hover:bg-orange-600 font-black px-8 shadow-lg shadow-orange-500/20">
                                    {isParsingQuery ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="mr-2 h-4 w-4" />
                                    )}
                                    Search
                                </Button>
                            </div>
                             {mounted && !useAiSearch && userProfile?.tier !== 'Super Premier' && (
                                <p className="text-xs text-orange-500 font-bold mt-2 flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    Premium AI search enabled for Super Premier members. <Link href="/dashboard#plans" className="underline hover:text-orange-400">Upgrade</Link>
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="relative text-center">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/5" />
                        </div>
                        <div className="relative inline-block bg-background px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Or Use Manual Search
                        </div>
                    </div>

                    <Card className="rounded-[2.5rem] p-6 sm:p-8 bg-[#24262d] border-none shadow-2xl">
                        <CardContent className="p-0 space-y-8">
                             <div>
                                <Label htmlFor="search" className="text-xs font-black uppercase tracking-widest text-muted-foreground">I&apos;m looking for...</Label>
                                <div className="relative mt-2">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="Name, profession, skill, or company..."
                                        className="pl-12 h-14 bg-[#1a1c23] border-none rounded-2xl text-white placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-orange-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Location Filtering</Label>
                                    <Button variant="ghost" size="sm" onClick={handleDetectLocation} disabled={isDetectingLocation} className="text-orange-500 font-bold hover:bg-orange-500/10 rounded-lg">
                                        {isDetectingLocation ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <LocateIcon className="mr-2 h-4 w-4" />
                                        )}
                                        Auto-Detect
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-1">
                                        <Input id="city" placeholder="District / City" className="bg-[#1a1c23] border-none h-12 rounded-xl" value={city} onChange={(e) => setCity(e.target.value)} />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <Input id="state" placeholder="State" className="bg-[#1a1c23] border-none h-12 rounded-xl" value={state} onChange={(e) => setState(e.target.value)} />
                                    </div>
                                     <div className="sm:col-span-1">
                                        <Input id="pincode" placeholder="Pincode" className="bg-[#1a1c23] border-none h-12 rounded-xl" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 block">Budget Range</Label>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-bold text-white">Max Hourly Rate</span>
                                    <span className="text-sm font-black text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                                        {maxRate ? `₹${maxRate}/hr` : 'Unlimited'}
                                    </span>
                                </div>
                                <Slider 
                                    defaultValue={[maxRate || 5000]}
                                    value={[maxRate || 5000]}
                                    max={5000} 
                                    step={100} 
                                    className="mt-3" 
                                    onValueChange={(value) => setMaxRate(value[0] === 5000 ? null : value[0])}
                                />
                            </div>

                            <div className="flex flex-wrap gap-6 pt-4">
                                <div className="flex items-center space-x-3 bg-[#1a1c23] p-4 rounded-2xl flex-1 min-w-[200px]">
                                    <Checkbox id="verified" checked={showVerifiedOnly} onCheckedChange={(checked) => setShowVerifiedOnly(!!checked)} className="border-orange-500 data-[state=checked]:bg-orange-500" />
                                    <Label htmlFor="verified" className="font-bold cursor-pointer">Verified Experts Only</Label>
                                </div>
                                <div className="flex items-center space-x-3 bg-[#1a1c23] p-4 rounded-2xl flex-1 min-w-[200px]">
                                    <Checkbox id="available" checked={showAvailableOnly} onCheckedChange={(checked) => setShowAvailableOnly(!!checked)} className="border-orange-500 data-[state=checked]:bg-orange-500" />
                                    <Label htmlFor="available" className="font-bold cursor-pointer">Available Now Only</Label>
                                </div>
                            </div>

                            <Button size="lg" className="w-full h-16 rounded-[1.5rem] bg-orange-500 hover:bg-orange-600 text-white font-black text-xl shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all" onClick={handleSearch}>
                                <Search className="mr-3 h-6 w-6" />
                                Find Local Professionals
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="mt-12 text-center">
                        <h2 className="text-3xl font-black text-white mb-2">Explore Categories</h2>
                        <p className="text-muted-foreground font-medium mb-8">Find exactly who you need by industry.</p>
                         {isAppConfigLoading ? (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Skeleton className="h-28 w-full rounded-2xl bg-white/5" />
                                <Skeleton className="h-28 w-full rounded-2xl bg-white/5" />
                                <Skeleton className="h-28 w-full rounded-2xl bg-white/5" />
                                <Skeleton className="h-28 w-full rounded-2xl bg-white/5" />
                            </div>
                         ) : homepageCategories.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {homepageCategories.map((category) => (
                                    <Link key={category.id} href={`/search?q=${encodeURIComponent(category.name)}`} passHref>
                                        <Card className="flex flex-col items-center justify-center p-6 h-full bg-[#24262d] border-none hover:bg-orange-500/5 hover:ring-2 hover:ring-orange-500/50 transition-all rounded-[2rem] group cursor-pointer">
                                            <div className="p-4 bg-white/5 rounded-2xl mb-3 group-hover:bg-orange-500/10 transition-colors">
                                                {getIcon(category.icon)}
                                            </div>
                                            <p className="font-black text-sm text-white group-hover:text-orange-500 transition-colors">{category.name}</p>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Categories are being configured by the admin.</p>
                        )}
                    </div>

                     <div className="mt-16">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black text-white">Recent Professionals</h2>
                            <Button variant="link" className="text-orange-500 font-bold" asChild><Link href="/search">View All <ChevronRight className="ml-1 h-4 w-4"/></Link></Button>
                        </div>
                        {isLoadingExperts ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Skeleton className="h-48 w-full rounded-[2rem] bg-white/5" />
                                <Skeleton className="h-48 w-full rounded-[2rem] bg-white/5" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {featuredExperts && featuredExperts.length > 0 ? (
                                    featuredExperts.map(expert => (
                                        <ExpertCard key={expert.id} expert={expert} />
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground col-span-2">No professionals available right now.</p>
                                )}
                            </div>
                        )}
                    </div>
                </main>
                <FloatingActions />
            </div>

            <Dialog open={isPremiumDialogOpen} onOpenChange={setIsPremiumDialogOpen}>
                <DialogContent className="rounded-[2.5rem] border-none bg-[#1a1c23] p-8">
                    <DialogHeader className="items-center text-center">
                        <div className="p-4 bg-orange-500/10 rounded-full w-fit mb-4">
                            <Sparkles className="h-10 w-10 text-orange-500" />
                        </div>
                        <DialogTitle className="text-3xl font-black text-white">Super Premier Feature</DialogTitle>
                        <UiDialogDescription className="text-lg text-muted-foreground font-medium pt-2">
                            AI-Powered Search is exclusive to our top-tier members.
                        </UiDialogDescription>
                    </DialogHeader>
                    <div className="text-center space-y-4 py-4">
                        <p className="text-white/70 font-medium">
                            Unlock advanced AI tools, priority placement, and verified badges to multiply your client inquiries.
                        </p>
                    </div>
                    <DialogFooter className="flex-col gap-3 pt-4 sm:flex-col">
                        <Button asChild className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black text-lg">
                            <Link href="/dashboard#plans">View Premium Plans</Link>
                        </Button>
                        <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 font-bold" onClick={() => setIsPremiumDialogOpen(false)}>
                            Maybe Later
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function TalentSearchPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        }>
            <HomePageContent />
        </Suspense>
    );
}
