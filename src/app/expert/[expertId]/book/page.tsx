
'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClientBookingForm } from '@/components/auth/client-booking-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl?: string;
    companyName?: string;
    phoneNumber?: string;
};

function BookingPageContent() {
    const params = useParams();
    const expertId = params.expertId as string;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();

    const expertDocRef = useMemoFirebase(() => {
        if (!firestore || !expertId) return null;
        return doc(firestore, 'users', expertId);
    }, [firestore, expertId]);

    const { data: expert, isLoading: isLoadingExpert } = useDoc<ExpertUserProfile>(expertDocRef);
    
    if (isUserLoading || isLoadingExpert) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Booking Form...</p>
            </div>
        );
    }
    
    if (!user) {
         return (
            <div className="text-center">
                <p className="mb-4">You need to be logged in to book an appointment.</p>
                <Button asChild>
                    <Link href={`/login?redirect=/expert/${expertId}/book`}>Login</Link>
                </Button>
            </div>
        )
    }

    if (!expert) {
        return <p>Expert not found.</p>
    }
    
    const expertName = expert.companyName || `${expert.firstName} ${expert.lastName}`;

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href={`/expert/${expertId}`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Profile</Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Book an Appointment</CardTitle>
                    <CardDescription>You are booking an appointment with <span className="font-bold text-primary">{expertName}</span>. Please fill out the details below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ClientBookingForm client={user} expert={expert} />
                </CardContent>
            </Card>
        </div>
    )
}


export default function BookAppointmentPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <Suspense fallback={
                    <div className="flex h-screen w-full items-center justify-center bg-background">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                }>
                    <BookingPageContent />
                </Suspense>
            </div>
        </div>
    )
}
