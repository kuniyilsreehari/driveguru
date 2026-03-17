
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
    const carouselRef = useRef<HTMLDivElement>(null);

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

    const scrollCarousel = (direction: 'left' | 'right') => {
        if (carouselRef.current) {
            const { scrollLeft, clientWidth } = carouselRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            carouselRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

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
                    <section className="bg-[#24262d] rounded-[2rem] p-6 sm:p-8 shadow-2xl overflow-hidden border border-white/5 relative">
                        {/* Dot Pattern Model Background */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                             style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                        
                        <div className="mb-6 relative z-10">
                            <h2 className="text-xl sm:text-3xl font-black text-white uppercase italic tracking-tight">Top Rated Experts</h2>
                            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">PREMIUM NETWORK SUGGESTIONS</p>
                        </div>

                        <div className="relative group mb-6 z-10">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                            <Input 
                                placeholder="Filter suggestions..." 
                                className="pl-10 h-12 bg-[#1a1c23] border-none rounded-xl text-sm sm:text-lg placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-orange-500 transition-all shadow-inner" 
                                value={moduleSearchQuery} 
                                onChange={(e) => setModuleSearchQuery(e.target.value)} 
                            />
                        </div>

                        <div className="relative group/carousel z-10">
                            <div 
                                ref={carouselRef}
                                className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 scrollbar-hide snap-x px-1"
                            >
                                {isLoadingTopExperts ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="min-w-[200px] max-w-[200px] h-[340px] bg-[#1a1c23] rounded-[2rem] animate-pulse" />
                                    ))
                                ) : filteredTopExperts.length > 0 ? (
                                    filteredTopExperts.map(expert => (
                                        <Card key={expert.id} className="min-w-[200px] sm:min-w-[240px] max-w-[240px] bg-[#1a1c23]/80 backdrop-blur-sm border-none flex flex-col items-center p-6 text-center rounded-[2rem] snap-start transition-all hover:scale-[1.05] group shadow-xl relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative mb-4 z-10">
                                                <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-4 border-white/10 group-hover:border-orange-500/50 transition-colors duration-500 shadow-2xl">
                                                    <AvatarImage src={expert.photoUrl} className="object-cover" />
                                                    <AvatarFallback className="bg-orange-500/10 text-orange-500 text-xl sm:text-3xl font-black">
                                                        {expert.firstName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {expert.verified && (
                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 p-1 rounded-full border-4 border-[#1a1c23] shadow-lg">
                                                        <UserCheck className="h-2.5 w-2.5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-black text-white text-base sm:text-xl line-clamp-1 mb-1 tracking-tight uppercase italic z-10">{expert.firstName} {expert.lastName}</p>
                                            <p className="text-[8px] sm:text-[10px] text-[#8a92a6] uppercase tracking-[0.2em] font-black mb-8 line-clamp-1 h-4 z-10">{expert.profession || expert.role}</p>
                                            <Button 
                                                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[9px] h-10 shadow-[0_10px_25px_-5px_rgba(249,115,22,0.4)] active:scale-95 transition-all z-10 uppercase tracking-widest border-none"
                                                onClick={() => handleToggleFollow(expert.id)}
                                            >
                                                {userProfile?.following?.includes(expert.id) ? 'Following' : 'Follow Expert'}
                                            </Button>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="w-full flex flex-col items-center justify-center py-12 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/10">
                                        <Sparkles className="h-12 w-12 text-orange-500/20 mb-4 animate-pulse" />
                                        <p className="text-sm font-black text-white/40 tracking-tight uppercase italic text-center">No Featured Experts Yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <Card className="bg-[#24262d] border-none rounded-[2.5rem] p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/5">
                        <CardHeader className="p-0 pb-8">
                             <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter">
                                    <Sparkles className="text-orange-500 h-6 w-6 sm:h-8 sm:w-8" /> ENGINE
                                </CardTitle>
                                <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                                    <Switch id="ai-mode" checked={useAiSearch} onCheckedChange={handleAiModeToggle} className="data-[state=checked]:bg-orange-500 scale-90" />
                                    <Label htmlFor="ai-mode" className="flex items-center gap-2 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] cursor-pointer text-white">
                                        <Bot className={cn("h-4 w-4 transition-colors", useAiSearch ? "text-orange-500" : "text-muted-foreground")} />
                                        AI SEARCH
                                    </Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 space-y-4">
                            <div className="flex flex-col gap-4">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full h-16 justify-between text-left font-black uppercase text-[10px] sm:text-[11px] tracking-[0.2em] rounded-2xl bg-[#1a1c23] border-none shadow-inner px-6 text-white/70">
                                            <span className="flex-1">{userTypes.find(t => t.value === role)?.label || 'ALL USER TYPES'}</span>
                                            <ChevronDown className="ml-2 h-4 w-4 opacity-30" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-3xl border-none bg-[#1a1c23] text-white">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Classification</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-1 gap-2 pt-4">
                                            {userTypes.map((type) => (
                                                <DialogTrigger key={type.value} asChild>
                                                    <Card 
                                                        className={cn(
                                                            "cursor-pointer transition-all bg-white/5 border-none rounded-2xl shadow-lg hover:bg-white/10",
                                                            role === type.value && !type.href ? "ring-2 ring-orange-500 bg-orange-500/10" : ""
                                                        )}
                                                        onClick={() => type.href ? router.push(type.href) : setRole(type.value)}
                                                    >
                                                        <CardHeader className="flex flex-row items-center justify-between p-5">
                                                            <div className="flex items-center gap-4">
                                                                <type.icon className="h-5 w-5 text-orange-500" />
                                                                <CardTitle className="text-sm font-black uppercase tracking-widest">{type.label}</CardTitle>
                                                            </div>
                                                            {role === type.value && !type.href && <Check className="h-5 w-5 text-orange-500" />}
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
                                        className="text-sm sm:text-base h-16 bg-[#1a1c23] border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-orange-500 shadow-inner px-6 text-white font-bold placeholder:text-muted-foreground/50"
                                        value={aiSearchQuery}
                                        onChange={(e) => setAiSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                                    />
                                </div>

                                <Button 
                                    onClick={handleAiSearch} 
                                    disabled={isParsingQuery} 
                                    className="w-full h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black shadow-[0_10px_25px_-5px_rgba(249,115,22,0.4)] transition-all active:scale-95"
                                >
                                    {isParsingQuery ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6 text-white" strokeWidth={3} />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] p-6 sm:p-10 bg-[#24262d] border-none shadow-2xl relative overflow-hidden border border-white/5">
                        <CardContent className="p-0 space-y-6">
                             <div className="space-y-2">
                                <Label htmlFor="search" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">LOOKING FOR...</Label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="Name, skill, or company..."
                                        className="pl-12 h-14 bg-[#1a1c23] border-none rounded-2xl text-sm sm:text-base placeholder:text-muted-foreground shadow-inner font-bold text-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">LOCATION</Label>
                                    <Button variant="ghost" size="sm" onClick={handleDetectLocation} disabled={isDetectingLocation} className="text-orange-500 font-black uppercase text-[9px] sm:text-[10px] tracking-widest h-8 rounded-xl hover:bg-orange-500/10 gap-1 px-0">
                                        {isDetectingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateIcon className="h-4 w-4" />}
                                        AUTO-DETECT
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <Input id="city" placeholder="City" className="bg-[#1a1c23] border-none h-14 rounded-2xl font-bold px-6 shadow-inner text-sm text-white" value={city} onChange={(e) => setCity(e.target.value)} />
                                    <Input id="state" placeholder="State" className="bg-[#1a1c23] border-none h-14 rounded-2xl font-bold px-6 shadow-inner text-sm text-white" value={state} onChange={(e) => setState(e.target.value)} />
                                    <Input id="pincode" placeholder="Pincode" className="bg-[#1a1c23] border-none h-14 rounded-2xl font-bold px-6 shadow-inner text-sm text-white" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                                </div>
                            </div>

                            <Button size="lg" className="w-full h-20 rounded-[2rem] bg-orange-500 hover:bg-orange-600 text-white font-black text-lg sm:text-xl shadow-[0_15px_35px_-5px_rgba(249,115,22,0.4)] uppercase tracking-[0.2em] transition-all active:scale-95 group mt-4 border-none" onClick={handleSearch}>
                                Find Professionals
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="mt-12 text-center">
                        <h2 className="text-2xl sm:text-4xl font-black text-white mb-1 uppercase italic tracking-tight">Industry Hub</h2>
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/50 mb-10">EXPLORE SPECIALIZATIONS</p>
                         {isAppConfigLoading ? (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Skeleton className="h-28 w-full rounded-3xl bg-white/5" />
                                <Skeleton className="h-28 w-full rounded-3xl bg-white/5" />
                            </div>
                         ) : homepageCategories.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {homepageCategories.map((category) => (
                                    <Link key={category.id} href={`/search?q=${encodeURIComponent(category.name)}`} passHref>
                                        <Card className="flex flex-col items-center justify-center p-6 sm:p-10 h-full bg-[#24262d] border-none hover:bg-orange-500/5 hover:ring-2 hover:ring-orange-500/50 transition-all rounded-[2rem] group shadow-xl">
                                            <div className="p-4 sm:p-6 bg-[#1a1c23] rounded-2xl mb-4 shadow-inner">
                                                {getIcon(category.icon)}
                                            </div>
                                            <p className="font-black text-[9px] sm:text-xs text-white group-hover:text-orange-500 transition-colors uppercase tracking-[0.2em]">{category.name}</p>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : null}
                    </div>

                     {isRecentProfessionalsEnabled && (
                        <div className="mt-20">
                            <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
                                <div className="text-center sm:text-left">
                                    <h2 className="text-2xl sm:text-4xl font-black text-white uppercase italic tracking-tight">Fresh Talent</h2>
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/50">NEW PROFESSIONALS</p>
                                </div>
                                <Button className="w-full sm:w-auto rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-[0.2em] h-12 px-8 shadow-xl" asChild>
                                    <Link href="/search">VIEW ALL REGISTRY <ChevronRight className="ml-2 h-4 w-4" strokeWidth={3}/></Link>
                                </Button>
                            </div>
                            {isLoadingExperts ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Skeleton className="h-48 w-full rounded-[2.5rem] bg-white/5" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                <DialogContent className="rounded-[2.5rem] border-none bg-[#1a1c23] p-10 text-white shadow-2xl">
                    <DialogHeader className="items-center text-center">
                        <div className="p-5 bg-orange-500/10 rounded-full w-fit mb-6">
                            <Sparkles className="h-12 w-12 text-orange-500" />
                        </div>
                        <DialogTitle className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter">Tier Restriction</DialogTitle>
                        <UiDialogDescription className="text-base sm:text-lg text-muted-foreground font-medium pt-2">
                            AI Search is for Super Premier members.
                        </UiDialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col gap-4 pt-6 sm:flex-col">
                        <Button asChild className="w-full h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black text-base sm:text-lg shadow-xl uppercase tracking-widest">
                            <Link href="/dashboard#plans">UPGRADE NOW</Link>
                        </Button>
                        <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground hover:text-white font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsPremiumDialogOpen(false)}>
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
                <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
            </div>
        }>
            <HomePageContent />
        </Suspense>
    );
}
