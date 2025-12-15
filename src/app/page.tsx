'use client';

import { useState } from 'react';
import { Briefcase, Building, ChevronDown, Laptop, LocateIcon, MapPin, Search, Smartphone, Wrench, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { useToast } from '@/hooks/use-toast';

const categories = [
    { name: "MEDICAL HELP", icon: <Icons.medical className="w-8 h-8" /> },
    { name: "ELECTRICAL SERVICE", icon: <Wrench className="w-8 h-8" /> },
    { name: "SECURITY GUARDS", icon: <Building className="w-8 h-8" /> },
    { name: "MOBILE PHONE SERVICE", icon: <Smartphone className="w-8 h-8" /> },
    { name: "LAPTOP SERVICE", icon: <Laptop className="w-8 h-8" /> },
];

export default function TalentSearchPage() {
    const [location, setLocation] = useState('');
    const [isDetecting, setIsDetecting] = useState(false);
    const { toast } = useToast();

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
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                setIsDetecting(false);
                toast({
                    title: 'Location Detected',
                    description: 'Your location has been set.',
                });
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
                                                placeholder="Enter a city to search..." 
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

                            <div className="mt-6">
                                <Label htmlFor="category-search">Category</Label>
                                <div className="relative mt-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="category-search" placeholder="Search categories..." className="pl-10" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4 text-center">
                                {categories.map((category) => (
                                    <div key={category.name} className="p-4 border rounded-lg flex flex-col items-center justify-center space-y-2 hover:bg-accent/10 hover:border-accent cursor-pointer transition-colors">
                                        {category.icon}
                                        <span className="text-xs font-semibold">{category.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6">
                                <Label htmlFor="hourly-rate">Max Hourly Rate: <span className="text-primary font-bold">Any</span></Label>
                                <Slider defaultValue={[50]} max={100} step={1} className="mt-3" />
                            </div>

                            <div className="flex items-center space-x-4 mt-6">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="verified" />
                                    <Label htmlFor="verified">Show verified only</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="available" />
                                    <Label htmlFor="available">Show available only</Label>
                                </div>
                            </div>

                            <Button size="lg" className="w-full mt-8 text-lg">
                                <Search className="mr-2 h-5 w-5" />
                                Search Experts
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    )
}
