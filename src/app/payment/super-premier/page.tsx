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
    const { data: appConfig } = useDoc<any>(appConfigDocRef);

    const handlePayment = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'Please sign in to upgrade.' });
            router.push('/login');
            return;
        }

        setIsCreatingOrder(true);
        try {
            const result = await createPaymentOrder({
                userId: user.uid,
                userEmail: user.email || '',
                userName: user.displayName || 'Expert User',
                userPhone: user.phoneNumber || '',
                plan: 'Super Premier',
                billingCycle: billingCycle,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.payment_link) {
                window.open(result.payment_link, '_blank');
            } else {
                throw new Error("Payment link not generated. Please ensure Admin settings are complete.");
            }
        } catch (error: any) {
            console.error("Payment initiation failed:", error);
            toast({
                variant: 'destructive',
                title: "Action Failed",
                description: error.message || "Failed to start checkout. Check platform configuration.",
            });
        } finally {
            setIsCreatingOrder(false);
        }
    };

    if (isUserLoading) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Account...</p>
            </div>
        );
    }

    const prices = appConfig?.superPremierPlanPrices || { daily: 20, monthly: 400, yearly: 2000 };

    return (
        <div className="space-y-6">
             <Button variant="outline" asChild className="rounded-xl border-white/10 hover:bg-white/5">
                <Link href={`/dashboard`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
            <Card className="border-none bg-[#24262d] shadow-2xl rounded-[2rem] overflow-hidden">
                <CardHeader className="text-center bg-white/5 border-b border-white/5 pb-8">
                    <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-4">
                        <Sparkles className="h-12 w-12 text-blue-500" />
                    </div>
                    <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">Elite Access</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium pt-2">Unlock full AI suite and maximum platform visibility.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                   <div className="space-y-6">
                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] text-center">Choose Your Billing Cycle</h3>
                     <RadioGroup value={billingCycle} onValueChange={(value: 'daily' | 'monthly' | 'yearly') => setBillingCycle(value)} className="grid grid-cols-1 gap-3">
                        <div className={cn("flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer", billingCycle === 'daily' ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10" : "bg-white/5 border-white/5 hover:bg-white/10")} onClick={() => setBillingCycle('daily')}>
                            <div className="flex items-center gap-4">
                                <RadioGroupItem value="daily" id="daily" className="border-blue-500 text-blue-500 h-5 w-5" />
                                <Label htmlFor="daily" className="font-black uppercase italic text-sm cursor-pointer">DAILY POWER</Label>
                            </div>
                            <span className="font-black text-blue-500 text-lg">₱{prices.daily}</span>
                        </div>
                        <div className={cn("flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer", billingCycle === 'monthly' ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10" : "bg-white/5 border-white/5 hover:bg-white/10")} onClick={() => setBillingCycle('monthly')}>
                            <div className="flex items-center gap-4">
                                <RadioGroupItem value="monthly" id="monthly" className="border-blue-500 text-blue-500 h-5 w-5" />
                                <Label htmlFor="monthly" className="font-black uppercase italic text-sm cursor-pointer">MONTHLY ELITE</Label>
                            </div>
                            <span className="font-black text-blue-500 text-lg">₱{prices.monthly}</span>
                        </div>
                        <div className={cn("flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer", billingCycle === 'yearly' ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10" : "bg-white/5 border-white/5 hover:bg-white/10")} onClick={() => setBillingCycle('yearly')}>
                            <div className="flex items-center gap-4">
                                <RadioGroupItem value="yearly" id="yearly" className="border-blue-500 text-blue-500 h-5 w-5" />
                                <Label htmlFor="yearly" className="font-black uppercase italic text-sm cursor-pointer">YEARLY LEGEND</Label>
                            </div>
                            <span className="font-black text-blue-500 text-lg">₱{prices.yearly}</span>
                        </div>
                    </RadioGroup>
                   </div>
                </CardContent>
                <CardFooter className="bg-white/5 p-8">
                    <Button onClick={handlePayment} disabled={isCreatingOrder} className="w-full h-16 rounded-2xl font-black text-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-orange-500/20 uppercase tracking-widest transition-all active:scale-95">
                        {isCreatingOrder ? (
                            <><Loader2 className="mr-3 h-6 w-6 animate-spin" />Processing...</>
                        ) : (
                            <><ExternalLink className="mr-3 h-6 w-6" />PROCEED TO PAYMENT</>
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
                        <div className="flex h-screen items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                        </div>
                    }>
                        <SuperPremierPaymentPageContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
