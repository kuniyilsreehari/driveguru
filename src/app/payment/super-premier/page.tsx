'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Sparkles, CheckCircle2, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createPaymentOrder } from '@/ai/flows/payment-flow';
import { doc } from 'firebase/firestore';

function SuperPremierPaymentPageContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
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

        const configuredLink = appConfig?.superPremierPaymentLink;
        const method = appConfig?.paymentMethod || 'Link';

        if (method === 'Link' && configuredLink) {
            window.location.href = configuredLink;
            return;
        }

        setIsCreatingOrder(true);
        try {
            const result = await createPaymentOrder({
                userId: user.uid,
                userEmail: user.email || '',
                userName: user.displayName || 'Expert User',
                userPhone: '',
                plan: 'Super Premier',
            });

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.payment_link) {
                window.location.href = result.payment_link;
            } else {
                throw new Error("Automated link generation failed.");
            }
        } catch (error: any) {
            console.error("Payment initiation failed:", error);
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
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Wallet...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <Button variant="ghost" asChild className="rounded-xl border border-white/5 hover:bg-white/5 font-black uppercase text-[10px] tracking-widest h-10 px-6">
                <Link href={`/dashboard`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
            
            <Card className="border-none bg-[#24262d] shadow-2xl rounded-[3rem] overflow-hidden p-2 sm:p-10">
                <CardHeader className="text-center pt-12 pb-16">
                    <div className="p-6 bg-blue-500/10 rounded-full w-fit mx-auto mb-8 border border-blue-500/20 shadow-inner">
                        <Sparkles className="h-16 w-16 text-blue-500" />
                    </div>
                    <CardTitle className="text-5xl font-black uppercase italic tracking-tighter text-white mb-2">SUPER</CardTitle>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500">ELITE EXECUTIVE</p>
                </CardHeader>
                
                <CardContent className="space-y-12">
                   <div className="space-y-8">
                        <ul className="space-y-6 px-4">
                            <li className="flex items-center gap-4 text-xs font-black text-white uppercase tracking-wider">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                MAXIMUM SEARCH VISIBILITY
                            </li>
                            <li className="flex items-center gap-4 text-xs font-black text-white uppercase tracking-wider">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                AI NATURAL LANGUAGE SEARCH
                            </li>
                            <li className="flex items-center gap-4 text-xs font-black text-white uppercase tracking-wider">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                FEATURED ON HOMEPAGE CAROUSEL
                            </li>
                            <li className="flex items-center gap-4 text-xs font-black text-white uppercase tracking-wider">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                ELITE BLUE VERIFICATION BADGE
                            </li>
                        </ul>
                   </div>
                </CardContent>
                
                <CardFooter className="pt-16">
                    <Button onClick={handlePayment} disabled={isCreatingOrder} className="w-full h-20 rounded-[1.5rem] font-black text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/30 uppercase tracking-[0.2em] transition-all active:scale-95 group">
                        {isCreatingOrder ? (
                            <><Loader2 className="mr-3 h-6 w-6 animate-spin" />Securing Session...</>
                        ) : (
                            <>UNLOCK ELITE ACCESS</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function SuperPremierPaymentPage() {
    return (
        <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-xl">
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
