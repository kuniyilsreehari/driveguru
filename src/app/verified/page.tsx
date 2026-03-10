'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, Clock, ShieldCheck, ArrowRight, Star } from 'lucide-react';
import Confetti from 'react-dom-confetti';

export default function VerifiedPage() {
    const [isConfettiActive, setIsConfettiActive] = useState(false);

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
        colors: ["#16a34a", "#22c55e", "#ffffff", "#f97316"]
    };

    return (
        <div className="min-h-screen bg-[#1a1c23] flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <Confetti active={isConfettiActive} config={confettiConfig} />
                </div>
                
                <Card className="border-none bg-[#24262d] shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-500">
                    <CardHeader className="text-center items-center pt-12 pb-8 bg-white/5 border-b border-white/5">
                        <div className="p-5 bg-green-500/10 rounded-full mb-6 shadow-inner relative">
                            <ShieldCheck className="h-14 w-14 text-green-500" />
                            <Star className="h-6 w-6 text-orange-500 absolute -top-1 -right-1 animate-bounce" />
                        </div>
                        <CardTitle className="text-4xl font-black uppercase italic tracking-tighter text-white">You're Verified!</CardTitle>
                        <CardDescription className="text-muted-foreground font-medium pt-2 text-lg">
                            Your professional trust badge is now active.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-8 sm:p-10 space-y-8">
                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-start gap-4">
                            <div className="bg-green-500/10 p-2 rounded-lg shrink-0">
                                <UserCheck className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-black text-white text-sm uppercase italic">What's unlocked?</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Clients can now see your <span className="text-white font-bold">Contact Number</span> directly on your profile card. Direct WhatsApp booking is also enabled.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-white/5 rounded-2xl text-center space-y-2 border border-white/5 shadow-inner">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Verification Status</p>
                            <p className="text-2xl font-black text-green-500 italic">LIFETIME ACTIVE</p>
                        </div>
                    </CardContent>

                    <CardFooter className="p-8 pt-0">
                        <Button className="w-full h-16 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-xl shadow-xl shadow-[#16a34a]/20 uppercase tracking-widest transition-all active:scale-95 group" asChild>
                            <Link href="/dashboard">
                                DASHBOARD <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
