
'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building, ChevronDown, LocateIcon, MapPin, Search, Loader2, UserCheck, Crown, Sparkles, Bot, Lock, Users, User, Check, GraduationCap, UserPlus, ChevronLeft, ChevronRight, Filter, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, doc, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';
import { ExpertCard } from '@/components/expert-card';
import type { ExpertUser } from '@/components/expert-card';
import * as LucideIcons from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { parseSearchQuery } from '@/ai/flows/ai-search-flow';
import Link from 'next/link';
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";


type AppConfig = {
    featuredExpertsLimit?: number;
    homepageCategories?: HomepageCategory[];
    isRecentProfessionalsEnabled?: boolean;
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
    const homepageCategories = appConfig?.homepageCategories || [];
    const isRecentProfessionalsEnabled = appConfig?.isRecentProfessionalsEnabled !== false;


    const topExpertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'), 
            where('isFeatured', '==', true),
            orderBy('featuredOrder', 'asc'),
            orderBy('createdAt', 'desc'),
            limit(20)
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

    const recentExpertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'), 
            where('showInRecent', '==', true),
            orderBy('recentOrder', 'asc'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
    }, [firestore]);
    
    const { data: rawRecentExperts, isLoading: isLoadingExperts } = useCollection<ExpertUser>(recentExpertsQuery);

    const recentExperts = useMemo(() => {
        return filterHidden(rawRecentExperts);
    }, [rawRecentExperts]);


    const getCurrentPosition = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined' || !navigator.geolocation) {
                reject(new Error('Geolocation is not supported.'));
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

    const handleSearch = async () => {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.set('q', searchQuery);
        if (city) queryParams.set('city', city);
        if (state) queryParams.set('state', state);
        if (pincode) queryParams.set('pincode', pincode);
        if (role && role !== 'all') queryParams.set('role', role);
        if (showVerifiedOnly) queryParams.set('verified', 'true');
        if (showAvailableOnly) queryParams.set('available', 'true');
        if (maxRate !== null) queryParams.set('maxRate', maxRate.toString());
        
        if (pincode || city) {
            queryParams.set('radius', '20');
        }
        
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
                        description: "Could not process AI query. Please check your setup.",
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
                     queryParams.set('radius', '20'); 
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
        { value: 'Fresher', label: 'Freshers (Find Jobs)', icon: GraduationCap, href: '/vacancies' },
    ];

    const truncateName = (name: string) => {
        return name.length > 8 ? `${name.substring(0, 6)}...` : name;
    }

    return (
        <div className="min-h-screen bg-[#1a1c23]">
            <WelcomeRedirect />
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
                <header className="text-center py-6 sm:py-12">
                    <h1 className="text-4xl sm:text-7xl font-black text-white tracking-tighter uppercase italic">DriveGuru</h1>
                    <p className="mt-2 text-[8px] sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-orange-500/50 max-w-2xl mx-auto">
                        DIRECT PROFESSIONAL CONNECTIONS
                    </p>
                </header>

                <main className="space-y-8 sm:space-y-12">
                    <section className="bg-[#24262d] rounded-[3rem] p-8 sm:p-12 shadow-2xl overflow-hidden border border-white/5 relative">
                        {/* Dotted Background Pattern */}
                        <div className="absolute inset-0 opacity-[0.15] pointer-events-none" 
                             style={{ 
                                backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
                                backgroundSize: '32px 32px' 
                             }} />
                        
                        <div className="mb-10 relative z-10">
                            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tight">Top Rated Experts</h2>
                            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-orange-500/80 mt-1">PREMIUM NETWORK SUGGESTIONS</p>
                        </div>

                        <div className="relative group mb-12 z-10">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                            <Input 
                                placeholder="Filter suggestions..." 
                                className="pl-14 h-16 bg-[#1a1c23]/80 backdrop-blur-md border-none rounded-2xl text-base sm:text-xl placeholder:text-muted-foreground/30 focus-visible:ring-2 focus-visible:ring-orange-500 transition-all shadow-inner text-white font-bold" 
                                value={moduleSearchQuery} 
                                onChange={(e) => setModuleSearchQuery(e.target.value)} 
                            />
                        </div>

                        <div className="relative z-10">
                            <Carousel opts={{ align: "start", loop: true }} className="w-full">
                                <CarouselContent className="-ml-4 sm:-ml-6">
                                    {isLoadingTopExperts ? (
                                        [...Array(3)].map((_, i) => (
                                            <CarouselItem key={i} className="pl-4 sm:pl-6 basis-full sm:basis-1/2 md:basis-1/3">
                                                <div className="w-full h-[420px] bg-[#1a1c23] rounded-[2.5rem] animate-pulse" />
                                            </CarouselItem>
                                        ))
                                    ) : filteredTopExperts.length > 0 ? (
                                        filteredTopExperts.map(expert => (
                                            <CarouselItem key={expert.id} className="pl-4 sm:pl-6 basis-full sm:basis-1/2 md:basis-1/3">
                                                <Card className="w-full bg-[#1a1c23]/95 backdrop-blur-xl border-none flex flex-col items-center p-10 text-center rounded-[2.5rem] transition-all hover:scale-[1.03] group shadow-2xl relative overflow-hidden h-full">
                                                    <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                    
                                                    <div className="relative mb-8 z-10">
                                                        <div className="absolute -inset-4 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors" />
                                                        <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-white/10 group-hover:border-orange-500/50 transition-all duration-500 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                                                            <AvatarImage src={expert.photoUrl} className="object-cover" />
                                                            <AvatarFallback className="bg-[#24262d] text-orange-500 text-3xl sm:text-4xl font-black">
                                                                {expert.firstName?.[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {expert.verified && (
                                                            <div className="absolute -bottom-1 -right-1 bg-green-500 p-2 rounded-full border-4 border-[#1a1c23] shadow-lg">
                                                                <UserCheck className="h-4 w-4 text-white" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <h3 className="font-black text-white text-xl sm:text-2xl line-clamp-1 mb-1 tracking-tighter uppercase italic z-10 group-hover:text-orange-500 transition-colors">
                                                        {truncateName(`${expert.firstName} ${expert.lastName}`)}
                                                    </h3>
                                                    <p className="text-[10px] sm:text-[11px] text-[#8a92a6] uppercase tracking-[0.3em] font-black mb-12 z-10 opacity-60">
                                                        {expert.profession || expert.role}
                                                    </p>

                                                    <Button 
                                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-[11px] h-14 shadow-[0_15px_35px_-5px_rgba(249,115,22,0.4)] active:scale-95 transition-all z-10 uppercase tracking-[0.2em] border-none mt-auto"
                                                        onClick={() => handleToggleFollow(expert.id)}
                                                    >
                                                        {userProfile?.following?.includes(expert.id) ? 'Following' : 'Follow Expert'}
                                                    </Button>
                                                </Card>
                                            </CarouselItem>
                                        ))
                                    ) : (
                                        <CarouselItem className="basis-full">
                                            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[3rem] border-4 border-dashed border-white/10">
                                                <Sparkles className="h-20 w-20 text-orange-500/10 mb-6 animate-pulse" />
                                                <p className="text-xl font-black text-white/30 tracking-tight uppercase italic text-center">No Featured Experts Found</p>
                                            </div>
                                        </CarouselItem>
                                    )}
                                </CarouselContent>
                                <div className="hidden sm:block">
                                    <CarouselPrevious className="bg-white/5 border-none text-white hover:bg-white/10 -left-14 h-14 w-14" />
                                    <CarouselNext className="bg-white/5 border-none text-white hover:bg-white/10 -right-14 h-14 w-14" />
                                </div>
                            </Carousel>
                        </div>
                    </section>

                    <Card className="bg-[#24262d] border-none rounded-[3rem] p-8 sm:p-10 overflow-hidden shadow-2xl border border-white/5">
                        <CardHeader className="p-0 pb-10">
                             <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-4 text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter">
                                    <Sparkles className="text-orange-500 h-8 w-8 sm:h-10 sm:w-10" /> ENGINE
                                </CardTitle>
                                <div className="flex items-center space-x-4 bg-white/5 px-5 py-3 rounded-[1.5rem] border border-white/5 shadow-inner">
                                    <Switch id="ai-mode" checked={useAiSearch} onCheckedChange={handleAiModeToggle} className="data-[state=checked]:bg-orange-500 scale-110" />
                                    <Label htmlFor="ai-mode" className="flex items-center gap-3 font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] cursor-pointer text-white">
                                        <Bot className={cn("h-5 w-5 transition-colors", useAiSearch ? "text-orange-500" : "text-muted-foreground")} />
                                        AI SEARCH
                                    </Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 space-y-6">
                            <div className="flex flex-col gap-5">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full h-20 justify-between text-left font-black uppercase text-[11px] sm:text-[12px] tracking-[0.2em] rounded-[1.5rem] bg-[#1a1c23] border-none shadow-inner px-8 text-white/70">
                                            <span className="flex-1">{userTypes.find(t => t.value === role)?.label || 'ALL USER TYPES'}</span>
                                            <ChevronDown className="ml-2 h-5 w-5 opacity-30" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-[2.5rem] border-none bg-[#1a1c23] text-white p-8">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight mb-4">Classification</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-1 gap-3 pt-2">
                                            {userTypes.map((type) => (
                                                <DialogTrigger key={type.value} asChild>
                                                    <Card 
                                                        className={cn(
                                                            "cursor-pointer transition-all bg-white/5 border-none rounded-2xl shadow-lg hover:bg-white/10 h-20 flex items-center",
                                                            role === type.value && !type.href ? "ring-2 ring-orange-500 bg-orange-500/10" : ""
                                                        )}
                                                        onClick={() => type.href ? router.push(type.href) : setRole(type.value)}
                                                    >
                                                        <CardHeader className="flex flex-row items-center justify-between p-6 w-full">
                                                            <div className="flex items-center gap-5">
                                                                <type.icon className="h-6 w-6 text-orange-500" />
                                                                <CardTitle className="text-base font-black uppercase tracking-widest">{type.label}</CardTitle>
                                                            </div>
                                                            {role === type.value && !type.href && <Check className="h-6 w-6 text-orange-500" />}
                                                        </CardHeader>
                                                    </Card>
                                                </DialogTrigger>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                
                                <div className="relative w-full">
                                    <Input
                                        id="ai-search"
                                        placeholder={useAiSearch ? `e.g. 'verified plumber'` : `Search name, profession...`}
                                        className="text-base sm:text-lg h-20 bg-[#1a1c23] border-none rounded-[1.5rem] focus-visible:ring-2 focus-visible:ring-orange-500 shadow-inner px-8 text-white font-bold placeholder:text-muted-foreground/40"
                                        value={aiSearchQuery}
                                        onChange={(e) => setAiSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                                    />
                                </div>

                                <Button 
                                    onClick={handleAiSearch} 
                                    disabled={isParsingQuery} 
                                    className="w-full h-20 rounded-[1.5rem] bg-orange-500 hover:bg-orange-600 font-black shadow-[0_15px_35px_-5px_rgba(249,115,22,0.4)] transition-all active:scale-95"
                                >
                                    {isParsingQuery ? <Loader2 className="h-8 w-8 animate-spin" /> : <Search className="h-8 w-8 text-white" strokeWidth={3} />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[3rem] p-10 sm:p-12 bg-[#24262d] border-none shadow-2xl relative overflow-hidden border border-white/5">
                        <CardContent className="p-0 space-y-8">
                             <div className="space-y-3">
                                <Label htmlFor="search" className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">LOOKING FOR...</Label>
                                <div className="relative">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="Name, skill, or company..."
                                        className="pl-14 h-16 bg-[#1a1c23] border-none rounded-2xl text-base sm:text-lg placeholder:text-muted-foreground shadow-inner font-bold text-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-1">
                                    <Label className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">LOCATION</Label>
                                    <Button variant="ghost" size="sm" onClick={handleDetectLocation} disabled={isDetectingLocation} className="text-orange-500 font-black uppercase text-[10px] sm:text-[11px] tracking-widest h-10 rounded-xl hover:bg-orange-500/10 gap-2 px-4 border border-orange-500/20">
                                        {isDetectingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateIcon className="h-4 w-4" />}
                                        AUTO-DETECT
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <Input id="city" placeholder="City" className="bg-[#1a1c23] border-none h-16 rounded-2xl font-bold px-8 shadow-inner text-base text-white" value={city} onChange={(e) => setCity(e.target.value)} />
                                    <Input id="state" placeholder="State" className="bg-[#1a1c23] border-none h-16 rounded-2xl font-bold px-8 shadow-inner text-base text-white" value={state} onChange={(e) => setState(e.target.value)} />
                                    <Input id="pincode" placeholder="Pincode" className="bg-[#1a1c23] border-none h-16 rounded-2xl font-bold px-8 shadow-inner text-base text-white" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                                </div>
                            </div>

                            <Button size="lg" className="w-full h-24 rounded-[2.5rem] bg-orange-500 hover:bg-orange-600 text-white font-black text-xl sm:text-2xl shadow-[0_20px_45px_-5px_rgba(249,115,22,0.4)] uppercase tracking-[0.2em] transition-all active:scale-95 group mt-6 border-none" onClick={handleSearch}>
                                Find Professionals
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="mt-16 text-center">
                        <h2 className="text-3xl sm:text-5xl font-black text-white mb-2 uppercase italic tracking-tight">Industry Hub</h2>
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-orange-500/50 mb-12">EXPLORE SPECIALIZATIONS</p>
                         {isAppConfigLoading ? (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <Skeleton className="h-32 w-full rounded-[2rem] bg-white/5" />
                                <Skeleton className="h-32 w-full rounded-[2rem] bg-white/5" />
                            </div>
                         ) : homepageCategories.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {homepageCategories.map((category) => (
                                    <Link key={category.id} href={`/search?q=${encodeURIComponent(category.name)}`} passHref>
                                        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 h-full bg-[#24262d] border-none hover:bg-orange-500/10 hover:ring-2 hover:ring-orange-500/50 transition-all rounded-[2.5rem] group shadow-2xl">
                                            <div className="p-5 sm:p-8 bg-[#1a1c23] rounded-[1.5rem] mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                {getIcon(category.icon)}
                                            </div>
                                            <p className="font-black text-[10px] sm:text-xs text-white group-hover:text-orange-500 transition-colors uppercase tracking-[0.2em]">{category.name}</p>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : null}
                    </div>

                     {isRecentProfessionalsEnabled && (
                        <div className="mt-24">
                            <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-8">
                                <div className="text-center sm:text-left">
                                    <h2 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tight">Fresh Talent</h2>
                                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-orange-500/50 mt-1">NEW PROFESSIONALS</p>
                                </div>
                                <Button className="w-full sm:w-auto rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[11px] tracking-[0.2em] h-14 px-10 shadow-xl shadow-orange-500/20" asChild>
                                    <Link href="/search">VIEW ALL REGISTRY <ChevronRight className="ml-3 h-5 w-5" strokeWidth={3}/></Link>
                                </Button>
                            </div>
                            {isLoadingExperts ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <Skeleton className="h-56 w-full rounded-[3rem] bg-white/5" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {recentExperts && recentExperts.length > 0 ? (
                                        recentExperts.map(expert => (
                                            <ExpertCard key={expert.id} expert={expert} />
                                        ))
                                    ) : null}
                                </div>
                            )}
                        </div>
                     )}
                </main>
            </div>

            <Dialog open={isPremiumDialogOpen} onOpenChange={setIsPremiumDialogOpen}>
                <DialogContent className="rounded-[3rem] border-none bg-[#1a1c23] p-12 text-white shadow-2xl">
                    <DialogHeader className="items-center text-center">
                        <div className="p-6 bg-orange-500/10 rounded-full w-fit mb-8 border border-orange-500/20 shadow-inner">
                            <Sparkles className="h-14 w-14 text-orange-500" />
                        </div>
                        <DialogTitle className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">Tier Restriction</DialogTitle>
                        <UiDialogDescription className="text-lg sm:text-xl text-muted-foreground font-medium pt-3 leading-relaxed">
                            AI Search is for Super Premier members.
                        </UiDialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col gap-5 pt-8 sm:flex-col">
                        <Button asChild className="w-full h-20 rounded-[1.5rem] bg-orange-500 hover:bg-orange-600 font-black text-lg sm:text-xl shadow-[0_15px_35px_-5px_rgba(249,115,22,0.4)] uppercase tracking-widest transition-all active:scale-95">
                            <Link href="/dashboard#plans">UPGRADE NOW</Link>
                        </Button>
                        <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground hover:text-white font-bold uppercase text-[11px] tracking-[0.2em]" onClick={() => setIsPremiumDialogOpen(false)}>
                            NOT AT THIS TIME
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
            <div className="flex h-screen w-full items-center justify-center bg-[#1a1c23]">
                <Loader2 className="h-16 w-16 animate-spin text-orange-500" />
            </div>
        }>
            <HomePageContent />
        </Suspense>
    );
}
