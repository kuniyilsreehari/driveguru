
'use client';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CentralCallButton() {
    const firestore = useFirestore();
    const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
    const { data: appConfig, isLoading } = useDoc<any>(appConfigDocRef);

    if (isLoading || !appConfig?.centralContactPhone) return null;

    const cleanNumber = appConfig.centralContactPhone.replace(/\s+/g, '');

    return (
        <div className="fixed bottom-32 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button
                asChild
                className="h-14 w-14 rounded-full shadow-2xl bg-green-500 hover:bg-green-600 text-white p-0 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-4 border-white/10"
            >
                <a href={`tel:${cleanNumber}`} aria-label="Call Support">
                    <Phone className="h-7 w-7 fill-white" />
                </a>
            </Button>
        </div>
    );
}
