
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Star, ChevronLeft, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Review = {
    id: string;
    expertId: string;
    expertName: string;
    reviewerName: string;
    rating: number;
    comment: string;
    createdAt: { seconds: number; nanoseconds: number; };
    status: 'pending' | 'approved' | 'rejected';
};

function ReviewsList() {
    const firestore = useFirestore();

    const reviewsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'reviews'), 
            where('status', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore]);

    const { data: reviews, isLoading } = useCollection<Review>(reviewsQuery);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading approved reviews...</p>
            </div>
        );
    }

    if (!reviews || reviews.length === 0) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-semibold">No Approved Reviews Found</h2>
                <p className="text-muted-foreground mt-2">Check back later to see what others are saying.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {reviews.map(review => (
                <Card key={review.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl hover:underline">
                                    <Link href={`/expert/${review.expertId}`}>{review.expertName}</Link>
                                </CardTitle>
                                <CardDescription>Reviewed by {review.reviewerName}</CardDescription>
                            </div>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">"{review.comment}"</p>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{review.createdAt ? formatDistanceToNow(new Date(review.createdAt.seconds * 1000), { addSuffix: true }) : ''}</span>
                            <Badge variant="secondary">Approved</Badge>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function ReviewsPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-3xl">
                <header className="pb-8 text-center">
                     <div className="flex items-center justify-center gap-3 mb-4">
                        <MessageSquare className="h-10 w-10 text-primary" />
                        <h1 className="text-4xl sm:text-5xl font-bold">Expert Reviews</h1>
                    </div>
                    <p className="text-muted-foreground">See what people are saying about our verified experts.</p>
                </header>
                <main>
                     <Button variant="outline" asChild className="mb-6">
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <ReviewsList />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
