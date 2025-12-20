
'use client';

import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

type AppConfig = {
    availabilityLocationText?: string;
};

export function Footer() {
    const firestore = useFirestore();
    const appConfigDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'app_config', 'homepage');
    }, [firestore]);
    
    const { data: appConfig } = useDoc<AppConfig>(appConfigDocRef);

    const availabilityText = appConfig?.availabilityLocationText || 'Kozhikode - Kerala';

    return (
        <footer className="bg-background text-secondary-foreground border-t">
            <div className="container py-4 text-center text-sm text-muted-foreground">
                <p className="mb-2">Available in: {availabilityText}</p>
                <div className="border-t border-border/50 pt-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                    <p>&copy; {new Date().getFullYear()} DriveGuru. All rights reserved.</p>
                    <div className="flex items-center gap-x-4 gap-y-2 flex-wrap justify-center">
                         <Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
                         <span className="hidden sm:inline">•</span>
                         <Link href="/cancellation-policy" className="hover:text-primary transition-colors">Cancellation & Refund Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
