
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, MapPin, Star, IndianRupee, Briefcase, Calendar, Phone, MessageCircle, ChevronLeft, ChevronDown, UserCheck, Crown, Sparkles } from 'lucide-react';

type ExpertUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
    category?: string;
    location?: string;
    role?: string;
};

function SearchResults() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const router = useRouter();

    const location = searchParams.get('location');
    const category = searchParams.get('category');

    const usersCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        
        const baseQuery = collection(firestore, 'users');
        const queries = [];
        
        if (category) {
            queries.push(where('category', '==', category));
        }
        if (location) {
             queries.push(where('location', '>=', location));
             queries.push(where('location', '<=', location + '\uf8ff'));
        }

        if (queries.length > 0) {
            return query(baseQuery, ...queries);
        }
        
        return baseQuery;
    }, [firestore, location, category]);

    const { data: experts, isLoading } = useCollection<ExpertUser>(usersCollectionRef);

    const getInitials = (expert: ExpertUser) => {
        if (expert.companyName) {
            return expert.companyName.substring(0, 2).toUpperCase();
        }
        if (expert.firstName && expert.lastName) {
            return `${expert.firstName.charAt(0)}${expert.lastName.charAt(0)}`.toUpperCase();
        }
        if (expert.firstName) {
            return expert.firstName.charAt(0).toUpperCase();
        }
        return 'U';
    };

    const getDisplayName = (expert: ExpertUser) => {
        return expert.companyName || `${expert.firstName} ${expert.lastName}`;
    }

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Searching for experts...</p>
            </div>
        );
    }

    if (!experts || experts.length === 0) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-semibold">No Experts Found</h2>
                <p className="text-muted-foreground mt-2">Try adjusting your search filters.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className='flex items-center justify-between'>
                 <h2 className="text-2xl font-bold">
                    Searching for experts in <span className="text-primary">&quot;{location}&quot;</span> under <span className="text-primary">&quot;{category}&quot;</span>
                </h2>
                <p className="text-muted-foreground">{experts.length} result{experts.length === 1 ? '' : 's'} found.</p>
            </div>
            {experts.map(expert => (
                <Card key={expert.id} className="overflow-hidden">
                    <CardContent className="p-4 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
                            <div className="flex flex-col items-center space-y-4">
                                <Avatar className="h-24 w-24 text-4xl">
                                    <AvatarFallback>{getInitials(expert)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="w-full">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-2xl font-bold">{getDisplayName(expert)}</h3>
                                            <UserCheck className="h-5 w-5 text-green-500" />
                                            <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge>
                                            <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super Premier</Badge>
                                        </div>
                                        <p className="text-muted-foreground font-semibold">{expert.category}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
                                            <span className="text-xs text-muted-foreground ml-1">(1 review)</span>
                                        </div>
                                    </div>
                                    <Badge className="bg-orange-500 text-white mt-2 sm:mt-0">Available</Badge>
                                </div>

                                <Separator className="my-4" />

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {expert.location || 'N/A'}</div>
                                    <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4" /> 500/hr</div>
                                    <div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> 15 years</div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">{expert.role}</Badge>
                                    </div>
                                </div>
                                
                                <Separator className="my-4" />

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button variant="outline">Profile <ChevronDown className="ml-2 h-4 w-4" /></Button>
                                    <div className="flex-grow"></div>
                                    <Button variant="secondary"><Calendar className="mr-2 h-4 w-4" /> Book</Button>
                                    <Button className="bg-orange-500 hover:bg-orange-600"><Phone className="mr-2 h-4 w-4" /> Call</Button>
                                    <Button className="bg-green-500 hover:bg-green-600"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
             <p className="text-center text-muted-foreground mt-8">Available in: kozhikode - Kerala</p>
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
