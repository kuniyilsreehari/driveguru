
'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { collection, query, orderBy, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronLeft, Users, Rss, UserPlus, UserMinus, Hash } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { Group } from '@/app/groups/page';
import { PostForm } from '@/components/post-form';

type GroupPost = {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoUrl?: string;
    content: string;
    imageUrl?: string;
    createdAt: Timestamp;
    likes?: string[];
};

type UserProfile = {
    id: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    profession?: string;
}

function getInitials(name?: string | null) {
    if (!name) return 'AN';
    const names = name.trim().split(' ').filter(Boolean);
    if (names.length > 1 && names[names.length - 1]) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    if (names[0] && names[0].length > 1) {
        return names[0].substring(0, 2).toUpperCase();
    }
    return names[0] ? names[0].charAt(0).toUpperCase() : 'U';
}

function GroupHeader({ group, onMembershipChange }: { group: Group, onMembershipChange: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isMember = user ? group.members.includes(user.uid) : false;
    const isCreator = user ? group.creatorId === user.uid : false;

    const handleToggleMembership = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'You must be logged in.' });
            return;
        }

        setIsSubmitting(true);
        const groupDocRef = doc(firestore, 'groups', group.id);
        const userDocRef = doc(firestore, 'users', user.uid);
        
        try {
            const groupUpdateAction = isMember ? arrayRemove(user.uid) : arrayUnion(user.uid);
            const userUpdateAction = isMember ? arrayRemove(group.id) : arrayUnion(group.id);

            await Promise.all([
                updateDoc(groupDocRef, { members: groupUpdateAction }),
                updateDoc(userDocRef, { groups: userUpdateAction })
            ]);
            
            toast({
                title: isMember ? 'Left Group' : 'Joined Group',
                description: `You are now ${isMember ? 'no longer' : ''} a member of ${group.name}.`,
            });
            onMembershipChange();
        } catch (error) {
            console.error("Error toggling group membership:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your membership.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Card className="mb-8">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                           <Hash className="h-10 w-10 text-primary" />
                           <h1 className="text-4xl sm:text-5xl font-bold">{group.name}</h1>
                        </div>
                        <p className="text-muted-foreground">{group.description}</p>
                    </div>
                    {user && !isCreator && (
                        <Button onClick={handleToggleMembership} disabled={isSubmitting}>
                           {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isMember ? <UserMinus className="mr-2 h-4 w-4"/> : <UserPlus className="mr-2 h-4 w-4"/> }
                           {isMember ? 'Leave Group' : 'Join Group'}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardFooter>
                 <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</span>
                </div>
            </CardFooter>
        </Card>
    );
}

function GroupFeed({ group }: { group: Group }) {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    const isMember = user ? group.members.includes(user.uid) : false;

    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'groups', group.id, 'posts'), orderBy('createdAt', 'desc'));
    }, [firestore, group.id]);

    const { data: posts, isLoading } = useCollection<GroupPost>(postsQuery);

    if (isLoading || isUserLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading group feed...</p>
            </div>
        );
    }
    
    if (!isMember) {
        return (
            <Card className="text-center p-8">
                <CardTitle>This is a private group.</CardTitle>
                <CardDescription className="mt-2">Join the group to view and participate in discussions.</CardDescription>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Rss className="h-6 w-6"/> Group Feed</h2>
            <PostForm userProfile={user as any} groupId={group.id} />
            {posts && posts.length > 0 ? (
                posts.map(post => (
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
                                        {post.createdAt ? `${formatDistanceToNowStrict(post.createdAt.toDate())} ago` : '...'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <p className="text-sm whitespace-pre-wrap mb-4">{post.content}</p>
                            {post.imageUrl && (
                                <div className="relative rounded-lg overflow-hidden border aspect-video">
                                    <Image
                                        src={post.imageUrl}
                                        alt={`Post image from ${post.authorName}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card className="text-center p-8">
                    <CardTitle>The feed is empty.</CardTitle>
                    <CardDescription className="mt-2">Be the first to post in this group!</CardDescription>
                </Card>
            )}
        </div>
    );
}

function GroupPageContent() {
    const params = useParams();
    const groupId = params.groupId as string;
    const firestore = useFirestore();

    const groupDocRef = useMemoFirebase(() => {
        if (!firestore || !groupId) return null;
        return doc(firestore, 'groups', groupId);
    }, [firestore, groupId]);

    const { data: group, isLoading, error, mutate } = useDoc<Group>(groupDocRef);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Group...</p>
            </div>
        );
    }
    
    if (error || !group) {
        return (
            <div className="text-center py-16 text-destructive">
                <h2 className="text-2xl font-semibold">Group Not Found</h2>
                <p className="text-sm mt-2">The group you are looking for does not exist.</p>
                <Button asChild variant="outline" className="mt-4"><Link href="/groups">Back to Groups</Link></Button>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <GroupHeader group={group} onMembershipChange={mutate} />
            <GroupFeed group={group} />
        </div>
    )
}

export default function GroupPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-4xl">
                 <div className="mb-6">
                    <Button variant="outline" asChild>
                        <Link href="/groups"><ChevronLeft className="mr-2 h-4 w-4" /> All Groups</Link>
                    </Button>
                </div>
                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <GroupPageContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
