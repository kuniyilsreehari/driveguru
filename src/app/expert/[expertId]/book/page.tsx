
'use client';

import { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Calendar } from 'lucide-react';
import { ClientBookingForm } from '@/components/auth/client-booking-form';

type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string;
};

function BookingPageContent() {
    const params = useParams();
    const expertId = params.expertId as string;
    const firestore = useFirestore();


    const expertDocRef = useMemoFirebase(() => {
        if (!firestore || !expertId) return null;
        return doc(firestore, 'users', expertId);
    }, [firestore, expertId]);

    const { data: expert, isLoading } = useDoc<ExpertUserProfile>(expertDocRef);
    
    const displayName = expert?.companyName || `${expert?.firstName} ${expert?.lastName}`;

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading expert details...</p>
            </div>
        );
    }
    
    if (!expert) {
        return (
             <div className="text-center py-16">
                <h2 className="text-2xl font-semibold">Expert Not Found</h2>
                <p className="text-muted-foreground mt-2">The expert you are trying to book does not exist.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
             <Button variant="outline" asChild>
                <Link href={`/expert/${expertId}`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Profile</Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl sm:text-3xl">Book an Appointment</CardTitle>
                    <CardDescription>Select a date and fill out the form to book an appointment with {displayName}.</CardDescription>
                </CardHeader>
                <CardContent>
                   <ClientBookingForm expertId={expertId} />
                </CardContent>
            </Card>
        </div>
    );
}

export default function BookingPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <header className="pb-8 flex items-center gap-3">
                    <Calendar className="h-10 w-10 text-primary" />
                    <div>
                         <h1 className="text-4xl sm:text-5xl font-bold">Booking</h1>
                        <p className="text-muted-foreground">Schedule your session</p>
                    </div>
                </header>
                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <BookingPageContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
