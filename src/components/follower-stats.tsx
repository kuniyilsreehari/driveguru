
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Users } from 'lucide-react';
import type { ExpertUser } from '@/components/expert-card';

export function FollowerStats({ expert }: { expert: ExpertUser }) {
    const firestore = useFirestore();

    const followersQuery = useMemoFirebase(() => {
        if (!firestore || !expert.id) return null;
        return query(collection(firestore, 'users'), where('following', 'array-contains', expert.id));
    }, [firestore, expert.id]);

    const { data: followers, isLoading: isLoadingFollowers } = useCollection(followersQuery);
    
    const followingCount = expert.following?.length || 0;

    if (isLoadingFollowers) {
        return <p className="text-xs text-muted-foreground">Loading stats...</p>;
    }

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{followers?.length || 0} Followers</p>
            </div>
            <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground">{followingCount} Following</p>
            </div>
        </div>
    );
}
