'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function ManagerDashboardPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const auth = useAuth();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    const handleLogout = () => {
        if (auth) {
            signOut(auth);
        }
    };

    if (isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Manager Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-4xl">
                <header className="flex items-center justify-between pb-8">
                    <div className="flex items-center gap-4">
                        <User className="h-10 w-10 text-primary" />
                        <div>
                            <h1 className="text-4xl font-bold">Manager Dashboard</h1>
                            <p className="text-muted-foreground">Welcome, {user?.displayName || 'Manager'}.</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                    </Button>
                </header>
                <main>
                    <Card>
                        <CardHeader>
                            <CardTitle>Overview</CardTitle>
                            <CardDescription>
                                This is your dedicated dashboard. More manager-specific features will be added here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>You can manage your team and vacancies from this dashboard.</p>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
