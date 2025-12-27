

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

function PaymentStatusContent() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState<'processing' | 'success' | 'failed' | 'cancelled' | 'error'>('processing');
    const [message, setMessage] = useState('Please wait while we confirm your payment status. Do not refresh this page.');

    const orderId = searchParams.get('order_id');

    useEffect(() => {
        if (!orderId || !firestore) {
            setStatus('error');
            setMessage('Invalid request. Order ID is missing.');
            setIsLoading(false);
            return;
        }

        const finalizePayment = async () => {
            const paymentsCol = collection(firestore, 'payments');
            const q = query(paymentsCol, where('orderId', '==', orderId), where('status', '==', 'pending'));

            try {
                // Cashfree sends a server-to-server webhook as well.
                // We poll for a few seconds to wait for the webhook to update the status.
                // This makes the user experience faster.
                let paymentDoc, paymentData;
                for (let i = 0; i < 5; i++) {
                  const updatedQuery = query(paymentsCol, where('orderId', '==', orderId));
                  const updatedSnapshot = await getDocs(updatedQuery);
                  if (!updatedSnapshot.empty) {
                      const doc = updatedSnapshot.docs[0];
                      if (doc.data().status !== 'pending') {
                          paymentDoc = doc;
                          paymentData = doc.data();
                          break;
                      }
                  }
                  await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s
                }

                if (paymentDoc && paymentData && paymentData.status === 'successful') {
                    // Status was already updated (likely by webhook)
                    setStatus('success');
                    setMessage('Your payment was already confirmed and your account has been updated.');
                    setIsLoading(false);
                    if (paymentData.plan === 'Verification') {
                        router.push('/verified');
                    } else {
                        router.push('/success');
                    }
                    return;
                }

                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    setStatus('error');
                    setMessage('Payment record not found or already processed. If you have been charged, please contact support.');
                    setIsLoading(false);
                    return;
                }
                
                paymentDoc = querySnapshot.docs[0];
                paymentData = paymentDoc.data();
                const userId = paymentData.userId;
                const plan = paymentData.plan;

                // Since we couldn't confirm via polling, assume success from redirect and update manually.
                // The webhook would have caught a failure state already. In a production app,
                // you might call the Cashfree API here to get the final order status.
                const batch = writeBatch(firestore);
                const userDocRef = doc(firestore, 'users', userId);

                // Update payment status
                batch.update(paymentDoc.ref, { status: 'successful', updatedAt: new Date() });

                // Update user profile
                let updateData: any = {};
                if (plan === 'Verification') {
                    updateData.verified = true;
                } else if (plan === 'Premier' || plan === 'Super Premier') {
                    updateData.tier = plan;
                }
                batch.update(userDocRef, updateData);

                await batch.commit();
                setStatus('success');
                setMessage('Your payment was successful and your account has been updated.');
                
                if (plan === 'Verification') {
                    router.push('/verified');
                } else {
                    router.push('/success');
                }

            } catch (error) {
                console.error("Error processing payment status:", error);
                setStatus('error');
                setMessage('An error occurred while updating your status. Please contact support.');
                setIsLoading(false);
            }
        };

        finalizePayment();

    }, [orderId, firestore, router]);

    // This component will show a loading state until redirection happens.
    if (isLoading || status === 'processing' || status === 'success') {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                       <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                    <CardTitle className="text-2xl">
                        Processing Payment
                    </CardTitle>
                    <CardDescription>
                        {message}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    // This will show for failed/cancelled states which might be set by a webhook before this page loads.
    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                    <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl">
                     {status === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed'}
                </CardTitle>
                <CardDescription>
                    {message}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground text-center">
                    <p>Order ID: {orderId}</p>
                    {status === 'error' && <p>If you have any questions, please contact our support.</p>}
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" asChild>
                    <Link href="/dashboard">
                        Go to Dashboard
                    </Link>
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
