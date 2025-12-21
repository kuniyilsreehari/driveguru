
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Crown, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createPaymentOrder } from '@/ai/flows/payment-flow';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

function PremierPaymentPageContent() {
    const { user, isUserLoading } = useUser();
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
    const { toast } = useToast();
    const router = useRouter();

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
                plan: 'Premier',
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

    return (
        <div className="space-y-6">
             <Button variant="outline" asChild>
                <Link href={`/dashboard`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl sm:text-3xl">Upgrade to Premier</CardTitle>
                    <CardDescription>Unlock powerful new features by upgrading to the Premier plan.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-8 p-8 text-center">
                   <Crown className="h-24 w-24 text-primary" />
                   <div>
                    <h3 className="text-xl font-bold">Choose Your Billing Cycle</h3>
                     <RadioGroup value={billingCycle} onValueChange={(value: 'daily' | 'monthly' | 'yearly') => setBillingCycle(value)} className="mt-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="daily" id="daily" />
                            <Label htmlFor="daily">Daily</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="monthly" id="monthly" />
                            <Label htmlFor="monthly">Monthly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yearly" id="yearly" />
                            <Label htmlFor="yearly">Yearly</Label>
                        </div>
                    </RadioGroup>
                   </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handlePayment} disabled={isCreatingOrder} className="w-full">
                        {isCreatingOrder ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                        ) : (
                            <><ExternalLink className="mr-2 h-4 w-4" />Proceed to Payment</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function PremierPaymentPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <PremierPaymentPageContent />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
