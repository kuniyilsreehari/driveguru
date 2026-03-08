'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Crown, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createPaymentOrder } from '@/ai/flows/payment-flow';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

function PremierPaymentPageContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
    const { toast } = useToast();
    const router = useRouter();

    const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
    const { data: appConfig } = useDoc<any>(appConfigDocRef);

    const handlePayment = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'Please sign in to upgrade.' });
            router.push('/login');
            return;
        }

        // CRITICAL: Initialize the window reference SYNCHRONOUSLY to prevent popup blocking.
        // The URL is set later once the secure flow finishes.
        const checkoutWindow = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
        
        if (!checkoutWindow) {
            toast({ 
                variant: 'destructive', 
                title: 'Popup Blocked', 
                description: 'Please allow popups for DriveGuru to proceed to the secure payment gateway.' 
            });
            return;
        }

        setIsCreatingOrder(true);
        try {
            const result = await createPaymentOrder({
                userId: user.uid,
                userEmail: user.email || '',
                userName: user.displayName || 'Expert User',
                userPhone: user.phoneNumber || '',
                plan: 'Premier',
                billingCycle: billingCycle,
            });

            if (result.error) {
                checkoutWindow.close();
                throw new Error(result.error);
            }

            if (result.payment_link) {
                // Securely redirect the pre-opened tab to the checkout URL
                checkoutWindow.location.href = result.payment_link;
            } else {
                checkoutWindow.close();
                throw new Error("Automated link generation failed. Please contact support.");
            }
        } catch (error: any) {
            console.error("Payment initiation failed:", error);
            if (checkoutWindow) checkoutWindow.close();
            toast({
                variant: 'destructive',
                title: "Gateway Error",
                description: error.message || "Failed to retrieve the secure link. Please try again.",
            });
        } finally {
            setIsCreatingOrder(false);
        }
    };

    if (isUserLoading) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Wallet...</p>
            </div>
        );
    }

    const prices = appConfig?.premierPlanPrices || { daily: 10, monthly: 200, yearly: 1000 };

    return (
        <div className="space-y-6">
             <Button variant="outline" asChild className="rounded-xl border-white/10 hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest h-10">
                <Link href={`/dashboard`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
            <Card className="border-none bg-[#24262d] shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="text-center bg-white/5 border-b border-white/5 pb-10 pt-12">
                    <div className="p-5 bg-orange-500/10 rounded-full w-fit mx-auto mb-6 shadow-inner">
                        <Crown className="h-14 w-12 text-orange-500" />
                    </div>
                    <CardTitle className="text-4xl font-black uppercase italic tracking-tighter text-white">Upgrade to Premier</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium pt-2 text-base">Unlock professional bio generation and smart skills.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 sm:p-12 space-y-10">
                   <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] text-center mb-8">Choose Your Billing Cycle</h3>
                     <RadioGroup value={billingCycle} onValueChange={(value: 'daily' | 'monthly' | 'yearly') => setBillingCycle(value)} className="grid grid-cols-1 gap-4">
                        <div className={cn("flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all cursor-pointer", billingCycle === 'daily' ? "bg-orange-500/10 border-orange-500 shadow-xl shadow-orange-500/5" : "bg-white/5 border-white/5 hover:bg-white/10")} onClick={() => setBillingCycle('daily')}>
                            <div className="flex items-center gap-5">
                                <RadioGroupItem value="daily" id="daily" className="border-orange-500 text-orange-500 h-6 w-6" />
                                <Label htmlFor="daily" className="font-black uppercase italic text-sm cursor-pointer tracking-tight">DAILY POWER</Label>
                            </div>
                            <span className="font-black text-orange-500 text-2xl">₱{prices.daily}</span>
                        </div>
                        <div className={cn("flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all cursor-pointer", billingCycle === 'monthly' ? "bg-orange-500/10 border-orange-500 shadow-xl shadow-orange-500/5" : "bg-white/5 border-white/5 hover:bg-white/10")} onClick={() => setBillingCycle('monthly')}>
                            <div className="flex items-center gap-5">
                                <RadioGroupItem value="monthly" id="monthly" className="border-orange-500 text-orange-500 h-6 w-6" />
                                <Label htmlFor="monthly" className="font-black uppercase italic text-sm cursor-pointer tracking-tight">MONTHLY PROFESSIONAL</Label>
                            </div>
                            <span className="font-black text-orange-500 text-2xl">₱{prices.monthly}</span>
                        </div>
                        <div className={cn("flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all cursor-pointer", billingCycle === 'yearly' ? "bg-orange-500/10 border-orange-500 shadow-xl shadow-orange-500/5" : "bg-white/5 border-white/5 hover:bg-white/10")} onClick={() => setBillingCycle('yearly')}>
                            <div className="flex items-center gap-5">
                                <RadioGroupItem value="yearly" id="yearly" className="border-orange-500 text-orange-500 h-6 w-6" />
                                <Label htmlFor="yearly" className="font-black uppercase italic text-sm cursor-pointer tracking-tight">YEARLY EXECUTIVE</Label>
                            </div>
                            <span className="font-black text-orange-500 text-2xl">₱{prices.yearly}</span>
                        </div>
                    </RadioGroup>
                   </div>
                </CardContent>
                <CardFooter className="bg-white/5 p-8 sm:p-12">
                    <Button onClick={handlePayment} disabled={isCreatingOrder} className="w-full h-16 rounded-2xl font-black text-xl bg-orange-500 hover:bg-orange-600 shadow-2xl shadow-orange-500/20 uppercase tracking-widest transition-all active:scale-95 group">
                        {isCreatingOrder ? (
                            <><Loader2 className="mr-3 h-6 w-6 animate-spin" />Securing Session...</>
                        ) : (
                            <><CheckCircle className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />PROCEED TO PAYMENT</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function PremierPaymentPage() {
    return (
        <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <main>
                    <Suspense fallback={
                        <div className="flex h-screen items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                        </div>
                    }>
                        <PremierPaymentPageContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
