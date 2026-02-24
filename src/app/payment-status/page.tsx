'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { verifyPaymentOrder } from '@/ai/flows/payment-flow';

function PaymentStatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'processing' | 'success' | 'failed' | 'error'>('processing');
    const [message, setMessage] = useState('Verifying your transaction with Cashfree...');
    const orderId = searchParams.get('order_id');

    useEffect(() => {
        if (!orderId) {
            setStatus('error');
            setMessage('Order ID missing from redirect.');
            return;
        }

        const verify = async () => {
            try {
                const result = await verifyPaymentOrder({ orderId });
                if (result.status === 'SUCCESS') {
                    setStatus('success');
                    setMessage(result.message);
                    // Automatic redirect after a short delay
                    setTimeout(() => {
                        if (result.plan === 'Verification') router.push('/verified');
                        else router.push('/success');
                    }, 3000);
                } else {
                    setStatus('failed');
                    setMessage(result.message);
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'System error during verification.');
            }
        };

        verify();
    }, [orderId, router]);

    return (
        <Card className="w-full max-w-md border-none bg-card shadow-2xl rounded-[2rem] overflow-hidden">
            <CardHeader className="text-center items-center pt-10">
                {status === 'processing' && (
                    <div className="p-4 bg-orange-500/10 rounded-full mb-4">
                        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                    </div>
                )}
                {status === 'success' && (
                    <div className="p-4 bg-green-500/10 rounded-full mb-4">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                )}
                {status === 'failed' || status === 'error' && (
                    <div className="p-4 bg-red-500/10 rounded-full mb-4">
                        <XCircle className="h-10 w-10 text-red-500" />
                    </div>
                )}
                <CardTitle className="text-3xl font-black uppercase italic">
                    {status === 'processing' ? 'Verifying' : status === 'success' ? 'Confirmed!' : 'Payment Issue'}
                </CardTitle>
                <CardDescription className="text-muted-foreground font-medium pt-2">
                    {message}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-10">
                {status === 'success' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Redirecting to your new profile...</p>
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground opacity-30" />
                    </div>
                )}
                {(status === 'failed' || status === 'error') && (
                    <div className="bg-white/5 p-4 rounded-xl text-xs font-mono text-muted-foreground break-all">
                        ORDER_ID: {orderId}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button className="w-full h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold" asChild>
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function PaymentStatusPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
             <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <PaymentStatusContent />
            </Suspense>
        </div>
    );
}
