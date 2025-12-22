
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, doc, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, ChevronLeft, Check, X, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

type Booking = {
    id: string;
    clientName: string;
    clientContact: string;
    place: string;
    workDescription: string;
    bookingDate: Timestamp;
    status: 'confirmed' | 'completed' | 'cancelled';
    createdAt: Timestamp;
};

export default function BookingSystemPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const bookingsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'bookings'),
            where('expertId', '==', user.uid),
            orderBy('bookingDate', 'desc')
        );
    }, [firestore, user]);

    const { data: bookings, isLoading } = useCollection<Booking>(bookingsQuery);

    const handleStatusChange = (bookingId: string, status: 'completed' | 'cancelled') => {
        if (!firestore) return;
        const bookingDocRef = doc(firestore, 'bookings', bookingId);
        updateDocumentNonBlocking(bookingDocRef, { status });
        toast({
            title: 'Booking Updated',
            description: `The booking has been marked as ${status}.`
        });
    };
    
    const renderStatusBadge = (status: Booking['status']) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Completed</Badge>;
            case 'confirmed':
                return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Confirmed</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isLoading || isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading your bookings...</p>
            </div>
        );
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
                            <CardDescription>Here is a list of all your past and upcoming appointments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Booking Date</TableHead>
                                        <TableHead>Work</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings && bookings.length > 0 ? (
                                        bookings.map((booking) => (
                                            <TableRow key={booking.id}>
                                                <TableCell>
                                                    <div className="font-medium">{booking.clientName}</div>
                                                    <div className="text-xs text-muted-foreground">{booking.clientContact}</div>
                                                </TableCell>
                                                <TableCell>{booking.bookingDate ? format(booking.bookingDate.toDate(), 'PPp') : 'N/A'}</TableCell>
                                                <TableCell className="max-w-xs truncate" title={booking.workDescription}>{booking.workDescription}</TableCell>
                                                <TableCell>{renderStatusBadge(booking.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    {booking.status === 'confirmed' && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'completed')}>
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    Mark as Completed
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'cancelled')} className="text-destructive">
                                                                    <X className="mr-2 h-4 w-4" />
                                                                    Cancel Booking
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                You have not logged any bookings yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
