'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Ban, Loader } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Create a memoized reference to the user's role document
  const superAdminDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'roles_super_admin', user.uid);
  }, [firestore, user]);

  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);

  useEffect(() => {
    // If auth is done loading and there's no user, redirect to login
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isRoleLoading;
  const isSuperAdmin = superAdminData !== null;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
              <Ban className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="mt-4 text-2xl text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>You do not have the necessary permissions to view this page. Please contact an administrator if you believe this is an error.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center gap-4">
          <Shield className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold">Super Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user?.email || 'Admin'}.</p>
          </div>
        </header>
        <main className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This is a placeholder for your super admin dashboard content. You can add user management tables, system settings, and other administrative tools here.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
