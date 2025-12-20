
'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

function PaymentStatusContent() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    
    const orderId = searchParams.get('order_id');
    const txStatus = searchParams.get('tx_status') || searchParams.get('txStatus'); // Cashfree uses both casings
    const uid = searchParams.get('uid');
    const plan = searchParams.get('plan') as 'Premier' | 'Super Premier' | 'Verification' | null;

    useEffect(() => {
        if (txStatus === 'SUCCESS' && uid && plan && firestore) {
            const userDocRef = doc(firestore, 'users', uid);
            let updateData: any = {};

            if (plan === 'Verification') {
                updateData.verified = true;
                updateData.tier = 'Standard';
            } else if (plan === 'Premier' || plan === 'Super Premier') {
                updateData.tier = plan;
            }

            if (Object.keys(updateData).length > 0) {
                updateDocumentNonBlocking(userDocRef, updateData)
                    .catch(error => {
                        console.error("Failed to update user profile after payment:", error);
                        // Optionally, show a toast to the user here
                    });
            }
        }
    }, [txStatus, uid, plan, firestore]);

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                    {txStatus === 'SUCCESS' ? (
                         <CheckCircle className="h-8 w-8 text-green-500" />
                    ) : txStatus === 'FAILED' || txStatus === 'CANCELLED' ? (
                        <XCircle className="h-8 w-8 text-destructive" />
                    ) : (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    )}
                </div>
                <CardTitle className="text-2xl">
                     {txStatus === 'SUCCESS' ? 'Payment Successful' : txStatus === 'FAILED' ? 'Payment Failed' : txStatus === 'CANCELLED' ? 'Payment Cancelled' : 'Processing Payment'}
                </CardTitle>
                <CardDescription>
                    {txStatus === 'SUCCESS' ? `Your account has been updated.` : txStatus === 'FAILED' ? 'There was an issue with your payment.' : txStatus === 'CANCELLED' ? 'Your payment was cancelled.' : 'Please wait while we confirm your payment status. Do not refresh this page.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground text-center">
                    <p>Order ID: {orderId}</p>
                    <p>If you have any questions, please contact our support.</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" asChild>
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}


export default function PaymentStatusPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
             <Suspense fallback={
                <div className="flex h-64 w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }>
                <PaymentStatusContent />
            </Suspense>
        </div>
    );
}
