
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
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

    return (
        <div className="min-h-screen bg-[#1a1c23]">
            <WelcomeRedirect />
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
                <header className="text-center py-8 sm:py-12">
                    <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter uppercase italic">DriveGuru</h1>
                    <p className="mt-4 text-sm font-black uppercase tracking-[0.3em] text-orange-500/50 max-w-2xl mx-auto">
                        DIRECT PROFESSIONAL CONNECTIONS
                    </p>
                </header>

                <main className="space-y-12">
                    <section className="bg-[#24262d] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-hidden border border-white/5">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-white uppercase italic">Top Rated Experts</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PREMIUM NETWORK SUGGESTIONS</p>
                        </div>

                        <div className="relative group mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                            <Input 
                                placeholder="Filter suggestions..." 
                                className="pl-12 h-14 bg-[#1a1c23] border-none rounded-2xl text-white text-lg placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-orange-500 transition-all shadow-inner" 
                                value={moduleSearchQuery} 
                                onChange={(e) => setModuleSearchQuery(e.target.value)} 
                            />
                        </div>

                        <div className="relative">
                            <div className="flex gap-6 overflow-x-auto pb-8 pt-2 scrollbar-hide snap-x px-1">
                                {isLoadingTopExperts ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="min-w-[240px] max-w-[240px] h-[380px] bg-[#1a1c23] rounded-[2rem] animate-pulse" />
                                    ))
                                ) : filteredTopExperts.length > 0 ? (
                                    filteredTopExperts.map(expert => (
                                        <Card key={expert.id} className="min-w-[240px] max-w-[240px] bg-[#1a1c23] border-none flex flex-col items-center p-8 text-center rounded-[2.5rem] snap-start transition-all hover:scale-[1.05] group shadow-xl relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative mb-6 z-10">
                                                <Avatar className="h-24 w-24 border-4 border-white/10 group-hover:border-orange-500/50 transition-colors duration-500 shadow-2xl">
                                                    <AvatarImage src={expert.photoUrl} className="object-cover" />
                                                    <AvatarFallback className="bg-orange-500/10 text-orange-500 text-3xl font-black">
                                                        {expert.firstName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {expert.verified ? (
                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 p-1.5 rounded-full border-4 border-[#1a1c23] shadow-lg">
                                                        <UserCheck className="h-3 w-3 text-white" />
                                                    </div>
                                                ) : (
                                                    <div className="absolute -bottom-1 -right-1 bg-orange-500 p-1.5 rounded-full border-4 border-[#1a1c23] shadow-lg">
                                                        <ShieldAlert className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-black text-white text-xl line-clamp-1 mb-1 tracking-tight uppercase italic z-10">{expert.firstName} {expert.lastName}</p>
                                            <p className="text-[10px] text-[#8a92a6] uppercase tracking-[0.2em] font-black mb-10 line-clamp-1 h-4 z-10">{expert.profession || expert.role}</p>
                                            <Button 
                                                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs h-12 shadow-xl shadow-orange-500/20 active:scale-95 transition-transform z-10 uppercase tracking-widest"
                                                onClick={() => handleToggleFollow(expert.id)}
                                            >
                                                {userProfile?.following?.includes(expert.id) ? 'Following' : 'Follow Expert'}
                                            </Button>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="w-full flex flex-col items-center justify-center py-16 bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/10">
                                        <Sparkles className="h-16 w-16 text-orange-500/20 mb-4 animate-pulse" />
                                        <p className="text-xl font-black text-white/40 tracking-tight uppercase italic">Our Premium Network is Growing</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 max-w-xs text-center mt-2">SHOWCASE YOUR EXPERTISE AT THE TOP</p>
                                        <Button variant="link" className="mt-4 text-orange-500 font-black uppercase tracking-widest text-xs" asChild>
                                            <Link href="/dashboard#plans">Upgrade Your Plan</Link>
                                        </Button>
                                    </div>
                                )}
                            </div>

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

                    <Card className="transition-all bg-[#24262d] border-none hover:shadow-2xl hover:shadow-orange-500/5 rounded-[2.5rem] p-4 overflow-hidden border border-white/5">
                        <CardHeader>
                             <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-2xl font-black text-white uppercase italic">
                                    <Sparkles className="text-orange-500 h-6 w-6" /> Smart Engine
                                </CardTitle>
                                <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                    <Switch id="ai-mode" checked={useAiSearch} onCheckedChange={handleAiModeToggle} className="data-[state=checked]:bg-orange-500 scale-90" />
                                    <Label htmlFor="ai-mode" className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest cursor-pointer">
                                        <Bot className={cn("h-4 w-4 transition-colors", useAiSearch ? "text-orange-500" : "text-muted-foreground")} />
                                        AI Search
                                    </Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-stretch gap-3">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-black uppercase text-[10px] tracking-widest rounded-2xl h-14 bg-[#1a1c23] border-none shadow-inner">
                                            <span className="flex-1 opacity-70">{userTypes.find(t => t.value === role)?.label || 'All User Types'}</span>
                                            <ChevronDown className="ml-2 h-4 w-4 opacity-30" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-[2.5rem] border-none bg-[#1a1c23] text-white">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Classification</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-1 gap-3 pt-4">
                                            {userTypes.map((type) => (
                                                <DialogTrigger key={type.value} asChild>
                                                    <Card 
                                                        className={cn(
                                                            "cursor-pointer transition-all duration-300 transform hover:-translate-y-1 bg-white/5 border-none rounded-2xl group",
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
                                                        <CardHeader className="flex flex-row items-center justify-between p-5">
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-orange-500/10 transition-colors">
                                                                    <type.icon className="h-6 w-6 text-orange-500" />
                                                                </div>
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
                                <div className="relative flex-grow">
                                    <Input
                                        id="ai-search"
                                        placeholder={useAiSearch ? `e.g. 'available verified plumber in Seoul'` : `Search by keyword, name, profession...`}
                                        className={cn("text-base h-14 bg-[#1a1c23] border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-orange-500 shadow-inner")}
                                        value={aiSearchQuery}
                                        onChange={(e) => setAiSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                                    />
                                </div>
                                <Button onClick={handleAiSearch} disabled={isParsingQuery} className="w-full sm:w-auto h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black px-10 shadow-xl shadow-orange-500/20 uppercase tracking-widest text-sm">
                                    {isParsingQuery ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                </Button>
                            </div>
                             {mounted && !useAiSearch && userProfile?.tier !== 'Super Premier' && (
                                <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 opacity-70">
                                    <Lock className="h-3 w-3" />
                                    Premium AI access for Super Premier members. <Link href="/dashboard#plans" className="underline hover:text-orange-400">Join Tier</Link>
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="relative text-center">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/5" />
                        </div>
                        <div className="relative inline-block bg-[#1a1c23] px-6 text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">
                            MANUAL PARAMETERS
                        </div>
                    </div>

                    <Card className="rounded-[2.5rem] p-6 sm:p-10 bg-[#24262d] border-none shadow-2xl relative overflow-hidden border border-white/5">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
                        <CardContent className="p-0 space-y-10">
                             <div className="space-y-3">
                                <Label htmlFor="search" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">I&apos;M LOOKING FOR...</Label>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                                    <Input
                                        id="search"
                                        placeholder="Name, profession, skill, or company..."
                                        className="pl-12 h-14 bg-[#1a1c23] border-none rounded-2xl text-white placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-orange-500 shadow-inner"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-1">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">LOCATION FILTERING</Label>
                                    <Button variant="ghost" size="sm" onClick={handleDetectLocation} disabled={isDetectingLocation} className="text-orange-500 font-black uppercase text-[10px] tracking-widest hover:bg-orange-500/5 h-8 rounded-xl px-4 group">
                                        {isDetectingLocation ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <LocateIcon className="mr-2 h-3.5 w-3.5 group-hover:scale-110 transition-transform" />}
                                        Auto-Detect
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Input id="city" placeholder="District / City" className="bg-[#1a1c23] border-none h-14 rounded-2xl font-bold px-6 shadow-inner" value={city} onChange={(e) => setCity(e.target.value)} />
                                    <Input id="state" placeholder="State" className="bg-[#1a1c23] border-none h-14 rounded-2xl font-bold px-6 shadow-inner" value={state} onChange={(e) => setState(e.target.value)} />
                                    <Input id="pincode" placeholder="Pincode" className="bg-[#1a1c23] border-none h-14 rounded-2xl font-bold px-6 shadow-inner" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">BUDGET RANGE</Label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">Max Hourly Rate</span>
                                        <Badge className={cn("rounded-full px-4 h-7 text-[10px] font-black uppercase tracking-widest border-none transition-all", maxRate ? "bg-orange-500 text-white" : "bg-white/5 text-orange-500/50")}>
                                            {maxRate ? `₹${maxRate}/hr` : 'Unlimited'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="px-2">
                                    <Slider 
                                        defaultValue={[maxRate || 5000]}
                                        value={[maxRate || 5000]}
                                        max={5000} 
                                        step={100} 
                                        className="h-2" 
                                        onValueChange={(value) => setMaxRate(value[0] === 5000 ? null : value[0])}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-4 bg-[#1a1c23] p-5 rounded-2xl border border-white/5 group hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}>
                                    <Checkbox id="verified" checked={showVerifiedOnly} onCheckedChange={(checked) => setShowVerifiedOnly(!!checked)} className="h-5 w-5 border-2 border-orange-500 data-[state=checked]:bg-orange-500 rounded-md" />
                                    <Label htmlFor="verified" className="text-xs font-black uppercase tracking-widest text-white/80 cursor-pointer select-none">Verified Professionals</Label>
                                </div>
                                <div className="flex items-center space-x-4 bg-[#1a1c23] p-5 rounded-2xl border border-white/5 group hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => setShowAvailableOnly(!showAvailableOnly)}>
                                    <Checkbox id="available" checked={showAvailableOnly} onCheckedChange={(checked) => setShowAvailableOnly(!!checked)} className="h-5 w-5 border-2 border-orange-500 data-[state=checked]:bg-orange-500 rounded-md" />
                                    <Label htmlFor="available" className="text-xs font-black uppercase tracking-widest text-white/80 cursor-pointer select-none">Available Immediately</Label>
                                </div>
                            </div>

                            <Button size="lg" className="w-full h-20 rounded-[2rem] bg-orange-500 hover:bg-orange-600 text-white font-black text-xl shadow-2xl shadow-orange-500/30 active:scale-[0.98] transition-all uppercase tracking-[0.2em] group" onClick={handleSearch}>
                                <Search className="mr-4 h-7 w-7 group-hover:scale-110 transition-transform" />
                                Find Local Professionals
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="mt-16 text-center">
                        <h2 className="text-3xl font-black text-white mb-2 uppercase italic">Industry Hub</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/50 mb-10">EXPLORE BY SPECIALIZATION</p>
                         {isAppConfigLoading ? (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Skeleton className="h-32 w-full rounded-[2.5rem] bg-white/5" />
                                <Skeleton className="h-32 w-full rounded-[2.5rem] bg-white/5" />
                                <Skeleton className="h-32 w-full rounded-[2.5rem] bg-white/5" />
                                <Skeleton className="h-32 w-full rounded-[2.5rem] bg-white/5" />
                            </div>
                         ) : homepageCategories.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {homepageCategories.map((category) => (
                                    <Link key={category.id} href={`/search?q=${encodeURIComponent(category.name)}`} passHref>
                                        <Card className="flex flex-col items-center justify-center p-8 h-full bg-[#24262d] border-none hover:bg-orange-500/5 hover:ring-2 hover:ring-orange-500/50 transition-all rounded-[2.5rem] group cursor-pointer shadow-xl">
                                            <div className="p-5 bg-[#1a1c23] rounded-2xl mb-4 group-hover:bg-orange-500/10 group-hover:scale-110 transition-all duration-500 shadow-inner">
                                                {getIcon(category.icon)}
                                            </div>
                                            <p className="font-black text-xs text-white group-hover:text-orange-500 transition-colors uppercase tracking-widest">{category.name}</p>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest opacity-30">Category matrix pending system configuration.</p>
                        )}
                    </div>

                     {isRecentProfessionalsEnabled && (
                        <div className="mt-20">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase italic">Fresh Talent</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/50">NEWLY JOINED PROFESSIONALS</p>
                                </div>
                                <Button className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[11px] tracking-widest h-14 px-10 transition-all shadow-xl active:scale-95 shadow-orange-500/20" asChild>
                                    <Link href="/search">VIEW ALL EXPERTS <ChevronRight className="ml-2 h-5 w-5"/></Link>
                                </Button>
                            </div>
                            {isLoadingExperts ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Skeleton className="h-56 w-full rounded-[2.5rem] bg-white/5" />
                                    <Skeleton className="h-56 w-full rounded-[2.5rem] bg-white/5" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {recentExperts && recentExperts.length > 0 ? (
                                        recentExperts.map(expert => (
                                            <ExpertCard key={expert.id} expert={expert} />
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-[#24262d] rounded-[3rem] border-2 border-dashed border-white/5 col-span-2 shadow-inner">
                                            <Users className="h-16 w-16 mx-auto text-muted-foreground/10 mb-4" />
                                            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-40">The recent professionals grid is currently being updated.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                     )}
                </main>
                <FloatingActions />
            </div>

            <Dialog open={isPremiumDialogOpen} onOpenChange={setIsPremiumDialogOpen}>
                <DialogContent className="rounded-[3rem] border-none bg-[#1a1c23] p-10 text-white shadow-2xl">
                    <DialogHeader className="items-center text-center">
                        <div className="p-6 bg-orange-500/10 rounded-full w-fit mb-6 shadow-inner">
                            <Sparkles className="h-14 w-14 text-orange-500" />
                        </div>
                        <DialogTitle className="text-4xl font-black uppercase italic tracking-tighter">Tier Restriction</DialogTitle>
                        <UiDialogDescription className="text-lg text-muted-foreground font-medium pt-2">
                            AI-Powered Smart Search is reserved for our top-tier members.
                        </UiDialogDescription>
                    </DialogHeader>
                    <div className="text-center space-y-4 py-6">
                        <p className="text-white/70 font-medium leading-relaxed">
                            Unlock the elite smart engine, priority placement in search results, and professional verified badges to maximize your client engagement.
                        </p>
                    </div>
                    <DialogFooter className="flex-col gap-4 pt-4 sm:flex-col">
                        <Button asChild className="w-full h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black text-lg shadow-xl shadow-orange-500/20 uppercase tracking-widest transition-all">
                            <Link href="/dashboard#plans">VIEW PREMIUM PLANS</Link>
                        </Button>
                        <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 font-black uppercase text-[10px] tracking-widest" onClick={() => setIsPremiumDialogOpen(false)}>
                            MAYBE LATER
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
