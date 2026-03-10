'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Sparkles, Crown, ArrowRight } from 'lucide-react';
import Confetti from 'react-dom-confetti';

function SuccessPageContent() {
    const searchParams = useSearchParams();
    const [isConfettiActive, setIsConfettiActive] = useState(false);
    const plan = searchParams.get('plan');

    useEffect(() => {
        const timer = setTimeout(() => setIsConfettiActive(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const confettiConfig = {
        angle: 90,
        spread: 360,
        startVelocity: 40,
        elementCount: 150,
        dragFriction: 0.12,
        duration: 4000,
        stagger: 3,
        width: "10px",
        height: "10px",
        perspective: "500px",
        colors: ["#f97316", "#9333ea", "#2563eb", "#ffffff"]
    };

    return (
        <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <Confetti active={isConfettiActive} config={confettiConfig} />
            </div>
            
            <Card className="w-full max-w-lg border-none bg-[#24262d] shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-500">
                <CardHeader className="text-center items-center pt-12 pb-8 bg-white/5 border-b border-white/5">
                    <div className="p-5 bg-orange-500/10 rounded-full mb-6 shadow-inner">
                        {plan === 'Super Premier' ? (
                            <Sparkles className="h-14 w-14 text-blue-500" />
                        ) : plan === 'Premier' ? (
                            <Crown className="h-14 w-14 text-purple-500" />
                        ) : (
                            <CheckCircle className="h-14 w-14 text-green-500" />
                        )}
                    </div>
                    <CardTitle className="text-4xl font-black uppercase italic tracking-tighter text-white">Payment Received!</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium pt-2 text-lg">
                        {plan ? `Your ${plan} upgrade is being activated.` : "Your account is being updated with the new tier."}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 sm:p-10 space-y-8">
                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-start gap-4">
                        <div className="bg-orange-500/10 p-2 rounded-lg shrink-0">
                            <Clock className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-white text-sm uppercase italic">What happens next?</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Our activation system is processing your order. Your profile status and premium tools will be enabled within <span className="text-white font-bold">12 hours</span>.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Benefit Summary</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-4 rounded-xl text-center">
                                <p className="text-lg font-black text-white">Priority</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Search Ranking</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl text-center">
                                <p className="text-lg font-black text-white">AI Tools</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Profile Builder</p>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-8 pt-0">
                    <Button className="w-full h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xl shadow-xl shadow-orange-500/20 uppercase tracking-widest transition-all active:scale-95 group" asChild>
                        <Link href="/dashboard">
                            GO TO DASHBOARD <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-[#1a1c23] flex items-center justify-center p-4">
            <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin text-orange-500" />}>
                <SuccessPageContent />
            </Suspense>
        </div>
    );
}

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
