
'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Rss, UserPlus, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ExpertUser } from '@/components/expert-card';

type Post = {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoUrl?: string;
    content: string;
    createdAt: Timestamp;
};

function getInitials(name: string) {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function FeedContent() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();

    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'posts'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore]);

    const { data: posts, isLoading: isLoadingPosts } = useCollection<Post>(postsQuery);

    const isLoading = isUserLoading || isLoadingPosts;
    
    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading public feed...</p>
            </div>
        );
    }
    
    if (!posts || posts.length === 0) {
        return (
            <div className="text-center py-16">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">The Feed is Empty</CardTitle>
                        <CardDescription>No posts have been made yet. Be the first!</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard">
                                <Search className="mr-2 h-4 w-4" /> Go to Dashboard
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {posts.map(post => (
                <Card key={post.id}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Link href={`/expert/${post.authorId}`}>
                                <Avatar>
                                    <AvatarImage src={post.authorPhotoUrl} />
                                    <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
                                </Avatar>
                            </Link>
                            <div>
                                <Link href={`/expert/${post.authorId}`} className="hover:underline">
                                    <CardTitle className="text-base">{post.authorName}</CardTitle>
                                </Link>
                                <CardDescription className="text-xs">
                                    {post.createdAt ? formatDistanceToNow(new Date(post.createdAt.seconds * 1000), { addSuffix: true }) : '...'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function FeedPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <header className="pb-8 text-center">
                     <div className="flex items-center justify-center gap-3 mb-4">
                        <Rss className="h-10 w-10 text-primary" />
                        <h1 className="text-4xl sm:text-5xl font-bold">Public Feed</h1>
                    </div>
                    <p className="text-muted-foreground">Updates from all experts and companies on the platform.</p>
                </header>
                <main>
                    <div className="mb-6">
                        <Button variant="outline" asChild>
                            <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                        </Button>
                    </div>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <FeedContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
