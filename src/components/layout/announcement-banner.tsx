
'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppConfig = {
    isAnnouncementEnabled?: boolean;
    announcementText?: string;
    announcementSpeed?: number;
};

export function AnnouncementBanner() {
    const firestore = useFirestore();

    const appConfigDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'app_config', 'homepage');
    }, [firestore]);

    const { data: appConfig, isLoading } = useDoc<AppConfig>(appConfigDocRef);

    const animationStyle = useMemo(() => {
        if (!appConfig?.announcementSpeed) return {};
        return {
            '--animation-duration': `${appConfig.announcementSpeed}s`,
        } as React.CSSProperties;
    }, [appConfig?.announcementSpeed]);

    if (isLoading || !appConfig?.isAnnouncementEnabled || !appConfig.announcementText) {
        return null;
    }

    return (
        <div className="bg-primary text-primary-foreground text-sm z-50">
            <div className="container mx-auto overflow-hidden whitespace-nowrap">
                <div className="flex items-center gap-4 h-8 animate-marquee" style={animationStyle}>
                    <Megaphone className="h-4 w-4 flex-shrink-0" />
                    <span className="font-semibold">{appConfig.announcementText}</span>
                </div>
            </div>
        </div>
    );
}
