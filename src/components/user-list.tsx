'use client';

import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, DocumentData, Query, serverTimestamp, arrayRemove, arrayUnion, doc } from 'firebase/firestore';
import { Loader2, UserMinus, UserPlus, UserCheck, Crown, Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { ExpertUser } from './expert-card';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

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
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Syncing Connections...</p>
            </div>
        );
    }

    if (!users || users.length === 0) {
        return (
            <div className="text-center py-16 bg-white/5 rounded-3xl border-4 border-dashed border-white/5 px-6">
                <p className="text-sm text-muted-foreground font-bold leading-relaxed">{emptyStateMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {users.map((user) => {
                const isFollowing = currentUserProfile?.following?.includes(user.id);
                // Check if this person follows me back (requires their 'following' array)
                // Note: In a production app, you might want to fetch this specific relationship if not available.
                const followsMe = user.following?.includes(currentUser?.uid || '');

                return (
                    <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                        <Link href={`/expert/${user.id}`} className="flex items-center gap-4 flex-1">
                            <div className="relative">
                                <Avatar className="h-14 w-14 border-2 border-white/5 group-hover:border-orange-500/30 transition-colors">
                                    <AvatarImage src={user.photoUrl} className="object-cover" />
                                    <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-xl">
                                        {getInitials(user.firstName, user.lastName)}
                                    </AvatarFallback>
                                </Avatar>
                                {user.verified && (
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 p-1 rounded-full border-2 border-[#24262d]">
                                        <UserCheck className="h-2.5 w-2.5 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-black text-white text-lg group-hover:text-orange-500 transition-colors">
                                        {user.firstName} {user.lastName}
                                    </p>
                                    {followsMe && (
                                        <Badge variant="outline" className="h-5 px-2 bg-orange-500/5 border-orange-500/20 text-orange-500 text-[9px] font-black uppercase tracking-tighter">
                                            Follows You
                                        </Badge>
                                    )}
                                    {user.tier === 'Super Premier' && <Sparkles className="h-3 w-3 text-blue-500" />}
                                    {user.tier === 'Premier' && <Crown className="h-3 w-3 text-purple-500" />}
                                </div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {user.profession || user.role}
                                </p>
                            </div>
                        </Link>
                        
                        {currentUser && currentUser.uid !== user.id && (
                             <Button
                                variant={isFollowing ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => handleToggleFollow(user)}
                                className={cn(
                                    "rounded-xl font-black text-xs h-10 px-4 transition-all active:scale-95",
                                    isFollowing 
                                        ? "border-white/10 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50" 
                                        : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                                )}
                            >
                                {isFollowing ? (
                                    <><UserMinus className="mr-2 h-4 w-4" /> Unfollow</>
                                ) : (
                                    <><UserPlus className="mr-2 h-4 w-4" /> Follow</>
                                )}
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
