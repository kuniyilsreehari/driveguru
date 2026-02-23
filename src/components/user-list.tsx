'use client';

import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, DocumentData, Query, serverTimestamp, arrayRemove, arrayUnion, doc } from 'firebase/firestore';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { ExpertUser } from './expert-card';

interface UserListProps {
  userIds?: string[];
  userIdsQuery?: Query<DocumentData> | null;
  emptyStateMessage: string;
}

function getInitials(firstName?: string, lastName?: string) {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
}

export function UserList({ userIds, userIdsQuery, emptyStateMessage }: UserListProps) {
    const firestore = useFirestore();
    const { user: currentUser } = useUser();
    const { toast } = useToast();

    const usersQuery = useMemoFirebase(() => {
        if (userIdsQuery) {
            return userIdsQuery;
        }
        if (!firestore || !userIds || userIds.length === 0) return null;
        return query(collection(firestore, 'users'), where('__name__', 'in', userIds));
    }, [firestore, userIds, userIdsQuery]);

    const { data: users, isLoading } = useCollection<ExpertUser>(usersQuery);
    
    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !currentUser) return null;
        return doc(firestore, 'users', currentUser.uid);
    }, [firestore, currentUser]);
    
    const { data: currentUserProfile } = useDoc<ExpertUser>(userProfileRef);

    const handleToggleFollow = async (targetUser: ExpertUser) => {
        if (!firestore || !currentUserProfile || !userProfileRef) return;

        const isFollowing = currentUserProfile.following?.includes(targetUser.id);
        const updateAction = isFollowing ? arrayRemove(targetUser.id) : arrayUnion(targetUser.id);

        try {
            await updateDocumentNonBlocking(userProfileRef, { following: updateAction });
            
            if (!isFollowing) {
                // Create notification for the target user
                const targetNotifRef = collection(firestore, 'users', targetUser.id, 'notifications');
                addDocumentNonBlocking(targetNotifRef, {
                    type: 'new_follower',
                    message: `${currentUserProfile.firstName} ${currentUserProfile.lastName} started following you.`,
                    link: `/expert/${currentUser?.uid}`,
                    read: false,
                    actorId: currentUser?.uid,
                    actorName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                    actorPhotoUrl: currentUserProfile.photoUrl || '',
                    createdAt: serverTimestamp(),
                });
            }

            toast({
                title: isFollowing ? 'Unfollowed' : 'Followed',
                description: `You are now ${isFollowing ? 'no longer following' : 'following'} ${targetUser.firstName} ${targetUser.lastName}.`,
            });
        } catch (error) {
            console.error("Failed to toggle follow", error);
            if ((error as any).name !== 'FirebaseError') {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not update your follow status.' });
            }
        }
    };
    
    if (isLoading) {
        return <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin" />;
    }

    if (!users || users.length === 0) {
        return <p className="text-center text-sm text-muted-foreground p-4">{emptyStateMessage}</p>;
    }

    return (
        <div className="space-y-3">
            {users.map((user) => {
                 const isFollowing = currentUserProfile?.following?.includes(user.id);
                return (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50">
                        <Link href={`/expert/${user.id}`} className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={user.photoUrl} />
                                <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-muted-foreground">{user.profession || user.role}</p>
                            </div>
                        </Link>
                        {currentUser && currentUser.uid !== user.id && (
                             <Button
                                variant={isFollowing ? 'secondary' : 'default'}
                                size="sm"
                                onClick={() => handleToggleFollow(user)}
                            >
                                {isFollowing ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
