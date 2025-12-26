'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { collection, query, where } from 'firebase/firestore';
import { Loader, User, LogOut, Eye, UserX } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

type ExpertUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    photoUrl?: string;
};

function UnverifiedExpertsList() {
    const firestore = useFirestore();

    const unverifiedUsersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('verified', '==', false));
    }, [firestore]);

    const { data: users, isLoading } = useCollection<ExpertUser>(unverifiedUsersQuery);

    const getInitials = (firstName?: string, lastName?: string) => {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        return 'U';
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading unverified experts...</p>
            </div>
        );
    }
    
    if (!users || users.length === 0) {
        return (
             <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No unverified experts found at this time.</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((expert) => (
                    <TableRow key={expert.id}>
                        <TableCell>
                            <Avatar>
                                <AvatarImage src={expert.photoUrl} alt={`${expert.firstName} ${expert.lastName}`} />
                                <AvatarFallback>{getInitials(expert.firstName, expert.lastName)}</AvatarFallback>
                            </Avatar>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{expert.firstName} {expert.lastName}</div>
                            <div className="text-xs text-muted-foreground">{expert.email}</div>
                        </TableCell>
                         <TableCell>
                            <Badge variant="secondary">{expert.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button asChild variant="outline" size="sm">
                                <Link href={`/expert/${expert.id}`} target="_blank">
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                </Link>
                           </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

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
                            <div className="flex items-center gap-3">
                                <UserX className="h-6 w-6"/>
                                <div>
                                    <CardTitle>Unverified Experts</CardTitle>
                                    <CardDescription>
                                        Review the profiles of experts who are pending verification.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <UnverifiedExpertsList />
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}