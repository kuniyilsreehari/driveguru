

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
    const orderStatus = searchParams.get('order_status'); // For Cashfree v2023-08-01, status is in order_status

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
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    // Could be that the user refreshed the page after a successful update.
                    // Check if a successful payment already exists.
                    const successQuery = query(paymentsCol, where('orderId', '==', orderId), where('status', '==', 'successful'));
                    const successSnapshot = await getDocs(successQuery);
                    if (!successSnapshot.empty) {
                        const paymentData = successSnapshot.docs[0].data();
                        setStatus('success');
                        setMessage('Your payment was already confirmed and your account has been updated.');
                         // Redirect to the correct page based on the already-processed plan
                        if (paymentData.plan === 'Verification') {
                            router.push('/verified');
                        } else {
                            router.push('/success');
                        }
                    } else {
                        setStatus('error');
                        setMessage('Payment record not found or already processed. If you have been charged, please contact support.');
                    }
                    setIsLoading(false);
                    return;
                }

                const paymentDoc = querySnapshot.docs[0];
                const paymentData = paymentDoc.data();
                const userId = paymentData.userId;
                const plan = paymentData.plan;

                const batch = writeBatch(firestore);
                const userDocRef = doc(firestore, 'users', userId);

                if (orderStatus === 'PAID') {
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
                    
                    // Redirect to a specific page based on the plan
                    if (plan === 'Verification') {
                        router.push('/verified');
                    } else {
                        router.push('/success');
                    }

                } else if (orderStatus === 'CANCELLED') {
                    batch.update(paymentDoc.ref, { status: 'failed', updatedAt: new Date() });
                    await batch.commit();
                    setStatus('cancelled');
                    setMessage('Your payment was cancelled.');
                    setIsLoading(false);
                } else { // FAILED or other status
                    batch.update(paymentDoc.ref, { status: 'failed', updatedAt: new Date() });
                    await batch.commit();
                    setStatus('failed');
setMessage('There was an issue with your payment. Please try again.');
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Error processing payment status:", error);
                setStatus('error');
                setMessage('An error occurred while updating your status. Please contact support.');
                setIsLoading(false);
            }
        };

        finalizePayment();

    }, [orderId, orderStatus, firestore, router]);

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
    
    // This will show for failed/cancelled states
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
