
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function BookingSystemPage() {
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
                            <CardDescription>This is where your bookings will appear.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-16 text-muted-foreground">
                                Booking management functionality is coming soon.
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
