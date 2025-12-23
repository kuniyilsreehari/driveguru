
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center items-center">
                    <div className="p-3 bg-green-500/10 rounded-full w-fit mb-4">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl">Payment Successful!</CardTitle>
                    <CardDescription>
                        Your payment has been received and your account is being updated.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <div className="p-4 bg-secondary rounded-lg">
                        <div className="flex items-center justify-center gap-3 mb-2">
                             <Clock className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold">What Happens Next?</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            After payment verification, our team will contact you within a maximum of 12 hours.
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" asChild>
                        <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
