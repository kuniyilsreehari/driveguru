
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, Loader2, CheckCircle, XCircle, Crown, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, Timestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';

type Booking = {
    id: string;
    expertId: string;
    clientName: string;
    clientContact: string;
    place: string;
    workDescription: string;
    bookingDate: Timestamp;
    status: 'confirmed' | 'completed' | 'cancelled';
    createdAt: Timestamp;
};

type ExpertUser = {
    tier?: 'Standard' | 'Premier' | 'Super Premier';
};

export default function BookingSystemPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userProfile, isLoading: isProfileLoading } = useCollection<ExpertUser>(userDocRef as any);

    const bookingsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'bookings'),
            where('expertId', '==', user.uid),
            orderBy('bookingDate', 'desc')
        );
    }, [firestore, user]);

    const { data: bookings, isLoading: isBookingsLoading } = useCollection<Booking>(bookingsQuery);

    const isLoading = isUserLoading || isBookingsLoading || isProfileLoading;
    const isPremiumUser = userProfile?.tier === 'Premier' || userProfile?.tier === 'Super Premier';

    const handleUpdateStatus = (bookingId: string, status: 'completed' | 'cancelled') => {
        if (!firestore) return;
        const bookingDocRef = doc(firestore, 'bookings', bookingId);
        updateDocumentNonBlocking(bookingDocRef, { status });
        toast({
            title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            description: `The booking has been marked as ${status}.`,
        });
        if (bookingToCancel) {
            setBookingToCancel(null);
        }
    };

    if (isLoading) {
         return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Booking System...</p>
            </div>
        );
    }
    
    if (!isPremiumUser) {
        return (
             <div className="min-h-screen bg-background p-4 sm:p-8">
                <div className="mx-auto max-w-5xl">
                     <header className="pb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Lock className="h-10 w-10 text-destructive" />
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-bold">Access Denied</h1>
                                <p className="text-muted-foreground">This is a premium feature.</p>
                            </div>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href="/dashboard"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                        </Button>
                    </header>
                    <main>
                        <Card className="text-center">
                            <CardHeader>
                                <CardTitle>Upgrade to Access the Booking System</CardTitle>
                                <CardDescription>The Booking System is available for Premier and Super Premier experts.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4">Upgrade your plan to manage appointments, track your schedule, and provide a more professional experience to your clients.</p>
                                <Button asChild>
                                    <Link href="/dashboard#plan-management">
                                        <Crown className="mr-2 h-4 w-4"/> View Upgrade Options
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="pb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Calendar className="h-10 w-10 text-primary" />
                        <div>
                            <h1 className="text-4xl sm:text-5xl font-bold">Booking System</h1>
                            <p className="text-muted-foreground">Manage all your client appointments.</p>
                        </div>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                    </Button>
                </header>
                <main>
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Bookings</CardTitle>
                            <CardDescription>A complete log of all your scheduled appointments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading your bookings...
                                </div>
                            ) : bookings && bookings.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Place</TableHead>
                                            <TableHead>Work</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookings.map((booking) => (
                                            <TableRow key={booking.id}>
                                                <TableCell>
                                                    <div className="font-medium">{booking.clientName}</div>
                                                    <div className="text-xs text-muted-foreground">{booking.clientContact}</div>
                                                </TableCell>
                                                <TableCell>{booking.place}</TableCell>
                                                <TableCell className="max-w-[200px] truncate">{booking.workDescription}</TableCell>
                                                <TableCell>{booking.bookingDate ? format(booking.bookingDate.toDate(), 'PPp') : 'N/A'}</TableCell>
                                                <TableCell>{booking.status}</TableCell>
                                                <TableCell className="text-right">
                                                    {booking.status === 'confirmed' && (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(booking.id, 'completed')}>
                                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500"/> Complete
                                                            </Button>
                                                            <AlertDialogTrigger asChild>
                                                                <Button size="sm" variant="destructive" onClick={() => setBookingToCancel(booking)}>
                                                                    <XCircle className="mr-2 h-4 w-4"/> Cancel
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-16 text-muted-foreground">
                                    You have not logged any bookings yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </main>
                <AlertDialog>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will cancel the booking with {bookingToCancel?.clientName}. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setBookingToCancel(null)}>Back</AlertDialogCancel>
                            <AlertDialogAction onClick={() => bookingToCancel && handleUpdateStatus(bookingToCancel.id, 'cancelled')} className="bg-destructive hover:bg-destructive/90">
                                Yes, Cancel Booking
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
