
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ShieldCheck, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createPaymentOrder } from '@/ai/flows/payment-flow';
import { doc } from 'firebase/firestore';

function VerificationPaymentPageContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const appConfigDocRef = useMemoFirebase(() => doc(firestore, 'app_config', 'homepage'), [firestore]);
    const { data: appConfig } = useDoc<any>(appConfigDocRef);

    const handlePayment = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'Please sign in to proceed.' });
            router.push('/login');
            return;
        }

        const checkoutWindow = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
        
        if (!checkoutWindow) {
            toast({ 
                variant: 'destructive', 
                title: 'Popup Blocked', 
                description: 'Please allow popups to proceed to the secure payment gateway.' 
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
                plan: 'Verification',
                billingCycle: 'one-time',
            });

            if (result.error) {
                checkoutWindow.close();
                throw new Error(result.error);
            }

            if (result.payment_link) {
                checkoutWindow.location.href = result.payment_link;
            } else {
                checkoutWindow.close();
                throw new Error("Automated link generation failed.");
            }
        } catch (error: any) {
            console.error("Verification initiation failed:", error);
            if (checkoutWindow) checkoutWindow.close();
            toast({
                variant: 'destructive',
                title: "Gateway Error",
                description: error.message || "Failed to retrieve the secure link.",
            });
        } finally {
            setIsCreatingOrder(false);
        }
    };

    if (isUserLoading) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Wallet...</p>
            </div>
        );
    }
    
    if (user?.emailVerified) {
         return (
            <div className="space-y-6">
                 <Button variant="outline" asChild className="rounded-xl border-white/10 hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest h-10">
                    <Link href={`/dashboard`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                </Button>
                <Card className="border-none bg-[#24262d] shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="text-center pt-12">
                         <div className="p-5 bg-green-500/10 rounded-full w-fit mx-auto mb-6 shadow-inner">
                            <CheckCircle className="h-14 w-12 text-green-500" />
                        </div>
                        <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">Already Verified</CardTitle>
                        <CardDescription className="text-muted-foreground font-medium pt-2">Your profile is already active with full contact features.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const fee = appConfig?.verificationFee || 49;

    return (
        <div className="space-y-6">
             <Button variant="outline" asChild className="rounded-xl border-white/10 hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest h-10">
                <Link href={`/dashboard`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
            <Card className="border-none bg-[#24262d] shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="text-center bg-white/5 border-b border-white/5 pb-10 pt-12">
                    <div className="p-5 bg-green-500/10 rounded-full w-fit mx-auto mb-6 shadow-inner">
                        <ShieldCheck className="h-14 w-12 text-green-500" />
                    </div>
                    <CardTitle className="text-4xl font-black uppercase italic tracking-tighter text-white">Verify Profile</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium pt-2 text-base">Unlock phone numbers and build trust with clients.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 sm:p-12 space-y-10">
                   <div className="bg-white/5 border-2 border-green-500/20 p-8 rounded-[2rem] text-center shadow-inner">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4">ONE-TIME FEE</p>
                        <p className="text-6xl font-black text-green-500 italic">₱{fee}</p>
                        <p className="text-xs text-muted-foreground mt-4 font-medium uppercase tracking-widest">Lifetime Verification Status</p>
                   </div>
                   <ul className="space-y-4 px-2">
                        <li className="flex items-center gap-3 text-sm font-bold text-white/70 uppercase tracking-tight">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Direct Client Calls Enabled
                        </li>
                        <li className="flex items-center gap-3 text-sm font-bold text-white/70 uppercase tracking-tight">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            WhatsApp Booking Interface
                        </li>
                        <li className="flex items-center gap-3 text-sm font-bold text-white/70 uppercase tracking-tight">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Exclusive Green Trust Badge
                        </li>
                   </ul>
                </CardContent>
                <CardFooter className="bg-white/5 p-8 sm:p-12">
                    <Button onClick={handlePayment} disabled={isCreatingOrder} className="w-full h-16 rounded-2xl font-black text-xl bg-[#16a34a] hover:bg-[#15803d] shadow-2xl shadow-[#16a34a]/20 uppercase tracking-widest transition-all active:scale-95 group text-white">
                        {isCreatingOrder ? (
                            <><Loader2 className="mr-3 h-6 w-6 animate-spin" />Securing Session...</>
                        ) : (
                            <><ShieldCheck className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />ACTIVATE LIFETIME STATUS</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function VerificationPaymentPage() {
    return (
        <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <main>
                    <Suspense fallback={
                        <div className="flex h-screen items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-green-500" />
                        </div>
                    }>
                        <VerificationPaymentPageContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
