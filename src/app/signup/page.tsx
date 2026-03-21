'use client';

import { Suspense } from 'react';
import { RegistrationForm } from "@/components/auth/registration-form";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

function SignupPageContent() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-background p-4 sm:p-8">
      <div className="mx-auto w-full max-w-[480px]">
        <Card className="border-none bg-card shadow-2xl rounded-[3rem] overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-border/50">
          <CardContent className="p-8 sm:p-12">
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
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  );
}
