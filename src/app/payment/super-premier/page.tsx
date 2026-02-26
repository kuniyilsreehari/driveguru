'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Sparkles, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createPaymentOrder } from '@/ai/flows/payment-flow';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

function SuperPremierPaymentPageContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
    const { toast } = useToast();
    const router = useRouter();

    const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
    const { data: appConfig } = useDoc(appConfigDocRef);

    const handlePayment = async () => {
        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Not Logged In',
                description: 'You must be logged in to make a payment.',
            });
            router.push('/login');
            return;
        }

        setIsCreatingOrder(true);
        try {
            const { payment_link } = await createPaymentOrder({
                userId: user.uid,
                userEmail: user.email || '',
                userName: user.displayName || 'New User',
                userPhone: user.phoneNumber || '',
                plan: 'Super Premier',
                billingCycle: billingCycle,
            });

            if (payment_link) {
                router.push(payment_link);
            } else {
                throw new Error("Could not retrieve payment link.");
            }
        } catch (error: any) {
            console.error("Payment order creation failed:", error);
            toast({
                variant: 'destructive',
                title: "Action Failed",
                description: error.message || "Could not initiate the payment process. Please try again.",
            });
        } finally {
            setIsCreatingOrder(false);
        }
    };

    if (isUserLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading your details...</p>
            </div>
        );
    }

    const prices = appConfig?.superPremierPlanPrices || { daily: 0, monthly: 0, yearly: 0 };

    return (
        <div className="space-y-6">
             <Button variant="outline" asChild>
                <Link href={`/dashboard`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
            <Card className="border-none bg-[#24262d] shadow-2xl rounded-[2rem] overflow-hidden">
                <CardHeader className="text-center bg-white/5 border-b border-white/5 pb-8">
                    <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-4">
                        <Sparkles className="h-12 w-12 text-blue-500" />
                    </div>
                    <CardTitle className="text-3xl font-black uppercase italic">Elite Access</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Unlock full AI suite and maximum platform visibility.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                   <div className="space-y-4">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tight text-center">Choose Your Billing Cycle</h3>
                     <RadioGroup value={billingCycle} onValueChange={(value: 'daily' | 'monthly' | 'yearly') => setBillingCycle(value)} className="grid grid-cols-1 gap-3">
                        <div className={cn("flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer", billingCycle === 'daily' ? "bg-blue-500/10 border-blue-500" : "bg-white/5 border-white/5")} onClick={() => setBillingCycle('daily')}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="daily" id="daily" className="border-blue-500 text-blue-500" />
                                <Label htmlFor="daily" className="font-black uppercase italic cursor-pointer">Daily Power</Label>
                            </div>
                            <span className="font-black text-blue-500">₹{prices.daily}</span>
                        </div>
                        <div className={cn("flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer", billingCycle === 'monthly' ? "bg-blue-500/10 border-blue-500" : "bg-white/5 border-white/5")} onClick={() => setBillingCycle('monthly')}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="monthly" id="monthly" className="border-blue-500 text-blue-500" />
                                <Label htmlFor="monthly" className="font-black uppercase italic cursor-pointer">Monthly Elite</Label>
                            </div>
                            <span className="font-black text-blue-500">₹{prices.monthly}</span>
                        </div>
                        <div className={cn("flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer", billingCycle === 'yearly' ? "bg-blue-500/10 border-blue-500" : "bg-white/5 border-white/5")} onClick={() => setBillingCycle('yearly')}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="yearly" id="yearly" className="border-blue-500 text-blue-500" />
                                <Label htmlFor="yearly" className="font-black uppercase italic cursor-pointer">Yearly Legend</Label>
                            </div>
                            <span className="font-black text-blue-500">₹{prices.yearly}</span>
                        </div>
                    </RadioGroup>
                   </div>
                </CardContent>
                <CardFooter className="bg-white/5 p-8">
                    <Button onClick={handlePayment} disabled={isCreatingOrder} className="w-full h-14 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 uppercase tracking-widest transition-all active:scale-95">
                        {isCreatingOrder ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Creating Session...</>
                        ) : (
                            <><ExternalLink className="mr-2 h-5 w-5" />Proceed to Payment</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function SuperPremierPaymentPage() {
    return (
        <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        </div>
                    }>
                        <SuperPremierPaymentPageContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
