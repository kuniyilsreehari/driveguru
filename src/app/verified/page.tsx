
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, Clock } from 'lucide-react';
import Confetti from 'react-dom-confetti';
import { useState, useEffect } from 'react';

export default function VerifiedPage() {
    const [isConfettiActive, setIsConfettiActive] = useState(false);

    useEffect(() => {
        // Trigger confetti shortly after the component mounts
        const timer = setTimeout(() => setIsConfettiActive(true), 300);
        return () => clearTimeout(timer);
    }, []);

    const confettiConfig = {
        angle: 90,
        spread: 360,
        startVelocity: 40,
        elementCount: 100,
        dragFriction: 0.12,
        duration: 3000,
        stagger: 3,
        width: "10px",
        height: "10px",
        perspective: "500px",
        colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Confetti active={isConfettiActive} config={confettiConfig} />
                </div>
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center items-center">
                        <div className="p-3 bg-green-500/10 rounded-full w-fit mb-4">
                            <UserCheck className="h-10 w-10 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl">Congratulations, You're Verified!</CardTitle>
                        <CardDescription>
                            Your profile now has the verified badge. Clients can now contact you directly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="p-4 bg-secondary rounded-lg">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <Clock className="h-5 w-5 text-primary" />
                                <h4 className="font-semibold">What Happens Next?</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Head to your dashboard to see your new badge and start connecting with clients.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" asChild>
                            <Link href="/dashboard">Go to Your Dashboard</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
