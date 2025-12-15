
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, MapPin } from 'lucide-react';

type ExpertUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    category?: string;
    location?: string;
    role?: string;
};

function SearchResults() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();

    const location = searchParams.get('location');
    const category = searchParams.get('category');

    const usersCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        
        const baseQuery = collection(firestore, 'users');
        const queries = [];
        
        // This is a simple implementation. For more complex queries, you might need to create composite indexes in Firestore.
        if (category) {
            queries.push(where('category', '==', category));
        }
        if (location) {
            // Note: Firestore doesn't support partial string matches like SQL's `LIKE`.
            // This will only match exact locations. For a real app, you'd use a search service like Algolia.
             queries.push(where('location', '>=', location));
             queries.push(where('location', '<=', location + '\uf8ff'));
        }

        if (queries.length > 0) {
            return query(baseQuery, ...queries);
        }
        
        return baseQuery;
    }, [firestore, location, category]);

    const { data: experts, isLoading } = useCollection<ExpertUser>(usersCollectionRef);

    const getInitials = (firstName?: string, lastName?: string) => {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        if (firstName) {
            return firstName.charAt(0).toUpperCase();
        }
        return 'U';
    };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experts.map(expert => (
                <Card key={expert.id}>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                             <Avatar className="h-16 w-16">
                                <AvatarFallback className="text-2xl">{getInitials(expert.firstName, expert.lastName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-xl">{expert.firstName} {expert.lastName}</CardTitle>
                                <CardDescription>{expert.role}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         {expert.category && <Badge variant="secondary">{expert.category}</Badge>}
                         <div className="flex items-center text-muted-foreground text-sm">
                            <MapPin className="mr-2 h-4 w-4" />
                            <span>{expert.location || 'Location not specified'}</span>
                         </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}


export default function SearchPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-7xl">
                <header className="pb-8">
                     <h1 className="text-4xl font-bold">Search Results</h1>
                     <p className="text-muted-foreground mt-2">Experts matching your criteria.</p>
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
