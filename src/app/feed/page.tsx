
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Rss, UserPlus, LogIn } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

    const currentUserDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<ExpertUser>(currentUserDocRef);
    
    const followingList = currentUserProfile?.following && currentUserProfile.following.length > 0 ? currentUserProfile.following : [''];

    const postsQuery = useMemoFirebase(() => {
        if (!firestore || !currentUserProfile || followingList.length === 0) return null;
        return query(
            collection(firestore, 'posts'),
            where('authorId', 'in', followingList),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, currentUserProfile, followingList]);

    const { data: posts, isLoading: isLoadingPosts } = useCollection<Post>(postsQuery);
    
    const isLoading = isUserLoading || isProfileLoading || isLoadingPosts;

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading your feed...</p>
            </div>
        );
    }
    
    if (!user) {
         return (
            <div className="text-center py-16">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2"><LogIn className="h-6 w-6" /> Your Feed is Private</CardTitle>
                        <CardDescription>Please log in to see posts from experts you follow.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/login">Log In</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!posts || posts.length === 0) {
        return (
            <div className="text-center py-16">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2"><UserPlus className="h-6 w-6" /> Your Feed is Empty</CardTitle>
                        <CardDescription>You&apos;re not following any experts yet. Find some to see their posts here.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button asChild>
                            <Link href="/search">Find Experts to Follow</Link>
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
                                    {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : '...'}
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
                        <h1 className="text-4xl sm:text-5xl font-bold">Your Personal Feed</h1>
                    </div>
                    <p className="text-muted-foreground">Updates from the experts and companies you follow.</p>
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
