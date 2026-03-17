'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
        return <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Stats...</p>;
    }

    return (
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <div className="flex items-center gap-1">
                <span className="text-orange-500">{followers?.length || 0}</span>
                <span>Followers</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1">
                <span className="text-orange-500">{followingCount}</span>
                <span>Following</span>
            </div>
        </div>
    );
}
