
'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, orderBy, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Rss, Search, Heart, Share2, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ShareDialog } from '@/components/share-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


type Post = {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoUrl?: string;
    content: string;
    imageUrl?: string;
    createdAt: Timestamp;
    likes?: string[];
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
    const { toast } = useToast();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    
    const superAdminDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'roles_super_admin', user.uid);
    }, [firestore, user]);

    const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
    const isSuperAdmin = !!superAdminData;


    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'posts'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore]);

    const { data: posts, isLoading: isLoadingPosts } = useCollection<Post>(postsQuery);

    const handleLike = async (post: Post) => {
        if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Authentication Required',
                description: 'You must be logged in to like a post.',
            });
            return;
        }

        const postRef = doc(firestore, 'posts', post.id);
        const hasLiked = post.likes?.includes(user.uid);
        const updateAction = hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid);

        try {
            await updateDoc(postRef, {
                likes: updateAction,
            });
        } catch (error) {
            console.error('Error updating like:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not update like status. Please try again.',
            });
        }
    };

    const openDeleteDialog = (post: Post) => {
        setSelectedPost(post);
        setIsDeleteDialogOpen(true);
    }
    
    const handleDeletePost = () => {
        if (!selectedPost || !firestore) return;
        const postDocRef = doc(firestore, 'posts', selectedPost.id);
        deleteDocumentNonBlocking(postDocRef);
        toast({
            title: "Post Deleted",
            description: "The post has been successfully removed.",
        });
        setIsDeleteDialogOpen(false);
        setSelectedPost(null);
    }


    const isLoading = isUserLoading || isLoadingPosts || isRoleLoading;
    
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
        <>
            <div className="space-y-6">
                {posts.map(post => {
                    const hasLiked = user ? post.likes?.includes(user.uid) : false;
                    const canDelete = user && (user.uid === post.authorId || isSuperAdmin);
                    return (
                        <Card key={post.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
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
                                     {canDelete && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openDeleteDialog(post)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {post.imageUrl && (
                                    <div className="mb-4 relative rounded-lg overflow-hidden border aspect-[4/5]">
                                        <Image
                                            src={post.imageUrl}
                                            alt={`Post image from ${post.authorName}`}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                            </CardContent>
                            <CardFooter>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleLike(post)}>
                                        <Heart className={cn("mr-2 h-4 w-4", hasLiked && "fill-red-500 text-red-500")} />
                                        Like
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        {post.likes?.length || 0} {post.likes?.length === 1 ? 'like' : 'likes'}
                                    </span>
                                    <ShareDialog expertId={post.authorId} expertName={post.authorName}>
                                        <Button variant="ghost" size="sm">
                                            <Share2 className="mr-2 h-4 w-4" />
                                            Share
                                        </Button>
                                    </ShareDialog>
                                </div>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this post.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
        </>
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
