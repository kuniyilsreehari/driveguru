

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building, ChevronDown, Laptop, LocateIcon, MapPin, Search, Smartphone, Wrench, Loader2, Star, UserCheck, Crown, Sparkles, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { ExpertCard } from '@/components/expert-card';
import type { ExpertUser } from '@/components/expert-card';
import * as LucideIcons from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Category = {
    id: string;
    name: string;
    icon: string;
};

const DynamicIcon = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
  const IconComponent = (LucideIcons as any)[name];

  if (!IconComponent) {
    // Use Wrench as a fallback icon if the specified one doesn't exist.
    return <Wrench {...props} />;
  }

  return <IconComponent {...props} />;
};


export default function TalentSearchPage() {
    const [location, setLocation] = useState('');
    const [locationName, setLocationName] = useState('');
    const [isDetecting, setIsDetecting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const firestore = useFirestore();

    const expertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('verified', '==', true), limit(3));
    }, [firestore]);
    
    const categoriesCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'categories');
    }, [firestore]);

    const { data: experts, isLoading: isLoadingExperts } = useCollection<ExpertUser>(expertsQuery);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesCollectionRef);


    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            toast({
                variant: 'destructive',
                title: 'Geolocation is not supported by your browser.',
            });
            return;
        }

        setIsDetecting(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();
                    
                    const address = data.address;
                    const city = address.city || address.town || address.village || address.hamlet;
                    const state = address.state;
                    const pincode = address.postcode;
                    const specificPlace = address.neighbourhood || address.road || data.display_name.split(',')[0];


                    let detectedLocationParts = [];
                    if (state) detectedLocationParts.push(state);
                    if (city) detectedLocationParts.push(city);
                    if (pincode) detectedLocationParts.push(pincode);

                    const detectedLocation = detectedLocationParts.join(', ');

                    if (detectedLocation) {
                        setLocation(detectedLocation);
                        if (specificPlace) {
                            setLocationName(specificPlace);
                        }
                        toast({
                            title: 'Location Detected',
                            description: `Your location has been set to ${detectedLocation}.`,
                        });
                    } else {
                        const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                        setLocation(coords);
                         toast({
                            title: 'Coordinates Set',
                            description: `We could not find address details. Using lat/lon.`,
                        });
                    }
                } catch (apiError) {
                    const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    setLocation(coords);
                    toast({
                        variant: 'destructive',
                        title: 'Could not fetch location name.',
                        description: 'Your location is set to coordinates.'
                    });
                } finally {
                    setIsDetecting(false);
                }
            },
            (error) => {
                setIsDetecting(false);
                toast({
                    variant: 'destructive',
                    title: 'Unable to retrieve your location.',
                    description: error.message,
                });
            }
        );
    };

    const handleSearch = () => {
        const queryParams = new URLSearchParams();
        if (location) {
            queryParams.set('location', location);
        }
        if (locationName) {
            queryParams.set('locationName', locationName);
        }
        if (selectedCategory) {
            queryParams.set('category', selectedCategory);
        }
        if (showVerifiedOnly) {
            queryParams.set('verified', 'true');
        }
        if (showAvailableOnly) {
            queryParams.set('available', 'true');
        }
        router.push(`/search?${queryParams.toString()}`);
    };

    return (
        <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center py-8 sm:py-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-primary">Find Local Talent, Instantly</h1>
                    <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                        Your one-stop platform for finding trusted local service professionals and kickstarting your career.
                    </p>
                </header>

                <main>
                    <Card className="p-6 sm:p-8">
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="location">Location</Label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="relative flex-grow">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                id="location" 
                                                placeholder="state, city, pincode" 
                                                className="pl-10"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                            />
                                        </div>
                                        <Button variant="outline" onClick={handleDetectLocation} disabled={isDetecting}>
                                            {isDetecting ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <LocateIcon className="mr-2 h-4 w-4" />
                                            )}
                                            Detect
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <Label>I&apos;m looking for...</Label>
                                    <Tabs defaultValue="experts" className="mt-2">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="experts"><Briefcase className="mr-2" />Experts</TabsTrigger>

                                            <TabsTrigger value="freshers"><Icons.graduate className="mr-2" />Freshers</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </div>
                            
                            <div className="mt-4">
                                <Label htmlFor="locationName">Name of the location</Label>
                                <div className="relative mt-2">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="locationName" 
                                        placeholder="Enter a specific place or area" 
                                        className="pl-10"
                                        value={locationName}
                                        onChange={(e) => setLocationName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <Label htmlFor="category-search">Category</Label>
                                <div className="relative mt-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="category-search" placeholder="Search categories..." className="pl-10" />
                                </div>
                            </div>

                            {areCategoriesLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4 text-center">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="p-4 border rounded-lg flex flex-col items-center justify-center space-y-2">
                                            <Skeleton className="w-8 h-8 rounded-full" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4 text-center">
                                    {categories?.map((category) => (
                                        <div 
                                            key={category.id} 
                                            className={cn(
                                                "p-4 border rounded-lg flex flex-col items-center justify-center space-y-2 cursor-pointer transition-colors",
                                                selectedCategory === category.name 
                                                    ? "bg-accent/20 border-primary" 
                                                    : "hover:bg-accent/10 hover:border-accent"
                                            )}
                                            onClick={() => setSelectedCategory(category.name)}
                                        >
                                            <DynamicIcon name={category.icon} className="w-8 h-8" />
                                            <span className="text-xs font-semibold">{category.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6">
                                <Label htmlFor="hourly-rate">Max Hourly Rate: <span className="text-primary font-bold">Any</span></Label>
                                <Slider defaultValue={[50]} max={100} step={1} className="mt-3" />
                            </div>

                            <div className="flex items-center space-x-4 mt-6">
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
                            <div className="space-y-6">
                                {experts && experts.map(expert => (
                                    <ExpertCard key={expert.id} expert={expert} />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}
