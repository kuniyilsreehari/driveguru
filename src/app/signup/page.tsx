
'use client';

import { Suspense } from 'react';
import { RegistrationForm } from "@/components/auth/registration-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

function SignupPageContent() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-background p-4">
      <div className="mx-auto w-full max-w-[450px]">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Expert Sign Up</CardTitle>
            <CardDescription>
              Create your account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading...</p>
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  );
}
