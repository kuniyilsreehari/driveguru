

'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building, ChevronDown, Laptop, LocateIcon, MapPin, Search, Smartphone, Wrench, Loader2, Star, UserCheck, Crown, Sparkles, HelpCircle, Bot, Lock, Users, User, Check, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
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
    const [isDetecting, setIsDetecting] = useState(false);
    const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const firestore = useFirestore();

    const [aiSearchQuery, setAiSearchQuery] = useState('');
    const [isParsingQuery, setIsParsingQuery] = useState(false);
    const [useAiSearch, setUseAiSearch] = useState(false);
    const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
    
    const { user, isUserLoading } = useUser();

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


    const expertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'), 
            where('tier', '==', 'Super Premier'),
            limit(featuredExpertsLimit)
        );
    }, [firestore, featuredExpertsLimit]);
    
    const { data: experts, isLoading: isLoadingExperts } = useCollection<ExpertUser>(expertsQuery);
    
    const sortedExperts = experts;


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
        <div className="min-h-screen">
            <WelcomeRedirect />
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
                <header className="text-center py-8 sm:py-12">
                    <h1 className="text-4xl sm:text-6xl font-bold text-primary tracking-tight">DriveGuru</h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Your one-stop platform for finding trusted local service professionals and kickstarting your career.
                    </p>
                </header>

                <main className="space-y-12">
                    <Card className="transition-all border-2 border-transparent hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10 focus-within:border-orange-500/50 focus-within:shadow-orange-500/10">
                        <CardHeader>
                             <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <Sparkles /> AI-Powered Search
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                    <Switch id="ai-mode" checked={useAiSearch} onCheckedChange={handleAiModeToggle} />
                                    <Label htmlFor="ai-mode" className="flex items-center gap-1">
                                        <Bot className={cn("h-4 w-4 transition-colors", useAiSearch ? "text-primary" : "text-muted-foreground")} />
                                        AI Mode
                                    </Label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row items-stretch gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                                            <span className="flex-1">{userTypes.find(t => t.value === role)?.label || 'Select a user type'}</span>
                                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Select User Type for Search</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-1 gap-4 pt-4">
                                            {userTypes.map((type) => (
                                                <DialogTrigger key={type.value} asChild>
                                                    <Card 
                                                        className={cn(
                                                            "cursor-pointer transition-all duration-300 transform hover:-translate-y-1",
                                                            role === type.value && !type.href
                                                                ? "border-primary ring-2 ring-primary" 
                                                                : "hover:border-primary/50"
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
                                                                <type.icon className="h-6 w-6 text-primary" />
                                                                <CardTitle className="text-base">{type.label}</CardTitle>
                                                            </div>
                                                            {role === type.value && !type.href && <Check className="h-5 w-5 text-primary" />}
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
                                        className={cn("text-base")}
                                        value={aiSearchQuery}
                                        onChange={(e) => setAiSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                                    />
                                </div>
                                <Button onClick={handleAiSearch} disabled={isParsingQuery} className="w-full sm:w-auto">
                                    {isParsingQuery ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="mr-2 h-4 w-4" />
                                    )}
                                    Search
                                </Button>
                            </div>
                             {!useAiSearch && userProfile?.tier !== 'Super Premier' && (
                                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                    <Lock className="h-3 w-3" /> This is a premium feature. <Link href="/dashboard#plan-management" className="underline hover:text-primary">Upgrade your plan</Link> to activate.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="relative text-center">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative inline-block bg-background px-4 text-sm font-semibold uppercase text-muted-foreground">
                            Or Use Manual Search
                        </div>
                    </div>

                    <Card className="p-6 sm:p-8">
                        <CardContent className="p-0">
                             <div className="mb-6">
                                <Label htmlFor="search" className="text-base font-semibold">I&apos;m looking for...</Label>
                                <div className="relative mt-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="Search by name, profession, skill, or company..."
                                        className="pl-10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-4 mb-6">
                                <div>
                                    <Label className="text-base font-semibold">Location</Label>
                                    <Button variant="outline" size="sm" onClick={handleDetectLocation} disabled={isDetecting} className="float-right">
                                        {isDetecting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <LocateIcon className="mr-2 h-4 w-4" />
                                        )}
                                        Detect
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-1">
                                        <Label htmlFor="city" className="text-xs text-muted-foreground">District / City</Label>
                                        <Input id="city" placeholder="e.g., Malappuram" value={city} onChange={(e) => setCity(e.target.value)} />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <Label htmlFor="state" className="text-xs text-muted-foreground">State</Label>
                                        <Input id="state" placeholder="e.g., Kerala" value={state} onChange={(e) => setState(e.target.value)} />
                                    </div>
                                     <div className="sm:col-span-1">
                                        <Label htmlFor="pincode" className="text-xs text-muted-foreground">Pincode</Label>
                                        <Input id="pincode" placeholder="e.g., 676505" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className='my-6'>
                                <Label className="text-base font-semibold">User Type</Label>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal mt-2">
                                            {userTypes.find(t => t.value === role)?.label || 'Select a user type'}
                                            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Select User Type</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-1 gap-4 pt-4">
                                            {userTypes.map((type) => (
                                                 <DialogTrigger key={type.value} asChild>
                                                    <Card 
                                                        className={cn(
                                                            "cursor-pointer transition-all duration-300 transform hover:-translate-y-1",
                                                            role === type.value && !type.href
                                                                ? "border-primary ring-2 ring-primary" 
                                                                : "hover:border-primary/50"
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
                                                                <type.icon className="h-6 w-6 text-primary" />
                                                                <CardTitle className="text-base">{type.label}</CardTitle>
                                                            </div>
                                                            {role === type.value && !type.href && <Check className="h-5 w-5 text-primary" />}
                                                        </CardHeader>
                                                    </Card>
                                                </DialogTrigger>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            
                            <div className="mt-6">
                                <Label htmlFor="hourly-rate" className="text-base font-semibold">
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

                    <div className="mt-12 text-center">
                        <h2 className="text-3xl font-bold mb-2">Explore Categories</h2>
                        <p className="text-muted-foreground mb-8">Find professionals by their area of expertise.</p>
                         {isAppConfigLoading ? (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Skeleton className="h-28 w-full" />
                                <Skeleton className="h-28 w-full" />
                                <Skeleton className="h-28 w-full" />
                                <Skeleton className="h-28 w-full" />
                            </div>
                         ) : homepageCategories.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {homepageCategories.map((category) => (
                                    <Link key={category.id} href={`/search?q=${encodeURIComponent(category.name)}`} passHref>
                                        <Card className="flex flex-col items-center justify-center p-6 h-full hover:bg-accent/50 hover:border-primary/50 transition-colors cursor-pointer">
                                            {getIcon(category.icon)}
                                            <p className="mt-2 font-semibold text-sm text-center">{category.name}</p>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Categories are being configured by the admin.</p>
                        )}
                    </div>

                     <div className="mt-16">
                        <h2 className="text-3xl font-bold text-center mb-8">Featured Experts</h2>
                        {isLoadingExperts ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Skeleton className="h-48 w-full" />
                                <Skeleton className="h-48 w-full" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {sortedExperts && sortedExperts.length > 0 ? (
                                    sortedExperts.map(expert => (
                                        <ExpertCard key={expert.id} expert={expert} />
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground col-span-2">No featured experts available right now.</p>
                                )}
                            </div>
                        )}
                    </div>
                </main>
                <FloatingActions />
            </div>

            <Dialog open={isPremiumDialogOpen} onOpenChange={setIsPremiumDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Super Premier Feature Locked</DialogTitle>
                    <UiDialogDescription>
                        AI-Powered Search is an exclusive feature for our Super Premier members.
                    </UiDialogDescription>
                    </DialogHeader>
                    <div className="text-center">
                        <div className="mx-auto w-fit rounded-full p-3 mb-2 bg-primary/10">
                        <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                        Upgrade your plan to unlock this and many other powerful features to enhance your profile and attract more clients.
                        </p>
                    </div>
                    <DialogFooter className="flex-col gap-2 pt-4">
                        <Button asChild className="w-full">
                            <Link href="/dashboard#plan-management">Upgrade Your Plan</Link>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => setIsPremiumDialogOpen(false)}>
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <HomePageContent />
        </Suspense>
    );
}
